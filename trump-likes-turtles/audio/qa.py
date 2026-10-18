"""QA for the built song: plots, intelligibility (faster-whisper), timing, pitch, loudness, MP3 sync."""
import json
import os
import re
import subprocess

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pyworld as pw  # noqa: E402
import soundfile as sf  # noqa: E402
from scipy.signal import resample_poly  # noqa: E402

SR = 44100


def norm(w):
    return re.sub(r'[^a-z0-9]', '', w.lower())


def ref_words(score):
    words = []
    for s in score['syllables']:
        if s['joinPrev']:
            words[-1][0] += s['text']
        else:
            words.append([s['text'], s['beat'] * score['secondsPerBeat']])
    return [(norm(w), t) for w, t in words if norm(w)]


def align(ref, hyp):
    """Levenshtein alignment -> (distance, [(ref_i|None, hyp_j|None)])."""
    D = np.zeros((len(ref) + 1, len(hyp) + 1), int)
    D[:, 0], D[0, :] = range(len(ref) + 1), range(len(hyp) + 1)
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            D[i, j] = min(D[i - 1, j] + 1, D[i, j - 1] + 1, D[i - 1, j - 1] + (ref[i - 1] != hyp[j - 1]))
    i, j, pairs = len(ref), len(hyp), []
    while i or j:
        if i and j and D[i, j] == D[i - 1, j - 1] + (ref[i - 1] != hyp[j - 1]):
            pairs.append((i - 1, j - 1))
            i, j = i - 1, j - 1
        elif i and D[i, j] == D[i - 1, j] + 1:
            pairs.append((i - 1, None))
            i -= 1
        else:
            pairs.append((None, j - 1))
            j -= 1
    return D[-1, -1], pairs[::-1]


def asr_eval(model, path, score, true_starts):
    x, sr = sf.read(path, always_2d=True)
    x = resample_poly(x.mean(1), 160, 441).astype(np.float32)  # 44.1k -> 16k
    segs, _ = model.transcribe(x, language='en', word_timestamps=True, beam_size=5,
                               condition_on_previous_text=False, vad_filter=False)
    hyp = [(norm(w.word), w.start, w.word.strip()) for s in segs for w in s.words if norm(w.word)]
    ref = ref_words(score)
    dist, pairs = align([r[0] for r in ref], [h[0] for h in hyp])
    ok = [(i, j) for i, j in pairs if i is not None and j is not None and ref[i][0] == hyp[j][0]]
    dt = np.array([hyp[j][1] - ref[i][1] for i, j in ok])
    dw = np.array([hyp[j][1] - true_starts[i] for i, j in ok if true_starts[i] is not None])
    ms = lambda v: round(float(v) * 1000)
    return {'transcript': ' '.join(h[2] for h in hyp), 'wer': round(dist / len(ref), 3), 'words_matched': len(dt),
            'words_ref': len(ref),
            'whisper_word_start_minus_beat_ms': {'median': ms(np.median(dt)), 'median_abs': ms(np.median(np.abs(dt))),
                                                 'within_80ms': round(float(np.mean(np.abs(dt) <= 0.08)), 2)},
            'whisper_word_start_minus_true_word_start_ms': {'median': ms(np.median(dw)), 'median_abs': ms(np.median(np.abs(dw))),
                                                            'within_80ms': round(float(np.mean(np.abs(dw) <= 0.08)), 2)}}


