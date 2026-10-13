'use strict';
// Reusable cut-paper props. All coordinates in canvas units; each prop draws at its own origin.

// Wooden dowel that holds stage props (toy-theatre style)
function stick(x1, y1, x2, y2, w = 7) {
  line([[x1, y1], [x2, y2]], pc('woodDark'), w, { d: 0.8 });
  line([[x1 - 1.5, y1], [x2 - 1.5, y2]], 'rgba(255,240,210,0.22)', 1.5);
}
function wire(x1, y1, x2, y2) {
  line([[x1, y1], [x2, y2]], 'rgba(40,36,34,0.55)', 1.4);
}

// ---------- sky things ----------
function cloud(x, y, w, h, o = {}) {
  const seed = o.seed || 1;
  push(x, y, o.rot || 0, o.sx || 1, o.sy || o.sx || 1);
  if (o.stick) stick(0, h * 0.4, o.stickDx || 0, o.stick);
  const base = o.color || pc('cloud');
  const shade = o.shade || pc('cloudShade');
  paper((c) => pCloud(c, 6, h * 0.12, w * 0.96, h * 0.92, seed + 1, o.bumps || 5), shade, { d: 1.2, tex: 0.7 });
  paper((c) => pCloud(c, 0, 0, w, h, seed, o.bumps || 5), base, { d: 1.6, tex: 0.7, edge: 'rgba(255,255,255,0.9)', edgeA: 0.4 });
  if (o.silver) {
    ctx.save();
    ctx.beginPath(); pCloud(ctx, 0, 0, w, h, seed, o.bumps || 5);
    const g = ctx.createLinearGradient(-w / 2, -h, w / 2, h);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#b9c0cc'); g.addColorStop(0.5, '#f7f9fc'); g.addColorStop(0.7, '#9aa3b1'); g.addColorStop(1, '#eef1f5');
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(4, w * 0.035) * o.silver; ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }
  if (o.face) cloudFace(o.face, w, h, o);
  pop();
}
function cloudFace(kind, w, h, o) {
  const s = Math.min(w, h * 1.6) / 200;
  const ink = o.ink || pc('ink');
  const ey = -h * 0.05, ex = 26 * s;
  if (kind === 'sleep') {
    line([[-ex - 10 * s, ey], [-ex, ey + 6 * s], [-ex + 10 * s, ey]], ink, 3.5 * s);
    line([[ex - 10 * s, ey], [ex, ey + 6 * s], [ex + 10 * s, ey]], ink, 3.5 * s);
    line([[-8 * s, ey + 26 * s], [0, ey + 30 * s], [8 * s, ey + 26 * s]], ink, 3 * s);
  } else if (kind === 'stare') {
    for (const sx of [-1, 1]) {
      paper((c) => pBlob(c, sx * ex, ey, 14 * s, 14 * s, 0.04, sx + 5), '#ffffff', { d: 0.4, tex: 0.3 });
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(sx * ex + (o.lookX || 0) * 5 * s, ey + 2 * s, 6 * s, 0, TAU); ctx.fill();
    }
    line([[-10 * s, ey + 30 * s], [10 * s, ey + 30 * s]], ink, 3 * s);
  } else if (kind === 'worried') {
    for (const sx of [-1, 1]) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(sx * ex, ey, 5 * s, 0, TAU); ctx.fill(); }
    line([[-ex - 9 * s, ey - 14 * s], [-ex + 8 * s, ey - 9 * s]], ink, 3 * s);
    line([[ex + 9 * s, ey - 14 * s], [ex - 8 * s, ey - 9 * s]], ink, 3 * s);
    line([[-9 * s, ey + 28 * s], [0, ey + 23 * s], [9 * s, ey + 28 * s]], ink, 3 * s);
  } else if (kind === 'grin') {
    for (const sx of [-1, 1]) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(sx * ex, ey, 5.5 * s, 0, TAU); ctx.fill(); }
    paper((c) => { c.moveTo(-34 * s, ey + 14 * s); c.quadraticCurveTo(0, ey + 52 * s, 34 * s, ey + 14 * s); c.quadraticCurveTo(0, ey + 30 * s, -34 * s, ey + 14 * s); c.closePath(); }, '#fffdf5', { d: 0.4, tex: 0.3 });
  } else {
    for (const sx of [-1, 1]) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(sx * ex, ey, 5 * s, 0, TAU); ctx.fill(); }
    line([[-12 * s, ey + 22 * s], [0, ey + 30 * s], [12 * s, ey + 22 * s]], ink, 3 * s);
    ctx.fillStyle = 'rgba(240,140,130,0.35)';
    ctx.beginPath(); ctx.ellipse(-ex - 10 * s, ey + 16 * s, 10 * s, 6 * s, 0, 0, TAU); ctx.ellipse(ex + 10 * s, ey + 16 * s, 10 * s, 6 * s, 0, 0, TAU); ctx.fill();
  }
}
function sun(x, y, r, o = {}) {
  push(x, y, 0, o.s || 1);
  if (o.stick) stick(0, 0, 0, o.stick);
  const rot = o.rot ?? E.T * 0.25;
  const rays = o.rays || 12;
  const c1 = o.color || pc('sun'), c2 = o.color2 || pc('butter', 0.05);
  paper((c) => pStar(c, 0, 0, r * 1.62, r * 1.08, rays, rot), c2, { d: 1.2, tex: 0.6 });
  paper((c) => pStar(c, 0, 0, r * 1.38, r * 1.0, rays, rot + Math.PI / rays), c1, { d: 1, tex: 0.6 });
  paper((c) => pBlob(c, 0, 0, r, r, 0.015, 3, 48), c1, { d: 1.4, tex: 0.6, edge: 'rgba(255,255,255,0.8)', edgeA: 0.35 });
  if (o.face) cloudFace(o.face, r * 2.1, r * 1.3, { ink: o.ink || '#6b4a1e', lookX: o.lookX });
  pop();
}
function raindrop(x, y, s = 1, color) {
  paper((c) => {
    c.moveTo(x, y - 18 * s);
    c.bezierCurveTo(x + 4 * s, y - 8 * s, x + 9 * s, y - 2 * s, x + 9 * s, y + 4 * s);
    c.arc(x, y + 4 * s, 9 * s, 0, Math.PI);
    c.bezierCurveTo(x - 9 * s, y - 2 * s, x - 4 * s, y - 8 * s, x, y - 18 * s);
    c.closePath();
  }, color || pc('seaLight'), { d: 0.7, tex: 0.5 });
}
function rain(x0, y0, w, h, density, t, o = {}) {
  const n = Math.floor(density);
  const sp = o.speed || 420, s = o.s || 1;
  for (let i = 0; i < n; i++) {
    const rx = hash2(i, 11 + (o.seed || 0)), ry = hash2(i, 12 + (o.seed || 0));
    const yy = y0 + ((ry * h + t * sp * (0.8 + 0.4 * hash2(i, 13))) % h);
    const xx = x0 + rx * w + (o.wind || 0) * (yy - y0) * 0.2;
    raindrop(xx, yy, s * (0.7 + 0.5 * hash2(i, 14)), o.color);
  }
}
function bolt(x, y, s = 1, rot = 0, color = '#ffe46b') {
  push(x, y, rot, s);
  paper((c) => {
    c.moveTo(-6, -90); c.lineTo(30, -90); c.lineTo(10, -30); c.lineTo(34, -30); c.lineTo(-18, 70);
    c.lineTo(-2, 0); c.lineTo(-26, 0); c.closePath();
  }, color, { d: 1.4, tex: 0.5, edge: '#fffbe0', edgeA: 0.7 });
  pop();
}
function snowflake(x, y, r, rot = 0, color = '#ffffff') {
  push(x, y, rot);
  paper((c) => {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      const pts = [[-r * 0.08, 0], [-r * 0.08, r], [r * 0.08, r], [r * 0.08, 0]];
      pts.forEach(([px, py], i) => {
        const X = px * ca - py * sa, Y = px * sa + py * ca;
        i ? c.lineTo(X, Y) : c.moveTo(X, Y);
      });
      c.closePath();
      const bx = -r * 0.55 * sa, by = r * 0.55 * ca;
      for (const sd of [-1, 1]) {
        const a2 = a + sd * 0.7;
        c.moveTo(bx, by);
        c.lineTo(bx - r * 0.35 * Math.sin(a2), by + r * 0.35 * Math.cos(a2));
        c.lineTo(bx - r * 0.35 * Math.sin(a2) + 3, by + r * 0.35 * Math.cos(a2) + 3);
        c.closePath();
      }
    }
    c.moveTo(r * 0.2, 0); c.arc(0, 0, r * 0.2, 0, TAU);
  }, color, { d: 0.8, tex: 0.4 });
  pop();
}

