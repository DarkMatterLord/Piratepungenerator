'use strict';
// CHORUS (×3): p.v = 1 golden, 2 grander (the nave, Ur in chains), 3 apocalyptic (the blood god)

function iconPanel(t, o = {}) {
  const heat = o.heat || 0, blood = o.blood || 0, lt = o.lt || 0;
  E.light = (x, y) => (o.lk ?? 1) * (0.55 + 0.75 * Math.exp(-((x - 960) ** 2 + (y - 420) ** 2) / (2 * 380 * 380)) + 0.18 * E.beat);
  quarries('ground', 0, 0, W, H, 92, (x, y, c) => {
    const v = hash(c.seed);
    const base = v < 0.12 ? '#3a1f8a' : v < 0.2 ? '#1c3aa8' : '#1a2a86';
    return heat > 0 ? lerpRGB(base, v < 0.5 ? '#5a0610' : '#3a0410', heat) : base;
  });
  rosettes('ground', 0, 0, W, H, 92, heat > 0.5 ? ['#ff3020'] : ['#ffcc40', '#ff9a30']);
  mandorla('icon', 960, 575, 300, 490, t, { heat, rays: 26 });
  const open = o.open ?? 1;
  const P = mcPose({ x: 960, y: 1015, s: 0.74, nimbus: 1, headTilt: -0.04 + Math.sin(t * 0.8) * 0.02, lookY: 0.5, look: Math.sin(t * 0.5) * 0.3, smirk: blood ? 0.1 : 0.35, brow: blood ? 0.6 : -0.1, blood, eyeGlow: blood,
    al: { sh: lerp(0.3, 1.05, open), el: lerp(0.1, -0.4, open), wr: 0.2, hand: blood ? 'claw' : 'open' }, ar: { sh: lerp(0.3, 1.05, open), el: lerp(0.1, -0.4, open), wr: 0.2, hand: blood ? 'claw' : 'open' },
    mouth: mouthAt(t), blink: blinkAt(t, 1), snarl: blood ? 0.3 : 0 });
  if (blood > 0) {
    // the blood form bleeds light into the window around it
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(960, 600, 50, 960, 600, 700);
    g.addColorStop(0, `rgba(255,30,20,${0.35 * blood * E.pulse})`); g.addColorStop(1, 'rgba(120,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  drawMalacay(P, t);
  // the Shaikan rise beneath him
  const ppl = [[470, 1000, 'raise'], [600, 1035, 'reach'], [330, 1040, 'pray'], [1450, 1000, 'raise'], [1320, 1035, 'reach'], [1590, 1040, 'pray']];
  ppl.forEach(([x, y, arms], i) => {
    const kn = clamp(1 - (lt - 0.5 - (i % 3) * 0.5) / 1.5);
    drawPerson(x, y, 0.56, { kind: 'shaikan', arms: kn > 0.6 ? 'pray' : arms, kneel: kn, glow: 0.4 + 0.6 * clamp(lt / 3) + blood * 0.5, flip: x > 960, look: x < 960 ? 0.6 : -0.6 });
  });
  jewelBorder('frame', 22, 22, W - 22, H - 22, 26, heat > 0.5 ? ['#c8202c', '#ff6a30', '#4a0610', '#ff6a30'] : ['#c8202c', '#ffcc40', '#2a46c8', '#ffcc40'], { seg: 70 });
  const border = new Path2D(); border.rect(10, 10, W - 20, H - 20); lead(border, 22);
}
// chorus line 1: the icon, Malacay in the mandorla as the Shaikan rise
SCENES.icon = (lt, p) => {
  const v = p.v || 1;
  if (v === 2) {
    // inside the cathedral: the great window above a crowd of raised hands
    stoneWall(0, 0, W, H, { color: '#0d0b12' });
    const cam = camAt(lt, 5.3, { z0: 1.0, z1: 1.18, y0: 520, y1: 470 });
    withCamera(cam, () => {
      const ax = 470, ay = 1060, aw = 980, ah = 1120;
      const win = archPath(ax, ay, aw, ah);
      ctx.save(); ctx.clip(win);
      push(960, 520, 0, 0.62); scaled(0.62, () => { ctx.translate(-960, -540); iconPanel(E.T, { lt, heat: 0.25 }); }); pop();
      ctx.restore();
      E.light = null;
      tracery(win, 40);
      lightBeam(960, 900, 820, 960, 1300, 1700, '#ffb060', 0.22 + 0.1 * E.beat);
      // silhouetted crowd with raised arms
      ctx.fillStyle = '#050307';
      for (let i = 0; i < 26; i++) {
        const x = (i / 25) * W * 1.1 - 80 + hash(i) * 40, h = 150 + hash(i + 3) * 70, y = H + 30 - (i % 3) * 18;
        const up = Math.sin(E.T * 2 + i) * 10 + clamp(lt - 0.8) * 20;
        ctx.beginPath(); ctx.ellipse(x, y - h, 26, 32, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 46, y + 40); ctx.lineTo(x - 40, y - h + 40); ctx.lineTo(x + 40, y - h + 40); ctx.lineTo(x + 46, y + 40); ctx.fill();
        if (i % 2 === 0) { ctx.save(); ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.strokeStyle = '#050307'; ctx.beginPath(); ctx.moveTo(x - 30, y - h + 50); ctx.lineTo(x - 70, y - h - 90 - up); ctx.moveTo(x + 30, y - h + 50); ctx.lineTo(x + 70, y - h - 90 - up); ctx.stroke(); ctx.restore(); }
      }
    });
    dust(0, 0, W, H, 80, E.T, '#ffd8a0', 0.4);
    return;
  }
  const cam = camAt(lt, 5.3, { z0: 1.0, z1: 1.06, y0: 540, y1: 520 });
  withCamera(cam, () => iconPanel(E.T, { lt, heat: v === 3 ? 0.9 : 0, blood: v === 3 ? 1 : 0 }));
};

// chorus line 2: a thousand pieces fly together into one window
function sigilColor(x, y, v) {
  const dx = x - 960, dy = y - 540, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  const red = v === 3;
  if (r < 70) return red ? '#ff2a1a' : '#ff1a24';
  if (r < 110) return red ? '#2a0408' : '#ffd040';
  const rp = 330 * (0.62 + 0.38 * Math.abs(Math.cos(a * 6)));
  if (r < rp) return (Math.floor(((a + Math.PI) / TAU) * 12 + 0.5) % 2) ? (red ? '#a00818' : '#c8202c') : (red ? '#5a0610' : '#ffb030');
  if (r < 360) return red ? '#ff4a20' : '#ffd040';
  if (r < 460) return (Math.floor(((a + Math.PI) / TAU) * 24) % 2) ? (red ? '#3a0410' : '#2a46c8') : (red ? '#7a0a14' : '#1a2a86');
  if (r < 490) return red ? '#ff4a20' : '#ffcc40';
  return red ? (hash(Math.floor(x / 40) * 7 + Math.floor(y / 40)) < 0.2 ? '#4a0610' : '#24030a') : (hash(Math.floor(x / 40) * 7 + Math.floor(y / 40)) < 0.2 ? '#3a1f8a' : '#1a1458');
}
const LIFE_COLS = ['#e8a040', '#6a8a3a', '#8a4a6a', '#4a7a8a', '#c8b060', '#7a5a9a', '#b05a3a', '#5a8a6a', '#a0a0c0', '#c86a8a'];
// render a picture offscreen with the normal drawing code
function renderOffscreen(fn) {
  const c = makeCanvas(W, H), g = c.getContext('2d'), prev = ctx, prevL = E.light, prevS = E.shadowScale;
  ctx = g;
  try { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); E.shadowScale = 1; fn(); } finally { ctx = prev; E.light = prevL; E.shadowScale = prevS; }
  return c;
}
// cut a picture into sprites along a tessellation's cells
function cutSprites(img, cells) {
  return cells.map((c) => {
    const xs = c.pts.map((p) => p[0]), ys = c.pts.map((p) => p[1]);
    const bx = Math.floor(Math.min(...xs)) - 2, by = Math.floor(Math.min(...ys)) - 2;
    const bw = Math.ceil(Math.max(...xs)) - bx + 4, bh = Math.ceil(Math.max(...ys)) - by + 4;
    const sc = makeCanvas(Math.max(1, bw), Math.max(1, bh)), g = sc.getContext('2d');
    g.translate(-bx, -by); g.clip(c.path); g.drawImage(img, 0, 0);
    return { sc, bx, by };
  });
}
const _mosaicSprites = {};
SCENES.mosaic = (lt, p) => {
  const v = p.v || 1, D = 4.0;
  const cells = tess('mosaic', 0, 0, W, H, 44, { seed: 2024, jit: 0.9 }).cells;
  if (!_mosaicSprites[v]) {
    const img = renderOffscreen(() => {
      const keepT = E.T;
      if (v === 2) { E.light = sunLight(960, 360, 520, 0.7, 0.6); bustBg('mos', 0); drawMalacay(mcPose({ x: 960, y: 3240, s: 2.75, nimbus: 1, brow: 0.15, smirk: 0.35, lookY: 0.15 }), 0); }
      else iconPanel(5, { lt: 5, heat: v === 3 ? 0.9 : 0, blood: v === 3 ? 1 : 0 });
      E.T = keepT;
    });
    _mosaicSprites[v] = cutSprites(img, cells);
  }
  const spr = _mosaicSprites[v];
  ctx.fillStyle = '#040306'; ctx.fillRect(0, 0, W, H);
  E.light = () => 0.95 + 0.2 * E.beat;
  const cam = camAt(lt, 6.2, { z0: 1.14, z1: 1.0, r0: 0.05, r1: 0 });
  withCamera(cam, () => {
    cells.forEach((c, i) => {
      const d = Math.hypot(c.cx - 960, c.cy - 540);
      const delay = (d / 1100) * 1.5 + hash(c.seed) * 0.5;
      const u = smooth(clamp((lt - delay) / (D - 1.5)));
      const e = 1 - (1 - u) ** 3;
      const ang = hash(c.seed + 1) * TAU, far = 900 + hash(c.seed + 2) * 900;
      const ox = Math.cos(ang) * far * (1 - e), oy = Math.sin(ang) * far * (1 - e), rot = (hash(c.seed + 3) - 0.5) * 9 * (1 - e);
      const k = smooth(clamp(u * 1.6 - 0.45));
      ctx.save();
      ctx.translate(c.cx + ox, c.cy + oy); ctx.rotate(rot); const sc = lerp(0.55, 1, e); ctx.scale(sc, sc); ctx.translate(-c.cx, -c.cy);
      if (k < 1) glassPiece(c.path, LIFE_COLS[c.seed % LIFE_COLS.length], { cx: c.cx, cy: c.cy, r: c.r, seed: c.seed, tex: 0, flat: true, L: 1 });
      if (k > 0) { ctx.globalAlpha = k; ctx.drawImage(spr[i].sc, spr[i].bx, spr[i].by); ctx.globalAlpha = 1; }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,18,24,0.9)'; ctx.stroke(c.path);
      ctx.restore();
    });
  });
  if (lt > D && lt < D + 0.4) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - (lt - D) / 0.4; ctx.fillStyle = 'rgba(255,230,180,0.45)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
};

