'use strict';
// Paper-motion engine: cut-paper primitives, textures, camera, easing, effects.
const W = 1920, H = 1080, TAU = Math.PI * 2;
const E = {
  t: 0, T: 0, f: 0, fps: 12, D: 0,
  shadows: true, tex: true, shadowScale: 1, lightX: 1,
};
let ctx;

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const easeOutElastic = (t) =>
  t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;
const pulse = (t, a, len) => (t < a || t > a + len ? 0 : Math.sin(((t - a) / len) * Math.PI));
function hash(n) {
  n = (n | 0) ^ 0x9e3779b9;
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
const hash2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
const hash3 = (a, b, c) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791));
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function vnoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  return lerp(hash2(i, seed), hash2(i + 1, seed), smooth(f)) * 2 - 1;
}
// Stop-motion placement jitter: tiny per-frame nudge, stable within a 12fps frame.
function jit(id, amp = 1) {
  return (hash2(E.f, id) * 2 - 1) * amp;
}

// ---------- colour ----------
function hexToRgb(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const _rgbCache = new Map();
function rgbOf(c) {
  let v = _rgbCache.get(c);
  if (!v) { v = hexToRgb(c); _rgbCache.set(c, v); }
  return v;
}
function mix(c1, c2, t) {
  const a = rgbOf(c1), b = rgbOf(c2);
  t = clamp(t);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}
function mixA(c1, c2, t, alpha) {
  const a = rgbOf(c1), b = rgbOf(c2);
  t = clamp(t);
  return `rgba(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))},${alpha})`;
}
function rgba(c, a) {
  const v = rgbOf(c);
  return `rgba(${v[0]},${v[1]},${v[2]},${a})`;
}
// Friendly → dark palette pairs. pc('sky') resolves against E.D (darkness 0..1).
const PAL = {
  cream: ['#f4ecd8', '#d9cfb8'],
  sky: ['#a6d4e3', '#14203c'],
  skyLow: ['#fbe6bf', '#2c2140'],
  mint: ['#a9d9bb', '#1b5546'],
  teal: ['#5cb2a5', '#0e4b42'],
  coral: ['#f1927a', '#7b2d3b'],
  butter: ['#f7d46a', '#a8893c'],
  pink: ['#f5b7b5', '#5a2a41'],
  wood: ['#b47c4f', '#4c3023'],
  woodDark: ['#7d5233', '#2e1d16'],
  grass: ['#9fcf7b', '#23463a'],
  grassDark: ['#78b35e', '#173328'],
  cloud: ['#fffdf7', '#6c7488'],
  cloudShade: ['#e3eef2', '#4a5266'],
  sea: ['#3f86c6', '#0f2346'],
  seaLight: ['#7cc0e6', '#1c3a64'],
  sun: ['#ffd25e', '#c9a54a'],
  wall: ['#f3dfc1', '#3a3346'],
  wall2: ['#e9c9a4', '#2b2638'],
  floor: ['#c98f5f', '#2a1f22'],
  red: ['#e2574c', '#8f2430'],
  ink: ['#2b2420', '#0b0b10'],
};
function pc(name, extra = 0) {
  const p = PAL[name];
  return mix(p[0], p[1], E.D + extra);
}

// ---------- textures ----------
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function makePaperTexture(size = 512) {
  const c = makeCanvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size), d = img.data;
  const r = rng(1234);
  // cloudy low-frequency variation
  const lf = (x, y) => {
    let v = 0, amp = 1, fx = 1 / 64;
    for (let o = 0; o < 4; o++) {
      const xi = x * fx, yi = y * fx;
      const x0 = Math.floor(xi), y0 = Math.floor(yi), tx = smooth(xi - x0), ty = smooth(yi - y0);
      const wrap = Math.round(size * fx);
      const h00 = hash2(((x0 % wrap) + wrap) % wrap, (((y0 % wrap) + wrap) % wrap) + o * 999);
      const h10 = hash2((((x0 + 1) % wrap) + wrap) % wrap, (((y0 % wrap) + wrap) % wrap) + o * 999);
      const h01 = hash2(((x0 % wrap) + wrap) % wrap, ((((y0 + 1) % wrap) + wrap) % wrap) + o * 999);
      const h11 = hash2((((x0 + 1) % wrap) + wrap) % wrap, ((((y0 + 1) % wrap) + wrap) % wrap) + o * 999);
      v += amp * lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), ty);
      amp *= 0.5; fx *= 2;
    }
    return v / 1.875;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let v = 246 - lf(x, y) * 22 - r() * 10;
      if (r() < 0.004) v -= 35 * r();
      d[i] = v; d[i + 1] = v - 2; d[i + 2] = v - 6; d[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  // fibres
  g.lineCap = 'round';
  for (let k = 0; k < 900; k++) {
    const x = r() * size, y = r() * size, a = r() * TAU, l = 6 + r() * 22;
    g.strokeStyle = r() < 0.5 ? `rgba(120,100,80,${0.05 + r() * 0.08})` : `rgba(255,255,255,${0.15 + r() * 0.2})`;
    g.lineWidth = 0.5 + r() * 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
    // wrap copies so the tile is seamless-ish
    for (const [ox, oy] of [[size, 0], [-size, 0], [0, size], [0, -size]]) {
      if (x + ox > -30 && x + ox < size + 30 && y + oy > -30 && y + oy < size + 30) {
        g.beginPath();
        g.moveTo(x + ox, y + oy);
        g.quadraticCurveTo(x + ox + Math.cos(a + 0.4) * l * 0.5, y + oy + Math.sin(a + 0.4) * l * 0.5, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
        g.stroke();
      }
    }
  }
  return c;
}
function makeGrain(size = 256, seed = 7) {
  const c = makeCanvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size), d = img.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const v = 128 + (r() - 0.5) * 90;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
// Crayon pattern: colour with soft, streaky transparent grain → waxy stroke texture.
// Generated small and upscaled with smoothing so the grain stays soft (cheap to encode).
const _crayonCache = new Map();
function crayon(color) {
  let p = _crayonCache.get(color);
  if (p) return p;
  const s = 64, c = makeCanvas(s, s), g = c.getContext('2d');
  const img = g.createImageData(s, s), d = img.data, r = rng(color.length * 31 + color.charCodeAt(1));
  const [R, G, B] = rgbOf(color);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const streak = 0.5 + 0.5 * Math.sin(x * 0.9 + y * 0.35 + hash2(y, 3) * 3);
      const a = r() < 0.18 + 0.22 * streak ? 40 : 200 + r() * 55;
      d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = a;
    }
  g.putImageData(img, 0, 0);
  const big = makeCanvas(s * 3, s * 3), bg = big.getContext('2d');
  bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = 'high';
  bg.drawImage(c, 0, 0, s * 3, s * 3);
  p = ctx.createPattern(big, 'repeat');
  _crayonCache.set(color, p);
  return p;
}

