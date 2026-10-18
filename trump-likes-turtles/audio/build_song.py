"""Build the "Trump Likes Turtles" audio from audio/score.json.

    python3 audio/build_song.py            # full build + QA (whisper, plots)
    python3 audio/build_song.py --no-asr   # skip the whisper intelligibility check

Writes build/song.wav, build/stems/{vocals,music,sfx}.wav, song.mp3 and build/qa/*.
Everything in build/ is regenerated; downloads are cached in build/cache/.
"""
import json
import os
import subprocess
import sys
import time

import numpy as np
import soundfile as sf
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d
from scipy.signal import fftconvolve, lfilter, resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BUILD = os.path.join(ROOT, 'build')
sys.path.insert(0, HERE)
import instruments as I  # noqa: E402
import vocals as V  # noqa: E402

SR = I.SR
NOTE = V.NOTE


# ---------------------------------------------------------------- mixing helpers
class Bus:
    def __init__(self, n):
        self.x = np.zeros((2, n))
        self.send = np.zeros((2, n))

    def add(self, sig, t, gain=1.0, pan=0.0, send=0.0):
        sig = np.atleast_2d(np.asarray(sig, float)) * gain
        if sig.shape[0] == 1:
            sig = np.vstack([sig[0] * np.sqrt(0.5 * (1 - pan)), sig[0] * np.sqrt(0.5 * (1 + pan))]) * np.sqrt(2)
        else:
            sig = sig * np.array([[min(1, 1 - pan)], [min(1, 1 + pan)]])
        sig[:, :22] *= np.linspace(0, 1, 22)[:sig.shape[1]]  # 0.5 ms onset ramp: no hard steps
        s = int(round(t * SR))
        a, b = max(s, 0), min(s + sig.shape[1], self.x.shape[1])
        if b > a:
            self.x[:, a:b] += sig[:, a - s:b - s]
            self.send[:, a:b] += send * sig[:, a - s:b - s]


def biquad(x, kind, f, gain_db=0.0, q=0.707):
    """RBJ cookbook peaking / low-shelf / high-shelf / highpass filter along the last axis."""
    A, w = 10 ** (gain_db / 40), 2 * np.pi * f / SR
    al, c = np.sin(w) / (2 * q), np.cos(w)
    if kind == 'peak':
        b, a = [1 + al * A, -2 * c, 1 - al * A], [1 + al / A, -2 * c, 1 - al / A]
    elif kind == 'hp':
        b, a = [(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al]
    else:
        s = 1 if kind == 'high' else -1
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + s * (A - 1) * c + sq), -2 * s * A * ((A - 1) + s * (A + 1) * c), A * ((A + 1) + s * (A - 1) * c - sq)]
        a = [(A + 1) - s * (A - 1) * c + sq, 2 * s * ((A - 1) - s * (A + 1) * c), (A + 1) - s * (A - 1) * c - sq]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=-1)


def comp_gain(x, thresh_db, ratio, attack=0.005, release=0.1, knee=6.0):
    """Gain curve (linear, per sample) of a stereo-linked feed-forward RMS compressor."""
    hop = 44
    lvl = np.sqrt(uniform_filter1d((np.atleast_2d(x) ** 2).max(0), hop * 4)[::hop] + 1e-12)
    db = 20 * np.log10(lvl)
    over = db - thresh_db
    gr = np.where(over > knee / 2, over * (1 - 1 / ratio),
                  np.where(over > -knee / 2, (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee), 0))
    ka, kr = np.exp(-hop / (attack * SR)), np.exp(-hop / (release * SR))
    sm, g = np.zeros_like(gr), 0.0
    for i, v in enumerate(gr):
        g = ka * g + (1 - ka) * v if v > g else kr * g + (1 - kr) * v
        sm[i] = g
    n = np.atleast_2d(x).shape[-1]
    return 10 ** (-np.interp(np.arange(n), np.arange(len(sm)) * hop, sm) / 20)


