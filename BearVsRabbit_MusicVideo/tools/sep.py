import sherpa_onnx, soundfile as sf, numpy as np, time, sys
cfg = sherpa_onnx.OfflineSourceSeparationConfig(
    model=sherpa_onnx.OfflineSourceSeparationModelConfig(
        uvr=sherpa_onnx.OfflineSourceSeparationUvrModelConfig(model="/tmp/claude-0/models/UVR-MDX-NET-Voc_FT.onnx"),
        num_threads=4, debug=False, provider="cpu"))
assert cfg.validate()
sp = sherpa_onnx.OfflineSourceSeparation(cfg)
x, sr = sf.read("/tmp/claude-0/work/song.wav", dtype="float32", always_2d=True)
x = np.ascontiguousarray(x.T)
t=time.time()
out = sp.process(sample_rate=sr, samples=x)
print("took", time.time()-t, [n for n in dir(out) if not n.startswith('_')])
for i, st in enumerate(out.stems):
    d = np.array(st.data)
    print(i, d.shape)
    sf.write(f"/tmp/claude-0/work/stem{i}.wav", d.T, out.sample_rate)