// ---------- init ----------
function initEngine(canvas) {
  E.canvas = canvas;
  ctx = canvas.getContext('2d');
  E.texCanvas = makePaperTexture(512);
  E.texPat = ctx.createPattern(E.texCanvas, 'repeat');
  E.grain = [0, 1, 2, 3].map((i) => ctx.createPattern(makeGrain(256, 11 + i), 'repeat'));
  E.bgTexPat = ctx.createPattern(E.texCanvas, 'repeat');
}

// ---------- shape builders (add sub-paths to current path) ----------
function pRect(c, x, y, w, h) { c.rect(x, y, w, h); }
function pRRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
// Hand-cut circle/ellipse: low-frequency wobble so it reads as scissor-cut.
function pBlob(c, cx, cy, rx, ry, wob = 0.025, seed = 1, n = 40, rot = 0) {
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + wob * (vnoise(a * 2.2 + seed * 7.3, seed) + 0.5 * vnoise(a * 5.1, seed + 9));
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    const X = cx + x * Math.cos(rot) - y * Math.sin(rot), Y = cy + x * Math.sin(rot) + y * Math.cos(rot);
    i === 0 ? c.moveTo(X, Y) : c.lineTo(X, Y);
  }
  c.closePath();
}
// Polygon with slightly wobbly straight cuts.
function pPoly(c, pts, wob = 1.2, seed = 1) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.round(len / 40));
    const nx = -(y1 - y0) / (len || 1), ny = (x1 - x0) / (len || 1);
    for (let s = 0; s < steps; s++) {
      const u = s / steps, o = s === 0 ? 0 : vnoise(i * 13.1 + u * 3.3, seed) * wob;
      const X = lerp(x0, x1, u) + nx * o, Y = lerp(y0, y1, u) + ny * o;
      i === 0 && s === 0 ? c.moveTo(X, Y) : c.lineTo(X, Y);
    }
  }
  c.closePath();
}
function pStar(c, cx, cy, r1, r2, n, rot = 0) {
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * TAU - Math.PI / 2, r = i % 2 ? r2 : r1;
    i === 0 ? c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  c.closePath();
}
// Scalloped cloud outline built from overlapping bumps.
function pCloud(c, cx, cy, w, h, seed = 1, bumps = 6) {
  const r = rng(seed);
  const pts = [];
  const n = bumps;
  // base ellipse-ish with bumps on top
  c.moveTo(cx - w / 2, cy + h * 0.25);
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n;
    const x0 = cx - w / 2 + u0 * w, x1 = cx - w / 2 + u1 * w;
    const mid = (u0 + u1) / 2;
    const lift = Math.sin(mid * Math.PI) * h * (0.75 + r() * 0.35);
    c.bezierCurveTo(x0, cy - lift * 0.9, x1, cy - lift * 0.9, x1, cy + (i === n - 1 ? h * 0.25 : -h * 0.05 * Math.sin(u1 * Math.PI)));
  }
  c.bezierCurveTo(cx + w / 2 + h * 0.15, cy + h * 0.55, cx + w * 0.3, cy + h * 0.6, cx, cy + h * 0.55);
  c.bezierCurveTo(cx - w * 0.3, cy + h * 0.6, cx - w / 2 - h * 0.15, cy + h * 0.55, cx - w / 2, cy + h * 0.25);
  c.closePath();
}

