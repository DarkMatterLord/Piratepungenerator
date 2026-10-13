'use strict';
// Section D — Chorus 3 (the Forever Forecast over town), Outro, Final Flourish (204.3 – 272 s)

// ---------- the town under the crayon sky ----------
function cosmicTown(T, o = {}) {
  voidBackdrop(T, { stars: 80 });
  crayonStorm(960, o.pinY ?? 300, 1350, T, { n: 80, w: 7, spin: o.spin ?? 0.9, alpha: 0.85 });
  pinTop(960, o.pinY ?? 300, 58);
  if (o.giant) o.giant();
  hills(780, '#13261f', 40, 1.3);
  for (let i = 0; i < 7; i++) {
    const lift = o.lift ? o.lift * (90 + ((i * 37) % 5) * 40) : 0;
    const x = 130 + i * 275, y = 830 - lift + (o.lift ? Math.sin(T * 2 + i) * 10 * o.lift : 0);
    if (o.lift) wire(x, -40, x, y - 230);
    house(x, y, 190, 150, { v: i, rot: o.lift ? Math.sin(T * 1.5 + i) * 0.08 * o.lift : 0, lit: true, tvGlow: 0.6 + 0.4 * Math.sin(T * 5 + i) });
  }
  hills(900, '#0d1c17', 24, 4.4);
  if (o.front) o.front();
}
function giantHost(T, x, y, s, o = {}) {
  ctx.save(); ctx.globalAlpha = o.alpha ?? 0.92;
  const P = wvPose(Object.assign({ x, y, s, pointer: null, grin: 0.75, storm: 1, pale: 0.35 }, o.pose || {}));
  wvLive(T, P, { bounce: o.bounce ?? 8 });
  drawWeathervane(P, T);
  ctx.restore();
}

