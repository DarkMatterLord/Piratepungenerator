"""Synthesized instruments and sound effects (mono float arrays at SR)."""
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
RNG = np.random.default_rng(20240)


def tt(dur):
    return np.arange(int(round(dur * SR))) / SR


def hz(m):
    return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)


def filt(x, lo=None, hi=None, order=2):
    if lo and hi:
        sos = butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    elif lo:
        sos = butter(order, lo, btype='high', fs=SR, output='sos')
    else:
        sos = butter(order, hi, btype='low', fs=SR, output='sos')
    return sosfilt(sos, x)


def noise(dur):
    return RNG.standard_normal(int(round(dur * SR)))


def env(n, attack=0.005, decay=None, hold=None, release=0.02):
    """Attack ramp, optional exponential decay (tau), optional hold length then release ramp."""
    t = np.arange(n) / SR
    e = np.minimum(t / max(attack, 1e-4), 1.0)
    if decay:
        e = e * np.exp(-np.maximum(t - attack, 0) / decay)
    if hold is not None:
        e = e * np.clip(1 - (t - hold) / release, 0, 1)
    else:
        e[-int(release * SR):] *= np.linspace(1, 0, int(release * SR))
    return e


def tail(x, frac=0.3):
    """Raised-cosine fade over the last `frac` of a signal (no truncation clicks)."""
    k = max(int(x.shape[-1] * frac), 2)
    x[..., -k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    return x


def additive(freq, amps):
    """freq: per-sample f0 (Hz); amps: list of per-sample (or scalar) amplitudes for harmonics 1..K."""
    ph = 2 * np.pi * np.cumsum(freq) / SR
    out = np.zeros_like(ph)
    for k, a in enumerate(amps, 1):
        if np.max(freq) * k < SR * 0.45:
            out += a * np.sin(k * ph)
    return out


def partials(f, ratios, levels, decays, dur, glide=0.0):
    t = tt(dur)
    fr = f * (1 + glide * np.exp(-t / 0.05))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    out = sum(l * np.exp(-t / d) * np.sin(r * ph + RNG.uniform(0, 6.3)) for r, l, d in zip(ratios, levels, decays))
    return tail(out * np.minimum(t / 0.0015, 1))


# ---------------------------------------------------------------- pitched instruments
def brass(m, dur, vel=1.0, bright=1.0, vib=True, scoop=True):
    """Brass tone: harmonic spectrum whose brightness follows the loudness envelope."""
    n = int(round((dur + 0.08) * SR))
    t = np.arange(n) / SR
    f = hz(m) * (1 - (0.02 * np.exp(-t / 0.025) if scoop else 0))
    if vib and dur > 0.45:
        f = f * (1 + 0.004 * np.clip((t - 0.25) / 0.2, 0, 1) * np.sin(2 * np.pi * 5.2 * t))
    a = env(n, 0.02, hold=dur, release=0.08) * (1 - 0.25 * (1 - np.exp(-t / 0.15)))
    c = 1.0 / (1.2 + bright * vel * (2.5 * a + 3.0 * np.exp(-t / 0.06) * np.minimum(t / 0.015, 1)))
    amps = [a * np.exp(-(k - 1) * c) / k ** 0.6 for k in range(1, 40)]
    x = additive(f, amps) + 0.02 * filt(noise(n / SR), 1500, 6000) * a
    return vel * x * 0.3


def tuba(m, dur, vel=1.0):
    n = int(round((dur + 0.06) * SR))
    t = np.arange(n) / SR
    f = hz(m) * (1 - 0.015 * np.exp(-t / 0.03))
    a = env(n, 0.012, hold=dur, release=0.06) * (0.75 + 0.25 * np.exp(-t / 0.08))
    c = 1.0 / (1.5 + 3.0 * np.exp(-t / 0.05) + 1.5 * a)
    return vel * 0.45 * additive(f, [a * np.exp(-(k - 1) * c) for k in range(1, 30)])


def glock(m, vel=1.0, dur=1.6):
    x = partials(hz(m), [1, 2.76, 5.40, 8.93], [1, 0.3, 0.12, 0.05], [0.9, 0.3, 0.1, 0.05], dur)
    click = filt(noise(0.004), 3000) * np.linspace(1, 0, int(0.004 * SR))
    x[:len(click)] += 0.15 * click
    return vel * 0.3 * x


def pad(ms, dur, vel=1.0):
    """Soft string pad: detuned saw-ish voices, slow attack/release."""
    n = int(round((dur + 0.4) * SR))
    t = np.arange(n) / SR
    a = env(n, 0.35, hold=dur, release=0.4)
    out = np.zeros(n)
    for m in ms:
        for det in (-0.08, 0.0, 0.08):
            f = hz(m + det) * (1 + 0.002 * np.sin(2 * np.pi * (4.8 + det) * t + RNG.uniform(0, 6)))
            out += additive(f, [a * np.exp(-(k - 1) * 0.45) / k for k in range(1, 16)])
    return vel * 0.06 * out


FORMANTS_A = [(750, 90, 1.0), (1150, 110, 0.6), (2600, 160, 0.25), (3300, 200, 0.12)]


def choir(ms, dur, vel=1.0, voices=4):
    """'Aaah' choir: formant-shaped (vowel /a/) additive voices with vibrato and a slow swell."""
    n = int(round(dur * SR))
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for i, m in enumerate(ms):
        for v in range(voices):
            f0 = hz(m + RNG.uniform(-0.12, 0.12))
            f = f0 * (1 + 0.006 * np.sin(2 * np.pi * RNG.uniform(4.6, 5.6) * t + RNG.uniform(0, 6.3)))
            amps = []
            for k in range(1, int(5000 / f0)):
                fk = k * f0
                g = sum(l / (1 + ((fk - F) / B) ** 2) for F, B, l in FORMANTS_A) + 0.02
                amps.append(g / k ** 0.5)
            x = additive(f, amps)
            pan = (v / (voices - 1) - 0.5) * 1.2 if voices > 1 else 0
            out[0] += x * np.sqrt(0.5 * (1 - pan))
            out[1] += x * np.sqrt(0.5 * (1 + pan))
    shape = np.minimum(t / (0.75 * dur), 1) ** 1.5 * np.clip((dur - t) / (0.35 * dur), 0, 1) ** 0.7
    return vel * 0.03 * out * shape


# ---------------------------------------------------------------- drums
def kick(vel=1.0):
    t = tt(0.45)
    f = 55 + 95 * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22) * np.minimum(t / 0.002, 1)
    x[:88] += 0.3 * filt(noise(0.002), 2000)
    return vel * tail(np.tanh(1.5 * x)) * 0.9


