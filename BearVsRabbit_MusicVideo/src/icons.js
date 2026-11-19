'use strict';
// Symbol pop-ups keyed to lyric words. Each icon is built from Path2D parts in a 100x100 box
// centred on 0,0 and tagged with a fill role; the two speakers render them differently:
//   bear   -> die-cut gold sticker (cream border, brown ink, warm fills)
//   rabbit -> neon VHS line art (cyan/magenta split strokes, glow)
const { Path2D } = require('@napi-rs/canvas');
const U = require('./util');

function P() { return new Path2D(); }
function circle(x, y, r) { const p = P(); p.arc(x, y, r, 0, U.TAU); return p; }
function rr(x, y, w, h, r) {
  const p = P();
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); p.closePath();
  return p;
}
function poly(pts) { const p = P(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; }
function line(pts) { const p = P(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); return p; }
function starPts(R, r, n = 5, cx = 0, cy = 0) {
  const o = [];
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, q = i % 2 ? r : R; o.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
  return o;
}
function heart(x, y, s) {
  const p = P();
  p.moveTo(x, y + s * 0.9);
  p.bezierCurveTo(x - s * 1.7, y - s * 0.15, x - s * 0.75, y - s * 1.45, x, y - s * 0.45);
  p.bezierCurveTo(x + s * 0.75, y - s * 1.45, x + s * 1.7, y - s * 0.15, x, y + s * 0.9);
  p.closePath();
  return p;
}

const ICONS = {
  star: () => [{ p: poly(starPts(46, 20)), k: 'main' }, { p: line([[-40, 40], [-14, 14]]), k: 'line' }],
  tv: () => {
    const ant = line([[-18, -48], [0, -30], [20, -50]]);
    return [{ p: ant, k: 'line' }, { p: rr(-46, -30, 92, 66, 12), k: 'dark' }, { p: rr(-36, -22, 60, 48, 8), k: 'light' },
      { p: circle(34, -12, 4), k: 'alt' }, { p: circle(34, 4, 4), k: 'alt' }, { p: line([[-30, 36], [-36, 46]]), k: 'line' }, { p: line([[30, 36], [36, 46]]), k: 'line' }];
  },
  camcorder: () => [{ p: rr(-44, -22, 62, 44, 8), k: 'dark' }, { p: poly([[18, -12], [44, -24], [44, 24], [18, 12]]), k: 'main' },
    { p: rr(-30, -36, 34, 14, 5), k: 'dark' }, { p: circle(-30, 0, 9), k: 'alt' }],
  cassette: () => [{ p: rr(-46, -30, 92, 60, 7), k: 'main' }, { p: rr(-30, -18, 60, 24, 5), k: 'light' }, { p: circle(-14, -6, 7), k: 'dark' }, { p: circle(14, -6, 7), k: 'dark' },
    { p: poly([[-24, 30], [-18, 16], [18, 16], [24, 30]]), k: 'dark' }],
  beer: () => [{ p: rr(-30, -24, 46, 66, 8), k: 'main' }, { p: line([[16, -10], [32, -10], [32, 22], [16, 22]]), k: 'line' },
    { p: (() => { const p = P(); p.arc(-22, -26, 12, 0, U.TAU); p.arc(-6, -32, 13, 0, U.TAU); p.arc(10, -26, 11, 0, U.TAU); return p; })(), k: 'light' },
    { p: line([[-18, -8], [-18, 30]]), k: 'line' }, { p: line([[-4, -8], [-4, 30]]), k: 'line' }],
  wine: () => [{ p: (() => { const p = P(); p.moveTo(-28, -44); p.lineTo(28, -44); p.bezierCurveTo(30, -4, 14, 6, 0, 6); p.bezierCurveTo(-14, 6, -30, -4, -28, -44); p.closePath(); return p; })(), k: 'light' },
    { p: (() => { const p = P(); p.moveTo(-26, -26); p.lineTo(26, -26); p.bezierCurveTo(24, -2, 12, 4, 0, 4); p.bezierCurveTo(-12, 4, -24, -2, -26, -26); p.closePath(); return p; })(), k: 'alt' },
    { p: line([[0, 6], [0, 38]]), k: 'line' }, { p: (() => { const p = P(); p.ellipse(0, 42, 22, 6, 0, 0, U.TAU); return p; })(), k: 'main' }],
  letter: () => [{ p: rr(-46, -30, 92, 60, 6), k: 'light' }, { p: line([[-46, -30], [0, 6], [46, -30]]), k: 'line' }, { p: heart(18, 14, 12), k: 'alt' }],
  phone: () => [{ p: (() => { const p = P(); p.moveTo(-40, -20); p.quadraticCurveTo(0, -46, 40, -20); p.lineTo(30, -4); p.quadraticCurveTo(0, -20, -30, -4); p.closePath(); return p; })(), k: 'main' },
    { p: rr(-34, 0, 68, 42, 10), k: 'dark' }, { p: circle(0, 20, 13), k: 'light' }, { p: circle(0, 20, 4), k: 'dark' }],
  boot: () => [{ p: poly([[-26, -44], [6, -44], [8, 6], [42, 16], [46, 40], [-30, 40]]), k: 'main' }, { p: line([[-26, 26], [44, 26]]), k: 'line' }, { p: line([[-24, -24], [6, -24]]), k: 'line' }],
  clover: () => {
    const parts = [];
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const p = P(); const s = 15;
      const cx = Math.cos(a - Math.PI / 4) * 18, cy = Math.sin(a - Math.PI / 4) * 18 - 6;
      p.arc(cx, cy, s, 0, U.TAU);
      parts.push({ p, k: 'green' });
    }
    parts.push({ p: line([[0, 8], [8, 46]]), k: 'line' });
    return parts;
  },
  parsnip: () => [{ p: (() => { const p = P(); p.moveTo(-18, -18); p.quadraticCurveTo(0, -26, 18, -18); p.quadraticCurveTo(10, 20, 2, 48); p.quadraticCurveTo(-8, 20, -18, -18); p.closePath(); return p; })(), k: 'light' },
    { p: (() => { const p = P(); p.moveTo(-4, -20); p.quadraticCurveTo(-24, -44, -16, -52); p.quadraticCurveTo(-2, -40, 0, -22); p.moveTo(2, -22); p.quadraticCurveTo(10, -50, 22, -50); p.quadraticCurveTo(18, -34, 4, -20); return p; })(), k: 'green' },
    { p: line([[-10, 0], [-2, 2]]), k: 'line' }, { p: line([[6, 16], [-2, 18]]), k: 'line' }],
  heart: () => [{ p: heart(0, 4, 34), k: 'alt' }],
  brokenheart: () => [{ p: (() => { const p = P(); p.moveTo(-4, 34); p.bezierCurveTo(-58, 0, -30, -48, -4, -16); p.lineTo(4, -2); p.lineTo(-8, 10); p.lineTo(2, 22); p.closePath(); return p; })(), k: 'alt' },
    { p: (() => { const p = P(); p.moveTo(8, 34); p.lineTo(12, 22); p.lineTo(2, 10); p.lineTo(14, -2); p.lineTo(8, -16); p.bezierCurveTo(32, -48, 62, 0, 8, 34); p.closePath(); return p; })(), k: 'alt' }],
  glove: () => [{ p: (() => { const p = P(); p.moveTo(-30, 30); p.bezierCurveTo(-46, -10, -40, -46, 0, -46); p.bezierCurveTo(40, -46, 46, -10, 34, 14); p.lineTo(30, 30); p.closePath(); return p; })(), k: 'alt' },
    { p: (() => { const p = P(); p.ellipse(-26, 0, 14, 20, -0.3, 0, U.TAU); return p; })(), k: 'alt' }, { p: rr(-32, 28, 66, 20, 5), k: 'light' }],
  crown: () => [{ p: poly([[-44, 30], [-44, -22], [-22, 2], [0, -36], [22, 2], [44, -22], [44, 30]]), k: 'main' }, { p: circle(0, 14, 7), k: 'alt' }, { p: circle(-26, 16, 5), k: 'alt' }, { p: circle(26, 16, 5), k: 'alt' }],
  baseball: () => [{ p: circle(0, 0, 42), k: 'light' }, { p: (() => { const p = P(); p.moveTo(-26, -32); p.quadraticCurveTo(-8, 0, -26, 32); p.moveTo(26, -32); p.quadraticCurveTo(8, 0, 26, 32); return p; })(), k: 'redline' }],
  football: () => [{ p: (() => { const p = P(); p.moveTo(-48, 0); p.quadraticCurveTo(0, -46, 48, 0); p.quadraticCurveTo(0, 46, -48, 0); p.closePath(); return p; })(), k: 'brown' },
    { p: line([[-16, 0], [16, 0]]), k: 'whiteline' }, { p: line([[-8, -6], [-8, 6]]), k: 'whiteline' }, { p: line([[0, -6], [0, 6]]), k: 'whiteline' }, { p: line([[8, -6], [8, 6]]), k: 'whiteline' }],
  bolt: () => [{ p: poly([[8, -50], [-30, 6], [-4, 6], [-12, 50], [30, -8], [4, -8]]), k: 'main' }],
  pizza: () => [{ p: poly([[-40, -34], [40, -34], [0, 46]]), k: 'main' }, { p: rr(-44, -44, 88, 14, 7), k: 'brown' }, { p: circle(-12, -16, 7), k: 'alt' }, { p: circle(12, -12, 6), k: 'alt' }, { p: circle(0, 10, 6), k: 'alt' }],
  card: () => [{ p: rr(-46, -30, 92, 60, 8), k: 'main' }, { p: rr(-46, -18, 92, 12, 0), k: 'dark' }, { p: rr(-34, 4, 20, 16, 3), k: 'light' }, { p: line([[0, 14], [34, 14]]), k: 'line' }],
  gavel: () => [{ p: (() => { const p = P(); p.moveTo(-10, -2); p.lineTo(34, 42); return p; })(), k: 'thick' },
    { p: (() => { const p = P(); p.moveTo(-40, -6); p.lineTo(-6, -40); p.lineTo(10, -24); p.lineTo(-24, 10); p.closePath(); return p; })(), k: 'brown' }, { p: rr(-46, 34, 52, 12, 4), k: 'brown' }],
  gradcap: () => [{ p: poly([[-48, -8], [0, -30], [48, -8], [0, 14]]), k: 'dark' }, { p: (() => { const p = P(); p.moveTo(-26, 4); p.lineTo(-26, 26); p.quadraticCurveTo(0, 40, 26, 26); p.lineTo(26, 4); p.lineTo(0, 14); p.closePath(); return p; })(), k: 'dark' },
    { p: line([[0, -8], [36, 4], [36, 30]]), k: 'goldline' }, { p: circle(36, 32, 5), k: 'main' }],
  giftbox: () => [{ p: rr(-40, -16, 80, 58, 4), k: 'alt' }, { p: rr(-46, -30, 92, 18, 4), k: 'alt' }, { p: rr(-7, -30, 14, 72, 0), k: 'main' },
    { p: (() => { const p = P(); p.ellipse(-14, -38, 14, 8, 0.4, 0, U.TAU); p.ellipse(14, -38, 14, 8, -0.4, 0, U.TAU); return p; })(), k: 'main' }],
  bell: () => [{ p: (() => { const p = P(); p.moveTo(-40, 26); p.quadraticCurveTo(-34, 18, -32, -6); p.bezierCurveTo(-30, -44, 30, -44, 32, -6); p.quadraticCurveTo(34, 18, 40, 26); p.closePath(); return p; })(), k: 'main' }, { p: circle(0, 34, 8), k: 'dark' }, { p: rr(-6, -46, 12, 10, 3), k: 'dark' }],
};

