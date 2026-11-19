'use strict';
// "Rabbit" — a shaggy, hung-over puppet bunny (inspired by the reference: long grey-taupe
// shag, floppy ears, droopy amber eyes, lolling pink tongue, big stitched beige foot pads).
// Local origin = where his backside meets the couch cushion.
const { spriteFor, paintFur, Sprite } = require('./fur');
const U = require('./util');
const P = require('./props');

const C = {
  base: '#7d756d', light: '#b9b0a4', dark: '#37312c',
  earIn: '#bba68b', earInL: '#dccab0', earInD: '#7b6a55',
  pad: '#dccfb4', padL: '#f3ead8', padD: '#a8987a',
  muzzle: '#9c938a',
};
const HEAD = { x: 0, y: -330 }, NECK = { x: 0, y: -235 };
const SH_L = { x: -100, y: -188 }, SH_R = { x: 100, y: -188 };
const EAR_L = { x: -80, y: -408 }, EAR_R = { x: 80, y: -408 };
const ARM_LEN = 120;

function shag(pts, seed, extra = {}) {
  return spriteFor(pts, 48, (c) => paintFur(c, pts, Object.assign({
    base: C.base, lightC: C.light, darkC: C.dark, strand: 15, density: 1.25, edge: 20, droop: 0.55, curl: 1.1,
    width: 1.9, seed, edgeStep: 2.2, flowJitter: 0.7, ao: 0.5,
    flow: (x, y) => Math.PI / 2 + U.clamp(x * 0.004, -0.8, 0.8) + Math.sin(x * 0.05 + y * 0.03) * 0.25,
  }, extra)));
}

