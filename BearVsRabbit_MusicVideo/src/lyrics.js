'use strict';
// Two lyric styles:
//  BEAR  -> "Gold Stamp": Bungee + Bungee Inline layered, 3D brown extrusion, words slam in on their beat
//           with spark bursts; the line drops away like loose stuffing when the next bar starts.
//  RABBIT-> "VHS Closed Caption": VT323 type-on inside black 90s caption boxes, RGB split, blinking
//           block cursor, tracking-glitch slices; the line collapses like a CRT switching off.
const U = require('./util');

const STYLE = {
  ted: { font: 'Bungee', size: 66, maxW: 1600, rowGap: 1.18, baseY: 985, upper: true, space: 0.36 },
  floppy: { font: 'VT323', size: 84, maxW: 1560, rowGap: 1.02, baseY: 1000, upper: true, space: 0.45 },
};
const RHYME = (line, i) => i === line.words.length - 1;
const cache = new Map();

function layout(ctx, line, key, who) {
  if (cache.has(key)) return cache.get(key);
  const st = STYLE[who];
  let size = st.size, rows, words;
  for (let attempt = 0; attempt < 8; attempt++) {
    ctx.font = `${size}px ${st.font}`;
    const space = size * st.space;
    words = line.words.map((w, i) => {
      const text = st.upper ? w.w.toUpperCase() : w.w;
      return { text, t: w.t, w: ctx.measureText(text).width, i };
    });
    const total = words.reduce((a, w) => a + w.w, 0) + space * (words.length - 1);
    if (total <= st.maxW) { rows = [words]; }
    else {
      // balanced two-row split
      let best = null;
      for (let k = 1; k < words.length; k++) {
        const a = words.slice(0, k), b = words.slice(k);
        const wa = a.reduce((s, w) => s + w.w, 0) + space * (a.length - 1);
        const wb = b.reduce((s, w) => s + w.w, 0) + space * (b.length - 1);
        const score = Math.max(wa, wb) + Math.abs(wa - wb) * 0.15;
        if (!best || score < best.score) best = { score, a, b, wa, wb };
      }
      rows = [best.a, best.b];
      if (Math.max(best.wa, best.wb) > st.maxW) { size *= 0.92; continue; }
    }
    break;
  }
  const space = size * st.space;
  const rowH = size * st.rowGap;
  const out = { size, rows: [], words: [], space };
  rows.forEach((row, r) => {
    const w = row.reduce((s, x) => s + x.w, 0) + space * (row.length - 1);
    let x = 960 - w / 2;
    const y = st.baseY - (rows.length - 1 - r) * rowH;
    const R = { x0: x, x1: x + w, y, words: [] };
    for (const wd of row) {
      const o = Object.assign({}, wd, { x, y, row: r });
      out.words.push(o); R.words.push(o);
      x += wd.w + space;
    }
    out.rows.push(R);
  });
  out.words.sort((a, b) => a.i - b.i);
  cache.set(key, out);
  return out;
}

// ------------------------------------------------------------------ BEAR / gold stamp
function tedWord(ctx, text, size, emph, active, flash) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const yb = size * 0.36; // baseline offset so (0,0) is the visual centre
  ctx.font = `${size}px Bungee`;
  // soft drop shadow + extrusion
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#240d02'; ctx.fillText(text, 7, yb + 9);
  ctx.restore();
  for (let k = 7; k >= 1; k--) {
    ctx.fillStyle = k > 4 ? '#2c1204' : U.mix('#6b3510', '#3a1806', (k - 1) / 4);
    ctx.fillText(text, k * 0.95, yb + k * 1.25);
  }
  ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.13; ctx.strokeStyle = '#2a0f03';
  ctx.strokeText(text, 0, yb);
  // stripe colour underneath, face on top via the Inline cut
  ctx.save();
  if (active) { ctx.shadowColor = emph ? 'rgba(255,80,40,0.95)' : 'rgba(255,170,50,0.9)'; ctx.shadowBlur = 30; }
  ctx.fillStyle = emph ? '#fff0e6' : '#fff7de';
  ctx.fillText(text, 0, yb);
  ctx.restore();
  const g = ctx.createLinearGradient(0, -size * 0.45, 0, size * 0.4);
  if (emph) { g.addColorStop(0, '#ffe0c4'); g.addColorStop(0.45, '#ff6b35'); g.addColorStop(1, '#c4161c'); }
  else { g.addColorStop(0, '#fff2b5'); g.addColorStop(0.45, '#ffc53a'); g.addColorStop(1, '#ea7410'); }
  ctx.font = `${size}px 'Bungee Inline'`;
  ctx.fillStyle = g;
  ctx.fillText(text, 0, yb);
  // glossy top sheen
  ctx.save();
  ctx.beginPath(); ctx.rect(-2000, -size, 4000, size * 0.78); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillText(text, 0, yb);
  ctx.restore();
  if (flash > 0.01) {
    ctx.font = `${size}px Bungee`;
    ctx.fillStyle = `rgba(255,255,255,${flash})`;
    ctx.fillText(text, 0, yb);
  }
}

