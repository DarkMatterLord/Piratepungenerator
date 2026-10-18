// Dev helper: render stills or a contact sheet with headless Chromium.
//   node render/frames.js out.png 12.25            -> single frame at t=12.25s
//   node render/frames.js sheet.png sheet 0 80     -> contact sheet, one frame per beat (mid-beat)
//   node render/frames.js sheet.png beats 16 24 4  -> sheet of beats 16..23 at 4 samples per beat
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const [out, mode, a, b, c] = process.argv.slice(2);
  const res = parseInt(process.env.RES || '720', 10);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: Math.round(res * 16 / 9), height: res } });
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + `?render=1&res=${res}`);
  await page.waitForFunction(() => window.renderReady);
  await page.evaluate(() => window.renderReady);
  const grab = async () => Buffer.from((await page.evaluate(() => document.getElementById('c').toDataURL('image/png'))).split(',')[1], 'base64');
  if (mode === 'sheet' || mode === 'beats') {
    let times = [];
    if (mode === 'sheet') for (let i = +a; i < +b; i++) times.push(i * 0.5 + 0.25);
    else { const per = +(c || 4); for (let i = +a; i < +b; i++) for (let k = 0; k < per; k++) times.push(i * 0.5 + (k + 0.5) * 0.5 / per); }
    const cols = mode === 'sheet' ? 8 : +(c || 4);
    const t0 = Date.now();
    const png = await page.evaluate(async ({ times, cols }) => {
      const src = document.getElementById('c');
      const tw = 320, th = 180;
      const rows = Math.ceil(times.length / cols);
      const sheet = document.createElement('canvas');
      sheet.width = tw * cols; sheet.height = th * rows;
      const sx = sheet.getContext('2d');
      for (let i = 0; i < times.length; i++) {
        await window.renderAt(times[i]);
        sx.drawImage(src, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
        sx.fillStyle = 'rgba(0,0,0,0.6)'; sx.fillRect((i % cols) * tw, Math.floor(i / cols) * th + th - 16, 60, 16);
        sx.fillStyle = '#fff'; sx.font = '12px sans-serif'; sx.fillText(times[i].toFixed(2), (i % cols) * tw + 4, Math.floor(i / cols) * th + th - 4);
      }
      return sheet.toDataURL('image/png');
    }, { times, cols });
    fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
    console.log(`sheet of ${times.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${out}`);
  } else {
    const t = parseFloat(mode || '0');
    const t0 = Date.now();
    const idx = await page.evaluate((t) => window.renderAt(t), t);
    console.log(`t=${t} style #${idx + 1} rendered in ${Date.now() - t0}ms`);
    fs.writeFileSync(out, await grab());
  }
  await browser.close();
})();
