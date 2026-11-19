require('../src/assets');
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const L = require('../src/lyrics');
const T = JSON.parse(fs.readFileSync('data/timing.json'));
T.lines.forEach((l, i) => l.idx = i);
const bg = createCanvas(1920, 1080);
const cv = createCanvas(1920, 1080), ctx = cv.getContext('2d');
const { loadImage } = require('@napi-rs/canvas');
(async () => {
  const img = await loadImage('/tmp/claude-0/stills/scene_wide.png');
  const cases = [['ted', 21, 0.75], ['ted', 15, 1.0], ['ted', 15, 2.45], ['floppy', 40, 0.9], ['floppy', 41, 2.0], ['floppy', 30, 3.12]];
  let n = 0;
  for (const [who, li, dt] of cases) {
    const line = T.lines[li];
    const exitT = T.lines[li + 1].start;
    const t = line.start + dt;
    ctx.drawImage(img, 0, 0);
    const lay = L.layout(ctx, line, li + who, who);
    const t0 = Date.now();
    if (who === 'ted') L.drawTedLine(ctx, line, lay, t, exitT); else L.drawFloppyLine(ctx, line, lay, t, exitT, Math.round(t * 30));
    console.log(who, li, 'ms', Date.now() - t0, line.text);
    fs.writeFileSync(`/tmp/claude-0/stills/lyr_${n++}.png`, cv.toBuffer('image/png'));
  }
})();