def limiter_gain(x, ceiling, lookahead=0.002, release=0.08):
    """Look-ahead true-peak (4x oversampled detector) brickwall gain: min-filter + box smoothing
    never lets the peak of x*g exceed the ceiling."""
    L = int(lookahead * SR)
    peak = np.abs(resample_poly(x, 4, 1, axis=1)).max(0).reshape(-1, 4).max(1)
    g = np.minimum(1.0, ceiling / (np.maximum(peak, np.abs(x).max(0)) + 1e-12))
    g = uniform_filter1d(minimum_filter1d(g, 2 * L + 1), L + 1)
    rel = lfilter([1 - np.exp(-1 / (release * SR))], [1, -np.exp(-1 / (release * SR))], g - 1) + 1
    return np.minimum(g, rel)


def duck(x, key, depth_db=6.0, f=2200, q=0.6, broadband_db=1.5):
    """Vocal-keyed dynamic EQ: while the voice is active (with 50 ms look-ahead), dip x's presence band
    (time-varying peaking EQ: y = x + (g - 1) * bandpass(x)) plus a little broadband ducking."""
    w = 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    bp = lfilter([al, 0, -al], [1 + al, -2 * np.cos(w), 1 - al], x, axis=-1)
    env = 10 * np.log10(uniform_filter1d(np.atleast_2d(key).mean(0) ** 2, int(0.03 * SR)) + 1e-12)
    act = np.clip((env - (env.max() - 40)) / 15, 0, 1)
    act = uniform_filter1d(maximum_filter1d(act, int(0.15 * SR)), int(0.05 * SR))  # look-ahead + hold
    g = 10 ** (-depth_db * act / 20)
    return (x + (g - 1) * bp) * 10 ** (-broadband_db * act / 20)


def reverb(x, rt60, predelay, seed, damp=0.55, dur=None):
    """Convolution with a synthetic stereo IR (dense noise, frequency-dependent exponential decay)."""
    rng = np.random.default_rng(seed)
    n = int((dur or rt60 * 1.2) * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n + int(predelay * SR)))
    for ch in range(2):
        nz = rng.standard_normal(n)
        bands = [I.filt(nz, hi=600), I.filt(nz, 600, 5000), I.filt(nz, lo=5000)]
        sig = sum(b * 10 ** (-3 * t / (rt60 * k)) for b, k in zip(bands, (1.1, 1.0, damp)))
        ir[ch, int(predelay * SR):] = sig * np.minimum(t / 0.015, 1)
    ir /= np.sqrt((ir ** 2).sum(1, keepdims=True))
    return np.array([fftconvolve(x[c], ir[c])[:x.shape[1]] for c in range(2)])


# ---------------------------------------------------------------- arrangement
def chord_pcs(sym, key):
    root = NOTE[sym[0]]
    return [(root + i + key) % 12 for i in V.CHORD_PCS[sym[1:]]], (root + key) % 12


