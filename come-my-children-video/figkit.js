'use strict';
// Figure toolkit: smooth glass regions cut by lead, grisaille brushwork and matting, unions,
// and the living vein-web of the blood form.

// ---------- smooth curves ----------
// Catmull-Rom spline through points as cubic Béziers; a point [x, y, 1] is a sharp corner.
function crBez(pts, closed, fn) {
  const n = pts.length, segs = closed ? n : n - 1;
  const P = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = p1[2] ? [p1[0] + (p2[0] - p1[0]) / 3, p1[1] + (p2[1] - p1[1]) / 3] : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = p2[2] ? [p2[0] - (p2[0] - p1[0]) / 3, p2[1] - (p2[1] - p1[1]) / 3] : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    fn(p1, c1, c2, p2);
  }
}
function spath(pts, closed = true, path = new Path2D()) {
  path.moveTo(pts[0][0], pts[0][1]);
  crBez(pts, closed, (a, c1, c2, b) => path.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], b[0], b[1]));
  if (closed) path.closePath();
  return path;
}
function ssample(pts, closed = true, k = 8) {
  const out = [];
  crBez(pts, closed, (a, c1, c2, b) => {
    for (let i = 0; i < k; i++) {
      const t = i / k, u = 1 - t, A = u * u * u, B = 3 * u * u * t, C = 3 * u * t * t, D = t * t * t;
      out.push([A * a[0] + B * c1[0] + C * c2[0] + D * b[0], A * a[1] + B * c1[1] + C * c2[1] + D * b[1]]);
    }
  });
  if (!closed) { const l = pts[pts.length - 1]; out.push([l[0], l[1]]); }
  return out;
}
const mxp = (pts) => pts.map((p) => [-p[0], p[1], p[2]]);
const offp = (pts, dx, dy, s = 1) => pts.map((p) => [p[0] * s + dx, p[1] * s + dy, p[2]]);
function bowPt(a, b, k) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return [(a[0] + b[0]) / 2 - dy * k, (a[1] + b[1]) / 2 + dx * k];
}
// a tapering tongue (hair lock, flame, fold): base b0–b1 to a tip, both sides bowed by k
function tongue(b0, b1, tip, k = 0, k2 = k) {
  return [[b0[0], b0[1], 1], bowPt(b0, tip, k), [tip[0], tip[1], 1], bowPt(b1, tip, k2), [b1[0], b1[1], 1]];
}
function tongueStrands(b0, b1, tip, k, n, stop = 0.82) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const u = i / (n + 1), s = [lerp(b0[0], b1[0], u), lerp(b0[1], b1[1], u)];
    const e = [lerp(s[0], tip[0], stop), lerp(s[1], tip[1], stop)];
    out.push([[s[0], s[1]], bowPt(s, tip, k * 0.9), e]);
  }
  return out;
}
// capsule around a polyline axis: flat at the start, rounded at the end
function capsulePts(axis, w, w2 = w) {
  const s = ssample(axis, false, 6), n = s.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = s[Math.max(0, i - 1)], q = s[Math.min(n - 1, i + 1)];
    let dx = q[0] - p[0], dy = q[1] - p[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = lerp(w, w2, i / (n - 1)) / 2;
    L.push([s[i][0] - dy * hw, s[i][1] + dx * hw]);
    R.push([s[i][0] + dy * hw, s[i][1] - dx * hw]);
  }
  const e = s[n - 1], p = s[n - 2], a = Math.atan2(e[1] - p[1], e[0] - p[0]), cap = [];
  for (let k = 1; k < 6; k++) { const aa = a + Math.PI / 2 - (k / 6) * Math.PI; cap.push([e[0] + Math.cos(aa) * w2 / 2, e[1] + Math.sin(aa) * w2 / 2]); }
  return L.concat(cap, R.reverse());
}