// chorus line 3: his crown blazes while the lesser crowns tarnish and fall
SCENES.crown = (lt, p) => {
  const v = p.v || 1;
  E.light = sunLight(960, 470, 520, 0.6, 0.8);
  const cam = camAt(lt, 5.8, { z0: 1.0, z1: 1.1 });
  withCamera(cam, () => {
    warmGround('crown' + v, lt, v === 3 ? { a: '#5a0610', b: '#24030a', c: '#a00818', rosCol: ['#ff3020'] } : { a: '#2a46a8', b: '#141c58', c: '#3a5ac8', rosCol: ['#ffcc40'] });
    mandorla('crown' + v, 960, 520, 340, 400, E.T, { heat: v === 3 ? 0.9 : 0, rays: 28 });
    // lesser crowns tarnish, crack and fall
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.5, x = 960 + Math.cos(a) * 640, y = 540 + Math.sin(a) * 380;
      const fade = clamp((lt - 0.8 - i * 0.45) / 1.0), fall = clamp((lt - 1.8 - i * 0.45) / 1.6) ** 2;
      if (fall >= 1) continue;
      ctx.save();
      drawCrown(x, y + fall * 700, 0.62, { col: lerpRGB('#ffc63a', '#5a5a64', fade), rot: fall * 3 * (i % 2 ? 1 : -1) });
      if (fade > 0.3) drawCracks(crackPaths(x, y + fall * 700, 90, i * 13 + 1, fade), 3);
      ctx.restore();
    }
    drawCrown(960, 560, 1.45 + 0.04 * E.beat, { glow: 0.8 + 0.4 * E.beat, col: v === 3 ? '#ff3a2a' : GOLD });
    if (v === 3) { ctx.save(); ctx.globalAlpha = 0.9; drawVeins(veinGeo('crownveins', [[960, 620, 1.57, 300], [960, 620, 0.4, 300], [960, 620, 2.7, 300]], { seed: 77 }), 4, 1, E.pulse); ctx.restore(); }
  });
  frameBorder(v === 3 ? ['#c8202c', '#ff6a30', '#4a0610', '#ff6a30'] : undefined);
};