def tones(pcs, lo, hi):
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def build_music(score, n, key):
    spb = score['secondsPerBeat']
    B = lambda b: b * spb
    bus = Bus(n)
    sec = {s['name']: (s['start'], s['end']) for s in score['sections']}
    chords = score['chords']
    chord_at = lambda b: next(c for c in chords if c['start'] <= b < c['end'])
    K = lambda m: m + key

    # --- intro: original triplet fanfare (C, then G7), timpani, roll into the verse
    tpt1 = [(0, .75, 72), (1, 1 / 3, 67), (4 / 3, 1 / 3, 67), (5 / 3, 1 / 3, 67), (2, .5, 72), (2.5, .5, 76), (3, 2 / 3, 79),
            (11 / 3, 1 / 3, 76), (4, 1 / 3, 74), (13 / 3, 1 / 3, 74), (14 / 3, 1 / 3, 74), (5, .5, 77), (5.5, .5, 74), (6, 1.4, 79)]
    tpt2 = [(0, .75, 64), (1, 1, 64), (2, .5, 67), (2.5, .5, 72), (3, 1, 76), (4, 1, 71), (5, .5, 74), (5.5, .5, 71), (6, 1.4, 74)]
    low = [(0, .75, [48, 55, 64]), (2, 1.75, [48, 55, 64]), (4, .75, [43, 53, 59]), (6, 1.4, [43, 53, 59, 65])]
    for b, d, m in tpt1:
        bus.add(I.brass(K(m), B(d) * 0.92, 0.9, 1.2), B(b), 0.55, -0.15, 0.25)
    for b, d, m in tpt2:
        bus.add(I.brass(K(m), B(d) * 0.92, 0.75, 1.0), B(b), 0.4, 0.3, 0.25)
    for b, d, ms in low:
        for m in ms:
            bus.add(I.brass(K(m), B(d) * 0.95, 0.7, 0.6), B(b), 0.3, -0.05, 0.2)
    for b, m in [(0, 48), (2, 43), (3, 48), (4, 43), (5, 43)]:
        bus.add(I.timpani(K(m)), B(b), 0.7, -0.3, 0.3)
    bus.add(I.roll(lambda v: I.timpani(K(43), v, 0.8), B(2), 12, 0.15, 0.8), B(6), 0.45, -0.3, 0.3)
    bus.add(I.kick(1.0), 0, 0.8)
    bus.add(I.tuba(K(36), 0.6), 0, 0.6)
    bus.add(I.tuba(K(43), 0.6), B(4), 0.6)

    # --- verses & choruses: oom-pah band + drums
    for name in ('verse1', 'chorus1', 'verse2', 'chorus2'):
        s0, s1 = sec[name]
        chorus = name.startswith('chorus')
        for b in range(s0, s1):
            pos = (b - s0) % 4
            pcs, root = chord_pcs(chord_at(b)['chord'], key)
            parade = name == 'chorus2' and b < s0 + 8
            if pos in (0, 2):
                bus.add(I.kick(0.95 if pos == 0 else 0.85), B(b), 0.75)
                bass = 36 + root + (0 if pos == 0 else 7)  # oom: root, then the fifth
                bus.add(I.tuba(bass, B(0.62), 0.95 if pos == 0 else 0.85), B(b), 0.42, 0.0, 0.05)
            else:
                if not parade:
                    bus.add(I.snare(0.9), B(b), 0.42, 0.05, 0.15)
                stab = tones(pcs, K(62), K(74))
                for m in stab:
                    bus.add(I.brass(m, B(0.3), 0.8 if chorus else 0.65, 0.8), B(b), 0.2 if chorus else 0.17, -0.25, 0.2)
                if chorus:
                    for m in tones(pcs, K(48), K(59))[:2]:
                        bus.add(I.brass(m, B(0.3), 0.7, 0.5), B(b), 0.16, 0.25, 0.2)
            bus.add(I.hat(False, 0.9 if pos % 2 == 0 else 0.7), B(b), 0.22, 0.35)
            bus.add(I.hat(chorus, 0.6 if chorus else 0.5), B(b + 0.5), 0.17 if chorus else 0.2, 0.35)
        if not chorus:  # little snare fill into the chorus
            for i, v in enumerate((0.5, 0.6, 0.75, 0.9)):
                bus.add(I.snare(v), B(s1 - 1 + i * 0.25), 0.35, 0.05, 0.15)
        if chorus:  # string pad bed
            for c in chords:
                if s0 <= c['start'] < s1:
                    pcs, _ = chord_pcs(c['chord'], key)
                    bus.add(I.pad(tones(pcs, K(57), K(72)), B(c['end'] - c['start']), 1.0), B(c['start']), 0.22, 0, 0.4)

    # --- glockenspiel doubling the melody an octave above the written line (choruses + outro)
    for s in score['syllables']:
        if s['line'] in (2, 3, 6, 7, 8):
            bus.add(I.glock(V.midi(s['pitch']) + 12 + key, 0.8), B(s['beat']), 0.22, 0.4, 0.3)

    # --- outro: gentle (pad + soft bass + glock), then the final full-band hit at beat 77
    o0, o1 = sec['outro']
    for c in chords:
        if o0 <= c['start'] < 77:
            pcs, root = chord_pcs(c['chord'], key)
            bus.add(I.pad(tones(pcs, K(57), K(72)), B(c['end'] - c['start']) * 0.95, 1.0), B(c['start']), 0.26, 0, 0.45)
            bus.add(I.tuba(36 + root, B(c['end'] - c['start']) * 0.9, 0.5), B(c['start']), 0.45)
    bus.add(I.roll(lambda v: I.timpani(K(43), v, 0.6), B(1), 16, 0.1, 0.6), B(76), 0.4, -0.3, 0.3)
    for m in (67, 72, 76):
        bus.add(I.brass(K(m), 0.09, 0.8, 1.0), B(76.75), 0.28, -0.1, 0.25)
    for m in (48, 55, 60, 64, 67, 72, 76, 79):
        bus.add(I.brass(K(m), 1.3, 1.0, 1.1), B(77), 0.22, (m - 64) / 40, 0.35)
    bus.add(I.tuba(K(36), 1.2, 1.0), B(77), 0.6)
    bus.add(I.timpani(K(48), 1.0, 2.0), B(77), 0.8, -0.3, 0.3)
    bus.add(I.kick(1.0), B(77), 0.8)
    bus.add(I.glock(K(96), 0.9), B(77), 0.3, 0.4, 0.4)
    bus.add(I.pad(tones(chord_pcs('C', key)[0], K(55), K(72)), 1.3, 1.0), B(77), 0.3, 0, 0.5)
    return bus