// ---------- paper drawing ----------
// build: function(ctx) adding sub-paths, or a Path2D.
function paper(build, fill, o = {}) {
  const c = ctx;
  c.save();
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  const isPath = build instanceof Path2D;
  if (!isPath) { c.beginPath(); build(c); }
  const rule = o.rule || 'nonzero';
  const d = o.d ?? 1;
  if (d > 0 && E.shadows) {
    const s = E.shadowScale * (o.ss ?? 1);
    c.shadowColor = o.sc || `rgba(28,18,8,${Math.min(0.55, 0.22 + 0.06 * d)})`;
    c.shadowBlur = (3 + d * 4.5) * s;
    c.shadowOffsetX = d * 1.6 * s * E.lightX;
    c.shadowOffsetY = d * 3.2 * s;
  }
  c.fillStyle = fill;
  isPath ? c.fill(build, rule) : c.fill(rule);
  c.shadowColor = 'transparent';
  const tx = o.tex ?? 1;
  if (tx > 0 && E.tex) {
    const m = c.getTransform();
    const sc = Math.hypot(m.a, m.b) || 1;
    E.texPat.setTransform(new DOMMatrix().translateSelf(o.tx ?? 37 * (o.seed || 1), o.ty ?? 53 * (o.seed || 1)).scaleSelf((o.texScale || 1) / sc));
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha *= tx;
    c.fillStyle = E.texPat;
    isPath ? c.fill(build, rule) : c.fill(rule);
  }
  if (o.edge) {
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = (o.alpha ?? 1) * (o.edgeA ?? 0.55);
    c.strokeStyle = o.edge;
    c.lineWidth = o.edgeW ?? 1.6;
    isPath ? c.stroke(build) : c.stroke();
  }
  c.restore();
}
// Stroke-only helper (for lines, stitches, pointer rods)
function line(pts, color, w = 3, o = {}) {
  const c = ctx;
  c.save();
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  if (o.d && E.shadows) {
    const s = E.shadowScale;
    c.shadowColor = o.sc || 'rgba(28,18,8,0.3)';
    c.shadowBlur = (2 + o.d * 3) * s; c.shadowOffsetX = o.d * 1.4 * s; c.shadowOffsetY = o.d * 2.6 * s;
  }
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = o.cap || 'round'; c.lineJoin = 'round';
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (o.close) c.closePath();
  c.stroke();
  c.restore();
}
// Brass split-pin fastener (puppet joint)
function splitPin(x, y, r = 7, metal = 'brass') {
  const base = metal === 'silver' ? '#c3c8d0' : '#c9a24a', hi = metal === 'silver' ? '#f4f6fa' : '#f3dc93', lo = metal === 'silver' ? '#7d838e' : '#8a6a25';
  const c = ctx;
  c.save();
  if (E.shadows) { c.shadowColor = 'rgba(20,12,4,0.45)'; c.shadowBlur = 3 * E.shadowScale; c.shadowOffsetX = 1 * E.shadowScale; c.shadowOffsetY = 2 * E.shadowScale; }
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, hi); g.addColorStop(0.55, base); g.addColorStop(1, lo);
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.restore();
}
// Text cut from paper
function ptext(str, x, y, font, fill, o = {}) {
  const c = ctx;
  c.save();
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  c.font = font;
  c.textAlign = o.align || 'center';
  c.textBaseline = o.base || 'alphabetic';
  if (o.ls != null) c.letterSpacing = o.ls + 'px';
  const d = o.d ?? 1;
  if (o.outline) {
    c.lineJoin = 'round';
    c.strokeStyle = o.outline; c.lineWidth = o.outlineW || 10;
    if (d > 0 && E.shadows) {
      const s = E.shadowScale;
      c.shadowColor = o.sc || 'rgba(28,18,8,0.4)'; c.shadowBlur = (3 + d * 4) * s; c.shadowOffsetX = d * 1.5 * s; c.shadowOffsetY = d * 3 * s;
    }
    c.strokeText(str, x, y);
    c.shadowColor = 'transparent';
  } else if (d > 0 && E.shadows) {
    const s = E.shadowScale;
    c.shadowColor = o.sc || 'rgba(28,18,8,0.4)'; c.shadowBlur = (3 + d * 4) * s; c.shadowOffsetX = d * 1.5 * s; c.shadowOffsetY = d * 3 * s;
  }
  c.fillStyle = fill;
  c.fillText(str, x, y);
  c.shadowColor = 'transparent';
  if ((o.tex ?? 0.8) > 0 && E.tex) {
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha *= o.tex ?? 0.8;
    E.texPat.setTransform(new DOMMatrix().translateSelf(x * 0.37, y * 0.53));
    c.fillStyle = E.texPat;
    c.fillText(str, x, y);
  }
  c.restore();
}
function measure(str, font, ls) {
  ctx.save(); ctx.font = font; if (ls != null) ctx.letterSpacing = ls + 'px';
  const w = ctx.measureText(str).width; ctx.restore();
  return w;
}

