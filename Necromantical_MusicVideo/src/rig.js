// Necromantical — painted full-body figures for the cinematic shots, plus skeletons, ghosts,
// villagers, carriage & horses, and a rim-light helper.
// Local space: origin at the feet, +x = facing direction, s = figure height in px.
'use strict';
(function () {
  const { clamp, lerp, TAU, rgba, canvas, W, H } = NM;
  const dirv = (a) => [Math.sin(a), Math.cos(a)]; // angle from straight down, + rotates forward

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
  function softShade(g, x, y, rx, ry, col, a, mode = 'multiply') {
    g.save(); g.globalCompositeOperation = mode; g.translate(x, y); g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
  }
  NM.softShade = softShade;


  // tapered, shaded trouser leg; returns knee/foot like limb()
  NM.trouserLeg = function (g, x, y, a1, a2, u, col, hi) {
    const [dx1, dy1] = dirv(a1), [dx2, dy2] = dirv(a2);
    const ex = x + dx1 * 25 * u, ey = y + dy1 * 25 * u, hx = ex + dx2 * 24 * u, hy = ey + dy2 * 24 * u;
    const n1 = [-dy1, dx1], n2 = [-dy2, dx2];
    const w0 = 4.6 * u, wk = 3.6 * u, wf = 3 * u;
    g.beginPath();
    g.moveTo(x + n1[0] * w0, y + n1[1] * w0);
    g.lineTo(ex + (n1[0] + n2[0]) / 2 * wk, ey + (n1[1] + n2[1]) / 2 * wk);
    g.lineTo(hx + n2[0] * wf, hy + n2[1] * wf);
    g.lineTo(hx - n2[0] * wf, hy - n2[1] * wf);
    g.lineTo(ex - (n1[0] + n2[0]) / 2 * wk, ey - (n1[1] + n2[1]) / 2 * wk);
    g.lineTo(x - n1[0] * w0, y - n1[1] * w0);
    g.closePath();
    const gr = g.createLinearGradient(x - n1[0] * w0, y - n1[1] * w0, x + n1[0] * w0, y + n1[1] * w0);
    gr.addColorStop(0, col); gr.addColorStop(0.7, col); gr.addColorStop(1, hi);
    g.fillStyle = gr; g.fill();
    g.strokeStyle = rgba(hi, 0.45); g.lineWidth = Math.max(1, 0.8 * u);
    g.beginPath(); g.moveTo(x + n1[0] * w0 * 0.2, y); g.lineTo(ex, ey); g.lineTo(hx, hy - 2 * u); g.stroke();
    return { ex, ey, hx, hy };
  };

  // ---------- rim light: paint an edge band on the side facing the light ----------
  let rimA = null, rimB = null;
  // fn(ctx) draws the figure; light from direction (lx, ly) (unit-ish), width in px
  NM.withRim = function (g, fn, col = '#bfcfff', lx = 1, ly = -0.4, width = 4, alpha = 0.8) {
    if (!rimA) { rimA = canvas(W, H); rimB = canvas(W, H); }
    const a = rimA.getContext('2d'), b = rimB.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W, H);
    a.save(); fn(a); a.restore();
    g.drawImage(rimA, 0, 0); // the figure itself
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'copy'; b.drawImage(rimA, 0, 0);
    b.globalCompositeOperation = 'source-in'; b.fillStyle = col; b.fillRect(0, 0, W, H);
    b.globalCompositeOperation = 'destination-out'; b.drawImage(rimA, -lx * width, -ly * width);
    b.globalCompositeOperation = 'source-over';
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = alpha; g.filter = 'blur(1.2px)'; g.drawImage(rimB, 0, 0); g.restore();
  };

  // tapered sleeve (shoulder puff -> elbow -> wrist); returns elbow/hand points like limb()
  NM.sleeve = function (g, x, y, a1, a2, l1, l2, w0, w1, w2, col, hi) {
    const [dx1, dy1] = dirv(a1), [dx2, dy2] = dirv(a2);
    const ex = x + dx1 * l1, ey = y + dy1 * l1, hx = ex + dx2 * l2, hy = ey + dy2 * l2;
    const n1 = [-dy1, dx1], n2 = [-dy2, dx2], ne = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2];
    g.beginPath();
    g.moveTo(x + n1[0] * w0, y + n1[1] * w0);
    g.quadraticCurveTo(x + dx1 * l1 * 0.35 + n1[0] * w0 * 1.15, y + dy1 * l1 * 0.35 + n1[1] * w0 * 1.15, ex + ne[0] * w1, ey + ne[1] * w1);
    g.lineTo(hx + n2[0] * w2, hy + n2[1] * w2);
    g.lineTo(hx - n2[0] * w2, hy - n2[1] * w2);
    g.lineTo(ex - ne[0] * w1, ey - ne[1] * w1);
    g.quadraticCurveTo(x + dx1 * l1 * 0.35 - n1[0] * w0 * 1.15, y + dy1 * l1 * 0.35 - n1[1] * w0 * 1.15, x - n1[0] * w0, y - n1[1] * w0);
    g.arc(x, y, w0, Math.atan2(-n1[1], -n1[0]), Math.atan2(n1[1], n1[0]), false);
    g.closePath();
    const gr = g.createLinearGradient(x - n1[0] * w0, y - n1[1] * w0, x + n1[0] * w0, y + n1[1] * w0);
    gr.addColorStop(0, col); gr.addColorStop(0.65, col); gr.addColorStop(1, hi);
    g.fillStyle = gr; g.fill();
    return { ex, ey, hx, hy, dx: dx2, dy: dy2 };
  };

  // ---------------- Isolde ----------------
  // pose: { dir, lean, armF:[a1,a2], armB, twirl, wind, sit, kneel, expr, headTilt, glow, yaw, look }
  NM.figIsolde = function (g, x, y, s, pose = {}, t = 0, opt = {}) {
    const u = s / 100;
    const dir = pose.dir ?? 1;
    const wind = pose.wind ?? 0.3;
    const sway = Math.sin(t * 1.6) * 1.2 * u + wind * 4 * u * (0.6 + 0.4 * Math.sin(t * 2.3));
    const twirl = pose.twirl || 0;
    const lean = pose.lean || 0;
    const sit = pose.sit || 0;
    const kneel = pose.kneel || 0;
    const C = Object.assign({ dress: '#110d18', dressMid: '#231b30', dressHi: '#463a60', lace: '#d8cce2', skin: '#ecd3c6', glove: '#0e0b14', veil: 'rgba(34,24,50,0.66)' }, opt.colors || {});
    const HAIR = ['#0b0912', '#141020', '#1e1830', '#2a2240'];
    const R0 = NM.rng(opt.seed || 5);
    g.save();
    g.translate(x, y);
    g.scale(dir, 1);
    const drop = sit * 18 * u + kneel * 36 * u;
    const waistY = -55 * u + drop, shY = -79 * u + drop;
    const lx = lean * 10 * u;
    // ---- veil (long, translucent, behind everything) ----
    const vEnd = -44 * u - sway * 3 - wind * 20 * u;
    const vg = g.createLinearGradient(lx, shY - 22 * u, vEnd, 0);
    vg.addColorStop(0, C.veil); vg.addColorStop(1, 'rgba(34,24,50,0.12)');
    g.fillStyle = vg;
    g.beginPath();
    g.moveTo(lx - 3 * u, shY - 22 * u);
    g.bezierCurveTo(lx - 18 * u - sway, shY + 10 * u, -32 * u - sway * 2, -34 * u, vEnd, -2 * u);
    g.quadraticCurveTo((vEnd - 14 * u) / 2, 4 * u, -14 * u - sway * 2, 0);
    g.bezierCurveTo(-12 * u, -30 * u, lx - 4 * u, shY + 12 * u, lx + 5 * u, shY - 18 * u);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(210,200,230,0.28)'; g.lineWidth = Math.max(1, 0.6 * u);
    g.beginPath(); g.moveTo(vEnd, -2 * u); g.quadraticCurveTo((vEnd - 14 * u) / 2, 4 * u, -14 * u - sway * 2, 0); g.stroke();
    // ---- long hair down the back ----
    for (let i = 0; i < 10; i++) {
      const f = i / 9;
      const x0 = lx + (-5 + f * 9) * u, y0 = shY - 19 * u;
      const ex = lx - (7 + f * 7) * u - sway * (1.2 + f * 0.6), ey = waistY + (6 + R0() * 12) * u;
      NM.hairLock(g, x0, y0, x0 - 5 * u, shY, ex + 4 * u, (shY + ey) / 2, ex, ey, 6.5 * u, 0.5 * u, HAIR, R0, i % 3 === 0 ? [0.1, 0.3, '#5a4f80'] : null);
    }
    // ---- far arm ----
    const aB = pose.armB || [0.15, 0.25];
    const fb = NM.sleeve(g, lx - 3 * u, shY + 3 * u, aB[0], aB[0] + aB[1], 18.5 * u, 17 * u, 4.4 * u, 2.4 * u, 1.9 * u, '#0a0810', '#1e1830');
    g.fillStyle = C.glove; g.beginPath(); g.ellipse(fb.hx + fb.dx * 1.5 * u, fb.hy + fb.dy * 1.5 * u, 2 * u, 2.6 * u, 0, 0, TAU); g.fill();
    // ---- skirt with bustle and a train ----
    const hemW = (24 + twirl * 18 + kneel * 10) * u;
    const hemLift = twirl * 6 * u;
    const train = (sit || twirl > 0.3 || kneel > 0.5) ? 0 : (16 + wind * 6) * u;
    const skirt = new Path2D();
    const wf = lx * 0.6 + 5 * u, wb = lx * 0.6 - 6 * u;
    skirt.moveTo(wb, waistY);
    if (sit) {
      skirt.bezierCurveTo(-12 * u, waistY + 4 * u, 18 * u, waistY + 2 * u, 28 * u, waistY + 10 * u);
      skirt.lineTo(30 * u, 0); skirt.lineTo(-16 * u, 0);
    } else {
      // bustle bulge at the back, then down to the hem / train
      skirt.bezierCurveTo(-16 * u, waistY + 2 * u, -20 * u - sway * 0.5, waistY + 16 * u, -18 * u - sway * 0.8, waistY + 22 * u);
      skirt.bezierCurveTo(-hemW * 0.9 - sway, -20 * u, -hemW - sway * 1.3 - train * 0.4, -6 * u, -hemW - sway * 1.3 - train, 1 * u - hemLift);
      const n = 16;
      for (let k = 0; k <= n; k++) {
        const xx = lerp(-hemW - sway * 1.3 - train * 0.6, hemW * 0.92 - sway * 0.6, k / n);
        const wv = Math.sin(k * 1.9 + t * (3 + twirl * 6)) * (0.8 + twirl * 2.5) * u;
        skirt.lineTo(xx, -hemLift * (1 - Math.sin((k / n) * Math.PI)) + wv);
      }
      skirt.bezierCurveTo(hemW * 0.78, -20 * u, 12 * u + lx * 0.4, waistY + 12 * u, wf, waistY);
    }
    skirt.closePath();
    const sg = g.createLinearGradient(-hemW, 0, hemW, 0);
    sg.addColorStop(0, C.dress); sg.addColorStop(0.55, C.dressMid); sg.addColorStop(0.82, C.dressHi); sg.addColorStop(1, C.dress);
    g.fillStyle = sg; g.fill(skirt);
    g.save(); g.clip(skirt);
    for (let k = -5; k <= 5; k++) {
      const fx = k / 5;
      g.strokeStyle = k % 2 ? rgba('#000000', 0.4) : rgba(C.dressHi, 0.22);
      g.lineWidth = (k % 2 ? 5 : 3.2) * u;
      g.beginPath(); g.moveTo(lx * 0.6 + fx * 6 * u, waistY + 2 * u); g.quadraticCurveTo(fx * hemW * 0.55, -26 * u, fx * hemW * 1.05 - sway * 0.9 - (fx < 0 ? train * 0.5 * -fx : 0), 2 * u); g.stroke();
    }
    softShade(g, lx * 0.6, waistY + 8 * u, 18 * u, 12 * u, '#000000', 0.55);
    softShade(g, 0, 0, hemW * 1.2, 6 * u, '#000000', 0.5);
    g.fillStyle = rgba(C.lace, 0.18);
    for (let k = 0; k < 30; k++) {
      const xx = lerp(-hemW - sway * 1.3 - train * 0.6, hemW * 0.92 - sway * 0.6, k / 29);
      g.beginPath(); g.arc(xx, -1.6 * u - hemLift * (1 - Math.sin((k / 29) * Math.PI)), 0.9 * u, 0, TAU); g.fill();
    }
    g.restore();
    // ---- corseted bodice ----
    const bod = new Path2D();
    bod.moveTo(wb, waistY + 1 * u);
    bod.bezierCurveTo(lx - 7 * u, waistY - 8 * u, lx - 8 * u, shY + 8 * u, lx - 5.5 * u, shY + 1 * u);
    bod.quadraticCurveTo(lx, shY - 1.5 * u, lx + 6 * u, shY + 1 * u);
    bod.bezierCurveTo(lx + 9 * u, shY + 6 * u, lx + 10 * u, shY + 11 * u, lx + 6.5 * u, shY + 14 * u);
    bod.bezierCurveTo(lx + 4.5 * u, waistY - 8 * u, lx * 0.6 + 4 * u, waistY - 2 * u, wf, waistY + 1 * u);
    bod.closePath();
    const bg = g.createLinearGradient(lx - 8 * u, 0, lx + 10 * u, 0);
    bg.addColorStop(0, C.dress); bg.addColorStop(0.65, C.dressMid); bg.addColorStop(1, C.dressHi);
    g.fillStyle = bg; g.fill(bod);
    g.strokeStyle = rgba(C.lace, 0.35); g.lineWidth = Math.max(1, 0.45 * u);
    for (let k = 0; k < 6; k++) { const yy = lerp(shY + 9 * u, waistY - 2 * u, k / 5); g.beginPath(); g.moveTo(lx + 1.5 * u, yy); g.lineTo(lx + 4.5 * u, yy + 2 * u); g.moveTo(lx + 4.5 * u, yy); g.lineTo(lx + 1.5 * u, yy + 2 * u); g.stroke(); }
    // high lace collar + cameo
    g.fillStyle = rgba(C.lace, 0.85); g.beginPath(); g.moveTo(lx - 2.5 * u, shY - 3 * u); g.lineTo(lx + 3.5 * u, shY - 3.5 * u); g.lineTo(lx + 4.5 * u, shY + 2 * u); g.lineTo(lx - 3 * u, shY + 2 * u); g.closePath(); g.fill();
    g.fillStyle = '#b0102a'; g.beginPath(); g.ellipse(lx + 4.6 * u, shY + 4 * u, 1.5 * u, 1.8 * u, 0, 0, TAU); g.fill();
    // ---- near arm (puffed sleeve) ----
    const aF = pose.armF || [0.25, 0.3];
    const nf = NM.sleeve(g, lx + 2 * u, shY + 3 * u, aF[0], aF[0] + aF[1], 18.5 * u, 17 * u, 4.8 * u, 2.6 * u, 2 * u, C.dressMid, C.dressHi);
    g.strokeStyle = rgba(C.lace, 0.85); g.lineWidth = 2.6 * u; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(nf.hx - nf.dx * 2.5 * u, nf.hy - nf.dy * 2.5 * u); g.lineTo(nf.hx - nf.dx * 0.6 * u, nf.hy - nf.dy * 0.6 * u); g.stroke();
    const hX = nf.hx + nf.dx * 1.8 * u, hY = nf.hy + nf.dy * 1.8 * u;
    g.fillStyle = opt.handColor || C.glove; g.beginPath(); g.ellipse(hX, hY, 2.1 * u, 2.8 * u, -Math.atan2(nf.dx, nf.dy), 0, TAU); g.fill();
    if (pose.glow) {
      NM.glow(g, hX, hY, 20 * u * pose.glow, '#ff2a44', 0.85 * pose.glow);
      NM.glow(g, fb.hx, fb.hy, 15 * u * pose.glow, '#ff2a44', 0.6 * pose.glow);
    }
    // ---- head ----
    const hs = 14.5 * u;
    const chinY = shY - 3.4 * u;
    const eyeY = chinY - 83 * hs / 185;
    g.save();
    g.translate(lx + 1.2 * u, eyeY);
    g.rotate(pose.headTilt || 0);
    if (!opt.noHead) NM.paintIsolde(g, 0, 0, hs, pose.expr || 'cold', t, { yaw: pose.yaw ?? 0.34, body: false, e: Object.assign({ look: pose.look }, pose.e || {}), noBlink: pose.noBlink, light: pose.light ?? -0.6 });
    g.restore();
    g.restore();
    return { hand: [x + dir * hX, y + hY], hand2: [x + dir * fb.hx, y + fb.hy], head: [x + dir * (lx + 1.2 * u), y + eyeY], u };
  };

  // ---------------- Lucien ----------------
  NM.figLucien = function (g, x, y, s, pose = {}, t = 0, opt = {}) {
    const u = s / 100;
    const dir = pose.dir ?? 1;
    const alive = pose.alive || false;
    const C = Object.assign({ coat: '#13111a', coatMid: '#211e2b', coatHi: '#3c384e', shirt: '#dcdfe8', pants: '#0f0d15', skin: alive ? '#e8cbbb' : '#c4c8d2', shoe: '#07060b' }, opt.colors || {});
    g.save();
    g.translate(x, y);
    g.scale(dir, 1);
    const kneel = pose.kneel || 0;
    const hipY = -50 * u + kneel * 20 * u;
    const lean = pose.lean || 0;
    const shY = hipY - 31 * u;
    const lx = lean * 12 * u;
    const lb = pose.legB || (kneel ? [0.15, -1.75] : [-0.12, 0.05]);
    const lf = pose.legF || (kneel ? [1.5, -1.5] : [0.12, -0.02]);
    const legB = NM.trouserLeg(g, -2 * u, hipY, lb[0], lb[0] + lb[1], u, '#0a0910', '#1e1c28');
    g.fillStyle = C.shoe; g.beginPath(); g.ellipse(legB.hx + 2 * u, legB.hy, 5 * u, 2.2 * u, 0, 0, TAU); g.fill();
    // coat tails (split, behind the legs)
    const tailSw = Math.sin(t * 2) * 1.5 * u;
    const tg = g.createLinearGradient(-14 * u, 0, 4 * u, 0); tg.addColorStop(0, C.coat); tg.addColorStop(1, C.coatMid);
    g.fillStyle = tg;
    g.beginPath(); g.moveTo(-7 * u + lx * 0.3, hipY - 6 * u); g.quadraticCurveTo(-12 * u + tailSw, hipY + 10 * u, -14 * u + tailSw, hipY + 26 * u - kneel * 8 * u); g.lineTo(-6 * u + tailSw, hipY + 27 * u - kneel * 8 * u); g.lineTo(-3 * u + tailSw, hipY + 22 * u); g.lineTo(3 * u, hipY + 3 * u); g.closePath(); g.fill();
    // far arm
    const aB = pose.armB || [0.1, 0.2];
    const fb = NM.sleeve(g, lx - 4 * u, shY + 4 * u, aB[0], aB[0] + aB[1], 19 * u, 18 * u, 4.4 * u, 3.4 * u, 2.8 * u, '#0a0910', '#1e1c28');
    g.fillStyle = C.skin; g.beginPath(); g.ellipse(fb.hx + fb.dx * 1.6 * u, fb.hy + fb.dy * 1.6 * u, 2.3 * u, 2.9 * u, 0, 0, TAU); g.fill();
    const legF = NM.trouserLeg(g, 2 * u, hipY, lf[0], lf[0] + lf[1], u, C.pants, C.coatHi);
    g.fillStyle = C.shoe; g.beginPath(); g.ellipse(legF.hx + 2 * u, legF.hy, 5 * u, 2.2 * u, 0, 0, TAU); g.fill();
    // fitted tailcoat torso: broad sloped shoulders, narrow waist
    const torso = new Path2D();
    torso.moveTo(lx * 0.3 - 7 * u, hipY + 3 * u);
    torso.bezierCurveTo(lx - 8 * u, hipY - 10 * u, lx - 11 * u, shY + 8 * u, lx - 9 * u, shY + 2 * u);
    torso.quadraticCurveTo(lx - 2 * u, shY - 3 * u, lx + 6 * u, shY - 1 * u);
    torso.quadraticCurveTo(lx + 11 * u, shY + 2 * u, lx + 10 * u, shY + 8 * u);
    torso.bezierCurveTo(lx + 9 * u, shY + 16 * u, lx * 0.5 + 8 * u, hipY - 8 * u, lx * 0.5 + 8 * u, hipY + 3 * u);
    torso.closePath();
    const cg = g.createLinearGradient(lx - 11 * u, 0, lx + 11 * u, 0);
    cg.addColorStop(0, C.coat); cg.addColorStop(0.6, C.coatMid); cg.addColorStop(1, C.coatHi);
    g.fillStyle = cg; g.fill(torso);
    // shirt front, cravat, lapel, high collar
    g.fillStyle = C.shirt;
    g.beginPath(); g.moveTo(lx + 2 * u, shY - 1 * u); g.lineTo(lx + 8 * u, shY + 0.5 * u); g.lineTo(lx * 0.6 + 6.5 * u, hipY - 9 * u); g.lineTo(lx * 0.6 + 3.5 * u, hipY - 9 * u); g.closePath(); g.fill();
    softShade(g, lx + 4 * u, shY + 7 * u, 5 * u, 11 * u, '#3a3e50', 0.55);
    g.fillStyle = '#0a090e'; g.beginPath(); g.moveTo(lx + 3 * u, shY - 0.5 * u); g.lineTo(lx + 7.5 * u, shY - 0.5 * u); g.lineTo(lx + 5.2 * u, shY + 8 * u); g.fill();
    g.fillStyle = C.coatHi; g.beginPath(); g.moveTo(lx + 8 * u, shY + 0.5 * u); g.lineTo(lx + 10.5 * u, shY + 4 * u); g.lineTo(lx * 0.6 + 7 * u, hipY - 6 * u); g.closePath(); g.fill();
    g.fillStyle = C.shirt; g.beginPath(); g.moveTo(lx - 1 * u, shY - 3.5 * u); g.lineTo(lx + 5 * u, shY - 4.5 * u); g.lineTo(lx + 4 * u, shY + 0.5 * u); g.lineTo(lx - 1.5 * u, shY + 0.5 * u); g.closePath(); g.fill();
    if (!alive) NM.glow(g, lx + 3 * u, shY - 3 * u, 8 * u, '#ff2a44', 0.5 + 0.2 * Math.sin(t * 3));
    // near arm
    const aF = pose.armF || [0.2, 0.25];
    const nf = NM.sleeve(g, lx + 3 * u, shY + 4 * u, aF[0], aF[0] + aF[1], 19 * u, 18 * u, 4.6 * u, 3.5 * u, 2.9 * u, C.coatMid, C.coatHi);
    g.strokeStyle = C.shirt; g.lineWidth = 2 * u; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(nf.hx - nf.dx * 1.6 * u, nf.hy - nf.dy * 1.6 * u); g.lineTo(nf.hx + nf.dx * 0.3 * u, nf.hy + nf.dy * 0.3 * u); g.stroke();
    const hX = nf.hx + nf.dx * 2.2 * u, hY = nf.hy + nf.dy * 2.2 * u;
    g.fillStyle = C.skin; g.beginPath(); g.ellipse(hX, hY, 2.4 * u, 3.1 * u, -Math.atan2(nf.dx, nf.dy), 0, TAU); g.fill();
    // head
    const hs = 15 * u;
    const chinY = shY - 4 * u;
    const eyeY = chinY - 83 * hs / 185;
    g.save(); g.translate(lx + 1.5 * u, eyeY); g.rotate(pose.headTilt || 0);
    if (!opt.noHead) NM.paintLucien(g, 0, 0, hs, pose.expr || (alive ? 'alive' : 'hollow'), t, { yaw: pose.yaw ?? 0.34, body: false, alive, e: pose.e || {}, noBlink: pose.noBlink, light: pose.light ?? -0.5 });
    g.restore();
    g.restore();
    return { hand: [x + dir * hX, y + hY], hand2: [x + dir * fb.hx, y + fb.hy], head: [x + dir * (lx + 1.5 * u), y + eyeY], chest: [x + dir * (lx + 2 * u), y + shY + 8 * u], u };
  };


  // ---------------- back views (walking away from camera) ----------------
  NM.figIsoldeBack = function (g, x, y, s, t, opt = {}) {
    const u = s / 100, w = opt.walk ?? 1;
    const bob = Math.abs(Math.sin(t * 4.4)) * 1.2 * u * w, sw = Math.sin(t * 4.4) * 1.5 * u * w;
    const wind = opt.wind ?? 0.3;
    g.save(); g.translate(x, y - bob);
    // veil
    const vg = g.createLinearGradient(0, -96 * u, 0, 0); vg.addColorStop(0, 'rgba(34,24,50,0.85)'); vg.addColorStop(1, 'rgba(34,24,50,0.25)');
    g.fillStyle = vg;
    g.beginPath(); g.moveTo(-9 * u, -94 * u); g.bezierCurveTo(-24 * u, -40 * u, -30 * u + sw, -10 * u, -32 * u + sw - wind * 6 * u, 2 * u); g.lineTo(32 * u + sw + wind * 6 * u, 2 * u); g.bezierCurveTo(30 * u + sw, -10 * u, 24 * u, -40 * u, 9 * u, -94 * u); g.closePath(); g.fill();
    // skirt (front-back symmetric bell with bustle)
    const sg = g.createLinearGradient(-26 * u, 0, 26 * u, 0); sg.addColorStop(0, '#0c0912'); sg.addColorStop(0.5, '#231b30'); sg.addColorStop(1, '#0c0912');
    g.fillStyle = sg;
    g.beginPath(); g.moveTo(-7 * u, -55 * u); g.bezierCurveTo(-16 * u, -50 * u, -24 * u, -14 * u, -27 * u + sw, 0); g.lineTo(27 * u + sw, 0); g.bezierCurveTo(24 * u, -14 * u, 16 * u, -50 * u, 7 * u, -55 * u); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3 * u;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 2 * u, -52 * u); g.quadraticCurveTo(k * 8 * u, -20 * u, k * 12 * u + sw, 0); g.stroke(); }
    // bodice + shoulders
    g.fillStyle = '#16111f';
    g.beginPath(); g.moveTo(-6 * u, -55 * u); g.lineTo(-9 * u, -77 * u); g.quadraticCurveTo(0, -81 * u, 9 * u, -77 * u); g.lineTo(6 * u, -55 * u); g.closePath(); g.fill();
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 9 * u, -74 * u, 4.6 * u, 5 * u, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(sx * 11 * u, -72 * u); g.lineTo(sx * 13 * u - sw * sx * 0.3, -50 * u); g.lineTo(sx * 9.5 * u, -50 * u); g.lineTo(sx * 7 * u, -72 * u); g.closePath(); g.fill(); }
    // red bow at the small of the back
    g.fillStyle = '#8a0c20'; g.beginPath(); g.ellipse(-3.5 * u, -55 * u, 3.5 * u, 2 * u, 0.3, 0, TAU); g.ellipse(3.5 * u, -55 * u, 3.5 * u, 2 * u, -0.3, 0, TAU); g.fill();
    // head + long hair down the back
    const H = ['#0b0912', '#141020', '#1e1830', '#2a2240'];
    const R0 = NM.rng(3);
    g.fillStyle = H[0]; g.beginPath(); g.ellipse(0, -88 * u, 7.5 * u, 8.5 * u, 0, 0, TAU); g.fill();
    for (let i = 0; i < 9; i++) { const f = i / 8 - 0.5; NM.hairLock(g, f * 10 * u, -94 * u, f * 14 * u, -80 * u, f * 13 * u + sw * 0.5, -66 * u, f * 12 * u + sw, -50 * u - R0() * 6 * u, 5 * u, 0.5 * u, H, R0, i % 3 === 0 ? [0.05, 0.25, '#5a4f80'] : null); }
    g.fillStyle = '#0a0810'; g.beginPath(); g.ellipse(3 * u, -96 * u, 7 * u, 2.4 * u, 0.3, 0, TAU); g.fill();
    g.fillStyle = '#b0102a'; g.beginPath(); g.arc(7 * u, -97 * u, 1.8 * u, 0, TAU); g.fill();
    if (opt.lantern) { const lx = 13 * u, ly = -50 * u; NM.lantern(g, lx, ly, u * 0.55, t); }
    g.restore();
  };
  NM.figLucienBack = function (g, x, y, s, t, opt = {}) {
    const u = s / 100, w = opt.walk ?? 1;
    const ph = Math.sin(t * 4.4 + 1.6) * w;
    const bob = Math.abs(ph) * 1.2 * u;
    g.save(); g.translate(x, y - bob);
    const col = '#0e0d14', mid = '#1e1c28';
    // legs alternate
    for (const sx of [-1, 1]) { g.fillStyle = col; const lift = sx * ph > 0 ? 2.5 * u : 0; g.beginPath(); g.moveTo(sx * 2 * u, -50 * u); g.lineTo(sx * 7 * u, -50 * u); g.lineTo(sx * 6.5 * u, -lift); g.lineTo(sx * 2.5 * u, -lift); g.closePath(); g.fill(); }
    // coat with split tails
    const cg = g.createLinearGradient(-12 * u, 0, 12 * u, 0); cg.addColorStop(0, col); cg.addColorStop(0.5, mid); cg.addColorStop(1, col);
    g.fillStyle = cg;
    g.beginPath(); g.moveTo(-10 * u, -80 * u); g.quadraticCurveTo(-12 * u, -60 * u, -9 * u, -50 * u); g.lineTo(-8 * u, -28 * u); g.lineTo(-1 * u, -30 * u); g.lineTo(0, -48 * u); g.lineTo(1 * u, -30 * u); g.lineTo(8 * u, -28 * u); g.lineTo(9 * u, -50 * u); g.quadraticCurveTo(12 * u, -60 * u, 10 * u, -80 * u); g.quadraticCurveTo(0, -84 * u, -10 * u, -80 * u); g.closePath(); g.fill();
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 10 * u, -79 * u); g.lineTo(sx * (12.5 * u) + sx * ph * 1.2 * u, -52 * u); g.lineTo(sx * 9 * u + sx * ph * 1.2 * u, -52 * u); g.lineTo(sx * 7 * u, -78 * u); g.closePath(); g.fill(); g.fillStyle = '#b8bcc8'; g.beginPath(); g.ellipse(sx * 11 * u + sx * ph * 1.2 * u, -50 * u, 1.8 * u, 2.4 * u, 0, 0, TAU); g.fill(); g.fillStyle = cg; }
    g.fillStyle = '#d8dbe4'; g.fillRect(-3.5 * u, -84 * u, 7 * u, 3 * u);
    const H = ['#141016', '#201a22', '#2c2430', '#3a3040'], R0 = NM.rng(11);
    g.fillStyle = H[0]; g.beginPath(); g.ellipse(0, -90 * u, 7.5 * u, 8.5 * u, 0, 0, TAU); g.fill();
    for (let i = 0; i < 8; i++) { const f = i / 7 - 0.5; NM.hairLock(g, f * 6 * u, -98 * u, f * 14 * u, -94 * u, f * 14 * u, -86 * u, f * 13 * u, -82 * u - R0() * 3 * u, 5 * u, 0.6 * u, H, R0, null); }
    g.restore();
  };

  // ---------------- skeleton ----------------
  NM.figSkeleton = function (g, x, y, s, pose = {}, t = 0) {
    const u = s / 100, dir = pose.dir ?? 1;
    g.save(); g.translate(x, y); g.scale(dir, 1);
    const hipY = -50 * u, shY = -80 * u;
    const B = pose.bone || '#e2d8c6', Bs = pose.boneS || '#8a7e70';
    g.lineCap = 'round';
    const lb = pose.legB || [-0.15, 0.1], lf = pose.legF || [0.15, -0.05];
    limb(g, -2 * u, hipY, lb[0], 25 * u, lb[0] + lb[1], 24 * u, 2.8 * u, 2.3 * u, Bs);
    limb(g, 2 * u, hipY, lf[0], 25 * u, lf[0] + lf[1], 24 * u, 3 * u, 2.5 * u, B);
    g.lineWidth = 2.8 * u; g.strokeStyle = B;
    g.beginPath(); g.moveTo(0, hipY); g.quadraticCurveTo(-3 * u, (hipY + shY) / 2, 0, shY); g.stroke();
    g.lineWidth = 1.9 * u;
    for (let k = 0; k < 5; k++) { const yy = shY + 4 * u + k * 4 * u; g.strokeStyle = k % 2 ? Bs : B; g.beginPath(); g.ellipse(1 * u, yy, 9 * u - k * 0.6 * u, 2.4 * u, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); }
    g.strokeStyle = B; g.beginPath(); g.ellipse(0, hipY, 8 * u, 3.5 * u, 0, 0, TAU); g.stroke();
    const aB = pose.armB || [0.2, 0.4], aF = pose.armF || [0.3, 0.5];
    limb(g, -4 * u, shY + 2 * u, aB[0], 18 * u, aB[0] + aB[1], 17 * u, 2.3 * u, 2 * u, Bs);
    limb(g, 4 * u, shY + 2 * u, aF[0], 18 * u, aF[0] + aF[1], 17 * u, 2.5 * u, 2.1 * u, B);
    // skull with painted shading
    const sk = g.createRadialGradient(4 * u, shY - 16 * u, 1, 2 * u, shY - 12 * u, 10 * u);
    sk.addColorStop(0, '#f6efe2'); sk.addColorStop(0.6, B); sk.addColorStop(1, Bs);
    g.fillStyle = sk;
    g.beginPath(); g.ellipse(2 * u, shY - 12 * u, 7.5 * u, 8 * u, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-2 * u, shY - 8 * u); g.lineTo(8 * u, shY - 8 * u); g.lineTo(7 * u, shY - 2 * u); g.lineTo(-1 * u, shY - 2 * u); g.fill();
    g.fillStyle = '#0a0608';
    g.beginPath(); g.ellipse(4.6 * u, shY - 12 * u, 2.4 * u, 2.8 * u, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(-0.8 * u, shY - 12 * u, 2 * u, 2.6 * u, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(2 * u, shY - 9 * u); g.lineTo(3.4 * u, shY - 6.5 * u); g.lineTo(1 * u, shY - 6.5 * u); g.fill();
    for (let k = 0; k < 4; k++) g.fillRect(0 + k * 2 * u, shY - 4.6 * u, 0.7 * u, 2.4 * u);
    if (pose.eyeGlow) { NM.glow(g, 4.6 * u, shY - 12 * u, 7 * u, '#ff2a44', 0.8); NM.glow(g, -0.8 * u, shY - 12 * u, 6 * u, '#ff2a44', 0.6); }
    if (pose.veil) { g.fillStyle = 'rgba(30,22,40,0.55)'; g.beginPath(); g.moveTo(-6 * u, shY - 20 * u); g.quadraticCurveTo(-24 * u, shY + 30 * u, -30 * u, 0); g.lineTo(-6 * u, 0); g.quadraticCurveTo(-8 * u, shY, 6 * u, shY - 20 * u); g.fill(); }
    g.restore();
  };

  // ---------------- ghost / soul ----------------
  NM.figGhost = function (g, x, y, s, t, opt = {}) {
    const u = s / 100;
    g.save(); g.translate(x, y);
    const a = opt.alpha ?? 0.7;
    const col = opt.color || '#bfe9ff';
    NM.glow(g, 0, -55 * u, 70 * u, col, 0.35 * a);
    g.globalCompositeOperation = 'screen';
    // trailing wispy body
    for (let k = 0; k < 6; k++) {
      const f = k / 5;
      const yy = -80 * u + f * 80 * u, wv = Math.sin(t * 3 + k) * 6 * u * f;
      const gr = g.createRadialGradient(wv, yy, 0, wv, yy, (18 - f * 10) * u);
      gr.addColorStop(0, rgba(col, 0.5 * a * (1 - f * 0.6))); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(wv, yy, (18 - f * 10) * u, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    // faint face: he is still recognisable
    if (opt.face !== false) {
      g.globalAlpha = a * 0.75;
      NM.paintLucien(g, 0, -86 * u, 22 * u, opt.expr || 'sleep', t, { body: false, noBlink: true, yaw: 0, P: { skin: '#cfe8f6', skinLight: '#ffffff', skinShadow: '#6f8fae', skinDeep: '#2a4060', hair: ['#4a6a8a', '#5a7a9a', '#6a8aaa', '#8aaacc'], lipD: '#6a8aa0', lipM: '#8aaac0', lipL: '#aacce0' } });
      g.globalAlpha = 1;
    }
    g.restore();
  };

  // ---------------- villager silhouette with torch / pitchfork ----------------
  NM.figMob = function (g, x, y, s, t, seed, opt = {}) {
    const u = s / 100, R = NM.rng(seed);
    const dir = opt.dir ?? 1;
    g.save(); g.translate(x, y); g.scale(dir, 1);
    const col = opt.color || '#0c0808';
    const walk = t * 5 + R() * 6;
    const ph = Math.sin(walk) * (opt.still ? 0 : 1);
    limb(g, -2 * u, -48 * u, ph * 0.4, 25 * u, ph * 0.4 + 0.2, 24 * u, 8 * u, 7 * u, col);
    limb(g, 2 * u, -48 * u, -ph * 0.4, 25 * u, -ph * 0.4 + 0.2, 24 * u, 8 * u, 7 * u, col);
    g.fillStyle = col;
    g.beginPath(); g.moveTo(-10 * u, -50 * u); g.lineTo(-11 * u, -80 * u); g.quadraticCurveTo(0, -87 * u, 11 * u, -80 * u); g.lineTo(10 * u, -50 * u); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(1 * u, -91 * u, 7 * u, 8 * u, 0, 0, TAU); g.fill();
    if (R() < 0.5) { g.fillRect(-9 * u, -98 * u, 20 * u, 3 * u); g.fillRect(-5 * u, -106 * u, 12 * u, 9 * u); }
    const tool = opt.tool ?? (R() < 0.6 ? 'torch' : 'fork');
    const ar = tool === 'none' ? limb(g, 4 * u, -78 * u, 0.15 + ph * 0.1, 18 * u, 0.3, 16 * u, 6 * u, 5 * u, col) : limb(g, 4 * u, -78 * u, Math.PI * 0.75 + ph * 0.05, 18 * u, Math.PI * 0.9, 16 * u, 6 * u, 5 * u, col);
    let flame = null;
    if (tool === 'torch') {
      g.strokeStyle = col; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(ar.hx, ar.hy + 8 * u); g.lineTo(ar.hx + 2 * u, ar.hy - 16 * u); g.stroke();
      flame = [ar.hx + 2 * u, ar.hy - 15 * u];
    } else if (tool === 'fork') {
      g.strokeStyle = col; g.lineWidth = 2.4 * u; g.beginPath(); g.moveTo(ar.hx - 2 * u, ar.hy + 20 * u); g.lineTo(ar.hx + 3 * u, ar.hy - 30 * u); g.stroke();
      g.lineWidth = 1.6 * u;
      for (const k of [-4, 0, 4]) { g.beginPath(); g.moveTo(ar.hx + 3 * u + k * u, ar.hy - 30 * u); g.lineTo(ar.hx + 3 * u + k * u, ar.hy - 40 * u); g.stroke(); }
      g.beginPath(); g.moveTo(ar.hx - 1 * u, ar.hy - 30 * u); g.lineTo(ar.hx + 7 * u, ar.hy - 30 * u); g.stroke();
    }
    // warm rim from their own torches
    if (opt.rim) {
      g.strokeStyle = rgba(opt.rim, 0.65); g.lineWidth = Math.max(1, 1.5 * u); g.lineCap = 'round';
      g.beginPath(); g.moveTo(9.5 * u, -52 * u); g.lineTo(10.5 * u, -79 * u); g.stroke();
      g.beginPath(); g.arc(1 * u, -91 * u, 6.6 * u, -1.3, 0.9); g.stroke();
      g.globalAlpha = 0.5; g.beginPath(); g.moveTo(3 * u, -46 * u); g.lineTo(3 * u + ph * 6 * u, -4 * u); g.stroke(); g.globalAlpha = 1;
    }
    if (flame) NM.flame(g, flame[0], flame[1], 12 * u, t, seed, { color: '#ffa040', glowColor: '#ff7a2a', glowR: 6, glowA: 0.6, base: 'rgba(255,60,20,0.6)' });
    g.restore();
  };


  // ---------------- mourner (funeral crowd) ----------------
  NM.figMourner = function (g, x, y, s, t, seed, opt = {}) {
    const u = s / 100, R = NM.rng(seed);
    const female = opt.female ?? R() < 0.45;
    const dir = opt.dir ?? 1;
    const fogC = opt.fogCol || '#5a5a64', fk = opt.fog || 0;
    const col = NM.mixHex(opt.color || '#0e0d12', fogC, fk), hi = NM.mixHex(opt.hi || '#2a2834', fogC, fk);
    g.save(); g.translate(x, y); g.scale(dir, 1);
    const sway = Math.sin(t * 0.8 + seed) * 0.6 * u;
    const gr = g.createLinearGradient(-20 * u, 0, 20 * u, 0); gr.addColorStop(0, col); gr.addColorStop(0.7, col); gr.addColorStop(1, hi);
    g.fillStyle = gr;
    if (female) {
      g.beginPath(); g.moveTo(-5 * u, -55 * u); g.bezierCurveTo(-14 * u, -40 * u, -22 * u, -12 * u, -24 * u + sway, 0); g.lineTo(22 * u + sway, 0); g.bezierCurveTo(20 * u, -12 * u, 12 * u, -40 * u, 5 * u, -55 * u); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-5 * u, -55 * u); g.lineTo(-8 * u, -78 * u); g.quadraticCurveTo(0, -82 * u, 8 * u, -78 * u); g.lineTo(5 * u, -55 * u); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(1 * u, -88 * u, 6 * u, 7 * u, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-8 * u, -92 * u); g.quadraticCurveTo(-16 * u, -60 * u, -14 * u + sway, -40 * u); g.lineTo(-4 * u, -50 * u); g.lineTo(6 * u, -94 * u); g.closePath(); g.fill(); // veil
    } else {
      NM.trouserLeg(g, -3 * u, -48 * u, -0.05, 0, u, col, hi);
      NM.trouserLeg(g, 3 * u, -48 * u, 0.05, 0, u, col, hi);
      g.beginPath(); g.moveTo(-9 * u, -80 * u); g.lineTo(-12 * u, -24 * u + sway); g.lineTo(12 * u, -24 * u + sway); g.lineTo(9 * u, -80 * u); g.quadraticCurveTo(0, -84 * u, -9 * u, -80 * u); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(1 * u, -90 * u, 6.5 * u, 7.5 * u, 0, 0, TAU); g.fill();
      g.fillRect(-9 * u, -97 * u, 19 * u, 2.6 * u); g.fillRect(-5.5 * u, -112 * u, 12 * u, 16 * u); // top hat
    }
    // arm up to the umbrella handle
    g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = 5 * u;
    g.beginPath(); g.moveTo(6 * u, -76 * u); g.quadraticCurveTo(12 * u, -64 * u, 8 * u, -66 * u); g.stroke();
    if (opt.umbrella !== false) {
      const ux = 6 * u, uy = -128 * u;
      g.lineWidth = 1.6 * u; g.beginPath(); g.moveTo(8 * u, -60 * u); g.lineTo(ux, uy); g.stroke();
      const cg = g.createLinearGradient(0, uy - 14 * u, 0, uy + 10 * u); cg.addColorStop(0, hi); cg.addColorStop(1, col);
      g.fillStyle = cg;
      g.beginPath(); g.moveTo(ux - 34 * u, uy + 8 * u);
      for (let k = 0; k <= 8; k++) { const a = Math.PI + (k / 8) * Math.PI; g.lineTo(ux + Math.cos(a) * 34 * u, uy + 8 * u + Math.sin(a) * 20 * u); }
      for (let k = 8; k >= 0; k--) { const xx = ux - 34 * u + (k / 8) * 68 * u; g.quadraticCurveTo(xx + 4.25 * u, uy + 12 * u, xx, uy + 8 * u); }
      g.closePath(); g.fill();
      g.strokeStyle = rgba(hi, 0.7); g.lineWidth = 0.8 * u;
      for (let k = 1; k < 8; k++) { const a = Math.PI + (k / 8) * Math.PI; g.beginPath(); g.moveTo(ux, uy - 12 * u); g.lineTo(ux + Math.cos(a) * 34 * u, uy + 8 * u + Math.sin(a) * 20 * u); g.stroke(); }
      g.fillStyle = col; g.fillRect(ux - 0.8 * u, uy - 18 * u, 1.6 * u, 6 * u);
    }
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
    const legs = [[-28, 0], [-22, 1.6], [22, 3.2], [28, 4.8]];
    for (const [lx, o] of legs) {
      const a = Math.sin(ph + o) * 0.7 * (1 - rear) + (lx > 0 ? rear * 1.4 : 0);
      limb(g, lx * u, -40 * u + bob, a, 18 * u, a + (Math.cos(ph + o) > 0 ? -0.9 : 0.2), 18 * u, 6 * u, 3.4 * u, col);
    }
    g.beginPath(); g.ellipse(0, -48 * u + bob, 36 * u, 14 * u, 0, 0, TAU); g.fill();
    g.beginPath();
    g.moveTo(22 * u, -56 * u + bob); g.quadraticCurveTo(34 * u, -80 * u + bob, 44 * u, -86 * u + bob);
    g.lineTo(58 * u, -70 * u + bob); g.lineTo(54 * u, -64 * u + bob); g.lineTo(40 * u, -70 * u + bob); g.quadraticCurveTo(36 * u, -50 * u + bob, 30 * u, -40 * u + bob); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(42 * u, -86 * u + bob); g.lineTo(42 * u, -94 * u + bob); g.lineTo(46 * u, -87 * u + bob); g.fill();
    g.lineWidth = 3 * u;
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo((26 + k * 3.2) * u, (-60 - k * 4.5) * u + bob); g.lineTo((16 + k * 3.2) * u - Math.sin(ph + k) * 4 * u, (-56 - k * 4.5) * u + bob); g.stroke(); }
    g.lineWidth = 5 * u;
    g.beginPath(); g.moveTo(-34 * u, -52 * u + bob); g.quadraticCurveTo(-52 * u, -50 * u + Math.sin(ph) * 6 * u, -56 * u, -28 * u + bob); g.stroke();
    if (opt.eye) { g.fillStyle = opt.eye; g.beginPath(); g.arc(48 * u, -79 * u + bob, 1.4 * u, 0, TAU); g.fill(); }
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
    g.beginPath();
    g.moveTo(-40 * u, -30 * u); g.lineTo(-44 * u, -78 * u); g.quadraticCurveTo(0, -86 * u, 40 * u, -78 * u); g.lineTo(36 * u, -30 * u);
    g.quadraticCurveTo(0, -18 * u, -40 * u, -30 * u); g.closePath(); g.fill();
    g.fillRect(-46 * u, -84 * u, 92 * u, 4 * u);
    g.fillRect(-30 * u, -92 * u, 40 * u, 8 * u);
    g.fillStyle = opt.window || '#3a2a20';
    g.beginPath(); g.moveTo(-16 * u, -70 * u); g.lineTo(16 * u, -70 * u); g.lineTo(14 * u, -46 * u); g.lineTo(-14 * u, -46 * u); g.closePath(); g.fill();
    if (opt.passenger) { g.fillStyle = col; g.beginPath(); g.ellipse(2 * u, -58 * u, 6 * u, 7 * u, 0, 0, TAU); g.fill(); g.fillRect(-6 * u, -52 * u, 16 * u, 6 * u); }
    g.strokeStyle = rim; g.lineWidth = Math.max(1, 1.5 * u); g.beginPath(); g.moveTo(-44 * u, -78 * u); g.quadraticCurveTo(0, -86 * u, 40 * u, -78 * u); g.stroke();
    g.fillStyle = col; g.fillRect(40 * u, -76 * u, 4 * u, 10 * u);
    NM.glow(g, 42 * u, -72 * u, 18 * u, '#ffb347', opt.lantern ?? 0.8);
    g.fillStyle = col; g.fillRect(36 * u, -50 * u, 22 * u, 4 * u); g.fillRect(52 * u, -36 * u, 46 * u, 3 * u);
    for (const [wx, r] of [[-26 * u, 20 * u], [26 * u, 16 * u]]) {
      if (opt.brokenWheel && wx > 0) continue;
      g.strokeStyle = col; g.lineWidth = 3 * u;
      g.beginPath(); g.arc(wx, -r, r, 0, TAU); g.stroke();
      g.lineWidth = 1.6 * u;
      for (let k = 0; k < 8; k++) { const a = spin + (k * Math.PI) / 4; g.beginPath(); g.moveTo(wx, -r); g.lineTo(wx + Math.cos(a) * r, -r + Math.sin(a) * r); g.stroke(); }
      g.strokeStyle = rim; g.lineWidth = Math.max(1, 1 * u); g.beginPath(); g.arc(wx, -r, r, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
    }
    g.restore();
  };

})();
