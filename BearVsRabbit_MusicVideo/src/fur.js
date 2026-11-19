'use strict';
// Plush / shaggy fur painter and sprite container.
// Shapes are closed point lists in a character's local coordinate space; each body part
// is painted once into a supersampled sprite, then transformed every frame.
const { createCanvas } = require('@napi-rs/canvas');
const U = require('./util');

const RES = 2; // sprite supersampling so close-ups (zoom ~2.3) stay crisp

class Sprite {
  constructor(x0, y0, w, h, res = RES) {
    this.x0 = x0; this.y0 = y0; this.w = w; this.h = h; this.res = res;
    this.canvas = createCanvas(Math.max(1, Math.ceil(w * res)), Math.max(1, Math.ceil(h * res)));
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(res, res);
    this.ctx.translate(-x0, -y0);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }
  draw(ctx, dx = 0, dy = 0) {
    ctx.drawImage(this.canvas, this.x0 + dx, this.y0 + dy, this.w, this.h);
  }
}
function spriteFor(pts, pad, paint, res) {
  const b = U.bounds(pts);
  const s = new Sprite(Math.floor(b.x0 - pad), Math.floor(b.y0 - pad), Math.ceil(b.w + pad * 2), Math.ceil(b.h + pad * 2), res);
  paint(s.ctx);
  return s;
}

function inPoly(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// resample a closed polyline to roughly uniform spacing
function resample(pts, step) {
  const out = [];
  const n = pts.length;
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    let d = carry;
    while (d < len) {
      const t = d / len;
      out.push({ x: a[0] + dx * t, y: a[1] + dy * t, tx: dx / len, ty: dy / len });
      d += step;
    }
    carry = d - len;
  }
  return out;
}
function signedArea(pts) {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1]);
  return s;
}

/**
 * Paint a furry shape.
 * o.base/light/dark: colours; o.seed; o.light: [lx,ly] light direction (unit-ish, from centre);
 * o.strand: interior strand length; o.density: strands per 100px^2; o.edge: edge fuzz length;
 * o.flow(x,y) -> angle of fur growth; o.droop: 0..1 how much edge fur hangs down (shaggy);
 * o.curl: strand curvature; o.ao: edge darkening strength; o.width: strand width
 */
