"""Sung vocals: a stock Piper TTS voice made to sing the score's notes ("auto-tune" style).

Per phrase (consecutive lines without a rest):
 1. espeak phonemes; one vowel nucleus per score syllable.
 2. Piper's VITS graph is patched so per-phoneme durations can be set. Each note gets: the attack run
    (stress mark + blanks, where VITS renders the consonant->vowel transition) starting on the beat,
    the stretched vowel, then the consonants leading into the next note. The TTS itself renders the
    sung timing, so there are no time-stretching artefacts.
 3. WORLD analysis (harvest/cheaptrick/d4c); voiced frames are resynthesized on the melody (equal
    temperament, portamento, vibrato on long notes); unvoiced consonants are kept from the TTS audio.
"""
import hashlib
import os
import re
import unicodedata
import urllib.request

import numpy as np
import onnx
import onnxruntime as ort
import pyworld as pw
from onnx import helper, TensorProto
from piper import PiperVoice
from scipy.signal import resample_poly

VOICE = 'en_US-joe-medium'  # stock Piper voice (generic US male narrator)
VOICE_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/joe/medium/'
VOICE_MD5 = {'.onnx': '74fd6a4dc39e0aa9dce145d7f5acd4f6', '.onnx.json': '811036b9c1451545f9495fdc1baa0754'}
VOWELS = set('aeiouyæɑɒɔəɚɛɜɝɪʊʌɐᵻɨʉøœɵɘɤɯɞɶ')
SILENT = set(' ,.!?;:…—-"\'“”')
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
CHORD_PCS = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10]}
FP = 5.0  # WORLD frame period (ms)
NOISE_SCALE = 0.6  # VITS sampling noise
DUMMY = ', and'  # appended with zero frames: the last sung vowel is not sentence-final (no creak)
WORD_GAP = 1.0  # frames kept of each word gap (otherwise legato)
CODA_STRETCH = 2.0  # phrase-final consonants are sung longer ("pond", "bond")
MAX_CONS = 0.65  # attack run + consonants may take at most this share of a note
SONORANT_MIN = 4  # minimum frames for glides/liquids/nasals (an audible "y" in "yes")
OUT_SR = 44100


def midi(name):
    acc = name[1:-1]
    return 12 * (int(name[-1]) + 1) + NOTE[name[0]] + acc.count('#') - acc.count('b')


def hz(m):
    return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)


def ensure_voice(cache_dir):
    """Download the voice (verified by md5) into the cache if missing or corrupt."""
    os.makedirs(cache_dir, exist_ok=True)
    for ext, md5 in VOICE_MD5.items():
        path = os.path.join(cache_dir, VOICE + ext)
        ok = os.path.exists(path) and hashlib.md5(open(path, 'rb').read()).hexdigest() == md5
        for _ in range(3):
            if ok:
                break
            print(f'  downloading {VOICE}{ext} ...')
            with urllib.request.urlopen(VOICE_URL + VOICE + ext + '?download=true') as r:
                data = r.read()
            if hashlib.md5(data).hexdigest() == md5:
                with open(path + '.part', 'wb') as f:
                    f.write(data)
                os.replace(path + '.part', path)
                ok = True
        if not ok:
            raise RuntimeError(f'could not download {VOICE}{ext} (checksum mismatch)')
    return os.path.join(cache_dir, VOICE + '.onnx')


def patched_model(path):
    """VITS graph with an extra input 'dur_override' (frames per phoneme id, <0 = natural) and the
    natural durations exposed as a second output."""
    m = onnx.load(path)
    g = m.graph
    ceil = [n for n in g.node if n.op_type == 'Ceil'][0]
    wc = ceil.output[0]
    g.input.append(helper.make_tensor_value_info('dur_override', TensorProto.FLOAT, ['batch_size', 1, 'phonemes']))
    g.initializer.append(helper.make_tensor('dur_zero', TensorProto.FLOAT, [], [0.0]))
    for n in g.node:
        if n is not ceil:
            n.input[:] = ['w_used' if x == wc else x for x in n.input]
    k = list(g.node).index(ceil)
    g.node.insert(k + 1, helper.make_node('Less', ['dur_override', 'dur_zero'], ['dur_nat']))
    g.node.insert(k + 2, helper.make_node('Where', ['dur_nat', wc, 'dur_override'], ['w_used']))
    g.output.append(helper.make_tensor_value_info(wc, TensorProto.FLOAT, None))
    return m


