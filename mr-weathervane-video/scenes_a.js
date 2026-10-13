'use strict';
// Section A — Intro, Verse 1, Pre-Chorus 1 (0 – 48.5 s)

// ---------- pose library (screen-left arm 'al' usually holds the pointer) ----------
const ARM = {
  rest: { sh: 0.15, el: 0.12, wr: 0 },
  pointHigh: { sh: 2.2, el: -0.15, wr: 0 },
  pointMid: { sh: 1.72, el: -0.05, wr: 0 },
  pointLow: { sh: 1.2, el: 0.05, wr: 0 },
  wave: { sh: 2.45, el: 0.55, wr: 0 },
  shrug: { sh: 0.5, el: 1.3, wr: 0.3 },
  wag: { sh: 0.42, el: -2.6, wr: 0 },
  wide: { sh: 1.75, el: 0.25, wr: 0.1 },
  up: { sh: 2.7, el: 0.15, wr: 0 },
  present: { sh: 1.05, el: 0.6, wr: 0.2 },
  chest: { sh: 0.35, el: -2.1, wr: 0.2 },
  ear: { sh: 1.75, el: -2.25, wr: 0.3 },
  fork: { sh: 0.55, el: -1.9, wr: -0.3 },
};
const ARMS = (k) => (typeof k === 'string' ? ARM[k] : k);
function armKf(t, keys, hand) {
  const pick = (i) => ARMS(keys[i][1]);
  if (t <= keys[0][0]) return Object.assign({ hand }, pick(0));
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const a = pick(i - 1), b = pick(i), u = easeInOut((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
      return { sh: lerp(a.sh, b.sh, u), el: lerp(a.el, b.el, u), wr: lerp(a.wr, b.wr, u), hand };
    }
  }
  return Object.assign({ hand }, pick(keys.length - 1));
}
const waveOsc = (T, a) => Object.assign({}, a, { el: a.el + Math.sin(T * 13) * 0.35 });
const wagOsc = (T, a) => Object.assign({}, a, { wr: a.wr + Math.sin(T * 16) * 0.35 });

// ---------- family on the couch ----------
function family(o = {}) {
  const lk = o.look ?? -1, ly = o.lookY ?? 0;
  const base = (x, v, extra) => Object.assign({ x, v, look: lk, lookY: ly, eyes: o.eyes, mouth: o.mouth || 'smile', headTilt: (o.tilt || 0) + Math.sin(E.T * 2 + v) * 0.03, armL: 0.25, armR: 0.25, s: 1.7 }, extra);
  return [
    base(1120, 0, { style: 'man', shirt: mix('#4f8fc0', '#1e3550', E.D), hair: '#3b2a20' }),
    base(1345, 3, { style: 'woman', shirt: mix('#e98aa0', '#4a2236', E.D), hair: '#7a3b22' }),
    base(1560, 1, { style: 'child', shirt: mix('#f2b84b', '#5a4524', E.D), hat: mix('#e2574c', '#5a1f2a', E.D), s: 1.35, y: 800 }),
  ];
}

// ---------- Channel 9 ident card ----------
function identCard(T) {
  paperBackdrop('#f6efdc');
  sunburst(W / 2, H / 2, 1300, 24, T * 0.6, '#f7d77e', '#f3b56a');
  paper((c) => pBlob(c, W / 2, H / 2 - 40, 300, 300, 0.01, 4, 60), '#14855e', { d: 2.4, tex: 0.7, edge: '#ffe9a8', edgeA: 0.9, edgeW: 8 });
  ptext('9', W / 2, H / 2 + 120, '440px "Limelight"', '#ffe9a8', { d: 1.4, tex: 0.3 });
  ribbon(W / 2, H / 2 + 300, 980, "TOMORROW'S WEATHER — TODAY!", { h: 120, font: '64px "Bebas Neue"', ls: 6 });
}

// ============ 0.00  Living room: the TV switches on ============
shot(0, 'living_on', (lt, dur, T) => {
  const k = easeIn(seg(T, 1.6, 3.36));
  const cam = { x: lerp(960, TV_SCREEN.x, k), y: lerp(540, TV_SCREEN.y, k), z: lerp(1, 2.4, k) };
  const on = clamp((T - 0.22) / 0.4);
  drawLiving({
    cam, tvOn: on, tvLight: 0.3 * on, tvGlow: on,
    family: family({ look: -1 }),
    screen: (sw, sh) => {
      if (T < 1.0) inScreen(sw, sh, () => identCard(T));
      else tvHost(sw, sh, T, { cam: { x: 1250, y: 560, z: 1.25 }, pose: { ar: waveOsc(T, ARM.wave), al: ARM.rest, eyes: T < 2.3 ? 'happy' : 'open', pointer: null, x: 1250 } });
    },
  });
});