// chorus line 4: a triptych of lancets, one form in each
SCENES.forms = (lt, p) => {
  const v = p.v || 1;
  stoneWall(0, 0, W, H, { color: '#0e0c13' });
  const cam = camAt(lt, 7.3, { z0: 1.0, z1: 1.08 });
  withCamera(cam, () => {
    const lanc = [[230, 'human'], [760, 'god'], [1290, 'blood']];
    lanc.forEach(([ax, form], i) => {
      const aw = 400, ah = 960, ay = 1010;
      const on = smooth(clamp((lt - i * 1.6) / 0.8));
      const win = archPath(ax, ay, aw, ah);
      ctx.save(); ctx.clip(win);
      E.light = (x, y) => (0.15 + 0.95 * on) * (0.75 + 0.4 * Math.exp(-((x - ax - aw / 2) ** 2 + (y - 420) ** 2) / (2 * 300 * 300))) + 0.12 * E.beat * on;
      const heat = form === 'blood' || v === 3 ? 0.9 : form === 'god' ? 0.1 : 0;
      quarries('lanc' + i, ax, ay - ah, ax + aw, ay, 64, (x, y, c) => (heat > 0.5 ? (hash(c.seed) < 0.2 ? '#7a0a14' : '#3a0410') : form === 'god' ? (hash(c.seed) < 0.2 ? '#ffd040' : '#e0a030') : (hash(c.seed) < 0.2 ? '#3a1f8a' : '#1a2a86')), { leadW: 3 });
      const P = mcPose({ x: ax + aw / 2, y: ay - 30, s: 0.58, nimbus: form === 'god' ? 1 : 0, blood: heat > 0.5 ? 1 : 0, eyeGlow: heat > 0.5 ? 1 : 0, mouth: mouthAt(E.T), blink: blinkAt(E.T, i + 1),
        brow: form === 'blood' ? 0.6 : 0.1, smirk: form === 'god' ? 0.4 : 0.2, look: (1 - i) * 0.4,
        al: form === 'god' ? { sh: 0.9, el: -0.5, hand: 'bless' } : form === 'blood' ? { sh: 1.4, el: -0.2, hand: 'claw' } : { sh: 0.2, el: 0.3, hand: 'open' },
        ar: form === 'god' ? { sh: 0.3, el: -1.6, hand: 'open' } : form === 'blood' ? { sh: 1.4, el: -0.2, hand: 'claw' } : { sh: 0.25, el: -1.4, hand: 'point' } });
      drawMalacay(P, E.T);
      ctx.restore();
      E.light = null;
      tracery(win, 30);
      if (on > 0.05) { lightBeam(ax + aw / 2, ay - 80, aw * 0.8, ax + aw / 2 + 80, 1300, aw * 1.6, form === 'blood' ? '#ff3020' : form === 'god' ? '#ffd060' : '#8090ff', 0.12 * on); }
    });
  });
  dust(0, 0, W, H, 60, E.T);
};

