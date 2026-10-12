import sys, json, re, numpy as np
S=sys.argv[1]
A=json.load(open(f'{S}/work/align.json'))
lines=A['lines']; hyp=A['hyp']; match={int(k):v for k,v in A['match'].items()}; ref=A['ref']
num={'39':['thirty','nine']}
def norm(w):
    w=w.lower().replace('—',' ').replace('-',' ')
    out=[]
    for t in re.findall(r"[a-z0-9']+", w):
        t=t.strip("'")
        if t in num: out+=num[t]
        elif t: out.append(t)
    return out
N=len(ref)
T=np.full(N,np.nan)
for i,j in match.items(): T[i]=hyp[j][1]
# chorus template fill: map token idx per chorus
chor=[[k for k,(t,li) in enumerate(ref) if lines[li]['sec']==c] for c in ('Chorus 1','Chorus 2','Chorus 3')]
assert len(chor[0])==len(chor[1])==len(chor[2])
for c in (1,2):
    offs=[T[chor[c][j]]-T[chor[0][j]] for j in range(len(chor[0])) if not np.isnan(T[chor[c][j]]) and not np.isnan(T[chor[0][j]])]
    off=float(np.median(offs)); print('chorus',c+1,'offset',round(off,3),'spread',round(float(np.std(offs)),3))
    for j in range(len(chor[0])):
        k=chor[c][j]
        if np.isnan(T[k]) and not np.isnan(T[chor[0][j]]): T[k]=T[chor[0][j]]+off
# also fill chorus1 gaps from chorus 3
for j in range(len(chor[0])):
    k=chor[0][j]
    if np.isnan(T[k]) and not np.isnan(T[chor[2][j]]): T[k]=T[chor[2][j]]-138.2
# enforce monotonic: drop matches that go backwards
last=-1
for k in range(N):
    if not np.isnan(T[k]):
        if T[k] < last: T[k]=np.nan
        else: last=T[k]
# interpolate remaining within neighbours (but cap gap so we don't stretch across sections)
known=np.where(~np.isnan(T))[0]
for k in range(N):
    if np.isnan(T[k]):
        p=known[known<k]; n=known[known>k]
        if len(p) and len(n):
            a,b=p[-1],n[0]
            ta,tb=T[a],T[b]
            # if gap long (section break), place right after prev / before next with 0.3s spacing
            if tb-ta > 0.6*(b-a)+1.5:
                if ref[k][1]==ref[b][1]: T[k]=tb-0.3*(b-k)
                else: T[k]=ta+0.3*(k-a)
            else: T[k]=ta+(tb-ta)*(k-a)/(b-a)
        elif len(n): T[k]=T[n[0]]-0.3*(n[0]-k)
        else: T[k]=T[p[-1]]+0.3*(k-p[-1])
# build visual words
out=[]; k=0
for li,l in enumerate(lines):
    vws=[w for w in l['text'].split(' ') if w]
    words=[]
    for vw in vws:
        nt=norm(vw)
        if not nt:
            words.append({'w':vw,'t':None}); continue
        words.append({'w':vw,'t':round(float(T[k]),3),'tok':nt,'tt':[round(float(T[k+q]),3) for q in range(len(nt))]}); k+=len(nt)
    OVR={(19,0):92.4}
    for (a,b),v in OVR.items():
        if a==li: words[b]['t']=v; words[b]['tt'][0]=v
    # fill None (pure punctuation) and end times
    for i,w in enumerate(words):
        if w['t'] is None: w['t']=words[i-1]['t'] if i else words[i+1]['t']
    for i,w in enumerate(words):
        nxt=words[i+1]['t'] if i+1<len(words) else None
        w['e']=round(min(nxt, w['t']+0.7) if nxt else w['t']+0.55,3)
    out.append({'sec':l['sec'],'text':l['text'],'start':words[0]['t'],'end':words[-1]['e'],'words':words})
assert k==N
for o in out: print(f"{o['sec'][:10]:10s} {o['start']:7.2f}-{o['end']:7.2f} {o['text'][:60]}")
json.dump(out, open(f'{S}/work/lines_timed.json','w'), indent=1)