// ---------- town ----------
const HOUSE_COLS = [['#f6c39a', '#5d3a4a'], ['#9cc6e6', '#2c3b5e'], ['#f3a7a2', '#5b2a3c'], ['#c7e3a1', '#2d4a3a'], ['#f8dc8c', '#6a5530'], ['#d7c1ea', '#3b2c52']];
function house(x, y, w, h, o = {}) {
  const k = (o.v || 0) % HOUSE_COLS.length;
  const wall = mix(HOUSE_COLS[k][0], HOUSE_COLS[k][1], E.D + (o.dark || 0));
  const roof = mix(['#c4574d', '#5a7fb8', '#7a5a9e', '#3f8a6d', '#c9804a', '#4f6a8a'][k], '#1b1a26', E.D * 0.8 + (o.dark || 0));
  push(x, y, o.rot || 0, o.s || 1);
  if (o.stick) stick(0, 0, 0, o.stick);
  paper((c) => pPoly(c, [[-w / 2, 0], [-w / 2, -h], [w / 2, -h], [w / 2, 0]], 1.2, k + 1), wall, { d: 1.4, tex: 0.8, edge: '#fff', edgeA: 0.3 });
  if (o.chimney !== false) paper((c) => pRect(c, w * 0.2, -h - h * 0.55, w * 0.14, h * 0.4), mix('#b5674f', '#3a2a2a', E.D), { d: 1, tex: 0.7 });
  paper((c) => pPoly(c, [[-w / 2 - 14, -h + 4], [0, -h - h * 0.62], [w / 2 + 14, -h + 4]], 1.4, k + 7), roof, { d: 1.6, tex: 0.7, edge: '#fff', edgeA: 0.25 });
  // door
  paper((c) => pRRect(c, -w * 0.11, -h * 0.48, w * 0.22, h * 0.48, 6), mix('#7a4a35', '#241820', E.D), { d: 0.8, tex: 0.6 });
  splitPin(w * 0.06, -h * 0.24, 2.5);
  // windows
  const lit = o.lit ?? E.D > 0.45;
  const wc = lit ? '#ffe39a' : mix('#e9f6fb', '#3a4560', E.D);
  for (const sx of [-1, 1]) {
    paper((c) => pRect(c, sx * w * 0.3 - w * 0.1, -h * 0.75, w * 0.2, h * 0.24), wc, { d: 0.6, tex: 0.4 });
    line([[sx * w * 0.3, -h * 0.75], [sx * w * 0.3, -h * 0.51]], mix('#ffffff', '#202030', E.D), 2);
  }
  if (o.tvGlow) {
    ctx.save();
    ctx.globalAlpha = o.tvGlow;
    ctx.fillStyle = '#9ff3d0';
    ctx.fillRect(-w * 0.4, -h * 0.75, w * 0.2, h * 0.24);
    ctx.restore();
  }
  pop();
}
function tree(x, y, s = 1, o = {}) {
  push(x, y, o.rot || 0, s);
  paper((c) => pRect(c, -7, -70, 14, 70), pc('woodDark'), { d: 1, tex: 0.7 });
  const g = mix(['#7fbf6a', '#5aa66a', '#93c95a'][(o.v || 0) % 3], '#1f3d33', E.D);
  if (o.pine) {
    for (let i = 0; i < 3; i++) paper((c) => pPoly(c, [[-48 + i * 8, -50 - i * 34], [0, -120 - i * 34], [48 - i * 8, -50 - i * 34]], 1, i + 3), g, { d: 1.1, tex: 0.7 });
  } else {
    paper((c) => pBlob(c, 0, -110, 55, 58, 0.06, (o.v || 0) + 2, 30), g, { d: 1.4, tex: 0.8, edge: '#fff', edgeA: 0.2 });
    paper((c) => pBlob(c, -14, -120, 26, 24, 0.06, (o.v || 0) + 5, 20), rgba('#ffffff', 0.18), { d: 0, tex: 0 });
  }
  pop();
}
function hills(y, color, amp, seed, o = {}) {
  paper((c) => {
    c.moveTo(-200, H + 200);
    for (let x = -200; x <= W + 200; x += 40) {
      const yy = y + Math.sin(x * (o.freq || 0.004) + seed) * amp + vnoise(x * 0.01, seed) * amp * 0.25;
      c.lineTo(x, yy);
    }
    c.lineTo(W + 200, H + 200);
    c.closePath();
  }, color, { d: o.d ?? 1.6, tex: 0.8, edge: '#fff', edgeA: 0.25 });
}