// chorus line 5: war and burning
SCENES.war = (lt, p) => {
  const v = p.v || 1, t = E.T;
  E.light = (x, y) => 0.55 + 0.5 * clamp((y - 300) / 700) + 0.25 * E.beat;
  const cam = camAt(lt, 3.9, { z0: 1.1, z1: 1.0, x0: 900, x1: 1020 });
  withCamera(cam, () => {
    quarries('war', 0, 0, W, H, 86, (x, y, c) => lerpRGB('#3a0a10', '#ff6a1a', clamp(y / H) * (0.6 + 0.4 * hash(c.seed))), { leadW: 3.5 });
    cloudBand('smoke', 60, 1860, 220, 90, 10, ['#3a3238', '#2a2428', '#4a3a3a']);
    if (v >= 2) drawCity('war', 40, 1880, 820, { wall: ['#5a4030', '#4a3428', '#6a4a34'], roof: ['#3a2418', '#2a1a12'], lit: (x, y, r) => r < 0.5, winCol: 'rgba(255,140,40,0.95)', hmin: 120, hvar: 220, seed: 5 });
    flames('warfire', 0, W, 900, 260, 22, t, { glow: 0.6 });
    for (let i = 0; i < 7; i++) {
      const x = 180 + i * 260, flip = i % 2 === 1, sw = Math.sin(t * 6 + i * 2);
      drawPerson(x, 1060, 0.78, { kind: 'folk', arms: sw > 0 ? 'raise' : 'point', flip, robe: i % 2 ? '#3a3a4a' : '#5a2a2a', robe2: i % 2 ? '#4c4c60' : '#743838', mouth: 'open', brow: 1, frown: 1, look: flip ? -1 : 1 });
      // spear
      ctx.save(); ctx.lineCap = 'round';
      const sx = x + (flip ? -1 : 1) * 60, sy = 1060 - 0.78 * 330;
      ctx.strokeStyle = '#151419'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(sx - (flip ? -1 : 1) * 40, sy + 120); ctx.lineTo(sx + (flip ? -1 : 1) * (120 + sw * 20), sy - 160); ctx.stroke();
      ctx.strokeStyle = '#c8ccd8'; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
    }
    embers(0, 300, W, H, 60, t);
  });
  frameBorder(['#c8202c', '#ff8a1a', '#3a0a10', '#ff8a1a']);
};