const cache = new Map();
function getParts(name) { if (!cache.has(name)) cache.set(name, ICONS[name]()); return cache.get(name); }

const STICKER = { main: '#ffc53a', alt: '#e6382e', light: '#fff4dc', dark: '#4a2a14', green: '#3fae4a', brown: '#8a4a1c' };
function drawSticker(ctx, name) {
  const parts = getParts(name);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // die-cut white border: fat stroke of every part
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
  ctx.strokeStyle = '#fff6e4'; ctx.fillStyle = '#fff6e4'; ctx.lineWidth = 22;
  for (const q of parts) { ctx.stroke(q.p); if (!/line|thick/.test(q.k)) ctx.fill(q.p); }
  ctx.restore();
  for (const q of parts) {
    if (q.k === 'thick') { ctx.strokeStyle = '#2a1206'; ctx.lineWidth = 14; ctx.stroke(q.p); ctx.strokeStyle = '#a0612a'; ctx.lineWidth = 8; ctx.stroke(q.p); continue; }
    if (/line/.test(q.k)) {
      ctx.strokeStyle = q.k === 'redline' ? '#d22' : q.k === 'whiteline' ? '#fff' : q.k === 'goldline' ? '#ffc53a' : '#2a1206';
      ctx.lineWidth = 5; ctx.stroke(q.p); continue;
    }
    const col = STICKER[q.k] || STICKER.main;
    const g = ctx.createLinearGradient(0, -50, 0, 50);
    g.addColorStop(0, U.shade(col, 0.35)); g.addColorStop(1, U.shade(col, -0.25));
    ctx.fillStyle = g; ctx.fill(q.p);
    ctx.strokeStyle = '#2a1206'; ctx.lineWidth = 5; ctx.stroke(q.p);
  }
}

