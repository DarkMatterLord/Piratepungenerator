"""Audio features for the renderer.

Usage: python3 analyze_audio.py song.wav features.json vocal_env.npy

features.json: tempo, beat times, onsets and 24 fps envelopes (rms/bass/mid/high/onset), 0..1.
vocal_env.npy: vocal-band energy of a REPET-SIM foreground estimate (hop 512 @ 22.05 kHz),
               used for the puppet's replacement-mouth lip sync.
"""
import sys, json, numpy as np, librosa

wav, out_json, out_voc = sys.argv[1:4]
y, sr = librosa.load(wav, sr=22050, mono=True)
dur, hop, fps = len(y) / sr, 512, 24

tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop, units='time')
onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=hop, units='time')

S_full, phase = librosa.magphase(librosa.stft(y, n_fft=2048, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
times = librosa.frames_to_time(np.arange(S_full.shape[1]), sr=sr, hop_length=hop)
nframes = int(np.ceil(dur * fps))

def band(lo, hi):
    m = (freqs >= lo) & (freqs < hi)
    return np.sqrt((S_full[m] ** 2).mean(axis=0))
def to_fps(x):
    return np.interp(np.arange(nframes) / fps, times[:len(x)], x)
def norm(v):
    lo, hi = np.percentile(v, 2), np.percentile(v, 99.5)
    return np.clip((v - lo) / (hi - lo + 1e-9), 0, 1)
r3 = lambda a: [round(float(v), 3) for v in a]

rms = librosa.feature.rms(y=y, hop_length=hop)[0]
feat = {
    'fps': fps, 'duration': dur, 'tempo': float(np.atleast_1d(tempo)[0]),
    'beats': r3(beats), 'onsets': r3(onsets),
    'rms': r3(norm(to_fps(rms))), 'bass': r3(norm(to_fps(band(30, 160)))),
    'mid': r3(norm(to_fps(band(160, 2000)))), 'high': r3(norm(to_fps(band(2000, 9000)))),
    'onset': r3(norm(to_fps(onset_env))),
}
json.dump(feat, open(out_json, 'w'))

# REPET-SIM foreground (vocal) estimate -> vocal-band envelope
S_filter = librosa.decompose.nn_filter(S_full, aggregate=np.median, metric='cosine',
                                       width=int(librosa.time_to_frames(2, sr=sr, hop_length=hop)))
S_filter = np.minimum(S_full, S_filter)
mask_v = librosa.util.softmask(S_full - S_filter, 10 * S_filter, power=2)
S_fg = mask_v * S_full
m = (freqs > 250) & (freqs < 3500)
voc = np.sqrt((S_fg[m] ** 2).mean(axis=0))
np.save(out_voc, voc / np.percentile(voc, 99))
print(f'duration {dur:.2f}s tempo {feat["tempo"]:.1f} beats {len(beats)}')