// chorus line 6: he closes his eyes and turns away
SCENES.turnAway = (lt, p) => {
  const v = p.v || 1, u = smooth(clamp((lt - 0.4) / 1.0));
  E.light = sunLight(960, 360, 520, 0.6, 0.6);
  withCamera(camAt(lt, 2.7, { z0: 1.0, z1: 1.1 }), () => {
    bustBg('turn' + v, E.T, { heat: v === 3 ? 0.9 : 0.35, cols: (c, k) => lerpRGB(k < 0.15 ? '#ff6a1a' : '#a8301a', '#3a0a10', clamp(c.cy / H)) });
    drawCracks(crackPaths(1500, 300, 700, 5, u * 1.2), 4);
    drawCracks(crackPaths(380, 760, 600, 9, u), 4);
    singBust(lt, { pose: { blink: v === 3 ? 0 : u, look: -0.4 * u, headTilt: -0.07 * u, brow: 0.6, smirk: 0, blood: v === 3 ? 1 : 0, eyeGlow: v === 3 ? 1 : 0 } });
  });
};

// chorus line 7: the golden capital under his hand
SCENES.paradise = (lt, p) => {
  const v = p.v || 1, t = E.T, u = smooth(clamp(lt / 2.6));
  E.light = sunLight(960, 260, 600, 0.65, 0.8);
  withCamera(camAt(lt, 3.6, { z0: 1.08, z1: 1.0, y0: 560, y1: 520 }), () => {
    quarries('par' + v, 0, 0, W, H, 90, (x, y, c) => {
      const k = clamp(y / 800);
      return v === 3 ? lerpRGB('#ff4a1a', '#5a0610', k) : lerpRGB('#fff0a0', '#ffa030', k * (0.7 + 0.3 * hash(c.seed)));
    }, { leadW: 3.5 });
    push(960, 260); const sunT = tessRadial('parsun', 0, 0, 40, 260, 2, 20, { rot: t * 0.05 }); glassField(sunT, (x, y, c) => (c.seed % 2 ? '#fff6c0' : '#ffe080'), { leadW: 4 }); pop();
    drawCity('capital', 80, 1840, 1010, { hmin: 160, hvar: 280, seed: 11 });
    bigHand(960, lerp(-620, -170, u), 2.7, 'open', 0, { wr: 0, blood: v === 3 ? 1 : 0 });
  });
  frameBorder(['#ffcc40', '#c8202c', '#ffffff', '#c8202c']);
};