function build() {
  const parts = {};
  parts.body = shag(U.blobPts(0, -118, 120, 128, 120, (a) => 1 + 0.08 * Math.sin(a)), 101);
  parts.legL = shag(U.ellipsePts(-74, -14, 62, 50, 80), 102, { droop: 0.3 });
  parts.legR = shag(U.ellipsePts(74, -14, 62, 50, 80), 103, { droop: 0.3 });
  const pad = (sx, seed) => {
    const pts = U.ellipsePts(sx * 80, 14, 46, 56, 80, sx * 0.18);
    return spriteFor(pts, 12, (c) => {
      paintFur(c, pts, { base: C.pad, lightC: C.padL, darkC: C.padD, strand: 3, density: 2.5, edge: 2.5, width: 1, seed, ao: 0.35, dir: [-0.3, -0.7], curl: 0.3 });
      // stitched seam
      c.save(); c.translate(sx * 80, 14); c.rotate(sx * 0.18);
      c.setLineDash([7, 6]); c.strokeStyle = 'rgba(110,92,64,0.75)'; c.lineWidth = 2.2;
      c.beginPath(); c.ellipse(0, 0, 38, 48, 0, 0, U.TAU); c.stroke();
      c.setLineDash([]);
      c.restore();
    });
  };
  parts.padL = pad(-1, 104);
  parts.padR = pad(1, 105);
  const armPts = U.blobPts(0, 56, 38, 76, 80, (a) => 1 + 0.1 * Math.sin(a));
  parts.armL = shag(armPts, 106, { droop: 0.4, edge: 16 });
  parts.armR = shag(armPts, 107, { droop: 0.4, edge: 16 });
  const pawPts = U.ellipsePts(0, 0, 26, 22, 48);
  parts.paw = spriteFor(pawPts, 18, (c) => {
    paintFur(c, pawPts, { base: C.base, lightC: C.light, darkC: C.dark, strand: 8, density: 1.8, edge: 9, droop: 0.4, seed: 108, curl: 1 });
    c.fillStyle = U.rgba(C.pad, 0.9); c.beginPath(); c.ellipse(0, 8, 14, 9, 0, 0, U.TAU); c.fill();
  });
  // ears: long tapered teardrops hanging from the root, drawn in local ear space (root at 0,0, hanging +y)
  const earShape = (sx) => {
    const ctrl = [[0, -14], [sx * 34, 0], [sx * 52, 70], [sx * 50, 170], [sx * 30, 245], [0, 262], [-sx * 24, 240], [-sx * 38, 160], [-sx * 36, 70], [-sx * 22, 0]];
    return U.smoothClosed(ctrl, 10);
  };
  const ear = (sx, seed) => {
    const pts = earShape(sx);
    return spriteFor(pts, 40, (c) => {
      paintFur(c, pts, { base: C.base, lightC: C.light, darkC: C.dark, strand: 16, density: 1.3, edge: 18, droop: 0.5, curl: 1.1, width: 1.9, seed, flow: () => Math.PI / 2, flowJitter: 0.5 });
      const inner = U.smoothClosed([[sx * 4, 30], [sx * 26, 70], [sx * 30, 160], [sx * 14, 228], [sx * -4, 200], [sx * -12, 120], [sx * -8, 60]], 10);
      paintFur(c, inner, { base: C.earIn, lightC: C.earInL, darkC: C.earInD, strand: 9, density: 1.6, edge: 7, droop: 0.3, curl: 0.8, width: 1.5, seed: seed + 9, flow: () => Math.PI / 2, ao: 0.55 });
    });
  };
  parts.earL = ear(-1, 109);
  parts.earR = ear(1, 110);
  parts.head = shag(U.blobPts(HEAD.x, HEAD.y, 128, 114, 140, (a) => 1 + 0.06 * Math.cos(2 * a) + 0.05 * Math.max(0, Math.sin(a))), 111, {
    droop: 0.3, edge: 22, strand: 13,
    flow: (x, y) => Math.atan2(y - HEAD.y + 80, x - HEAD.x) * 0.6 + Math.PI / 2 * 0.4 + Math.sin(x * 0.07) * 0.3,
  });
  const muz = U.blobPts(0, HEAD.y + 50, 66, 46, 80, (a) => 1 + 0.1 * Math.max(0, Math.sin(a)));
  parts.muzzle = spriteFor(muz, 20, (c) => paintFur(c, muz, { base: C.muzzle, lightC: '#c9c0b4', darkC: '#5a524b', strand: 8, density: 1.6, edge: 9, droop: 0.4, seed: 112, curl: 1, ao: 0.25 }));
  const brow = (sx, seed) => {
    const pts = U.blobPts(0, 0, 34, 13, 50);
    return spriteFor(pts, 26, (c) => paintFur(c, pts, { base: '#6c645c', lightC: C.light, darkC: C.dark, strand: 12, density: 2.4, edge: 14, droop: 0.2, seed, curl: 1.2, flow: () => (sx > 0 ? 0.6 : Math.PI - 0.6), flowJitter: 0.9 }));
  };
  parts.browL = brow(-1, 113);
  parts.browR = brow(1, 114);
  parts.nose = (() => {
    const s = new Sprite(-28, -22, 56, 44);
    const c = s.ctx;
    const path = () => { c.beginPath(); c.moveTo(-17, -9); c.bezierCurveTo(-17, -17, 17, -17, 17, -9); c.bezierCurveTo(17, 2, 6, 11, 0, 12); c.bezierCurveTo(-6, 11, -17, 2, -17, -9); c.closePath(); };
    const g = c.createRadialGradient(-5, -9, 1, 0, -3, 20);
    g.addColorStop(0, '#c99383'); g.addColorStop(0.45, '#8f5b4b'); g.addColorStop(1, '#4a2a22');
    c.fillStyle = g; path(); c.fill();
    c.fillStyle = 'rgba(255,235,225,0.6)'; c.beginPath(); c.ellipse(-5, -9, 5, 2.5, -0.2, 0, U.TAU); c.fill();
    return s;
  })();
  parts.mic = P.mic();
  parts.can = P.can();
  return parts;
}

function armTip(sh, ang, len = ARM_LEN) {
  return { x: sh.x - Math.sin(ang) * len, y: sh.y + Math.cos(ang) * len };
}

