import sys, json, numpy as np, cv2
U,S=sys.argv[1],sys.argv[2]
L=json.load(open(f'{S}/work/lines_timed.json'))
CM=json.load(open(f'{S}/work/caption_map.json'))
import re
num={'39':['thirty','nine']}
def norm(x):
    x=x.lower().replace('—',' ').replace('-',' ')
    out=[]
    for t in re.findall(r"[a-z0-9']+", x):
        t=t.strip("'")
        if t in num: out+=num[t]
        elif t: out.append(t)
    return out
def textmask(im):
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV); h,s,v=hsv[...,0].astype(int),hsv[...,1].astype(int),hsv[...,2].astype(int)
    th=cv2.morphologyEx(hsv[...,2],cv2.MORPH_TOPHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11))).astype(int)
    m=(h>=122)&(h<=162)&(v>=150)&(s>=12)&(s<=170)&(th>=22)
    return m.astype(np.uint8)
def bands_of(m,y0):
    rows=m[y0:].sum(1).astype(float); sm=np.convolve(rows,np.ones(3)/3,'same')
    on=sm>max(6,sm.max()*0.12); out=[]; i=0
    while i<len(on):
        if on[i]:
            j=i
            while j<len(on) and on[j]: j+=1
            out.append([i+y0,j+y0,float(sm[i:j].sum())]); i=j
        else: i+=1
    mer=[]
    for b in out:
        if mer and b[0]-mer[-1][1]<=4: mer[-1][1]=b[1]; mer[-1][2]+=b[2]
        else: mer.append(b)
    return [b for b in mer if 10<=b[1]-b[0]<=70]
