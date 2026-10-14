'use strict';
// Shot dispatcher: each shot renders a whole frame through a scene function; transitions
// composite the outgoing shot over the incoming one (fade, through-black, flash, shatter).
const SCENES = {};
const SHOTS = [];
// shot(t0, scene, params, transition-in)   transition: {type, d}
function shot(t0, scene, p = {}, tr = null) { SHOTS.push({ t0, scene, p, tr }); }

let _beatEnv = null;
function audioState(t) {
  const D = window.MV_DATA, i = clamp(Math.floor(t * D.fps), 0, D.rms.length - 1);
  // beat envelope: a sharp rise on each beat with a ~0.35 s decay
  let lo = 0, hi = D.beats.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (D.beats[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; }
  const since = r >= 0 ? t - D.beats[r] : 99;
  E.beat = Math.exp(-since / 0.35);
  E.amp = D.rms[i];
  E.bass = D.bass[i];
  E.onset = D.onset[i];
  E.pulse = 0.55 + 0.45 * E.beat;
}
function frameStart(t) {
  E.t = t; E.f = Math.floor(t * E.fps + 1e-6); E.T = E.f / E.fps; E.D = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  E.shadowScale = 1; E.leadK = 1; E.blood = 0; E.light = null; E.lightK = 1;
  audioState(E.T);
}
function shotAt(t) {
  let lo = 0, hi = SHOTS.length - 1, r = 0;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (SHOTS[m].t0 <= t) { r = m; lo = m + 1; } else hi = m - 1; }
  return r;
}
function drawShot(S, t) {
  const fn = SCENES[S.scene];
  ctx.save();
  E.light = null; E.lightK = 1; E.blood = 0; E.leadK = 1;
  if (fn) fn(t - S.t0, S.p, t, S);
  else { ctx.fillStyle = '#300'; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
}
function copyFrame(buf) {
  const g = buf.getContext('2d');
  g.globalCompositeOperation = 'copy'; g.globalAlpha = 1;
  g.drawImage(E.canvas, 0, 0);
}
function renderFrame(t) {
  frameStart(t);
  const T = E.T, i = shotAt(T), S = SHOTS[i], prev = SHOTS[i - 1];
  const tr = S.tr, d = tr ? tr.d || 0.5 : 0, k = d > 0 ? (T - S.t0) / d : 1;
  if (!prev || !tr || k >= 1 || tr.type === 'cut') {
    drawShot(S, T);
  } else if (tr.type === 'fade') {
    drawShot(prev, T); copyFrame(E.bufA);
    drawShot(S, T);
    ctx.globalAlpha = 1 - smooth(clamp(k)); ctx.drawImage(E.bufA, 0, 0); ctx.globalAlpha = 1;
  } else if (tr.type === 'black' || tr.type === 'white') {
    const col = tr.type === 'black' ? '#000' : '#fff6e0';
    if (k < 0.5) drawShot(prev, T); else drawShot(S, T);
    ctx.globalAlpha = 1 - Math.abs(k - 0.5) * 2; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  } else if (tr.type === 'shatter') {
    drawShot(prev, T); copyFrame(E.bufA);
    drawShot(S, T);
    shatterImage(E.bufA, (T - S.t0), tr);
  }
  post(T, S);
}
// the outgoing frame breaks into glass shards that fall away
function shatterImage(img, tt, tr) {
  const cells = tess('shatter_tr', -40, -40, W + 40, H + 40, tr.size || 150, { seed: 99, jit: 0.9 }).cells;
  const ix = tr.x ?? W / 2, iy = tr.y ?? H / 2;
  for (const c of cells) {
    const dx = c.cx - ix, dy = c.cy - iy, dd = Math.hypot(dx, dy) + 1;
    const delay = dd / 2600 + hash(c.seed) * 0.05;
    const u = Math.max(0, tt - delay);
    const v = (tr.force || 700) * (0.5 + hash(c.seed + 1) * 0.8) / (1 + dd / 1100);
    const ox = (dx / dd) * v * u, oy = (dy / dd) * v * u + 0.5 * 2200 * u * u;
    const rot = (hash(c.seed + 2) - 0.5) * 5 * u, sc = 1 + u * 0.35 * hash(c.seed + 3);
    const a = 1 - clamp((u - 0.25) / 0.45);
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(c.cx + ox, c.cy + oy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-c.cx, -c.cy);
    ctx.save(); ctx.clip(c.path); ctx.drawImage(img, 0, 0); ctx.restore();
    if (u > 0) { ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(16,14,20,0.9)'; ctx.stroke(c.path); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,250,240,0.6)'; ctx.stroke(c.path); }
    ctx.restore();
  }
  if (tt < 0.12) { ctx.globalAlpha = (1 - tt / 0.12) * 0.5; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function post(T, S) {
  bloom(S.p.bloom ?? 0.45, 9);
  vignette(S.p.vig ?? 0.45, '#000000');
  grainLite(T);
}
function grainLite(T) {
  if (!E.grainCanvas) {
    E.grainCanvas = makeCanvas(256, 256);
    const g = E.grainCanvas.getContext('2d'), img = g.createImageData(256, 256), r = rng(5);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - 0.5) * 60; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    E.grainPat = ctx.createPattern(E.grainCanvas, 'repeat');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.05;
  E.grainPat.setTransform(new DOMMatrix().translateSelf((E.f * 97) % 256, (E.f * 57) % 256));
  ctx.fillStyle = E.grainPat; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function initScenes() {
  E.bufA = makeCanvas(W, H);
  buildShots();
  SHOTS.sort((a, b) => a.t0 - b.t0);
  for (let i = 0; i < SHOTS.length; i++) SHOTS[i].t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t0 : 400;
}

// ---------- shared shot helpers ----------
// camera drift: slow push/pan inside a shot. z0→z1 zoom, (x0,y0)→(x1,y1) look-at
function camAt(lt, dur, c) {
  const u = smooth(clamp(lt / Math.max(0.01, dur)));
  return { x: lerp(c.x0 ?? W / 2, c.x1 ?? c.x0 ?? W / 2, u), y: lerp(c.y0 ?? H / 2, c.y1 ?? c.y0 ?? H / 2, u), z: lerp(c.z0 ?? 1, c.z1 ?? c.z0 ?? 1, u), r: lerp(c.r0 ?? 0, c.r1 ?? c.r0 ?? 0, u) };
}
function withCamera(cam, fn) {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  if (cam.r) ctx.rotate(cam.r);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
  scaled(cam.z, fn);
  ctx.restore();
}
// backlight helpers
function sunLight(x, y, r, base = 0.55, peak = 0.75) {
  return (sx, sy) => base + peak * Math.exp(-((sx - x) ** 2 + (sy - y) ** 2) / (2 * r * r));
}
// lyric-timed helpers
function lineAt(t) {
  const L = window.MV_DATA.lines;
  for (let i = L.length - 1; i >= 0; i--) if (L[i].s <= t + 0.05) return t < L[i].e + 0.6 ? L[i] : null;
  return null;
}

// ---------- lyric captions (a separate transparent pass, composited at encode time) ----------
const CAPTION_SKIP = new Set(['Monster.']);
function renderCaption(t) {
  E.t = t; E.f = Math.floor(t * E.fps + 1e-6); E.T = E.f / E.fps;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  E.shadowScale = 1; E.leadK = 1; E.blood = 0; E.light = null; E.lightK = 1;
  audioState(E.T);
  const L = window.MV_DATA.lines;
  for (const l of L) {
    if (CAPTION_SKIP.has(l.text.trim())) continue;
    const a = clamp((E.T - l.s + 0.15) / 0.3) * clamp((l.e + 0.45 - E.T) / 0.3);
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha = a;
    E.light = () => 1.0;
    banderole(960, 1008, 300, 50, l.text.replace(/\s+/g, ' ').trim(), { font: '500 27px "Cinzel"', ls: 1.5, L: 1.0 });
    ctx.restore();
  }
}
