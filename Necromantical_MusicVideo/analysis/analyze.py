import sys, json, numpy as np, librosa
wav = sys.argv[1]; out = sys.argv[2]
y, sr = librosa.load(wav, sr=22050, mono=True)
dur = len(y)/sr
hop = 512
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop, units='frames')
bt = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
print("dur", dur, "tempo", tempo, "nbeats", len(bt))
print("first beats", np.round(bt[:16],3))
ib = np.diff(bt); print("median IBI", np.median(ib), "->", 60/np.median(ib))
# rms
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
# per-second rms summary
for s in range(0, int(dur)+1, 2):
    m = (t>=s)&(t<s+2)
    if m.any(): print(f"{s:4d}s rms {20*np.log10(rms[m].mean()+1e-9):6.1f} dB", "#"*int(max(0,(20*np.log10(rms[m].mean()+1e-9)+40))))
# onset env
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
json.dump({"dur":dur,"tempo":float(np.atleast_1d(tempo)[0]),"beats":bt.tolist(),
           "rms_t":t[::2].tolist(),"rms":rms[::2].tolist(),"onset":oenv[::2].tolist()}, open(out,"w"))