// ============ 3.36  Studio: "All skies are clear" / "a storm that isn't even here" ============
shot(3.36, 'studio_forecast', (lt, dur, T) => {
  const cam = {
    x: kf(T, [[3.36, 900], [9.7, 940], [11.96, 1390]]),
    y: kf(T, [[3.36, 540], [9.7, 530], [11.96, 400]]),
    z: kf(T, [[3.36, 1.0], [9.7, 1.04], [11.96, 1.75]]),
  };
  const worried = T > 8.6;
  const icons = [
    { k: 'sun', u: 0.24, v: 0.45, t0: 4.06, face: worried ? 'worried' : 'smile' },
    { k: 'sun', u: 0.53, v: 0.6, t0: 4.42, face: worried ? 'worried' : 'smile' },
    { k: 'sun', u: 0.78, v: 0.42, t0: 4.78, face: worried ? 'worried' : 'smile' },
    { k: 'storm', u: 0.5, v: 0.3, s: 1.2, t0: 8.34, shake: true },
  ];
  drawStudio({ cam, map: { icons, T }, actors: () => {
    const P = wvPose({ x: 1420, y: 1010, s: 0.74, pointer: 'l' });
    P.al = armKf(T, [[3.36, 'rest'], [3.9, 'pointMid'], [4.4, 'pointHigh'], [4.9, 'pointMid'], [5.7, 'rest'], [7.5, 'rest'], [8.05, 'pointHigh'], [8.34, 'pointMid'], [8.8, 'shrug'], [10.0, 'shrug'], [10.7, 'rest']], 'fist');
    P.pointerAng = kf(T, [[3.36, -0.2], [4.4, -0.55], [4.9, -0.3], [8.05, -0.7], [8.34, -0.15], [8.8, 0.2]]);
    let ar = armKf(T, [[3.36, 'rest'], [5.85, 'rest'], [6.35, 'wag'], [7.5, 'wag'], [8.2, 'rest'], [8.8, 'shrug'], [10.0, 'shrug'], [10.7, 'rest']], T > 6.1 && T < 7.6 ? 'point' : 'open');
    if (T > 6.3 && T < 7.5) ar = wagOsc(T, ar);
    P.ar = ar;
    P.wink = T > 9.55 && T < 10.3 ? 1 : 0;
    P.brow = T > 5.9 && T < 7.6 ? 0.7 : 0.15;
    P.eyeX = T < 5.8 ? -0.8 : 0;
    P.eyes = T < 4.0 ? 'happy' : 'open';
    wvLive(T, P);
    drawWeathervane(P, T);
  } });
});

// ============ 11.96  Living room: "Don't watch the windows, darlings. Watch me." ============
shot(11.96, 'living_windows', (lt, dur, T) => {
  const turned = T > 13.05 && T < 15.3;
  const hypno = T > 16.4;
  const zIn = easeIn(seg(T, 16.6, 18.06));
  const cam = { x: lerp(1010, TV_SCREEN.x, zIn), y: lerp(560, TV_SCREEN.y, zIn), z: lerp(1.0, 3.7, zIn) };
  const fam = family({ look: turned ? 0 : -1, lookY: turned ? -1 : 0, eyes: hypno ? 'spiral' : null, mouth: turned ? 'o' : hypno ? 'flat' : 'smile', tilt: turned ? -0.08 : 0 });
  if (turned) { fam[0].look = -0.4; fam[1].look = -0.8; fam[2].look = -1; }
  drawLiving({
    cam, tvLight: hypno ? 0.6 : 0.3, tvGlow: hypno ? 1 : 0.5,
    skyOpts: { speck: kf(T, [[11.96, 0.4], [18.06, 1.0]]) },
    family: fam, dogWag: turned ? 0 : 10,
    portraitLook: turned ? 0.9 : -0.6,
    screen: (sw, sh) => tvHost(sw, sh, T, {
      cam: { x: 1330, y: 560, z: 1.6 + (hypno ? 0.6 * seg(T, 16.4, 18) : 0) },
      pose: {
        pointer: null,
        ar: T > 13.7 && T < 15.2 ? wagOsc(T, Object.assign({ hand: 'point' }, ARM.wag)) : Object.assign({ hand: 'open' }, ARM.rest),
        al: T > 15.25 ? Object.assign({ hand: 'point' }, ARM.chest) : ARM.rest,
        storm: hypno ? 0.8 : 0, brow: T > 13.7 && T < 15.2 ? -0.4 : 0.2,
      },
    }),
  });
});