SFX_GAIN = {'crash': 0.6, 'snare_roll': 0.4, 'bloop_up': 0.55, 'sparkle': 0.3, 'choir_swell': 0.9, 'whoosh': 0.5,
            'crunch': 0.4, 'ding': 0.22, 'camera': 0.45, 'march_snare': 0.17, 'firework_launch': 0.35,
            'firework_bang': 0.3, 'chimes': 0.35, 'wink': 0.3}
SFX_PAN = {'bloop_up': -0.2, 'sparkle': 0.3, 'ding': 0.2, 'camera': 0.35, 'march_snare': 0.15, 'crunch': -0.15,
           'firework_launch': -0.3, 'firework_bang': 0.3, 'wink': 0.25}


def build_sfx(score, n, key):
    spb = score['secondsPerBeat']
    bus = Bus(n)
    for c in score['sfx']:
        name, b, d = c['sfx'], c['beat'], c.get('dur', 1.0) * spb
        if name == 'snare_roll':
            sig = I.roll(lambda v: I.snare(v), d, 24, 0.12, 0.85)
        elif name == 'choir_swell':
            pcs, _ = chord_pcs(next(ch for ch in score['chords'] if ch['start'] <= b < ch['end'])['chord'], key)
            sig = I.choir(tones(pcs, 57 + key, 72 + key), d + 1.0)
        elif name == 'whoosh':
            sig = I.whoosh(d)
        elif name == 'march_snare':
            sig = I.march_snare(c['dur'], spb)
        else:
            sig = getattr(I, name)()
        gain = SFX_GAIN[name] * (1.25 if name == 'crash' and b == 77 else 1.0)
        bus.add(sig, b * spb, gain, SFX_PAN.get(name, 0.0), 0.25)
    return bus


def vocal_chain(lead, harmony, doubles, n):
    eq = lambda x: biquad(biquad(biquad(biquad(biquad(x, 'hp', 90), 'peak', 300, -2.5, 1.0), 'peak', 3000, 3.0, 0.8),
                                 'peak', 6500, -2.0, 1.5), 'high', 9000, 2.0)
    lead = eq(lead)
    lead = lead * comp_gain(lead, -30, 2.0, 0.05, 0.4, knee=12)  # slow leveler
    lead = lead * comp_gain(lead, -22, 3.0, 0.004, 0.08)
    bus = Bus(n)
    bus.add(lead, 0, 1.0, 0.0, 0.18)
    h = eq(harmony)
    bus.add(h * comp_gain(h, -20, 3.0, 0.004, 0.08), 0, 10 ** (-9 / 20), 0.15, 0.25)
    dbl = eq(doubles)
    bus.add(dbl[0], 0.014, 10 ** (-12 / 20), -0.7, 0.15)
    bus.add(dbl[1], 0.021, 10 ** (-12 / 20), 0.7, 0.15)
    slap = biquad(biquad(np.vstack([lead, lead]), 'hp', 400), 'high', 4000, -6)
    bus.add(slap, 0.11, 10 ** (-17 / 20))
    return bus.x + 0.35 * reverb(bus.send, 1.5, 0.025, seed=11, damp=0.7)


