import sys, json, re
S=sys.argv[1]
words=json.load(open(f'{S}/work/words_vocal.json'))
num={'39':['thirty','nine']}
def norm(w):
    w=w.lower().replace('—',' ').replace('-',' ')
    out=[]
    for t in re.findall(r"[a-z0-9']+", w):
        t=t.strip("'")
        if t in num: out+=num[t]
        elif t: out.append(t)
    return out
hyp=[]  # (token, time)
for w,t in words:
    for k in norm(w): hyp.append((k,t))
lines=[]; sec=None
for L in open(f'{S}/work/lyrics.txt'):
    L=L.strip()
    if not L: continue
    if L.startswith('#'): sec=L[1:]; continue
    lines.append({'sec':sec,'text':L,'toks':norm(L)})
ref=[]; 
for i,l in enumerate(lines):
    for k in l['toks']: ref.append((k,i))
# Needleman-Wunsch with fuzzy match
from difflib import SequenceMatcher
ALIAS={'whis':{'wheeze','we','please','his','wis','whiz'},'hakai':{'haka','hockey','hakkai'},'kais':{'cast','kai'},'bend':{'bear','bent'},'end':{'air'}}
def sim(a,b):
    if a==b: return 2.0
    if b in ALIAS.get(a,()): return 1.5
    r=SequenceMatcher(None,a,b).ratio()
    return 1.0 if r>=0.6 else -1.0
n,m=len(ref),len(hyp); G=-0.6
import numpy as np
D=np.zeros((n+1,m+1)); P=np.zeros((n+1,m+1),dtype=np.int8)
D[1:,0]=G*np.arange(1,n+1); D[0,1:]=G*np.arange(1,m+1)
for i in range(1,n+1):
    ri=ref[i-1][0]
    for j in range(1,m+1):
        a=D[i-1,j-1]+sim(ri,hyp[j-1][0]); b=D[i-1,j]+G; c=D[i,j-1]+G
        if a>=b and a>=c: D[i,j]=a; P[i,j]=0
        elif b>=c: D[i,j]=b; P[i,j]=1
        else: D[i,j]=c; P[i,j]=2
i,j=n,m; match={}
while i>0 and j>0:
    if P[i,j]==0:
        if sim(ref[i-1][0],hyp[j-1][0])>0: match[i-1]=j-1
        i-=1; j-=1
    elif P[i,j]==1: i-=1
    else: j-=1
# per line timing
ri=0
for li,l in enumerate(lines):
    idx=[k for k,(t,x) in enumerate(ref) if x==li]
    m_=[match[k] for k in idx if k in match]
    l['n']=len(idx); l['matched']=len(m_)
    l['start']=hyp[min(m_)][1] if m_ else None
    l['last']=hyp[max(m_)][1] if m_ else None
    l['first_ok']= idx[0] in match
    print(f"{l['sec'][:10]:10s} {str(l['start']):>7s} {str(l['last']):>7s} {l['matched']:2d}/{l['n']:2d} {'F' if l['first_ok'] else ' '} {l['text'][:70]}")
json.dump({'lines':lines,'hyp':hyp,'match':{str(k):v for k,v in match.items()},'ref':ref}, open(f'{S}/work/align.json','w'))
