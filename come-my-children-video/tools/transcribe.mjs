import fs from 'fs';
import { pipeline, env } from '@huggingface/transformers';
import wavefile from 'wavefile';
const [,, modelRoot, wavPath, outPath, offsetStr, durStr, tsMode] = process.argv;
env.localModelPath = modelRoot;
env.allowRemoteModels = false;
const asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', { dtype: 'q8' });
const wav = new wavefile.WaveFile(fs.readFileSync(wavPath));
wav.toBitDepth('32f'); wav.toSampleRate(16000);
let s = wav.getSamples();
if (Array.isArray(s)) { const m = new Float32Array(s[0].length); for (let i = 0; i < m.length; i++) m[i] = (s[0][i] + s[1][i]) / 2; s = m; }
const off = parseFloat(offsetStr || '0'), dur = durStr ? parseFloat(durStr) : null;
const a = Math.floor(off * 16000), b = dur ? Math.min(s.length, a + Math.floor(dur * 16000)) : s.length;
const clip = s.slice(a, b);
const t = Date.now();
const out = await asr(clip, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: tsMode === 'word' ? 'word' : true, language: 'english', task: 'transcribe' });
for (const c of out.chunks) { c.timestamp = c.timestamp.map(x => x == null ? null : +(x + off).toFixed(2)); }
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
console.error('took', (Date.now() - t) / 1000, 's');
for (const c of out.chunks) console.log(`${String(c.timestamp[0]).padStart(7)} - ${String(c.timestamp[1]).padStart(7)}  ${c.text}`);
