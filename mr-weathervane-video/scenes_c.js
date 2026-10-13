'use strict';
// Section C — Instrumental break (the Unspoken Outlook), Interlude, Bridge (131.3 – 204.3 s)

// ---------- cached face sprites (cheap faces for TV walls) ----------
const _faceCache = new Map();
function faceSprite(kind) {
  let c = _faceCache.get(kind);
  if (c) return c;
  c = makeCanvas(300, 300);
  const g = c.getContext('2d'), prev = ctx, prevSS = E.shadowScale;
  ctx = g; E.shadowScale = 1;
  g.fillStyle = kind === 'storm' ? '#0f2a24' : '#bfe0c8'; g.fillRect(0, 0, 300, 300);
  push(150, 300, 0, 1.25);
  scaled(1.25, () => {
    const P = wvPose({ x: 0, y: 0, s: 1, grin: kind === 'grin' || kind === 'storm' ? 0.9 : 0.25, storm: kind === 'storm' ? 1 : 0, eyes: kind === 'happy' ? 'happy' : 'open', wink: kind === 'wink' ? 1 : 0, pale: kind === 'storm' ? 0.5 : 0, stormT: 1.3 });
    P.mouth = kind === 'talk' ? 1 : 0;
    wvHead(P, 1.3);
  });
  pop();
  ctx = prev; E.shadowScale = prevSS;
  _faceCache.set(kind, c);
  return c;
}
// lightweight paper TV for walls: content(sw, sh) in screen coords
function miniTV(x, y, w, content, o = {}) {
  const h = w * 0.8, sw = w * 0.72, sh = h * 0.72;
  push(x, y, o.rot || 0);
  paper((c) => pRRect(c, -w / 2, -h / 2, w, h, w * 0.08), o.wood || '#6e4528', { d: 1.4, tex: 0.6 });
  paper((c) => pRRect(c, -w / 2 + w * 0.06, -h / 2 + h * 0.1, sw + w * 0.04, sh + h * 0.04, w * 0.07), '#e9dcc2', { d: 0.5, tex: 0.5 });
  ctx.save();
  ctx.beginPath(); pRRect(ctx, -w / 2 + w * 0.08, -h / 2 + h * 0.12, sw, sh, w * 0.06); ctx.clip();
  ctx.translate(-w / 2 + w * 0.08, -h / 2 + h * 0.12);
  if (o.on === false) { ctx.fillStyle = '#121615'; ctx.fillRect(0, 0, sw, sh); }
  else content(sw, sh);
  ctx.fillStyle = 'rgba(0,0,0,0.14)'; for (let yy = 0; yy < sh; yy += 3) ctx.fillRect(0, yy, sw, 1.1);
  ctx.restore();
  for (let k = 0; k < 2; k++) splitPin(w / 2 - w * 0.09, -h / 4 + k * h * 0.3, w * 0.035);
  pop();
}
function screenForecast(kind, sw, sh, T) {
  if (kind === 'face' || kind === 'grin' || kind === 'storm' || kind === 'wink') { ctx.drawImage(faceSprite(kind === 'face' ? 'smile' : kind), 0, 0, sw, sh); return; }
  const bg = { sun: '#a6d4e3', rain: '#5b6f8a', snow: '#d6e6f2', tornado: '#3a3f52', static: '#777', q: '#14855e' }[kind];
  ctx.fillStyle = bg; ctx.fillRect(0, 0, sw, sh);
  const s = sh / 200;
  if (kind === 'sun') sun(sw / 2, sh / 2, 46 * s, { face: 'smile' });
  else if (kind === 'rain') { cloud(sw / 2, sh * 0.4, 160 * s, 70 * s, { face: 'worried', seed: 2 }); }
  else if (kind === 'snow') snowflake(sw / 2, sh / 2, 50 * s, T);
  else if (kind === 'tornado') tornado(sw / 2, sh / 2, 50 * s, 150 * s, T);
  else if (kind === 'static') staticNoise(0, 0, sw, sh, 1, 1);
  else ptext('?', sw / 2, sh * 0.78, `${Math.round(150 * s)}px "Alfa Slab One"`, '#ffe9a8', { d: 0.5, tex: 0.3 });
}