// ---------- transforms ----------
function push(x = 0, y = 0, rot = 0, sx = 1, sy = sx) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
}
function pop() { ctx.restore(); }
// Draw fn inside a scaled frame while keeping shadows proportional.
function scaled(s, fn) {
  const prev = E.shadowScale;
  E.shadowScale = prev * s;
  try { fn(); } finally { E.shadowScale = prev; }
}
// Camera: cam = {x, y, z, r}. Parallax p: 1 = world layer, 0 = screen-fixed.
function withCam(cam, p, fn) {
  ctx.save();
  const z = lerp(1, cam.z ?? 1, p);
  ctx.translate(W / 2, H / 2);
  if (cam.r) ctx.rotate(cam.r * p);
  ctx.scale(z, z);
  ctx.translate(-lerp(W / 2, cam.x ?? W / 2, p), -lerp(H / 2, cam.y ?? H / 2, p));
  const prev = E.shadowScale;
  E.shadowScale = prev * z;
  try { fn(); } finally { E.shadowScale = prev; ctx.restore(); }
}

// ---------- backgrounds & post ----------
function paperBackdrop(color, o = {}) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  if (E.tex) {
    E.bgTexPat.setTransform(new DOMMatrix().translateSelf(o.tx || 0, o.ty || 0).scaleSelf(o.scale || 1.4));
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = o.tex ?? 0.85;
    ctx.fillStyle = E.bgTexPat;
    ctx.fillRect(-W, -H, W * 3, H * 3);
  }
  ctx.restore();
}
function vignette(strength = 0.35, color = '#120a04') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(1, rgba(color, strength));
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function grain(amount = 0.07) {
  const p = E.grain[E.f % 4];
  p.setTransform(new DOMMatrix().translateSelf(hash2(E.f, 1) * 256, hash2(E.f, 2) * 256));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amount;
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function scanlines(alpha = 0.12, gap = 4, x = 0, y = 0, w = W, h = H) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let yy = y; yy < y + h; yy += gap) ctx.fillRect(x, yy, w, gap / 2);
  ctx.restore();
}
// Analog TV static noise in a rect
function staticNoise(x, y, w, h, alpha = 0.5, seed = 0) {
  const p = E.grain[(E.f + seed) % 4];
  p.setTransform(new DOMMatrix().translateSelf(hash2(E.f, 5 + seed) * 256, hash2(E.f, 6 + seed) * 256).scaleSelf(1.5, 1));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
// Colour wash over everything (e.g. emerald grade). mode: 'multiply','overlay','color', ...
function wash(color, alpha, mode = 'multiply') {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
