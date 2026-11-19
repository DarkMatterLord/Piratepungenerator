import sherpa_onnx, soundfile as sf, numpy as np, sys
d="/tmp/claude-0/models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8/"
rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=d+"encoder.int8.onnx", decoder=d+"decoder.int8.onnx",
        joiner=d+"joiner.int8.onnx", tokens=d+"tokens.txt", model_type="nemo_transducer", num_threads=4)
x, sr = sf.read("vocals16k.wav", dtype="float32")
for a,b in [tuple(map(float,s.split(':'))) for s in sys.argv[1:]]:
    seg = x[int(a*sr):int(b*sr)]; seg = seg/(np.abs(seg).max()+1e-9)*0.9
    s = rec.create_stream(); s.accept_waveform(sr, seg); rec.decode_stream(s)
    r = s.result; w=[]
    for t,ts in zip(r.tokens, r.timestamps):
        if t.startswith(' ') or not w: w.append([t.strip(), ts+a])
        else: w[-1][0]+=t
    print(f"[{a}-{b}]", ' '.join(f"{x}@{y:.2f}" for x,y in w))
    # energy profile
    e=[np.sqrt(np.mean(x[int(t*sr):int((t+0.25)*sr)]**2)) for t in np.arange(a,b,0.25)]
    print('   energy', ' '.join(f"{v*100:.0f}" for v in e))