res={}; dbg=[]
MU=float(sys.argv[3]) if len(sys.argv)>3 else 0.1
XR={'ba879fbe':{0:[465,1200]},'a250a646':{0:[305,1300]},'6c33824c':{1:[465,1200]},'879714d7':{1:[280,1312]},'c7a7d44f':{0:[270,1320]},'470f3458':{1:[380,1200]},'9134d347':{0:[300,1290],1:[300,1290]},'f558e2be':{0:[460,1130]},'dbf73416':{0:[360,1235],1:[380,1200]}}
for key,spec in CM.items():
    im=cv2.imread(f'{U}/{key}-image.png'); H,W=im.shape[:2]
    m=textmask(im)
    vlines=[]
    for sp in spec:
        ws=L[sp[0]]['words']
        if len(sp)==3: ws=ws[sp[1]:sp[2]]
        ex=[]
        for x in ws:
            d=[c for c in '—–' if c in x['w']]
            if d and not x['w'].endswith(d[0]) and not x['w'].startswith(d[0]):
                left,right=x['w'].split(d[0],1)
                nl=len(norm(left))
                ex.append({'w':left+d[0],'t':x['t'],'e':x['tt'][nl]})
                ex.append({'w':right,'t':x['tt'][nl],'e':x['e']})
            else: ex.append(x)
        vlines.append(ex)
    k=len(vlines)
    cands=bands_of(m,int(H*0.66))
    # choose k consecutive candidates (by y) maximising mass with spacing constraint
    best=None
    for i in range(len(cands)-k+1):
        grp=cands[i:i+k]
        if k==2 and not (18<=grp[1][0]-grp[0][1]<=0 or 0<=grp[1][0]-grp[0][1]<=40): continue
        sc=sum(g[2] for g in grp)
        if best is None or sc>best[0]: best=(sc,grp)
    grp=best[1]
    lines=[]
    for (ya,yb,_),ws in zip(grp,vlines):
        hsv_=cv2.cvtColor(im[ya:yb],cv2.COLOR_BGR2HSV)
        band=((hsv_[...,2]>150)&(hsv_[...,0]>=122)&(hsv_[...,0]<=162)).astype(np.uint8)
        bh=yb-ya
        nc,lab,st,_=cv2.connectedComponentsWithStats(cv2.dilate(band,np.ones((3,1),np.uint8)),8)
        keep=np.zeros(nc,bool)
        for c in range(1,nc):
            if st[c,cv2.CC_STAT_HEIGHT]>=0.38*bh and st[c,cv2.CC_STAT_AREA]>=6: keep[c]=True
        band=keep[lab]
        xr=XR.get(key,{}).get(len(lines))
        if xr: band[:,:xr[0]]=0; band[:,xr[1]:]=0
        col=band.sum(0)>0
        segs=[]; i=0
        while i<W:
            if col[i]:
                j=i
                while j<W and col[j]: j+=1
                segs.append([i,j]); i=j
            else: i+=1
        runs=[[segs[0]]]
        for sg in segs[1:]:
            if sg[0]-runs[-1][-1][1] < max(45,1.8*bh): runs[-1].append(sg)
            else: runs.append([sg])
        run=max(runs,key=lambda r: sum(b-a for a,b in r))
        n=len(ws); m_=len(run)
        gaps=[run[i+1][0]-run[i][1] for i in range(m_-1)]
        gw=float(np.mean(sorted(gaps,reverse=True)[:max(1,n-1)])) if gaps else 10.0
        span=run[-1][1]-run[0][0]
        def wt(s):
            t=0
            for ch in s:
                if ch.isupper(): t+=1.3
                elif ch.isalnum(): t+=1.0
                elif ch in '—': t+=1.6
                elif ch in '-': t+=0.6
                else: t+=0.35
            return t
        wts=[wt(w['w']) for w in ws]; tot=sum(wts)
        exp=[x/tot*(span-(n-1)*gw) for x in wts]
        INF=-1e18
        # dp[j][i]: best score with word j ending at seg i
        dp=[[INF]*m_ for _ in range(n)]; bk=[[-1]*m_ for _ in range(n)]
        for i in range(m_):
            dp[0][i]=-MU*abs((run[i][1]-run[0][0])-exp[0])/gw
        for j in range(1,n):
            for i in range(j,m_):
                for p in range(j-1,i):
                    if dp[j-1][p]==INF: continue
                    sc=dp[j-1][p]+gaps[p]/gw-MU*abs((run[i][1]-run[p+1][0])-exp[j])/gw
                    if sc>dp[j][i]: dp[j][i]=sc; bk[j][i]=p
        ends=[m_-1]
        for j in range(n-1,0,-1): ends.append(bk[j][ends[-1]])
        ends=ends[::-1]
        bounds=[]; st_=0
        for e_ in ends: bounds.append([run[st_][0],run[e_][1]]); st_=e_+1
        gapsizes=sorted(gaps,reverse=True)
        sep_ok = (len(gapsizes)<n) or (gapsizes[n-2] > (gapsizes[n-1] if len(gapsizes)>=n else 0))
        lines.append({'y0':int(ya),'y1':int(yb),'x0':int(run[0][0]),'x1':int(run[-1][1]),
                      'words':[{'w':w['w'],'t':w['t'],'e':w['e'],'x0':int(a),'x1':int(b)} for w,(a,b) in zip(ws,bounds)],
                      'margin':[int(gapsizes[n-2]) if n>1 and len(gapsizes)>=n-1 else -1, int(gapsizes[n-1]) if len(gapsizes)>=n else -1]})
    res[key]={'lines':lines}
    vis=im.copy()
    for ln in lines:
        for i,w in enumerate(ln['words']):
            c=[(0,255,0),(0,200,255)][i%2]
            cv2.rectangle(vis,(w['x0'],ln['y0']-2),(w['x1'],ln['y1']+2),c,1)
    ys=min(l['y0'] for l in lines)-20; ye=max(l['y1'] for l in lines)+20
    xs=max(0,min(l['x0'] for l in lines)-20); xe=min(W,max(l['x1'] for l in lines)+20)
    crop=vis[ys:ye]
    cv2.putText(crop,key,(4,16),cv2.FONT_HERSHEY_SIMPLEX,0.5,(0,255,255),1)
    dbg.append(crop)
    print(key, [(l['y0'],l['y1'],l['x0'],l['x1'],len(l['words']),l['margin']) for l in lines])
json.dump(res,open(f'{S}/work/caption_geom.json','w'),indent=1)
# sheets: crops are full width 1586; stack 8 per sheet
for s in range(0,len(dbg),8):
    t=dbg[s:s+8]; h=sum(x.shape[0] for x in t)
    cv2.imwrite(f'{S}/work/words_{s//8}.png', np.vstack(t))
