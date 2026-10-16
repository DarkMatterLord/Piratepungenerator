// Necromantical — core utilities: math, deterministic noise, timing helpers, camera.
// Every frame must be a pure function of time t, so nothing here keeps mutable animation state.
'use strict';
const NM = (window.NM = window.NM || {});

// Scenes are drawn at a low "game" resolution and upscaled 4x with hard pixels.
NM.W = 480;
NM.H = 270;
NM.PX = 4;
NM.FW = NM.W * NM.PX; // 1920
NM.FH = NM.H * NM.PX; // 1080
NM.BAR = 0;

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const range = (a, b, x) => smooth(invLerp(a, b, x)); // smoothstep between a and b
const TAU = Math.PI * 2;
const ease = {
  inQuad: (t) => clamp(t) ** 2,
  outQuad: (t) => 1 - (1 - clamp(t)) ** 2,
  inCubic: (t) => clamp(t) ** 3,
  outCubic: (t) => 1 - (1 - clamp(t)) ** 3,
  inOutCubic: (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; },
  inOutSine: (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2,
  outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * clamp(t))),
  inExpo: (t) => (t <= 0 ? 0 : 2 ** (10 * clamp(t) - 10)),
  outBack: (t) => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
  outElastic: (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1; },
};
const mix = lerp;
Object.assign(NM, { clamp, lerp, invLerp, smooth, smoother, range, TAU, ease, mix });

// ---------- deterministic hashing / noise ----------
function hash1(n) {
  let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function hash3(x, y, z) { return hash2(x + Math.imul(z | 0, 2971215073), y - Math.imul(z | 0, 1597334677)); }
// seeded PRNG (mulberry32) — used only for building static layouts from a fixed seed
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function noise1(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
}
function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
function fbm1(x, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise1(x * f + i * 17.3); f *= 2; a *= 0.5; } return s; }
function fbm2(x, y, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise2(x * f + i * 17.3, y * f - i * 9.1); f *= 2; a *= 0.5; } return s; }
Object.assign(NM, { hash1, hash2, hash3, rng, noise1, noise2, fbm1, fbm2 });

// ---------- timing ----------
NM.T = window.TIMING; // injected by data/timing.js
NM.FPS = NM.T.fps;
NM.DUR = NM.T.duration;

// sample a per-frame audio envelope (rms | low | high | onset) at time t
NM.env = function (name, t) {
  const a = NM.T.env[name];
  const f = t * NM.FPS;
  const i = Math.floor(f);
  if (i < 0) return a[0];
  if (i >= a.length - 1) return a[a.length - 1];
  return lerp(a[i], a[i + 1], f - i);
};
function lastIndexBefore(arr, t) { // binary search: last i with arr[i] <= t
  let lo = 0, hi = arr.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; }
  return r;
}
NM.lastIndexBefore = lastIndexBefore;
// exponential pulse on each beat (0..1)
NM.beat = function (t, decay = 6) {
  const b = NM.T.beats, i = lastIndexBefore(b, t);
  if (i < 0) return 0;
  const s = clamp(NM.T.beatStrength[i], 0.3, 1.3);
  return s * Math.exp(-(t - b[i]) * decay);
};
NM.downbeat = function (t, decay = 4) {
  const b = NM.T.downbeats, i = lastIndexBefore(b, t);
  if (i < 0) return 0;
  return Math.exp(-(t - b[i]) * decay);
};
NM.beatIndex = (t) => lastIndexBefore(NM.T.beats, t);
NM.beatPhase = function (t) { // 0..1 progress through current beat
  const b = NM.T.beats, i = lastIndexBefore(b, t);
  if (i < 0 || i >= b.length - 1) return 0;
  return (t - b[i]) / (b[i + 1] - b[i]);
};
NM.BEAT = 60 / NM.T.tempo;
NM.lineAt = function (t) {
  for (const L of NM.T.lines) if (t >= L.start - 0.35 && t < L.end + 0.9) return L;
  return null;
};
// lyric line index whose display window contains t (holds until just before the next line)
NM.lineIndexAt = function (t) {
  const L = NM.T.lines;
  for (let i = 0; i < L.length; i++) {
    const s0 = L[i].start - 0.3;
    let s1 = L[i].end + 1.2;
    if (L[i + 1] && L[i + 1].start - 0.3 < s1) s1 = L[i + 1].start - 0.3;
    if (t >= s0 && t < s1) return i;
  }
  return -1;
};
NM.line = (i) => NM.T.lines[i];

// ---------- palette ----------
NM.C = {
  ink: '#05040a',
  night: '#0b0d18',
  deep: '#121628',
  steel: '#2a3350',
  mist: '#8a95b5',
  moon: '#e9ecf5',
  bone: '#ddd6c6',
  crimson: '#c4122f',
  blood: '#7a0618',
  rose: '#e01a3c',
  ember: '#ff3a3a',
  soul: '#bfe9ff',
  gold: '#ffb347',
  candle: '#ffcf7a',
  sepia: '#b89a6a',
};
NM.rgba = function (hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ---------- camera ----------
// Camera state is computed per shot from local time; apply() maps world -> screen with parallax factor p.
NM.cam = function (x = 0, y = 0, z = 1, r = 0) { return { x, y, z, r }; };
NM.applyCam = function (ctx, cam, p = 1) {
  const zp = 1 + (cam.z - 1) * p;
  ctx.translate(NM.W / 2, NM.H / 2);
  if (cam.r) ctx.rotate(cam.r * p);
  ctx.scale(zp, zp);
  ctx.translate(-cam.x * p, -cam.y * p);
};
// handheld-style shake (deterministic)
NM.shake = function (t, amt, speed = 9) {
  return { x: fbm1(t * speed + 3.1, 3) * amt, y: fbm1(t * speed + 71.7, 3) * amt, r: fbm1(t * speed * 0.7 + 13.3, 2) * amt * 0.0006 };
};

// offscreen canvas helper
NM.canvas = function (w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
};
