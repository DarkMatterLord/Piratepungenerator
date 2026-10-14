'use strict';
// Stained-glass rendering: backlit glass pieces, lead came, grisaille paint, tessellation,
// gothic tracery, light beams, cracks and shattering, bloom.

// ---------- backlight ----------
// The window is lit from behind. E.light(x, y) returns the backlight at a screen point:
// 0 = unlit (glass reads almost black), 1 = fully lit, > 1 = overexposed / white-hot.
E.light = null;
E.lightK = 1;
function lightAt(sx, sy) {
  return (E.light ? E.light(sx, sy) : 1) * E.lightK;
}
function screenPt(x, y) {
  const m = ctx.getTransform();
  return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
}
function litRGB(col, L) {
  const c = typeof col === 'string' ? rgbOf(col) : col;
  const tr = 0.1 + 0.9 * clamp(L, 0, 1);
  const ov = clamp(L - 1, 0, 1.2) * 0.5;
  return [lerp(c[0] * tr, 255, ov), lerp(c[1] * tr, 248, ov), lerp(c[2] * tr, 230, ov)];
}
const rgbStr = (c, k = 1) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
function lerpRGB(a, b, t) {
  a = typeof a === 'string' ? rgbOf(a) : a;
  b = typeof b === 'string' ? rgbOf(b) : b;
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// ---------- textures ----------
function makeGlassTexture(size = 512) {
  // neutral grey (128) under 'overlay': mottled cathedral glass, drawn streaks and seed bubbles
  const c = makeCanvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size), d = img.data, r = rng(77);
  const fbm = (x, y) => {
    let v = 0, amp = 1, f = 1 / 90;
    for (let o = 0; o < 4; o++) {
      const wrap = Math.round(size * f);
      const xi = x * f, yi = y * f, x0 = Math.floor(xi), y0 = Math.floor(yi), tx = smooth(xi - x0), ty = smooth(yi - y0);
      const h = (a, b) => hash2(((a % wrap) + wrap) % wrap, (((b % wrap) + wrap) % wrap) + o * 131);
      v += amp * lerp(lerp(h(x0, y0), h(x0 + 1, y0), tx), lerp(h(x0, y0 + 1), h(x0 + 1, y0 + 1), tx), ty);
      amp *= 0.5; f *= 2;
    }
    return v / 1.875;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const streak = Math.sin((x * 0.06 + y * 0.012) * TAU + hash2(Math.floor(y / 3), 9) * 2) * 6;
      const v = 128 + (fbm(x, y) - 0.5) * 70 + streak + (r() - 0.5) * 6;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  for (let k = 0; k < 140; k++) {
    const x = r() * size, y = r() * size, rr = 0.8 + r() * 2.6;
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8; g.beginPath(); g.arc(x + 0.4, y + 0.4, rr, 0, TAU); g.stroke();
  }
  return c;
}
function makeStoneTexture(size = 512) {
  const c = makeCanvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size), d = img.data, r = rng(91);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const v = 128 + (vnoise(x * 0.05 + vnoise(y * 0.05, 3) * 2, 7) * 0.5 + vnoise(x * 0.2, y) * 0.2) * 40 + (r() - 0.5) * 30;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return c;
}
function initGlass() {
  E.glassPat = ctx.createPattern(makeGlassTexture(512), 'repeat');
  E.stonePat = ctx.createPattern(makeStoneTexture(512), 'repeat');
}

