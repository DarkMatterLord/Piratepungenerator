require('../src/assets');
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const SC = require('../src/scene'), B = require('../src/bear'), R = require('../src/rabbit');
let t0 = Date.now();
const A = SC.buildAll();
console.log('build ms', Date.now() - t0);
const cv = createCanvas(1920, 1080), ctx = cv.getContext('2d');
const shots = {
  wide: { x: 0, y: -300, zoom: 1 },
  ted: { x: -440, y: -330, zoom: 1.6 },
  flopcu: { x: 450, y: -400, zoom: 2.3 },
};
for (const [name, cam] of Object.entries(shots)) {
  t0 = Date.now();
  SC.drawWorld(ctx, A, {
    t: 12.3, cam, beat: 0.5, tedLight: name === 'flopcu' ? 0.35 : 1, flopLight: name === 'flopcu' ? 1 : 0.4, houseLight: 1, neon: 1, cheer: 0.0, rimWarm: 1,
    focus: name === 'wide' ? 'both' : name === 'ted' ? 'ted' : 'floppy',
    bear: { turn: 0.3, mouth: 0.6, anger: 0.8, ...B.MIC_POSE, armR: -1.3 },
    rabbit: { turn: -0.3, lookX: -0.7, lid: 0.45 },
  });
  console.log(name, 'ms', Date.now() - t0);
  fs.writeFileSync(`/tmp/claude-0/stills/scene_${name}.png`, cv.toBuffer('image/png'));
}