// ---------- grisaille ----------
function brushPoly(pts, w, a = 0.12, b = 0.12) {
  const s = ssample(pts, false, 8), n = s.length, L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const tot = L[n - 1] || 1, left = [], right = [];
  for (let i = 0; i < n; i++) {
    const p = s[Math.max(0, i - 1)], q = s[Math.min(n - 1, i + 1)];
    let dx = q[0] - p[0], dy = q[1] - p[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = L[i] / tot;
    const hw = (w / 2) * Math.max(lerp(a, b, u), Math.pow(Math.sin(Math.PI * u), 0.55));
    left.push([s[i][0] - dy * hw, s[i][1] + dx * hw]);
    right.push([s[i][0] + dy * hw, s[i][1] - dx * hw]);
  }
  return left.concat(right.reverse());
}
const INK = 'rgba(42,20,12,0.9)';
// a tapered painted line
function brush(pts, w, o = {}) {
  const poly = brushPoly(pts, w, o.a ?? 0.12, o.b ?? 0.12);
  ctx.fillStyle = o.c || INK;
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath(); ctx.fill();
}
// soft matting along a path: a blurred wash of paint (blur scaled to the current transform)
function devScale() {
  const m = ctx.getTransform();
  return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
}
function matteStroke(path, w, a = 0.2, col = '42,20,12') {
  const sc = devScale();
  ctx.save();
  ctx.filter = `blur(${Math.min(48, Math.max(0.5, w * 0.3 * sc)).toFixed(1)}px)`;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = `rgba(${col},${Math.min(1, a * 1.15)})`; ctx.lineWidth = w * 0.62;
  ctx.stroke(path);
  ctx.restore();
}
function matteLine(pts, w, a = 0.2, closed = false) { matteStroke(spath(pts, closed), w, a); }
function matteEll(x, y, rx, ry, a = 0.2, rot = 0, col = '42,20,12') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
  ctx.restore();
}
// scratched-out highlight: light straight through the paint
function pickOut(pts, w, a = 0.3) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  brush(pts, w, { c: `rgba(255,246,230,${a})` });
  ctx.restore();
}

// ---------- lead that becomes blood ----------
function leadLine(path, w) {
  w *= E.leadK || 1;
  if ((E.blood || 0) > 0.05) bloodLead(path, w, E.blood);
  else lead(path, w);
}