function drawEye(ctx, cx, cy, sx, st) {
  const lid = U.clamp(st.blink ? 1 : st.lid == null ? 0.38 : st.lid, 0, 1);
  const rx = 23, ry = 21;
  ctx.save();
  ctx.translate(cx, cy);
  // socket shadow
  const sg = ctx.createRadialGradient(0, 2, rx * 0.8, 0, 2, rx * 1.45);
  sg.addColorStop(0, 'rgba(35,28,24,0.55)'); sg.addColorStop(1, 'rgba(35,28,24,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(0, 2, rx * 1.45, ry * 1.45, 0, 0, U.TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, U.TAU);
  ctx.save(); ctx.clip();
  let g = ctx.createRadialGradient(-5, -6, 2, 0, 0, rx * 1.1);
  g.addColorStop(0, '#fffaf2'); g.addColorStop(0.75, '#ece0d4'); g.addColorStop(1, '#c9a9a0');
  ctx.fillStyle = g; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
  // iris looks toward lookX/lookY
  const lx = (st.lookX || 0) * 9, ly = (st.lookY || 0) * 6 + 3;
  g = ctx.createRadialGradient(lx - 3, ly - 3, 1, lx, ly, 14);
  g.addColorStop(0, '#e2b878'); g.addColorStop(0.55, '#a8763d'); g.addColorStop(1, '#4b2e14');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 13.5, 0, U.TAU); ctx.fill();
  ctx.fillStyle = '#120806'; ctx.beginPath(); ctx.arc(lx, ly, 6 + (st.pupil || 0) * 2, 0, U.TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(lx - 4, ly - 5, 3.2, 0, U.TAU); ctx.fill();
  // heavy upper lid (fur coloured), slanted down toward the outer corner for the droopy look
  const ly0 = -ry + lid * ry * 2.1;
  const slant = sx * 6 * (st.lidSlant == null ? 1 : st.lidSlant);
  g = ctx.createLinearGradient(0, -ry, 0, ly0 + 6);
  g.addColorStop(0, '#6f675f'); g.addColorStop(1, '#8b8279');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-rx - 4, -ry - 4); ctx.lineTo(rx + 4, -ry - 4);
  ctx.lineTo(rx + 4, ly0 + slant); ctx.quadraticCurveTo(0, ly0 + 7, -rx - 4, ly0 - slant);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,26,0.8)'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(rx + 4, ly0 + slant); ctx.quadraticCurveTo(0, ly0 + 7, -rx - 4, ly0 - slant); ctx.stroke();
  ctx.restore();
  // pinkish lower rim (hung-over)
  ctx.strokeStyle = 'rgba(190,120,112,0.65)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, 1, rx - 1, ry - 1, 0, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
  ctx.restore();
}

function drawMouth(ctx, st) {
  const open = U.clamp(st.mouth == null ? 0.3 : st.mouth, 0, 1.2);
  const cx = (st.turn || 0) * 26, top = HEAD.y + 46;
  const w = 46 + open * 4;
  const h = 8 + open * 44;
  ctx.save();
  // mouth cavity
  ctx.beginPath();
  ctx.moveTo(cx - w, top - 4);
  ctx.quadraticCurveTo(cx, top + 10, cx + w, top - 4);
  ctx.bezierCurveTo(cx + w * 0.85, top + h, cx + w * 0.35, top + h * 1.2, cx, top + h * 1.2);
  ctx.bezierCurveTo(cx - w * 0.35, top + h * 1.2, cx - w * 0.85, top + h, cx - w, top - 4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, '#1a0507'); g.addColorStop(1, '#5a1a1e');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#2a1712'; ctx.lineWidth = 4; ctx.stroke();
  ctx.restore();
  // lolling tongue (always out a little — his signature)
  const tw = st.tongueWag || 0;
  const tx = cx + 8 + tw * 6, ty = top + h * 0.75;
  const tl = 34 + open * 18 + (st.tongueOut || 0) * 20;
  ctx.save();
  ctx.translate(tx, ty); ctx.rotate(-0.18 + tw * 0.12);
  const tg = ctx.createLinearGradient(0, -10, 0, tl);
  tg.addColorStop(0, '#c44a5c'); tg.addColorStop(0.5, '#ee7488'); tg.addColorStop(1, '#f59aa8');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-22, -6); ctx.bezierCurveTo(-26, tl * 0.6, -16, tl, 0, tl); ctx.bezierCurveTo(16, tl, 26, tl * 0.6, 22, -6); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,40,60,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(1, tl * 0.75); ctx.stroke();
  ctx.fillStyle = 'rgba(255,220,225,0.55)'; ctx.beginPath(); ctx.ellipse(-8, tl * 0.45, 4, 9, 0.1, 0, U.TAU); ctx.fill();
  ctx.restore();
}