// chorus line 8: the hand closes on the world
SCENES.closeHand = (lt, p) => {
  const v = p.v || 1, t = E.T;
  const close = smooth(clamp((lt - 0.3) / 2.8)), grip = smooth(clamp((close - 0.55) / 0.45));
  E.light = sunLight(960, 600, 620, 0.55, 0.6);
  quarries('close' + v, 0, 0, W, H, 88, (x, y, c) => (v >= 2 ? (hash(c.seed) < 0.2 ? '#4a0610' : '#24030a') : (hash(c.seed) < 0.2 ? '#3a1f8a' : '#1a1458')), { leadW: 3.5 });
  rosettes('close' + v, 0, 0, W, H, 88, v >= 2 ? ['#ff3020'] : ['#ffcc40']);
  withCamera(camAt(lt, 4.6, { z0: 1.0, z1: 1.12, y0: 540, y1: 600 }), () => {
    // the broken land as a cracked glass globe; the blood runs in from where his fingers touch
    const gx = 960, gy = 660, gr = 240, gs = gr / 640;
    push(gx, gy); ctx.scale(gs, gs); ctx.translate(-960, -540);
    const clip = new Path2D(); clip.arc(960, 540, 640, 0, TAU);
    ctx.save(); ctx.clip(clip);
    drawMap(lt, { borderBlood: grip > 0 ? 1 : 0, bloodFrom: [960, 120, grip * 1500], bleed: (c) => grip * clamp((grip * 1500 - Math.hypot(c.cx - 960, c.cy - 120)) / 400) * 0.9 });
    ctx.restore();
    lead(clip, 26);
    const cr = crackPaths(960, 540, 640, 31, 1);
    drawCracks(cr, 9);
    if (grip > 0) { ctx.save(); ctx.globalAlpha = grip; bloodLead(cr, 16, 1); ctx.restore(); }
    pop();
    // the hand descends and curls around it
    const kind = close < 0.3 ? 'open' : close < 0.62 ? 'reach' : 'claw';
    const ye = lerp(-1180, -760, close) + Math.sin(t * 9) * 3 * grip;
    bigHand(gx, ye, 5.2, kind, 0, { wr: 0, blood: v === 3 ? 1 : 0 });
    if (grip > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 520);
      g.addColorStop(0, `rgba(255,40,30,${0.38 * grip * E.pulse})`); g.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  });
  frameBorder(['#c8202c', '#ffcc40', '#4a0610', '#ffcc40']);
};