def snare(vel=1.0, tone=185.0, snappy=0.13, dur=0.35):
    t = tt(dur)
    body = (np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.05) + 0.5 * np.sin(2 * np.pi * tone * 1.78 * t) * np.exp(-t / 0.03))
    nz = filt(noise(dur), 1200, 9000) * np.exp(-t / snappy)
    return vel * 0.55 * tail((0.6 * body + 0.9 * nz) * np.minimum(t / 0.0008, 1))


def hat(open_=False, vel=1.0):
    dur = 0.6 if open_ else 0.12
    t = tt(dur)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t + RNG.uniform(0, 6))) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    x = filt(0.5 * metal + noise(dur), 7000, order=4) * np.exp(-t / (0.28 if open_ else 0.03))
    return vel * 0.22 * tail(x)


def crash(vel=1.0, dur=3.0):
    t = tt(dur)
    out = []
    for _ in range(2):
        metal = sum(np.sin(2 * np.pi * RNG.uniform(3000, 11000) * t + RNG.uniform(0, 6)) for _ in range(40)) / 6
        x = filt(noise(dur) + metal, 2500, order=2) * (np.exp(-t / 1.1) * 0.85 + 0.15 * np.exp(-t / 0.08))
        out.append(x * np.minimum(t / 0.001, 1))
    return vel * 0.28 * tail(np.array(out))


def timpani(m, vel=1.0, dur=2.0):
    x = partials(hz(m), [1, 1.5, 1.98, 2.44, 2.94], [1, 0.5, 0.3, 0.15, 0.08], [1.4, 0.8, 0.6, 0.4, 0.3], dur, glide=0.025)
    t = tt(dur)
    x += 0.4 * filt(noise(dur), hi=400) * np.exp(-t / 0.03)
    return vel * 0.5 * x


def roll(hit, dur, rate, v0, v1, jitter=0.004):
    """Repeated hits (rate per second) with a linear velocity ramp v0 -> v1."""
    n = int(dur * rate)
    h = hit(1.0)
    out = np.zeros(int((dur + 0.5) * SR) + len(h))
    for i in range(n):
        s = int((i / rate + (RNG.uniform(-jitter, jitter) if i else 0)) * SR)
        s = max(s, 0)
        out[s:s + len(h)] += h * (v0 + (v1 - v0) * i / max(n - 1, 1)) * RNG.uniform(0.85, 1.0)
    return out


