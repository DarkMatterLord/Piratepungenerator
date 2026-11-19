'use strict';
// Composites the world (set + characters + stage lighting) for one frame.
const U = require('./util');
const SET = require('./set');
const BEAR = require('./bear');
const RAB = require('./rabbit');
const { PAR, POS, applyLayer } = SET;

const TED_COL = '#ffb24a', FLOP_COL = '#7b6bff', FLOP_COL2 = '#3fd8ff';

function buildAll() {
  return { set: SET.build(), bear: BEAR.build(), rabbit: RAB.build() };
}

function worldToScreen(cam, x, y, p = 1) {
  const z = 1 + (cam.zoom - 1) * p;
  const dx = (x - cam.x * p) * z, dy = (y - cam.y * p) * z;
  const c = Math.cos(cam.rot || 0), s = Math.sin(cam.rot || 0);
  return { x: 960 + (cam.sx || 0) + dx * c - dy * s, y: 540 + (cam.sy || 0) + dx * s + dy * c, z };
}

function spotCone(ctx, sx, sy, tx, ty, w0, w1, col, a) {
  if (a <= 0.005) return;
  const ang = Math.atan2(tx - sx, ty - sy);
  const len = Math.hypot(tx - sx, ty - sy);
  ctx.save();
  ctx.translate(sx, sy); ctx.rotate(-ang);
  const g = ctx.createLinearGradient(0, 0, 0, len);
  g.addColorStop(0, U.rgba(col, 0.55 * a)); g.addColorStop(0.25, U.rgba(col, 0.2 * a)); g.addColorStop(1, U.rgba(col, 0.32 * a));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-w0, 0); ctx.lineTo(w0, 0); ctx.lineTo(w1, len); ctx.lineTo(-w1, len); ctx.closePath(); ctx.fill();
  // soft core
  const g2 = ctx.createLinearGradient(-w1, 0, w1, 0);
  g2.addColorStop(0, U.rgba(col, 0)); g2.addColorStop(0.5, U.rgba('#ffffff', 0.08 * a)); g2.addColorStop(1, U.rgba(col, 0));
  ctx.fillStyle = g2;
  ctx.beginPath(); ctx.moveTo(-w0 * 0.5, 0); ctx.lineTo(w0 * 0.5, 0); ctx.lineTo(w1 * 0.6, len); ctx.lineTo(-w1 * 0.6, len); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function floorPool(ctx, x, y, rx, ry, col, a) {
  if (a <= 0.005) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, U.rgba(col, 0.5 * a)); g.addColorStop(0.6, U.rgba(col, 0.18 * a)); g.addColorStop(1, U.rgba(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, U.TAU); ctx.fill();
  ctx.restore();
}

function drawCones(ctx, F, k) {
  const pulse = 1 + F.beat * 0.25;
  spotCone(ctx, POS.ted.x - 260, -1500, POS.ted.x, POS.ted.y + 40, 40, 330, TED_COL, F.tedLight * pulse * 0.8 * k);
  spotCone(ctx, POS.couch.x + 260, -1500, POS.couch.x, POS.couch.y + 40, 40, 360, FLOP_COL, F.flopLight * pulse * 0.8 * k);
  if (F.flopLight > 0.05) spotCone(ctx, POS.couch.x - 120, -1500, POS.couch.x + 60, POS.couch.y, 20, 200, FLOP_COL2, F.flopLight * 0.35 * pulse * k);
}

/**
 * F: { t, cam, beat, bass, tedLight, flopLight, houseLight, neon, cheer, rimWarm, lighters, bear, rabbit, dim }
 */
