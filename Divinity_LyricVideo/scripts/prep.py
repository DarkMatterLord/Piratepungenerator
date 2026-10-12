import sys, json, numpy as np, cv2
U,S=sys.argv[1],sys.argv[2]
G=json.load(open(f'{S}/work/caption_geom.json'))
# manual fix: final frame line includes divider; correct y-range and this/Super split
ln=G['ba879fbe']['lines'][0]; ln['y0'],ln['y1']=873,904
for w in ln['words']:
    if w['w']=='this': w['x0'],w['x1']=744,803
    if w['w']=='Super': w['x0'],w['x1']=815,910
EMPH={'DIVINITY!','BEND!','HAKAI!','END!','UNMAKE','BRIGHT;','FIGHT!','WORTHY','WIDE','OPEN;','SOMETHING','HESITATE...','ALL!','DIVINITY'}
out={}
for key,g in G.items():
    im=cv2.imread(f'{U}/{key}-image.png'); H,W=im.shape[:2]
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    y0=max(0,min(l['y0'] for l in g['lines'])-14); y1=min(H,max(l['y1'] for l in g['lines'])+14)
    reg=im[y0:y1]; hr=hsv[y0:y1]
    txt=np.zeros(reg.shape[:2],np.uint8)
    wid=np.full(reg.shape[:2],-1,np.int16)
    words=[]
    for ln in g['lines']:
        a=ln['y0']-y0-5; b=ln['y1']-y0+5
        ws=ln['words']
        for i,w in enumerate(ws):
            L = (ws[i-1]['x1']+w['x0'])//2 if i>0 else w['x0']-40
            R = (w['x1']+ws[i+1]['x0'])//2 if i+1<len(ws) else w['x1']+40
            idx=len(words)
            words.append({'w':w['w'],'t':w['t'],'e':w['e'],'emph':w['w'].strip('"“”') in EMPH})
            wid[max(0,a):b, max(0,L):R]=idx
        # text pixels in this line band (purple, bright relative to local bg)
        band=hr[max(0,a):b, max(0,ln['x0']-45):ln['x1']+45]
        v=band[...,2].astype(np.int16); h=band[...,0].astype(np.int16); s=band[...,1].astype(np.int16)
        bg=cv2.medianBlur(band[...,2],21).astype(np.int16)
        m=((h>=118)&(h<=165)&(v>=110)&(v-bg>=18)) | ((h>=118)&(h<=165)&(v>=170))
        txt[max(0,a):b, max(0,ln['x0']-45):ln['x1']+45] |= m.astype(np.uint8)
    # remove tiny specks outside words, dilate to cover anti-aliasing + inner halo
    txt[wid<0]=0
    mask=cv2.dilate(txt,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    clean=cv2.inpaint(reg,mask*255,6,cv2.INPAINT_TELEA)
    # soft alpha: how much each pixel belongs to the text layer
    soft=cv2.GaussianBlur(mask.astype(np.float32),(0,0),1.2)
    np.savez_compressed(f'{S}/prep/{key}.npz', y0=y0, y1=y1, clean=clean, wid=wid, soft=soft)
    out[key]={'y0':int(y0),'y1':int(y1),'words':words,
              'lines':[{'y0':l['y0'],'y1':l['y1'],'x0':l['x0'],'x1':l['x1']} for l in g['lines']]}
    # debug: original / clean / ghost
    ghost=(clean.astype(np.float32)+(reg.astype(np.float32)-clean)*0.28).clip(0,255).astype(np.uint8)
    cv2.imwrite(f'{S}/prep/dbg_{key}.jpg', np.vstack([reg,clean,ghost]), [cv2.IMWRITE_JPEG_QUALITY,85])
json.dump(out,open(f'{S}/work/karaoke.json','w'),indent=1)
print('ok',len(out))