// ---------- people ----------
const SKINS = ['#f2d2b6', '#d9a47c', '#a8714d', '#f6dcc8', '#7c5236'];
function person(x, y, s = 1, o = {}) {
  const skin = o.skin || SKINS[(o.v || 0) % SKINS.length];
  const shirt = o.shirt || ['#e2574c', '#4f8fc0', '#f2b84b', '#6cae75', '#b07ac2', '#e98aa0'][(o.v || 0) % 6];
  const pants = o.pants || pc('ink', -0.5);
  const ink = '#2b2420';
  push(x, y, o.rot || 0, s * (o.flip ? -1 : 1), s);
  const bob = o.bob || 0;
  ctx.translate(0, -bob);
  // legs
  if (o.style === 'woman' || o.style === 'bride') {
    for (const sx of [-1, 1]) paper((c) => pRRect(c, sx * 10 - 5, -48, 10, 48, 5), skin, { d: 0.7, tex: 0.5 });
  } else {
    for (const [sx, a] of [[-1, o.legA || 0], [1, -(o.legA || 0)]]) {
      push(sx * 11, -50, a);
      paper((c) => pRRect(c, -7, 0, 14, 52, 6), pants, { d: 0.7, tex: 0.5 });
      pop();
    }
  }
  // arms (behind body for back arm)
  const arm = (side, ang, holding) => {
    push(side * 22, -104, side * (ang ?? 0.25));
    paper((c) => pRRect(c, -6, 0, 12, 46, 6), o.style === 'bride' ? '#fffdf6' : shirt, { d: 0.7, tex: 0.5 });
    paper((c) => pBlob(c, 0, 48, 7, 7, 0.03, side + 3, 14), skin, { d: 0.5, tex: 0.4 });
    if (holding === 'umbrella') umbrella(0, 46, 0.55, side * -(ang ?? 0.25), o.umbrella || '#e2574c');
    if (holding === 'flowers') { for (let k = 0; k < 4; k++) paper((c) => pBlob(c, -8 + k * 5, 58 + (k % 2) * 6, 7, 7, 0.05, k), ['#f5b7b5', '#ffffff', '#f7d46a', '#f5b7b5'][k], { d: 0.5, tex: 0.4 }); }
    if (holding === 'antenna') { line([[0, 50], [-18, 92]], '#c9ced6', 3, { d: 0.5 }); line([[0, 50], [18, 92]], '#c9ced6', 3, { d: 0.5 }); }
    pop();
  };
  // body
  if (o.style === 'woman') {
    paper((c) => { c.moveTo(-18, -110); c.lineTo(18, -110); c.lineTo(34, -44); c.quadraticCurveTo(0, -36, -34, -44); c.closePath(); }, shirt, { d: 1, tex: 0.7 });
    paper((c) => pRect(c, -18, -80, 36, 6), 'rgba(255,255,255,0.65)', { d: 0, tex: 0.3 });
  } else if (o.style === 'bride') {
    paper((c) => { c.moveTo(-16, -110); c.lineTo(16, -110); c.lineTo(42, -2); c.quadraticCurveTo(0, 6, -42, -2); c.closePath(); }, '#fffdf6', { d: 1.2, tex: 0.7, edge: '#e8e2d6', edgeA: 0.8 });
  } else {
    paper((c) => pRRect(c, -22, -112, 44, 66, 12), shirt, { d: 1, tex: 0.7 });
    if (o.style === 'man' || o.style === 'trader') paper((c) => { c.moveTo(-4, -110); c.lineTo(4, -110); c.lineTo(3, -80); c.lineTo(0, -76); c.lineTo(-3, -80); c.closePath(); }, '#2c3a52', { d: 0.4, tex: 0.3 });
  }
  arm(-1, o.armL, o.holdL);
  arm(1, o.armR, o.holdR);
  // head
  push(0, -132, o.headTilt || 0);
  if (o.style === 'woman' || o.style === 'bride') paper((c) => pBlob(c, 0, -6, 30, 28, 0.05, 9, 26), o.hair || '#6b3b2a', { d: 1, tex: 0.6 });
  paper((c) => pBlob(c, 0, 0, 23, 24, 0.03, (o.v || 0) + 1, 28), skin, { d: 1, tex: 0.6, edge: '#fff', edgeA: 0.3 });
  const lx = (o.look || 0) * 6, ly = (o.lookY || 0) * 5;
  if (o.eyes === 'spiral') {
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.strokeStyle = '#1b6b4f'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let k = 0; k <= 20; k++) { const a = k * 0.6 + E.T * 6, r = k * 0.42; const X = sx * 8 + Math.cos(a) * r, Y = -2 + Math.sin(a) * r; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.stroke(); ctx.restore();
    }
  } else if (o.eyes === 'closed') {
    line([[-12, -2], [-5, 1]], ink, 2.2); line([[12, -2], [5, 1]], ink, 2.2);
  } else if (o.eyes === 'tv') {
    for (const sx of [-1, 1]) { paper((c) => pRRect(c, sx * 8 - 6, -7, 12, 10, 2), '#9ff3d0', { d: 0.3, tex: 0 }); }
  } else {
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(-8 + lx, -2 + ly, o.bigEyes ? 4.2 : 3.2, 0, TAU); ctx.arc(8 + lx, -2 + ly, o.bigEyes ? 4.2 : 3.2, 0, TAU); ctx.fill();
  }
  const m = o.mouth || 'smile';
  if (m === 'smile') line([[-6 + lx, 9], [0 + lx, 12], [6 + lx, 9]], ink, 2);
  else if (m === 'o') { ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(lx, 11, 3.5, 4.5, 0, 0, TAU); ctx.fill(); }
  else if (m === 'worried') line([[-6 + lx, 12], [0 + lx, 9], [6 + lx, 12]], ink, 2);
  else if (m === 'flat') line([[-5 + lx, 11], [5 + lx, 11]], ink, 2);
  ctx.fillStyle = 'rgba(240,120,110,0.35)';
  ctx.beginPath(); ctx.ellipse(-14, 7, 5, 3, 0, 0, TAU); ctx.ellipse(14, 7, 5, 3, 0, 0, TAU); ctx.fill();
  // hair & hats
  if (o.style === 'man') {
    paper((c) => { c.moveTo(-24, -6); c.quadraticCurveTo(-22, -28, 0, -27); c.quadraticCurveTo(22, -28, 24, -6); c.quadraticCurveTo(10, -18, -24, -6); c.closePath(); }, o.hair || '#3b2a20', { d: 0.6, tex: 0.5 });
    if (o.hat) { paper((c) => { pRect(c, -30, -26, 60, 6); pRRect(c, -19, -46, 38, 22, 6); }, o.hat, { d: 1, tex: 0.6 }); paper((c) => pRect(c, -19, -31, 38, 5), '#2b2420', { d: 0, tex: 0 }); }
  } else if (o.style === 'woman' || o.style === 'bride') {
    paper((c) => { c.moveTo(-26, 0); c.quadraticCurveTo(-30, -34, 0, -34); c.quadraticCurveTo(30, -34, 26, 0); c.quadraticCurveTo(14, -20, -26, 0); c.closePath(); }, o.hair || '#6b3b2a', { d: 0.6, tex: 0.5 });
    if (o.style === 'bride') {
      paper((c) => { c.moveTo(-10, -30); c.quadraticCurveTo(30, -30, 46, 60); c.lineTo(10, 70); c.quadraticCurveTo(26, 10, -10, -30); c.closePath(); }, 'rgba(255,255,255,0.75)', { d: 0.6, tex: 0.3 });
      for (let k = 0; k < 5; k++) paper((c) => pBlob(c, -16 + k * 8, -30, 4, 4, 0, k), '#fffdf6', { d: 0.3, tex: 0 });
    }
  } else if (o.style === 'child') {
    paper((c) => { c.moveTo(-24, -8); c.quadraticCurveTo(-20, -30, 2, -28); c.quadraticCurveTo(26, -26, 24, -6); c.lineTo(34, -4); c.lineTo(24, -12); c.closePath(); }, o.hat || '#e2574c', { d: 0.8, tex: 0.6 });
  } else if (o.style === 'scholar') {
    paper((c) => { pPoly(c, [[-30, -24], [0, -34], [30, -24], [0, -14]], 0.5, 2); }, '#2b2420', { d: 1, tex: 0.5 });
    line([[22, -24], [26, -6]], '#f2b84b', 2);
  } else if (o.style === 'trader') {
    paper((c) => { pRect(c, -27, -22, 54, 5); c.moveTo(-17, -20); c.quadraticCurveTo(-17, -44, 0, -44); c.quadraticCurveTo(17, -44, 17, -20); c.closePath(); }, '#2b2420', { d: 1, tex: 0.5 });
  }
  pop();
  pop();
}
function umbrella(x, y, s = 1, rot = 0, color = '#e2574c', o = {}) {
  push(x, y, rot, s);
  line([[0, 0], [0, -130]], '#3a2c24', 5);
  line([[0, 0], [0, 10], [10, 16], [16, 8]], '#3a2c24', 5);
  const open = o.open ?? 1;
  const rw = 95 * open + 14;
  paper((c) => {
    c.moveTo(-rw, -110);
    c.quadraticCurveTo(-rw * 0.9, -200, 0, -205);
    c.quadraticCurveTo(rw * 0.9, -200, rw, -110);
    const n = 4;
    for (let i = n; i > 0; i--) {
      const x1 = lerp(-rw, rw, (i - 1) / n), x0 = lerp(-rw, rw, i / n);
      c.quadraticCurveTo((x0 + x1) / 2, -126, x1, -110);
    }
    c.closePath();
  }, color, { d: 1.4, tex: 0.6, edge: '#fff', edgeA: 0.35 });
  for (let i = 1; i < 4; i++) line([[0, -203], [lerp(-rw, rw, i / 4), -112]], 'rgba(0,0,0,0.15)', 2);
  splitPin(0, -206, 5);
  pop();
}
function thoughtBubble(x, y, s = 1, content = '?', o = {}) {
  push(x, y, 0, s);
  const col = o.color || '#fffdf7';
  if (o.tail !== false) {
    paper((c) => pBlob(c, -30, 72, 8, 8, 0.05, 3), col, { d: 0.8, tex: 0.5 });
    paper((c) => pBlob(c, -16, 50, 13, 12, 0.05, 4), col, { d: 0.9, tex: 0.5 });
  }
  paper((c) => pCloud(c, 0, 0, 170, 90, o.seed || 3, 5), col, { d: 1.2, tex: 0.6, edge: '#fff', edgeA: 0.5 });
  if (typeof content === 'string') {
    const big = content.length <= 2;
    ptext(content, 0, big ? 18 : 10, big ? '64px "Alfa Slab One"' : '30px "Special Elite"', o.ink || '#1f7a5a', { d: 0, tex: 0.4 });
  } else if (typeof content === 'function') content();
  pop();
}