// ---------- geometry ----------
function polyPath(pts, smoothK = 0) {
  const p = new Path2D();
  if (!smoothK) {
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  } else {
    // rounded corners through midpoints (organic glass cuts)
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(pts[n - 1], pts[0]);
    p.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const q = pts[i], m = mid(q, pts[(i + 1) % n]);
      p.quadraticCurveTo(q[0], q[1], m[0], m[1]);
    }
  }
  p.closePath();
  return p;
}
function centroid(pts) {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}
function clipHalf(poly, ax, ay, bx, by) {
  // keep the side of the bisector of a-b that is closer to a
  const mx = (ax + bx) / 2, my = (ay + by) / 2, nx = bx - ax, ny = by - ay;
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const P = poly[k], Q = poly[(k + 1) % poly.length];
    const dP = (P[0] - mx) * nx + (P[1] - my) * ny, dQ = (Q[0] - mx) * nx + (Q[1] - my) * ny;
    if (dP <= 0) out.push(P);
    if ((dP <= 0) !== (dQ <= 0)) { const t = dP / (dP - dQ); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
  }
  return out;
}
function clipConvex(poly, clip) {
  // Sutherland–Hodgman against a convex clip polygon (clockwise or counter-clockwise)
  let out = poly;
  const n = clip.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = clip[i], b = clip[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area > 0 ? 1 : -1;
  for (let i = 0; i < n && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % n], inp = out;
    out = [];
    const side = (p) => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    for (let k = 0; k < inp.length; k++) {
      const P = inp[k], Q = inp[(k + 1) % inp.length], sP = side(P), sQ = side(Q);
      if (sP >= 0) out.push(P);
      if ((sP >= 0) !== (sQ >= 0)) { const t = sP / (sP - sQ); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
  }
  return out;
}
function voronoi(seeds, x0, y0, x1, y1) {
  const n = seeds.length, s = Math.sqrt(((x1 - x0) * (y1 - y0)) / Math.max(1, n));
  const gs = s * 1.5, grid = new Map();
  const key = (gx, gy) => gx * 100003 + gy;
  seeds.forEach(([x, y], i) => { const k = key(Math.floor(x / gs), Math.floor(y / gs)); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
  const cells = [];
  for (let i = 0; i < n; i++) {
    const [sx, sy] = seeds[i];
    let poly = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const gx = Math.floor(sx / gs), gy = Math.floor(sy / gs), R = 3;
    const near = [];
    for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) { const l = grid.get(key(gx + a, gy + b)); if (l) near.push(...l); }
    near.sort((p, q) => (seeds[p][0] - sx) ** 2 + (seeds[p][1] - sy) ** 2 - ((seeds[q][0] - sx) ** 2 + (seeds[q][1] - sy) ** 2));
    for (const j of near) {
      if (j === i) continue;
      poly = clipHalf(poly, sx, sy, seeds[j][0], seeds[j][1]);
      if (poly.length < 3) break;
    }
    if (poly.length >= 3) cells.push(poly);
  }
  return cells;
}
function jitterSeeds(x0, y0, x1, y1, sp, seed = 1, jit = 0.85, density = null) {
  const r = rng(seed), out = [];
  for (let y = y0 + sp / 2; y < y1; y += sp)
    for (let x = x0 + sp / 2; x < x1; x += sp) {
      const px = x + (r() - 0.5) * sp * jit, py = y + (r() - 0.5) * sp * jit;
      if (density) {
        // extra seeds where density > 1, dropped where < 1
        const d = density(px, py);
        if (d < 1 && r() > d) continue;
        if (d > 1) for (let k = 1; k < d; k++) out.push([px + (r() - 0.5) * sp * 0.7, py + (r() - 0.5) * sp * 0.7]);
      }
      out.push([px, py]);
    }
  return out;
}
const _tessCache = new Map();
function makeCells(polys) {
  return polys.map((pts, i) => {
    const [cx, cy] = centroid(pts);
    return { pts, path: polyPath(pts), cx, cy, r: Math.sqrt(polyArea(pts)) * 0.62, seed: i * 7919 + 13 };
  });
}
function leadPathOf(cells) {
  const p = new Path2D();
  for (const c of cells) p.addPath(c.path);
  return p;
}
// cached Voronoi tessellation of a rectangle
function tess(key, x0, y0, x1, y1, sp, o = {}) {
  let t = _tessCache.get(key);
  if (t) return t;
  const an = o.aniso || 1; // >1 stretches pieces horizontally (drawn-glass sheets)
  let seeds = o.seeds || jitterSeeds(x0 / an, y0, x1 / an, y1, sp, o.seed || key.length * 31 + 7, o.jit ?? 0.85, o.density ? (x, y) => o.density(x * an, y) : null);
  if (o.seeds) seeds = seeds.map(([x, y]) => [x / an, y]);
  const polys = voronoi(seeds, x0 / an, y0, x1 / an, y1).map((p) => p.map(([x, y]) => [x * an, y]));
  const cells = makeCells(polys);
  t = { cells, lead: leadPathOf(cells) };
  _tessCache.set(key, t);
  return t;
}
// cached radial tessellation (rose windows, sunbursts, halos): rings x sectors
function tessRadial(key, cx, cy, r0, r1, rings, sectors, o = {}) {
  let t = _tessCache.get(key);
  if (t) return t;
  const polys = [];
  for (let k = 0; k < rings; k++) {
    const ra = lerp(r0, r1, k / rings), rb = lerp(r0, r1, (k + 1) / rings);
    const ns = Math.max(3, Math.round(sectors * (o.grow ? (k + 1) / rings : 1)));
    const off = (k % 2) * (Math.PI / ns) + (o.rot || 0);
    for (let s = 0; s < ns; s++) {
      const a0 = off + (s / ns) * TAU, a1 = off + ((s + 1) / ns) * TAU, pts = [];
      const steps = Math.max(2, Math.ceil((a1 - a0) * rb / 40));
      for (let q = 0; q <= steps; q++) { const a = lerp(a0, a1, q / steps); pts.push([cx + Math.cos(a) * rb, cy + Math.sin(a) * rb]); }
      for (let q = steps; q >= 0; q--) { const a = lerp(a0, a1, q / steps); pts.push([cx + Math.cos(a) * ra, cy + Math.sin(a) * ra]); }
      polys.push(pts);
    }
  }
  const cells = makeCells(polys);
  cells.forEach((c) => { c.rr = Math.hypot(c.cx - cx, c.cy - cy); c.a = Math.atan2(c.cy - cy, c.cx - cx); });
  t = { cells, lead: leadPathOf(cells) };
  _tessCache.set(key, t);
  return t;
}
// Split a polygon into k shards by random cuts (glass pieces inside a shape)
function shardPoly(pts, k, seed) {
  let polys = [pts];
  const r = rng(seed);
  for (let i = 0; i < k; i++) {
    polys.sort((a, b) => polyArea(b) - polyArea(a));
    const p = polys.shift(), [cx, cy] = centroid(p), a = r() * Math.PI;
    const nx = Math.cos(a), ny = Math.sin(a), off = (r() - 0.5) * Math.sqrt(polyArea(p)) * 0.35;
    const A = halfCut(p, nx, ny, cx * nx + cy * ny + off, 1), B = halfCut(p, nx, ny, cx * nx + cy * ny + off, -1);
    if (A.length >= 3 && B.length >= 3) polys.push(A, B); else polys.push(p);
  }
  return polys;
}
function halfCut(poly, nx, ny, d, side) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const P = poly[k], Q = poly[(k + 1) % poly.length];
    const sP = side * (P[0] * nx + P[1] * ny - d), sQ = side * (Q[0] * nx + Q[1] * ny - d);
    if (sP >= 0) out.push(P);
    if ((sP >= 0) !== (sQ >= 0)) { const t = sP / (sP - sQ); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
  }
  return out;
}
function polyArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; }
  return Math.abs(a / 2);
}
// sample a closed path built from canvas commands into points (for organic outlines)
function arcPts(cx, cy, rx, ry, a0, a1, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return out;
}