function paintFur(ctx, pts, o) {
  const R = U.rng(o.seed || 1);
  const b = U.bounds(pts);
  const L = o.dir || [-0.45, -0.6];
  const base = o.base, light = o.lightC, dark = o.darkC;
  const lf = (x, y) => U.clamp(0.5 + (((x - b.cx) / (b.w * 0.5)) * L[0] + ((y - b.cy) / (b.h * 0.5)) * L[1]) * 0.55);

  // --- edge fuzz behind the body (gives the silhouette its softness)
  const ccw = signedArea(pts) > 0;
  const edgePts = resample(pts, o.edgeStep || 2.6);
  const edgeLen = o.edge || 8;
  const droop = o.droop || 0;
  const drawEdge = (pass) => {
    for (const p of edgePts) {
      let nx = p.ty, ny = -p.tx;
      if (!ccw) { nx = -nx; ny = -ny; }
      // hang shaggy fur downward
      nx = U.lerp(nx, nx * 0.35, droop); ny = U.lerp(ny, Math.max(ny, 0) * 0.5 + 0.9, droop);
      const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const k = pass === 0 ? 2 : 1;
      for (let i = 0; i < k; i++) {
        const ang = Math.atan2(ny, nx) + (R() - 0.5) * (o.edgeJitter || 1.3);
        const len = edgeLen * (0.3 + R() * R() * 1.3) * (pass === 1 ? 0.7 : 1) * (droop ? U.lerp(1, 1.6, Math.max(0, ny)) : 1);
        const sx = p.x - nx * edgeLen * 0.45, sy = p.y - ny * edgeLen * 0.45;
        const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
        const l = lf(p.x, p.y);
        const tone = pass === 0 ? U.lerp(-0.4, 0.0, l) + (R() - 0.5) * 0.15 : U.lerp(-0.2, 0.18, l) + (R() - 0.5) * 0.2;
        ctx.strokeStyle = tone < 0 ? U.mix(base, dark, -tone * 1.4, pass === 0 ? 0.85 : 0.7) : U.mix(base, light, tone * 1.2, pass === 0 ? 0.85 : 0.7);
        ctx.lineWidth = (o.width || 1.6) * (0.7 + R() * 0.7) * (pass === 0 ? 1.3 : 1);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const c = (R() - 0.5) * (o.curl || 0.4) * len;
        ctx.quadraticCurveTo((sx + ex) / 2 - ny * c, (sy + ey) / 2 + nx * c, ex, ey);
        ctx.stroke();
      }
    }
  };
  drawEdge(0);

  // --- body fill + volume shading
  ctx.save();
  U.tracePts(ctx, pts);
  ctx.fillStyle = base;
  ctx.fill();
  ctx.clip();
  const big = Math.max(b.w, b.h);
  let g = ctx.createRadialGradient(b.cx + L[0] * b.w * 0.35, b.cy + L[1] * b.h * 0.35, 0, b.cx + L[0] * b.w * 0.2, b.cy + L[1] * b.h * 0.2, big * 0.75);
  g.addColorStop(0, U.rgba(light, 0.75));
  g.addColorStop(0.55, U.rgba(light, 0.12));
  g.addColorStop(1, U.rgba(light, 0));
  ctx.fillStyle = g;
  ctx.fillRect(b.x0 - 5, b.y0 - 5, b.w + 10, b.h + 10);
  g = ctx.createLinearGradient(b.cx + L[0] * b.w * 0.5, b.cy + L[1] * b.h * 0.5, b.cx - L[0] * b.w * 0.5, b.cy - L[1] * b.h * 0.5);
  g.addColorStop(0, U.rgba(dark, 0));
  g.addColorStop(0.55, U.rgba(dark, 0.05));
  g.addColorStop(1, U.rgba(dark, 0.62));
  ctx.fillStyle = g;
  ctx.fillRect(b.x0 - 5, b.y0 - 5, b.w + 10, b.h + 10);
  // ambient occlusion rim (inside)
  ctx.save();
  ctx.filter = `blur(${Math.max(2, big * 0.035)}px)`;
  U.tracePts(ctx, pts);
  ctx.strokeStyle = U.rgba(dark, o.ao == null ? 0.45 : o.ao);
  ctx.lineWidth = big * 0.12;
  ctx.stroke();
  ctx.restore();

  // --- interior strands
  const area = b.w * b.h;
  const count = Math.floor((area / 100) * (o.density || 1.4));
  const sl = o.strand || 7;
  for (let i = 0; i < count; i++) {
    const x = b.x0 + R() * b.w, y = b.y0 + R() * b.h;
    if (!inPoly(pts, x, y)) continue;
    const a = (o.flow ? o.flow(x, y) : Math.PI / 2) + (R() - 0.5) * (o.flowJitter || 1.2);
    const len = sl * (0.5 + R());
    const l = lf(x, y);
    const tone = U.lerp(-0.55, 0.55, l) + (R() - 0.5) * 0.8;
    ctx.strokeStyle = tone < 0 ? U.mix(base, dark, Math.min(1, -tone), 0.22 + R() * 0.3) : U.mix(base, light, Math.min(1, tone), 0.2 + R() * 0.3);
    ctx.lineWidth = (o.width || 1.6) * (0.6 + R() * 0.8);
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const c = (R() - 0.5) * (o.curl || 0.4) * len;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + ex) / 2 + Math.sin(a) * c, (y + ey) / 2 - Math.cos(a) * c, ex, ey);
    ctx.stroke();
  }
  // soft speckle so it reads as fabric, not paint
  for (let i = 0; i < count * 0.25; i++) {
    const x = b.x0 + R() * b.w, y = b.y0 + R() * b.h;
    ctx.fillStyle = R() < 0.5 ? U.rgba(dark, 0.08) : U.rgba(light, 0.08);
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.restore();
  // --- front edge fuzz (over the fill so the outline breaks up)
  drawEdge(1);
}

module.exports = { Sprite, spriteFor, paintFur, inPoly, resample, RES };