class Singer:
    def __init__(self, model_path):
        self.voice = PiperVoice.load(model_path)
        self.model = patched_model(model_path)
        self.sr, self.hop = self.voice.config.sample_rate, self.voice.config.hop_length
        self.fps = self.sr / self.hop

    def reseed(self, seed):
        """Fresh session whose random ops start from fixed seeds: a take is reproducible from its seed."""
        for j, n in enumerate(self.model.graph.node):
            if n.op_type.startswith('Random'):
                del n.attribute[:]
                n.attribute.extend([helper.make_attribute('dtype', 1), helper.make_attribute('seed', float(seed * 1000 + j))])
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1  # deterministic float summation order
        self.sess = ort.InferenceSession(self.model.SerializeToString(), opts, providers=['CPUExecutionProvider'])

    def run(self, ids, durs=None, ns=NOISE_SCALE):
        d = np.full(len(ids), -1.0) if durs is None else np.asarray(durs, float)
        out = self.sess.run(None, {
            'input': np.array([ids], np.int64), 'input_lengths': np.array([len(ids)], np.int64),
            'scales': np.array([ns, 1.0, 0.5], np.float32), 'dur_override': d.astype(np.float32).reshape(1, 1, -1)})
        return out[0].squeeze().astype(np.float64), out[1].squeeze().astype(np.float64)

    def plan(self, notes, text, spb, shift=None, onset_cap=0.12, release=0.04):
        """Integer frames per phoneme id so that each note's vowel starts on its beat (minus `shift`)."""
        text = re.sub(r'[.!?…]+', ',', re.sub(r'[“”"]', '', text)).rstrip(' ,') + DUMMY
        ph = []
        for s in self.voice.phonemize(text):
            ph += ([' '] if ph and ph[-1] != ' ' else []) + s
        nuclei, i = [], 0
        while i < len(ph):
            j = i + 1
            if ph[i][0] in VOWELS:
                while j < len(ph) and (ph[j][0] in VOWELS or ph[j] in 'ːˑ˞' or unicodedata.combining(ph[j][0])):
                    j += 1
                nuclei.append((i, j))
            i = j
        cut = 2 + 2 * max(i for i in range(nuclei[-1][0]) if ph[i] == ' ')  # first token of the dummy
        nuclei = nuclei[:-1]
        if len(nuclei) != len(notes):
            raise ValueError(f'{text!r}: {len(nuclei)} vowels vs {len(notes)} notes ({"".join(ph)})')
        ids = self.voice.phonemes_to_ids(ph)  # ^ _ p1 _ p2 _ ... $  (phoneme j -> id 2 + 2j)
        n, K, F = len(ids), len(notes), self.fps
        kind = ['bos'] + ['pad'] * (n - 2) + ['eos']
        for j, p in enumerate(ph):
            kind[2 + 2 * j] = 'sil' if p in SILENT else 'str' if p in 'ˈˌ' else 'v' if p[0] in VOWELS else 'c'
        w = self.run(ids, ns=0.0)[1]  # natural durations
        for j, p in enumerate(ph):
            if p in 'jwlɹmnŋ':
                w[2 + 2 * j] = max(w[2 + 2 * j], SONORANT_MIN)
        for i in range(1, n):  # legato: punctuation and word gaps get (almost) no time
            if 'sil' in (kind[i], kind[i - 1]):
                w[i] = min(w[i], WORD_GAP) if kind[i] == 'sil' and ph[(i - 2) // 2] == ' ' else 0
        v0, vend = [2 + 2 * a for a, b in nuclei], [2 + 2 * b for a, b in nuclei]
        dur, pre = np.zeros(n), []
        for k in range(K):  # attack run: stress mark + blanks before the vowel (not a consonant's blank)
            i = v0[k] - 1
            while i >= (vend[k - 1] if k else 0) and (kind[i] in ('str', 'bos') or w[i] == 0 or (kind[i] == 'pad' and kind[i - 1] != 'c')):
                i -= 1
            pre.append(i + 1)
            dur[i + 1:v0[k]] = w[i + 1:v0[k]]
        dur[:2] = np.minimum(w[:2], 1)
        dur[2:pre[0]] = w[2:pre[0]] * min(1, onset_cap * F / max(w[2:pre[0]].sum(), 1e-9))
        T = [nt['beat'] * spb - (0 if shift is None else shift[k]) for k, nt in enumerate(notes)]
        for k in range(K):  # note k = attack run + vowel + consonants up to the next attack run
            s, e = v0[k], vend[k]
            last = k + 1 == K
            span = ((notes[k]['beat'] + notes[k]['dur']) * spb - release - T[k] if last else T[k + 1] - T[k]) * F
            c1 = cut if last else pre[k + 1]
            run, cl = dur[pre[k]:s].copy(), w[e:c1] * (CODA_STRETCH if last else 1.0)
            if run.sum() + cl.sum() > MAX_CONS * span:
                f = MAX_CONS * span / (run.sum() + cl.sum())
                run, cl = run * f, cl * f
            nd = span - run.sum() - cl.sum()
            alloc = w[s:e].copy()
            vt = [q - s for q in range(s, e) if kind[q] == 'v']
            if len(vt) > 1:  # diphthong: keep a short glide at the end
                alloc[vt[-1]] = min(max(alloc[vt[-1]], 0.2 * nd), 0.10 * F)
            alloc[0] = max(nd - (alloc.sum() - alloc[0]), 1)
            dur[pre[k]:s], dur[s:e], dur[e:c1] = run, alloc * nd / alloc.sum(), cl
        dur[-1] = max(w[-1], 2)
        icum = np.round(np.concatenate([[0], np.cumsum(dur)])).astype(int)
        sec = self.hop / self.sr
        clean, word_start = [], []
        for k, (a, b) in enumerate(nuclei):
            j = a - 1  # vowel after silence or an unvoiced consonant: unambiguous voicing onset (QA)
            while j >= 0 and (ph[j] in 'ˈˌ' or ph[j] in SILENT):
                j -= 1
            clean.append(j < 0 or ph[j] in 'ptkfsʃθ')
            gaps = [q for q in range(vend[k - 1] if k else 2, pre[k]) if kind[q] == 'sil' and ph[(q - 2) // 2] == ' ']
            first = 2 if k == 0 else gaps[-1] + 1 if gaps else None
            word_start.append(None if first is None else icum[first] * sec)
        return dict(ids=ids, dur=np.diff(icum), anchors=icum[pre] * sec, clean=clean, word_start=word_start, T=T,
                    vowels=[(icum[v0[k]] * self.hop, icum[vend[k]] * self.hop) for k in range(K)])

    def analyze(self, x, vowels):
        f0, t = pw.harvest(x, self.sr, f0_floor=60, f0_ceil=600, frame_period=FP)
        # harvest bridges short unvoiced consonants: also require low-band energy dominance + level
        nwin = int(0.020 * self.sr)
        st = np.round(np.arange(len(f0)) * self.sr * FP / 1000).astype(int)
        P = np.abs(np.fft.rfft(np.pad(x, (nwin // 2, nwin))[st[:, None] + np.arange(nwin)] * np.hanning(nwin), axis=1)) ** 2
        fr = np.fft.rfftfreq(nwin, 1 / self.sr)
        tot = P[:, fr >= 70].sum(1) + 1e-12
        level = 10 * np.log10(tot)
        v = (f0 > 0) & (P[:, (fr >= 70) & (fr < 1000)].sum(1) / tot > 0.5) & (level > level.max() - 38)
        for a, b in vowels:  # planned vowel cores are always voiced
            v |= (t >= a / self.sr + 0.015) & (t <= b / self.sr - 0.015) & (level > level.max() - 45)
        edges = np.flatnonzero(np.diff(np.concatenate([[0], v.astype(int), [0]])))
        for a, b in zip(edges[::2], edges[1::2]):
            v[a:b] &= (b - a) * FP >= 15  # drop voiced blips
        f0a = f0.copy()  # analysis f0: bridge harvest gaps inside voiced regions
        gap, ok = np.flatnonzero(v & (f0 <= 0)), np.flatnonzero(f0 > 0)
        if len(gap) and len(ok):
            f0a[gap] = np.exp(np.interp(gap, ok, np.log(f0[ok])))
        return dict(t=t, voiced=v, sp=pw.cheaptrick(x, f0a, t, self.sr), ap=pw.d4c(x, f0a, t, self.sr))

    def resynth(self, an, f0, x, consonants=1.0):
        """WORLD resynthesis on the new f0 in voiced frames; unvoiced parts from the TTS audio x."""
        y = pw.synthesize(np.where(an['voiced'], f0, 0.0), an['sp'], an['ap'], self.sr, FP)
        y = np.pad(y, (0, max(len(x) - len(y), 0)))[:len(x)]
        m = np.interp(np.arange(len(x)) / self.sr, an['t'], an['voiced'].astype(float))
        win = np.hanning(2 * int(0.006 * self.sr) + 1)
        m = np.clip(np.convolve(m, win / win.sum(), mode='same'), 0, 1)
        return m * y + (1 - m) * x * consonants


def f0_contour(t, notes, spb, pitches, glide=(0.045, 0.015), vib_cents=25.0, vib_rate=5.5):
    """Target f0 (Hz) at song times t: midi `pitches` per note, cosine portamento into each note,
    delayed vibrato on notes of a beat or longer."""
    T = np.array([n['beat'] * spb for n in notes])
    D = np.array([n['dur'] * spb for n in notes])
    P = np.asarray(pitches, float)
    p = P[np.clip(np.searchsorted(T, t, side='right') - 1, 0, len(T) - 1)]
    a, b = glide
    for j in range(1, len(T)):
        m = (t > T[j] - a) & (t < T[j] + b)
        p[m] = P[j - 1] + (P[j] - P[j - 1]) * (0.5 - 0.5 * np.cos(np.pi * (t[m] - T[j] + a) / (a + b)))
    for j in np.flatnonzero(D >= 0.99 * spb):
        m = (t >= T[j]) & (t < T[j] + D[j])
        tt = t[m] - T[j]
        p[m] += vib_cents / 100 * np.clip((tt - 0.18) / 0.2, 0, 1) * np.sin(2 * np.pi * vib_rate * (tt - 0.18))
    return hz(p)


def chord_at(score, beat):
    c = next(c for c in score['chords'] if c['start'] <= beat < c['end'])
    return [(NOTE[c['chord'][0]] + i) % 12 for i in CHORD_PCS[c['chord'][1:]]]


def harmony_note(m_written, pcs):
    """Lowest chord tone at least a minor third above the (written) melody note."""
    return next(h for h in range(m_written + 3, m_written + 10) if h % 12 in pcs)


def phrases(score):
    """Groups of consecutive lines sung without a rest (synthesized as one utterance)."""
    lines, groups = score['lines'], [[0]]
    for i in range(1, len(lines)):
        if lines[i]['start'] - lines[groups[-1][-1]]['end'] < 0.25:
            groups[-1].append(i)
        else:
            groups.append([i])
    return groups


def late_onsets(an, P):
    """Voicing onset (as resynthesized) minus planned anchor (s) for vowels after silence/unvoiced
    consonants (e.g. a stressed /t/ whose aspiration delays the vowel); 0 where not measurable."""
    v, t = an['voiced'], an['t']
    out = []
    for a, clean in zip(P['anchors'], P['clean']):
        on = [t[i] for i in np.flatnonzero((t > a - 0.03) & (t < a + 0.12)) if clean and v[i] and not v[i - 1] and v[i:i + 4].all()]
        out.append(min(on, key=lambda o: abs(o - a)) - a if on else 0.0)
    return np.array(out)


def sing_phrase(S, score, grp, seed):
    spb = score['secondsPerBeat']
    notes = [s for s in score['syllables'] if s['line'] in grp]
    text = ' '.join(score['lines'][i]['text'] for i in grp)
    shift = None
    for _ in range(2):  # 2nd pass: start late-voicing syllables earlier (damped: the burst of an
        S.reseed(seed)  # aspirated stop should lead the beat a little, its vowel follow a little)
        P = S.plan(notes, text, spb, shift)
        x, _ = S.run(P['ids'], P['dur'])
        an = S.analyze(x, P['vowels'])
        late = late_onsets(an, P)
        if shift is not None or late.max() < 0.03:
            break
        shift = np.clip(0.5 * late, 0, 0.05) * (late >= 0.03)
    start = P['T'][0] - P['anchors'][0]  # song time of the phrase's first sample
    mel = [midi(n['pitch']) + score['transpose'] for n in notes]
    f0 = f0_contour(an['t'] + start, notes, spb, mel)
    return dict(notes=notes, P=P, x=x, start=start, an=an, mel=mel, f0=f0, lead=S.resynth(an, f0, x))


def render(score, cache_dir, harmony_lines=(2, 3, 6, 7), log=print, seed=1):
    """Lead (mono), harmony (mono) and doubles (2 x N) at 44.1 kHz, plus QA info."""
    spb, tr = score['secondsPerBeat'], score['transpose']
    S = Singer(ensure_voice(cache_dir))
    sr, n_out = S.sr, int(round(score['duration'] * S.sr))
    bufs = {k: np.zeros(n_out + sr) for k in ('lead', 'harm', 'dl', 'dr')}
    qa = dict(t=[], target=[], voiced=[], onsets=[], word_starts=[])
    rng = np.random.default_rng(3)
    for gi, grp in enumerate(phrases(score)):
        r = sing_phrase(S, score, grp, seed + gi)
        an, x, notes, ts = r['an'], r['x'], r['notes'], r['an']['t'] + r['start']
        tracks = {'lead': r['lead']}
        for k, sgn in (('dl', 1), ('dr', -1)):  # doubles: +-7 cents with slow drift, voiced only
            cents = 7 + 3 * np.sin(2 * np.pi * rng.uniform(0.2, 0.4) * ts + rng.uniform(0, 6))
            tracks[k] = S.resynth(an, r['f0'] * 2 ** (sgn * cents / 1200), x, 0.0)
        if all(i in harmony_lines for i in grp):
            hm = [harmony_note(midi(n['pitch']), chord_at(score, n['beat'])) + tr for n in notes]
            tracks['harm'] = S.resynth(an, f0_contour(ts, notes, spb, hm, vib_cents=18), x, 0.0)
        st = int(round(r['start'] * sr))
        fade = np.minimum(1, np.minimum(np.arange(len(x)), np.arange(len(x))[::-1]) / (0.005 * sr))
        for k, y in tracks.items():
            bufs[k][st:st + len(y)] += y * fade
        qa['t'].append(ts)
        qa['target'].append(f0_contour(ts, notes, spb, r['mel'], vib_cents=0))
        qa['voiced'].append(an['voiced'])
        qa['onsets'] += [(n['beat'] * spb, n['text'], c) for n, c in zip(notes, r['P']['clean'])]
        qa['word_starts'] += [None if ws is None else ws + r['start']
                              for n, ws in zip(notes, r['P']['word_start']) if not n['joinPrev']]
        log(f'  sang phrase {gi}: {" / ".join(score["lines"][i]["text"] for i in grp)}')
    out = {k: resample_poly(v[:n_out], OUT_SR, sr) for k, v in bufs.items()}
    peak = np.abs(out['lead']).max()
    out = {k: v / peak * 0.5 for k, v in out.items()}
    return dict(lead=out['lead'], harmony=out['harm'], doubles=np.array([out['dl'], out['dr']]), voice=VOICE,
                qa={k: v if k in ('onsets', 'word_starts') else np.concatenate(v) for k, v in qa.items()})