// ============ 204.30  "A hundred percent chance of demise!" — over the whole town ============
shot(204.3, 'c3_100', (lt, dur, T) => {
  const tH = atWord('hundred', 204), tP = atWord('percent', 204), tC = atWord('chance', 204), tD = atWord('demise', 204);
  cosmicTown(T, {
    lift: easeInOut(seg(T, 204.4, 206.8)),
    giant: () => giantHost(T, 960, 1500 + (1 - easeOutBack(seg(T, 204.3, 205.0))) * 600, 1.25, { pose: { al: Object.assign({ hand: 'spread' }, ARM.wide), ar: Object.assign({ hand: 'spread' }, ARM.wide) } }),
    front: () => {
      for (let i = 0; i < 6; i++) {
        const u = ((T - 204.3) * 0.35 + i / 6) % 1;
        umbrella(lerp(-200, 2100, u), 900 - u * 700 + Math.sin(T * 3 + i) * 40, 0.9, T * 3 + i, ['#5a1f2a', '#2c3b5e', '#0e4b42', '#3b2c52', '#6c5a2a', '#5a1f2a'][i]);
      }
    },
  });
  const k1 = easeOutBack(seg(T, tH, tH + 0.3)), k2 = easeOutBack(seg(T, tP, tP + 0.3));
  if (k1 > 0) { push(760, 540, -0.05, lerp(2.2, 1, k1)); ptext('100', 14, 16, '400px "Alfa Slab One"', '#05110c', { d: 0, tex: 0.4 }); ptext('100', 0, 0, '400px "Alfa Slab One"', '#e0c070', { d: 2.4, tex: 0.5 }); pop(); }
  if (k2 > 0) { push(1270, lerp(-200, 540, k2), 0.08); ptext('%', 14, 16, '370px "Alfa Slab One"', '#05110c', { d: 0, tex: 0.4 }); ptext('%', 0, 0, '370px "Alfa Slab One"', '#4fe0a8', { d: 2.4, tex: 0.5 }); pop(); }
  if (T > tC) ribbon(900, 690, lerp(80, 860, easeOutBack(seg(T, tC, tC + 0.35))), 'CHANCE OF', { h: 104, font: '72px "Limelight"', color: '#0e4b42', dark: '#07261f', ink: '#ffe9a8' });
  stamp('DEMISE!', 900, 890, seg(T, tD, tD + 0.25), { font: '140px "Bebas Neue"', ink: '#e0c070', bg: '#0e1a2e' });
  if (T < 204.6) { ctx.save(); ctx.globalAlpha = 1 - seg(T, 204.3, 204.6); ctx.fillStyle = '#fffbe9'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}, { cap: false, D: 1 });

// ============ 207.54  "With a silver-lined maybe in your eyes." — a whole town of glowing eyes ============
shot(207.54, 'c3_eyes', (lt, dur, T) => {
  const tM = atWord('maybe', 207.5);
  voidBackdrop(T, { stars: 40 });
  crayonStorm(960, 120, 1100, T, { n: 50, alpha: 0.6 });
  for (let i = 0; i < 4; i++) {
    const x = 240 + i * 480 + Math.sin(T * 0.8 + i) * 30;
    cloud(x, 230 + (i % 2) * 70, 420, 160, { seed: i + 2, color: '#3a4256', shade: '#262c3c', silver: 0.6 + 0.4 * Math.sin(T * 4 + i * 1.3) });
  }
  const flash = pulse(T, tM, 0.6);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) {
    const x = i * 230 + (r % 2) * 115 - 20, y = 760 + r * 150 + Math.sin(T * 3 + i + r) * 4;
    const shade = ['#24304d', '#1b2440', '#121a30'][r];
    person(x, y + 120, 2.2 - r * 0.2, { style: (i + r) % 3 ? 'man' : 'woman', shirt: shade, pants: shade, skin: ['#3a4560', '#2e3850', '#252d42'][r], hair: '#0d1220', eyes: 'tv', mouth: 'flat', lookY: -1, armL: 0.25, armR: 0.25, v: i });
  }
  if (flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = flash * 0.4; ctx.fillStyle = '#9ff3d0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}, { D: 1 });

function paperTornado(x, y, w, h, T) {
  // a funnel of torn-paper bands, wide at the top, whipping side to side
  const n = 12;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), rw = lerp(w, w * 0.12, Math.pow(u, 0.8)), ry = rw * 0.22;
    const cx = x + Math.sin(T * 5 + u * 5) * w * 0.12 * (0.4 + u), cy = y - h / 2 + u * h;
    paper((c) => { c.ellipse(cx, cy, rw, ry + 14, 0, 0, TAU); c.ellipse(cx, cy - 6, rw * 0.78, ry * 0.7, 0, 0, TAU); }, i % 2 ? '#d9d2c2' : '#f4efe4', { d: 1.6, tex: 0.8, rule: 'evenodd', edge: '#ffffff', edgeA: 0.5 });
  }
  for (let k = 0; k < 10; k++) {
    const a = T * 6 + k * 0.7, u = (k * 0.13 + T * 0.4) % 1;
    push(x + Math.cos(a) * w * (1.1 - u * 0.6), y - h / 2 + u * h, a, 1);
    paper((c) => pRect(c, -18, -6, 36, 12), ['#e2574c', '#f6efdc', '#4f8fc0'][k % 3], { d: 0.6, tex: 0.4 });
    pop();
  }
}

// ============ 211.32  pass / stay / and the morning gets yanked offstage ============
function crook(x, y, s = 1) {
  push(x, y, 0, s);
  line([[60, -60], [700, -1200]], '#3a2a1e', 22, { d: 1.6 });
  ctx.save(); ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 22; ctx.lineCap = 'round';
  if (E.shadows) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 6; }
  ctx.beginPath(); ctx.arc(0, 0, 70, -Math.PI * 0.25, Math.PI * 1.15, false); ctx.stroke(); ctx.restore();
  pop();
}
shot(211.32, 'c3_pass', (lt, dur, T) => {
  const tPass = atWord('pass', 211), tStay = atWord('stay', 212), tMorn = atWord('morning', 213), tYou = atWord('you', 214);
  const tx = T < tStay ? lerp(-300, 960, easeOut(seg(T, 211.3, tStay))) : 960 + Math.sin((T - tStay) * 4) * 30;
  const rise = easeOutBack(seg(T, tMorn - 0.2, tMorn + 0.4));
  const yank = easeIn(seg(T, tYou - 0.15, tYou + 0.25));
  const hookIn = easeOut(seg(T, tMorn + 0.1, tYou - 0.1));
  cosmicTown(T, { front: () => {
    paperTornado(tx, 620, 300, 640, T);
    const sx = 1500, sy = lerp(1000, 520, rise) + yank * 700 + (yank > 0 ? yank * 0 : 0);
    sun(sx + yank * 500, sy, 95, { face: 'worried', stick: 900, lookX: -1 });
    if (hookIn > 0) crook(lerp(2300, sx + 30, hookIn) + yank * 500, sy + 30 + yank * 0, 1);
    if (T > tPass && T < tStay + 0.2) ptext('?', tx + 180, 300, '110px "Alfa Slab One"', '#4fe0a8', { d: 1, tex: 0.4 });
  } });
}, { D: 1 });