// ---------- regions ----------
// A glass region: a smooth outline filled with one glass colour, optional sub-panels of other
// colours (clipped to the outline), internal lead cuts, cached brushwork, matting and strands.
const _regCache = new Map();
let _regSeed = 1;
function _mkPiece(pts, poly) {
  const path = poly ? polyPath(pts) : spath(pts, true);
  const sm = poly ? pts : ssample(pts, true, 6);
  const [cx, cy] = centroid(sm);
  return { path, cx, cy, r: Math.sqrt(polyArea(sm)) * 0.62 };
}
function regGeo(key, defFn) {
  let g = _regCache.get(key);
  if (g) return g;
  const d = defFn();
  g = _mkPiece(d.out, d.poly);
  g.seed = (_regSeed++ * 7919) % 100000;
  g.panels = (d.panels || []).map((p, i) => Object.assign(_mkPiece(p.pts, p.poly), { ci: p.ci ?? 1, seed: g.seed + (i + 1) * 131 }));
  if (d.cuts && d.cuts.length) { g.cuts = new Path2D(); d.cuts.forEach((c) => spath(c, false, g.cuts)); }
  if (d.strands && d.strands.length) { g.strands = new Path2D(); d.strands.forEach((c) => spath(c, false, g.strands)); }
  if (d.brushes && d.brushes.length) { g.brushes = new Path2D(); d.brushes.forEach((b) => g.brushes.addPath(polyPath(brushPoly(b.pts, b.w, b.a ?? 0.12, b.b ?? 0.12)))); }
  if (d.mattes && d.mattes.length) g.mattes = d.mattes.map((m) => ({ path: spath(m.pts, !!m.closed), w: m.w, a: m.a ?? 0.2 }));
  if (d.extra) g.extra = d.extra;
  _regCache.set(key, g);
  return g;
}
function _bloodCol(c, o) {
  const bl = E.blood || 0;
  if (bl > 0 && !o.keep) return lerpRGB(c, o.bloodCol || '#3c0008', bl * (o.bloodK ?? 0.8));
  return c;
}
function region(key, defFn, cols, o = {}) {
  const g = regGeo(key, defFn);
  const C = (i) => _bloodCol(typeof cols === 'function' ? cols(i) : Array.isArray(cols) ? cols[Math.min(i, cols.length - 1)] : cols, o);
  const po = (x) => ({ cx: x.cx, cy: x.cy, r: x.r, seed: x.seed, lk: o.lk, sat: o.sat, vary: o.vary, tex: o.tex, glow: o.glow, glowR: o.glowR, L: o.L });
  if (o.halo !== false && o.lead !== false && o.under) o.under(g);
  glassPiece(g.path, C(0), po(g));
  if (g.panels.length || g.cuts || g.strands || g.brushes || g.mattes || o.paint || o.veins) {
    ctx.save();
    ctx.clip(g.path);
    for (const p of g.panels) glassPiece(p.path, C(p.ci), po(p));
    if (g.mattes) for (const m of g.mattes) matteStroke(m.path, m.w, m.a * (o.matteK ?? 1));
    if (g.strands) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = o.strandCol || 'rgba(44,26,22,0.4)'; ctx.lineWidth = o.strandW || 1.6;
      ctx.stroke(g.strands);
    }
    if (g.brushes) { ctx.fillStyle = o.ink || INK; ctx.fill(g.brushes); }
    if (o.paint) o.paint(g);
    if (o.veins && (E.blood || 0) > 0.05) drawVeins(veinGeo(o.veins.key, o.veins.roots, o.veins), o.veins.w || 3, E.blood, E.pulse ?? 1);
    if (g.cuts) leadLine(g.cuts, (o.lw || 5) * (o.cutK ?? 0.8));
    ctx.restore();
  }
  if (o.lead !== false) leadLine(g.path, o.lw || 5);
  return g;
}
// A set of separate glass pieces sharing one lead pass (flames, links, studs, shards).
function glassSet(key, defFn, cols, o = {}) {
  let g = _regCache.get(key);
  if (!g) {
    const d = defFn();
    g = { pieces: d.map((p, i) => Object.assign(_mkPiece(p.pts || p, p.poly), { ci: p.ci ?? i, seed: (_regSeed * 31 + i * 97) % 100000 })) };
    _regSeed++;
    g.lead = new Path2D(); g.pieces.forEach((p) => g.lead.addPath(p.path));
    _regCache.set(key, g);
  }
  const C = (i) => _bloodCol(typeof cols === 'function' ? cols(i) : Array.isArray(cols) ? cols[i % cols.length] : cols, o);
  for (const p of g.pieces) glassPiece(p.path, C(p.ci), { cx: p.cx, cy: p.cy, r: p.r, seed: p.seed, lk: o.lk, sat: o.sat, tex: o.tex, glow: o.glow, glowR: o.glowR, L: o.L });
  if (o.lead !== false) leadLine(g.lead, o.lw || 4);
  return g;
}
// A single piece whose outline is the union of several shapes (a hand: palm, fingers, thumb).
// The lead is stroked first at double width, then the glass covers its inner half.
function unionPiece(key, defFn, col, o = {}) {
  let g = _regCache.get(key);
  if (!g) {
    const d = defFn();
    const path = new Path2D(), all = [];
    // nonzero fill needs every shape wound the same way, or overlaps cancel into holes
    const signed = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a; };
    d.shapes.forEach((s) => {
      let pts = s.pts;
      if (signed(s.poly ? pts : ssample(pts, true, 4)) < 0) pts = pts.slice().reverse();
      path.addPath(s.poly ? polyPath(pts) : spath(pts, true));
      all.push(...(s.poly ? pts : ssample(pts, true, 4)));
    });
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    g = { path, cx, cy, r: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.45, seed: (_regSeed++ * 4421) % 100000 };
    if (d.brushes) { g.brushes = new Path2D(); d.brushes.forEach((b) => g.brushes.addPath(polyPath(brushPoly(b.pts, b.w, b.a ?? 0.12, b.b ?? 0.12)))); }
    if (d.mattes) g.mattes = d.mattes.map((m) => ({ path: spath(m.pts, !!m.closed), w: m.w, a: m.a ?? 0.2 }));
    _regCache.set(key, g);
  }
  leadLine(g.path, (o.lw || 4) * 2);
  glassPiece(g.path, _bloodCol(col, o), { cx: g.cx, cy: g.cy, r: g.r, seed: g.seed, lk: o.lk, sat: o.sat });
  ctx.save(); ctx.clip(g.path);
  if (g.mattes) for (const m of g.mattes) matteStroke(m.path, m.w, m.a);
  if (g.brushes) { ctx.fillStyle = o.ink || 'rgba(60,32,22,0.55)'; ctx.fill(g.brushes); }
  if (o.paint) o.paint(g);
  ctx.restore();
  return g;
}