// ---------- broadcast props ----------
// Vintage paper TV. Draws screen content via o.screen(sw, sh) in screen-local coords.
function tvSet(x, y, w, o = {}) {
  const h = w * 0.78, sw = w * 0.66, sh = h * 0.7, sx = -w / 2 + w * 0.07, sy = -h + h * 0.12;
  push(x, y, o.rot || 0, o.s || 1);
  const wood = o.wood || pc('wood'), woodDk = pc('woodDark');
  if (o.legs !== false) {
    for (const lx of [-w * 0.36, w * 0.36]) paper((c) => { c.moveTo(lx - 7, -4); c.lineTo(lx + 7, -4); c.lineTo(lx + (lx > 0 ? 14 : -14) + 3, h * 0.22); c.lineTo(lx + (lx > 0 ? 14 : -14) - 4, h * 0.22); c.closePath(); }, woodDk, { d: 1, tex: 0.6 });
  }
  if (o.antenna !== false) {
    const wob = Math.sin(E.T * 1.7) * 0.04;
    line([[0, -h], [-w * 0.28, -h - w * 0.42]].map(([px, py], i) => (i ? [px + wob * 100, py] : [px, py])), '#c3c8d0', 4, { d: 0.8 });
    line([[0, -h], [w * 0.24, -h - w * 0.46]].map(([px, py], i) => (i ? [px - wob * 100, py] : [px, py])), '#c3c8d0', 4, { d: 0.8 });
    splitPin(-w * 0.28 + wob * 100, -h - w * 0.42, 6, 'silver');
    splitPin(w * 0.24 - wob * 100, -h - w * 0.46, 6, 'silver');
    paper((c) => pBlob(c, 0, -h, w * 0.08, w * 0.04, 0.02, 2, 24), woodDk, { d: 0.8, tex: 0.5 });
  }
  // cabinet
  paper((c) => pRRect(c, -w / 2, -h, w, h, w * 0.06), wood, { d: 2.2, tex: 0.9, edge: '#fff', edgeA: 0.25 });
  ctx.save(); ctx.beginPath(); pRRect(ctx, -w / 2, -h, w, h, w * 0.06); ctx.clip();
  ctx.strokeStyle = 'rgba(60,30,10,0.12)'; ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) { const yy = -h + (i + 0.5) * (h / 14); ctx.beginPath(); ctx.moveTo(-w / 2, yy); ctx.bezierCurveTo(-w / 4, yy + 6 * Math.sin(i), w / 4, yy - 6 * Math.cos(i * 1.3), w / 2, yy + 3); ctx.stroke(); }
  ctx.restore();
  // bezel
  paper((c) => pRRect(c, sx - w * 0.025, sy - w * 0.025, sw + w * 0.05, sh + w * 0.05, w * 0.07), o.bezel || '#e9dcc2', { d: 1, tex: 0.7 });
  // screen
  const screenPath = (c) => pRRect(c, sx, sy, sw, sh, w * 0.06);
  const on = o.on ?? 1;
  paper(screenPath, '#1c2321', { d: 0.4, tex: 0 });
  if (on > 0 && o.screen) {
    ctx.save(); ctx.beginPath(); screenPath(ctx); ctx.clip();
    ctx.translate(sx, sy);
    if (on < 1) {
      // CRT warm-up / switch-off: content squeezed toward a line
      const k = on;
      ctx.translate(sw / 2, sh / 2); ctx.scale(Math.min(1, k * 2.2), Math.max(0.004, k * k)); ctx.translate(-sw / 2, -sh / 2);
    }
    const prev = E.shadowScale;
    E.shadowScale = prev * (o.contentScale || sw / W);
    o.screen(sw, sh);
    E.shadowScale = prev;
    ctx.restore();
  }
  // glass: scanlines, vignette, highlight
  ctx.save(); ctx.beginPath(); screenPath(ctx); ctx.clip();
  if (on > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let yy = sy; yy < sy + sh; yy += 3) ctx.fillRect(sx, yy, sw, 1.2);
    if (o.static) staticNoise(sx, sy, sw, sh, o.static, 3);
  }
  const g = ctx.createRadialGradient(sx + sw / 2, sy + sh / 2, sw * 0.25, sx + sw / 2, sy + sh / 2, sw * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
  const hl = ctx.createLinearGradient(sx, sy, sx + sw * 0.6, sy + sh * 0.6);
  hl.addColorStop(0, 'rgba(255,255,255,0.22)'); hl.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = hl; ctx.fillRect(sx, sy, sw, sh);
  if (o.glow) { ctx.fillStyle = `rgba(160,255,215,${o.glow * 0.12})`; ctx.fillRect(sx, sy, sw, sh); }
  ctx.restore();
  // speaker grille + knobs
  const gx = sx + sw + w * 0.05, gw = w / 2 - w * 0.05 - gx;
  paper((c) => pRRect(c, gx, sy, w * 0.19, sh * 0.5, 8), '#d8c8a8', { d: 0.6, tex: 0.7 });
  for (let i = 0; i < 7; i++) line([[gx + 8, sy + 12 + i * (sh * 0.5 - 20) / 6], [gx + w * 0.19 - 8, sy + 12 + i * (sh * 0.5 - 20) / 6]], 'rgba(80,60,40,0.45)', 2);
  for (const [k, ky] of [[0, sy + sh * 0.68], [1, sy + sh * 0.9]]) {
    const kx = gx + w * 0.095, kr = w * 0.05;
    paper((c) => pBlob(c, kx, ky, kr, kr, 0.01, k + 1, 28), '#3a302a', { d: 1, tex: 0.4 });
    const a = k === 0 ? (o.knob ?? 0) : 0.8;
    line([[kx, ky], [kx + Math.sin(a) * kr * 0.8, ky - Math.cos(a) * kr * 0.8]], '#e9dcc2', 3);
    if (k === 0) ptext('9', kx - kr * 1.6, ky + kr * 0.4, `${Math.round(kr * 1.1)}px "Bebas Neue"`, '#e9dcc2', { d: 0, tex: 0 });
  }
  pop();
  return { sx, sy, sw, sh };
}

