// Necromantical — painted semi-realistic gothic portraits (Isolde, Lucien).
// Faces are modelled on a rough head ellipsoid so they can turn (yaw); form is built
// from soft gradients (chiaroscuro key light, cool fill, crimson rim) rather than outlines.
'use strict';
(function () {
  const { clamp, lerp, TAU, rng, rgba } = NM;

  // expression presets
  const EX = {
    cold: { lid: 0.3, brow: -0.1, mouth: 'flat', pupil: 1, glow: 0.15 },
    smirk: { lid: 0.36, brow: -0.3, mouth: 'smirk', pupil: 1, glow: 0.3, blush: 0.15 },
    smile: { lid: 0.22, brow: 0.1, mouth: 'smile', pupil: 1, glow: 0.15, blush: 0.35 },
    tender: { lid: 0.42, brow: 0.35, mouth: 'soft', pupil: 1.08, glow: 0.05, blush: 0.6 },
    sad: { lid: 0.3, brow: 0.9, mouth: 'sad', pupil: 1.1, glow: 0, tear: 1, wet: 1 },
    crazed: { lid: -0.08, brow: -0.6, mouth: 'grin', pupil: 0.4, glow: 1, shadow: 0.75, blush: 0.4 },
    hungry: { lid: 0.46, brow: -0.2, mouth: 'open', pupil: 0.8, glow: 0.7, blush: 0.7, shadow: 0.25 },
    shock: { lid: -0.12, brow: 0.6, mouth: 'o', pupil: 0.5, glow: 0 },
    closed: { lid: 1, brow: 0.2, mouth: 'soft', pupil: 1, glow: 0, blush: 0.4 },
    hollow: { lid: 0.34, brow: 0.45, mouth: 'flat', pupil: 0.55, glow: 0 },
    plead: { lid: 0.15, brow: 1, mouth: 'sad', pupil: 0.7, glow: 0, tear: 1, wet: 1 },
    pain: { lid: 0.55, brow: 1, mouth: 'open', pupil: 0.6, glow: 0 },
    alive: { lid: 0.18, brow: 0.2, mouth: 'smile', pupil: 1, glow: 0, blush: 0.4 },
    sleep: { lid: 1, brow: 0.3, mouth: 'flat', pupil: 1, glow: 0 },
  };
  NM.PEX = EX;

  // ---------- character looks ----------
  const ISOLDE = {
    skin: '#ecd3c6', skinLight: '#fbeee6', skinShadow: '#9a6a72', skinDeep: '#4a2c3a', blushC: '#d8707e',
    sclera: '#f1e8e6', iris: ['#2a0610', '#a3122a', '#ff5468'], pupil: '#0c0306', lash: '#0b0710', brow: '#1a1222',
    shadowMakeup: '#3a1c3a', lipD: '#5e0a1a', lipM: '#9e1028', lipL: '#d84a5e',
    hair: ['#0b0912', '#141020', '#1e1830', '#2a2240'], sheen: '#7a6ea6', hairStyle: 'hime', eyeGlow: '#ff2a44',
    veil: true, rose: true, collar: 'lace',
  };
  const LUCIEN = {
    skin: '#c4c8d2', skinLight: '#e8ebf0', skinShadow: '#5e6478', skinDeep: '#272a3a', blushC: '#8a8fa6',
    sclera: '#d8dce2', iris: ['#2a3442', '#7ea8c4', '#c8e4f4'], pupil: '#10141c', lash: '#121018', brow: '#2a2226',
    shadowMakeup: '#3a3448', lipD: '#4a4656', lipM: '#6e6a7a', lipL: '#9a96a6',
    hair: ['#141016', '#201a22', '#2c2430', '#3a3040'], sheen: '#6a6070', hairStyle: 'messy', eyeGlow: '#bfe9ff',
    stitches: true, sunken: 1, collar: 'shirt',
  };
  const LUCIEN_ALIVE = Object.assign({}, LUCIEN, {
    skin: '#e8cbbb', skinLight: '#f8e6da', skinShadow: '#8a5c58', skinDeep: '#3e2422', blushC: '#cc7a72',
    iris: ['#20140c', '#6a4a2c', '#b08a5a'], lipD: '#6a2a2a', lipM: '#a05050', lipL: '#c87a72',
    hair: ['#1a120c', '#2a1c12', '#3a281a', '#5a4028'], sheen: '#9a7a50', stitches: false, sunken: 0,
  });
  NM.LOOKS = { isolde: ISOLDE, lucien: LUCIEN, lucienAlive: LUCIEN_ALIVE };

  // ---------- helpers ----------
  function radial(g, x, y, rx, ry, col, a, mode = 'source-over', inner = 0) {
    if (a <= 0.003) return;
    g.save();
    g.globalCompositeOperation = mode;
    g.translate(x, y); g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, rx * inner, 0, 0, rx);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
    g.restore();
  }
  function strokePath(g, pts, w, col, a = 1) {
    g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w;
    g.beginPath(); g.moveTo(pts[0], pts[1]);
    if (pts.length === 6) g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
    else g.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
    g.stroke(); g.globalAlpha = 1;
  }

  // figure-scale head mode (set per call): shoulder-length hair mass, fringe shadow, scene-tinted skin
  let FIG = false;

  // ---------- the portrait ----------
  // cx, cy: centre of the eyes line; s: head height (crown to chin) in px
  // o: { yaw (-0.5..0.5), tilt, light: -1 (key from left) .. 1, rim, body:true }
  function portrait(g, cx, cy, s, P, e, t, o = {}) {
    const u = s / 185;
    FIG = !!o.fig;
    const yawMax = FIG ? 0.72 : 0.55;
    const yaw = clamp(o.yaw || 0, -yawMax, yawMax), cy_ = Math.cos(yaw), sy_ = Math.sin(yaw);
    const R = 62;
    // project a face-surface point (x, y) with bulge depth -> screen x
    const fz = (x, extra = 0) => Math.sqrt(Math.max(0, R * R - x * x)) * 0.62 + extra;
    const X = (x, extra = 0) => x * cy_ + fz(x, extra) * sy_;
    const fore = (x) => clamp(Math.cos(Math.atan2(x, fz(x)) + yaw), 0.15, 1); // feature foreshortening
    const light = o.light ?? -0.6; // -1 key light from left
    const seed = o.seed || 7;
    const R0 = rng(seed);
    g.save();
    g.translate(cx, cy);
    g.rotate(o.tilt || 0);
    g.scale(u, u);
    g.lineCap = 'round'; g.lineJoin = 'round';

    // ===== back hair / veil =====
    if (P.veil && !FIG) {
      const vg = g.createLinearGradient(0, -110, 0, 260);
      vg.addColorStop(0, 'rgba(26,18,36,0.92)'); vg.addColorStop(1, 'rgba(26,18,36,0.0)');
      g.fillStyle = vg;
      g.beginPath(); g.moveTo(-78, -70); g.bezierCurveTo(-130, 20, -150, 160, -170, 300); g.lineTo(170, 300); g.bezierCurveTo(150, 160, 130, 20, 78, -70); g.closePath(); g.fill();
    }
    drawBackHair(g, P, R0, t, yaw);

    // ===== neck + body =====
    drawNeck(g, P, X, light);
    if (o.body !== false) drawBody(g, P, t, yaw, light, o);

    // ===== face base =====
    const face = new Path2D();
    const cpts = [[-59, -40], [-60, -6], [-56, 20], [-46, 44], [-31, 64], [-14, 79], [0, 83], [14, 79], [31, 64], [46, 44], [56, 20], [60, -6], [59, -40]];
    const mapped = cpts.map(([x, y]) => [X(x * 0.98, x * x < 900 ? 4 : 0), y]);
    face.moveTo(mapped[0][0], mapped[0][1]);
    for (let i = 1; i < mapped.length; i++) {
      const [px, py] = mapped[i - 1], [qx, qy] = mapped[i];
      face.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
    }
    face.lineTo(mapped[mapped.length - 1][0], mapped[mapped.length - 1][1]);
    face.bezierCurveTo(X(58), -98, X(-58), -98, mapped[0][0], mapped[0][1]);
    face.closePath();

    g.save();
    g.clip(face);
    // base skin with key-light gradient
    const kg = g.createLinearGradient(-70 * Math.sign(light || 1), 0, 70 * Math.sign(light || 1), 0);
    kg.addColorStop(0, P.skinLight); kg.addColorStop(0.45, P.skin); kg.addColorStop(1, P.skinShadow);
    g.fillStyle = kg; g.fillRect(-90, -110, 180, 210);
    // form shadows (multiply)
    const sh = -Math.sign(light || 1);
    radial(g, X(sh * 58), 10, 46, 90, P.skinShadow, 0.65, 'multiply');            // shadow-side cheek
    radial(g, X(-25), 2, 24, 17, P.skinShadow, 0.55, 'multiply');                   // eye sockets
    radial(g, X(25), 2, 24, 17, P.skinShadow, 0.55, 'multiply');
    radial(g, X(0, 6), -6, 10, 22, P.skinShadow, 0.2, 'multiply');                  // brow-nose junction
    radial(g, X(sh * 10, 14), 28, 9, 18, P.skinShadow, 0.55, 'multiply');           // nose side
    radial(g, X(0, 14), 44, 14, 5, P.skinDeep, 0.45, 'multiply');                   // under nose
    radial(g, X(0, 8), 66, 16, 6, P.skinShadow, 0.5, 'multiply');                   // under lower lip
    radial(g, X(-40), 34, 18, 26, P.skinShadow, 0.35 + (P.sunken || 0) * 0.35, 'multiply'); // under cheekbones
    radial(g, X(40), 34, 18, 26, P.skinShadow, 0.35 + (P.sunken || 0) * 0.35, 'multiply');
    radial(g, X(0), 92, 70, 24, P.skinDeep, 0.6, 'multiply');                       // jaw / chin underside
    radial(g, X(0), -92, 80, 30, P.skinDeep, 0.55, 'multiply');                     // hairline shadow
    // highlights (screen)
    radial(g, X(-sh * 8), -46, 30, 16, P.skinLight, 0.55, 'screen');                // forehead
    radial(g, X(0, 14), 12, 4, 20, P.skinLight, 0.45, 'screen');                    // nose bridge
    radial(g, X(0, 16), 34, 5, 4, P.skinLight, 0.6, 'screen');                      // nose tip
    radial(g, X(-sh * 38), 14, 16, 10, P.skinLight, 0.4, 'screen');                 // lit cheekbone
    radial(g, X(0, 8), 76, 10, 5, P.skinLight, 0.35, 'screen');                     // chin
    // blush / warmth
    const bl = (e.blush || 0) + 0.25;
    radial(g, X(-34), 26, 18, 11, P.blushC, 0.3 * bl, 'multiply');
    radial(g, X(34), 26, 18, 11, P.blushC, 0.3 * bl, 'multiply');
    radial(g, X(0, 16), 34, 7, 5, P.blushC, 0.18 * bl, 'multiply');
    // rim light from behind (crimson/moon), along the shadow-side edge
    if (o.rim) {
      g.save(); g.globalCompositeOperation = 'screen';
      const rg = g.createLinearGradient(X(sh * 64), 0, X(sh * 40), 0);
      rg.addColorStop(0, rgba(o.rim, 0.75)); rg.addColorStop(1, rgba(o.rim, 0));
      g.fillStyle = rg; g.fillRect(-90, -110, 180, 210); g.restore();
    }
    // corpse details
    if (P.sunken) {
      radial(g, X(-25), 14, 18, 8, '#2a2236', 0.55, 'multiply');
      radial(g, X(25), 14, 18, 8, '#2a2236', 0.55, 'multiply');
    }
    if (P.stitches) {
      g.strokeStyle = 'rgba(70,30,44,0.8)'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(X(18), 30); g.quadraticCurveTo(X(34), 36, X(50), 30); g.stroke();
      for (let k = 0; k < 7; k++) { const xx = lerp(18, 50, k / 6); const yy = 30 + Math.sin((k / 6) * Math.PI) * 4; g.beginPath(); g.moveTo(X(xx) - 1.5, yy - 3.5); g.lineTo(X(xx) + 1.5, yy + 3.5); g.stroke(); }
    }
    g.restore();
    // subtle edge darkening on the face silhouette (painted, not outlined)
    if (!FIG) { g.save(); g.globalAlpha = 0.35; g.strokeStyle = P.skinDeep; g.lineWidth = 2.2; g.stroke(face); g.restore(); }

    // ===== eyes =====
    const lid = e.lid;
    const eyeInfo = [];
    for (const sx of [-1, 1]) {
      const ex0 = sx * 25;
      const k = fore(ex0);
      const ew = 34 * k * (FIG ? 0.84 : 1), eh = FIG ? 13 : 15;
      const ex = X(ex0), ey = 0;
      eyeInfo.push({ x: ex, y: ey });
      // smoky makeup
      if (P.shadowMakeup) radial(g, ex + sx * 3, ey - 6, ew * 0.8, 15, P.shadowMakeup, 0.55, 'multiply');
      // lid crease
      g.strokeStyle = rgba(P.skinDeep, 0.5); g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(ex - ew * 0.45, ey - 6); g.quadraticCurveTo(ex - sx * 3, ey - 15 - (1 - Math.max(0, lid)) * 2, ex + ew * 0.5, ey - 7); g.stroke();
      // eye opening
      const top = ey - eh * 0.62 + eh * 1.05 * clamp(lid, -0.3, 1);
      const inner = -sx; // inner corner direction
      const eye = new Path2D();
      const xi = ex + inner * ew / 2, xo = ex - inner * ew / 2;
      eye.moveTo(xi, ey + 1.5);
      eye.bezierCurveTo(xi - inner * ew * 0.2, top, xo + inner * ew * 0.35, top - 1, xo, ey - 0.5);
      eye.bezierCurveTo(xo + inner * ew * 0.25, ey + eh * 0.5, xi - inner * ew * 0.3, ey + eh * 0.55, xi, ey + 1.5);
      if (lid < 0.94) {
        g.save(); g.clip(eye);
        const sg = g.createLinearGradient(0, top, 0, ey + eh * 0.5);
        sg.addColorStop(0, '#8a7a7e'); sg.addColorStop(0.35, P.sclera); sg.addColorStop(1, P.sclera);
        g.fillStyle = sg; g.fillRect(ex - ew, top - 4, ew * 2, eh * 2);
        radial(g, xi, ey + 1, 6, 6, '#c08a90', 0.6, 'multiply');
        radial(g, xo, ey, 7, 7, '#7a6a70', 0.5, 'multiply');
        // iris
        const look = e.look || [0, 0];
        const ir = 7.4 * (0.92 + 0.08 * k), ix = ex + look[0] * ew * 0.18 + sx * yaw * 2, iy = ey + 1 + look[1] * 2;
        const igr = g.createRadialGradient(ix, iy, 0, ix, iy, ir);
        igr.addColorStop(0, P.iris[0]); igr.addColorStop(0.32, P.iris[1]); igr.addColorStop(0.72, P.iris[2]); igr.addColorStop(0.9, P.iris[1]); igr.addColorStop(1, P.iris[0]);
        g.fillStyle = igr; g.beginPath(); g.ellipse(ix, iy, ir * k, ir, 0, 0, TAU); g.fill();
        // striations
        g.strokeStyle = rgba(P.iris[2], 0.5); g.lineWidth = 0.5;
        for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU; g.beginPath(); g.moveTo(ix + Math.cos(a) * ir * 0.35 * k, iy + Math.sin(a) * ir * 0.35); g.lineTo(ix + Math.cos(a) * ir * 0.85 * k, iy + Math.sin(a) * ir * 0.85); g.stroke(); }
        // pupil
        g.fillStyle = P.pupil; g.beginPath(); g.ellipse(ix, iy, ir * 0.36 * e.pupil * k, ir * 0.38 * e.pupil, 0, 0, TAU); g.fill();
        // lid shadow on the eyeball
        const lg = g.createLinearGradient(0, top - 1, 0, top + 7);
        lg.addColorStop(0, 'rgba(20,8,16,0.75)'); lg.addColorStop(1, 'rgba(20,8,16,0)');
        g.fillStyle = lg; g.fillRect(ex - ew, top - 2, ew * 2, 10);
        // catchlights
        g.fillStyle = 'rgba(255,255,255,0.95)';
        g.beginPath(); g.ellipse(ix - ir * 0.32 * k + light * 1.5, iy - ir * 0.38, 1.8, 2.1, 0, 0, TAU); g.fill();
        g.globalAlpha = 0.6; g.beginPath(); g.arc(ix + ir * 0.35 * k, iy + ir * 0.3, 0.9, 0, TAU); g.fill(); g.globalAlpha = 1;
        g.restore();
        // lower waterline highlight
        g.strokeStyle = 'rgba(255,220,220,0.35)'; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(xi - inner * 2, ey + 3); g.bezierCurveTo(xi - inner * ew * 0.3, ey + eh * 0.5, xo + inner * ew * 0.25, ey + eh * 0.45, xo, ey + 1); g.stroke();
      } else {
        // closed lid: skin over the eye with lash line
        g.fillStyle = P.skin; g.fill(eye);
      }
      // upper lash line + lashes
      g.strokeStyle = P.lash;
      if (lid < 0.94) {
        g.lineWidth = 2.6;
        g.beginPath(); g.moveTo(xi, ey + 1.2); g.bezierCurveTo(xi - inner * ew * 0.2, top, xo + inner * ew * 0.35, top - 1, xo - inner * 1.5, ey - 1.5); g.stroke();
        g.lineWidth = 0.9;
        for (let i = 0; i < 11; i++) {
          const f = i / 10;
          const bx = lerp(xi, xo, f), by = top + Math.sin(f * Math.PI) * -0.2 + (f < 0.1 ? 1.5 : 0) + (lid > 0 ? 0 : 0);
          const len = 3 + f * 5;
          g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx - inner * len * 0.5, by - len * 0.8, bx - inner * len, by - len * 0.7 - f * 2); g.stroke();
        }
        g.lineWidth = 0.6; g.globalAlpha = 0.7;
        for (let i = 0; i < 6; i++) { const f = 0.25 + i / 8; const bx = lerp(xi, xo, f); g.beginPath(); g.moveTo(bx, ey + eh * 0.42); g.lineTo(bx - inner * 1.2, ey + eh * 0.42 + 2.6); g.stroke(); }
        g.globalAlpha = 1;
      } else {
        g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(xi, ey + 3); g.quadraticCurveTo(ex, ey + 8, xo, ey + 3); g.stroke();
        g.lineWidth = 0.9;
        for (let i = 0; i < 8; i++) { const f = 0.2 + i / 10; const bx = lerp(xi, xo, f), by = ey + 3 + Math.sin(f * Math.PI) * 4; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - inner * 2, by + 4); g.stroke(); }
      }
      // brow (hair strokes)
      const bInner = -20 - e.brow * 4, bOuter = -21 + e.brow * 3.5;
      g.strokeStyle = P.brow; g.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const f = i / 15;
        const bx = lerp(X(sx * 10), X(sx * 40), f), by = lerp(bInner, bOuter, f) - Math.sin(f * Math.PI) * (3 + Math.abs(e.brow)) + (R0() - 0.5);
        g.globalAlpha = 0.55 + 0.4 * Math.sin(f * Math.PI);
        g.beginPath(); g.moveTo(bx, by + 1.2); g.lineTo(bx + sx * 3.2, by - 1.4); g.stroke();
      }
      g.globalAlpha = 1;
      // tears
      if (e.tear) {
        const tk = ((t || 0) * 0.5 + (sx > 0 ? 0.45 : 0)) % 1;
        const tx = ex + sx * 4;
        g.strokeStyle = 'rgba(220,240,255,0.5)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(tx, ey + 8); g.lineTo(tx + sx * 1, ey + 8 + tk * 40); g.stroke();
        radial(g, tx + sx, ey + 8 + tk * 40, 3, 4, '#f0f8ff', 0.9);
      }
      if (e.bloodTear) {
        const len = 6 + e.bloodTear * 60;
        g.strokeStyle = '#7a0618'; g.lineWidth = 3; g.beginPath(); g.moveTo(ex + sx * 3, ey + 7); g.quadraticCurveTo(ex + sx * 5, ey + 7 + len * 0.6, ex + sx * 3, ey + 7 + len); g.stroke();
        g.strokeStyle = '#c4122f'; g.lineWidth = 1.2; g.stroke();
        radial(g, ex + sx * 3, ey + 7 + len, 3.5, 4.5, '#9a0a20', 1);
      }
    }

    // ===== nose (minimal painted marks) =====
    g.strokeStyle = rgba(P.skinDeep, 0.5); g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(X(-6, 12), 38); g.quadraticCurveTo(X(-2, 14), 40.5, X(0, 14), 39.5); g.stroke();
    g.beginPath(); g.moveTo(X(6, 12), 38); g.quadraticCurveTo(X(2, 14), 40.5, X(0, 14), 39.5); g.stroke();

    // ===== mouth =====
    drawMouth(g, X, P, e, fore);

    // ===== yandere shadow over the eyes =====
    if (e.shadow) {
      g.save(); g.clip(face);
      const sg = g.createLinearGradient(0, -80, 0, 14);
      sg.addColorStop(0, `rgba(16,4,14,${0.9 * e.shadow})`); sg.addColorStop(1, 'rgba(16,4,14,0)');
      g.fillStyle = sg; g.fillRect(-90, -110, 180, 125);
      g.restore();
    }

    // ===== figure heads: the fringe and side hair shade the face, and the skin takes the scene's light =====
    if (FIG) {
      g.save(); g.clip(face);
      const fs = g.createLinearGradient(0, -40, 0, 22);
      fs.addColorStop(0, 'rgba(12,6,16,0.6)'); fs.addColorStop(1, 'rgba(12,6,16,0)');
      g.fillStyle = fs; g.fillRect(-90, -110, 180, 135);
      const sideS = -Math.sign(light || 1);
      const ss = g.createLinearGradient(X(sideS * 62), 0, X(sideS * 20), 0);
      ss.addColorStop(0, 'rgba(12,6,16,0.55)'); ss.addColorStop(1, 'rgba(12,6,16,0)');
      g.fillStyle = ss; g.fillRect(-90, -110, 180, 210);
      g.globalCompositeOperation = 'multiply'; g.globalAlpha = o.ambientA ?? 0.32; g.fillStyle = o.ambient || '#6a5a7a'; g.fillRect(-90, -110, 180, 210);
      g.restore();
    }
    // ===== front hair (bangs, side locks), veil netting, ornaments =====
    drawFrontHair(g, P, R0, t, yaw, X, e);
    g.restore();
    FIG = false;

    // glowing eyes (unscaled glow sprites)
    if (e.glow > 0.05 && P.eyeGlow) {
      const ca = Math.cos(o.tilt || 0), sa = Math.sin(o.tilt || 0);
      for (const ei of eyeInfo) {
        const gx = cx + (ei.x * ca - (ei.y + 1) * sa) * u, gy = cy + (ei.x * sa + (ei.y + 1) * ca) * u;
        NM.glow(g, gx, gy, 22 * u * (0.7 + e.glow), P.eyeGlow, 0.5 * e.glow * (0.85 + 0.15 * Math.sin((t || 0) * 6)));
      }
    }
    return { eyes: eyeInfo.map((ei) => [cx + ei.x * u, cy + ei.y * u]), mouth: [cx + X(0, 8) * u, cy + 56 * u], u };
  }


  function drawNeck(g, P, X, light) {
    const nx = X(0) * 0.7;
    const neck = new Path2D();
    neck.moveTo(nx - 27, 40); neck.bezierCurveTo(nx - 26, 80, nx - 30, 104, nx - 46, 122);
    neck.lineTo(nx + 46, 122); neck.bezierCurveTo(nx + 30, 104, nx + 26, 80, nx + 27, 40); neck.closePath();
    const kg = g.createLinearGradient(nx - 40 * Math.sign(light || 1), 0, nx + 40 * Math.sign(light || 1), 0);
    kg.addColorStop(0, P.skin); kg.addColorStop(1, P.skinShadow);
    g.fillStyle = kg; g.fill(neck);
    g.save(); g.clip(neck);
    radial(g, nx, 58, 40, 30, P.skinDeep, 0.85, 'multiply');      // shadow cast by the jaw
    radial(g, nx - 16, 98, 7, 22, P.skinShadow, 0.35, 'multiply'); // neck muscles
    radial(g, nx + 16, 98, 7, 22, P.skinShadow, 0.35, 'multiply');
    radial(g, nx, 112, 10, 6, P.skinDeep, 0.4, 'multiply');        // pit of the throat
    if (FIG) { const ng = g.createLinearGradient(0, 40, 0, 122); ng.addColorStop(0, 'rgba(14,6,18,0.7)'); ng.addColorStop(1, 'rgba(14,6,18,0.35)'); g.fillStyle = ng; g.fillRect(nx - 60, 40, 120, 90); }
    g.restore();
  }

  function drawMouth(g, X, P, e, fore) {
    const my = 56, mx = X(0, 8), w = 15 * fore(0);
    g.save();
    switch (e.mouth) {
      case 'grin': {
        g.fillStyle = '#2a0610';
        g.beginPath(); g.moveTo(mx - w * 1.5, my - 4); g.quadraticCurveTo(mx, my + 16, mx + w * 1.5, my - 4); g.quadraticCurveTo(mx, my + 4, mx - w * 1.5, my - 4); g.fill();
        g.fillStyle = '#efe6e0';
        g.beginPath(); g.moveTo(mx - w * 1.25, my - 2.5); g.quadraticCurveTo(mx, my + 5, mx + w * 1.25, my - 2.5); g.quadraticCurveTo(mx, my + 1.5, mx - w * 1.25, my - 2.5); g.fill();
        g.strokeStyle = P.lipM; g.lineWidth = 2; g.beginPath(); g.moveTo(mx - w * 1.5, my - 4); g.quadraticCurveTo(mx, my + 16, mx + w * 1.5, my - 4); g.stroke();
        break;
      }
      case 'open': case 'o': {
        const oh = e.mouth === 'o' ? 9 : 6;
        g.fillStyle = '#2a0610'; g.beginPath(); g.ellipse(mx, my + 2, w * (e.mouth === 'o' ? 0.45 : 0.7), oh, 0, 0, TAU); g.fill();
        lips(g, mx, my, w, P, 0, oh);
        break;
      }
      default: {
        const curve = { smirk: [-1, 3], smile: [3, 3], soft: [1, 1], sad: [-2.5, -2.5], flat: [0, 0] }[e.mouth] || [0, 0];
        lips(g, mx, my, w, P, curve, 0);
      }
    }
    g.restore();
  }
  function lips(g, mx, my, w, P, curve, open) {
    const [cl, cr] = Array.isArray(curve) ? curve : [0, 0];
    // upper lip
    const ug = g.createLinearGradient(0, my - 6, 0, my + 1);
    ug.addColorStop(0, P.lipM); ug.addColorStop(1, P.lipD);
    g.fillStyle = ug;
    g.beginPath(); g.moveTo(mx - w, my - cl * 0.8);
    g.bezierCurveTo(mx - w * 0.5, my - 6, mx - w * 0.15, my - 7, mx, my - 4.5);
    g.bezierCurveTo(mx + w * 0.15, my - 7, mx + w * 0.5, my - 6, mx + w, my - cr * 0.8);
    g.quadraticCurveTo(mx, my + 0.8 - open * 0.3, mx - w, my - cl * 0.8); g.fill();
    // lower lip
    const lg = g.createLinearGradient(0, my, 0, my + 9 + open);
    lg.addColorStop(0, P.lipM); lg.addColorStop(0.5, P.lipL); lg.addColorStop(1, P.lipD);
    g.fillStyle = lg;
    g.beginPath(); g.moveTo(mx - w * 0.92, my - cl * 0.8 + open * 0.5);
    g.quadraticCurveTo(mx, my + 1 + open, mx + w * 0.92, my - cr * 0.8 + open * 0.5);
    g.quadraticCurveTo(mx, my + 11 + open, mx - w * 0.92, my - cl * 0.8 + open * 0.5); g.fill();
    // parting line + highlight
    g.strokeStyle = 'rgba(30,4,12,0.85)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(mx - w, my - cl * 0.8); g.quadraticCurveTo(mx, my + 1.5 + open, mx + w, my - cr * 0.8); g.stroke();
    g.fillStyle = 'rgba(255,230,235,0.5)'; g.beginPath(); g.ellipse(mx + 2, my + 4.5 + open * 0.6, w * 0.32, 1.4, 0, 0, TAU); g.fill();
  }

  // ---------- hair ----------
  // a lock: tapered clump along a cubic bezier, shaded across its width, with inner strands
  function lock(g, x0, y0, c1x, c1y, c2x, c2y, x1, y1, w0, w1, H, R0, sheen) {
    const N = 18, L = [], Rr = [];
    let mx = 0, my = 0, nx0 = 0, ny0 = 0;
    for (let i = 0; i <= N; i++) {
      const f = i / N, a = (1 - f) ** 3, b = 3 * (1 - f) ** 2 * f, c = 3 * (1 - f) * f * f, d = f ** 3;
      const x = a * x0 + b * c1x + c * c2x + d * x1, y = a * y0 + b * c1y + c * c2y + d * y1;
      const dx = 3 * (1 - f) ** 2 * (c1x - x0) + 6 * (1 - f) * f * (c2x - c1x) + 3 * f * f * (x1 - c2x);
      const dy = 3 * (1 - f) ** 2 * (c1y - y0) + 6 * (1 - f) * f * (c2y - c1y) + 3 * f * f * (y1 - c2y);
      const len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      const w = lerp(w0, w1, f ** 1.3) * (f < 0.08 ? 0.8 + f * 2.5 : 1);
      L.push([x + nx * w / 2, y + ny * w / 2]); Rr.push([x - nx * w / 2, y - ny * w / 2]);
      if (i === N >> 1) { mx = x; my = y; nx0 = nx; ny0 = ny; }
    }
    const wm = (w0 + w1) / 2;
    const gr = g.createLinearGradient(mx + nx0 * wm / 2, my + ny0 * wm / 2, mx - nx0 * wm / 2, my - ny0 * wm / 2);
    gr.addColorStop(0, H[1]); gr.addColorStop(0.4, H[2]); gr.addColorStop(0.65, H[1]); gr.addColorStop(1, H[0]);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(L[0][0], L[0][1]);
    for (const p of L) g.lineTo(p[0], p[1]);
    for (let i = Rr.length - 1; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1]);
    g.closePath(); g.fill();
    // inner strands
    g.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) {
      const o = (R0() - 0.5) * 0.7;
      g.strokeStyle = H[1 + Math.floor(R0() * 3)]; g.globalAlpha = 0.35;
      g.beginPath();
      for (let i = 0; i <= N; i++) { const x = lerp(L[i][0], Rr[i][0], 0.5 + o * (1 - i / N)), y = lerp(L[i][1], Rr[i][1], 0.5 + o * (1 - i / N)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    // sheen segment
    if (sheen) {
      const [s0, s1, col, sa] = sheen;
      g.globalCompositeOperation = 'screen'; g.strokeStyle = col; g.lineWidth = Math.max(1, w0 * 0.35); g.globalAlpha = sa ?? 0.35;
      g.beginPath();
      for (let i = Math.floor(s0 * N); i <= Math.floor(s1 * N); i++) { const x = lerp(L[i][0], Rr[i][0], 0.45), y = lerp(L[i][1], Rr[i][1], 0.45); i === Math.floor(s0 * N) ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
      g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
  }
  NM.hairLock = lock;

  function drawBackHair(g, P, R0, t, yaw) {
    const H = P.hair;
    g.save();
    const sway = Math.sin((t || 0) * 1.2) * 3;
    if (P.hairStyle === 'hime' && FIG) {
      // falls behind the shoulders (the body carries it on down the back), tapering, never a slab
      g.fillStyle = H[0];
      g.beginPath(); g.moveTo(-62, -70); g.bezierCurveTo(-82, -10, -86 + sway, 60, -74 + sway, 120); g.quadraticCurveTo(-40, 104, 0, 112); g.quadraticCurveTo(40, 104, 74 + sway, 120); g.bezierCurveTo(86 + sway, 60, 82, -10, 62, -70); g.closePath(); g.fill();
      for (let i = 0; i < 22; i++) {
        const side = i % 2 ? 1 : -1, f = R0();
        const x0 = side * (24 + f * 40), x1 = side * (64 + R0() * 16) + sway * (1 + f);
        lock(g, x0, -96 + f * 30, x0 + side * 26, -20, x1 - side * 6, 70, x1 - side * 4 + (R0() - 0.5) * 10, 110 + R0() * 40, 22 + R0() * 12, 0.6, H, R0, i % 4 === 0 ? [0.05, 0.25, P.sheen] : null);
      }
    } else if (P.hairStyle === 'hime') {
      g.fillStyle = H[0];
      g.beginPath(); g.moveTo(-66, -70); g.bezierCurveTo(-96, 20, -104 + sway, 160, -112 + sway, 300); g.lineTo(112 + sway, 300); g.bezierCurveTo(104 + sway, 160, 96, 20, 66, -70); g.closePath(); g.fill();
      for (let i = 0; i < 34; i++) {
        const side = i % 2 ? 1 : -1, f = R0();
        const x0 = side * (20 + f * 50), x1 = side * (78 + R0() * 40) + sway * (1 + f);
        lock(g, x0, -96 + f * 30, x0 + side * 34, -20, x1 - side * 8, 140, x1 + (R0() - 0.5) * 12, 250 + R0() * 60, 24 + R0() * 16, 1, H, R0, i % 4 === 0 ? [0.05, 0.25, P.sheen] : null);
      }
    } else {
      g.fillStyle = H[0];
      g.beginPath(); g.ellipse(0, -46, 64, 72, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-61, -34); g.quadraticCurveTo(-66, -4, -58, 14); g.lineTo(58, 14); g.quadraticCurveTo(66, -4, 61, -34); g.fill();
      for (let i = 0; i < 16; i++) { const side = i % 2 ? 1 : -1; const x0 = side * (24 + R0() * 30); lock(g, x0, -106, x0 + side * 12, -100, side * 63, -44, side * (57 + R0() * 5), -4 + R0() * 20, 22, 1, H, R0, null); }
      // tousled clumps breaking the dome silhouette
      for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.12 + 0.76 * i / 8) + (R0() - 0.5) * 0.15, r0 = 50, r1 = 74 + R0() * 14; lock(g, Math.cos(a) * r0 * 0.9, -46 + Math.sin(a) * r0, Math.cos(a) * r1 * 0.85, -46 + Math.sin(a) * r1 * 0.9, Math.cos(a + 0.15) * r1, -46 + Math.sin(a + 0.15) * r1, Math.cos(a + 0.3) * r1 * 1.02, -46 + Math.sin(a + 0.3) * (r1 + 4), 20, 0.5, H, R0, null); }
    }
    g.restore();
  }
  function drawFrontHair(g, P, R0, t, yaw, X, e) {
    const H = P.hair;
    g.save();
    g.lineCap = 'round';
    if (P.hairStyle === 'hime') {
      // crown cap
      g.fillStyle = H[0];
      g.beginPath(); g.moveTo(-66, -20); g.bezierCurveTo(-74, -100, -30, -118, X(0), -116); g.bezierCurveTo(30, -118, 74, -100, 66, -20);
      g.lineTo(X(44, 6), -24); g.lineTo(X(-44, 6), -24); g.closePath(); g.fill();
      // side locks framing the face (long, straight, slightly curling under the jaw)
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
        const x0 = sx * (38 + i * 5), xe = X(sx * (52 + i * 4), 2) + sx * i * 2;
        if (FIG) lock(g, x0, -98, X(sx * (60 + i * 3), 2), -50, xe - sx * 6, 50, xe - sx * (12 + i * 2), 84 + i * 12 + R0() * 8, 20 - i * 2, 0.6, H, R0, i === 1 ? [0.08, 0.3, P.sheen] : null);
        else lock(g, x0, -98, X(sx * (62 + i * 3), 2), -50, xe - sx * 2, 70, xe - sx * (4 + i), 150 + i * 14 + R0() * 10, 22 - i * 2, 1, H, R0, i === 1 ? [0.08, 0.3, P.sheen] : null);
      }
      // blunt hime bangs: locks from the crown ending on the fringe line
      const fringeY = -14;
      for (let i = 0; i < 22; i++) {
        const f = (i / 21) * 2 - 1;
        const tipX = X(f * 56, 8) + (R0() - 0.5) * 5, tipY = fringeY - Math.abs(f) * 8 + (R0() - 0.5) * 6;
        const rootX = X(0) * 0.6 + f * 22, rootY = -116;
        lock(g, rootX, rootY, rootX + f * 42, -104, tipX - f * 6, -60, tipX, tipY, 24, 0.6, H, R0, null);
      }
      // glossy band of light across the crown (black hair sheen)
      g.save();
      g.beginPath(); g.moveTo(-66, -20); g.bezierCurveTo(-74, -100, -30, -118, X(0), -116); g.bezierCurveTo(30, -118, 74, -100, 66, -20); g.lineTo(66, 0); g.lineTo(-66, 0); g.closePath(); g.clip();
      g.globalCompositeOperation = 'screen';
      g.strokeStyle = P.sheen; g.lineWidth = 9; g.globalAlpha = 0.22;
      g.beginPath(); g.ellipse(X(0) * 0.5, -40, 64, 58, 0, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
      g.lineWidth = 3; g.globalAlpha = 0.35;
      g.beginPath(); g.ellipse(X(0) * 0.5, -40, 64, 58, 0, Math.PI * 1.2, Math.PI * 1.45); g.stroke();
      g.restore();
      // fine flyaways
      g.strokeStyle = H[2]; g.lineWidth = 0.7; g.globalAlpha = 0.6;
      for (let i = 0; i < 14; i++) { const x = (R0() - 0.5) * 140, y = -104 + R0() * 26; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (R0() - 0.5) * 40, y - 14, x + (R0() - 0.5) * 50, y - 6); g.stroke(); }
      g.globalAlpha = 1;
    } else {
      // messy short hair (Lucien): locks radiating from the crown, a long one over his right eye
      g.fillStyle = H[0];
      g.beginPath(); g.moveTo(-64, 0); g.bezierCurveTo(-74, -96, -20, -120, X(0), -116); g.bezierCurveTo(30, -118, 76, -90, 64, 0); g.lineTo(X(40, 6), -24); g.lineTo(X(-40, 6), -24); g.closePath(); g.fill();
      const tips = [[-64, 20], [-58, -6], [-48, -22], [-36, -6], [-24, -24], [-12, -2], [0, -18], [12, 4], [22, -14], [34, 10], [44, -10], [56, 2], [64, 18], [-62, -50], [62, -54], [-30, -40], [30, -46]];
      tips.forEach(([tx, ty], i) => {
        const rx = (R0() - 0.5) * 30, ry = -118 + R0() * 6;
        const ex = X(tx, 6) + (R0() - 0.5) * 6, ey = ty + (R0() - 0.5) * 6;
        lock(g, rx, ry, rx + tx * 0.5, -100, ex - tx * 0.1 + (R0() - 0.5) * 20, (ry + ey) / 2 + 10, ex, ey, 26, 0.6, H, R0, i % 4 === 0 ? [0.15, 0.4, P.sheen, 0.16] : null);
      });
      lock(g, X(10, 8), -110, X(30, 8), -80, X(30, 8), -40, X(22, 8), 8, 18, 0.8, H, R0, [0.2, 0.5, P.sheen, 0.16]);
      // soft crown highlight instead of hard streaks
      g.save(); g.globalCompositeOperation = 'screen';
      const cr = g.createRadialGradient(X(-14, 4), -96, 4, X(-14, 4), -96, 60); cr.addColorStop(0, rgba(P.sheen, 0.22)); cr.addColorStop(1, rgba(P.sheen, 0));
      g.fillStyle = cr; g.fillRect(-80, -160, 160, 120); g.restore();
    }
    // mourning hat, lace netting and the rose
    if (P.veil) {
      g.globalAlpha = 1;
      g.fillStyle = '#0a0810';
      g.save(); g.translate(X(24, 4), -98); g.rotate(0.32);
      g.beginPath(); g.ellipse(0, 0, 46, 13, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(0, -8, 26, 14, 0, Math.PI, 0); g.fill();
      g.strokeStyle = 'rgba(120,100,150,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, 46, 13, 0, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
      g.restore();
      // netting over one eye
      g.save();
      g.beginPath(); g.moveTo(X(-6, 6), -96); g.quadraticCurveTo(X(70, 4), -100, X(64, 4), 14); g.quadraticCurveTo(X(26, 6), 26, X(-6, 8), 8); g.closePath(); g.clip();
      g.strokeStyle = 'rgba(8,6,12,0.45)'; g.lineWidth = 0.7;
      for (let k = -20; k <= 20; k++) { g.beginPath(); g.moveTo(-40 + k * 7, -110); g.lineTo(60 + k * 7, 40); g.stroke(); g.beginPath(); g.moveTo(80 + k * 7, -110); g.lineTo(-20 + k * 7, 40); g.stroke(); }
      g.restore();
    }
    if (P.rose) NM.paintRose(g, X(48, 4), -102, 15, 0.3, t);
    g.restore();
  }

  // painted rose (used on her headpiece, in CGs, on graves)
  NM.paintRose = function (g, x, y, r, rot = 0, t = 0, opt = {}) {
    const wither = opt.wither || 0;
    const C1 = opt.deep || '#4a0410', C2 = opt.mid || '#a3122a', C3 = opt.light || '#e8405a';
    g.save(); g.translate(x, y); g.rotate(rot);
    radial(g, 0, 0, r * 1.4, r * 1.2, '#000000', 0.5, 'multiply');
    // outer petals
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.4;
      g.save(); g.rotate(a);
      const pg = g.createRadialGradient(0, -r * 0.5, 0, 0, -r * 0.5, r * 1.1);
      pg.addColorStop(0, C3); pg.addColorStop(0.5, C2); pg.addColorStop(1, C1);
      g.fillStyle = pg;
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-r * 0.8, -r * 0.2, -r * 0.7, -r * 1.15 + wither * r * 0.3, 0, -r * 1.05 + wither * r * 0.4); g.bezierCurveTo(r * 0.7, -r * 1.15 + wither * r * 0.3, r * 0.8, -r * 0.2, 0, 0); g.fill();
      g.restore();
    }
    // inner spiral
    for (let i = 0; i < 7; i++) {
      const rr = r * (0.72 - i * 0.09);
      g.save(); g.rotate(i * 2.3);
      g.strokeStyle = C1; g.lineWidth = Math.max(1, r * 0.11);
      g.beginPath(); g.arc(0, 0, rr, Math.PI * 1.0, Math.PI * 1.85); g.stroke();
      g.strokeStyle = C3; g.globalAlpha = 0.6; g.lineWidth = Math.max(0.6, r * 0.05);
      g.beginPath(); g.arc(0, -r * 0.03, rr * 0.96, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
      g.globalAlpha = 1;
      g.restore();
    }
    radial(g, -r * 0.25, -r * 0.35, r * 0.4, r * 0.3, '#ffd0d8', 0.35, 'screen');
    if (wither > 0) radial(g, 0, 0, r * 1.2, r * 1.2, '#1a0a08', wither * 0.8, 'multiply');
    g.restore();
  };

  // ---------- body (bust) ----------
  function drawBody(g, P, t, yaw, light, o) {
    g.save();
    if (P.collar === 'lace') {
      // black velvet bodice with high lace collar and cameo
      const bg = g.createLinearGradient(-160, 0, 160, 0);
      bg.addColorStop(0, '#0c0a12'); bg.addColorStop(0.5, '#1c1626'); bg.addColorStop(1, '#0a0810');
      g.fillStyle = bg;
      g.beginPath(); g.moveTo(-34, 100); g.bezierCurveTo(-100, 110, -160, 140, -180, 260); g.lineTo(180, 260); g.bezierCurveTo(160, 140, 100, 110, 34, 100); g.closePath(); g.fill();
      // velvet sheen on the shoulders
      radial(g, -110, 150, 50, 22, '#5a4a7a', 0.25, 'screen');
      radial(g, 110, 150, 50, 22, '#5a4a7a', 0.18, 'screen');
      // lace collar
      // high lace collar wrapping the throat
      const lc = new Path2D();
      lc.moveTo(-34, 74); lc.quadraticCurveTo(0, 86, 34, 74); lc.lineTo(40, 112);
      for (let k = 12; k >= 0; k--) lc.quadraticCurveTo(-40 + k * 6.7 + 3.3, 126, -40 + k * 6.7, 114);
      lc.closePath();
      g.fillStyle = 'rgba(226,216,232,0.95)'; g.fill(lc);
      g.save(); g.clip(lc);
      radial(g, 0, 80, 46, 14, '#3a2a4a', 0.6, 'multiply');
      radial(g, -24, 100, 20, 30, '#5a4a6a', 0.35, 'multiply');
      g.strokeStyle = 'rgba(70,56,86,0.55)'; g.lineWidth = 0.8;
      for (let k = 0; k < 11; k++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(-34 + k * 7, 88 + j * 9 + (k % 2) * 4, 2.2, 0, TAU); g.stroke(); }
      g.restore();
      // cameo
      g.fillStyle = '#c8a060'; g.beginPath(); g.ellipse(0, 128, 13, 16, 0, 0, TAU); g.fill();
      const cg = g.createRadialGradient(-3, 123, 1, 0, 128, 12); cg.addColorStop(0, '#ff6a7e'); cg.addColorStop(0.5, '#b0102a'); cg.addColorStop(1, '#4a0410');
      g.fillStyle = cg; g.beginPath(); g.ellipse(0, 128, 10, 13, 0, 0, TAU); g.fill();
      if (o.locket) { NM.glow(g, 0, 128, 40, '#bfe9ff', 0.7 * o.locket); }
    } else {
      // tailcoat, shirt, cravat
      const bg = g.createLinearGradient(-160, 0, 160, 0);
      bg.addColorStop(0, '#0e0d14'); bg.addColorStop(0.5, '#1e1c28'); bg.addColorStop(1, '#0c0b10');
      g.fillStyle = bg;
      g.beginPath(); g.moveTo(-36, 96); g.bezierCurveTo(-110, 104, -170, 140, -190, 260); g.lineTo(190, 260); g.bezierCurveTo(170, 140, 110, 104, 36, 96); g.closePath(); g.fill();
      g.fillStyle = '#d8dce4';
      g.beginPath(); g.moveTo(-32, 84); g.lineTo(-48, 124); g.lineTo(0, 220); g.lineTo(48, 124); g.lineTo(32, 84); g.quadraticCurveTo(0, 96, -32, 84); g.closePath(); g.fill();
      radial(g, 0, 110, 40, 30, '#5a6070', 0.5, 'multiply');
      g.fillStyle = '#0a090e'; g.beginPath(); g.moveTo(-18, 102); g.lineTo(0, 150); g.lineTo(18, 102); g.lineTo(0, 112); g.closePath(); g.fill();
      g.fillStyle = '#1a1822';
      g.beginPath(); g.moveTo(-44, 120); g.lineTo(-70, 104); g.lineTo(-16, 240); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(44, 120); g.lineTo(70, 104); g.lineTo(16, 240); g.closePath(); g.fill();
      if (P.stitches) {
        // the crimson binding mark at his throat
        g.strokeStyle = 'rgba(255,40,70,0.9)'; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(-24, 76); g.quadraticCurveTo(0, 88, 24, 76); g.stroke();
        NM.glow(g, 0, 82, 30, '#ff2040', 0.45 + 0.15 * Math.sin((t || 0) * 3));
      }
    }
    g.restore();
  }

  // ---------- public ----------
  function blinkLid(e, t, phase, period) { const bp = ((t || 0) + phase) % period; if (bp < 0.13) e.lid = Math.max(e.lid, 0.97); }
  NM.paintIsolde = function (g, cx, cy, s, expr = 'cold', t = 0, o = {}) {
    const e = Object.assign({}, EX[expr] || EX.cold, o.e || {});
    if (!o.noBlink) blinkLid(e, t, 1.7, 4.3);
    const P = o.P ? Object.assign({}, ISOLDE, o.P) : ISOLDE;
    return portrait(g, cx, cy, s, P, e, t, Object.assign({ light: -0.6, rim: '#ff4a6a', seed: 7 }, o));
  };
  NM.paintLucien = function (g, cx, cy, s, expr = 'hollow', t = 0, o = {}) {
    const e = Object.assign({}, EX[expr] || EX.hollow, o.e || {});
    if (!o.noBlink) blinkLid(e, t, 0.4, 5.3);
    const base = o.alive || expr === 'alive' ? LUCIEN_ALIVE : LUCIEN;
    const P = o.P ? Object.assign({}, base, o.P) : base;
    return portrait(g, cx, cy, s, P, e, t, Object.assign({ light: 0.6, rim: '#9fc8ff', seed: 13 }, o));
  };
})();
