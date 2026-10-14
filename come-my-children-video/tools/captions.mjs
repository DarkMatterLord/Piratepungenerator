// Render the lyric-caption overlay as a transparent PNG sequence (c_000000.png …).
//   node tools/captions.mjs <outDir> <fps> <t0> <t1>
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = 'file://' + path.resolve(here, '..', 'index.html') + '?capture=1&captions=1';
const [outDir, fpsS, t0S, t1S] = process.argv.slice(2);
const fps = Number(fpsS), first = Math.round(Number(t0S) * fps), last = Math.round(Number(t1S) * fps);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--disable-gpu', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(pageUrl);
await page.waitForFunction(() => window.MV && window.MV.ready, null, { timeout: 60000 });
const blank = path.join(outDir, '_blank.png');
let lastKey = null, lastFile = null, wrote = 0;
for (let i = first; i < last; i++) {
  const t = i / fps + 1e-4;
  // the caption only changes when its line or fade changes, so most frames reuse the previous image
  const key = await page.evaluate((t) => {
    const L = window.MV_DATA.lines, T = Math.floor(t * 12 + 1e-6) / 12;
    const on = L.filter((l) => T > l.s - 0.15 && T < l.e + 0.45).map((l) => {
      const a = Math.min(1, Math.max(0, (T - l.s + 0.15) / 0.3)) * Math.min(1, Math.max(0, (l.e + 0.45 - T) / 0.3));
      return l.s.toFixed(2) + ':' + a.toFixed(2);
    });
    return on.join('|');
  }, t);
  const file = path.join(outDir, `c_${String(i).padStart(6, '0')}.png`);
  if (key === '') {
    if (!fs.existsSync(blank)) {
      const d = await page.evaluate((t) => { window.renderAt(t); return document.getElementById('c').toDataURL('image/png'); }, -10);
      fs.writeFileSync(blank, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
    }
    fs.copyFileSync(blank, file);
  } else if (key === lastKey && !key.includes(':0.') ) {
    fs.copyFileSync(lastFile, file);
  } else {
    const d = await page.evaluate((t) => { window.renderAt(t); return document.getElementById('c').toDataURL('image/png'); }, t);
    fs.writeFileSync(file, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
    wrote++;
  }
  lastKey = key; lastFile = file;
}
console.log('captions done', last - first, 'frames,', wrote, 'rendered');
await browser.close();