# ---------------------------------------------------------------- main
def main():
    t_start = time.time()
    asr = '--no-asr' not in sys.argv
    score = json.load(open(os.path.join(HERE, 'score.json')))
    n = int(round(score['duration'] * SR))
    assert n == 1764000, n
    key = (score['transpose'] + 6) % 12 - 6  # instruments follow the key; register is fixed
    for d in ('stems', 'qa', 'cache'):
        os.makedirs(os.path.join(BUILD, d), exist_ok=True)

    print('[1/4] vocals (Piper + WORLD) ...')
    voc = V.render(score, os.path.join(BUILD, 'cache', 'piper'))
    print('[2/4] music + sfx ...')
    music_bus, sfx_bus = build_music(score, n, key), build_sfx(score, n, key)
    music = music_bus.x + 0.3 * reverb(music_bus.send, 1.3, 0.02, seed=5)
    music = biquad(biquad(music, 'peak', 2500, -4.5, 0.6), 'peak', 400, -1.5, 0.8)  # vocal pocket
    music = biquad(biquad(biquad(music, 'low', 90, -3.0), 'hp', 38), 'hp', 38)
    sfx = biquad(sfx_bus.x + 0.3 * reverb(sfx_bus.send, 1.6, 0.02, seed=6), 'hp', 45)
    vocals = vocal_chain(voc['lead'], voc['harmony'], voc['doubles'], n)
    music, sfx = duck(music, vocals), duck(sfx, vocals, 5.0, broadband_db=2.0)

    print('[3/4] mix + master ...')
    stems = {'vocals': vocals * 2.0, 'music': music * 0.45, 'sfx': sfx * 0.4}
    mix = sum(stems.values())
    import pyloudnorm
    meter = pyloudnorm.Meter(SR)
    g_bus = comp_gain(mix, -16, 2.0, 0.02, 0.25)
    fade = np.ones(n)
    fade[-int(0.3 * SR):] = np.cos(np.linspace(0, np.pi / 2, int(0.3 * SR))) ** 2
    gain = 1.0
    ceiling = 10 ** (-1.1 / 20)
    for _ in range(4):  # loudness target -14 LUFS after limiting
        pre = mix * g_bus * gain
        g_lim = limiter_gain(pre, ceiling)
        lufs = meter.integrated_loudness((pre * g_lim * fade).T)
        gain *= 10 ** ((-14.0 - lufs) / 20)
    g_total = g_bus * gain * g_lim * fade
    stems = {k: v * g_total - (v * g_total).mean(1, keepdims=True) for k, v in stems.items()}
    song = sum(stems.values())
    song = np.clip(song, -ceiling, ceiling)
    write = lambda p, x: sf.write(p, x.T.astype(np.float32), SR, subtype='PCM_16')
    write(os.path.join(BUILD, 'song.wav'), song)
    for k, v in stems.items():
        write(os.path.join(BUILD, 'stems', k + '.wav'), v)
    mp3 = os.path.join(ROOT, 'song.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(BUILD, 'song.wav'),
                    '-c:a', 'libmp3lame', '-b:a', '192k', mp3], check=True)
    print(f'  wrote build/song.wav, stems, song.mp3 ({time.time() - t_start:.0f} s)')

    print('[4/4] QA ...')
    import qa
    qa.run(score, BUILD, mp3, voc, asr=asr)
    print(f'done in {time.time() - t_start:.0f} s')


if __name__ == '__main__':
    main()