function drawWorld(ctx, A, F) {
  const cam = F.cam, S = A.set, t = F.t;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#050407'; ctx.fillRect(0, 0, 1920, 1080);
  // ---------------- wall layer
  applyLayer(ctx, cam, PAR.wall);
  S.wall.draw(ctx);
  // neon: flicker with occasional dropouts
  const flick = F.neon * (U.hash(Math.floor(t * 12), 3) < 0.04 ? 0.25 : 1) * (0.88 + 0.12 * Math.sin(t * 50));
  S.neonOff.draw(ctx);
  if (flick > 0.01) { ctx.globalAlpha = U.clamp(flick); S.neonOn.draw(ctx); ctx.globalAlpha = 1; }
  // neon wash on the wall
  if (flick > 0.01) {
    ctx.globalCompositeOperation = 'screen';
    for (const [x, col] of [[-390, '#ff9a30'], [0, '#ff3355'], [400, '#45e6ff']]) {
      const g = ctx.createRadialGradient(x, -630, 20, x, -630, 520);
      g.addColorStop(0, U.rgba(col, 0.22 * flick)); g.addColorStop(1, U.rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - 520, -1150, 1040, 1040);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  SET.drawXmasLights(ctx, t, F.beat * F.houseLight);
  // ---------------- ropes
  applyLayer(ctx, cam, PAR.ropes);
  S.ropes.draw(ctx);
  // ---------------- ring + characters
  applyLayer(ctx, cam, PAR.ring);
  S.mat.draw(ctx);
  ctx.globalCompositeOperation = 'screen';
  floorPool(ctx, POS.ted.x, POS.ted.y + 10, 380, 90, TED_COL, F.tedLight);
  floorPool(ctx, POS.couch.x, POS.couch.y + 10, 420, 95, FLOP_COL, F.flopLight);
  ctx.globalCompositeOperation = 'source-over';
  S.clutter.draw(ctx);
  // couch
  ctx.save(); ctx.translate(POS.couch.x, POS.couch.y); S.couch.draw(ctx); ctx.restore();
  ctx.globalCompositeOperation = 'screen';
  drawCones(ctx, F, 1);
  ctx.globalCompositeOperation = 'source-over';
  if (F.drawExtrasBehind) F.drawExtrasBehind(ctx);
  RAB.draw(ctx, A.rabbit, Object.assign({ x: POS.floppy.x, y: POS.floppy.y, scale: 1 }, F.rabbit));
  BEAR.draw(ctx, A.bear, Object.assign({ x: POS.ted.x, y: POS.ted.y, scale: 1 }, F.bear));
  // ---------------- faint atmospheric beam in front of the characters
  ctx.globalCompositeOperation = 'screen';
  drawCones(ctx, F, 0.22);
  // dust motes in the beams
  for (let i = 0; i < 90; i++) {
    const side = i % 2 ? 1 : 0;
    const L = side ? F.flopLight : F.tedLight;
    if (L < 0.1) continue;
    const bx = side ? POS.couch.x : POS.ted.x;
    const u = U.hash(i, 1), v = (U.hash(i, 2) + t * (0.02 + U.hash(i, 3) * 0.03)) % 1;
    const y = -1100 + v * 1150;
    const spread = U.lerp(60, 320, (y + 1100) / 1150);
    const x = bx + (u - 0.5) * 2 * spread + Math.sin(t * 0.7 + i) * 12;
    const a = 0.5 * L * Math.sin(v * Math.PI) * (0.4 + 0.6 * U.hash(i, 4));
    ctx.fillStyle = U.rgba(side ? '#cfd6ff' : '#ffe2b0', a);
    ctx.beginPath(); ctx.arc(x, y, 1.5 + U.hash(i, 5) * 2.5, 0, U.TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // ---------------- screen-space light falloff: darken whoever isn't in focus
  ctx.save();
  const focus = F.focus || 'both';
  const pT = worldToScreen(cam, POS.ted.x, -260), pF = worldToScreen(cam, POS.couch.x, -260);
  const dark = F.dim == null ? 0.6 : F.dim;
  const fx = focus === 'ted' ? pT : focus === 'floppy' ? pF : { x: (pT.x + pF.x) / 2, y: (pT.y + pF.y) / 2, z: pT.z };
  const rad = (focus === 'both' ? 1100 : 620) * fx.z;
  const g = ctx.createRadialGradient(fx.x, fx.y, rad * 0.35, fx.x, fx.y, rad * 1.25);
  g.addColorStop(0, 'rgba(4,2,10,0)'); g.addColorStop(1, `rgba(4,2,10,${dark})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  // haze drifting through the light
  ctx.globalCompositeOperation = 'screen';
  const hz = F.haze == null ? 0.22 : F.haze;
  const drift = (t * 18) % 1920;
  ctx.globalAlpha = hz * (F.tedLight * 0.8 + 0.2);
  ctx.drawImage(S.hazeWarm, -drift, -60, 1920 * 1.0, 1200);
  ctx.drawImage(S.hazeWarm, 1920 - drift, -60, 1920 * 1.0, 1200);
  ctx.globalAlpha = hz * (F.flopLight * 0.8 + 0.2);
  ctx.drawImage(S.hazeCool, drift - 1920, -40, 1920, 1200);
  ctx.drawImage(S.hazeCool, drift, -40, 1920, 1200);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // ---------------- crowd (foreground)
  drawCrowd(ctx, A, F);
}

function drawCrowd(ctx, A, F) {
  const cam = F.cam, t = F.t;
  ctx.save();
  applyLayer(ctx, cam, PAR.crowd);
  const warm = U.clamp(F.rimWarm == null ? 0.5 : F.rimWarm);
  for (const m of A.set.crowd) {
    const ph = F.beatPhase != null ? F.beatPhase : t * 1.66;
    const bob = Math.abs(Math.sin((ph + m.phase / U.TAU) * Math.PI)) * m.amp * (0.4 + 0.6 * (F.energy == null ? 1 : F.energy));
    const cheer = U.clamp(F.cheer || 0);
    const jump = cheer * (10 + 18 * Math.abs(Math.sin(t * 7 + m.phase)));
    ctx.save();
    ctx.translate(m.x, m.y + bob - jump);
    ctx.scale(m.s, m.s);
    // arms up when cheering
    if (cheer > 0.05) {
      ctx.fillStyle = '#07050b';
      for (const sx of [-1, 1]) {
        const a = sx * (0.35 + 0.15 * Math.sin(t * 9 + m.phase + sx));
        ctx.save(); ctx.translate(sx * 95, 150); ctx.rotate(a * cheer + sx * (1 - cheer) * 1.2);
        U.roundRect(ctx, -18, -200 * cheer, 36, 200 * cheer, 18); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -200 * cheer, 26, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
    }
    if (warm > 0.02) { ctx.globalAlpha = warm; m.warm.draw(ctx); }
    if (warm < 0.98) { ctx.globalAlpha = 1 - warm; m.cool.draw(ctx); }
    ctx.globalAlpha = 1;
    // lighters / phone lights during the soft moment
    if ((F.lighters || 0) > 0.02 && m.seed % 3 === 0) {
      const lx = 100, ly = -60 + Math.sin(t * 1.3 + m.phase) * 10;
      ctx.fillStyle = '#07050b'; ctx.fillRect(lx - 14, ly, 28, 160);
      const fl = F.lighters * (0.8 + 0.2 * Math.sin(t * 23 + m.phase));
      const g = ctx.createRadialGradient(lx, ly - 18, 0, lx, ly - 18, 60);
      g.addColorStop(0, `rgba(255,220,140,${0.9 * fl})`); g.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g; ctx.fillRect(lx - 60, ly - 78, 120, 120);
      ctx.fillStyle = `rgba(255,250,220,${fl})`; ctx.beginPath(); ctx.ellipse(lx, ly - 16, 5, 12, 0, 0, U.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
  ctx.restore();
}

module.exports = { buildAll, drawWorld, worldToScreen, TED_COL, FLOP_COL, FLOP_COL2 };
