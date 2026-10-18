// Dev helper: render a grid where each cell uses a different style definition.
//   node render/gallery.js out.png <t> <expr>   expr evaluates (in page) to an array of style objects
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const [out, t, expr, colsArg] = process.argv.slice(2);
  const res = parseInt(process.env.RES || '360', 10);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: Math.round(res * 16 / 9), height: res } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (!/ERR_FILE/.test(m.text())) console.log('[page]', m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + `?render=1&res=${res}`);
  await page.evaluate(() => window.renderReady);
  const t0 = Date.now();
  const png = await page.evaluate(async ({ t, expr, cols }) => {
    const styles = eval(expr);
    const times = String(t).split(',').map(Number);
    const src = document.getElementById('c'), ctx = src.getContext('2d');
    const tw = 320, th = 180;
    const n = styles.reduce((a, st) => a + (st.t !== undefined ? 1 : times.length), 0);
    const rows = Math.ceil(n / cols);
    const sheet = document.createElement('canvas');
    sheet.width = tw * cols; sheet.height = th * rows;
    const sx = sheet.getContext('2d');
    let k = 0;
    const items = [];
    for (const st of styles) for (const tt of (st.t !== undefined ? [st.t] : times)) items.push([st, tt]);
    for (const [st, tt] of items) {
      APP.renderWith(ctx, tt, src.width, src.height, st);
      const x = (k % cols) * tw, y = Math.floor(k / cols) * th;
      sx.drawImage(src, x, y, tw, th);
      sx.fillStyle = 'rgba(0,0,0,0.65)'; sx.fillRect(x, y, tw, 15);
      sx.fillStyle = '#fff'; sx.font = '11px sans-serif'; sx.fillText(`${st.name} @${tt}`, x + 4, y + 11);
      k++;
    }
    return sheet.toDataURL('image/png');
  }, { t, expr, cols: +(colsArg || 4) });
  fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`gallery in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${out}`);
  await browser.close();
})();