// chorus line 3: his crown blazes while the lesser crowns tarnish and fall (chorus 2) — Ur bound in blood chains
SCENES.urChained = (lt, p) => {
  const t = E.T, bind = smooth(clamp(lt / 2.6));
  E.light = sunLight(960, 460, 640, 0.55, 0.6);
  withCamera(camAt(lt, 5.6, { z0: 1.0, z1: 1.1 }), () => {
    quarries('urc', 0, 0, W, H, 88, (x, y, c) => lerpRGB(hash(c.seed) < 0.2 ? '#3a1f8a' : '#1a2a86', hash(c.seed) < 0.5 ? '#5a0610' : '#2a030a', bind * 0.8), { leadW: 3.5 });
    rosettes('urc', 0, 0, W, H, 88, ['#ff3020']);
    drawUr(1000, 640, 0.6, { flap: 0.03 * (1 - bind), flapRate: 3, chains: bind, jaw: 0.3 + 0.2 * Math.sin(t * 5), eyeCol: '#ff8a00' });
  });
  frameBorder(['#c8202c', '#ffcc40', '#4a0610', '#ffcc40']);
};
// chorus 2, line 4: the blood god revealed
SCENES.bloodGod = (lt, p) => {
  const t = E.T, u = smooth(clamp(lt / 2.2)), v = p.v || 2;
  E.light = (x, y) => 0.45 + 0.6 * Math.exp(-((x - 960) ** 2 + (y - 450) ** 2) / (2 * 450 * 450)) + 0.3 * E.beat;
  withCamera(camAt(lt, 7.3, { z0: 1.15, z1: 1.0, y0: 500, y1: 560 }), () => {
    quarries('bgod', 0, 0, W, H, 88, (x, y, c) => (hash(c.seed) < 0.2 ? '#4a0610' : '#1e0206'), { leadW: 3.5 });
    // the vein web spills out behind him like a storm
    ctx.save(); ctx.globalAlpha = u;
    drawVeins(veinGeo('godweb', [[960, 420, -1.57, 520], [960, 420, -0.6, 640], [960, 420, -2.5, 640], [960, 420, 0.3, 720], [960, 420, 2.8, 720], [960, 420, -1.1, 600], [960, 420, -2.0, 600]], { seed: 13, branch: 0.45, wander: 0.6 }), 9, u, E.pulse);
    ctx.restore();
    const P = mcPose({ x: 960, y: 1090, s: 0.9, blood: 1, eyeGlow: 1, nimbus: 0, brow: 0.5, smirk: 0.15, snarl: 0.2, mouth: mouthAt(t), lookY: 0.3,
      al: { sh: lerp(0.4, 1.5, u), el: -0.15, wr: 0.2, hand: 'claw' }, ar: { sh: lerp(0.4, 1.5, u), el: -0.15, wr: 0.2, hand: 'claw' } });
    drawMalacay(P, t);
    // blood falling from his open hands
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
      const ph = (t * 0.9 + k / 4 + (sx > 0 ? 0.13 : 0)) % 1;
      const hx = 960 + sx * 470, hy = 560 + ph * 520;
      push(hx + sx * k * 8, hy); region('bdrop', () => ({ out: [[0, -26, 1], [12, 0], [10, 14], [0, 19], [-10, 14], [-12, 0]] }), ['#d01020'], { lw: 3.5, glow: 0.6, glowR: 20, keep: true }); pop();
    }
  });
  frameBorder(['#c8202c', '#ff6a30', '#4a0610', '#ff6a30']);
};
