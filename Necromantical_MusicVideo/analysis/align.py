import json, re, sys, numpy as np
SP = sys.argv[1]
text = open(f'{SP}/analysis/lyrics.txt').read().replace('’',"'")
sections=[]; lines=[]
cur=None
for raw in text.split('\n'):
    l=raw.strip()
    if not l or l=='---' or l.startswith('('): continue
    if l.endswith(':'): cur=l[:-1]; continue
    lines.append({'section':cur,'text':l})
toks=[]
for i,L in enumerate(lines):
    for w in re.findall(r"[a-z']+", L['text'].lower()):
        toks.append((w,i))
def norm(w): return w.replace("'","")
def sim(a,b):
    a,b=norm(a),norm(b)
    if a==b: return 2.0
    if len(a)>3 and len(b)>3 and (a[:4]==b[:4]): return 1.0
    return -1.0
runs=['vosk_center_g','vosk_mix_g']
per_tok=[[] for _ in toks]
for r in runs:
    rec=json.load(open(f'{SP}/analysis/{r}.json'))
    n,m=len(toks),len(rec)
    D=np.zeros((n+1,m+1)); P=np.zeros((n+1,m+1),int)
    gap=-0.4
    D[:,0]=np.arange(n+1)*gap; D[0,:]=np.arange(m+1)*gap
    for i in range(1,n+1):
        for j in range(1,m+1):
            c=[D[i-1,j-1]+sim(toks[i-1][0],rec[j-1]['word']), D[i-1,j]+gap, D[i,j-1]+gap]
            k=int(np.argmax(c)); D[i,j]=c[k]; P[i,j]=k
    i,j=n,m
    while i>0 and j>0:
        k=P[i,j]
        if k==0:
            if sim(toks[i-1][0],rec[j-1]['word'])>0: per_tok[i-1].append((rec[j-1]['start'],rec[j-1]['end']))
            i-=1;j-=1
        elif k==1: i-=1
        else: j-=1
# per line summary
out=[]
for li,L in enumerate(lines):
    idx=[k for k,(w,i) in enumerate(toks) if i==li]
    matched=[(k,np.median([s for s,e in per_tok[k]]),np.median([e for s,e in per_tok[k]])) for k in idx if per_tok[k]]
    words=[toks[k][0] for k in idx]
    if matched:
        k0,s0,_=matched[0]; k1,_,e1=matched[-1]
        est_s = s0 - (k0-idx[0])*0.33
        est_e = e1 + (idx[-1]-k1)*0.33
    else: est_s=est_e=None
    mstr=' '.join(f"{toks[k][0]}@{s:.2f}" for k,s,e in matched)
    print(f"{li:2d} [{L['section']:<16}] {est_s if est_s is None else round(est_s,2)!s:>7} - {est_e if est_e is None else round(est_e,2)!s:>7} | {L['text']}\n      {mstr}")
    out.append({**L,'est_start':est_s,'est_end':est_e,'n_matched':len(matched),'n_words':len(idx)})
json.dump(out,open(f'{SP}/analysis/lines_est.json','w'),indent=1)