// ============ 18.06  The ocean that slept / the oceans knew ============
function lighthouse(x, y, D) {
  paper((c) => pBlob(c, x, y + 40, 200, 70, 0.08, 4, 30), mix('#8a8f99', '#2a2d38', D), { d: 1.6, tex: 0.8 });
  paper((c) => { c.moveTo(x - 55, y); c.lineTo(x + 55, y); c.lineTo(x + 34, y - 330); c.lineTo(x - 34, y - 330); c.closePath(); }, '#fbf6ea', { d: 1.8, tex: 0.8 });
  for (let i = 0; i < 3; i++) paper((c) => { const y0 = y - 40 - i * 100; c.moveTo(x - 52 + i * 6, y0); c.lineTo(x + 52 - i * 6, y0); c.lineTo(x + 47 - i * 6, y0 - 45); c.lineTo(x - 47 + i * 6, y0 - 45); c.closePath(); }, '#d9433a', { d: 0.4, tex: 0.6 });
  paper((c) => pRect(c, x - 44, y - 400, 88, 70), mix('#ffe9a0', '#ffd56a', D), { d: 1, tex: 0.4 });
  paper((c) => { c.moveTo(x - 56, y - 400); c.lineTo(x, y - 450); c.lineTo(x + 56, y - 400); c.closePath(); }, '#2b2420', { d: 1.2, tex: 0.5 });
}
function boat(x, y, rot, s = 1) {
  push(x, y, rot, s);
  paper((c) => { c.moveTo(-70, 0); c.lineTo(70, 0); c.lineTo(50, 34); c.lineTo(-50, 34); c.closePath(); }, '#c8433a', { d: 1.2, tex: 0.7 });
  line([[0, 0], [0, -140]], '#5a3a22', 5);
  paper((c) => { c.moveTo(4, -136); c.lineTo(70, -10); c.lineTo(4, -10); c.closePath(); }, '#fbf6ea', { d: 1.2, tex: 0.6 });
  paper((c) => { c.moveTo(-4, -120); c.lineTo(-56, -10); c.lineTo(-4, -10); c.closePath(); }, '#f2d58a', { d: 1, tex: 0.6 });
  pop();
}
function waveLayer(i, y, t, col, o = {}) {
  const per = 180, amp = 20, ph = t * (0.9 + i * 0.12) * (i % 2 ? -1 : 1) * 40 + i * 50;
  paper((c) => {
    c.moveTo(-200, H + 300);
    c.lineTo(-200, y);
    for (let x = -200 - (ph % per); x < W + 300; x += per) {
      c.quadraticCurveTo(x + per * 0.25, y - amp * 2.2, x + per * 0.5, y - amp * 0.2);
      c.quadraticCurveTo(x + per * 0.6, y + amp * 0.6, x + per, y);
    }
    c.lineTo(W + 300, H + 300);
    c.closePath();
  }, col, { d: 1.6, tex: 0.7, edge: '#ffffff', edgeA: 0.45, edgeW: 3 });
  if (o.eyes) {
    for (let x = -200 - (ph % per), k = 0; x < W + 300; x += per, k++) {
      if ((k + i) % 3) continue;
      const ex = x + per * 0.3, ey = y + 30;
      if (ex < -50 || ex > W + 50) continue;
      if (o.eyes === 'sleep') {
        line([[ex - 22, ey], [ex - 14, ey + 5], [ex - 6, ey]], '#123a6a', 3.5);
        line([[ex + 6, ey], [ex + 14, ey + 5], [ex + 22, ey]], '#123a6a', 3.5);
      } else {
        const op = o.open ?? 1;
        for (const sx of [-14, 14]) {
          paper((c) => c.ellipse(ex + sx, ey, 11, 11 * op + 0.5, 0, 0, TAU), '#ffffff', { d: 0.4, tex: 0.3 });
          if (op > 0.3) { ctx.fillStyle = '#0d1a2e'; ctx.beginPath(); ctx.arc(ex + sx, ey + 2, 5, 0, TAU); ctx.fill(); }
        }
      }
    }
  }
}
shot(18.06, 'ocean', (lt, dur, T) => {
  const awake = seg(T, 25.86, 26.3);
  const rise = easeInOut(seg(T, 25.5, 26.98));
  const D = E.D + awake * 0.22;
  const hour = T < 23.74 ? 6 : T < 25.86 ? lerp(6, 7, easeOutElastic(seg(T, 23.74, 24.6))) : lerp(7, 8, easeOutElastic(seg(T, 25.86, 26.6)));
  const cam = { x: 960, y: 540 + kf(lt, [[0, 40], [3, 0]]), z: kf(lt, [[0, 1.12], [3, 1.0], [8.9, 1.06]]) };
  withCam(cam, 1, () => {
    paperBackdrop(mix('#2f66b8', '#16264a', D));
    // spotless cobalt sky with a sun on a stick
    sun(1450, 250, 72, { face: awake > 0.5 ? 'worried' : 'smile', stick: 1200 });
    cloud(560, 230, 280, 120, { seed: 2, face: awake > 0.5 ? 'stare' : 'sleep' });
    wire(250, -20, 250, 110);
    clockFace(250, 210, 95, hour, { numbers: true });
    lighthouse(1650, 640, D);
    const cols = ['#24599c', '#2f6fb8', '#3f86c6', '#5a9fd6', '#7cc0e6'];
    for (let i = 0; i < 5; i++) {
      const y = 560 + i * 92 - rise * (120 + i * 30);
      waveLayer(i, y, T, mix(cols[i], ['#0c1a33', '#10213e', '#142849', '#1a3156', '#213b63'][i], D), { eyes: i >= 2 ? (awake > 0 ? 'open' : 'sleep') : null, open: awake });
      if (i === 2) boat(780, y - 18 + Math.sin(T * 3) * 8, Math.sin(T * 2.2) * (0.08 + rise * 0.3), 1);
    }
    // pier with a little TV announcing the flood
    paper((c) => pRect(c, -40, 700 - rise * 60, 520, 26), '#8a5a36', { d: 1.6, tex: 0.8 });
    for (const px of [40, 200, 360]) paper((c) => pRect(c, px, 720 - rise * 60, 22, 400), '#6e4528', { d: 1.2, tex: 0.8 });
    const announced = T > 24.62;
    tvSet(300, 690 - rise * 60, 230, { on: clamp((T - 23.74) / 0.3), screen: (sw, sh) => tvHost(sw, sh, T, { pose: { pointer: null, ar: Object.assign({ hand: 'point' }, ARM.wag), storm: announced ? 0.6 : 0 } }), antenna: true, legs: true });
    // "FLOOD WARNING" sign drops on strings
    const sy = lerp(-200, 330, easeOutBack(seg(T, 25.2, 25.7)));
    if (T > 25.2) {
      wire(780, -20, 780, sy); wire(1240, -20, 1240, sy);
      paper((c) => pRect(c, 690, sy, 640, 116), '#ffe46b', { d: 2, tex: 0.7 });
      ptext('FLOOD WARNING', 1010, sy + 84, '80px "Bebas Neue"', '#2b2420', { d: 0, tex: 0.4, ls: 6 });
    }
    if (awake < 0.5) {
      for (let k = 0; k < 3; k++) {
        const zt = (T * 0.8 + k * 0.33) % 1;
        ptext('z', 760 + k * 40 + zt * 60, 700 - zt * 160, `${30 + k * 10}px "Alfa Slab One"`, rgba('#ffffff', 1 - zt), { d: 0, tex: 0 });
      }
    }
  });
}, { trans: { type: 'static', dur: 0.4 } });