function drawNeon(ctx, name, t) {
  const parts = getParts(name);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const fl = 0.85 + 0.15 * Math.sin(t * 40);
  ctx.globalCompositeOperation = 'lighter';
  for (const [dx, col] of [[-3, 'rgba(255,40,200,0.7)'], [3, 'rgba(40,220,255,0.7)']]) {
    ctx.save(); ctx.translate(dx, 0);
    ctx.strokeStyle = col; ctx.lineWidth = 6;
    for (const q of parts) ctx.stroke(q.p);
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.shadowColor = 'rgba(170,120,255,0.95)'; ctx.shadowBlur = 24;
  for (const q of parts) {
    if (!/line|thick/.test(q.k)) { ctx.fillStyle = q.k === 'alt' ? 'rgba(255,60,200,0.22)' : 'rgba(80,200,255,0.12)'; ctx.fill(q.p); }
    ctx.strokeStyle = `rgba(240,248,255,${fl})`; ctx.lineWidth = 3.2; ctx.stroke(q.p);
  }
  ctx.restore();
}

/** pop: { name, t0, who, x, y, size } */
function drawPop(ctx, pop, t) {
  const age = t - pop.t0, life = pop.life || 1.7;
  if (age < 0 || age > life) return;
  const out = U.clamp((age - (life - 0.3)) / 0.3);
  ctx.save();
  ctx.translate(pop.x, pop.y - age * 18);
  if (pop.who === 'ted') {
    const s = U.easeOutElastic(U.clamp(age / 0.55)) * (1 - U.easeInCubic(out));
    ctx.rotate(Math.sin(age * 5) * 0.08 * (1 - age / life) + (pop.rot || 0));
    ctx.scale(s * pop.size / 100, s * pop.size / 100);
    drawSticker(ctx, pop.name);
    // little star sparkles orbiting
    ctx.fillStyle = `rgba(255,236,170,${1 - out})`;
    for (let k = 0; k < 3; k++) {
      const a = age * 2.5 + (k * U.TAU) / 3;
      const x = Math.cos(a) * 70, y = Math.sin(a) * 60;
      ctx.beginPath(); starPts(9, 3.5, 4, x, y).forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
    }
  } else {
    const on = age < 0.25 ? (U.hash(Math.floor(age * 60), 4) < age * 4 ? 1 : 0.15) : 1;
    const sx = 1 + (age < 0.12 ? (0.12 - age) * 6 : 0);
    ctx.globalAlpha = on * (1 - out);
    ctx.scale(sx * pop.size / 100, (pop.size / 100) * (1 - out * 0.9));
    ctx.translate((U.hash(Math.floor(t * 30), 8) - 0.5) * 4, 0);
    drawNeon(ctx, pop.name, t);
  }
  ctx.restore();
}

// Hand-placed triggers: [line prefix, word (normalised), icon]
const TRIGGERS = [
  ["I'm a Christmas wish", 'christmas', 'star'], ["You're a clearance-bin", 'beer', 'beer'], ['I was on Johnny Carson', 'show', 'tv'],
  ['You did a camcorder', 'camcorder', 'camcorder'], ['Your answering-machine', 'answering', 'cassette'], ['Four years writing Drew', 'letter', 'letter'],
  ['You ran a 1-900', '1', 'phone'], ['Six failed marriages', 'shoe', 'boot'], ['Ross cut off', 'lucky', 'clover'],
  ['Yeah, I fooled around', 'produce', 'parsnip'], ['You got Jack\'s divorce', 'booze', 'beer'], ["I've got Tami-Lynn", 'love', 'heart'],
  ['A miserable old prick', 'television', 'tv'], ['You call yourself a legend', 'legend', 'crown'], ["You're an imaginary heckler", 'boxing', 'glove'],
  ["Well, well! Santa's", 'santas', 'giftbox'], ['A talking Christmas present', 'christmas', 'star'], ['You were on The Tonight Show', 'tonight', 'tv'],
  ['Sabotaging every', 'patience', 'brokenheart'], ['Then you dragged him off', 'flash', 'bolt'], ['Donny ripped you', 'fenway', 'baseball'],
  ["Took another woman's", 'star', 'star'], ['Massachusetts took', 'marriage', 'brokenheart'], ['Even Discover', 'discover', 'card'],
  ["Papa Gino's", 'papa', 'pizza'], ['And your soul needed', 'hearing', 'gavel'], ['Your sex manual', 'parsnip', 'parsnip'],
  ['You mock my shoe-wife', 'shoe', 'boot'], ['You needed stars and lawyers', 'stars', 'star'], ['Call me a bad idea', 'drunken', 'beer'],
  ['Jack, tell your bunny', 'case', 'gavel'], ['A shooting star', 'shooting', 'star'], ['Tiffany got Harvard', 'harvard', 'gradcap'],
  ['He bought a beer', 'beer', 'beer'], ['Donny tore me up', 'fenway', 'baseball'], ['Hasbro wanted', 'hasbro', 'giftbox'],
  ['Your foot brought', 'lucky', 'clover'], ['My kid calls me Dad', 'kid', 'heart'], ['So crack another beer', 'beer', 'beer'],
  ['I loved mine', 'loved', 'heart'], ['You wrecked his shot', 'flash', 'bolt'], ['You and Tami-Lynn', 'cash', 'card'],
  ['You figured having a baby', 'baby', 'heart'], ['Sam Jones', 'brady', 'football'], ['I wrote the stories', 'stories', 'letter'],
  ['I pushed him to fight', 'fight', 'glove'], ["You needed Lori's star", 'star', 'star'], ['Both of us were born', 'chardonnay', 'wine'],
  ['Your courtroom proved', 'courtroom', 'gavel'], ['Now roll the', 'cameras', 'camcorder'], ["My voice won't make", 'playback', 'cassette'],
];
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
function buildPops(lines) {
  const pops = [];
  for (const [pre, word, icon] of TRIGGERS) {
    const li = lines.findIndex((l) => l.text.startsWith(pre));
    if (li < 0) { console.warn('icon trigger not found', pre); continue; }
    const L = lines[li];
    const w = L.words.find((x) => norm(x.w).startsWith(word)) || L.words[0];
    const k = pops.length;
    const who = L.speaker;
    // bear's stickers fly toward the rabbit's side and vice versa
    const x = who === 'ted' ? 1500 + (k % 3) * 70 : 420 - (k % 3) * 70;
    pops.push({ name: icon, t0: w.t, who, x, y: 360 + (k % 2) * 70, size: who === 'ted' ? 150 : 170, rot: (U.hash(k, 3) - 0.5) * 0.4, line: li });
  }
  return pops;
}

module.exports = { drawPop, buildPops, drawSticker, drawNeon, ICONS };