def pitch_check(voc, out_png):
    q = voc['qa']
    x = resample_poly(voc['lead'], 160, 441)
    f0, t = pw.harvest(x, 16000, f0_floor=70, f0_ceil=500, frame_period=5.0)
    meas = np.interp(q['t'], t, f0, left=0, right=0)
    near = np.interp(q['t'], t, (f0 > 0).astype(float)) > 0.99
    ok = q['voiced'] & near & (meas > 0)
    cents = 1200 * np.log2(meas[ok] / q['target'][ok])
    tm = lambda f: 69 + 12 * np.log2(np.maximum(f, 1e-3) / 440)
    fig, axs = plt.subplots(4, 1, figsize=(16, 13))
    for r, ax in enumerate(axs):
        a, b = 10 * r, 10 * r + 10
        m = (q['t'] >= a) & (q['t'] < b)
        ax.plot(q['t'][m], tm(q['target'][m]), '.', color='#999', ms=3, label='target note (no vibrato)')
        mt = (t >= a) & (t < b) & (f0 > 0)
        ax.plot(t[mt], tm(f0[mt]), '.', color='#d62728', ms=2, label='sung f0 (harvest, dry lead)')
        for bt, txt, _ in q['onsets']:
            if a <= bt < b:
                ax.axvline(bt, color='#1f77b4', lw=0.4, alpha=0.4)
                ax.text(bt, 61.3, txt, fontsize=7, rotation=45)
        ax.set_xlim(a, b)
        ax.set_ylim(48, 63)
        ax.set_yticks(range(48, 63, 2))
        ax.set_yticklabels([['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][k % 12] + str(k // 12 - 1) for k in range(48, 63, 2)])
        ax.grid(alpha=0.3)
    axs[0].legend(loc='upper right', fontsize=8)
    axs[0].set_title(f'Vocal pitch vs target — median |error| {np.median(np.abs(cents)):.1f} cents on {ok.sum()} voiced frames')
    axs[-1].set_xlabel('time (s)')
    plt.tight_layout()
    plt.savefig(out_png, dpi=90)
    plt.close()
    # vowel-onset timing measured on the output: voicing onsets (f0 present, low-band energy dominant,
    # not quiet) nearest the beat, for syllables whose vowel follows silence or an unvoiced consonant
    n = int(0.02 * 16000)
    fr = np.lib.stride_tricks.sliding_window_view(np.pad(x, (n // 2, n)), n)[np.arange(len(f0)) * 80] * np.hanning(n)
    P = np.abs(np.fft.rfft(fr, axis=1)) ** 2
    fq = np.fft.rfftfreq(n, 1 / 16000)
    lvl = 10 * np.log10(P[:, fq >= 70].sum(1) + 1e-12)
    v = (f0 > 0) & (P[:, (fq >= 70) & (fq < 1000)].sum(1) / (P[:, fq >= 70].sum(1) + 1e-12) > 0.5) & (lvl > lvl.max() - 38)
    errs = []
    for bt, _, clean in q['onsets']:
        idx = np.flatnonzero((t > bt - 0.12) & (t < bt + 0.08))
        cand = [i for i in idx if clean and v[i] and not v[i - 1] and v[i:i + 4].all()]
        if cand:
            errs.append(t[min(cand, key=lambda i: abs(t[i] - bt))] - bt)
    e = np.array(errs) * 1000
    return {'median_abs_cents': round(float(np.median(np.abs(cents))), 1),
            'p90_abs_cents': round(float(np.percentile(np.abs(cents), 90)), 1), 'voiced_frames': int(ok.sum())}, \
           {'n_syllables_with_voicing_onset': len(e), 'median_ms': round(float(np.median(e)), 1),
            'p90_abs_ms': round(float(np.percentile(np.abs(e), 90)), 1), 'max_abs_ms': round(float(np.abs(e).max()), 1)}


def spectrogram(song, score, out_png):
    x = song.mean(0)
    nfft, hop = 4096, 512
    win = np.hanning(nfft)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (nfft // 2, nfft)), nfft)[::hop]
    S = 20 * np.log10(np.abs(np.fft.rfft(frames * win, axis=1)).T + 1e-9)
    f = np.fft.rfftfreq(nfft, 1 / SR)
    t = np.arange(S.shape[1]) * hop / SR
    k = (f >= 30)
    fig, ax = plt.subplots(figsize=(18, 7))
    ax.pcolormesh(t, f[k], S[k], shading='auto', cmap='magma', vmin=S.max() - 90, vmax=S.max())
    ax.set_yscale('log')
    ax.set_ylim(30, 20000)
    for s in score['sections']:
        ax.axvline(s['start'] * score['secondsPerBeat'], color='w', lw=1)
        ax.text(s['start'] * score['secondsPerBeat'] + 0.2, 15000, s['name'], color='w', fontsize=10)
    ax.set_xlabel('time (s)')
    ax.set_ylabel('Hz')
    ax.set_title('Trump Likes Turtles — full mix spectrogram')
    plt.tight_layout()
    plt.savefig(out_png, dpi=80)
    plt.close()


def mp3_check(mp3, song):
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3],
                               capture_output=True, text=True).stdout.strip())
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp3, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True).stdout
    y = np.frombuffer(raw, np.float32)
    x = song.mean(0)[:SR * 10]
    seg = y[:SR * 10 + 4000]
    c = [np.dot(x[2000:-2000], seg[2000 + d:2000 + d + len(x) - 4000]) for d in range(-2000, 2000)]
    return {'ffprobe_duration_s': dur, 'decoded_samples': int(len(y)), 'offset_vs_wav_samples': int(np.argmax(c) - 2000)}


def run(score, build, mp3, voc, asr=True):
    qa_dir = os.path.join(build, 'qa')
    song, _ = sf.read(os.path.join(build, 'song.wav'), always_2d=True)
    song = song.T
    import pyloudnorm
    up = resample_poly(song, 4, 1, axis=1)
    rep = {'voice': voc['voice'], 'transpose': score['transpose'], 'samples': song.shape[1],
           'lufs_integrated': round(pyloudnorm.Meter(SR).integrated_loudness(song.T), 2),
           'sample_peak_dbfs': round(20 * np.log10(np.abs(song).max()), 2),
           'true_peak_dbtp_4x': round(20 * np.log10(np.abs(up).max()), 2),
           'dc_offset': [round(float(v), 6) for v in song.mean(1)],
           'first_sample_abs_max_10ms': round(float(np.abs(song[:, :441]).max()), 4)}
    spectrogram(song, score, os.path.join(qa_dir, 'spectrogram.png'))
    rep['pitch'], rep['vowel_onset_timing'] = pitch_check(voc, os.path.join(qa_dir, 'pitch_track.png'))
    lead_in = np.array([t - s for (t, _), s in zip(ref_words(score), voc['qa']['word_starts']) if s is not None])
    rep['consonant_lead_in_ms'] = {'words': len(lead_in), 'median': round(float(np.median(lead_in)) * 1000),
                                   'p90': round(float(np.percentile(lead_in, 90)) * 1000)}
    rep['mp3'] = mp3_check(mp3, song)
    if asr:
        from faster_whisper import WhisperModel
        model = WhisperModel('small.en', device='cpu', compute_type='int8',
                             download_root=os.path.join(build, 'cache', 'whisper'))
        ts = voc['qa']['word_starts']
        rep['asr_vocal_stem'] = asr_eval(model, os.path.join(build, 'stems', 'vocals.wav'), score, ts)
        rep['asr_full_mix'] = asr_eval(model, os.path.join(build, 'song.wav'), score, ts)
    with open(os.path.join(qa_dir, 'report.json'), 'w') as f:
        json.dump(rep, f, indent=1)
    print(json.dumps(rep, indent=1))
    return rep