// Silver pushpin seen from the side (head, collar, needle)
function pushpin(x, y, s = 1, rot = 0, o = {}) {
  push(x, y, rot, s);
  const silver = o.color || '#cfd4dc';
  line([[0, 0], [0, 120]], '#9aa1ad', 6, { d: 1 });
  line([[0, 100], [0, 128]], '#7d838e', 3);
  paper((c) => { c.moveTo(-22, 0); c.lineTo(22, 0); c.lineTo(14, -34); c.lineTo(-14, -34); c.closePath(); }, '#aeb5c0', { d: 1.2, tex: 0.2 });
  paper((c) => pBlob(c, 0, -46, 52, 16, 0.01, 2, 36), silver, { d: 1.8, tex: 0.15, edge: '#fff', edgeA: 0.8 });
  ctx.save();
  const g = ctx.createLinearGradient(-50, -60, 50, -30);
  g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -46, 52, 16, 0, 0, TAU); ctx.fill();
  ctx.restore();
  pop();
}
// Pushpin from above (round silver head)
function pinTop(x, y, r, o = {}) {
  paper((c) => pBlob(c, x, y, r, r, 0.01, 4, 40), o.color || '#c9ced6', { d: o.d ?? 2.4, tex: 0.1 });
  ctx.save();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(60,64,72,0.35)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.restore();
}