// ============ 26.98  "A cold front crossed the county line, then crossed the line of time" ============
function coldFront(x, y0, y1, t) {
  ctx.save();
  ctx.strokeStyle = '#2a64c8'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  if (E.shadows) { ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 5; }
  ctx.beginPath();
  for (let y = y0; y <= y1; y += 20) { const X = x + Math.sin(y * 0.01 + t * 2) * 30; y === y0 ? ctx.moveTo(X, y) : ctx.lineTo(X, y); }
  ctx.stroke();
  ctx.restore();
  for (let y = y0 + 40; y < y1; y += 110) {
    const X = x + Math.sin(y * 0.01 + t * 2) * 30;
    paper((c) => { c.moveTo(X + 4, y - 26); c.lineTo(X + 52, y); c.lineTo(X + 4, y + 26); c.closePath(); }, '#2a64c8', { d: 1, tex: 0.5 });
  }
}
shot(26.98, 'coldfront', (lt, dur, T) => {
  const D = E.D;
  const fx = T < 28.9 ? lerp(160, 1060, easeInOut(seg(T, 26.98, 28.9))) : lerp(1060, 1420, easeInOut(seg(T, 28.9, 30.4)));
  const camY = lerp(540, 1240, easeInOut(seg(T, 28.95, 29.6)));
  withCam({ x: 960, y: camY, z: 1 }, 1, () => {
    paperBackdrop(mix('#86bcdc', '#14284a', D));
    // the county (top-down map)
    paper((c) => pBlob(c, 960, 520, 1080, 420, 0.04, 3, 60), pc('mint'), { d: 1.2, tex: 0.9, edge: '#fff', edgeA: 0.5 });
    line([[200, 380], [520, 450], [700, 420], [1000, 560], [1400, 520], [1800, 600]], mix('#7cc0e6', '#2a4a7a', D), 16, { d: 0.4 });
    for (let i = 0; i < 9; i++) house(260 + i * 180 + (i % 2) * 40, 330 + (i % 3) * 230, 60, 46, { v: i, chimney: false });
    for (let i = 0; i < 7; i++) tree(330 + i * 230, 470 + (i % 2) * 260, 0.45, { v: i, pine: i % 2 });
    line([[960, 90], [960, 960]], '#ffffff', 6, { dash: [24, 18] });
    ribbon(960, 140, 360, 'COUNTY LINE', { h: 56, font: '40px "Bebas Neue"', ls: 4, color: '#c8433a' });
    // the line of time, below
    paper((c) => pRect(c, -200, 1110, W + 400, 300), '#f6efdc', { d: 2, tex: 0.8 });
    for (let x = -200; x < W + 200; x += 40) line([[x, 1110], [x, 1110 + (x % 200 === 0 ? 60 : 30)]], '#2b2420', 3);
    const labels = [[300, 'YESTERDAY'], [960, 'NOW'], [1500, 'TOMORROW']];
    for (const [lx, txt] of labels) ptext(txt, lx, 1250, '64px "Bebas Neue"', txt === 'TOMORROW' ? '#14855e' : '#2b2420', { d: 0.6, tex: 0.4, ls: 6 });
    for (const [i, cx] of [[0, 520], [1, 1220], [2, 1760]].map(([i, x]) => [i, x])) {
      const passed = fx > cx - 100;
      const spin = passed ? (T - 29.7) * (i % 2 ? -9 : 12) : 0;
      clockFace(cx, 1330, 70, 9 + spin, { numbers: false });
    }
    coldFront(fx, -100, 1500, T);
    if (T > 29.6) {
      const k = seg(T, 30.0, 30.45);
      ctx.save(); ctx.globalAlpha = 0.35 * pulse(T, 30.1, 0.4); ctx.fillStyle = '#ffffff'; ctx.fillRect(-200, 900, W + 400, 700); ctx.restore();
      if (k > 0) ptext('?', 1300, 1080, '120px "Alfa Slab One"', rgba('#14855e', k), { d: 1, tex: 0.3 });
    }
  });
});

