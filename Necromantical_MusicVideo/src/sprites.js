// Necromantical — RPG Maker style chibi sprites (24x32, 4 directions x 3 walk frames),
// built procedurally pixel-by-pixel with an automatic 1px outline. Plus emotion balloons.
'use strict';
(function () {
  const { canvas } = NM;
  const SW = 24, SH = 32;
  const OUT = '#07060b';

  // ---------- character specs ----------
  const SPEC = {
    isolde: {
      skin: '#f6d6c8', skinS: '#d9a59a', hair: '#1d1a2e', hairHi: '#3d3f63', hairStyle: 'long', eye: '#c4122f', eyeHi: '#ff3a52', blush: '#ff8a9a',
      top: '#120f1c', topHi: '#2b2a45', collar: '#f2f0ea', skirt: '#120f1c', skirtHi: '#3d3f63', shoes: '#07060b', rose: true, veil: '#3d3f63', lips: '#c4122f',
    },
    lucien: { // undead
      skin: '#c8cfe6', skinS: '#8a93b8', hair: '#3d3f63', hairHi: '#5a6287', hairStyle: 'short', eye: '#2b2a45', eyeHi: '#b9e6ff',
      top: '#1d1a2e', topHi: '#3d3f63', collar: '#f2f0ea', pants: '#120f1c', shoes: '#07060b', coatTails: true, bind: '#ff3a52',
    },
    lucienAlive: {
      skin: '#f6d6c8', skinS: '#d9a59a', hair: '#4a3a2e', hairHi: '#6e5640', hairStyle: 'short', eye: '#4a3a2e', eyeHi: '#f2f0ea',
      top: '#2b2a45', topHi: '#3d3f63', collar: '#f2f0ea', pants: '#1d1a2e', shoes: '#07060b', coatTails: true,
    },
    villager: {
      skin: '#f6d6c8', skinS: '#d9a59a', hair: '#4a3a2e', hairHi: '#6e5640', hairStyle: 'short', eye: '#07060b', eyeHi: '#07060b',
      top: '#4a3a2e', topHi: '#6e5640', pants: '#2b2a45', shoes: '#2e2420',
    },
    villager2: {
      skin: '#d9a59a', skinS: '#a8706a', hair: '#6e5640', hairHi: '#8a6a4c', hairStyle: 'short', eye: '#07060b', eyeHi: '#07060b', hat: '#2e2420',
      top: '#2c4235', topHi: '#456148', pants: '#2e2420', shoes: '#07060b',
    },
    villagerW: {
      skin: '#f6d6c8', skinS: '#d9a59a', hair: '#8a6a4c', hairHi: '#c9a86c', hairStyle: 'bun', eye: '#07060b', eyeHi: '#07060b', kerchief: '#f2f0ea',
      top: '#3d3f63', topHi: '#5a6287', skirt: '#2b2a45', skirtHi: '#3d3f63', shoes: '#07060b', apron: '#c8cfe6',
    },
    mourner: {
      skin: '#f6d6c8', skinS: '#d9a59a', hair: '#120f1c', hairHi: '#2b2a45', hairStyle: 'short', eye: '#07060b', eyeHi: '#07060b', hat: '#07060b',
      top: '#120f1c', topHi: '#2b2a45', pants: '#07060b', shoes: '#07060b',
    },
    priest: {
      skin: '#f6d6c8', skinS: '#d9a59a', hair: '#8a93b8', hairHi: '#c8cfe6', hairStyle: 'short', eye: '#07060b', eyeHi: '#07060b',
      top: '#120f1c', topHi: '#2b2a45', collar: '#f2f0ea', skirt: '#120f1c', skirtHi: '#2b2a45', shoes: '#07060b',
    },
    zombie: {
      skin: '#6f8a6a', skinS: '#4a5e48', hair: '#2e2420', hairHi: '#4a3a2e', hairStyle: 'short', eye: '#ff3a52', eyeHi: '#ff8a9a',
      top: '#3a2c26', topHi: '#5e4636', pants: '#2b2a45', shoes: '#2e2420', torn: true,
    },
    skeleton: { skeleton: true, bone: '#f2f0ea', boneS: '#c8cfe6', eye: '#ff3a52' },
    ghost: { ghost: true },
  };
  NM.SPEC = SPEC;

  // ---------- pixel painter ----------
  function painter(g) {
    return {
      p(x, y, c) { if (!c) return; g.fillStyle = c; g.fillRect(x, y, 1, 1); },
      r(x, y, w, h, c) { if (!c) return; g.fillStyle = c; g.fillRect(x, y, w, h); },
      row(y, x0, x1, c) { if (!c) return; g.fillStyle = c; g.fillRect(x0, y, x1 - x0 + 1, 1); },
    };
  }
  function outline(cv, col = OUT) {
    const g = cv.getContext('2d');
    const img = g.getImageData(0, 0, cv.width, cv.height), d = img.data, w = cv.width, h = cv.height;
    const op = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) op[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    const n = parseInt(col.slice(1), 16);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (op[i]) continue;
      if ((x > 0 && op[i - 1]) || (x < w - 1 && op[i + 1]) || (y > 0 && op[i - w]) || (y < h - 1 && op[i + w])) {
        d[i * 4] = (n >> 16) & 255; d[i * 4 + 1] = (n >> 8) & 255; d[i * 4 + 2] = n & 255; d[i * 4 + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }

  // head rows for a 14-wide rounded head (front/back): [y, x0, x1]
  const HEAD = [[3, 8, 15], [4, 6, 17], [5, 5, 18], [6, 5, 18], [7, 5, 18], [8, 5, 18], [9, 5, 18], [10, 5, 18], [11, 5, 18], [12, 5, 18], [13, 6, 17], [14, 6, 17], [15, 7, 16]];
  const HEADS = [[3, 9, 15], [4, 7, 17], [5, 6, 18], [6, 6, 18], [7, 6, 18], [8, 6, 18], [9, 6, 18], [10, 6, 18], [11, 6, 18], [12, 6, 18], [13, 6, 17], [14, 7, 17], [15, 8, 16]];

  function drawHuman(cv, S, dir, frame) {
    const g = cv.getContext('2d');
    const P = painter(g);
    const step = frame === 1 ? 0 : frame === 0 ? -1 : 1; // -1 left foot fwd, +1 right foot fwd
    const bob = frame === 1 ? 0 : 1; // body lifts 1px on step frames (RPG Maker feel)
    const by = -bob; // y offset for body+head
    const side = dir === 'left' || dir === 'right';
    const back = dir === 'up';
    const male = !S.skirt;

    // ----- long hair behind body -----
    if (S.hairStyle === 'long') {
      if (!side) { P.r(4, 7 + by, 16, 16, S.hair); P.r(5, 23 + by, 14, 2, S.hair); for (const x of [6, 9, 14, 17]) P.p(x, 25 + by, S.hair); }
      else { P.r(5, 7 + by, 7, 19, S.hair); P.r(6, 26 + by, 5, 1, S.hair); }
      if (S.veil && !side && dir === 'up') { P.r(5, 12 + by, 14, 13, S.veil); }
      if (S.veil && side) { P.r(4, 9 + by, 6, 17, S.veil); }
    }

    // ----- legs / skirt -----
    if (!male) {
      // skirt flare rows 22..29
      const rows = side ? [[22, 9, 15], [23, 8, 16], [24, 8, 16], [25, 7, 17], [26, 7, 17], [27, 6, 17], [28, 6, 18], [29, 6, 18]]
        : [[22, 8, 15], [23, 7, 16], [24, 7, 16], [25, 6, 17], [26, 6, 17], [27, 5, 18], [28, 5, 18], [29, 5, 18]];
      rows.forEach(([y, x0, x1], k) => {
        const sw = side ? 0 : (frame === 1 ? 0 : (k > 4 ? step : 0));
        P.row(y + by, x0 + sw, x1 + sw, S.skirt);
      });
      // folds / hem highlight
      const hy = 29 + by;
      if (!side) { for (const x of [7, 10, 13, 16]) P.r(x + (frame === 1 ? 0 : step), 24 + by, 1, 5, S.skirtHi); }
      else { for (const x of [9, 12, 15]) P.r(x, 24 + by, 1, 5, S.skirtHi); }
      P.row(hy, side ? 6 : 5, 18, S.skirtHi);
      if (S.apron && !back) { P.r(side ? 13 : 9, 22 + by, side ? 3 : 6, 6, S.apron); }
      // shoes peeking below hem
      if (side) {
        if (frame === 1) { P.r(11, 30, 4, 2, S.shoes); }
        else { P.r(13, 30, 4, 2, S.shoes); P.r(8, 30, 3, 1, S.shoes); }
      } else {
        if (frame === 1) { P.r(8, 30, 3, 2, S.shoes); P.r(13, 30, 3, 2, S.shoes); }
        else if (step < 0) { P.r(8, 30, 3, 2, S.shoes); P.r(13, 30, 3, 1, S.shoes); }
        else { P.r(8, 30, 3, 1, S.shoes); P.r(13, 30, 3, 2, S.shoes); }
      }
    } else {
      // trousers + shoes
      if (side) {
        if (frame === 1) { P.r(10, 23 + by, 4, 7 - by, S.pants); P.r(10, 30, 5, 2, S.shoes); }
        else { P.r(12, 23 + by, 3, 7 - by, S.pants); P.r(13, 30, 4, 2, S.shoes); P.r(8, 23 + by, 3, 6 - by, S.pants); P.r(7, 29, 3, 2, S.shoes); }
      } else {
        const lL = step < 0 ? 0 : step > 0 ? -1 : 0, lR = step > 0 ? 0 : step < 0 ? -1 : 0;
        P.r(8, 23 + by, 3, 7 - by + lL, S.pants); P.r(13, 23 + by, 3, 7 - by + lR, S.pants);
        P.r(8, 30 + lL, 3, 2, S.shoes); P.r(13, 30 + lR, 3, 2, S.shoes);
        P.p(11, 23 + by, S.pants); P.p(12, 23 + by, S.pants);
      }
      if (S.coatTails) {
        if (side) { P.r(6, 21 + by, 4, 6, S.top); P.p(6, 27 + by, S.top); }
        else if (back) { P.r(8, 22 + by, 8, 5, S.top); P.p(11, 26 + by, null); }
      }
    }

    // ----- torso -----
    if (side) {
      P.r(9, 16 + by, 6, 7, S.top); P.row(16 + by, 10, 13, S.top);
      P.r(13, 17 + by, 1, 5, S.topHi);
      if (S.collar) { P.r(12, 16 + by, 3, 2, S.collar); }
      if (S.bind) { P.r(11, 16 + by, 4, 1, S.bind); }
    } else {
      P.r(7, 17 + by, 10, 6, S.top); P.r(8, 16 + by, 8, 1, S.top);
      if (!back) {
        P.r(11, 18 + by, 2, 4, S.topHi);
        if (S.collar) { P.r(10, 16 + by, 4, 2, S.collar); P.p(9, 16 + by, S.collar); P.p(14, 16 + by, S.collar); }
        if (S.rose && !back) { P.p(11, 18 + by, '#c4122f'); P.p(12, 18 + by, '#c4122f'); }
        if (S.bind) { P.r(10, 16 + by, 4, 1, S.bind); }
        if (male && S.coatTails) { P.r(11, 18 + by, 2, 5, S.collar || S.topHi); P.p(11, 18 + by, '#07060b'); P.p(12, 18 + by, '#07060b'); }
      } else { P.r(8, 17 + by, 8, 1, S.topHi); }
      if (S.torn) { P.p(8, 21 + by, null); P.p(15, 20 + by, S.skinS); P.p(9, 22 + by, S.skin); }
    }

    // ----- arms -----
    if (side) {
      const ax = 11 + (frame === 0 ? 1 : frame === 2 ? -1 : 0);
      P.r(ax, 17 + by, 2, 5, S.topHi); P.r(ax, 17 + by, 1, 5, S.top);
      P.r(ax, 22 + by, 2, 1, S.skin);
    } else {
      const aL = step < 0 ? 1 : step > 0 ? -1 : 0;
      P.r(5, 17 + by + aL, 2, 5, S.top); P.r(17, 17 + by - aL, 2, 5, S.top);
      P.r(5, 22 + by + aL, 2, 1, S.skin); P.r(17, 22 + by - aL, 2, 1, S.skin);
    }

    // ----- head -----
    const H = side ? HEADS : HEAD;
    for (const [y, x0, x1] of H) P.row(y + by, x0, x1, back ? S.hair : S.skin);
    if (!back) {
      // hair cap + bangs
      if (side) {
        for (const [y, x0, x1] of H) { if (y <= 8) P.row(y + by, x0, x1, S.hair); else P.row(y + by, x0, Math.min(x1, 11), S.hair); }
        P.row(9 + by, 12, 14, S.hair);
        if (S.hairStyle === 'long') { P.r(6, 9 + by, 5, 8, S.hair); }
        // hair highlight
        P.row(5 + by, 9, 12, S.hairHi); P.row(6 + by, 8, 9, S.hairHi);
        // eye (one, facing right)
        P.r(15, 10 + by, 2, 1, OUT); P.p(15, 11 + by, S.eye); P.p(16, 11 + by, S.eyeHi); P.r(15, 12 + by, 2, 1, S.eye);
        if (S.blush) P.p(14, 13 + by, S.blush);
        P.p(17, 14 + by, S.lips || S.skinS);
        P.row(15 + by, 9, 15, S.skinS);
        P.r(11, 16 + by, 2, 1, S.skinS);
      } else {
        for (const [y, x0, x1] of H) if (y <= 8) P.row(y + by, x0, x1, S.hair);
        // jagged fringe
        P.row(9 + by, 5, 18, S.hair);
        for (const x of [7, 10, 13, 16]) P.p(x, 9 + by, S.skin);
        P.p(5, 10 + by, S.hair); P.p(18, 10 + by, S.hair); P.p(6, 10 + by, S.hair); P.p(17, 10 + by, S.hair);
        if (S.hairStyle === 'long') { for (let y = 10; y <= 15; y++) { P.p(5, y + by, S.hair); P.p(18, y + by, S.hair); } P.r(4, 9 + by, 1, 8, S.hair); P.r(19, 9 + by, 1, 8, S.hair); }
        // highlight band
        P.row(5 + by, 8, 10, S.hairHi); P.row(5 + by, 13, 15, S.hairHi); P.p(7, 6 + by, S.hairHi); P.p(16, 6 + by, S.hairHi);
        // eyes
        for (const ex of [8, 14]) {
          P.r(ex, 10 + by, 2, 1, OUT);
          P.p(ex, 11 + by, S.eye); P.p(ex + 1, 11 + by, S.eyeHi);
          P.r(ex, 12 + by, 2, 1, S.eye);
        }
        if (S.blush) { P.p(7, 13 + by, S.blush); P.p(16, 13 + by, S.blush); }
        P.r(11, 14 + by, 2, 1, S.lips || S.skinS);
        P.row(15 + by, 8, 15, S.skinS);
        P.r(11, 16 + by, 2, 1, S.skinS);
      }
    } else {
      P.row(6 + by, 8, 11, S.hairHi); P.row(7 + by, 7, 8, S.hairHi);
      if (S.hairStyle === 'long') { P.r(6, 14 + by, 12, 12, S.hair); P.r(8, 16 + by, 1, 9, S.hairHi); P.r(14, 18 + by, 1, 7, S.hairHi); }
      if (S.veil) { P.r(6, 12 + by, 12, 13, S.veil); for (const x of [7, 10, 13, 16]) P.r(x, 14 + by, 1, 10, S.hair); P.r(9, 21 + by, 6, 2, '#c4122f'); P.p(11, 23 + by, '#7a0e22'); P.p(12, 23 + by, '#7a0e22'); }
    }
    if (S.hairStyle === 'bun') { P.r(9, 1 + by, 6, 3, S.hair); P.row(1 + by, 10, 13, S.hairHi); }
    if (S.kerchief) { for (const [y, x0, x1] of H) if (y <= 6) P.row(y + by, x0, x1, S.kerchief); }
    if (S.hat) { P.r(side ? 6 : 5, 2 + by, side ? 14 : 14, 2, S.hat); P.r(side ? 8 : 7, -1 + by + 1, 10, 3, S.hat); }
    // rose hair ornament
    if (S.rose) {
      const rx = side ? 7 : (dir === 'down' ? 16 : 6), ry = 4 + by;
      if (!(back && false)) { P.r(rx, ry, 3, 2, '#c4122f'); P.p(rx + 1, ry - 1, '#ff3a52'); P.p(rx, ry + 2, '#7a0e22'); }
    }
  }

  function drawSkeleton(cv, S, dir, frame) {
    const g = cv.getContext('2d'), P = painter(g);
    const by = frame === 1 ? 0 : -1, step = frame === 1 ? 0 : frame === 0 ? -1 : 1;
    const B = S.bone, Bs = S.boneS;
    const side = dir === 'left' || dir === 'right';
    // skull
    for (const [y, x0, x1] of [[4, 9, 14], [5, 8, 15], [6, 7, 16], [7, 7, 16], [8, 7, 16], [9, 7, 16], [10, 7, 16], [11, 8, 15], [12, 8, 15], [13, 9, 14], [14, 9, 14]]) P.row(y + by, x0, x1, B);
    if (dir !== 'up') {
      const sx = side ? 3 : 0;
      P.r(8 + sx, 8 + by, 3, 3, '#07060b'); if (!side) P.r(13, 8 + by, 3, 3, '#07060b');
      P.p(9 + sx, 9 + by, S.eye); if (!side) P.p(14, 9 + by, S.eye);
      P.p(11 + sx, 11 + by, '#07060b'); P.p(12, 11 + by, side ? B : '#07060b');
      for (const x of [9, 11, 13]) P.p(x + (side ? 1 : 0), 13 + by, '#07060b');
    }
    // spine & ribs
    P.r(11, 15 + by, 2, 9, Bs);
    for (let k = 0; k < 4; k++) P.row(16 + k * 2 + by, side ? 10 : 8, side ? 14 : 15, B);
    P.row(24 + by, 9, 14, B); // pelvis
    // arms
    const a = step;
    if (side) { P.r(11 + a, 16 + by, 1, 7, B); }
    else { P.r(6, 16 + by + a, 1, 7, B); P.r(17, 16 + by - a, 1, 7, B); P.p(5, 23 + by + a, B); P.p(18, 23 + by - a, B); }
    // legs
    if (side) { P.r(11 + step, 25 + by, 1, 6 - by, B); P.r(12 - step, 25 + by, 1, 6 - by, Bs); P.r(11 + step, 31, 3, 1, B); }
    else { P.r(9, 25 + by, 1, 6 - by + (step > 0 ? -1 : 0), B); P.r(14, 25 + by, 1, 6 - by + (step < 0 ? -1 : 0), B); P.r(8, 31 + (step > 0 ? -1 : 0), 3, 1, B); P.r(13, 31 + (step < 0 ? -1 : 0), 3, 1, B); }
  }

  function drawGhost(cv, S, dir, frame) {
    const g = cv.getContext('2d'), P = painter(g);
    const W0 = '#d6e8f6', W1 = '#b9e6ff', W2 = '#8a93b8';
    const rows = [[6, 9, 14], [7, 8, 15], [8, 7, 16], [9, 7, 16], [10, 6, 17], [11, 6, 17], [12, 6, 17], [13, 6, 17], [14, 5, 18], [15, 5, 18], [16, 5, 18], [17, 5, 18], [18, 5, 18], [19, 5, 18], [20, 5, 18], [21, 5, 18], [22, 5, 18], [23, 5, 18]];
    for (const [y, x0, x1] of rows) P.row(y, x0, x1, W0);
    // wavy hem animates with frame
    for (let x = 5; x <= 18; x++) { const h = ((x + frame * 2) % 4 < 2) ? 2 : 0; P.r(x, 24, 1, h, W0); }
    P.r(15, 9, 2, 12, W1); P.r(17, 12, 1, 10, W2);
    if (dir !== 'up') { P.r(8, 12, 2, 3, '#1d1a2e'); P.r(13, 12, 2, 3, '#1d1a2e'); P.r(10, 17, 3, 2, '#1d1a2e'); }
  }

  // black cat 24x32 frame (sits low in the cell)
  function drawCat(cv, S, dir, frame) {
    const g = cv.getContext('2d'), P = painter(g);
    const K = '#120f1c', Kh = '#2b2a45';
    const side = dir === 'left' || dir === 'right';
    if (side) {
      P.r(6, 23, 11, 5, K); P.r(15, 19, 6, 6, K); P.p(15, 18, K); P.p(20, 18, K); P.p(15, 17, K); P.p(20, 17, K);
      P.p(18, 21, '#ffcf7a'); P.p(20, 21, '#ffcf7a');
      const st = frame === 1 ? 0 : frame === 0 ? 1 : -1;
      P.r(7 + st, 28, 2, 3, K); P.r(14 - st, 28, 2, 3, K);
      P.r(3, 18 + (frame % 2), 2, 6, K); P.p(4, 17, K); P.r(5, 22, 2, 2, K);
      P.r(8, 23, 6, 1, Kh);
    } else {
      P.r(8, 18, 8, 7, K); P.p(8, 17, K); P.p(15, 17, K); P.p(8, 16, K); P.p(15, 16, K);
      if (dir !== 'up') { P.p(10, 20, '#ffcf7a'); P.p(13, 20, '#ffcf7a'); P.p(11, 22, '#ff8a9a'); }
      P.r(8, 25, 8, 5, K); P.r(9, 30, 2, 1, K); P.r(13, 30, 2, 1, K);
      P.r(16, 24 - (frame % 2), 2, 6, K); P.p(17, 23 - (frame % 2), K);
      P.r(9, 18, 6, 1, Kh);
    }
  }

  const cache = new Map();
  NM.sprite = function (name, dir = 'down', frame = 1) {
    const key = name + '|' + dir + '|' + frame;
    if (cache.has(key)) return cache.get(key);
    const S = SPEC[name] || {};
    const cv = canvas(SW, SH);
    const d = dir === 'left' ? 'right' : dir;
    if (name === 'cat') drawCat(cv, S, d, frame);
    else if (S.skeleton) drawSkeleton(cv, S, d, frame);
    else if (S.ghost) drawGhost(cv, S, d, frame);
    else drawHuman(cv, S, d, frame);
    outline(cv);
    let out = cv;
    if (dir === 'left') {
      out = canvas(SW, SH);
      const g = out.getContext('2d'); g.translate(SW, 0); g.scale(-1, 1); g.drawImage(cv, 0, 0);
    }
    cache.set(key, out);
    return out;
  };

  // walk frame from distance travelled (RPG Maker cycle: 0,1,2,1)
  NM.walkFrame = function (dist, stride = 8) {
    const k = Math.floor(dist / stride) % 4;
    return [1, 0, 1, 2][(k + 4) % 4];
  };

  // draw a character with feet at (x, y) — bottom-centre anchor, integer snapped
  NM.drawChar = function (g, name, x, y, dir = 'down', frame = 1, opt = {}) {
    const img = NM.sprite(name, dir, frame);
    const px = Math.round(x - SW / 2), py = Math.round(y - SH + (opt.lift || 0));
    g.save();
    if (opt.alpha != null) g.globalAlpha = opt.alpha;
    if (opt.shadow !== false) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y) - 1, 7, 2.5, 0, 0, NM.TAU); g.fill(); }
    if (opt.clipBottom != null) { g.beginPath(); g.rect(px - 2, py - 40, SW + 4, SH + 40 - opt.clipBottom); g.clip(); }
    g.drawImage(img, px, py);
    g.restore();
  };

  // ---------- emotion balloons (RPG Maker) ----------
  // types: '!', '?', 'note', 'heart', 'dots', 'anger', 'sweat', 'skull'
  NM.balloon = function (g, type, x, y, k = 1, t = 0) {
    if (k <= 0) return;
    const P = painter(g);
    x = Math.round(x - 8); y = Math.round(y - 18 + (k < 1 ? (1 - k) * 4 : 0));
    // bubble
    const W0 = '#f2f0ea';
    P.r(x + 1, y, 14, 13, W0); P.r(x, y + 1, 16, 11, W0);
    P.r(x + 5, y + 13, 4, 1, W0); P.r(x + 6, y + 14, 2, 1, W0);
    // outline
    P.r(x + 1, y - 1, 14, 1, OUT); P.r(x + 1, y + 13, 4, 1, OUT); P.r(x + 9, y + 13, 6, 1, OUT);
    P.r(x - 1, y + 1, 1, 11, OUT); P.r(x + 16, y + 1, 1, 11, OUT); P.p(x, y, OUT); P.p(x + 15, y, OUT); P.p(x, y + 12, OUT); P.p(x + 15, y + 12, OUT);
    P.p(x + 5, y + 14, OUT); P.p(x + 8, y + 14, OUT); P.r(x + 6, y + 15, 2, 1, OUT);
    const R = '#c4122f', K = '#07060b';
    switch (type) {
      case '!': P.r(x + 7, y + 2, 2, 6, R); P.r(x + 7, y + 9, 2, 2, R); break;
      case '?': P.r(x + 6, y + 2, 4, 1, K); P.r(x + 10, y + 3, 1, 2, K); P.r(x + 5, y + 3, 1, 1, K); P.r(x + 8, y + 5, 2, 1, K); P.r(x + 7, y + 6, 1, 2, K); P.r(x + 7, y + 9, 1, 2, K); break;
      case 'note': P.r(x + 9, y + 2, 1, 7, K); P.r(x + 10, y + 2, 3, 1, K); P.r(x + 12, y + 3, 1, 2, K); P.r(x + 6, y + 8, 4, 3, K); break;
      case 'heart': {
        const pulse = Math.floor(t * 4) % 2;
        P.r(x + 4, y + 3, 3, 2, R); P.r(x + 9, y + 3, 3, 2, R); P.r(x + 3, y + 4, 10, 3, R); P.r(x + 4, y + 7, 8, 1, R); P.r(x + 5, y + 8, 6, 1, R); P.r(x + 6, y + 9, 4, 1, R); P.r(x + 7, y + 10, 2, 1, R);
        if (pulse) P.p(x + 5, y + 4, '#ff8a9a'); break;
      }
      case 'brokenheart':
        P.r(x + 4, y + 3, 3, 2, R); P.r(x + 9, y + 3, 3, 2, R); P.r(x + 3, y + 4, 10, 3, R); P.r(x + 4, y + 7, 8, 1, R); P.r(x + 5, y + 8, 6, 1, R); P.r(x + 6, y + 9, 4, 1, R); P.r(x + 7, y + 10, 2, 1, R);
        P.r(x + 8, y + 3, 1, 3, W0); P.r(x + 7, y + 6, 1, 2, W0); P.r(x + 8, y + 8, 1, 2, W0); break;
      case 'dots': { const n = Math.min(3, Math.floor(t * 3) % 4); for (let i = 0; i < n; i++) P.r(x + 3 + i * 4, y + 6, 2, 2, K); break; }
      case 'anger': P.r(x + 4, y + 3, 2, 3, R); P.r(x + 3, y + 5, 3, 1, R); P.r(x + 10, y + 3, 2, 3, R); P.r(x + 10, y + 5, 3, 1, R); P.r(x + 4, y + 8, 2, 3, R); P.r(x + 3, y + 8, 3, 1, R); P.r(x + 10, y + 8, 2, 3, R); P.r(x + 10, y + 8, 3, 1, R); break;
      case 'sweat': P.r(x + 9, y + 3, 2, 2, '#5a6287'); P.r(x + 8, y + 5, 4, 3, '#5a6287'); P.r(x + 9, y + 8, 2, 1, '#5a6287'); P.p(x + 9, y + 5, '#b9e6ff'); break;
      case 'skull': P.r(x + 5, y + 2, 6, 6, K); P.r(x + 4, y + 3, 8, 4, K); P.r(x + 6, y + 8, 4, 2, K); P.p(x + 6, y + 4, W0); P.p(x + 9, y + 4, W0); P.p(x + 7, y + 9, W0); break;
    }
  };
})();