// ---------- drawing glass ----------
// One piece of glass. path in local coords; o.cx/o.cy local centroid (for light); o.seed for variation.
function glassPiece(path, col, o = {}) {
  let L;
  if (o.L != null) L = o.L;
  else { const [sx, sy] = screenPt(o.cx || 0, o.cy || 0); L = lightAt(sx, sy); }
  L *= o.lk ?? 1;
  const c0 = litRGB(col, L);
  // jewel saturation: push away from grey
  const m = (c0[0] + c0[1] + c0[2]) / 3, sat = o.sat ?? 1.3;
  const c = [clamp(m + (c0[0] - m) * sat, 0, 255), clamp(m + (c0[1] - m) * sat, 0, 255), clamp(m + (c0[2] - m) * sat, 0, 255)];
  const v = 1 + (hash(o.seed | 0) - 0.5) * (o.vary ?? 0.2);
  if (o.flat) ctx.fillStyle = rgbStr(c, v);
  else {
    // light pools in the middle of each piece and falls off toward the lead
    const r = o.r || 50, cx = o.cx || 0, cy = o.cy || 0;
    const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.05, cx, cy, r * 1.15);
    g.addColorStop(0, rgbStr(c, v * (1.28 + 0.25 * clamp(L - 0.6, 0, 1))));
    g.addColorStop(0.55, rgbStr(c, v));
    g.addColorStop(1, rgbStr(c, v * 0.58));
    ctx.fillStyle = g;
  }
  ctx.fill(path);
  if (E.tex && (o.tex ?? 1) > 0) {
    ctx.save();
    const sd = o.seed | 0;
    E.glassPat.setTransform(new DOMMatrix().translateSelf((sd * 37) % 512, (sd * 91) % 512).rotateSelf((sd % 4) * 23));
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.7 * (o.tex ?? 1);
    ctx.fillStyle = E.glassPat;
    ctx.fill(path);
    ctx.restore();
  }
  if (o.glow && L > 0.2) {
    // jewels and hot spots: an inner glow toward the centre
    ctx.save();
    const g = ctx.createRadialGradient(o.cx, o.cy, 0, o.cx, o.cy, o.glowR || 30);
    g.addColorStop(0, `rgba(255,255,240,${0.85 * o.glow * clamp(L, 0, 1.2)})`);
    g.addColorStop(1, 'rgba(255,255,240,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g; ctx.fill(path);
    ctx.restore();
  }
  return L;
}
// Lead came: dark metal strips with a soft halo bleeding onto the glass and a thin highlight.
function lead(path, w = 6, o = {}) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (E.shadows && o.halo !== false) {
    ctx.shadowColor = o.haloCol || 'rgba(0,0,0,0.62)';
    ctx.shadowBlur = w * 1.2 * E.shadowScale;
  }
  ctx.strokeStyle = o.color || '#151419';
  ctx.lineWidth = w;
  ctx.stroke(path);
  ctx.shadowColor = 'transparent';
  if (o.hi !== false) {
    ctx.strokeStyle = o.hiCol || 'rgba(170,170,185,0.26)';
    ctx.lineWidth = Math.max(0.8, w * 0.22);
    ctx.translate(-w * 0.13, -w * 0.13);
    ctx.stroke(path);
  }
  ctx.restore();
}
// Lead turned to living blood: dark red came with a glowing core that throbs with E.pulse.
function bloodLead(path, w = 6, glow = 1) {
  const pulse = E.pulse ?? 1;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a0307'; ctx.lineWidth = w;
  ctx.stroke(path);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255,16,20,${0.22 * glow * pulse})`; ctx.lineWidth = w * 1.9; ctx.stroke(path);
  if (E.shadows) { ctx.shadowColor = `rgba(255,20,24,${0.75 * glow * pulse})`; ctx.shadowBlur = w * 2.2 * E.shadowScale; }
  ctx.strokeStyle = `rgba(255,${(50 + 60 * pulse) | 0},40,${0.9 * glow * (0.6 + 0.4 * pulse)})`;
  ctx.lineWidth = w * 0.46;
  ctx.stroke(path);
  ctx.restore();
}
// Grisaille: the dark glass paint fired onto faces, hands and folds.
function paint(build, o = {}) {
  ctx.save();
  ctx.strokeStyle = o.c || 'rgba(38,20,12,0.88)';
  ctx.lineWidth = o.w || 3;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); build(ctx); ctx.stroke();
  ctx.restore();
}
function matte(build, o = {}) {
  ctx.save();
  ctx.fillStyle = o.c || `rgba(38,20,12,${o.a ?? 0.35})`;
  ctx.beginPath(); build(ctx); ctx.fill();
  ctx.restore();
}
// A tessellated field of glass, coloured by a function of position.
function glassField(t, colorFn, o = {}) {
  for (const c of t.cells) {
    const col = colorFn(c.cx, c.cy, c);
    if (!col) continue;
    glassPiece(c.path, col, { cx: c.cx, cy: c.cy, r: c.r, seed: c.seed, tex: o.tex, lk: o.lk, vary: o.vary, sat: o.sat });
  }
  if (o.lead !== false) lead(t.lead, o.leadW || 6, o.leadOpts || {});
}
// A shape made of glass shards: outline points → shards with lead between them.
const _shapeCache = new Map();
function shardShape(key, pts, k, smoothK = 0) {
  let s = _shapeCache.get(key);
  if (s) return s;
  const polys = k > 0 ? shardPoly(pts, k, key.length * 13 + k) : [pts];
  const cells = polys.map((p, i) => { const [cx, cy] = centroid(p); return { pts: p, path: polyPath(p, smoothK), cx, cy, r: Math.sqrt(polyArea(p)) * 0.62, seed: key.length * 101 + i * 17 }; });
  s = { cells, lead: leadPathOf(cells), outline: polyPath(pts, smoothK) };
  _shapeCache.set(key, s);
  return s;
}
function drawShape(s, col, o = {}) {
  s.cells.forEach((c, i) => glassPiece(c.path, typeof col === 'function' ? col(i, c) : col, { cx: c.cx, cy: c.cy, r: c.r, seed: c.seed + (o.seed || 0), tex: o.tex, lk: o.lk, glow: o.glow, glowR: o.glowR, sat: o.sat }));
  if (o.paint) o.paint();
  if (o.blood) bloodLead(s.lead, o.leadW || 5, o.blood, o.phase);
  else if (o.lead !== false) lead(s.lead, o.leadW || 5, o.leadOpts || {});
}

// ---------- gothic architecture ----------
// Equilateral pointed arch: x, y = bottom-left corner, w = span, h = total height
function archPts(x, y, w, h, n = 14) {
  const ys = y - h + w * 0.866;
  const pts = [[x, y], [x, ys]];
  for (let i = 1; i <= n; i++) { const a = lerp(Math.PI, Math.PI * 4 / 3, i / n); pts.push([x + w + Math.cos(a) * w, ys + Math.sin(a) * w]); }
  for (let i = 1; i <= n; i++) { const a = lerp(Math.PI * 5 / 3, Math.PI * 2, i / n); pts.push([x + Math.cos(a) * w, ys + Math.sin(a) * w]); }
  pts.push([x + w, y]);
  return pts;
}
function archPath(x, y, w, h) { return polyPath(archPts(x, y, w, h)); }
function stoneWall(x0, y0, x1, y1, o = {}) {
  ctx.save();
  ctx.fillStyle = o.color || '#15131a';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  E.stonePat.setTransform(new DOMMatrix().scaleSelf(1.6));
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.6; ctx.fillStyle = E.stonePat;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
  const ch = o.course || 90;
  for (let y = y0 - (y0 % ch); y < y1; y += ch) {
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    const row = Math.round(y / ch), off = (row % 2) * (ch * 0.9);
    for (let x = x0 - (x0 % (ch * 1.8)) + off; x < x1; x += ch * 1.8) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + ch); ctx.stroke(); }
  }
  ctx.restore();
}
// stone frame around a window opening
function tracery(path, w = 26, o = {}) {
  ctx.save();
  ctx.lineJoin = 'round';
  if (E.shadows) { ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = w * 0.8 * E.shadowScale; }
  ctx.strokeStyle = o.color || '#2a2733';
  ctx.lineWidth = w;
  ctx.stroke(path);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = o.lit || 'rgba(255,220,170,0.18)';
  ctx.lineWidth = w * 0.18;
  ctx.translate(w * 0.18, w * 0.12);
  ctx.stroke(path);
  ctx.restore();
}

// Rose window: hub, ring of pointed petals, ring of roundels. Returns cached piece sets.
function roseWindow(key, cx, cy, R, n = 12) {
  let r = _shapeCache.get('rose_' + key);
  if (r) return r;
  const cellsOf = (polys, base) => polys.map((p, i) => { const [x, y] = centroid(p); return { pts: p, path: polyPath(p, 0), cx: x, cy: y, r: Math.sqrt(polyArea(p)) * 0.62, seed: base + i * 17 }; });
  const hub = cellsOf([...Array(8)].map((_, k) => [[cx, cy], ...arcPts(cx, cy, R * 0.2, R * 0.2, (k / 8) * TAU, ((k + 1) / 8) * TAU, 4)]), 11);
  const petals = [], petalBack = [], roundels = [], fill = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU, a2 = a + Math.PI / n;
    // pointed petal from the hub outward
    const p = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12, rr = lerp(R * 0.24, R * 0.66, u), wdt = Math.sin(u * Math.PI) * R * 0.13;
      p.push([cx + Math.cos(a) * rr - Math.sin(a) * wdt, cy + Math.sin(a) * rr + Math.cos(a) * wdt]);
    }
    for (let i = 12; i >= 0; i--) {
      const u = i / 12, rr = lerp(R * 0.24, R * 0.66, u), wdt = Math.sin(u * Math.PI) * R * 0.13;
      p.push([cx + Math.cos(a) * rr + Math.sin(a) * wdt, cy + Math.sin(a) * rr - Math.cos(a) * wdt]);
    }
    petals.push(...shardPoly(p, 1, k * 7 + 3));
    // roundel between petals at the rim
    roundels.push(arcPts(cx + Math.cos(a2) * R * 0.8, cy + Math.sin(a2) * R * 0.8, R * 0.13, R * 0.13, 0, TAU, 18).slice(0, -1));
    // background wedge
    const w0 = a - Math.PI / n, w1 = a + Math.PI / n;
    fill.push([...arcPts(cx, cy, R * 0.22, R * 0.22, w0, w1, 4), ...arcPts(cx, cy, R, R, w1, w0, 8)]);
  }
  r = { hub: cellsOf(hub.map((c) => c.pts), 21), petals: cellsOf(petals, 41), roundels: cellsOf(roundels, 61), fill: cellsOf(fill, 81) };
  for (const k of ['hub', 'petals', 'roundels', 'fill']) r[k + 'Lead'] = leadPathOf(r[k]);
  const ring = new Path2D(); ring.arc(cx, cy, R, 0, TAU);
  r.ring = ring;
  _shapeCache.set('rose_' + key, r);
  return r;
}
function drawRose(r, cols, o = {}) {
  const draw = (cells, colFn) => cells.forEach((c, i) => glassPiece(c.path, colFn(i, c), { cx: c.cx, cy: c.cy, r: c.r, seed: c.seed, lk: o.lk }));
  draw(r.fill, (i) => cols.fill[i % cols.fill.length]);
  lead(r.fillLead, o.leadW || 5);
  draw(r.petals, (i) => cols.petal[Math.floor(i / 2) % cols.petal.length]);
  lead(r.petalsLead, o.leadW || 5);
  draw(r.roundels, (i) => cols.roundel[i % cols.roundel.length]);
  lead(r.roundelsLead, o.leadW || 5);
  draw(r.hub, (i) => cols.hub[i % cols.hub.length]);
  lead(r.hubLead, o.leadW || 5);
}

// ---------- light in the room ----------
function lightBeam(x0, y0, w0, x1, y1, w1, color, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0 - w0 / 2, y0); ctx.lineTo(x0 + w0 / 2, y0); ctx.lineTo(x1 + w1 / 2, y1); ctx.lineTo(x1 - w1 / 2, y1);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
function lightPool(x, y, rx, ry, color, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
  ctx.restore();
}
function dust(x0, y0, x1, y1, n, t, color = '#ffe8b8', alpha = 0.5) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const x = x0 + ((hash2(i, 1) * (x1 - x0) + Math.sin(t * 0.3 + i) * 30 + t * 6 * (hash2(i, 3) - 0.5)) % (x1 - x0) + (x1 - x0)) % (x1 - x0);
    const y = y0 + ((hash2(i, 2) * (y1 - y0) - t * (8 + hash2(i, 4) * 12)) % (y1 - y0) + (y1 - y0)) % (y1 - y0);
    ctx.fillStyle = rgba(color, alpha * (0.4 + 0.6 * Math.sin(t * 2 + i) ** 2));
    ctx.beginPath(); ctx.arc(x, y, 1.2 + hash2(i, 5) * 2.2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function embers(x0, y0, x1, y1, n, t, o = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const life = (t * (0.25 + hash2(i, 7) * 0.3) + hash2(i, 8)) % 1;
    const x = x0 + hash2(i, 9) * (x1 - x0) + Math.sin(t * 2 + i) * 40 * life;
    const y = y1 - life * (y1 - y0) * (o.rise ?? 1);
    const a = Math.sin(life * Math.PI) * (o.alpha ?? 0.9);
    ctx.fillStyle = `rgba(255,${120 + (hash2(i, 10) * 100) | 0},40,${a})`;
    ctx.beginPath(); ctx.arc(x, y, 1.5 + hash2(i, 11) * 2.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------- breaking glass ----------
function crackPaths(x, y, R, seed, prog) {
  const r = rng(seed), p = new Path2D();
  const arm = (x0, y0, a, len, depth) => {
    let px = x0, py = y0;
    p.moveTo(px, py);
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      if (i / steps > prog * (1.3 - depth * 0.15)) break;
      a += (r() - 0.5) * 0.7;
      px += Math.cos(a) * len / steps; py += Math.sin(a) * len / steps;
      p.lineTo(px, py);
      if (depth < 2 && r() < 0.28) { arm(px, py, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), len * 0.5, depth + 1); p.moveTo(px, py); }
    }
  };
  const n = 7 + Math.floor(r() * 4);
  for (let k = 0; k < n; k++) arm(x, y, (k / n) * TAU + r() * 0.5, R * (0.6 + r() * 0.5), 0);
  for (let ring = 1; ring <= 2; ring++) {
    if (prog < 0.5 * ring) break;
    const rr = R * 0.18 * ring;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU;
      p.moveTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
      p.lineTo(x + Math.cos((a0 + a1) / 2) * rr * (0.85 + r() * 0.3), y + Math.sin((a0 + a1) / 2) * rr * (0.85 + r() * 0.3));
      p.lineTo(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
    }
  }
  return p;
}
function drawCracks(path, w = 3) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(10,8,12,0.85)'; ctx.lineWidth = w * 1.8; ctx.stroke(path);
  ctx.strokeStyle = 'rgba(255,250,240,0.85)'; ctx.lineWidth = w * 0.55; ctx.stroke(path);
  ctx.restore();
}
// Draw the cells of a tessellation flying apart. t = seconds since impact.
function shatter(t, cells, colorFn, o = {}) {
  const ix = o.x ?? W / 2, iy = o.y ?? H / 2;
  for (const c of cells) {
    const dx = c.cx - ix, dy = c.cy - iy, d = Math.hypot(dx, dy) + 1;
    const delay = (d / (o.speed || 2200)) + hash(c.seed) * 0.08;
    const tt = Math.max(0, t - delay);
    const v = (o.force || 900) * (0.4 + hash(c.seed + 1) * 0.8) / (1 + d / 900);
    const ox = (dx / d) * v * tt, oy = (dy / d) * v * tt + 0.5 * (o.g ?? 1400) * tt * tt;
    const rot = (hash(c.seed + 2) - 0.5) * 8 * tt;
    const a = 1 - clamp((tt - (o.fade ?? 0.7)) / 0.5);
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(c.cx + ox, c.cy + oy); ctx.rotate(rot); ctx.translate(-c.cx, -c.cy);
    glassPiece(c.path, colorFn(c.cx, c.cy, c), { cx: c.cx, cy: c.cy, r: c.r, seed: c.seed });
    lead(c.path, o.leadW || 5, { halo: false });
    ctx.restore();
  }
}

// ---------- lettering on glass (banderoles / inscriptions) ----------
function banderole(x, y, w, h, text, o = {}) {
  // a curling scroll of pale glass with painted lettering; widens to fit its text
  ctx.save();
  ctx.font = o.font || `${Math.round(h * 0.5)}px "Cinzel"`;
  if (o.ls != null) ctx.letterSpacing = o.ls + 'px';
  const tw = ctx.measureText(text).width;
  ctx.restore();
  w = Math.max(w, tw + h * 1.4);
  const curl = h * 0.5;
  const pts = [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2 - h * 0.08], [x + w / 2 + curl * 0.2, y + h / 2], [x - w / 2 - curl * 0.2, y + h / 2 + h * 0.06]];
  const body = polyPath(pts, 0);
  glassPiece(body, o.col || '#efe6cc', { cx: x, cy: y, r: w * 0.4, seed: 4242, L: o.L });
  for (const sd of [-1, 1]) {
    const ex = x + sd * (w / 2 + curl * 0.1);
    const end = polyPath([[ex, y - h / 2], [ex + sd * curl, y - h / 2 + h * 0.2], [ex + sd * curl * 0.6, y + h * 0.15], [ex + sd * curl, y + h / 2 + h * 0.3], [ex, y + h / 2]]);
    glassPiece(end, o.col2 || '#d8caa4', { cx: ex + sd * curl * 0.5, cy: y, seed: 4243 + sd, L: o.L });
    lead(end, 5);
  }
  lead(body, 6);
  ctx.save();
  ctx.font = o.font || `${Math.round(h * 0.5)}px "Cinzel"`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (o.ls != null) ctx.letterSpacing = o.ls + 'px';
  ctx.fillStyle = o.ink || 'rgba(48,24,14,0.92)';
  ctx.fillText(text, x, y + h * 0.04);
  ctx.restore();
}

// ---------- post ----------
function bloom(amount = 0.35, rad = 7) {
  if (amount <= 0) return;
  if (!E.bA) { E.bA = makeCanvas(480, 270); E.bB = makeCanvas(480, 270); }
  const a = E.bA.getContext('2d'), b = E.bB.getContext('2d');
  a.globalCompositeOperation = 'copy'; a.filter = 'none';
  a.drawImage(E.canvas, 0, 0, 480, 270);
  a.globalCompositeOperation = 'multiply';
  a.drawImage(E.bA, 0, 0);
  b.globalCompositeOperation = 'copy'; b.filter = `blur(${rad}px)`;
  b.drawImage(E.bA, 0, 0);
  b.filter = 'none';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = amount;
  ctx.drawImage(E.bB, 0, 0, W, H);
  ctx.restore();
}