// ============ 30.54  "In traffic: every highway bows beneath my silver pin." ============
const ROADS = [
  [[-100, 300], [400, 330], [900, 280], [1400, 340], [2050, 300]],
  [[-100, 780], [500, 760], [1000, 820], [1500, 770], [2050, 800]],
  [[420, -100], [460, 400], [400, 700], [450, 1200]],
  [[1450, -100], [1500, 400], [1430, 700], [1480, 1200]],
  [[-100, 1100], [600, 520], [1300, 560], [2050, -60]],
];
function bentRoad(pts, bow, swirl, cx, cy) {
  // densify and pull toward / swirl around the pin
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 12; k++) {
    const u = k / 12;
    let x = lerp(pts[i][0], pts[i + 1][0], u), y = lerp(pts[i][1], pts[i + 1][1], u);
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) + 1;
    const pull = bow * 260 * Math.exp(-d / 650);
    x -= (dx / d) * pull; y -= (dy / d) * pull;
    const a = swirl * 2.4 * Math.exp(-d / 500);
    const ca = Math.cos(a), sa = Math.sin(a);
    out.push([cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function pathPoint(poly, u) {
  let L = 0; const seg = [];
  for (let i = 0; i < poly.length - 1; i++) { const l = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]); seg.push(l); L += l; }
  let d = ((u % 1) + 1) % 1 * L;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) { const k = d / seg[i]; return [lerp(poly[i][0], poly[i + 1][0], k), lerp(poly[i][1], poly[i + 1][1], k), Math.atan2(poly[i + 1][1] - poly[i][1], poly[i + 1][0] - poly[i][0])]; }
    d -= seg[i];
  }
  const n = poly.length - 1; return [poly[n][0], poly[n][1], 0];
}
shot(30.54, 'highway', (lt, dur, T) => {
  const D = E.D;
  const bow = easeInOut(seg(T, 31.6, 32.6)) * 0.6 + easeOutBack(seg(T, 33.68, 34.0)) * 0.5;
  const swirl = easeOut(seg(T, 33.68, 34.1)) * 0.9;
  const cx = 960, cy = 540;
  const shake = T > 33.68 && T < 34.0 ? Math.sin(T * 90) * 10 * (1 - (T - 33.68) / 0.32) : 0;
  withCam({ x: 960 + shake, y: 540, z: kf(T, [[30.54, 1.15], [33.6, 1.0]]) }, 1, () => {
    paperBackdrop(mix('#cfe6c0', '#1a3328', D));
    for (let i = 0; i < 8; i++) paper((c) => pBlob(c, hash2(i, 1) * W, hash2(i, 2) * H, 120 + hash2(i, 3) * 80, 80 + hash2(i, 4) * 60, 0.08, i), mix('#b5d8a0', '#163024', D), { d: 0.4, tex: 0.6 });
    ROADS.forEach((r, ri) => {
      const poly = bentRoad(r, bow, swirl, cx, cy);
      line(poly, mix('#5b5f68', '#20232a', D), 54, { d: 1.2 });
      line(poly, mix('#f6efdc', '#9aa1ad', D), 3, { dash: [26, 22] });
      for (let k = 0; k < 4; k++) {
        const u = (T * 0.09 * (ri % 2 ? 1 : -1) + k / 4 + ri * 0.13);
        const [x, y, a] = pathPoint(poly, u);
        push(x, y, a + (ri % 2 ? 0 : Math.PI));
        paper((c) => pRRect(c, -26, -14, 52, 28, 8), ['#e2574c', '#f2b84b', '#4f8fc0', '#6cae75'][(k + ri) % 4], { d: 0.9, tex: 0.5 });
        paper((c) => pRRect(c, -8, -11, 18, 22, 4), '#cfe8f5', { d: 0, tex: 0.3 });
        pop();
      }
    });
    // the silver pin descends
    const drop = seg(T, 32.7, 33.68);
    if (T < 33.68) {
      const sh = drop * drop;
      ctx.save(); ctx.globalAlpha = 0.15 + 0.4 * sh; ctx.fillStyle = '#0a0a10';
      ctx.beginPath(); ctx.ellipse(cx + 30, cy + 30, 160 - 90 * sh, 60 - 30 * sh, 0, 0, TAU); ctx.fill(); ctx.restore();
      if (drop > 0) pushpin(cx, lerp(-420, cy - 120, drop * drop), 2.4, 0);
    } else {
      const age = T - 33.68;
      for (let k = 0; k < 2; k++) {
        const r = 120 + (age - k * 0.12) * 1400;
        if (r > 120 && age - k * 0.12 < 0.5) { ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - (age - k * 0.12) / 0.5)})`; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.restore(); }
      }
      pinTop(cx, cy, 120);
    }
  });
});

// ============ 34.10  "Will it turn? Will it strike? Will the sirens come too late?" ============
function sirenTower(x, y, on, t) {
  line([[x, y], [x, y - 420]], '#5a5f68', 14, { d: 1.2 });
  line([[x - 60, y], [x, y - 300]], '#5a5f68', 6); line([[x + 60, y], [x, y - 300]], '#5a5f68', 6);
  paper((c) => { c.moveTo(x - 20, y - 470); c.lineTo(x + 60, y - 500); c.lineTo(x + 60, y - 400); c.lineTo(x - 20, y - 430); c.closePath(); }, '#8a8f99', { d: 1.2, tex: 0.6 });
  paper((c) => pBlob(c, x - 10, y - 470, 22, 22, 0, 3), on ? '#ff3b2e' : '#8a2a24', { d: 1, tex: 0.3 });
  if (on) {
    const a = t * 9;
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ff5a40';
    ctx.beginPath(); ctx.moveTo(x - 10, y - 470); ctx.arc(x - 10, y - 470, 520, a, a + 0.22); ctx.closePath(); ctx.fill();
    ctx.restore();
    for (let k = 0; k < 3; k++) { const r = 60 + ((t * 120 + k * 40) % 120); ctx.save(); ctx.strokeStyle = `rgba(255,240,220,${0.7 - r / 200})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + 60, y - 450, r, -0.6, 0.6); ctx.stroke(); ctx.restore(); }
  }
}
function townStreet(T, o = {}) {
  const D = E.D;
  paperBackdrop(mix('#9cc4d6', '#1a2340', D));
  // incoming weather
  cloud(300, 180, 420, 150, { seed: 4, color: mix('#d6dde6', '#3e4558', D), shade: mix('#b9c2ce', '#2a3040', D) });
  cloud(1400, 140, 520, 170, { seed: 6, color: mix('#cfd6e0', '#3a4152', D), shade: mix('#aeb8c6', '#272c3a', D) });
  tornado(1720, 560, 60, 230, T, {});
  hills(640, mix('#a9cf8a', '#1d3b31', D), 26, 2.4);
  for (let i = 0; i < 7; i++) house(130 + i * 270, 700 + (i % 2) * 20, 180, 140, { v: i + 1, s: 0.95 });
  // the rooftop weathervane on the house at 2
  const spin = T < 34.62 ? 0 : (T - 34.62) * 14 * Math.exp(-(T - 34.62) * 0.8);
  wvEmblem(670, 495, 2.2, spin, { d: 1.2 });
  sirenTower(1630, 780, T > 36.12, T);
  hills(800, mix('#8cc070', '#163026', D), 18, 5.1);
  if (o.bolt) {
    const k = o.bolt;
    if (k > 0 && k < 1) { ctx.save(); ctx.globalAlpha = 0.5 * (1 - k); ctx.fillStyle = '#fffbe0'; ctx.fillRect(-200, -200, W + 400, H + 400); ctx.restore(); }
    if (k > 0 && k < 1.5) bolt(420, 380, 1.6, 0.1);
  }
}
const TOWNSFOLK = [
  { x: 330, v: 0, style: 'man', hat: '#5a4a3a', shirt: '#4f8fc0' },
  { x: 760, v: 3, style: 'woman', shirt: '#e98aa0', hair: '#c9893a' },
  { x: 1170, v: 1, style: 'child', shirt: '#f2b84b', hat: '#6cae75' },
  { x: 1560, v: 2, style: 'man', shirt: '#6cae75', hair: '#1c1c1c' },
];
shot(34.1, 'town_willit', (lt, dur, T) => {
  withCam({ x: 960, y: 540, z: kf(lt, [[0, 1.0], [3.86, 1.08]]) }, 1, () => {
    townStreet(T, { bolt: T > 35.46 ? (T - 35.46) / 0.5 : 0 });
    const qs = [34.1, 35.2, 36.12];
    TOWNSFOLK.forEach((p, i) => {
      person(p.x, 1120, 2.4, Object.assign({}, p, { lookY: -1, look: (i - 1.5) * 0.3, mouth: T > 36.1 ? 'o' : 'worried', armL: 0.3, armR: 0.3 }));
      const qt = qs[i % 3] + (i === 3 ? 0.4 : 0);
      if (T > qt) thoughtBubble(p.x + 110, 560 - easeOut(seg(T, qt, qt + 0.6)) * 30, 1.0 * easeOutBack(seg(T, qt, qt + 0.35)), '?');
    });
  });
});

