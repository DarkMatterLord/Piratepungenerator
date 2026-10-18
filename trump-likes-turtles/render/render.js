// Render the music video to MP4: headless Chromium draws every frame of the
// page in ?render mode, ffmpeg muxes the PNG sequence with the song.
//
//   node render/render.js                 full 1280x720 @ 30 fps -> trump-likes-turtles.mp4
//   node render/render.js --res 360       quick low-res preview
//   node render/render.js --beats 20-23   only (re)render frames of these beats, then re-encode
//   node render/render.js --workers 3     number of parallel browsers (default: 3)
//
// Frames are cached in build/frames-<res>/ so interrupted runs resume; delete
// that folder (or use --beats) to force re-rendering.
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const RES = parseInt(opt('res', '720'), 10);
const FPS = 30;
const DURATION = 40;
const WORKERS = parseInt(opt('workers', '3'), 10);
const FRAMES = DURATION * FPS;
const outDir = path.join(ROOT, 'build', `frames-${RES}`);
const outFile = path.join(ROOT, opt('out', RES === 720 ? 'trump-likes-turtles.mp4' : `build/preview-${RES}.mp4`));
fs.mkdirSync(outDir, { recursive: true });

const frameFile = (i) => path.join(outDir, `f${String(i).padStart(5, '0')}.png`);
let todo = [];
const beats = opt('beats');
if (beats) {
  // e.g. "20-23" or "2-3,11,19"
  const ranges = beats.split(',').map((r) => r.split('-').map(Number)).map(([a, b]) => [a, b ?? a]);
  for (let i = 0; i < FRAMES; i++) {
    const beat = Math.floor(i / (FPS / 2));
    if (ranges.some(([a, b]) => beat >= a && beat <= b)) { todo.push(i); try { fs.unlinkSync(frameFile(i)); } catch {} }
  }
} else {
  for (let i = 0; i < FRAMES; i++) if (!fs.existsSync(frameFile(i))) todo.push(i);
}

async function worker(id, frames) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync'] });
  const page = await browser.newPage({ viewport: { width: Math.round(RES * 16 / 9), height: RES } });
  page.on('pageerror', (e) => console.error(`[w${id}] pageerror`, e.message));
  await page.goto('file://' + path.join(ROOT, 'index.html') + `?render=1&res=${RES}`);
  await page.evaluate(() => window.renderReady);
  const t0 = Date.now();
  for (let k = 0; k < frames.length; k++) {
    const i = frames[k];
    const data = await page.evaluate(async (t) => {
      await window.renderAt(t);
      return document.getElementById('c').toDataURL('image/png');
    }, i / FPS);
    fs.writeFileSync(frameFile(i), Buffer.from(data.split(',')[1], 'base64'));
    if (k % 30 === 29 || k === frames.length - 1) {
      const el = (Date.now() - t0) / 1000;
      console.log(`[w${id}] ${k + 1}/${frames.length} frames  ${(el / (k + 1)).toFixed(2)} s/frame  eta ${((frames.length - k - 1) * el / (k + 1) / 60).toFixed(1)} min`);
    }
  }
  await browser.close();
}

(async () => {
  console.log(`${todo.length} frames to render at ${RES}p with ${WORKERS} workers -> ${outDir}`);
  // Interleave by beat so each worker gets a similar mix of cheap 2D and costly 3D beats.
  const parts = Array.from({ length: WORKERS }, () => []);
  todo.forEach((i) => parts[Math.floor(i / (FPS / 2)) % WORKERS].push(i));
  await Promise.all(parts.filter((p) => p.length).map((p, id) => worker(id, p)));

  const missing = [];
  for (let i = 0; i < FRAMES; i++) if (!fs.existsSync(frameFile(i))) missing.push(i);
  if (missing.length) { console.error(`missing ${missing.length} frames, not encoding`); process.exit(1); }

  const wav = path.join(ROOT, 'build', 'song.wav');
  const audio = fs.existsSync(wav) ? wav : path.join(ROOT, 'song.mp3');
  const ff = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(outDir, 'f%05d.png'), '-i', audio,
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', RES === 720 ? '20' : '26', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-t', String(DURATION), '-movflags', '+faststart', outFile];
  console.log('encoding', outFile);
  const r = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status);
  console.log('done:', outFile, (fs.statSync(outFile).size / 1e6).toFixed(1), 'MB');
})();