function clockFace(x, y, r, hour, o = {}) {
  push(x, y, o.rot || 0);
  paper((c) => pBlob(c, 0, 0, r * 1.08, r * 1.08, 0.01, 5, 48), o.rim || pc('butter', 0.1), { d: 1.6, tex: 0.6 });
  paper((c) => pBlob(c, 0, 0, r, r, 0.01, 6, 48), o.face || '#fbf6ea', { d: 0.6, tex: 0.6 });
  if (!o.faceless) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      line([[Math.sin(a) * r * 0.82, -Math.cos(a) * r * 0.82], [Math.sin(a) * r * 0.92, -Math.cos(a) * r * 0.92]], '#3a2f28', i % 3 ? 2 : 4);
    }
    if (o.numbers) for (const n of [12, 3, 6, 9]) { const a = (n / 12) * TAU; ptext(String(n), Math.sin(a) * r * 0.66, -Math.cos(a) * r * 0.66 + r * 0.09, `${Math.round(r * 0.26)}px "Bebas Neue"`, '#3a2f28', { d: 0, tex: 0 }); }
    const ha = ((hour % 12) / 12) * TAU, ma = ((hour % 1) * TAU);
    line([[0, 0], [Math.sin(ha) * r * 0.5, -Math.cos(ha) * r * 0.5]], '#2b2420', r * 0.07, { d: 0.6 });
    line([[0, 0], [Math.sin(ma) * r * 0.78, -Math.cos(ma) * r * 0.78]], '#2b2420', r * 0.04, { d: 0.6 });
    splitPin(0, 0, r * 0.07);
  }
  pop();
}