// ============ 37.96  "Your lovely little 'what ifs'…" (bubbles rise) ============
shot(37.96, 'whatifs', (lt, dur, T) => {
  const up = easeInOut(seg(T, 37.96, 39.48));
  withCam({ x: 960, y: lerp(540, 120, up), z: 1.08 }, 1, () => {
    townStreet(T);
    TOWNSFOLK.forEach((p, i) => {
      person(p.x, 1120, 2.4, Object.assign({}, p, { lookY: -1, look: (i - 1.5) * 0.3, mouth: 'smile', armL: 0.3, armR: 0.3, eyes: null }));
      const rise = easeIn(seg(T, 37.96 + i * 0.12, 39.48)) * 820;
      thoughtBubble(p.x + 110 + Math.sin(T * 2 + i) * 20, 520 - rise, 1.25, 'what if…?', { tail: rise < 40, seed: i + 2 });
    });
    for (let k = 0; k < 6; k++) {
      const rise = easeIn(seg(T, 38.2 + k * 0.1, 39.48)) * 900;
      thoughtBubble(200 + k * 300, 300 - rise + (k % 2) * 80, 0.5, '?', { tail: false, seed: k + 7 });
    }
  });
});

// ============ 39.48  "…make a banquet out of fate." ============
function cloche(x, y, s, lift) {
  push(x, y, lift * 0.35, s);
  paper((c) => { c.moveTo(-150, 0); c.quadraticCurveTo(-150, -150, 0, -150); c.quadraticCurveTo(150, -150, 150, 0); c.closePath(); }, '#cfd4dc', { d: 2, tex: 0.2, edge: '#fff', edgeA: 0.9 });
  ctx.save(); const g = ctx.createLinearGradient(-150, -150, 150, 0); g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(120,128,140,0.4)'); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-150, 0); ctx.quadraticCurveTo(-150, -150, 0, -150); ctx.quadraticCurveTo(150, -150, 150, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  splitPin(0, -160, 16, 'silver');
  pop();
}
function forkProp() { line([[0, 20], [0, 150]], '#cfd4dc', 7, { d: 0.6 }); for (const dx of [-9, -3, 3, 9]) line([[dx, 150], [dx, 190]], '#cfd4dc', 3.5); }
function knifeProp() { line([[0, 20], [0, 110]], '#cfd4dc', 8, { d: 0.6 }); paper((c) => { c.moveTo(-5, 110); c.lineTo(9, 110); c.quadraticCurveTo(12, 170, -5, 200); c.closePath(); }, '#e9ecf1', { d: 0.6, tex: 0.1 }); }
shot(39.48, 'banquet', (lt, dur, T) => {
  const D = E.D;
  withCam({ x: 960, y: 540, z: kf(lt, [[0, 1.0], [1.6, 1.08]]) }, 1, () => {
    paperBackdrop(mix('#1f6b52', '#0b2a22', D));
    for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) paper((c) => pStar(c, 100 + i * 220 + (j % 2) * 110, 80 + j * 200, 30, 12, 4, 0), mix('#2a8065', '#103a2e', D), { d: 0.2, tex: 0.4 });
    // candles
    for (const cx of [380, 1540]) {
      paper((c) => pRect(c, cx - 14, 560, 28, 180), '#fbf6ea', { d: 1, tex: 0.6 });
      paper((c) => pBlob(c, cx, 540 + Math.sin(T * 9 + cx) * 3, 12, 22, 0.1, 3), '#ffcf5a', { d: 0, tex: 0 });
    }
    const P = wvPose({ x: 960, y: 1530, s: 1.25, napkin: true, pointer: null, eyeX: 0 });
    const spear = seg(T, 40.4, 40.7);
    P.al = Object.assign({ hand: 'fist' }, ARM.fork, { el: ARM.fork.el - spear * 0.5 });
    P.ar = Object.assign({ hand: 'fist' }, ARM.fork);
    P.hold = { l: forkProp, r: knifeProp };
    P.eyes = T > 39.8 && T < 40.4 ? 'happy' : 'open';
    P.grin = 0.25;
    wvLive(T, P, { bounce: 4 });
    drawWeathervane(P, T);
    // table
    paper((c) => pRect(c, -100, 870, W + 200, 400), '#fbf8f0', { d: 2.6, tex: 0.8 });
    for (let i = 0; i < 20; i++) line([[i * 100, 880], [i * 100 + 40, 1080]], 'rgba(200,190,170,0.35)', 2);
    paper((c) => pBlob(c, 960, 950, 300, 60, 0.01, 3, 48), '#e9ecf1', { d: 1.6, tex: 0.3 });
    paper((c) => pBlob(c, 960, 946, 230, 42, 0.01, 4, 48), '#ffffff', { d: 0.4, tex: 0.3 });
    const lift = easeOutBack(seg(T, 39.75, 40.15));
    for (let k = 0; k < 7; k++) {
      if (lift < 0.2) break;
      const bx = 860 + (k % 4) * 66 + (k > 3 ? 33 : 0), by = 920 - (k > 3 ? 46 : 0);
      if (k === 3 && T > 40.55) continue;
      thoughtBubble(bx, by, 0.36, '?', { tail: false, seed: k + 3 });
    }
    cloche(960 + lift * 520, 950 - lift * 90, 1, lift);
  });
});

