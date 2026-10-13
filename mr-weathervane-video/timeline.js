'use strict';
// Master timeline: shots, darkness arc, transitions, lyric strip, post effects.
const SHOTS = [];
const DUR = 272.04;
function shot(t, name, fn, o = {}) { SHOTS.push(Object.assign({ t, name, fn }, o)); }

// Global friendly → dark arc (E.D). Shots may override with o.D.
const DARK_ARC = [
  [0, 0], [18, 0.02], [20, 0.04], [34, 0.1], [48.4, 0.06], [72, 0.14], [94, 0.3], [108, 0.5],
  [131, 0.62], [140, 0.92], [156.5, 0.85], [172, 0.95], [204, 1], [230.2, 1], [230.3, 0.12],
  [252, 0.3], [262, 0.55], [272.1, 0.8],
];
function arcAt(t, pts) {
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
      return lerp(v0, v1, clamp((t - t0) / (t1 - t0 || 1)));
    }
  }
  return pts[pts.length - 1][1];
}
// Keyframes: [[t, v], ...] where v is a number or array of numbers.
function kf(lt, keys, ease = easeInOut) {
  if (lt <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (lt <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      const u = ease(clamp((lt - t0) / (t1 - t0 || 1)));
      return typeof v0 === 'number' ? lerp(v0, v1, u) : v0.map((x, j) => lerp(x, v1[j], u));
    }
  }
  return keys[keys.length - 1][1];
}

// ---------- audio helpers ----------
function feat(name, t) {
  const a = MV_DATA[name], i = Math.floor(t * MV_DATA.fps);
  return a[i < 0 ? 0 : i >= a.length ? a.length - 1 : i] || 0;
}
function lastBeat(t) {
  const b = MV_DATA.beats;
  let lo = 0, hi = b.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (b[m] <= t + 1e-6) { r = m; lo = m + 1; } else hi = m - 1; }
  return r;
}
function beatPulse(t, decay = 7) {
  const i = lastBeat(t);
  return i < 0 ? 0 : Math.exp(-(t - MV_DATA.beats[i]) * decay);
}
function beatPhase(t) {
  const b = MV_DATA.beats, i = lastBeat(t);
  if (i < 0 || i >= b.length - 1) return 0;
  return (t - b[i]) / (b[i + 1] - b[i]);
}
const _norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
// time of the first sung occurrence of `word` at/after `after`
function atWord(word, after = 0) {
  const n = _norm(word);
  for (const L of MV_DATA.lines) for (const w of L.words) if (w.t >= after - 0.02 && _norm(w.w) === n) return w.t;
  return after;
}

// ---------- puppet performance ----------
function wvLive(t, P, o = {}) {
  P.mouth = o.mouth ?? mouthAt(t);
  P.blink = Math.max(P.blink || 0, o.noBlink ? 0 : blinkAt(t, 3));
  const bp = beatPulse(t, 9);
  P.bob = (P.bob || 0) + (o.bounce ?? 10) * bp;
  P.headTilt = (P.headTilt || 0) + (o.sway ?? 0.04) * Math.sin(t * 2.4) + 0.02 * bp;
  P.stormT = t;
  return P;
}

// ---------- transitions ----------
function transMask(type, p, o = {}) {
  ctx.beginPath();
  if (type === 'slide') ctx.rect(W * (1 - easeInOut(p)), 0, W, H);
  else if (type === 'slideUp') ctx.rect(0, H * (1 - easeInOut(p)), W, H);
  else if (type === 'iris') ctx.arc(o.x ?? W / 2, o.y ?? H / 2, easeIn(p) * 1250, 0, TAU);
  else if (type === 'tear') {
    const x0 = lerp(W + 80, -80, easeInOut(p));
    ctx.moveTo(W + 10, -10);
    for (let y = -10; y <= H + 20; y += 18) ctx.lineTo(x0 + vnoise(y * 0.05, 9) * 26 + (hash(y) - 0.5) * 14 + (y / H) * 60, y);
    ctx.lineTo(W + 10, H + 20);
    ctx.closePath();
  } else ctx.rect(0, 0, W, H);
  ctx.clip();
}
function transDecor(type, p, o = {}) {
  ctx.save();
  if (type === 'slide') {
    const x = W * (1 - easeInOut(p));
    const g = ctx.createLinearGradient(x - 40, 0, x, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,0,0.35)');
    ctx.fillStyle = g; ctx.fillRect(x - 40, 0, 40, H);
  } else if (type === 'tear') {
    const x0 = lerp(W + 80, -80, easeInOut(p));
    ctx.strokeStyle = 'rgba(255,252,240,0.95)'; ctx.lineWidth = 7; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = -4;
    ctx.beginPath();
    for (let y = -10; y <= H + 20; y += 18) {
      const X = x0 + vnoise(y * 0.05, 9) * 26 + (hash(y) - 0.5) * 14 + (y / H) * 60;
      y === -10 ? ctx.moveTo(X, y) : ctx.lineTo(X, y);
    }
    ctx.stroke();
  } else if (type === 'flash') {
    ctx.fillStyle = `rgba(255,252,240,${1 - p})`; ctx.fillRect(0, 0, W, H);
  } else if (type === 'static') {
    staticNoise(0, 0, W, H, 0.9 * (1 - p));
  }
  ctx.restore();
}

