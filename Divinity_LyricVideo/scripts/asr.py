import sys, json, numpy as np, soundfile as sf, sherpa_onnx, time
S=sys.argv[1]; src=sys.argv[2]; out=sys.argv[3]
M=f'{S}/models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8'
rec=sherpa_onnx.OfflineRecognizer.from_transducer(encoder=f'{M}/encoder.int8.onnx', decoder=f'{M}/decoder.int8.onnx', joiner=f'{M}/joiner.int8.onnx', tokens=f'{M}/tokens.txt', model_type='nemo_transducer', num_threads=4)
y, sr = sf.read(src, dtype='float32')
W=20.0; HOP=14.0; words=[]
t0=0.0; dur=len(y)/sr
while t0 < dur:
    a=int(t0*sr); b=int(min(dur,t0+W)*sr)
    st=rec.create_stream(); st.accept_waveform(sr, y[a:b]); rec.decode_stream(st)
    r=st.result
    # build words from tokens
    toks=r.tokens; ts=r.timestamps
    cur=None
    ws=[]
    for tk,tt in zip(toks,ts):
        if tk.startswith(' ') or cur is None:
            if cur: ws.append(cur)
            cur=[tk.strip(), t0+tt]
        else: cur[0]+=tk
    if cur: ws.append(cur)
    lo = t0 + (0 if t0==0 else (W-HOP)/2); hi = t0 + W - (W-HOP)/2 if t0+W<dur else dur+1
    for w,t in ws:
        if lo <= t < hi: words.append([w, round(t,2)])
    print(f'[{t0:6.1f}] {r.text}', flush=True)
    t0+=HOP
json.dump(words, open(out,'w'))