// ============ 41.08  "The pressure climbs" ============
shot(41.08, 'pressure', (lt, dur, T) => {
  const D = E.D;
  paperBackdrop(mix('#efd9b6', '#1a1f2c', D));
  sunburst(960, 560, 1400, 30, T * 0.2, mix('#f3c27a', '#2a3150', D), mix('#efd09a', '#1a2038', D));
  const cx = 960, cy = 600, R = 380;
  paper((c) => pBlob(c, cx, cy, R + 40, R + 40, 0.005, 2, 60), '#b38a3e', { d: 3, tex: 0.6, edge: '#ffe9a8', edgeA: 0.8, edgeW: 5 });
  paper((c) => pBlob(c, cx, cy, R, R, 0.005, 3, 60), '#fbf6ea', { d: 0.6, tex: 0.7 });
  const zones = [['#6cae75', 'CALM'], ['#f2b84b', 'TENSE'], ['#e2574c', 'PRESSURE!']];
  zones.forEach(([col, lab], i) => {
    const a0 = Math.PI * 0.8 + i * (Math.PI * 1.4 / 3), a1 = a0 + Math.PI * 1.4 / 3;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 60; ctx.beginPath(); ctx.arc(cx, cy, R - 70, a0, a1); ctx.stroke(); ctx.restore();
    const am = (a0 + a1) / 2;
    ptext(lab, cx + Math.cos(am) * (R - 170), cy + Math.sin(am) * (R - 170) + 14, '44px "Bebas Neue"', '#2b2420', { d: 0, tex: 0.3, ls: 3 });
  });
  for (let i = 0; i <= 28; i++) { const a = Math.PI * 0.8 + (i / 28) * Math.PI * 1.4; line([[cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30)], [cx + Math.cos(a) * (R - (i % 4 ? 50 : 66)), cy + Math.sin(a) * (R - (i % 4 ? 50 : 66))]], '#2b2420', i % 4 ? 3 : 5); }
  const u = easeIn(seg(T, 41.1, 42.5));
  const a = Math.PI * 0.85 + u * Math.PI * 1.3 + (u > 0.9 ? Math.sin(T * 70) * 0.04 : 0);
  push(cx, cy, a + Math.PI / 2);
  paper((c) => { c.moveTo(-10, 0); c.lineTo(0, -(R - 60)); c.lineTo(10, 0); c.lineTo(0, 40); c.closePath(); }, '#2b2420', { d: 1.6, tex: 0.3 });
  pop();
  splitPin(cx, cy, 26);
  ptext('ATMOSPHERIC', cx, cy + 190, '54px "Limelight"', '#14855e', { d: 0.5, tex: 0.3 });
});