def march_snare(beats, spb):
    """Parade cadence over `beats` beats: 16ths with accents, flams and a closing roll."""
    hit = lambda v: snare(v, tone=330, snappy=0.08, dur=0.25)
    out = np.zeros(int((beats * spb + 1) * SR))
    pat = 'F.x.x.A.F.x.A.xxF.x.x.A.A.A.Rrrr'  # 2 bars of 16ths, F=flam A=accent x=tap R=roll
    for bar in range(int(beats // 8)):
        for i, c in enumerate(pat):
            if c == '.':
                continue
            s = int(((bar * 8 + i * 0.25) * spb) * SR)
            if c == 'R' or c == 'r':
                r = roll(lambda v: hit(v), 0.25 * spb, 32, 0.5, 0.8 if c == 'R' else 0.9)
                out[s:s + len(r)] += r[:len(out) - s]
                continue
            v = {'F': 1.0, 'A': 0.9, 'x': 0.45}[c]
            if c == 'F':
                g = hit(0.4)
                s0 = max(s - int(0.025 * SR), 0)
                out[s0:s0 + len(g)] += g
            h = hit(v)
            out[s:s + len(h)] += h[:len(out) - s]
    return out


# ---------------------------------------------------------------- sound effects
def chirp(f0, f1, dur, shape=2.0):
    t = tt(dur)
    f = f0 + (f1 - f0) * (t / dur) ** shape
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def bloop_up():
    a = chirp(220, 900, 0.16, 2.5) * env(int(0.16 * SR), 0.005, release=0.03)
    b = chirp(400, 1400, 0.12, 2.5) * env(int(0.12 * SR), 0.005, release=0.03)
    out = np.zeros(int(0.35 * SR))
    out[:len(a)] += a
    out[int(0.15 * SR):int(0.15 * SR) + len(b)] += 0.6 * b
    return 0.35 * out


def sparkle():
    out = np.zeros(int(1.6 * SR))
    for i, m in enumerate([84, 88, 91, 96, 100, 103, 108]):
        g = glock(m, 0.8 - 0.05 * i, dur=1.0)
        s = int(i * 0.05 * SR)
        out[s:s + len(g)] += g
    return out


def whoosh(dur):
    t = tt(dur)
    x = noise(dur)
    out = np.zeros_like(x)
    centers = 600 + 2400 * np.sin(np.pi * t / dur) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t))
    for i in range(0, len(x), 2048):  # block-wise moving bandpass
        c = float(np.mean(centers[i:i + 2048]))
        seg = filt(x[max(i - 2048, 0):i + 2048], c * 0.6, c * 1.6)
        out[i:i + 2048] = seg[-len(out[i:i + 2048]):]
    e = np.sin(np.pi * t / dur) ** 1.5 * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * t))
    pan = np.sin(2 * np.pi * 1.5 * t)
    y = out * e * 0.25
    return np.array([y * np.sqrt(0.5 * (1 - 0.8 * pan)), y * np.sqrt(0.5 * (1 + 0.8 * pan))])


def crunch():
    dur = 0.12
    t = tt(dur)
    x = np.zeros(len(t))
    for i in range(60):  # granular crackle, first grain on the beat
        s = int(RNG.uniform(0, 0.09) * SR) if i else 0
        g = noise(0.004) * np.exp(-np.arange(int(0.004 * SR)) / (0.0008 * SR))
        x[s:s + len(g)] += g * RNG.uniform(0.3, 1.0)
    return 0.25 * tail(filt(x, 1200, 7000) * np.exp(-t / 0.05))


def ding():
    return 0.6 * partials(hz(88), [1, 2.0, 2.76, 5.4], [1, 0.4, 0.25, 0.1], [1.2, 0.6, 0.35, 0.12], 1.5)


def camera():
    out = np.zeros(int(0.6 * SR))
    for s, v in ((0.0, 1.0), (0.035, 0.7)):
        c = filt(noise(0.012), 1500, 8000) * np.exp(-np.arange(int(0.012 * SR)) / (0.002 * SR))
        out[int(s * SR):int(s * SR) + len(c)] += v * c
    w = chirp(2500, 6500, 0.45, 0.7) * env(int(0.45 * SR), 0.05, release=0.1) * 0.04
    out[int(0.08 * SR):int(0.08 * SR) + len(w)] += w
    return 0.5 * out


def firework_launch(dur=0.5):
    t = tt(dur)
    w = chirp(900, 2600, dur, 1.3) * (1 + 0.1 * np.sin(2 * np.pi * 12 * t))
    hiss = filt(noise(dur), 3000, 9000) * 0.3
    return 0.12 * (w + hiss) * env(len(t), 0.004, release=0.05) * (0.6 + 0.4 * t / dur)


def firework_bang():
    dur = 1.8
    t = tt(dur)
    boom = filt(noise(dur), 60, 400, order=2) * np.exp(-t / 0.18) * 3 + np.sin(2 * np.pi * (55 + 45 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.2)
    crack = np.zeros(len(t))
    for _ in range(120):
        s = int(RNG.uniform(0.1, 1.4) ** 1.3 * SR)
        g = filt(noise(0.003), 2000)
        crack[s:s + len(g)] += g * RNG.uniform(0.2, 1)
    crack *= np.exp(-t / 0.8)
    return 0.45 * tail(boom * np.minimum(t / 0.001, 1) + 0.25 * crack)


def chimes():
    out = np.zeros((2, int(3.5 * SR)))
    notes = [84, 86, 88, 91, 93, 96, 98, 100]
    for i in range(14):
        s = 0 if i == 0 else int(RNG.uniform(0.05, 2.0) * SR)
        g = partials(hz(notes[RNG.integers(len(notes))]), [1, 2.32, 4.25], [1, 0.3, 0.1], [1.0, 0.4, 0.15], 1.5)
        p = RNG.uniform(-0.8, 0.8)
        v = 1.0 if i == 0 else RNG.uniform(0.3, 0.7)
        out[0, s:s + len(g)] += v * g * np.sqrt(0.5 * (1 - p))
        out[1, s:s + len(g)] += v * g * np.sqrt(0.5 * (1 + p))
    return 0.15 * out


def wink():
    return 0.3 * partials(hz(100), [1, 2.76], [1, 0.2], [0.25, 0.08], 0.6)