// ============ 215.08  "Every forecast is a promise—I make heaven follow through." ============
shot(215.08, 'c3_conduct', (lt, dur, T) => {
  const tHeaven = atWord('heaven', 216.5), tThrough = atWord('through', 217);
  cosmicTown(T, { pinY: 260, spin: 1.4, giant: () => {
    const ph = beatPhase(T);
    const up = T > tHeaven - 0.1 && T < tThrough + 0.3;
    giantHost(T, 960, 1560, 1.15, { bounce: 12, pose: {
      pointer: 'l', pointerAng: up ? 0 : -0.5,
      al: Object.assign({ hand: 'fist' }, up ? ARM.up : { sh: 1.9 + Math.sin(ph * TAU) * 0.35, el: -0.4 + Math.cos(ph * TAU) * 0.3, wr: 0 }),
      ar: Object.assign({ hand: 'spread' }, up ? ARM.up : ARM.wide),
    } });
    for (let i = 0; i < 14; i++) {
      const a = T * 1.4 + (i / 14) * TAU, r = 380 + (i % 3) * 120;
      dropletWorld(960 + Math.cos(a) * r * 1.4, 260 + Math.sin(a) * r * 0.6, 1.3, i, T);
    }
  } });
  const bi = lastBeat(T);
  if (bi >= 0 && T - MV_DATA.beats[bi] < 0.18) { const x = 200 + hash2(bi, 3) * 1500; crayonLightning(x, -40, 760, 1.5 + (hash2(bi, 4) - 0.5) * 0.5, 4, 1, bi, '#fff4b8'); ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#dff6ff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}, { D: 1 });

// ============ 218.32  "Stay tuned, my dears…" — every set in the tornado tunes in ============
shot(218.32, 'c3_tvs', (lt, dur, T) => {
  cosmicTown(T, { pinY: 520, spin: 1.6, front: () => {
    for (let i = 0; i < 16; i++) {
      const a = T * 1.6 + (i / 16) * TAU, r = 300 + (i % 4) * 140;
      const x = 960 + Math.cos(a) * r * 1.5, y = 520 + Math.sin(a) * r * 0.55;
      const on = T > 218.4 + i * 0.18;
      miniTV(x, y, 150 + (i % 3) * 40, (sw, sh) => ctx.drawImage(faceSprite(['smile', 'grin', 'wink', 'storm'][i % 4]), 0, 0, sw, sh), { on, rot: a });
    }
  } });
}, { D: 1 });

// ============ 221.78  "I'm Mr. Weathervane, and the forecast never lies!" — the grand finale ============
function firework(x, y, t, col, seed) {
  if (t < 0 || t > 1.4) return;
  const n = 14, r = easeOut(clamp(t / 0.7)) * 260;
  ctx.save(); ctx.globalAlpha = 1 - clamp((t - 0.6) / 0.8);
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + seed; paper((c) => pStar(c, x + Math.cos(a) * r, y + Math.sin(a) * r + t * t * 60, 16, 6, 4, a), col, { d: 0.6, tex: 0.3 }); }
  ctx.restore();
}
shot(221.78, 'c3_finale', (lt, dur, T) => {
  const tW = atWord('weathervane', 222), tLies = atWord('lies', 228);
  const collapse = easeIn(seg(T, 232.2, 233.4));
  withCam({ x: 960, y: 540, z: 1 - collapse * 0.92, r: collapse * 3 }, 1, () => {
    voidBackdrop(T, { stars: 100 });
    sunburst(960, 560, 1800, 36, T * 0.5, '#0e3a30', '#08221c');
    crayonStorm(960, 560, 1200, T, { n: 60, w: 7, alpha: 0.55, spin: 1.2 });
    // the marquee in the sky, every bulb blazing
    const rise = easeOutBack(seg(T, 221.8, 222.5));
    push(0, lerp(-500, 0, rise));
    paper((c) => pRRect(c, 300, 40, 1320, 400, 40), '#e0b44c', { d: 3, tex: 0.7 });
    paper((c) => pRRect(c, 330, 70, 1260, 340, 26), '#0e3a30', { d: 0.6, tex: 0.7 });
    bulbRing(320, 60, 1280, 360, T * 1.5, 0);
    ptext('Mr. Weathervane', 968, 318, '200px "Yellowtail"', '#04140f', { d: 0, tex: 0.4 });
    ptext('Mr. Weathervane', 960, 310, '200px "Yellowtail"', '#ffe9a8', { d: 1.4, tex: 0.4 });
    ptext('THE FOREVER FORECAST', 960, 392, '44px "Bebas Neue"', '#4fe0a8', { d: 0, tex: 0.3, ls: 10 });
    pop();
    // fireworks on the brass hits
    const hits = [222.22, 223.47, 224.73, 225.98, 227.74, 228.64, 229.6, 230.5, 231.4];
    hits.forEach((h, i) => firework(200 + (i * 397) % 1520, 200 + (i * 173) % 400, T - h, ['#ffe9a8', '#4fe0a8', '#f2a65a', '#cfd4dc'][i % 4], i));
    // the host, arms raised, takes the final bow
    const bow = pulse(T, tW - 0.1, 0.9) + pulse(T, 230.2, 1.6);
    const P = wvPose({ x: 960, y: 1060, s: 0.62, pointer: null, lean: bow * 0.4, grin: 0.8, storm: 0.9, pale: 0.3 });
    P.al = Object.assign({ hand: 'spread' }, T > tLies - 0.2 && T < 230 ? ARM.up : ARM.wide);
    P.ar = Object.assign({ hand: 'spread' }, T > tLies - 0.2 && T < 230 ? ARM.up : ARM.wide);
    P.wink = T > tLies && T < tLies + 0.8 ? 1 : 0;
    wvLive(T, P, { bounce: 14 });
    drawWeathervane(P, T);
    confetti(T, 40, { colors: ['#ffe9a8', '#4fe0a8', '#e0c070', '#cfd4dc', '#0e3a30'] });
  });
  const f = pulse(T, tLies, 0.5);
  if (f > 0) { ctx.save(); ctx.globalAlpha = f * 0.6; ctx.fillStyle = '#fffbe9'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (collapse > 0.85) { ctx.save(); ctx.globalAlpha = (collapse - 0.85) / 0.15; ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H); ctx.restore(); pinTop(960, 540, 30); }
}, { D: 1 });

// ============ Outro: back to the friendly studio, as if nothing happened ============
function studioDamage() {
  // tape over the tear in the backdrop, a few crayon scribbles left behind
  for (const [x, y, r] of [[1180, 160, -0.6], [1210, 300, 0.5], [1170, 450, -0.4]]) { push(x, y, r); paper((c) => pRect(c, -90, -18, 180, 36), 'rgba(233,214,160,0.85)', { d: 0.6, tex: 0.6 }); pop(); }
  line([[1195, 90], [1180, 220], [1215, 360], [1190, 520]], '#3a2a2a', 4);
}
function outroStudio(T, cam, extra = {}) {
  drawStudio({
    cam, map: { icons: [{ k: 'sun', u: 0.3, v: 0.45, t0: 0, face: 'smile' }, { k: 'sun', u: 0.55, v: 0.6, t0: 0, face: extra.sunFace || 'smile' }, { k: 'cloud', u: 0.75, v: 0.4, t0: 0, face: 'smile' }], T, title: extra.title },
    lights: false,
    actors: () => {
      studioDamage();
      const P = wvPose(Object.assign({ x: 1380, y: 1050, s: 0.78, pointer: null }, extra.pose || {}));
      if (extra.poseFn) extra.poseFn(P);
      wvLive(T, P, { bounce: 4 });
      drawWeathervane(P, T);
      if (extra.afterHost) extra.afterHost();
    },
    desk: { x: 1380, y: 1080, w: 820 },
  });
  if (extra.overDesk) withCam(cam, 1, extra.overDesk);
}
function rosette(x, y, k) {
  push(x, y, 0, k);
  for (const sd of [-1, 1]) paper((c) => { c.moveTo(sd * 10, 30); c.lineTo(sd * 50, 170); c.lineTo(sd * 25, 150); c.lineTo(sd * 5, 175); c.lineTo(sd * -8, 40); c.closePath(); }, '#c8433a', { d: 1.2, tex: 0.6 });
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; paper((c) => pBlob(c, Math.cos(a) * 62, Math.sin(a) * 62, 22, 22, 0, i), '#e0b44c', { d: 0.8, tex: 0.5 }); }
  paper((c) => pBlob(c, 0, 0, 64, 64, 0, 2), '#14855e', { d: 1.4, tex: 0.6 });
  ptext('SURVIVOR', 0, 10, '30px "Bebas Neue"', '#ffe9a8', { d: 0, tex: 0.3, ls: 2 });
  pop();
}
shot(233.3, 'out_survived', (lt, dur, T) => {
  const tCong = atWord('congratulations', 235), tSurv = atWord('survived', 236);
  const clapping = T > tCong - 0.1 && T < tSurv + 0.4;
  outroStudio(T, { x: 1300, y: 560, z: 1.55 }, {
    poseFn: (P) => {
      const c = clapping ? Math.abs(Math.sin(T * 14)) : 0;
      P.al = { sh: 0.62, el: -1.95 - c * 0.35, wr: 0.2, hand: 'open' };
      P.ar = { sh: 0.62, el: -1.95 - c * 0.35, wr: 0.2, hand: 'open' };
      P.eyes = T > tCong && T < tSurv ? 'happy' : 'open';
    },
    overDesk: () => { const k = easeOutBack(seg(T, tSurv, tSurv + 0.4)); if (k > 0) rosette(1700, 720, k * 1.15); },
  });
}, { trans: { type: 'flash', dur: 0.5 }, D: 0.15 });
shot(237.56, 'out_pending', (lt, dur, T) => {
  const tPend = atWord('pending', 238), tAsk = atWord('ask', 239.5);
  const pan = easeInOut(seg(T, tAsk - 0.4, tAsk + 0.2));
  const cam = { x: lerp(640, 1300, pan), y: lerp(520, 560, pan), z: lerp(1.35, 1.55, pan) };
  outroStudio(T, cam, {
    sunFace: 'worried',
    poseFn: (P) => { P.ar = Object.assign({ hand: 'open' }, T > tAsk - 0.2 ? ARM.ear : ARM.rest); P.al = { sh: 0.62, el: -1.95, wr: 0.2, hand: 'open' }; P.eyeX = T < tAsk ? -1 : 0; },
    afterHost: () => {
      const k = seg(T, tPend, tPend + 0.25);
      if (k > 0) stamp('PENDING', 150 + 0.55 * 980, 250 + 0.6 * 560 + 10, k, { font: '84px "Bebas Neue"', rot: -0.12 });
      // hourglass
      push(560, 330 + Math.sin(T * 2) * 6, Math.sin(T) * 0.1);
      paper((c) => { c.moveTo(-50, -80); c.lineTo(50, -80); c.lineTo(8, 0); c.lineTo(50, 80); c.lineTo(-50, 80); c.lineTo(-8, 0); c.closePath(); }, 'rgba(220,240,250,0.85)', { d: 1.4, tex: 0.3 });
      paper((c) => { c.moveTo(-30, 80); c.lineTo(30, 80); c.lineTo(0, 40); c.closePath(); c.moveTo(-34, -60); c.lineTo(34, -60); c.lineTo(5, -10); c.lineTo(-5, -10); c.closePath(); }, '#e0b44c', { d: 0, tex: 0.4 });
      paper((c) => { pRect(c, -62, -96, 124, 18); pRect(c, -62, 78, 124, 18); }, '#7d5233', { d: 1, tex: 0.6 });
      pop();
    },
  });
}, { D: 0.2 });
shot(241.76, 'out_hungry', (lt, dur, T) => {
  const tKeep = atWord('keep', 244), tHung = atWord('hungry', 249), tLife = atWord('life', 251);
  const z = kf(T, [[241.76, 1.4], [246.5, 1.65], [249.3, 2.3], [251.6, 3.6], [253.2, 4.2]]);
  const dim = seg(T, 248.5, 252.5);
  outroStudio(T, { x: kf(T, [[241.76, 1300], [249.3, 1380]]), y: kf(T, [[241.76, 560], [249.3, 420], [253.2, 345]]), z }, {
    pose: { napkin: T > 246.6 },
    poseFn: (P) => {
      P.wink = T > tKeep && T < tKeep + 0.9 ? 1 : 0;
      P.grin = seg(T, 248.8, tLife) * 0.9;
      P.storm = seg(T, tHung - 0.2, tHung + 0.4);
      P.pale = dim * 0.4;
      const eat = T > 246.6;
      P.al = Object.assign({ hand: eat ? 'fist' : 'open' }, eat ? ARM.fork : { sh: 0.62, el: -1.95, wr: 0.2 });
      P.ar = Object.assign({ hand: eat ? 'fist' : 'open' }, eat ? ARM.fork : { sh: 0.62, el: -1.95, wr: 0.2 });
      if (eat) P.hold = { l: forkProp, r: knifeProp };
      if (T > tLife + 0.3) P.mouth = 0;
    },
  });
  if (dim > 0) {
    ctx.save(); ctx.globalAlpha = dim * 0.75;
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 200, W / 2, H * 0.45, 1000);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,4,8,1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}, { D: (lt) => lerp(0.2, 0.55, seg(lt, 6.5, 11.4)) });

// ============ Final flourish: goodnight, everybody ============
function emptyFamily() {
  return family({ look: -1 }).map((p) => Object.assign(p, { cutout: 1 }));
}
function endCard(T) {
  paperBackdrop('#0e3a30');
  sunburst(W / 2, H / 2, 1300, 28, T * 0.4, '#14855e', '#0e3a30');
  bulbRing(220, 120, 1480, 840, T * 1.5, 0);
  ptext('Mr. Weathervane', W / 2 + 8, 418, '220px "Yellowtail"', '#04140f', { d: 0, tex: 0.4 });
  ptext('Mr. Weathervane', W / 2, 410, '220px "Yellowtail"', '#ffe9a8', { d: 1.6, tex: 0.4 });
  ptext('in', W / 2, 500, '54px "Playfair Display"', '#cfe8dc', { d: 0, tex: 0.3 });
  ptext('A HUNDRED PERCENT', W / 2, 610, '96px "Limelight"', '#fff6e0', { d: 1.2, tex: 0.4 });
  ptext('CHANCE OF DEMISE', W / 2, 715, '96px "Limelight"', '#fff6e0', { d: 1.2, tex: 0.4 });
  ribbon(W / 2, 845, 760, 'TUNE IN TOMORROW', { h: 96, font: '64px "Bebas Neue"', ls: 8 });
  wvEmblem(300, 560, 3.4, T * 2, { d: 1.4 });
  wvEmblem(1620, 560, 3.4, -T * 2, { d: 1.4 });
}
shot(253.18, 'fin_goodnight', (lt, dur, T) => {
  const tGood = atWord('goodnight', 255), tKeep = atWord('keep', 258.5);
  const k = easeIn(seg(T, 262.0, 265.6));
  const cam = { x: lerp(980, TV_SCREEN.x, k), y: lerp(560, TV_SCREEN.y, k), z: lerp(1.0, 3.75, k) };
  drawLiving({
    cam, family: emptyFamily(), dogWag: 0,
    sky: windowSkyDay, skyOpts: { storm: 1, dark: 0.6 },
    tvLight: 0.45, tvGlow: 1,
    portraitLook: -0.8, portraitGrin: 0.9, portraitStorm: 0.6,
    bubbles: () => { for (let i = 0; i < 3; i++) { const bx = [1120, 1345, 1560][i]; thoughtBubble(bx + Math.sin(T + i) * 10, 430 + Math.sin(T * 1.3 + i) * 12, 0.7, '?', { tail: false, seed: i + 2, color: '#e9e2cc' }); } },
    screen: (sw, sh) => {
      if (T > 262.8) { inScreen(sw, sh, () => endCard(T)); return; }
      tvHost(sw, sh, T, { cam: { x: 1300, y: 520, z: 1.7 }, pose: {
        pointer: null,
        ar: T > tGood - 0.2 && T < tKeep - 0.5 ? waveOsc(T, Object.assign({ hand: 'spread' }, ARM.wave)) : Object.assign({ hand: 'open' }, ARM.rest),
        al: ARM.rest, wink: T > tKeep + 0.6 && T < tKeep + 1.6 ? 1 : 0, grin: 0.5, storm: 0.3,
      } });
    },
  });
}, { D: 0.55 });
shot(266.0, 'fin_card', (lt, dur, T) => {
  endCard(T);
  scanlines(0.1, 4);
  // CRT switch-off on the last brass stab
  const off = seg(T, 270.0, 270.4);
  if (off > 0) {
    if (!E.melt) E.melt = makeCanvas(W, H);
    const g = E.melt.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(E.canvas, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const sy = Math.max(0.004, 1 - easeIn(clamp(off / 0.5))), sx = off < 0.5 ? 1 : Math.max(0.004, 1 - easeIn((off - 0.5) / 0.5));
    ctx.translate(W / 2, H / 2); ctx.scale(sx, sy);
    ctx.filter = `brightness(${1 + off * 3})`;
    ctx.drawImage(E.melt, -W / 2, -H / 2);
    ctx.restore();
  }
  if (T >= 270.4) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const dot = 1 - seg(T, 270.4, 271.2);
    if (dot > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; const gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 40 * dot + 4); gr.addColorStop(0, `rgba(230,255,240,${dot})`); gr.addColorStop(1, 'rgba(230,255,240,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // a grin lingers in the dark…
    const grin = pulse(T, 270.9, 0.9);
    if (grin > 0) {
      ctx.save(); ctx.globalAlpha = grin * 0.85;
      push(W / 2, H / 2 + 120, 0, 2.2);
      scaled(2.2, () => { const P = wvPose({ grin: 1, storm: 1 }); P.mouth = 0; ctx.save(); ctx.beginPath(); ctx.rect(-120, -200, 240, 230); ctx.clip(); wvEye(-25, -113, P, T, false); wvEye(25, -113, P, T, true); wvMouth(P); ctx.restore(); });
      pop();
      ctx.restore();
    }
  }
}, { cap: false, D: 0.6 });
