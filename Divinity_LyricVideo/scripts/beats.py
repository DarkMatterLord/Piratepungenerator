import sys, json, numpy as np, librosa
S=sys.argv[1]
y, sr = librosa.load(f'{S}/audio/mix16k.wav', sr=16000)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=256, start_bpm=96, units='time')
print('tempo', tempo)
bt=np.array(beats); d=np.diff(bt)
print('beats', len(bt), 'median ibi', np.median(d))
print('first beats', bt[:24].round(2))
# section-ish energy per 2s
rms=librosa.feature.rms(y=y, hop_length=320)[0]; t=np.arange(len(rms))*320/sr
for a in range(140,176): 
    seg=rms[(t>=a)&(t<a+1)]; print(a, round(20*np.log10(seg.mean()+1e-9),1), round(20*np.log10(seg.max()+1e-9),1))
for a in range(255,273):
    seg=rms[(t>=a)&(t<a+1)]; print(a, round(20*np.log10(seg.mean()+1e-9),1), round(20*np.log10(seg.max()+1e-9),1))
json.dump({'tempo':float(np.atleast_1d(tempo)[0]),'beats':bt.round(3).tolist()}, open(f'{S}/work/beats.json','w'))
