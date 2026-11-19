import sherpa_onnx, soundfile as sf, numpy as np, json, time
d="/tmp/claude-0/models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8/"
rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=d+"encoder.int8.onnx", decoder=d+"decoder.int8.onnx",
        joiner=d+"joiner.int8.onnx", tokens=d+"tokens.txt", model_type="nemo_transducer", num_threads=4)
x, sr = sf.read("vocals16k.wav", dtype="float32")
x = x / (np.abs(x).max()+1e-9) * 0.9
W, H = 24.0, 16.0   # window, hop  -> 8s overlap
out = []
t0=time.time()
start = 0.0
dur = len(x)/sr
while start < dur:
    a = int(start*sr); b = int(min(dur, start+W)*sr)
    s = rec.create_stream(); s.accept_waveform(sr, x[a:b]); rec.decode_stream(s)
    r = s.result
    out.append({"start": start, "text": r.text, "tokens": list(r.tokens), "ts": [float(t)+start for t in r.timestamps]})
    print(f"{start:6.1f} {r.text}", flush=True)
    start += H
json.dump(out, open("asr_chunks.json","w"))
print("took", time.time()-t0)
