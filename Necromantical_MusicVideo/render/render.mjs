// Renders frames of index.html with headless Chromium (Playwright) into a JPEG sequence.
//   node render/render.mjs --out frames [--from 0] [--to 188.76] [--workers 4] [--q 0.93] [--lyrics 0] [--style paint]
//   node render/render.mjs --stills 12.5,36.2,80 --out stills        (PNG stills for review)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']);
  return acc;
}, []));

const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timing.json'), 'utf8'));
const FPS = timing.fps;
const out = path.resolve(args.out || 'frames');
fs.mkdirSync(out, { recursive: true });
const workers = Number(args.workers || 4);
const q = Number(args.q || 0.93);
const lyrics = args.lyrics === '0' ? '0' : '1';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html?render=1&lyrics=${lyrics}${args.style === 'paint' ? '&style=paint' : ''}${args.test ? '&test=' + encodeURIComponent(args.test) : ''}`;

const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=2048'] });

let jobs;
let still = false;
if (args.stills) {
  still = true;
  jobs = args.stills.split(',').map(Number).map((t) => ({ t, file: path.join(out, `still_${t.toFixed(2).padStart(7, '0')}.png`) }));
} else {
  const from = Math.max(0, Math.floor(Number(args.from || 0) * FPS));
  const to = Math.min(Math.ceil(timing.duration * FPS), Math.ceil(Number(args.to || timing.duration) * FPS));
  jobs = [];
  for (let f = from; f < to; f++) {
    const file = path.join(out, `f_${String(f).padStart(6, '0')}.jpg`);
    if (args['skip-existing'] && fs.existsSync(file) && fs.statSync(file).size > 0) continue;
    jobs.push({ t: f / FPS, file });
  }
}

const total = jobs.length;
let next = 0, done = 0;
const t0 = Date.now();
const errors = [];
async function worker(id) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => errors.push(`[w${id}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[w${id}] console: ${m.text()}`); });
  await page.goto(url);
  await page.evaluate(() => window.NM_READY);
  while (next < total) {
    const job = jobs[next++];
    let data;
    try {
      data = still
        ? await page.evaluate((t) => window.renderFramePNG(t), job.t)
        : await page.evaluate(([t, qq]) => window.renderFrameJPEG(t, qq), [job.t, q]);
    } catch (e) {
      errors.push(`[w${id}] t=${job.t.toFixed(3)}: ${e.message.split('\n')[0]}`);
      break;
    }
    fs.writeFileSync(job.file + '.tmp', Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
    fs.renameSync(job.file + '.tmp', job.file);
    done++;
    if (done % 60 === 0 || done === total) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`  ${done}/${total} frames  ${(done / el).toFixed(2)} fps  eta ${((total - done) / (done / el)).toFixed(0)}s\n`);
    }
    if (errors.length) break;
  }
  await page.close();
}
await Promise.all(Array.from({ length: Math.min(workers, total) }, (_, i) => worker(i)));
await browser.close();
server.close();
if (errors.length) { console.error('ERRORS:\n' + [...new Set(errors)].slice(0, 20).join('\n')); process.exit(1); }
console.log(`rendered ${total} ${still ? 'stills' : 'frames'} in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${out}`);
