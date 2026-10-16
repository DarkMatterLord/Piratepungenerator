// Prints the shot timeline and flags gaps/overlaps (sanity check before a full render).
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto('file://' + path.join(ROOT, 'index.html') + '?render=1');
const shots = await page.evaluate(() => NM.SHOTS.map((s) => ({ start: s.start, end: s.end, name: s.name, pal: s.pal })));
await browser.close();
let prev = 0, bad = 0;
for (const s of shots) {
  const flag = Math.abs(s.start - prev) > 1e-6 ? (s.start > prev ? `  <-- GAP ${(s.start - prev).toFixed(2)}s` : `  <-- OVERLAP ${(prev - s.start).toFixed(2)}s`) : '';
  if (flag) bad++;
  console.log(`${s.start.toFixed(2).padStart(7)} - ${s.end.toFixed(2).padStart(7)}  ${s.pal.padEnd(9)} ${s.name}${flag}`);
  prev = s.end;
}
console.log(`${shots.length} shots, ${bad} problems`, errs.length ? errs : '');
