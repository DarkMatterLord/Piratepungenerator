import sys, json, numpy as np, soundfile as sf, librosa
S=sys.argv[1]; FPS=30
y,sr=sf.read(f'{S}/audio/mix16k.wav', dtype='float32')
dur=272.832; N=int(round(dur*FPS))
hop=160
o=librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, fmax=220, n_mels=24)
o=o/np.percentile(o,99.0); o=np.clip(o,0,1.5)
ot=np.arange(len(o))*hop/sr
kick=np.zeros(N)
for n in range(N):
    a=n/FPS; b=(n+1)/FPS
    s=o[(ot>=a)&(ot<b)]; kick[n]=s.max() if len(s) else 0
env=np.zeros(N); r=np.exp(-1/FPS/0.11)
for n in range(N): env[n]=max(kick[n], env[n-1]*r if n else 0)
env=np.clip((env-0.25)/0.75,0,1)
rms=librosa.feature.rms(y=y, frame_length=1024, hop_length=hop)[0]
rt=np.arange(len(rms))*hop/sr
db=20*np.log10(np.interp(np.arange(N)/FPS, rt, rms)+1e-9)
k=int(FPS*0.6); dbs=np.convolve(db, np.ones(k)/k, mode='same')
energy=np.clip((dbs+27)/9,0,1)
np.savez(f'{S}/work/audiofeat.npz', kick=env.astype(np.float32), energy=energy.astype(np.float32))
for t in [5,15,25,45,72,100,125,150,171,178,190,212,235,256,265]:
    print(t, round(float(energy[t*FPS]),2), round(float(env[t*FPS-15:t*FPS+15].mean()),2))