function sunburst(x, y, r, n, rot, c1, c2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = c1;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = c2;
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * TAU, a1 = a0 + (TAU / n) * 0.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function ribbon(x, y, w, text, o = {}) {
  const h = o.h || 90, col = o.color || '#c8433a', dk = o.dark || '#8e2b26';
  push(x, y, o.rot || 0, o.s || 1);
  for (const sd of [-1, 1]) {
    paper((c) => { c.moveTo(sd * (w / 2 - 30), -h / 2 + 22); c.lineTo(sd * (w / 2 + 70), -h / 2 + 22); c.lineTo(sd * (w / 2 + 40), 22 + 10); c.lineTo(sd * (w / 2 + 70), h / 2 + 22); c.lineTo(sd * (w / 2 - 30), h / 2 + 22); c.closePath(); }, dk, { d: 1.2, tex: 0.7 });
  }
  paper((c) => pRect(c, -w / 2, -h / 2, w, h), col, { d: 1.6, tex: 0.7, edge: '#fff', edgeA: 0.3 });
  ptext(text, 0, h * 0.2, o.font || `${Math.round(h * 0.55)}px "Limelight"`, o.ink || '#fff5dd', { d: 0.6, tex: 0.3, ls: o.ls });
  pop();
}
// Mechanical flip-number counter
function flipNumber(x, y, text, h, o = {}) {
  const font = `${Math.round(h * 0.8)}px "Alfa Slab One"`;
  ctx.save(); ctx.font = font;
  const cw = h * 0.68, gap = h * 0.08;
  const total = text.length * cw + (text.length - 1) * gap;
  let cx = x - total / 2;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    paper((c) => pRRect(c, cx, y - h / 2, cw, h, h * 0.08), o.card || '#22262c', { d: 1.4, tex: 0.5 });
    ptext(ch, cx + cw / 2, y + h * 0.29, font, o.ink || '#fff3d6', { d: 0, tex: 0.35 });
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(cx, y - 1.5, cw, 3);
    splitPin(cx + 6, y, 2.6); splitPin(cx + cw - 6, y, 2.6);
    cx += cw + gap;
  }
  ctx.restore();
}

