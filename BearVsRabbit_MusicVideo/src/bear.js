'use strict';
// "Bear" — a foul-mouthed plush teddy (inspired by the reference plush: caramel fur,
// pale muzzle, bushy brows, glossy bead eyes). Local origin = between the feet on the floor.
const { spriteFor, paintFur, Sprite } = require('./fur');
const U = require('./util');
const P = require('./props');

const C = {
  base: '#b5875a', light: '#e6c49a', dark: '#5f3f24',
  muzzle: '#ecd0b5', muzzleL: '#fff1e2', muzzleD: '#b8916f',
  earIn: '#86593a', brow: '#8e6139', browL: '#c49a6c', browD: '#4f321b',
};
const HEAD = { x: 0, y: -405 }, NECK = { x: 0, y: -300 };
const SH_L = { x: -104, y: -238 }, SH_R = { x: 104, y: -238 };
const ARM_LEN = 112;

function build() {
  const fur = (pts, seed, extra = {}) => spriteFor(pts, 26, (c) => paintFur(c, pts, Object.assign({
    base: C.base, lightC: C.light, darkC: C.dark, strand: 7, density: 1.6, edge: 6, seed, edgeStep: 1.8,
    flow: (x, y) => Math.PI / 2 + U.clamp(x * 0.004, -0.9, 0.9), curl: 0.6, width: 1.5,
  }, extra)));
  const parts = {};
  parts.footL = fur(U.ellipsePts(-62, -26, 60, 32, 72), 11);
  parts.footR = fur(U.ellipsePts(62, -26, 60, 32, 72), 12);
  parts.legL = fur(U.ellipsePts(-54, -78, 54, 62, 72), 13);
  parts.legR = fur(U.ellipsePts(54, -78, 54, 62, 72), 14);
  parts.body = fur(U.blobPts(0, -180, 114, 126, 120, (a) => 1 + 0.07 * Math.sin(a) - 0.03 * Math.cos(2 * a)), 15, { density: 1.8 });
  const armPts = U.blobPts(0, 52, 34, 72, 80, (a) => 1 + 0.08 * Math.sin(a));
  parts.armL = fur(armPts, 16, { flow: () => Math.PI / 2, dir: [-0.6, -0.4] });
  parts.armR = fur(armPts, 17, { flow: () => Math.PI / 2, dir: [-0.6, -0.4] });
  // ears (outer + inner)
  const ear = (sx, seed) => {
    const pts = U.ellipsePts(sx * 122, HEAD.y - 108, 50, 47, 72);
    return spriteFor(pts, 24, (c) => {
      paintFur(c, pts, { base: C.base, lightC: C.light, darkC: C.dark, strand: 6, density: 1.8, edge: 7, seed, flow: (x, y) => Math.atan2(y - (HEAD.y - 108), x - sx * 122), flowJitter: 0.6 });
      const inner = U.ellipsePts(sx * 116, HEAD.y - 102, 28, 26, 48);
      paintFur(c, inner, { base: C.earIn, lightC: '#b17f57', darkC: '#3f2614', strand: 4, density: 2, edge: 4, seed: seed + 50, ao: 0.6, dir: [0.2 * -sx, 0.6] });
    });
  };
  parts.earL = ear(-1, 21);
  parts.earR = ear(1, 22);
  parts.head = fur(U.blobPts(HEAD.x, HEAD.y, 154, 136, 140, (a) => 1 + 0.05 * Math.cos(2 * a) + 0.035 * Math.max(0, Math.sin(a)) - 0.02 * Math.cos(4 * a)), 23, {
    density: 2, flow: (x, y) => Math.atan2(y - HEAD.y + 40, x - HEAD.x) + 0.0, flowJitter: 0.9, edge: 9,
  });
  const muz = U.blobPts(0, HEAD.y + 46, 74, 56, 90, (a) => 1 + 0.06 * Math.max(0, Math.sin(a)));
  parts.muzzle = spriteFor(muz, 16, (c) => paintFur(c, muz, {
    base: C.muzzle, lightC: C.muzzleL, darkC: C.muzzleD, strand: 4, density: 2.2, edge: 4, width: 1.2, seed: 31, ao: 0.32,
    flow: (x, y) => Math.atan2(y - (HEAD.y + 30), x), dir: [-0.2, -0.8],
  }));
  const brow = (sx, seed) => {
    const pts = U.blobPts(0, 0, 44, 15, 60, (a) => 1 + 0.25 * Math.sin(a) * (Math.cos(a) * sx > 0 ? 0.4 : 1));
    return spriteFor(pts, 16, (c) => paintFur(c, pts, { base: C.brow, lightC: C.browL, darkC: C.browD, strand: 7, density: 2.6, edge: 8, seed, curl: 0.8, flow: () => (sx > 0 ? -0.35 : Math.PI + 0.35), flowJitter: 0.7, ao: 0.3, dir: [0, -1] }));
  };
  parts.browL = brow(-1, 41);
  parts.browR = brow(1, 42);
  // glossy bead eye
  parts.eye = (() => {
    const s = new Sprite(-20, -20, 40, 40);
    const c = s.ctx;
    c.fillStyle = 'rgba(60,35,15,0.35)'; c.beginPath(); c.arc(0, 2, 15, 0, U.TAU); c.fill();
    const g = c.createRadialGradient(-3, -4, 1, 0, 0, 12);
    g.addColorStop(0, '#5a3a22'); g.addColorStop(0.4, '#1d0f07'); g.addColorStop(1, '#050202');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 11.5, 0, U.TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.ellipse(-4, -4.5, 3.6, 2.8, -0.5, 0, U.TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(4, 4, 1.6, 0, U.TAU); c.fill();
    return s;
  })();
  parts.nose = (() => {
    const s = new Sprite(-34, -26, 68, 50);
    const c = s.ctx;
    const path = () => { c.beginPath(); c.moveTo(-24, -12); c.bezierCurveTo(-24, -22, 24, -22, 24, -12); c.bezierCurveTo(24, 2, 8, 14, 0, 15); c.bezierCurveTo(-8, 14, -24, 2, -24, -12); c.closePath(); };
    c.fillStyle = 'rgba(70,40,20,0.35)'; c.save(); c.translate(0, 4); c.scale(1.08, 1.08); path(); c.fill(); c.restore();
    const g = c.createRadialGradient(-7, -12, 1, 0, -4, 26);
    g.addColorStop(0, '#5b5b62'); g.addColorStop(0.25, '#1c1c20'); g.addColorStop(1, '#030304');
    c.fillStyle = g; path(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(-8, -12, 7, 3.5, -0.2, 0, U.TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(9, -9, 3, 1.6, 0.3, 0, U.TAU); c.fill();
    return s;
  })();
  const pawPts = U.ellipsePts(0, 0, 25, 22, 48);
  parts.paw = spriteFor(pawPts, 14, (c) => paintFur(c, pawPts, { base: C.base, lightC: C.light, darkC: C.dark, strand: 5, density: 2, edge: 5, seed: 61, edgeStep: 1.8 }));
  parts.mic = P.mic();
  parts.bottle = P.bottle();
  return parts;
}

function armTip(sh, ang, len = ARM_LEN) {
  return { x: sh.x - Math.sin(ang) * len, y: sh.y + Math.cos(ang) * len };
}

function drawMouth(ctx, st) {
  const open = U.clamp(st.mouth || 0, 0, 1.2);
  const cx = st.turn * 30, top = HEAD.y + 62;
  const w = 40 - open * 6 + (st.smile || 0) * 4;
  ctx.strokeStyle = '#2b140a'; ctx.lineCap = 'round';
  // philtrum
  ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(cx, HEAD.y + 38); ctx.lineTo(cx, top + 2); ctx.stroke();
  const smile = (st.smile || 0) * 8 - (st.frown || 0) * 8;
  if (open < 0.06) {
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - w, top - smile * 0.4); ctx.quadraticCurveTo(cx, top + 10 + smile, cx + w, top - smile * 0.4); ctx.stroke();
    return;
  }
  const h = 6 + open * 40;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - w, top - smile * 0.4);
  ctx.quadraticCurveTo(cx, top + 6 + smile * 0.5, cx + w, top - smile * 0.4);
  ctx.bezierCurveTo(cx + w * 0.9, top + h * 0.9, cx + w * 0.4, top + h * 1.15, cx, top + h * 1.15);
  ctx.bezierCurveTo(cx - w * 0.4, top + h * 1.15, cx - w * 0.9, top + h * 0.9, cx - w, top - smile * 0.4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, '#1a0604'); g.addColorStop(1, '#4a1410');
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#d4626a';
  ctx.beginPath(); ctx.ellipse(cx + 2, top + h * 1.12, w * 0.62, h * 0.42, 0, 0, U.TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,170,170,0.5)';
  ctx.beginPath(); ctx.ellipse(cx - 4, top + h * 0.95, w * 0.25, h * 0.12, 0, 0, U.TAU); ctx.fill();
  ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = '#2b140a';
  ctx.beginPath(); ctx.moveTo(cx - w, top - smile * 0.4); ctx.quadraticCurveTo(cx, top + 6 + smile * 0.5, cx + w, top - smile * 0.4); ctx.stroke();
}

function drawProp(ctx, sprite, tip, ang, extra = 0) {
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(ang + extra);
  sprite.draw(ctx);
  ctx.restore();
}

/**
 * st: { x, y, scale, lean, bob, tilt, turn, mouth, anger, surprise, armL, armR, micToMouth, smile, frown, lift }
 */
function draw(ctx, parts, st) {
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.scale(st.scale, st.scale);
  // floor shadow
  const sh = ctx.createRadialGradient(0, -6, 10, 0, -6, 200);
  sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.save(); ctx.scale(1, 0.18); ctx.beginPath(); ctx.arc(0, -30, 200, 0, U.TAU); ctx.fill(); ctx.restore();

  const sq = st.squash || 0;
  ctx.translate(0, -(st.lift || 0));
  ctx.rotate(st.lean || 0);
  ctx.scale(1 + sq * 0.025, 1 - sq * 0.035);
  parts.legL.draw(ctx); parts.legR.draw(ctx);
  parts.footL.draw(ctx); parts.footR.draw(ctx);
  const bodyDy = (st.bob || 0) * 4;
  ctx.save(); ctx.translate(0, bodyDy);
  parts.body.draw(ctx);
  // bottle arm (screen-right) goes behind head only when lowered
  const aR = st.armR == null ? 0.25 : st.armR;
  const aL = st.armL == null ? -0.25 : st.armL;
  const kR = st.armRLen || 1, kL = st.armLLen || 1;
  const drawArmR = () => {
    ctx.save(); ctx.translate(SH_R.x, SH_R.y); ctx.rotate(aR); ctx.scale(1, kR); parts.armR.draw(ctx); ctx.restore();
    const tip = armTip(SH_R, aR, (ARM_LEN - 8) * kR);
    if (st.propR !== false) drawProp(ctx, parts.bottle, tip, st.bottleAng == null ? aR * 0.35 : st.bottleAng);
    parts.paw.draw(ctx, tip.x, tip.y + 4);
  };
  const drawArmL = () => {
    ctx.save(); ctx.translate(SH_L.x, SH_L.y); ctx.rotate(aL); ctx.scale(1, kL); parts.armL.draw(ctx); ctx.restore();
    const tip = armTip(SH_L, aL, (ARM_LEN - 6) * kL);
    if (st.propL !== false) drawProp(ctx, parts.mic, tip, st.micAng == null ? aL * 0.3 - 0.2 : st.micAng);
    parts.paw.draw(ctx, tip.x, tip.y + 4);
  };
  drawArmR();
  // head group
  ctx.save();
  ctx.translate(NECK.x, NECK.y + (st.bob || 0) * 10);
  ctx.rotate(st.tilt || 0);
  ctx.translate(-NECK.x, -NECK.y);
  const t = st.turn || 0;
  parts.earL.draw(ctx, -t * 10, 0); parts.earR.draw(ctx, -t * 10, 0);
  parts.head.draw(ctx);
  parts.muzzle.draw(ctx, t * 30, 0);
  const anger = st.anger || 0, sur = st.surprise || 0;
  // eyes
  const eyeY = HEAD.y - 30 - sur * 3;
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * 54 + t * (sx * t > 0 ? 20 : 26), eyeY);
    const squint = 1 - anger * 0.18;
    ctx.scale(1 - Math.abs(t) * 0.08 * (sx * t < 0 ? 1 : 0), squint * (st.blink ? 0.15 : 1));
    parts.eye.draw(ctx);
    ctx.restore();
  }
  // brows
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * 56 + t * 22, HEAD.y - 60 - sur * 16 + anger * 6);
    ctx.rotate(sx * (-anger * 0.3 + sur * 0.22 + 0.04));
    (sx < 0 ? parts.browL : parts.browR).draw(ctx);
    ctx.restore();
  }
  parts.nose.draw(ctx, t * 36, HEAD.y + 18);
  drawMouth(ctx, st);
  ctx.restore();
  drawArmL();
  ctx.restore();
  ctx.restore();
}

// arm pose that brings the mic (screen-left arm) up under the chin
const MIC_POSE = { armL: -1.0, armLLen: 0.73, micAng: 0.5 };
module.exports = { build, draw, C, HEAD, MIC_POSE, SH_L, SH_R, armTip };
