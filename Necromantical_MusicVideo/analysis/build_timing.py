import json, sys, numpy as np, librosa, soundfile as sf
SP, OUT = sys.argv[1], sys.argv[2]
FPS = 30
lines_est = json.load(open(f'{SP}/analysis/lines_est.json'))
# hand-verified line windows (start of first syllable, end of last), from Vosk word alignment + spectrogram checks
T = [(0.42,2.8),(2.9,5.6),(5.8,8.6),(8.7,11.0),
     (11.70,14.5),(14.73,17.5),(17.91,20.6),(20.91,23.4),
     (23.73,26.5),(26.64,29.4),(29.6,32.5),(32.76,35.5),
     (36.15,39.3),(39.48,42.2),(42.48,45.2),(45.4,48.24),
     (53.70,56.5),(56.70,59.5),(59.72,62.5),(62.70,65.3),
     (65.73,68.4),(68.62,71.0),(71.70,74.3),(74.8,77.5),
     (78.15,81.2),(81.48,84.2),(84.48,87.3),(87.51,90.2),
     (101.6,104.0),(104.65,107.4),(107.73,110.4),(110.76,113.5),
     (113.9,116.6),(116.8,119.4),(119.9,122.0),(122.16,125.3),
     (126.05,129.36),(129.36,131.9),(132.4,135.3),(135.5,138.14),
     (149.64,152.6),(152.9,155.5),(155.76,158.6),(158.70,161.5),
     (161.9,164.6),(164.8,167.5),(167.7,170.4),(170.5,173.3)]
assert len(T)==len(lines_est)==48
lines=[{'i':i,'section':L['section'],'text':L['text'].rstrip(',.;'),'start':s,'end':e} for i,(L,(s,e)) in enumerate(zip(lines_est,T))]
sections=[
 {'name':'intro','label':'Intro','start':0.0,'end':11.55},
 {'name':'verse1','label':'Verse 1','start':11.55,'end':23.6},
 {'name':'pre1','label':'Pre-Chorus','start':23.6,'end':36.15},
 {'name':'chorus1','label':'Chorus 1','start':36.15,'end':48.4},
 {'name':'gap1','label':'Instrumental','start':48.4,'end':53.55},
 {'name':'verse2','label':'Verse 2','start':53.55,'end':65.6},
 {'name':'pre2','label':'Pre-Chorus','start':65.6,'end':78.15},
 {'name':'chorus2','label':'Chorus 2','start':78.15,'end':90.4},
 {'name':'break','label':'Instrumental Break','start':90.4,'end':101.45},
 {'name':'interlude','label':'Interlude','start':101.45,'end':113.75},
 {'name':'bridge','label':'Bridge','start':113.75,'end':126.05},
 {'name':'chorus3','label':'Chorus 3','start':126.05,'end':138.3},
 {'name':'inst2','label':'Instrumental','start':138.3,'end':149.5},
 {'name':'outroA','label':'Outro','start':149.5,'end':161.9},
 {'name':'outroB','label':'Outro (final)','start':161.9,'end':173.6},
 {'name':'end','label':'Ending','start':173.6,'end':188.76},
]
y, sr = librosa.load(f'{SP}/audio/song.wav', sr=22050, mono=True)
dur = len(y)/sr
hop = 512
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop)
bt = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
ot = librosa.frames_to_time(np.arange(len(oenv)), sr=sr, hop_length=hop)
bstr = np.interp(bt, ot, oenv)
# downbeat phase: which beat index mod 4 has strongest mean onset
ph = int(np.argmax([bstr[k::4].mean() for k in range(4)]))
print('downbeat phase', ph, [round(bstr[k::4].mean(),2) for k in range(4)])
downbeats = bt[ph::4]
# per-frame envelopes at FPS
nF = int(np.ceil(dur*FPS))
ft = np.arange(nF)/FPS
rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
fr = librosa.fft_frequencies(sr=sr, n_fft=2048)
low = S[(fr>30)&(fr<150)].sum(0); high = S[(fr>4000)].sum(0)
def env(x, norm_pct=98):
    v = np.interp(ft, ot[:len(x)], x[:len(ot)])
    v = v/np.percentile(v, norm_pct); return np.clip(v,0,1.5)
E = {'rms':env(rms),'low':env(low),'high':env(high),'onset':env(oenv)}
# smooth rms a bit
k=5; E['rms'] = np.convolve(E['rms'], np.ones(k)/k, mode='same')
data = {'duration':dur,'fps':FPS,'tempo':float(np.atleast_1d(tempo)[0]),
        'beats':[round(float(b),3) for b in bt],'beatStrength':[round(float(s),2) for s in bstr/np.percentile(bstr,95)],
        'downbeats':[round(float(b),3) for b in downbeats],
        'sections':sections,'lines':lines,
        'env':{k:[round(float(x),3) for x in v] for k,v in E.items()}}
json.dump(data, open(OUT,'w'), separators=(',',':'))
print('wrote', OUT, 'frames', nF, 'beats', len(bt))
for s in sections: print(f"{s['start']:7.2f}-{s['end']:7.2f} {s['label']}")