function drawEar(ctx, sprite, root, ang, stretch) {
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(ang);
  ctx.scale(1, stretch || 1);
  sprite.draw(ctx);
  ctx.restore();
}

function drawProp(ctx, sprite, tip, ang) {
  ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(ang); sprite.draw(ctx); ctx.restore();
}

/**
 * st: { x, y, scale, lean, bob, tilt, turn, mouth, lid, blink, lookX, lookY, earL, earR (angles), earStretch,
 *       armL, armR, armLLen, armRLen, micAng, canAng, anger, surprise, tongueWag, limp }
 */
function draw(ctx, parts, st) {
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.scale(st.scale, st.scale);
  ctx.translate(0, -(st.lift || 0));
  ctx.rotate(st.lean || 0);
  const sq = st.squash || 0;
  ctx.scale(1 + sq * 0.03, 1 - sq * 0.04);
  const t = st.turn || 0;
  const hb = (st.bob || 0) * 10;
  // ears hang behind the body; they're attached to the head so follow head bob/tilt
  const headXform = () => { ctx.translate(NECK.x, NECK.y + hb); ctx.rotate(st.tilt || 0); ctx.translate(-NECK.x, -NECK.y); };
  ctx.save(); headXform();
  drawEar(ctx, parts.earL, { x: EAR_L.x - t * 8, y: EAR_L.y }, st.earL == null ? 0.35 : st.earL, st.earStretchL);
  drawEar(ctx, parts.earR, { x: EAR_R.x - t * 8, y: EAR_R.y }, st.earR == null ? -0.35 : st.earR, st.earStretchR);
  ctx.restore();
  parts.body.draw(ctx, 0, hb * 0.3);
  parts.legL.draw(ctx); parts.legR.draw(ctx);
  parts.padL.draw(ctx); parts.padR.draw(ctx);
  const aL = st.armL == null ? -0.2 : st.armL;
  const aR = st.armR == null ? 0.2 : st.armR;
  const kL = st.armLLen || 1, kR = st.armRLen || 1;
  // can arm (screen-left) behind the head group
  ctx.save(); ctx.translate(SH_L.x, SH_L.y); ctx.rotate(aL); ctx.scale(1, kL); parts.armL.draw(ctx); ctx.restore();
  const tipL = armTip(SH_L, aL, (ARM_LEN - 10) * kL);
  if (st.propL !== false) drawProp(ctx, parts.can, { x: tipL.x, y: tipL.y - 6 }, st.canAng == null ? aL * 0.3 : st.canAng);
  parts.paw.draw(ctx, tipL.x, tipL.y + 4);
  // head
  ctx.save(); headXform();
  parts.head.draw(ctx);
  parts.muzzle.draw(ctx, t * 24, 0);
  const anger = st.anger || 0, sur = st.surprise || 0;
  for (const sx of [-1, 1]) drawEye(ctx, sx * 42 + t * 20, HEAD.y - 22, sx, sx > 0 && st.winkR ? Object.assign({}, st, { blink: true }) : st);
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * 44 + t * 18, HEAD.y - 58 - sur * 14 + anger * 4);
    ctx.rotate(sx * (-anger * 0.35 + sur * 0.25 - 0.12));
    (sx < 0 ? parts.browL : parts.browR).draw(ctx);
    ctx.restore();
  }
  drawMouth(ctx, st);
  parts.nose.draw(ctx, t * 30, HEAD.y + 26);
  ctx.restore();
  // mic arm (screen-right) in front
  ctx.save(); ctx.translate(SH_R.x, SH_R.y); ctx.rotate(aR); ctx.scale(1, kR); parts.armR.draw(ctx); ctx.restore();
  const tipR = armTip(SH_R, aR, (ARM_LEN - 10) * kR);
  if (st.propR !== false) drawProp(ctx, parts.mic, tipR, st.micAng == null ? aR * 0.3 + 0.2 : st.micAng);
  parts.paw.draw(ctx, tipR.x, tipR.y + 4);
  ctx.restore();
}

const MIC_POSE = { armR: 0.85, armRLen: 0.74, micAng: -0.32 };
module.exports = { build, draw, C, HEAD, MIC_POSE, SH_L, SH_R, armTip };