// ---------- lyric strip (teleprompter lower-third) ----------
function currentLine(t) {
  const Ls = MV_DATA.lines;
  for (let i = 0; i < Ls.length; i++) if (t >= Ls[i].s - 0.2 && t <= Ls[i].e + 0.3) return Ls[i];
  return null;
}
function captions(t, o = {}) {
  const L = currentLine(t);
  if (!L) return;
  // a line whose own shot shows it as big type gets no strip, not even in the lead-in
  if (SHOTS[shotIndexAt(L.s + 0.01)].cap === false) return;
  const a = clamp((t - (L.s - 0.2)) / 0.18) * clamp((L.e + 0.3 - t) / 0.25);
  if (a <= 0.01) return;
  const dark = clamp((E.D - 0.45) / 0.3);
  const font = '36px "Special Elite"';
  const words = L.words.map((w) => w.w);
  ctx.save();
  ctx.font = font;
  const sp = ctx.measureText(' ').width;
  const ws = words.map((w) => ctx.measureText(w).width);
  let total = ws.reduce((s, x) => s + x, 0) + sp * (words.length - 1);
  const maxW = 1500;
  const scale = total > maxW ? maxW / total : 1;
  const stripW = total * scale + 120, stripH = 64;
  const cx = W / 2, cy = o.y ?? 996;
  ctx.globalAlpha = a;
  const slide = (1 - easeOut(clamp((t - (L.s - 0.2)) / 0.25))) * 30;
  ctx.translate(0, slide);
  const paperCol = mix('#f6efdc', '#16233a', dark), inkCol = mix('#2b2420', '#e8edf5', dark);
  const accent = mix('#14855e', '#4fe0a8', dark);
  paper((c) => pPoly(c, [[cx - stripW / 2, cy - stripH / 2], [cx + stripW / 2, cy - stripH / 2 - 3], [cx + stripW / 2 + 4, cy + stripH / 2], [cx - stripW / 2 - 2, cy + stripH / 2 + 2]], 2, 31), paperCol, { d: 1.6, tex: 0.7 });
  paper((c) => pRect(c, cx - stripW / 2 - 2, cy - stripH / 2 + 2, 34, stripH - 2), accent, { d: 0.4, tex: 0.5 });
  ptext('9', cx - stripW / 2 + 15, cy + 12, '32px "Bebas Neue"', paperCol, { d: 0, tex: 0 });
  // words, karaoke reveal
  ctx.translate(cx - (total * scale) / 2 + 14, cy + 12);
  ctx.scale(scale, scale);
  let x = 0;
  for (let i = 0; i < words.length; i++) {
    const wt0 = L.words[i].t, wt1 = i + 1 < words.length ? L.words[i + 1].t : L.e;
    const sung = t >= wt0 - 0.04;
    const cur = sung && t < wt1;
    ctx.globalAlpha = a * (sung ? 1 : 0.32);
    ctx.fillStyle = inkCol;
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.fillText(words[i], x, cur ? -2 : 0);
    if (cur) { ctx.fillStyle = accent; ctx.fillRect(x, 8, ws[i], 3.5); }
    x += ws[i] + sp;
  }
  ctx.restore();
}

// ---------- post ----------
function post(S) {
  const D = E.D;
  vignette(0.22 + 0.38 * D, D > 0.5 ? '#02060c' : '#160c04');
  grain(0.05 + 0.03 * D);
  if (S.tvFx) {
    const k = typeof S.tvFx === 'function' ? S.tvFx(E.T - S.t) : S.tvFx;
    if (k > 0) {
      scanlines(0.08 * k, 4);
      if (hash2(E.f, 91) < 0.18 * k) { ctx.save(); ctx.globalAlpha = 0.25 * k; ctx.drawImage(E.canvas, 0, 0, W, H, 8, 0, W, H); ctx.restore(); }
      if (hash2(E.f, 92) < 0.1 * k) staticNoise(0, hash2(E.f, 93) * H, W, 40 + hash2(E.f, 94) * 80, 0.35 * k);
    }
  }
}

// ---------- frame ----------
function initScenes() { SHOTS.sort((a, b) => a.t - b.t); }
function shotIndexAt(t) {
  let r = 0;
  for (let i = 0; i < SHOTS.length; i++) if (SHOTS[i].t <= t + 1e-6) r = i;
  return r;
}
function drawShot(i, T) {
  const S = SHOTS[i], next = SHOTS[i + 1];
  const lt = T - S.t, dur = (next ? next.t : DUR) - S.t;
  E.D = S.D != null ? (typeof S.D === 'function' ? S.D(lt, dur) : S.D) : arcAt(T, DARK_ARC);
  E.shadowScale = 1;
  ctx.save();
  S.fn(lt, dur, T, S);
  ctx.restore();
}
function renderFrame(t) {
  E.t = t; E.f = Math.floor(t * E.fps + 1e-6); E.T = E.f / E.fps;
  const T = E.T;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!SHOTS.length) return;
  const i = shotIndexAt(T), S = SHOTS[i];
  const tr = S.trans;
  if (tr && i > 0 && T - S.t < tr.dur) {
    const p = (T - S.t) / tr.dur;
    if (tr.type === 'flash' || tr.type === 'static' || tr.type === 'cut') drawShot(i, T);
    else {
      drawShot(i - 1, T);
      ctx.save(); transMask(tr.type, p, tr); drawShot(i, T); ctx.restore();
    }
    transDecor(tr.type, p, tr);
  } else drawShot(i, T);
  if (S.cap !== false) captions(t);
  post(S);
  if (S.over) S.over(T - S.t);
}
