// Necromantical — full-body CG figures (anime proportions) for event illustrations,
// plus skeletons, villager silhouettes, carriage & horses, and close-up hands.
// Local space: origin at the feet, +x = facing direction, s = figure height in px.
'use strict';
(function () {
  const { clamp, lerp, TAU } = NM;
  const dirv = (a) => [Math.sin(a), Math.cos(a)]; // angle from straight down, + rotates forward

  // two-segment limb with round caps; returns elbow and end points
  function limb(g, x, y, a1, l1, a2, l2, w0, w1, col) {
    const [dx1, dy1] = dirv(a1), [dx2, dy2] = dirv(a2);
    const ex = x + dx1 * l1, ey = y + dy1 * l1;
    const hx = ex + dx2 * l2, hy = ey + dy2 * l2;
    g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = w0; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
    g.lineWidth = w1; g.beginPath(); g.moveTo(ex, ey); g.lineTo(hx, hy); g.stroke();
    return { ex, ey, hx, hy };
  }
  NM.limb = limb;

  function hand(g, x, y, r, col, a = 0) {
    g.fillStyle = col;
    g.beginPath(); g.ellipse(x, y, r, r * 1.25, a, 0, TAU); g.fill();
  }

  // ---------------- Isolde ----------------
  // pose: { lean, armF:[a1,a2], armB:[a1,a2], twirl, wind, sit, turn, expr, headTilt, glow, look }
  NM.figIsolde = function (g, x, y, s, pose = {}, t = 0, opt = {}) {
    const u = s / 100;
    const dir = pose.dir ?? 1;
    const wind = pose.wind ?? 0.3;
    const sway = Math.sin(t * 1.6) * 1.5 * u + wind * 4 * u * (0.6 + 0.4 * Math.sin(t * 2.3));
    const twirl = pose.twirl || 0;
    const lean = pose.lean || 0;
    const sit = pose.sit || 0;
    const C = Object.assign({ dress: '#141022', dressHi: '#2c2440', dressRim: '#4c4570', lace: '#e8e2ec', skin: '#f6d6c8', hair: '#141022', hairHi: '#332c4f', veil: 'rgba(40,30,60,0.75)', glove: '#141022' }, opt.colors || {});
    g.save();
    g.translate(x, y);
    g.scale(dir, 1);
    const waistY = -55 * u + sit * 18 * u;
    const shY = -78 * u + sit * 18 * u;
    const lx = lean * 10 * u; // lean shifts upper body forward
    // ---- veil (behind everything) ----
    g.fillStyle = C.veil;
    g.beginPath();
    g.moveTo(lx - 2 * u, shY - 20 * u);
    g.bezierCurveTo(lx - 14 * u - sway, shY + 10 * u, -28 * u - sway * 2, -30 * u, -34 * u - sway * 3 - wind * 14 * u, -2 * u);
    g.lineTo(-14 * u - sway * 2, 0);
    g.bezierCurveTo(-14 * u, -30 * u, lx - 6 * u, shY + 10 * u, lx + 4 * u, shY - 16 * u);
    g.closePath(); g.fill();
    // ---- long back hair ----
    g.fillStyle = C.hair;
    g.beginPath();
    g.moveTo(lx - 6 * u, shY - 18 * u);
    g.bezierCurveTo(lx - 12 * u - sway * 0.6, shY + 6 * u, lx - 12 * u - sway, waistY - 2 * u, lx - 10 * u - sway * 1.4, waistY + 14 * u);
    for (let k = 0; k < 5; k++) g.lineTo(lx - 10 * u - sway * 1.4 + k * 3.2 * u, waistY + (k % 2 ? 9 : 15) * u);
    g.bezierCurveTo(lx + 2 * u, waistY, lx + 6 * u, shY + 4 * u, lx + 6 * u, shY - 16 * u);
    g.closePath(); g.fill();
    // ---- far arm ----
    const aB = pose.armB || [0.15, 0.25];
    limb(g, lx - 3 * u, shY + 3 * u, aB[0], 19 * u, aB[0] + aB[1], 17 * u, 5.2 * u, 4.4 * u, '#0b0910');
    const fb = (() => { const [a, b] = dirv(aB[0]); const [c, d] = dirv(aB[0] + aB[1]); return [lx - 3 * u + a * 19 * u + c * 17 * u, shY + 3 * u + b * 19 * u + d * 17 * u]; })();
    hand(g, fb[0], fb[1], 2.2 * u, C.glove);
    // ---- skirt ----
    const hemW = (24 + twirl * 18) * u;
    const hemLift = twirl * 6 * u;
    g.fillStyle = C.dress;
    g.beginPath();
    g.moveTo(lx * 0.6 - 6 * u, waistY);
    if (sit) {
      g.bezierCurveTo(-10 * u, waistY + 4 * u, 18 * u, waistY + 2 * u, 26 * u, waistY + 10 * u);
      g.lineTo(28 * u, 0); g.lineTo(-12 * u, 0);
    } else {
      g.bezierCurveTo(-10 * u, waistY + 14 * u, -hemW * 0.8 - sway, -16 * u, -hemW - sway * 1.3, -hemLift);
      const n = 10;
      for (let k = 0; k <= n; k++) {
        const xx = lerp(-hemW - sway * 1.3, hemW * 0.92 - sway * 0.6, k / n);
        const wv = Math.sin(k * 1.9 + t * (3 + twirl * 6)) * (1.2 + twirl * 2.5) * u;
        g.lineTo(xx, -hemLift * (1 - Math.sin((k / n) * Math.PI)) + wv);
      }
      g.bezierCurveTo(hemW * 0.7, -18 * u, 12 * u + lx * 0.4, waistY + 12 * u, lx * 0.6 + 5 * u, waistY);
    }
    g.closePath(); g.fill();
    // skirt folds + rim light
    g.strokeStyle = C.dressHi; g.lineWidth = Math.max(1, 1.2 * u);
    for (const k of [-0.55, -0.2, 0.15, 0.5]) {
      g.beginPath(); g.moveTo(lx * 0.6 + k * 8 * u, waistY + 4 * u); g.quadraticCurveTo(k * hemW * 0.6, -26 * u, k * hemW * 1.1 - sway * 0.8, -2 * u - hemLift * 0.5); g.stroke();
    }
    g.strokeStyle = C.dressRim; g.lineWidth = Math.max(1, 1.4 * u);
    g.beginPath(); g.moveTo(lx * 0.6 + 5 * u, waistY); g.bezierCurveTo(12 * u + lx * 0.4, waistY + 12 * u, hemW * 0.7, -18 * u, hemW * 0.92 - sway * 0.6, -1 * u); g.stroke();
    // lace hem
    g.strokeStyle = C.lace; g.globalAlpha = 0.7; g.lineWidth = Math.max(1, 1 * u);
    g.beginPath(); g.moveTo(-hemW - sway * 1.3, -hemLift - 1.5 * u); g.lineTo(hemW * 0.92 - sway * 0.6, -1.5 * u); g.stroke(); g.globalAlpha = 1;
    // ---- bodice ----
    g.fillStyle = C.dress;
    g.beginPath();
    g.moveTo(lx * 0.6 - 6 * u, waistY + 1 * u);
    g.quadraticCurveTo(lx - 8 * u, shY + 10 * u, lx - 6 * u, shY + 1 * u);
    g.lineTo(lx + 7 * u, shY + 1 * u);
    g.quadraticCurveTo(lx + 10 * u, shY + 9 * u, lx + 7 * u, shY + 13 * u); // bust
    g.quadraticCurveTo(lx + 5 * u, waistY - 6 * u, lx * 0.6 + 5 * u, waistY + 1 * u);
    g.closePath(); g.fill();
    g.strokeStyle = C.dressRim; g.lineWidth = Math.max(1, 1.2 * u);
    g.beginPath(); g.moveTo(lx + 7 * u, shY + 2 * u); g.quadraticCurveTo(lx + 10 * u, shY + 9 * u, lx + 7 * u, shY + 13 * u); g.stroke();
    // corset lacing + cameo
    g.fillStyle = '#c4122f'; g.beginPath(); g.ellipse(lx + 4.5 * u, shY + 3.5 * u, 1.6 * u, 1.9 * u, 0, 0, TAU); g.fill();
    // lace collar
    g.fillStyle = C.lace; g.beginPath(); g.moveTo(lx - 3 * u, shY - 2 * u); g.lineTo(lx + 6 * u, shY - 2 * u); g.lineTo(lx + 5 * u, shY + 2.5 * u); g.lineTo(lx - 2 * u, shY + 2.5 * u); g.fill();
    // ---- near arm ----
    const aF = pose.armF || [0.25, 0.3];
    const near = limb(g, lx + 2 * u, shY + 3 * u, aF[0], 19 * u, aF[0] + aF[1], 17 * u, 5.4 * u, 4.6 * u, C.dress);
    // lace cuff
    g.strokeStyle = C.lace; g.lineWidth = 2.2 * u; g.lineCap = 'butt';
    const [cx1, cy1] = dirv(aF[0] + aF[1]);
    g.beginPath(); g.moveTo(near.hx - cx1 * 3.5 * u, near.hy - cy1 * 3.5 * u); g.lineTo(near.hx - cx1 * 1.5 * u, near.hy - cy1 * 1.5 * u); g.stroke();
    hand(g, near.hx + cx1 * 1.2 * u, near.hy + cy1 * 1.2 * u, 2.2 * u, opt.handColor || C.skin, aF[0] + aF[1]);
    if (pose.glow) {
      NM.glow(g, near.hx + cx1 * 2 * u, near.hy + cy1 * 2 * u, 16 * u * pose.glow, '#ff2040', 0.7 * pose.glow);
      if (pose.armB) NM.glow(g, fb[0], fb[1], 12 * u * pose.glow, '#ff2040', 0.5 * pose.glow);
    }
    // neck
    g.fillStyle = '#e3b3a8'; g.fillRect(lx - 1.5 * u, shY - 6 * u, 4 * u, 5 * u);
    // ---- head ----
    const hs = 15.6 * u;
    const cy = shY - 3 * u - 0.37 * hs;
    g.save();
    g.translate(lx + 1.5 * u, cy);
    g.rotate(pose.headTilt || 0);
    if (!opt.noHead) NM.isoldeFace(g, 0, 0, hs, pose.expr || 'cold', t, pose.turn ?? 0.55, { P: { body: null, backHair: isoldeBackHairShort }, ...(pose.over || {}), look: pose.look });
    g.restore();
    g.restore();
    return { hand: [x + dir * near.hx, y + near.hy], hand2: [x + dir * fb[0], y + fb[1]], head: [x + dir * (lx + 1.5 * u), y + cy], u };
  };
  function isoldeBackHairShort(g, P) {
    g.fillStyle = P.hair;
    g.beginPath(); g.moveTo(-40, -20); g.quadraticCurveTo(-46, 30, -40, 60); g.lineTo(40, 60); g.quadraticCurveTo(46, 30, 40, -20); g.closePath(); g.fill();
  }

  // ---------------- Lucien ----------------
  // pose: { lean, armF, armB, legF:[hip,knee], legB:[hip,knee], kneel, limp, expr, turn, headTilt, alive }
  NM.figLucien = function (g, x, y, s, pose = {}, t = 0, opt = {}) {
    const u = s / 100;
    const dir = pose.dir ?? 1;
    const alive = pose.alive || false;
    const C = Object.assign({ coat: '#1c1a26', coatHi: '#2e2a3e', rim: '#4c4570', shirt: '#e6e8ee', pants: '#141022', skin: alive ? '#f6d6c8' : '#c3cad6', shoe: '#07060b' }, opt.colors || {});
    g.save();
    g.translate(x, y);
    g.scale(dir, 1);
    const kneel = pose.kneel || 0;
    const hipY = -50 * u + kneel * 20 * u;
    const lean = pose.lean || 0;
    const shY = hipY - 30 * u;
    const lx = lean * 12 * u;
    // legs
    const lb = pose.legB || (kneel ? [-1.2 * kneel, 1.6 * kneel] : [-0.12, 0.05]);
    const lf = pose.legF || (kneel ? [1.3 * kneel, -1.4 * kneel] : [0.12, -0.02]);
    const legB = limb(g, -2 * u, hipY, lb[0], 25 * u, lb[0] + lb[1], 24 * u, 7 * u, 6 * u, '#0b0910');
    g.fillStyle = C.shoe; g.beginPath(); g.ellipse(legB.hx + 2 * u, legB.hy, 5 * u, 2.2 * u, 0, 0, TAU); g.fill();
    // coat tails (behind front leg)
    g.fillStyle = C.coat;
    const tailSw = Math.sin(t * 2) * 1.5 * u;
    g.beginPath(); g.moveTo(-6 * u + lx * 0.3, hipY - 6 * u); g.lineTo(-12 * u + tailSw, hipY + 22 * u - kneel * 8 * u); g.lineTo(-4 * u + tailSw, hipY + 24 * u - kneel * 8 * u); g.lineTo(4 * u, hipY + 2 * u); g.closePath(); g.fill();
    // far arm
    const aB = pose.armB || [0.1, 0.2];
    const fb = limb(g, lx - 4 * u, shY + 3 * u, aB[0], 19 * u, aB[0] + aB[1], 18 * u, 6 * u, 5 * u, '#0b0910');
    hand(g, fb.hx, fb.hy, 2.4 * u, C.skin);
    const legF = limb(g, 2 * u, hipY, lf[0], 25 * u, lf[0] + lf[1], 24 * u, 7.4 * u, 6.2 * u, C.pants);
    g.fillStyle = C.shoe; g.beginPath(); g.ellipse(legF.hx + 2 * u, legF.hy, 5 * u, 2.2 * u, 0, 0, TAU); g.fill();
    // torso (tailcoat)
    g.fillStyle = C.coat;
    g.beginPath();
    g.moveTo(lx * 0.3 - 7 * u, hipY + 2 * u); g.lineTo(lx - 9 * u, shY + 2 * u); g.quadraticCurveTo(lx, shY - 3 * u, lx + 9 * u, shY + 2 * u);
    g.lineTo(lx * 0.5 + 8 * u, hipY + 2 * u); g.closePath(); g.fill();
    // shirt front + cravat
    g.fillStyle = C.shirt;
    g.beginPath(); g.moveTo(lx + 2 * u, shY); g.lineTo(lx + 8 * u, shY + 1 * u); g.lineTo(lx * 0.6 + 6 * u, hipY - 8 * u); g.lineTo(lx * 0.6 + 3 * u, hipY - 8 * u); g.closePath(); g.fill();
    g.fillStyle = '#0b0910'; g.beginPath(); g.moveTo(lx + 3 * u, shY); g.lineTo(lx + 7 * u, shY); g.lineTo(lx + 5 * u, shY + 7 * u); g.fill();
    g.strokeStyle = C.rim; g.lineWidth = Math.max(1, 1.2 * u);
    g.beginPath(); g.moveTo(lx + 9 * u, shY + 2 * u); g.lineTo(lx * 0.5 + 8 * u, hipY + 2 * u); g.stroke();
    // binding sigil glow at the throat (undead only)
    if (!alive) {
      NM.glow(g, lx + 3 * u, shY - 3 * u, 7 * u, '#ff2040', 0.5 + 0.2 * Math.sin(t * 3));
      g.strokeStyle = '#ff3a52'; g.lineWidth = Math.max(1, 1 * u); g.beginPath(); g.moveTo(lx - 1 * u, shY - 4 * u); g.lineTo(lx + 5 * u, shY - 3 * u); g.stroke();
    }
    // near arm
    const aF = pose.armF || [0.2, 0.25];
    const nf = limb(g, lx + 3 * u, shY + 3 * u, aF[0], 19 * u, aF[0] + aF[1], 18 * u, 6.4 * u, 5.4 * u, C.coatHi);
    hand(g, nf.hx, nf.hy, 2.5 * u, C.skin);
    // neck + head
    g.fillStyle = alive ? '#e3b3a8' : '#a3abbd'; g.fillRect(lx - 1.5 * u, shY - 7 * u, 4.5 * u, 6 * u);
    const hs = 15 * u;
    const cy = shY - 3 * u - 0.37 * hs;
    g.save(); g.translate(lx + 1.5 * u, cy); g.rotate(pose.headTilt || 0);
    if (!opt.noHead) NM.lucienFace(g, 0, 0, hs, pose.expr || (alive ? 'alive' : 'hollow'), t, pose.turn ?? 0.55, { P: { body: null }, alive, ...(pose.over || {}) });
    g.restore();
    g.restore();
    return { hand: [x + dir * nf.hx, y + nf.hy], hand2: [x + dir * fb.hx, y + fb.hy], head: [x + dir * (lx + 1.5 * u), y + cy], chest: [x + dir * (lx + 2 * u), y + shY + 8 * u], u };
  };

  // ---------------- skeleton (CG) ----------------
  NM.figSkeleton = function (g, x, y, s, pose = {}, t = 0) {
    const u = s / 100, dir = pose.dir ?? 1;
    g.save(); g.translate(x, y); g.scale(dir, 1);
    const hipY = -50 * u, shY = -80 * u;
    const B = '#e8e2d8', Bs = '#9a8fa8';
    g.strokeStyle = B; g.lineCap = 'round';
    const lb = pose.legB || [-0.15, 0.1], lf = pose.legF || [0.15, -0.05];
    limb(g, -2 * u, hipY, lb[0], 25 * u, lb[0] + lb[1], 24 * u, 2.6 * u, 2.2 * u, Bs);
    limb(g, 2 * u, hipY, lf[0], 25 * u, lf[0] + lf[1], 24 * u, 2.8 * u, 2.4 * u, B);
    // spine & ribs
    g.lineWidth = 2.6 * u; g.strokeStyle = B;
    g.beginPath(); g.moveTo(0, hipY); g.quadraticCurveTo(-3 * u, (hipY + shY) / 2, 0, shY); g.stroke();
    g.lineWidth = 1.8 * u;
    for (let k = 0; k < 5; k++) { const yy = shY + 4 * u + k * 4 * u; g.beginPath(); g.ellipse(1 * u, yy, 9 * u - k * 0.6 * u, 2.4 * u, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); }
    g.beginPath(); g.ellipse(0, hipY, 8 * u, 3.5 * u, 0, 0, TAU); g.stroke();
    const aB = pose.armB || [0.2, 0.4], aF = pose.armF || [0.3, 0.5];
    limb(g, -4 * u, shY + 2 * u, aB[0], 18 * u, aB[0] + aB[1], 17 * u, 2.2 * u, 2 * u, Bs);
    limb(g, 4 * u, shY + 2 * u, aF[0], 18 * u, aF[0] + aF[1], 17 * u, 2.4 * u, 2.1 * u, B);
    // skull
    g.fillStyle = B;
    g.beginPath(); g.ellipse(2 * u, shY - 12 * u, 7.5 * u, 8 * u, 0, 0, TAU); g.fill();
    g.fillRect(-1 * u, shY - 6 * u, 8 * u, 5 * u);
    g.fillStyle = '#07060b';
    g.beginPath(); g.ellipse(4.5 * u, shY - 12 * u, 2.4 * u, 2.8 * u, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(-1 * u, shY - 12 * u, 2 * u, 2.6 * u, 0, 0, TAU); g.fill();
    g.fillRect(1.5 * u, shY - 8 * u, 1.5 * u, 2 * u);
    for (let k = 0; k < 4; k++) g.fillRect(0 + k * 2 * u, shY - 4.5 * u, 0.8 * u, 2.5 * u);
    if (pose.eyeGlow) { NM.glow(g, 4.5 * u, shY - 12 * u, 6 * u, '#ff2040', 0.7); NM.glow(g, -1 * u, shY - 12 * u, 5 * u, '#ff2040', 0.6); }
    g.restore();
  };

  // ---------------- villager silhouette with torch / pitchfork ----------------
  NM.figMob = function (g, x, y, s, t, seed, opt = {}) {
    const u = s / 100, R = NM.rng(seed);
    const dir = opt.dir ?? 1;
    g.save(); g.translate(x, y); g.scale(dir, 1);
    const col = opt.color || '#0e0709';
    const walk = t * 5 + R() * 6;
    const ph = Math.sin(walk);
    g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round';
    limb(g, -2 * u, -48 * u, ph * 0.4, 25 * u, ph * 0.4 + 0.2, 24 * u, 8 * u, 7 * u, col);
    limb(g, 2 * u, -48 * u, -ph * 0.4, 25 * u, -ph * 0.4 + 0.2, 24 * u, 8 * u, 7 * u, col);
    g.beginPath(); g.moveTo(-9 * u, -50 * u); g.lineTo(-10 * u, -80 * u); g.quadraticCurveTo(0, -86 * u, 10 * u, -80 * u); g.lineTo(9 * u, -50 * u); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(1 * u, -91 * u, 7 * u, 8 * u, 0, 0, TAU); g.fill();
    if (R() < 0.5) { g.fillRect(-9 * u, -98 * u, 20 * u, 3 * u); g.fillRect(-5 * u, -106 * u, 12 * u, 9 * u); }
    const tool = opt.tool ?? (R() < 0.6 ? 'torch' : 'fork');
    const ar = limb(g, 4 * u, -78 * u, Math.PI * 0.75 + ph * 0.05, 18 * u, Math.PI * 0.9, 16 * u, 6 * u, 5 * u, col);
    if (tool === 'torch') {
      g.lineWidth = 3 * u; g.beginPath(); g.moveTo(ar.hx, ar.hy + 8 * u); g.lineTo(ar.hx + 2 * u, ar.hy - 16 * u); g.stroke();
      NM.flame(g, ar.hx + 2 * u, ar.hy - 15 * u, 12 * u, t, seed, { color: '#ff9a3a', glowColor: '#ff7a2a', glowR: 5, glowA: 0.55, base: 'rgba(255,60,20,0.6)' });
    } else {
      g.lineWidth = 2.4 * u; g.beginPath(); g.moveTo(ar.hx - 2 * u, ar.hy + 20 * u); g.lineTo(ar.hx + 3 * u, ar.hy - 30 * u); g.stroke();
      g.lineWidth = 1.6 * u;
      for (const k of [-4, 0, 4]) { g.beginPath(); g.moveTo(ar.hx + 3 * u + k * u, ar.hy - 30 * u); g.lineTo(ar.hx + 3 * u + k * u, ar.hy - 40 * u); g.stroke(); }
      g.beginPath(); g.moveTo(ar.hx - 1 * u, ar.hy - 30 * u); g.lineTo(ar.hx + 7 * u, ar.hy - 30 * u); g.stroke();
    }
    if (opt.rim) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = opt.rim; g.fillRect(4 * u, -110 * u, 8 * u, 110 * u); }
    g.restore();
  };

  // ---------------- horse (side view, galloping) ----------------
  NM.horse = function (g, x, y, s, t, opt = {}) {
    const u = s / 100;
    const col = opt.color || '#0b0910';
    const ph = t * (opt.speed ?? 9);
    const rear = opt.rear || 0;
    g.save(); g.translate(x, y); g.scale(opt.dir ?? 1, 1);
    g.rotate(-rear * 0.6);
    g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round';
    const bob = Math.sin(ph * 2) * 2 * u;
    // legs (gallop)
    const legs = [[-28, 0], [-22, 1.6], [22, 3.2], [28, 4.8]];
    for (const [lx, o] of legs) {
      const a = Math.sin(ph + o) * 0.7 * (1 - rear) + (lx > 0 ? rear * 1.4 : 0);
      limb(g, lx * u, -40 * u + bob, a, 18 * u, a + (Math.cos(ph + o) > 0 ? -0.9 : 0.2), 18 * u, 6 * u, 3.4 * u, col);
    }
    // body
    g.beginPath(); g.ellipse(0, -48 * u + bob, 36 * u, 14 * u, 0, 0, TAU); g.fill();
    // neck & head
    g.beginPath();
    g.moveTo(22 * u, -56 * u + bob); g.quadraticCurveTo(34 * u, -80 * u + bob, 44 * u, -86 * u + bob);
    g.lineTo(58 * u, -70 * u + bob); g.lineTo(54 * u, -64 * u + bob); g.lineTo(40 * u, -70 * u + bob); g.quadraticCurveTo(36 * u, -50 * u + bob, 30 * u, -40 * u + bob); g.closePath(); g.fill();
    // ears, mane, tail
    g.beginPath(); g.moveTo(42 * u, -86 * u + bob); g.lineTo(42 * u, -94 * u + bob); g.lineTo(46 * u, -87 * u + bob); g.fill();
    g.lineWidth = 3 * u;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo((26 + k * 3.5) * u, (-60 - k * 5) * u + bob); g.lineTo((18 + k * 3.5) * u - Math.sin(ph + k) * 3 * u, (-58 - k * 5) * u + bob); g.stroke(); }
    g.lineWidth = 5 * u;
    g.beginPath(); g.moveTo(-34 * u, -52 * u + bob); g.quadraticCurveTo(-50 * u, -50 * u + Math.sin(ph) * 6 * u, -54 * u, -30 * u + bob); g.stroke();
    // eye glint
    if (opt.eye) { g.fillStyle = opt.eye; g.fillRect(47 * u, -80 * u + bob, 2 * u, 2 * u); }
    g.restore();
  };

  // ---------------- carriage (side view) ----------------
  NM.carriage = function (g, x, y, s, t, opt = {}) {
    const u = s / 100;
    const col = opt.color || '#0b0910';
    const rim = opt.rim || '#3d3f63';
    const spin = t * (opt.wheelSpeed ?? 8);
    g.save(); g.translate(x, y); g.rotate(opt.rot || 0); g.scale(opt.dir ?? 1, 1);
    g.fillStyle = col;
    // body
    g.beginPath();
    g.moveTo(-40 * u, -30 * u); g.lineTo(-44 * u, -78 * u); g.quadraticCurveTo(0, -86 * u, 40 * u, -78 * u); g.lineTo(36 * u, -30 * u);
    g.quadraticCurveTo(0, -18 * u, -40 * u, -30 * u); g.closePath(); g.fill();
    // roof rail & luggage
    g.fillRect(-46 * u, -84 * u, 92 * u, 4 * u);
    g.fillRect(-30 * u, -92 * u, 40 * u, 8 * u);
    // window with warm/dim light
    g.fillStyle = opt.window || '#2b2a45';
    g.beginPath(); g.moveTo(-16 * u, -70 * u); g.lineTo(16 * u, -70 * u); g.lineTo(14 * u, -46 * u); g.lineTo(-14 * u, -46 * u); g.closePath(); g.fill();
    if (opt.passenger) { g.fillStyle = col; g.beginPath(); g.ellipse(2 * u, -58 * u, 6 * u, 7 * u, 0, 0, TAU); g.fill(); g.fillRect(-6 * u, -52 * u, 16 * u, 6 * u); }
    g.strokeStyle = rim; g.lineWidth = Math.max(1, 1.5 * u); g.beginPath(); g.moveTo(-44 * u, -78 * u); g.quadraticCurveTo(0, -86 * u, 40 * u, -78 * u); g.stroke();
    // lantern
    g.fillStyle = col; g.fillRect(40 * u, -76 * u, 4 * u, 10 * u);
    NM.glow(g, 42 * u, -72 * u, 14 * u, '#ffb347', opt.lantern ?? 0.7);
    // driver bench + shafts
    g.fillStyle = col; g.fillRect(36 * u, -50 * u, 22 * u, 4 * u); g.fillRect(52 * u, -36 * u, 46 * u, 3 * u);
    // wheels
    for (const [wx, r] of [[-26 * u, 20 * u], [26 * u, 16 * u]]) {
      if (opt.brokenWheel && wx > 0) continue;
      g.strokeStyle = col; g.lineWidth = 3 * u;
      g.beginPath(); g.arc(wx, -20 * u + (20 * u - r), r, 0, TAU); g.stroke();
      g.lineWidth = 1.6 * u;
      for (let k = 0; k < 8; k++) { const a = spin + (k * Math.PI) / 4; g.beginPath(); g.moveTo(wx, -r); g.lineTo(wx + Math.cos(a) * r, -r + Math.sin(a) * r); g.stroke(); }
      g.strokeStyle = rim; g.lineWidth = Math.max(1, 1 * u); g.beginPath(); g.arc(wx, -r, r, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
    }
    g.restore();
  };

  // ---------------- close-up hands ----------------
  // gloved hand reaching (Isolde) — wrist at (x,y), pointing at angle a, size s
  NM.handGlove = function (g, x, y, s, a, curl = 0, col = '#141022', rim = '#4c4570') {
    g.save(); g.translate(x, y); g.rotate(a); g.scale(s / 100, s / 100);
    g.fillStyle = col;
    g.beginPath(); g.moveTo(-60, -14); g.lineTo(0, -16); g.lineTo(0, 16); g.lineTo(-60, 14); g.fill(); // sleeve/wrist
    g.beginPath(); g.ellipse(14, 0, 18, 15, 0, 0, TAU); g.fill(); // palm
    const fingers = [[-10, 0.0, 34], [-3, 0.0, 38], [4, 0.0, 36], [10, 0.05, 30]];
    for (const [fy, fa, len] of fingers) {
      const L = len * (1 - curl * 0.35);
      g.lineWidth = 8; g.lineCap = 'round'; g.strokeStyle = col;
      g.beginPath(); g.moveTo(24, fy); g.quadraticCurveTo(24 + L * 0.6, fy + curl * 10, 24 + L * (1 - curl * 0.5), fy + curl * 24); g.stroke();
    }
    g.lineWidth = 9; g.beginPath(); g.moveTo(12, -12); g.quadraticCurveTo(22, -26, 34 - curl * 6, -26 + curl * 10); g.stroke(); // thumb
    g.strokeStyle = rim; g.lineWidth = 2; g.beginPath(); g.moveTo(-60, -14); g.lineTo(0, -16); g.quadraticCurveTo(20, -18, 30, -12); g.stroke();
    // lace cuff
    g.fillStyle = '#e8e2ec';
    for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(-56, -14 + k * 5.6, 4, 0, TAU); g.fill(); }
    g.restore();
  };
  // skeletal hand — wrist at (x,y), angle a
  NM.handBone = function (g, x, y, s, a, curl = 0, col = '#e8e2d8', flesh = 0) {
    g.save(); g.translate(x, y); g.rotate(a); g.scale(s / 100, s / 100);
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
    if (flesh) { g.fillStyle = `rgba(160,170,190,${flesh})`; g.beginPath(); g.ellipse(14, 0, 20, 16, 0, 0, TAU); g.fill(); g.fillStyle = col; }
    g.lineWidth = 7; g.beginPath(); g.moveTo(-60, -5); g.lineTo(0, -4); g.moveTo(-60, 5); g.lineTo(0, 4); g.stroke(); // radius/ulna
    g.beginPath(); g.ellipse(4, 0, 8, 10, 0, 0, TAU); g.fill(); // carpals
    const fingers = [[-11, 36], [-4, 42], [4, 40], [11, 32]];
    for (const [fy, len] of fingers) {
      g.lineWidth = 5;
      const L = len * (1 - curl * 0.3);
      const mx = 10 + L * 0.45, my = fy + curl * 6, ex = 10 + L * (1 - curl * 0.45), ey = fy + curl * 22;
      g.beginPath(); g.moveTo(8, fy * 0.6); g.lineTo(mx, my); g.lineTo(ex, ey); g.stroke();
      g.beginPath(); g.arc(mx, my, 3.4, 0, TAU); g.fill();
    }
    g.lineWidth = 6; g.beginPath(); g.moveTo(4, -10); g.lineTo(18, -24); g.lineTo(30 - curl * 8, -26 + curl * 12); g.stroke();
    g.restore();
  };
})();