// ---------- the crayon hurricane (after the cover art) ----------
function crayonStorm(cx, cy, R, t, o = {}) {
  const cols = o.colors || ['#d23a2f', '#2f5fd0', '#1b1b1f', '#ef8a2c', '#3d78e0', '#b82f2a'];
  const n = o.n || 70;
  const spin = t * (o.spin ?? 0.6);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const col = cols[i % cols.length];
    ctx.strokeStyle = crayon(col);
    ctx.lineWidth = (o.w || 5) * (0.7 + hash2(i, 3) * 0.7);
    ctx.globalAlpha = o.alpha ?? 0.9;
    const r0 = R * (0.12 + 0.88 * hash2(i, 1)), ecc = 0.75 + hash2(i, 2) * 0.35, ph = hash2(i, 4) * TAU;
    const a0 = spin * (1.2 - r0 / R) + ph;
    ctx.beginPath();
    const steps = 26;
    for (let k = 0; k <= steps; k++) {
      const u = k / steps, a = a0 + u * TAU * (0.8 + hash2(i, 5) * 0.6);
      const rr = r0 * (1 + 0.08 * Math.sin(u * 9 + i) + (o.inward ? -u * 0.25 : 0));
      const X = cx + Math.cos(a) * rr, Y = cy + Math.sin(a) * rr * ecc;
      k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
