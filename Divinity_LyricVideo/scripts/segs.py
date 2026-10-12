import sys, json, numpy as np, soundfile as sf
S=sys.argv[1]; thr=float(sys.argv[2]); mingap=float(sys.argv[3])
y, sr = sf.read(f'{S}/audio/stem0_16k.wav'); hop=0.01; n=int(sr*hop)
m=len(y)//n; e=20*np.log10(np.sqrt((y[:m*n].reshape(m,n)**2).mean(1))+1e-9)
# smooth
k=5; es=np.convolve(e, np.ones(k)/k, mode='same')
act=es>thr
segs=[]; i=0
while i<m:
    if act[i]:
        j=i
        while j<m and act[j]: j+=1
        segs.append([i*hop, j*hop]); i=j
    else: i+=1
# merge gaps shorter than mingap
mer=[]
for s in segs:
    if mer and s[0]-mer[-1][1] < mingap: mer[-1][1]=s[1]
    else: mer.append(s)
mer=[s for s in mer if s[1]-s[0]>0.08]
for a,b in mer: print(f'{a:7.2f} {b:7.2f}  dur {b-a:5.2f}')
json.dump(mer, open(f'{S}/work/segs.json','w'))
print(len(mer))
