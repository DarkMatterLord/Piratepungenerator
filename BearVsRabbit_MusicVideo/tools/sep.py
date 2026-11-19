"""Vocal separation. usage: python sep.py <models_dir> <song.wav> <out_dir>  -> stem0.wav (vocals), stem1.wav (beat)"""
import sherpa_onnx, soundfile as sf, numpy as np, time, sys
MD, SONG, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
cfg = sherpa_onnx.OfflineSourceSeparationConfig(
    model=sherpa_onnx.OfflineSourceSeparationModelConfig(
        uvr=sherpa_onnx.OfflineSourceSeparationUvrModelConfig(model=f"{MD}/UVR-MDX-NET-Voc_FT.onnx"),
        num_threads=4, debug=False, provider="cpu"))
assert cfg.validate()
sp = sherpa_onnx.OfflineSourceSeparation(cfg)
x, sr = sf.read(SONG, dtype="float32", always_2d=True)
x = np.ascontiguousarray(x.T)
t=time.time()
out = sp.process(sample_rate=sr, samples=x)
print("took", time.time()-t, [n for n in dir(out) if not n.startswith('_')])
for i, st in enumerate(out.stems):
    d = np.array(st.data)
    print(i, d.shape)
    sf.write(f"{OUT}/stem{i}.wav", d.T, out.sample_rate)
