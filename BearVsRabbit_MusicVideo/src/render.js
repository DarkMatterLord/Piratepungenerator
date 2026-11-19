'use strict';
// CLI renderer.
//   node src/render.js --stills 12.3,80.1 --outdir /tmp/stills      -> PNG stills at given times
//   node src/render.js --from 0 --to 2400 --out seg0.mp4             -> encode frames [from,to) with ffmpeg
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Renderer } = require('./frame');
const D = require('./director');

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const FPS = 30;
const R = new Renderer();

async function stills() {
  const out = args.outdir || '.';
  fs.mkdirSync(out, { recursive: true });
  for (const s of args.stills.split(',')) {
    const t = parseFloat(s);
    const t0 = Date.now();
    const cv = R.render(t);
    const buf = cv.toBuffer('image/jpeg', 92);
    fs.writeFileSync(path.join(out, `f_${t.toFixed(2)}.jpg`), buf);
    console.log(`t=${t.toFixed(2)} shot=${D.frameState(t).shot.type}/${D.frameState(t).shot.who} ${Date.now() - t0}ms`);
  }
}

async function video() {
  const from = parseInt(args.from || '0', 10);
  const to = Math.min(parseInt(args.to, 10), D.AF.frames);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1920x1080', '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', args.preset || 'medium', '-crf', args.crf || '18', '-pix_fmt', 'yuv420p', '-tune', 'animation',
    '-g', '60', '-threads', args.threads || '1', args.out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const write = (buf) => new Promise((res) => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', res); else res(); });
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    const cv = R.render(f / FPS);
    await write(Buffer.from(cv.data()));
    if ((f - from) % 150 === 0) {
      const el = (Date.now() - t0) / 1000, done = f - from + 1;
      console.log(`[${args.out}] frame ${f} (${done}/${to - from}) ${(el / done * 1000).toFixed(0)}ms/f eta ${((to - f) * el / done / 60).toFixed(1)}min`);
    }
  }
  ff.stdin.end();
  await new Promise((res) => ff.on('close', res));
  console.log(`[${args.out}] done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

(args.stills ? stills() : video()).catch((e) => { console.error(e); process.exit(1); });