function drawTedLine(ctx, line, lay, t, exitT, opts = {}) {
  const words = lay.words;
  ctx.save();
  // impact shake when a word lands
  let shake = 0;
  for (const w of words) { const a = t - w.t - 0.06; if (a > 0 && a < 0.12) shake = Math.max(shake, (1 - a / 0.12) * 5); }
  if (shake) ctx.translate((U.hash(Math.floor(t * 60), 1) - 0.5) * shake, (U.hash(Math.floor(t * 60), 2) - 0.5) * shake);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const age = t - w.t;
    if (age < 0) continue;
    const enter = U.clamp(age / 0.24);
    let s = U.lerp(2.4, 1, U.easeOutBack(enter, 2.2));
    let alpha = U.clamp(age / 0.05);
    let rot = (U.hash(i + line.idx * 31, 5) - 0.5) * 0.4 * (1 - U.easeOutCubic(enter));
    let dy = -40 * (1 - U.easeOutCubic(enter)), dx = 0;
    const next = i + 1 < words.length ? words[i + 1].t : exitT;
    const active = t < next;
    if (active) s *= 1 + 0.07 * U.clamp(1 - (age - 0.24) / 0.5);
    if (t > exitT) {
      const e = (t - exitT - i * 0.012) / 0.3;
      if (e > 0) {
        if (e >= 1) continue;
        dy += 700 * e * e; dx += (U.hash(i, 9) - 0.5) * 160 * e;
        rot += (U.hash(i, 7) - 0.5) * 2.2 * e; alpha *= 1 - U.easeInCubic(e);
      }
    }
    const cx = w.x + w.w / 2, cy = w.y - lay.size * 0.36;
    ctx.save();
    ctx.globalAlpha = alpha * (opts.alpha == null ? 1 : opts.alpha);
    ctx.translate(cx + dx, cy + dy);
    ctx.rotate(rot);
    ctx.scale(s, s);
    tedWord(ctx, w.text, lay.size, RHYME(line, i), active && t <= exitT, U.clamp(1 - age / 0.12) * 0.9);
    ctx.restore();
    // spark burst on landing
    if (age < 0.55 && t < exitT) sparks(ctx, cx, cy, age, i + line.idx * 17, lay.size, RHYME(line, i));
  }
  ctx.restore();
}

function sparks(ctx, cx, cy, age, seed, size, emph) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const n = emph ? 14 : 9;
  for (let k = 0; k < n; k++) {
    const a = U.hash(seed * 13 + k, 3) * U.TAU;
    const sp = 260 + U.hash(seed * 7 + k, 4) * 420;
    const x = cx + Math.cos(a) * sp * age * (1 - age * 0.6);
    const y = cy + Math.sin(a) * sp * age * (1 - age * 0.6) + 700 * age * age;
    const life = 1 - age / 0.55;
    const r = (2 + U.hash(seed + k, 6) * 3.5) * life;
    ctx.fillStyle = k % 3 === 0 ? `rgba(255,255,255,${life})` : emph ? `rgba(255,110,60,${life})` : `rgba(255,200,80,${life})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU); ctx.fill();
    if (k % 4 === 0) { // 4-point glint
      ctx.strokeStyle = `rgba(255,240,200,${life * 0.8})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - r * 3, y); ctx.lineTo(x + r * 3, y); ctx.moveTo(x, y - r * 3); ctx.lineTo(x, y + r * 3); ctx.stroke();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ RABBIT / VHS closed caption
function typeDur(words, i, exitT) {
  const next = i + 1 < words.length ? words[i + 1].t : exitT;
  return U.clamp((next - words[i].t) * 0.85, 0.06, 0.32);
}