// ---------- the void ----------
function voidBackdrop(T, o = {}) {
  paperBackdrop(o.color || '#070b18', { tex: 0.5 });
  for (let i = 0; i < 6; i++) {
    const x = hash2(i, 31) * W, y = hash2(i, 32) * H;
    ctx.save(); ctx.globalAlpha = 0.22;
    paper((c) => pBlob(c, x + Math.sin(T * 0.2 + i) * 40, y, 380 + hash2(i, 33) * 300, 200 + hash2(i, 34) * 160, 0.12, i, 40, i), ['#1b4d6b', '#0f5c46', '#2a2160', '#163a5a', '#0d4a3c', '#3a1f55'][i], { d: 0, tex: 0.6 });
    ctx.restore();
  }
  for (let i = 0; i < (o.stars ?? 120); i++) {
    const tw = 0.5 + 0.5 * Math.sin(T * 2.5 + i * 1.7);
    const x = (hash2(i, 41) * W * 1.2 - W * 0.1 + (o.drift || 0) * T * (0.3 + hash2(i, 44))) % (W * 1.2);
    paper((c) => pStar(c, x, hash2(i, 42) * H, 3 + hash2(i, 43) * 6 * tw, 1.2, 4, 0), rgba('#fff6d8', 0.5 + 0.5 * tw), { d: 0, tex: 0 });
  }
}
function dropletWorld(x, y, s, i, T) {
  push(x, y, Math.sin(T + i) * 0.2, s);
  paper((c) => { c.moveTo(0, -60); c.bezierCurveTo(14, -30, 36, -8, 36, 16); c.arc(0, 16, 36, 0, Math.PI); c.bezierCurveTo(-36, -8, -14, -30, 0, -60); c.closePath(); }, 'rgba(120,190,230,0.35)', { d: 0.8, tex: 0.2, edge: '#dff6ff', edgeA: 0.8, edgeW: 2.5 });
  const pc0 = ['#e2574c', '#4fa79a', '#f2b84b', '#4f8fc0', '#e98aa0', '#9a7ac2'][i % 6];
  paper((c) => c.arc(0, 16, 17, 0, TAU), pc0, { d: 0.4, tex: 0.5 });
  ctx.save(); ctx.strokeStyle = 'rgba(255,240,200,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 16, 27, 7, -0.3, 0, TAU); ctx.stroke(); ctx.restore();
  pop();
}
function crayonLightning(x, y, len, ang, depth, grow, seed, col) {
  if (depth <= 0 || grow <= 0) return;
  const n = 6, pts = [[x, y]];
  let cx = x, cy = y;
  const segL = len / n;
  for (let i = 1; i <= n; i++) {
    if (i / n > grow) break;
    const a = ang + (hash2(seed, i) - 0.5) * 1.1;
    cx += Math.cos(a) * segL; cy += Math.sin(a) * segL;
    pts.push([cx, cy]);
  }
  ctx.save(); ctx.strokeStyle = crayon(col); ctx.lineWidth = 3 + depth * 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); ctx.restore();
  if (pts.length > 3) {
    const [bx, by] = pts[Math.floor(pts.length / 2)];
    crayonLightning(bx, by, len * 0.6, ang - 0.6, depth - 1, (grow - 0.4) * 1.6, seed * 3 + 1, col);
    crayonLightning(cx, cy, len * 0.6, ang + 0.5, depth - 1, (grow - 0.7) * 2.2, seed * 7 + 2, col);
  }
}
function meltFx(k) {
  // tape-speed descent: the whole frame sags, smears and drains of colour
  if (k <= 0) return;
  if (!E.melt) E.melt = makeCanvas(W, H);
  const g = E.melt.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none';
  g.drawImage(E.canvas, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
  ctx.filter = `grayscale(${0.85 * k}) blur(${k * 3}px)`;
  const sy = 1 + k * 0.55;
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = i ? 0.35 : 1; ctx.drawImage(E.melt, 0, 0, W, H, i * 6 * k, (i * 18 - 0) * k, W, H * sy); }
  ctx.filter = 'none'; ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(5,6,10,${0.55 * k})`; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}


// ---------- the colossal weathervane (ornate rooster on a fletched arrow) ----------
function bigVane(spin, o = {}) {
  const sil = '#d3d8e0', lo = '#8a919d';
  const oo = { d: 1.4, tex: 0.25, edge: 'rgba(255,255,255,0.9)', edgeA: 0.7, edgeW: 0.25 };
  paper((c) => pRect(c, -1.6, -14, 3.2, 62), lo, oo);
  splitPin(0, 50, 4.5, 'silver');
  for (const [yy, ww] of [[30, 9], [38, 6]]) paper((c) => pRRect(c, -ww / 2, yy, ww, 3, 1.5), lo, oo);
  push(0, -16, 0, Math.cos(spin) * 1.2, 1.2);
  // fletched arrow
  paper((c) => {
    c.moveTo(-30, -1.3); c.lineTo(30, -1.3); c.lineTo(30, -7); c.lineTo(44, 0); c.lineTo(30, 7); c.lineTo(30, 1.3); c.lineTo(-30, 1.3);
    c.lineTo(-36, 9); c.lineTo(-44, 9); c.lineTo(-37, 1.3); c.lineTo(-37, -1.3); c.lineTo(-44, -9); c.lineTo(-36, -9); c.closePath();
  }, sil, oo);
  // rooster standing on the arrow, facing the arrowhead
  paper((c) => {
    c.moveTo(-9, -6);
    c.bezierCurveTo(-14, -14, -8, -22, 2, -21);
    c.bezierCurveTo(6, -24, 7, -29, 9, -32);
    c.bezierCurveTo(10, -36, 15, -37, 17, -33);
    c.lineTo(21, -32); c.lineTo(17, -30);
    c.bezierCurveTo(17, -27, 15, -25, 13, -23);
    c.bezierCurveTo(14, -18, 13, -10, 6, -6);
    c.closePath();
    // comb
    c.moveTo(10, -35); c.lineTo(10.5, -39); c.lineTo(12.5, -36.5); c.lineTo(14, -40); c.lineTo(15, -36.5); c.lineTo(17, -38.5); c.lineTo(16.5, -34); c.closePath();
    // wattle
    c.moveTo(16, -29.5); c.quadraticCurveTo(18, -26, 15.5, -25.5); c.closePath();
    // tail plumes
    c.moveTo(-8, -12); c.bezierCurveTo(-18, -16, -22, -30, -16, -40); c.bezierCurveTo(-15, -30, -10, -22, -4, -18); c.closePath();
    c.moveTo(-9, -10); c.bezierCurveTo(-22, -12, -28, -24, -26, -32); c.bezierCurveTo(-22, -24, -14, -18, -6, -15); c.closePath();
    c.moveTo(-9, -8); c.bezierCurveTo(-20, -6, -27, -12, -30, -18); c.bezierCurveTo(-22, -14, -14, -12, -7, -11); c.closePath();
  }, sil, oo);
  line([[-1, -6], [-2, -1.3]], lo, 1); line([[4, -6], [5, -1.3]], lo, 1);
  ctx.fillStyle = '#2b2f38'; ctx.beginPath(); ctx.arc(14.2, -32.5, 0.9, 0, TAU); ctx.fill();
  line([[-4, -14], [4, -16], [8, -12]], 'rgba(90,96,108,0.6)', 0.8);
  pop();
}

// ============ 131.26  through the tear: the crayon hurricane ============
shot(131.26, 'void_storm', (lt, dur, T) => {
  const z = kf(T, [[131.26, 2.6], [132.4, 1.0], [137.4, 1.25]]);
  withCam({ x: 960, y: 540, z, r: T * 0.05 }, 1, () => {
    voidBackdrop(T);
    crayonStorm(960, 540, 900, T, { n: 90, w: 7, spin: 1.1 });
    for (let i = 0; i < 18; i++) {
      const a = T * (0.5 + hash2(i, 51) * 0.6) + (i / 18) * TAU, r = 260 + hash2(i, 52) * 520;
      dropletWorld(960 + Math.cos(a) * r, 540 + Math.sin(a) * r * 0.75, 0.9 + hash2(i, 53) * 0.8, i, T);
    }
    pinTop(960, 540, 70);
  });
  // the paper rip edges still framing the view at the start
  const open = easeOut(seg(T, 131.26, 132.5));
  if (open < 1) {
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      const x0 = 960 + sd * lerp(120, 1400, open);
      ctx.moveTo(sd < 0 ? -50 : W + 50, -50);
      for (let y = -50; y <= H + 50; y += 24) ctx.lineTo(x0 + vnoise(y * 0.03, sd < 0 ? 4 : 8) * 60, y);
      ctx.lineTo(sd < 0 ? -50 : W + 50, H + 50); ctx.closePath();
      ctx.fillStyle = '#1a1220'; ctx.fill();
      ctx.strokeStyle = '#fbf6ea'; ctx.lineWidth = 8; ctx.stroke();
      ctx.restore();
    }
  }
}, { cap: false });

// ============ 137.40  the hush: TVs blink on with each stab ============
shot(137.4, 'void_hush', (lt, dur, T) => {
  voidBackdrop(T, { stars: 50 });
  const stabs = [137.45, 138.92, 140.25, 140.67];
  const spots = [[960, 540, 300], [480, 380, 220], [1440, 420, 240], [700, 820, 200]];
  stabs.forEach((st, i) => {
    if (T < st) return;
    const k = easeOutBack(seg(T, st, st + 0.25));
    const [x, y, w] = spots[i];
    push(x, y + Math.sin(T * 1.5 + i) * 10, Math.sin(T + i) * 0.05, k);
    miniTV(0, 0, w, (sw, sh) => { const fl = T - st < 0.12; if (fl) staticNoise(0, 0, sw, sh, 1); else ctx.drawImage(faceSprite(i % 2 ? 'grin' : 'smile'), 0, 0, sw, sh); });
    pop();
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.18 * k; ctx.fillStyle = '#9ff3d0';
    ctx.beginPath(); ctx.arc(x, y, w * 1.1, 0, TAU); ctx.fill(); ctx.restore();
  });
  const pre = seg(T, 141.6, 142.46);
  if (pre > 0) { ctx.save(); ctx.globalAlpha = pre * 0.6; ctx.fillStyle = '#e9fff6'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}, { cap: false });

// ============ 142.46  the endless wall of forecasts ============
const WALL_KINDS = ['face', 'sun', 'rain', 'grin', 'snow', 'tornado', 'face', 'q', 'wink', 'static', 'storm', 'sun'];
shot(142.46, 'void_tvwall', (lt, dur, T) => {
  voidBackdrop(T, { stars: 60 });
  const camX = kf(T, [[142.46, 0], [148.8, 900]], (u) => u);
  for (const [depth, w, rows, alpha] of [[0.45, 150, 7, 0.55], [1, 250, 4, 1]]) {
    const cols = Math.ceil((W + 900) / (w * 1.08)) + 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * w * 1.08 - camX * depth + (r % 2) * w * 0.5 - 100;
      const y = 80 + r * w * 0.9 + (depth < 1 ? 20 : 30) + Math.sin(T * 0.8 + c) * 6;
      if (x < -w || x > W + w) continue;
      const idx = (c * 7 + r * 3 + (depth < 1 ? 5 : 0)) % WALL_KINDS.length;
      const d = Math.hypot(x - 960, y - 540);
      const lit = feat('high', T) * 900 + (T - 142.46) * 600 > d * 0.6 || depth < 1;
      ctx.save(); ctx.globalAlpha = alpha;
      miniTV(x, y, w, (sw, sh) => screenForecast(WALL_KINDS[idx], sw, sh, T), { on: lit, rot: Math.sin(c + r) * 0.04 });
      ctx.restore();
    }
  }
  const burst = 1 - seg(T, 142.46, 142.9);
  if (burst > 0) { ctx.save(); ctx.globalAlpha = burst * 0.7; ctx.fillStyle = '#e9fff6'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}, { cap: false });

// ============ 148.80  the colossal weathervane ============
shot(148.8, 'void_vane', (lt, dur, T) => {
  const z = kf(T, [[148.8, 0.85], [154.8, 1.15]]);
  withCam({ x: 960, y: 560, z }, 1, () => {
    voidBackdrop(T, { drift: 30 });
    crayonStorm(960, 640, 1100, T, { n: 50, w: 6, alpha: 0.45, spin: 0.7 });
    const g = seg(T, 149.0, 152.6);
    crayonLightning(300, -50, 700, 1.25, 4, g * 1.6, 3, '#fff4b8');
    crayonLightning(1650, -50, 650, 1.85, 4, (g - 0.2) * 1.6, 9, '#c9f7ff');
    const spin = T * 1.3;
    const S = 9, tilt = Math.sin(T * 0.7) * 0.12;
    push(960, 660, tilt, S);
    scaled(S, () => bigVane(spin));
    pop();
    // he rides the tail of the spinning arrow, perfectly at ease
    const lx = -40 * 1.2 * Math.cos(spin) * S, ly = (-16 - 1.3 * 1.2) * S;
    const ax = 960 + lx * Math.cos(tilt) - ly * Math.sin(tilt), ay = 660 + lx * Math.sin(tilt) + ly * Math.cos(tilt);
    const P = wvPose({ x: ax, y: ay, s: 0.42, pointer: null, grin: 0.5, storm: 0.9, pale: 0.3 });
    P.al = Object.assign({ hand: 'open' }, ARM.shrug); P.ar = Object.assign({ hand: 'spread' }, ARM.wave, { el: ARM.wave.el + Math.sin(T * 6) * 0.3 });
    wvLive(T, P, { bounce: 10 });
    drawWeathervane(P, T);
    for (let i = 0; i < 12; i++) {
      const a = T * 0.9 + (i / 12) * TAU, r = 640 + hash2(i, 61) * 200;
      dropletWorld(960 + Math.cos(a) * r, 600 + Math.sin(a) * r * 0.45, 1.3, i, T);
    }
  });
}, { cap: false });

// ============ 154.80  tape-speed descent ============
shot(154.8, 'void_melt', (lt, dur, T) => {
  const k = easeIn(seg(T, 154.8, 156.5));
  const Tslow = 154.8 + (T - 154.8) * lerp(1, 0.15, k);
  withCam({ x: 960, y: 560, z: 1.15 + k * 0.2 }, 1, () => {
    voidBackdrop(Tslow, {});
    crayonStorm(960, 640, 1100, Tslow, { n: 50, w: 6, alpha: 0.45, spin: 0.7 });
    push(960, 660, Math.sin(Tslow * 0.7) * 0.12, 9); scaled(9, () => bigVane(Tslow * 1.3)); pop();
  });
  meltFx(k);
  // collapse to a single glowing TV
  const tv = seg(T, 155.8, 156.6);
  if (tv > 0) { ctx.save(); ctx.globalAlpha = tv; ctx.fillStyle = '#04050a'; ctx.fillRect(0, 0, W, H); ctx.restore(); miniTV(960, 540, lerp(60, 260, tv), (sw, sh) => staticNoise(0, 0, sw, sh, 1)); }
}, { cap: false });

// ============ Interlude: a personalised weather advisory ============
const DOORS = [0, 1, 2, 3, 4, 5, 6].map((i) => {
  const a = Math.PI * (1.08 + i * 0.14);
  return [760 + Math.cos(a) * 640, 900 + Math.sin(a) * 470, 120 - Math.abs(i - 3) * 6];
});
function door(x, y, h, open, glow, inner, o = {}) {
  const w = h * 0.5;
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = (o.alpha ?? 1) * (0.35 + 0.4 * glow);
  const gg = ctx.createRadialGradient(x, y - h / 2, h * 0.2, x, y - h / 2, h * 0.95); gg.addColorStop(0, 'rgba(255,220,140,0.8)'); gg.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = gg; ctx.fillRect(x - h, y - h * 1.5, h * 2, h * 2); ctx.restore();
  paper((c) => pRect(c, x - w / 2 - 10, y - h - 10, w + 20, h + 10), '#e0b44c', { d: 1.6, tex: 0.6 });
  // light from inside
  ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.clip();
  ctx.fillStyle = o.lightCol || '#ffe39a'; ctx.globalAlpha = (o.alpha ?? 1) * (0.25 + 0.75 * Math.max(glow, open)); ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.globalAlpha = o.alpha ?? 1;
  if (inner && open > 0.05) inner(x, y, w, h);
  ctx.restore();
  // the door panel swings (squash toward the hinge)
  const pw = w * Math.cos(open * 1.35);
  if (o.q) {
    paper((c) => pRect(c, x - w / 2, y - h, w, h), '#4a2a3a', { d: 1, tex: 0.6 });
    ptext('?', x, y - h * 0.22, `${Math.round(h * 0.8)}px "Alfa Slab One"`, '#ffe39a', { d: 1, tex: 0.3 });
  } else if (pw > 1) {
    paper((c) => pRect(c, x - w / 2, y - h, pw, h), '#6e4258', { d: 1, tex: 0.6 });
    paper((c) => { pRect(c, x - w / 2 + pw * 0.15, y - h * 0.9, pw * 0.7, h * 0.35); pRect(c, x - w / 2 + pw * 0.15, y - h * 0.48, pw * 0.7, h * 0.4); }, '#5a344a', { d: 0.3, tex: 0.5 });
    splitPin(x - w / 2 + pw * 0.85, y - h * 0.5, Math.max(2, h * 0.025));
  }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = (o.alpha ?? 1) * 0.25 * Math.max(glow, open);
  ctx.fillStyle = '#ffe39a'; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w * 1.6, y + h * 0.5); ctx.lineTo(x - w * 1.6, y + h * 0.5); ctx.closePath(); ctx.fill(); ctx.restore();
}
function interludeRoom(T, o = {}) {
  const pulseB = feat('bass', T);
  drawLiving({
    cam: o.cam || { x: 960, y: 560, z: 1.05 },
    family: [], dog: false,
    sky: (x, y, w, h) => { ctx.fillStyle = '#0d1428'; ctx.fillRect(x, y, w, h); paper((c) => pBlob(c, x + w * 0.7, y + h * 0.3, 40, 40, 0, 2), '#e9edd8', { d: 0, tex: 0.5 }); for (let i = 0; i < 12; i++) { ctx.fillStyle = '#fff6d8'; ctx.fillRect(x + hash2(i, 1) * w, y + hash2(i, 2) * h * 0.8, 2.5, 2.5); } },
    tvLight: 0.55 + pulseB * 0.25, tvGlow: 1,
    portraitLook: 0.8, portraitGrin: 0.7, portraitStorm: 0.4,
    screen: (sw, sh) => {
      tvFace(sw, sh, T, -0.6, { grin: o.grin ?? 0.35, storm: o.storm || 0, bg: '#c8d6cc' });
      ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, sw, sh); ctx.restore();
      staticNoise(0, 0, sw, sh, 0.28, 2);
    },
    front: o.front,
  });
  // heartbeat vignette
  vignette(0.35 + pulseB * 0.3, '#000000');
}
function kidOnFloor(x, y, T, o = {}) {
  paper((c) => pBlob(c, x, y - 20, 110, 40, 0.04, 6, 30), '#5a2a3a', { d: 1.2, tex: 0.7 });
  person(x, y, 2.0, Object.assign({ style: 'child', shirt: '#9ad0e6', pants: '#9ad0e6', hat: null, look: -1, mouth: o.mouth || 'flat', eyes: o.eyes, armL: 0.35, armR: 0.35, v: 1 }, o));
}
// closed outline (with a little margin) around the kid on the floor, for the "cut here" line and the hole
function kidOutline(x, y, s) {
  const pts = [], hy = y - 132 * s, hr = 36 * s;
  const neck = Math.asin(26 / 36);
  for (let k = 0; k <= 24; k++) { const a = -Math.PI / 2 + (k / 24) * (Math.PI - neck); pts.push([x + Math.cos(a) * hr, hy + Math.sin(a) * hr]); }
  pts.push([x + 34 * s, y - 112 * s], [x + 40 * s, y - 60 * s], [x + 60 * s, y - 30 * s], [x + 58 * s, y + 6 * s], [x - 58 * s, y + 6 * s], [x - 60 * s, y - 30 * s], [x - 40 * s, y - 60 * s], [x - 34 * s, y - 112 * s]);
  for (let k = 0; k <= 24; k++) { const a = Math.PI / 2 + neck + (k / 24) * (Math.PI - neck); pts.push([x + Math.cos(a) * hr, hy + Math.sin(a) * hr]); }
  return pts;
}
function polyAt(pts, u) {
  let L = 0; const seg = [];
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; const l = Math.hypot(q[0] - p[0], q[1] - p[1]); seg.push(l); L += l; }
  let d = clamp(u) * L, out = [pts[0]];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    if (d <= seg[i]) { const k = d / (seg[i] || 1); const e = [lerp(p[0], q[0], k), lerp(p[1], q[1], k)]; out.push(e); return { pts: out, end: e, ang: Math.atan2(q[1] - p[1], q[0] - p[0]) }; }
    d -= seg[i]; out.push(q);
  }
  return { pts: out, end: pts[0], ang: 0 };
}
shot(156.6, 'int_doors', (lt, dur, T) => {
  const tSeven = atWord('seven', 156), tOne = atWord('one', 161.5), tMom = atWord('safely', 161.5), tOne2 = atWord('one', 163.5), tNone = atWord('none', 165), tQ = atWord('question', 165), tWhat = atWord('what', 168), tDear = atWord('dear', 170);
  const cut = seg(T, tWhat, tDear);
  const lift = easeIn(seg(T, tDear, tDear + 1.0));
  const kx = 760, ky = 1010, ks = 2.0;
  interludeRoom(T, {
    grin: 0.35 + seg(T, tWhat, tDear) * 0.6, storm: seg(T, tDear - 0.4, tDear),
    cam: { x: kf(T, [[156.6, 960], [165.3, 900], [170.4, 820]]), y: kf(T, [[156.6, 560], [165.3, 600], [170.4, 700]]), z: kf(T, [[156.6, 1.0], [165.3, 1.12], [170.4, 1.45], [172.1, 1.6]]) },
    front: () => {
      DOORS.forEach(([dx, dy, dh], i) => {
        const appear = easeOutBack(seg(T, tSeven + i * 0.16, tSeven + i * 0.16 + 0.35));
        if (appear <= 0) return;
        let open = 0;
        if (i === 0) open = easeInOut(seg(T, tOne, tOne + 0.5));
        if (i === 5) open = easeInOut(seg(T, tOne2, tOne2 + 0.5));
        const slam = T > tNone + i * 0.17 ? easeIn(seg(T, tNone + i * 0.17, tNone + i * 0.17 + 0.18)) : 0;
        open *= 1 - slam;
        const isQ = T > tQ + 0.2 + i * 0.05;
        push(dx, dy, 0, appear);
        door(0, 0, dh * 2.2, open, 0.35 + 0.3 * Math.sin(T * 3 + i), i === 0 ? (x, y, w, h) => {
          person(x, y + 6, h / 210, { style: 'woman', shirt: '#3a2a20', skin: '#3a2a20', hair: '#3a2a20', armL: 2.2, armR: 2.2, eyes: 'closed', mouth: 'smile' });
        } : i === 5 ? (x, y, w, h) => {
          ctx.fillStyle = '#f3dcbd'; ctx.fillRect(x - w / 2, y - h, w, h);
          tvSet(x, y - h * 0.25, w * 0.62, { on: 0, legs: false });
          line([[x - w * 0.36, y - h * 0.62], [x + w * 0.36, y - h * 0.2]], '#c8332a', 7); line([[x + w * 0.36, y - h * 0.62], [x - w * 0.36, y - h * 0.2]], '#c8332a', 7);
        } : null, { q: isQ });
        pop();
      });
      if (lift <= 0) kidOnFloor(kx, ky, T, { mouth: T > tOne && T < tNone ? 'smile' : 'o', lookY: T > tSeven && T < tNone ? -0.6 : 0, look: T > tSeven && T < tNone ? Math.sin(T) : -1 });
      // "cut here"
      if (cut > 0) {
        ctx.save();
        ctx.setLineDash([16, 12]); ctx.lineDashOffset = -T * 40;
        ctx.strokeStyle = '#f6efdc'; ctx.lineWidth = 5;
        const outline = kidOutline(kx, ky, ks), pa = polyAt(outline, cut);
        ctx.beginPath(); pa.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
        ctx.restore();
        const [sx, sy] = pa.end, a = pa.ang;
        push(sx, sy, a + Math.PI / 2 + Math.sin(T * 30) * 0.25, 1.3);
        for (const sd of [-1, 1]) {
          push(0, 0, sd * (0.25 + 0.2 * Math.sin(T * 30)));
          paper((c) => { c.moveTo(-5, 0); c.lineTo(5, 0); c.lineTo(2, -70); c.closePath(); }, '#cfd4dc', { d: 1, tex: 0.1, edge: '#fff', edgeA: 0.8 });
          ctx.save(); ctx.strokeStyle = '#c8332a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(sd * 12, 22, 12, 16, 0, 0, TAU); ctx.stroke(); ctx.restore();
          pop();
        }
        pop();
      }
      if (lift > 0) {
        // the hole left behind
        const outline = kidOutline(kx, ky, ks);
        const shape = (ox, oy) => (c) => { outline.forEach(([px, py], i) => (i ? c.lineTo(px - ox, py - oy) : c.moveTo(px - ox, py - oy))); c.closePath(); };
        paper(shape(0, 0), '#fbf7ec', { d: 0, tex: 0.6 });
        ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 7; ctx.beginPath(); shape(-3, -3)(ctx); ctx.stroke(); ctx.restore();
        // the cut-out piece flies into the screen
        const fx = lerp(kx, TV_SCREEN.x, lift), fy = lerp(ky - 130, TV_SCREEN.y, lift), fs = lerp(1, 0.08, lift);
        push(fx, fy, lift * 2.4, fs);
        paper(shape(kx, ky - 130), '#24304d', { d: 2, tex: 0.6 });
        kidOnFloor(0, 130, T, { eyes: 'closed', mouth: 'o' });
        pop();
      }
    },
  });
}, { D: 0.85 });

// ============ Bridge ============
function egg(x, y, s, crack) {
  push(x, y, 0, s);
  paper((c) => c.ellipse(0, 0, 120, 150, 0, 0, TAU), '#fbf6ea', { d: 2, tex: 0.7, edge: '#fff', edgeA: 0.5 });
  ptext('WHEN?', 0, 20, '62px "Bebas Neue"', '#14855e', { d: 0, tex: 0.4, ls: 4 });
  if (crack > 0) line([[-60, -60], [-30, -30], [-46, 0], [-10, 20], [-20, 50]].slice(0, 1 + Math.ceil(crack * 4)), '#2b2420', 4);
  pop();
}
shot(172.1, 'br_when', (lt, dur, T) => {
  const tHear = atWord('hear', 172), tUnborn = atWord('unborn', 172);
  voidBackdrop(T, {});
  for (let i = 0; i < 9; i++) {
    const x = (hash2(i, 71) * W + T * 30 * (i % 2 ? 1 : -1) + W) % W, y = hash2(i, 72) * H;
    push(x, y, T * 0.2 * (i % 2 ? 1 : -1)); clockFace(0, 0, 50 + hash2(i, 73) * 50, 0, { faceless: true, rim: '#a8893c', face: '#e9e2cc' }); pop();
  }
  // a colossal silhouette, cupping an ear toward the unborn "when"
  const k = easeOut(seg(T, 172.1, 173.4));
  ctx.save(); ctx.globalAlpha = 0.95 * k;
  const P = wvPose({ x: 1380, y: 1850, s: 1.7, pointer: null, ar: Object.assign({ hand: 'open' }, ARM.ear), al: ARM.rest, grin: 0.6, storm: 1, pale: 0.6, eyeX: -1 });
  P.ar = T > tHear - 0.3 ? Object.assign({ hand: 'open' }, ARM.ear) : Object.assign({ hand: 'open' }, ARM.rest);
  wvLive(T, P, { bounce: 0, sway: 0.02 });
  drawWeathervane(P, T);
  ctx.restore();
  egg(560, 520 + Math.sin(T * 2) * 14, easeOutBack(seg(T, tUnborn - 0.4, tUnborn)) * 1.4, seg(T, tUnborn + 0.3, 175.6));
}, { D: 0.95 });
function thunderhead(x, y, s, i, T) {
  push(x, y, 0, s);
  cloud(0, 60, 420, 140, { seed: i + 1, color: '#3a4256', shade: '#262c3c' });
  cloud(0, -60, 300, 170, { seed: i + 4, color: '#4a5266', shade: '#2e3444' });
  cloud(0, -170, 220, 120, { seed: i + 7, color: '#5a6278', shade: '#3a4156' });
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(T * 3 + i);
  const g = ctx.createRadialGradient(0, -20, 10, 0, -20, 160); g.addColorStop(0, 'rgba(255,230,160,0.9)'); g.addColorStop(1, 'rgba(255,230,160,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -20, 160, 0, TAU); ctx.fill(); ctx.restore();
  dropletWorld(0, -30, 1.6, i, T);
  pop();
}
shot(175.82, 'br_worlds', (lt, dur, T) => {
  withCam({ x: kf(T, [[175.82, 760], [179.44, 1160]]), y: 540, z: 1.05 }, 1, () => {
    voidBackdrop(T, {});
    const heads = [[300, 700, 0.9], [760, 520, 1.1], [1240, 760, 1.0], [1640, 480, 0.95], [2000, 720, 0.85], [-80, 420, 0.8]];
    heads.forEach(([x, y, s], i) => {
      const k = easeOutBack(seg(T, 175.82 + i * 0.25, 176.3 + i * 0.25));
      if (k > 0) thunderhead(x, y + Math.sin(T + i) * 12, s * k, i, T);
    });
    if (hash2(Math.floor(T * 5), 9) < 0.3) crayonLightning(700 + hash2(Math.floor(T * 5), 3) * 800, 200, 420, 1.6, 3, 1, Math.floor(T * 5), '#fff4b8');
  });
}, { D: 0.95 });
shot(179.44, 'br_erase', (lt, dur, T) => {
  const tErase = atWord('erase', 179), tBut = atWord('but', 180.5), tBore = atWord('bore', 181.5);
  if (T < tBut) {
    voidBackdrop(T, {});
    [[300, 700, 0.9], [760, 520, 1.1], [1240, 760, 1.0], [1640, 480, 0.95]].forEach(([x, y, s], i) => thunderhead(x, y, s, i, T));
    // a giant eraser leaves clean paper behind
    const u = easeInOut(seg(T, tErase - 0.1, tBut));
    const path = (k) => [lerp(-300, 2200, k), 300 + Math.sin(k * 9) * 260];
    ctx.save(); ctx.fillStyle = '#fbf7ec'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#fbf7ec'; ctx.lineWidth = 360;
    ctx.beginPath(); for (let k = 0; k <= u; k += 0.01) { const [x, y] = path(k); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.restore();
    const [ex, ey] = path(u);
    push(ex, ey, Math.sin(u * 9) * 0.3 - 0.4, 1.4);
    paper((c) => pRRect(c, -170, -90, 340, 180, 30), '#f29fa8', { d: 2.4, tex: 0.7 });
    paper((c) => pRRect(c, -170, -90, 120, 180, 30), '#4f8fc0', { d: 0.6, tex: 0.6 });
    ptext('ERASE', 70, 22, '64px "Bebas Neue"', '#7a2f3a', { d: 0, tex: 0.4, ls: 4 });
    pop();
    for (let i = 0; i < 20; i++) { const k = u - i * 0.004; const [x, y] = path(Math.max(0, k)); paper((c) => pBlob(c, x + hash2(i, 5) * 80 - 40, y + 150 + hash2(i, 6) * 60, 9, 5, 0.2, i), '#f29fa8', { d: 0.3, tex: 0.3 }); }
  } else {
    // dead air: the station's test card, and a host who finds it dreadfully dull
    paperBackdrop('#d9d4c4');
    const bars = ['#f2f2ee', '#f2e24b', '#5fd0d6', '#6cd35a', '#d65fd0', '#e2574c', '#3a52c8'];
    bars.forEach((c0, i) => paper((c) => pRect(c, i * (W / 7), 0, W / 7 + 2, 700), c0, { d: 0, tex: 0.5 }));
    paper((c) => pRect(c, 0, 700, W, 380), '#2b2b30', { d: 1.4, tex: 0.6 });
    paper((c) => pBlob(c, 960, 380, 300, 300, 0.01, 2, 60), '#fbf6ea', { d: 2.4, tex: 0.6 });
    ctx.save(); ctx.strokeStyle = '#2b2420'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(960, 380, 240, 0, TAU); ctx.moveTo(660, 380); ctx.lineTo(1260, 380); ctx.moveTo(960, 80); ctx.lineTo(960, 680); ctx.stroke(); ctx.restore();
    ptext('9', 960, 470, '260px "Limelight"', '#14855e', { d: 1, tex: 0.3 });
    ptext('PLEASE STAND BY', 960, 860, '120px "Bebas Neue"', '#fbf6ea', { d: 1, tex: 0.3, ls: 10 });
    miniTV(1650, 880, 300, (sw, sh) => ctx.drawImage(faceSprite(T > tBore - 0.2 ? 'happy' : 'smile'), 0, 0, sw, sh));
    const yawn = pulse(T, tBut + 0.3, 0.8);
    if (yawn > 0) ptext('*yawn*', 1650, 700, '44px "Special Elite"', '#fbf6ea', { d: 0.5, tex: 0.3, alpha: yawn });
  }
}, { D: 0.95 });
shot(183.0, 'br_more', (lt, dur, T) => {
  const words = [['LIVING', atWord('living', 183)], ['HOPING', atWord('hoping', 183)], ['WAITING', atWord('waiting', 183)], ['BEGGING', atWord('begging', 183)]];
  const tMore = atWord('more', 185);
  voidBackdrop(T, { stars: 60 });
  crayonStorm(960, 260, 900, T, { n: 40, alpha: 0.4 });
  // the giant broadcaster above the crowd
  const P = wvPose({ x: 960, y: 1450, s: 1.05, pointer: null, grin: 0.7 + seg(T, tMore - 0.2, tMore) * 0.3, storm: 1, pale: 0.4 });
  P.al = Object.assign({ hand: 'spread' }, T > tMore - 0.1 ? ARM.up : ARM.wide); P.ar = Object.assign({ hand: 'spread' }, T > tMore - 0.1 ? ARM.up : ARM.wide);
  wvLive(T, P, { bounce: 6 });
  drawWeathervane(P, T);
  // the crowd: rows of paper silhouettes reaching up with antennas
  for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {
    const x = i * 170 + (r % 2) * 85 - 40, y = 1100 + r * 70 - beatPulse(T, 7) * 10 * ((i + r) % 2);
    const shade = ['#1a2238', '#141a2c', '#0d1220'][r];
    person(x, y, 1.9 - r * 0.15, { style: (i + r) % 3 ? 'man' : 'woman', shirt: shade, pants: shade, skin: shade, hair: shade, eyes: 'tv', mouth: 'flat', armL: 2.6 + Math.sin(T * 4 + i) * 0.2, armR: 2.6 + Math.cos(T * 4 + i) * 0.2, holdR: i % 3 === 0 ? 'antenna' : null, v: i });
  }
  words.forEach(([wd, t1], i) => {
    const k = easeOutBack(seg(T, t1, t1 + 0.25));
    if (k > 0) { push(280 + i * 450, 360 + (i % 2) * 90, (i - 1.5) * 0.06, k); paper((c) => pRect(c, -180, -64, 360, 110), '#fbf6ea', { d: 2, tex: 0.7 }); ptext(wd, 0, 22, '86px "Bebas Neue"', '#c8332a', { d: 0, tex: 0.4, ls: 6 }); pop(); }
  });
  const m = seg(T, tMore, tMore + 0.2);
  if (m > 0) { ctx.save(); ctx.globalAlpha = (1 - seg(T, tMore + 0.2, tMore + 0.6)) * 0.55; ctx.fillStyle = '#e9fff6'; ctx.fillRect(0, 0, W, H); ctx.restore(); stamp('MORE!', 960, 560, m, { font: '260px "Alfa Slab One"', ink: '#c8332a', rot: 0.05 }); }
}, { D: 0.95 });
shot(186.0, 'br_stitch', (lt, dur, T) => {
  const tPrayer = atWord('prayer', 188);
  voidBackdrop(T, { stars: 50 });
  const heads = 6;
  const pray = easeInOut(seg(T, tPrayer - 0.2, tPrayer + 0.4));
  const needleU = seg(T, 186.4, 189.3);
  // the thread
  ctx.save(); ctx.strokeStyle = '#4fe0a8'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  if (E.shadows) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 4; }
  ctx.beginPath();
  const tx = (u) => lerp(-50, 1980, u), ty = (u) => 470 + Math.sin(u * heads * Math.PI * 2) * 150;
  for (let u = 0; u <= needleU; u += 0.004) (u ? ctx.lineTo(tx(u), ty(u)) : ctx.moveTo(tx(u), ty(u)));
  ctx.stroke(); ctx.restore();
  // profile heads with a stitch through each
  for (let i = 0; i < heads; i++) {
    const x = 170 + i * 320, y = 560;
    push(x, y, pray * 0.35);
    paper((c) => { c.moveTo(-60, 120); c.quadraticCurveTo(-90, -40, -20, -110); c.quadraticCurveTo(60, -140, 90, -60); c.quadraticCurveTo(100, -20, 120, 0); c.lineTo(96, 14); c.quadraticCurveTo(110, 40, 90, 60); c.quadraticCurveTo(70, 90, 60, 120); c.closePath(); }, ['#2a3a5a', '#24344f', '#2e3f60'][i % 3], { d: 1.8, tex: 0.6 });
    ctx.fillStyle = '#4fe0a8'; ctx.beginPath(); ctx.arc(40, -40, 7, 0, TAU); ctx.fill();
    pop();
    if (pray > 0) { push(x + 70, y + 230, 0, pray); paper((c) => { c.moveTo(0, -90); c.quadraticCurveTo(30, -40, 24, 40); c.lineTo(-24, 40); c.quadraticCurveTo(-30, -40, 0, -90); c.closePath(); }, '#e9e2cc', { d: 1.4, tex: 0.6 }); line([[0, -86], [0, 36]], '#b8ad90', 3); pop(); }
  }
  // the needle
  const nx = tx(needleU), ny = ty(needleU), na = Math.atan2(ty(needleU + 0.01) - ny, tx(needleU + 0.01) - nx);
  push(nx, ny, na);
  paper((c) => { c.moveTo(-220, -6); c.lineTo(60, 0); c.lineTo(-220, 6); c.closePath(); }, '#e9ecf1', { d: 2, tex: 0.1, edge: '#fff', edgeA: 0.9 });
  ctx.fillStyle = '#05070f'; ctx.beginPath(); ctx.ellipse(-190, 0, 16, 3, 0, 0, TAU); ctx.fill();
  pop();
}, { D: 0.95 });
function popFlower(x, y, k, T) {
  const petals = 9;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * TAU + T * 0.1, open = easeOutBack(clamp(k * 1.4 - i * 0.04));
    if (open <= 0) continue;
    push(x, y, a, 1, open);
    paper((c) => { c.moveTo(0, 0); c.quadraticCurveTo(-130, -180, 0, -420); c.quadraticCurveTo(130, -180, 0, 0); c.closePath(); }, ['#14855e', '#1fa676', '#0e6b4b'][i % 3], { d: 2, tex: 0.7, edge: '#ffe9a8', edgeA: 0.6 });
    push(0, -260, -a);
    miniTV(0, 0, 130, (sw, sh) => screenForecast(['sun', 'rain', 'face', 'snow', 'grin', 'tornado', 'q', 'wink', 'storm'][i], sw, sh, T));
    pop();
    pop();
  }
  paper((c) => pBlob(c, x, y, 120 * k, 120 * k, 0.02, 3, 40), '#e0b44c', { d: 2, tex: 0.6 });
  pinTop(x, y, 70 * k);
}
shot(190.06, 'br_bloom', (lt, dur, T) => {
  const tBloom = atWord('blooms', 190), tBreath = atWord('breath', 191.5);
  voidBackdrop(T, {});
  const k = seg(T, tBloom - 0.35, tBloom + 0.9);
  popFlower(960, 620, k, T);
  const tk = easeOutBack(seg(T, 190.0, 190.6));
  if (tk > 0) {
    push(960, 150, 0, tk);
    ptext('THE FOREVER FORECAST', 6, 8, '120px "Limelight"', '#0b3a2c', { d: 0, tex: 0.4 });
    ptext('THE FOREVER FORECAST', 0, 0, '120px "Limelight"', '#ffe9a8', { d: 1.6, tex: 0.4 });
    pop();
  }
  if (T > tBreath - 0.3) for (let i = 0; i < 10; i++) {
    const u = (T - tBreath + 0.3 + i * 0.3) % 3;
    push(140 + i * 180, 1000 - u * 160, 0, 0.6 + u * 0.15);
    ctx.save(); ctx.globalAlpha = 1 - u / 3;
    paper((c) => pCloud(c, 0, 0, 120, 60, i + 2, 4), '#e9f2f6', { d: 0.8, tex: 0.4 });
    ctx.drawImage(faceSprite('smile'), -24, -32, 48, 48);
    ctx.restore();
    pop();
  }
}, { D: 0.95 });
shot(193.7, 'br_noend', (lt, dur, T) => {
  const tFin = atWord('finale', 193.5), tConc = atWord('conclusion', 194), tRelief = atWord('relief', 195), tSun = atWord('sun', 196);
  drawStage({ stars: 1, mid: () => {
    const crossed = seg(T, tSun - 0.1, tSun + 0.25);
    sun(960, 430, 140, { face: 'worried', stick: 900 });
    if (crossed > 0) { line([[760, 230], [lerp(760, 1160, crossed), lerp(230, 630, crossed)]], '#c8332a', 34, { d: 1.4 }); if (crossed > 0.5) line([[1160, 230], [lerp(1160, 760, (crossed - 0.5) * 2), lerp(230, 630, (crossed - 0.5) * 2)]], '#c8332a', 34, { d: 1.4 }); }
  } });
  // curtains try to close, then snap open
  const close = easeInOut(seg(T, 193.7, tFin + 0.25)) * (1 - easeOutElastic(seg(T, tFin + 0.35, tFin + 1.2)));
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 0 : W, reach = lerp(0, 940, close);
    paper((c) => { c.moveTo(x0, -10); c.lineTo(x0 - sd * reach, -10); c.quadraticCurveTo(x0 - sd * (reach - 40), 540, x0 - sd * reach, 1100); c.lineTo(x0, 1100); c.closePath(); }, '#7a1a22', { d: 2.6, tex: 0.8 });
    for (let k = 1; k < 6; k++) line([[x0 - sd * reach * (k / 6), -10], [x0 - sd * reach * (k / 6) + sd * 10, 1100]], '#5a1018', 6);
  }
  // THE END card drops — and tears in half
  const drop = easeOutBack(seg(T, tFin - 0.3, tFin + 0.1));
  const rip = easeIn(seg(T, tConc, tConc + 0.7));
  if (drop > 0 && rip < 1) {
    for (const sd of [-1, 1]) {
      push(960 + sd * rip * 500, lerp(-300, 520, drop) + rip * 300, sd * rip * 0.6);
      ctx.save(); ctx.beginPath(); if (sd < 0) ctx.rect(-500, -300, 500 + 6 * Math.sin(1), 600); else ctx.rect(0, -300, 500, 600); ctx.clip();
      paper((c) => pRect(c, -420, -150, 840, 300), '#fbf6ea', { d: 2.4, tex: 0.8 });
      ptext('THE END', 0, 70, '200px "Limelight"', '#2b2420', { d: 0, tex: 0.4 });
      ctx.restore();
      pop();
    }
  }
}, { D: 0.95 });
shot(197.52, 'br_tunnel', (lt, dur, T) => {
  const tDone = atWord('done', 200);
  const speed = 0.55 + seg(T, tDone - 1, 204) * 1.8;
  const ph = ((T - 197.52) * speed) % 1;
  paperBackdrop('#05070f');
  const n = 13, r = 0.74;
  for (let i = 0; i <= n; i++) {
    const s = Math.pow(r, i + ph) * 1.1;
    if (s < 0.01) continue;
    push(960, 540, (i - ph) * 0.12 + T * 0.1, s);
    scaled(s, () => {
      paper((c) => pRRect(c, -960, -560, 1920, 1120, 120), i % 2 ? '#6e4528' : '#14855e', { d: 2.6, tex: 0.7 });
      paper((c) => pRRect(c, -840, -470, 1680, 940, 90), '#0c1424', { d: 0.6, tex: 0.4 });
      paper((c) => pRect(c, -260, -430, 520, 120), '#fbf6ea', { d: 1, tex: 0.7 });
      ptext('TOMORROW', 0, -340, '96px "Bebas Neue"', '#c8332a', { d: 0, tex: 0.4, ls: 10 });
    });
    pop();
  }
  ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(960, 540, 0, 960, 540, 120); g.addColorStop(0, 'rgba(230,255,240,0.85)'); g.addColorStop(1, 'rgba(230,255,240,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  const fl = seg(T, 203.6, 204.3);
  if (fl > 0) { ctx.save(); ctx.globalAlpha = fl; ctx.fillStyle = '#fffbe9'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}, { D: 0.95 });
