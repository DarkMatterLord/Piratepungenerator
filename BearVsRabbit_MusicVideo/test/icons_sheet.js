require('../src/assets');
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const I = require('../src/icons');
const names = Object.keys(I.ICONS);
const cv = createCanvas(1920, 900), ctx = cv.getContext('2d');
ctx.fillStyle = '#2a2230'; ctx.fillRect(0, 0, 1920, 900);
names.forEach((n, i) => {
  const x = 90 + (i % 12) * 150, y = 110 + Math.floor(i / 12) * 200;
  ctx.save(); ctx.translate(x, y); ctx.scale(1.1, 1.1); I.drawSticker(ctx, n); ctx.restore();
  ctx.save(); ctx.translate(x, y + 450); ctx.scale(1.1, 1.1); I.drawNeon(ctx, n, 0.3); ctx.restore();
});
fs.writeFileSync('/tmp/claude-0/stills/icons.png', cv.toBuffer('image/png'));
const T = JSON.parse(fs.readFileSync('data/timing.json'));
console.log(I.buildPops(T.lines).length, 'pops');