function drawFloppyLine(ctx, line, lay, t, exitT, frame, opts = {}) {
  const words = lay.words, size = lay.size;
  // CRT-off exit
  let sy = 1, bright = 0;
  if (t > exitT) {
    const e = (t - exitT) / 0.2;
    if (e >= 1) return;
    sy = 1 - U.easeInCubic(e) * 0.97; bright = e;
  }
  const top = lay.rows[0].y - size * 0.8, bot = lay.rows[lay.rows.length - 1].y + size * 0.22;
  const cy = (top + bot) / 2;
  ctx.save();
  ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
  ctx.translate(960, cy); ctx.scale(1 + bright * 0.15, sy); ctx.translate(-960, -cy);
  ctx.font = `${size}px VT323`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const charW = ctx.measureText('M').width;

  // visible text per word
  const vis = words.map((w, i) => {
    const age = t - w.t;
    if (age < 0) return 0;
    return Math.min(w.text.length, Math.ceil(w.text.length * U.clamp(age / typeDur(words, i, exitT))));
  });
  let lastVis = -1;
  vis.forEach((v, i) => { if (v > 0) lastVis = i; });

  const glitchOn = U.hash(Math.floor(t * 9), 77) < 0.09;
  const band = glitchOn ? { y: top + U.hash(Math.floor(t * 9), 78) * (bot - top), h: 12 + U.hash(Math.floor(t * 9), 79) * 26, dx: (U.hash(Math.floor(t * 9), 80) - 0.5) * 70 } : null;

  const drawContent = (dxBand) => {
    for (const R of lay.rows) {
      const jit = (U.hash(frame * 3 + R.y, 11) - 0.5) * 3 + dxBand;
      // caption box grows with the typed text
      let xEnd = null;
      for (const w of R.words) { const v = vis[w.i]; if (v > 0) xEnd = w.x + (v / w.text.length) * w.w; }
      if (xEnd == null) continue;
      const pad = size * 0.22;
      ctx.fillStyle = 'rgba(7,3,18,0.86)';
      ctx.fillRect(R.x0 - pad + jit, R.y - size * 0.74, xEnd - R.x0 + pad * 2, size * 0.92);
      for (const w of R.words) {
        const v = vis[w.i];
        if (!v) continue;
        const txt = w.text.slice(0, v);
        const x = w.x + jit;
        const emph = RHYME(line, w.i);
        const active = w.i === lastVis && t <= exitT;
        // RGB split
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,40,200,0.85)'; ctx.fillText(txt, x - 3.5, R.y);
        ctx.fillStyle = 'rgba(30,220,255,0.85)'; ctx.fillText(txt, x + 3.5, R.y + 1);
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.shadowColor = emph ? 'rgba(255,90,220,0.95)' : 'rgba(150,110,255,0.9)'; ctx.shadowBlur = active ? 22 : 12;
        ctx.fillStyle = emph ? '#ff8eea' : active ? '#ffffff' : '#dfe6ff';
        ctx.fillText(txt, x, R.y);
        ctx.restore();
        if (active) {
          // magenta underline on the word being spoken
          ctx.fillStyle = 'rgba(255,60,210,0.9)';
          ctx.fillRect(x, R.y + 6, (v / w.text.length) * w.w, 4);
        }
      }
    }
    // blinking block cursor after the newest character
    if (lastVis >= 0 && t <= exitT) {
      const w = words[lastVis];
      const v = vis[lastVis];
      const cx = w.x + (v / w.text.length) * w.w + 4 + dxBand;
      if (Math.floor(t * 7) % 2 === 0 || v < w.text.length) {
        ctx.fillStyle = 'rgba(255,50,210,0.95)';
        ctx.fillRect(cx, w.y - size * 0.6, charW * 0.55, size * 0.66);
      }
    }
  };
  if (!band) drawContent(0);
  else {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, band.y); ctx.rect(0, band.y + band.h, 1920, 1080); ctx.clip(); drawContent(0); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, band.y, 1920, band.h); ctx.clip(); drawContent(band.dx);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, band.y, 1920, band.h); ctx.restore();
  }
  if (bright > 0) {
    ctx.fillStyle = `rgba(230,240,255,${bright * 0.9})`;
    ctx.fillRect(lay.rows[0].x0 - 40, top, 1920 - 2 * (lay.rows[0].x0 - 40), bot - top);
  }
  ctx.restore();
}

module.exports = { layout, drawTedLine, drawFloppyLine, tedWord, STYLE };