// ---------- fold helpers ----------
// fold lines fanning from a top edge (y0) to a bottom edge (y1); panels between them
function fanFolds(tops, bots, y0, y1, bow = 0.05, ext = 400) {
  const pairs = tops.map((x, i) => [x, bots[i]]).sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  const lines = pairs.map(([x, xb], i) => [[x, y0 - 30], bowPt([x, y0], [xb, y1], bow * (i % 2 ? 1 : -1)), [xb, y1 + 30]]);
  const samp = lines.map((l) => ssample(l, false, 6));
  const lo = Math.min(...tops, ...bots) - ext, hi = Math.max(...tops, ...bots) + ext;
  const all = [[[lo, y0 - 30], [lo, y1 + 30]], ...samp, [[hi, y0 - 30], [hi, y1 + 30]]], panels = [];
  for (let i = 0; i + 1 < all.length; i++) panels.push({ pts: all[i].concat(all[i + 1].slice().reverse()), poly: true, ci: i });
  return { cuts: lines, panels };
}

// ---------- veins (blood form) ----------
function veinGeo(key, roots, o = {}) {
  let g = _regCache.get('vein_' + key);
  if (g) return g;
  const r = rng(o.seed || 7), lv = [new Path2D(), new Path2D(), new Path2D()];
  const grow = (x, y, a, len, d) => {
    const steps = 6, p = lv[Math.min(2, d)];
    p.moveTo(x, y);
    for (let i = 0; i < steps; i++) {
      a += (r() - 0.5) * (o.wander ?? 0.7);
      x += (Math.cos(a) * len) / steps; y += (Math.sin(a) * len) / steps;
      p.lineTo(x, y);
      if (d < 3 && r() < (o.branch ?? 0.38)) { grow(x, y, a + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.6), len * 0.55, d + 1); p.moveTo(x, y); }
    }
  };
  for (const [x, y, a, len] of roots) grow(x, y, a, len, 0);
  g = lv;
  _regCache.set('vein_' + key, g);
  return g;
}
function drawVeins(lv, w, glow, pulse = 1) {
  if (glow <= 0.01) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  lv.forEach((p, d) => {
    const ww = w * [1, 0.62, 0.38][d];
    ctx.strokeStyle = `rgba(200,10,18,${0.16 * glow * pulse})`; ctx.lineWidth = ww * 5; ctx.stroke(p);
    ctx.strokeStyle = `rgba(235,20,24,${0.28 * glow * pulse})`; ctx.lineWidth = ww * 2.4; ctx.stroke(p);
    ctx.strokeStyle = `rgba(255,${(70 + 90 * pulse) | 0},${(40 + 40 * pulse) | 0},${0.9 * glow})`; ctx.lineWidth = ww; ctx.stroke(p);
  });
  ctx.restore();
}
