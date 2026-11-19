"""Extract per-frame audio features (30 fps) used to drive the animation.
inputs: song.wav (full mix), stem0.wav (vocals), stem1.wav (instrumental)"""
import librosa, numpy as np, json, sys
FPS = 30
wd = sys.argv[1] if len(sys.argv) > 1 else "."
out = sys.argv[2] if len(sys.argv) > 2 else "audio_features.json"
sr = 22050
mix, _ = librosa.load(f"{wd}/song.wav", sr=sr, mono=True)
voc, _ = librosa.load(f"{wd}/stem0.wav", sr=sr, mono=True)
ins, _ = librosa.load(f"{wd}/stem1.wav", sr=sr, mono=True)
hop = sr // FPS  # 735 -> exactly 30 fps
n = int(np.ceil(len(mix) / hop))
def fit(a):
    a = np.asarray(a).ravel()
    return np.pad(a, (0, max(0, n - len(a))))[:n]
def norm(a, p=98):
    a = a / (np.percentile(a, p) + 1e-9)
    return np.clip(a, 0, 1.5)
# vocal loudness -> mouth
vrms = fit(librosa.feature.rms(y=voc, frame_length=1470, hop_length=hop, center=True)[0])
# vocal "syllable" onsets for jaw snaps
vons = fit(librosa.onset.onset_strength(y=voc, sr=sr, hop_length=hop))
# bass / kick energy from instrumental
S = np.abs(librosa.stft(ins, n_fft=2048, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
bass = fit(S[(freqs > 30) & (freqs < 150)].sum(0))
hats = fit(S[(freqs > 6000)].sum(0))
total = fit(librosa.feature.rms(y=mix, frame_length=2048, hop_length=hop)[0])
onset = librosa.onset.onset_strength(y=ins, sr=sr, hop_length=hop)
tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=hop, units="time")
tempo = float(np.atleast_1d(tempo)[0])
# kick-ish transient: positive bass flux
bflux = np.maximum(0, np.diff(bass, prepend=bass[0]))
res = {
    "fps": FPS, "frames": n, "tempo": tempo, "beats": [round(float(b), 3) for b in beats],
    "vocal": [round(float(v), 3) for v in norm(vrms)],
    "vocalOnset": [round(float(v), 3) for v in norm(vons, 99)],
    "bass": [round(float(v), 3) for v in norm(bass)],
    "bassHit": [round(float(v), 3) for v in norm(bflux, 99.5)],
    "hats": [round(float(v), 3) for v in norm(hats)],
    "level": [round(float(v), 3) for v in norm(total)],
}
json.dump(res, open(out, "w"))
print("tempo", tempo, "beats", len(beats), "frames", n)
print("first beats", res["beats"][:12])