// ============ 42.60  "camera three" ============
function studioCamera(x, y, s, rot, tally) {
  push(x, y, 0, s);
  line([[0, 0], [-120, 420]], '#2b2b30', 14, { d: 1.2 }); line([[0, 0], [120, 420]], '#2b2b30', 14, { d: 1.2 }); line([[0, 0], [0, 430]], '#2b2b30', 12, { d: 1.2 });
  push(0, -20, rot);
  paper((c) => pRRect(c, -230, -170, 400, 250, 26), '#4a4f59', { d: 2.4, tex: 0.6, edge: '#fff', edgeA: 0.2 });
  paper((c) => pRRect(c, -200, -140, 120, 80, 10), '#2e3138', { d: 0.4, tex: 0.4 });
  ptext('3', 60, 20, '200px "Alfa Slab One"', '#f6efdc', { d: 1, tex: 0.3 });
  // lens turret
  paper((c) => pBlob(c, 210, -45, 80, 80, 0.01, 2, 40), '#2b2b30', { d: 1.6, tex: 0.4 });
  for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; paper((c) => pBlob(c, 210 + Math.cos(a) * 44, -45 + Math.sin(a) * 44, 26, 26, 0, k), '#1a1b20', { d: 1, tex: 0.2 }); ctx.fillStyle = 'rgba(160,200,255,0.4)'; ctx.beginPath(); ctx.arc(210 + Math.cos(a) * 44 - 6, -45 + Math.sin(a) * 44 - 6, 7, 0, TAU); ctx.fill(); }
  paper((c) => pRRect(c, -60, -230, 80, 60, 10), tally ? '#ff3b2e' : '#6a2a26', { d: 1.2, tex: 0.3 });
  if (tally) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,80,60,0.45)'; ctx.beginPath(); ctx.arc(-20, -200, 140, 0, TAU); ctx.fill(); ctx.restore(); }
  pop();
  pop();
}
shot(42.6, 'camera3', (lt, dur, T) => {
  const D = E.D;
  paperBackdrop(mix('#2a3346', '#121726', D));
  for (let k = 0; k < 3; k++) { ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.moveTo(300 + k * 600, -50); ctx.lineTo(100 + k * 600, 1100); ctx.lineTo(700 + k * 600, 1100); ctx.closePath(); ctx.fill(); ctx.restore(); }
  paper((c) => pRect(c, -100, 900, W + 200, 300), mix('#7d5233', '#1c120e', D), { d: 1.6, tex: 0.8 });
  const swing = easeOutBack(seg(T, 42.6, 43.0));
  studioCamera(lerp(700, 900, swing), 560, 1.25, lerp(-0.35, 0.05, swing), T > 42.84);
});

// ============ 43.68  "give me a perfect smile" ============
shot(43.68, 'perfect_smile', (lt, dur, T) => {
  const z = kf(T, [[43.68, 1.0], [45.82, 1.25]]);
  drawStudio({ cam: { x: 960, y: 300, z: 2.1 * z }, map: false, lights: false, actors: () => {
    const P = wvPose({ x: 960, y: 1060, s: 0.8, pointer: null });
    P.grin = easeInOut(seg(T, 44.3, 44.95));
    P.al = ARM.rest; P.ar = ARM.rest;
    P.storm = pulse(T, 45.15, 0.55);
    P.brow = 0.3 - P.grin * 0.9;
    wvLive(T, P, { bounce: 3 });
    if (T > 44.85) P.mouth = 0;
    drawWeathervane(P, T);
    // dental gleam
    const g = pulse(T, 44.95, 0.4);
    if (g > 0) {
      const hx = 960 + 30, hy = 1060 - (470 + 340 + 1.32 * 52) * 0.8;
      ctx.save(); ctx.globalAlpha = g; paper((c) => pStar(c, hx, hy, 46 * g, 6, 4, 0.2), '#ffffff', { d: 0, tex: 0 }); ctx.restore();
    }
  } });
});

// ============ 45.82  odds climbing → 100% ============
shot(45.82, 'countdown', (lt, dur, T) => {
  const D = E.D;
  paperBackdrop(mix('#14855e', '#0b2a22', D));
  sunburst(960, 560, 1500, 32, T * (1 + seg(T, 45.8, 48.5) * 5), mix('#1f9a6e', '#0f3a2e', D), mix('#14855e', '#0b2a22', D));
  const u = seg(T, 45.9, 48.35);
  const n = Math.min(100, Math.floor(100 * Math.pow(u, 1.6)));
  ribbon(960, 260, 760, 'CHANCE OF…', { h: 96, font: '66px "Limelight"' });
  const bump = beatPulse(T, 10);
  push(960, 600, 0, 1 + bump * 0.05);
  flipNumber(0, 0, `${n}%`, 300, { card: '#22262c', ink: n >= 100 ? '#ffe46b' : '#fff3d6' });
  pop();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + T;
    paper((c) => pStar(c, 960 + Math.cos(a) * 640, 600 + Math.sin(a) * 340, 26, 9, 4, a), '#ffe9a8', { d: 0.6, tex: 0.3 });
  }
}, { cap: false });
