// Frame capture with headless Chromium (Playwright).
//   node render.mjs snap  <outDir> <t1,t2,...>            -> PNG stills at given times
//   node render.mjs frames <outDir> <fps> <t0> <t1> [workers] -> JPEG sequence f_000000.jpg ...
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = 'file://' + path.resolve(here, '..', 'index.html') + '?capture=1';
const [mode, outDir, ...rest] = process.argv.slice(2);
if (mode !== 'sheet') fs.mkdirSync(outDir, { recursive: true });
else fs.mkdirSync(path.dirname(outDir), { recursive: true });

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await page.goto(pageUrl);
  await page.waitForFunction(() => window.MV && window.MV.ready, null, { timeout: 60000 });
  return page;
}
async function grab(page, t, type) {
  const data = await page.evaluate(([t, type]) => {
    window.renderAt(t);
    return document.getElementById('c').toDataURL(type === 'png' ? 'image/png' : 'image/jpeg', 0.94);
  }, [t, type]);
  return Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
}
const launch = () => chromium.launch({ args: ['--disable-gpu', '--disable-web-security', '--allow-file-access-from-files'] });

if (mode === 'snap') {
  const times = rest[0].split(',').map(Number);
  const browser = await launch();
  const page = await openPage(browser);
  for (const t of times) {
    const t0 = Date.now();
    const buf = await grab(page, t, 'png');
    const name = path.join(outDir, `snap_${t.toFixed(2).padStart(7, '0')}.png`);
    fs.writeFileSync(name, buf);
    console.log(name, Date.now() - t0, 'ms');
  }
  await browser.close();
} else if (mode === 'sheet') {
  // node render.mjs sheet <outFile.jpg> <t1,t2,...> [cols]
  const times = rest[0].split(',').map(Number), cols = Number(rest[1] || 4);
  const browser = await launch();
  const page = await openPage(browser);
  const data = await page.evaluate(([times, cols]) => {
    const tw = 480, th = 270, rows = Math.ceil(times.length / cols);
    const sheet = document.createElement('canvas');
    sheet.width = tw * cols; sheet.height = th * rows;
    const g = sheet.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, sheet.width, sheet.height);
    times.forEach((t, i) => {
      window.renderAt(t);
      const x = (i % cols) * tw, y = Math.floor(i / cols) * th;
      g.drawImage(document.getElementById('c'), x, y, tw, th);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y, 70, 22);
      g.fillStyle = '#fff'; g.font = '15px monospace'; g.fillText(t.toFixed(2), x + 5, y + 16);
      g.strokeStyle = '#000'; g.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
    });
    return sheet.toDataURL('image/jpeg', 0.9);
  }, [times, cols]);
  fs.writeFileSync(outDir, Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
  console.log('wrote', outDir);
  await browser.close();
} else if (mode === 'frames') {
  const fps = Number(rest[0]), t0 = Number(rest[1]), t1 = Number(rest[2]), workers = Number(rest[3] || 4);
  const first = Math.round(t0 * fps), last = Math.round(t1 * fps); // [first, last)
  const total = last - first;
  let next = first, done = 0;
  const started = Date.now();
  async function worker() {
    const browser = await launch();
    const page = await openPage(browser);
    while (next < last) {
      const i = next++;
      const file = path.join(outDir, `f_${String(i).padStart(6, '0')}.jpg`);
      if (fs.existsSync(file)) { done++; continue; }
      const buf = await grab(page, i / fps + 1e-4, 'jpeg');
      fs.writeFileSync(file, buf);
      done++;
      if (done % 50 === 0) {
        const el = (Date.now() - started) / 1000;
        console.log(`${done}/${total} frames, ${(done / el).toFixed(1)} fps, eta ${((total - done) / (done / el)).toFixed(0)} s`);
      }
    }
    await browser.close();
  }
  await Promise.all(Array.from({ length: workers }, worker));
  console.log('done', total, 'frames in', ((Date.now() - started) / 1000).toFixed(1), 's');
}
