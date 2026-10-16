// Necromantical — anime-style portraits (drawn as vectors, then palette-quantized to pixels).
// Isolde: the widow-necromancer. Lucien: her husband, raised and bound.
'use strict';
(function () {
  const { clamp, lerp, TAU, noise1 } = NM;

  // Expression presets: lid (0 open .. 1 closed), brow (-1 angry .. +1 sad), mouth type,
  // pupil size, glow, blush, shadow over eyes, tear
  const EX = {
    cold: { lid: 0.32, brow: -0.15, mouth: 'flat', pupil: 1, glow: 0.2 },
    smirk: { lid: 0.38, brow: -0.35, mouth: 'smirk', pupil: 1, glow: 0.35, blush: 0.2 },
    smile: { lid: 0.2, brow: 0.1, mouth: 'smile', pupil: 1, glow: 0.2, blush: 0.4 },
    tender: { lid: 0.42, brow: 0.35, mouth: 'soft', pupil: 1.05, glow: 0.1, blush: 0.75 },
    sad: { lid: 0.3, brow: 0.9, mouth: 'sad', pupil: 1.1, glow: 0, tear: 1, wet: 1 },
    crazed: { lid: -0.05, brow: -0.6, mouth: 'grin', pupil: 0.35, glow: 1, shadow: 0.8, blush: 0.6 },
    hungry: { lid: 0.48, brow: -0.2, mouth: 'open', pupil: 0.8, glow: 0.8, blush: 0.9, shadow: 0.3 },
    shock: { lid: -0.12, brow: 0.6, mouth: 'o', pupil: 0.45, glow: 0, shadow: 0 },
    closed: { lid: 1, brow: 0.2, mouth: 'soft', pupil: 1, glow: 0, blush: 0.5 },
    // Lucien
    hollow: { lid: 0.35, brow: 0.5, mouth: 'flat', pupil: 0.5, glow: 0 },
    plead: { lid: 0.15, brow: 1, mouth: 'sad', pupil: 0.7, glow: 0, tear: 1, wet: 1 },
    pain: { lid: 0.55, brow: 1, mouth: 'open', pupil: 0.6, glow: 0 },
    alive: { lid: 0.15, brow: 0.2, mouth: 'smile', pupil: 1, glow: 0, blush: 0.5 },
    sleep: { lid: 1, brow: 0.3, mouth: 'flat', pupil: 1, glow: 0 },
  };
  NM.EX = EX;

  // generic anime head. P = palette/style, e = expression, turn -1..1 (3/4 view), t = time
  function head(g, cx, cy, s, P, e, turn, t) {
    const u = s / 100;
    const at = Math.abs(turn);
    const fx = (x, depth = 1) => x * (x * turn < 0 ? 1 - 0.42 * at : 1 + 0.08 * at) + turn * 9 * depth;
    g.save();
    g.translate(cx, cy);
    g.scale(u, u);
    g.lineJoin = 'round'; g.lineCap = 'round';

    // --- back hair (behind everything) ---
    if (P.backHair) P.backHair(g, P, turn, t);

    // --- neck & shoulders ---
    g.fillStyle = P.skinShade;
    g.beginPath(); g.moveTo(fx(-8, 0.3), 26); g.lineTo(fx(-9, 0.3), 52); g.lineTo(fx(9, 0.3), 52); g.lineTo(fx(8, 0.3), 26); g.fill();
    if (P.body) P.body(g, P, turn, t);

    // --- face shape ---
    const face = new Path2D();
    face.moveTo(fx(-34, 0.3), -16);
    face.bezierCurveTo(fx(-35, 0.3), 2, fx(-31, 0.4), 14, fx(-22, 0.6), 25);
    face.quadraticCurveTo(fx(-10, 0.8), 34, fx(0, 1), 37);
    face.quadraticCurveTo(fx(10, 0.8), 34, fx(22, 0.6), 25);
    face.bezierCurveTo(fx(31, 0.4), 14, fx(35, 0.3), 2, fx(34, 0.3), -16);
    face.quadraticCurveTo(0, -46, fx(-34, 0.3), -16);
    g.fillStyle = P.skin; g.fill(face);
    // soft shading on far cheek and under hair
    g.save(); g.clip(face);
    const sh = g.createLinearGradient(fx(-36), 0, fx(36), 0);
    const far = turn >= 0 ? 0 : 1;
    sh.addColorStop(far, P.skinShade); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1 - far, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.globalAlpha = 0.55; g.fillRect(-50, -50, 100, 100);
    g.globalAlpha = 0.6; g.fillStyle = P.skinShade; g.fillRect(-50, -20, 100, 10);
    g.globalAlpha = 1;
    if (P.faceMarks) P.faceMarks(g, P, fx, turn, t);
    g.restore();
    g.strokeStyle = P.line; g.lineWidth = 1.6; g.stroke(face);

    // --- blush ---
    if (e.blush) {
      g.save(); g.globalAlpha = 0.55 * e.blush;
      g.fillStyle = P.blush;
      for (const sx of [-1, 1]) {
        g.beginPath(); g.ellipse(fx(sx * 19), 13, 7 * (sx * turn < 0 ? 0.6 : 1), 3.2, 0, 0, TAU); g.fill();
      }
      g.globalAlpha = 0.9 * e.blush; g.strokeStyle = P.blushLine || '#ff6a7e'; g.lineWidth = 1;
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
        const x0 = fx(sx * 19) - 4 + k * 3.2;
        g.beginPath(); g.moveTo(x0 + 1.5, 10.5); g.lineTo(x0 - 0.5, 15); g.stroke();
      }
      g.restore();
    }

    // --- eyes ---
    const lid = e.lid;
    for (const sx of [-1, 1]) {
      const farSide = sx * turn < 0;
      const ew = 17 * (farSide ? 1 - 0.38 * at : 1 + 0.05 * at), eh = 19;
      const ex = fx(sx * 15), ey = 0;
      g.save();
      // eye opening shape (sclera)
      const top = ey - eh * 0.55 + eh * 0.9 * clamp(lid, -0.3, 1);
      const eye = new Path2D();
      eye.moveTo(ex - ew / 2, ey + 1);
      eye.quadraticCurveTo(ex - ew * 0.45, top, ex + sx * ew * 0.1, top);
      eye.quadraticCurveTo(ex + ew * 0.5, top + 1, ex + ew / 2, ey - 1 + (lid > 0.8 ? 6 : 0));
      eye.quadraticCurveTo(ex + ew * 0.3, ey + eh * 0.46, ex, ey + eh * 0.48);
      eye.quadraticCurveTo(ex - ew * 0.35, ey + eh * 0.45, ex - ew / 2, ey + 1);
      if (lid < 0.92) {
        g.fillStyle = P.sclera; g.fill(eye);
        g.clip(eye);
        // iris
        const look = e.look || P.look || [0, 0];
        const ix = ex + look[0] * ew * 0.18, iy = ey + 2 + look[1] * 2;
        const irx = ew * 0.36, iry = eh * 0.43;
        const ig = g.createLinearGradient(0, iy - iry, 0, iy + iry);
        ig.addColorStop(0, P.iris[0]); ig.addColorStop(0.55, P.iris[1]); ig.addColorStop(1, P.iris[2]);
        g.fillStyle = ig;
        g.beginPath(); g.ellipse(ix, iy, irx, iry, 0, 0, TAU); g.fill();
        g.strokeStyle = P.iris[0]; g.lineWidth = 1.2; g.stroke();
        // pupil
        g.fillStyle = P.pupil;
        g.beginPath(); g.ellipse(ix, iy + 0.5, irx * 0.42 * e.pupil, iry * 0.48 * e.pupil, 0, 0, TAU); g.fill();
        // shadow from upper lid
        g.fillStyle = 'rgba(20,10,30,0.45)'; g.fillRect(ex - ew, top - 2, ew * 2, 4.5);
        // highlights
        if (!e.dead) {
          g.fillStyle = '#ffffff';
          g.beginPath(); g.ellipse(ix - irx * 0.35, iy - iry * 0.42, 2.6, 3.2, -0.3, 0, TAU); g.fill();
          g.beginPath(); g.arc(ix + irx * 0.4, iy + iry * 0.45, 1.3, 0, TAU); g.fill();
          if (e.wet) { g.globalAlpha = 0.8; g.beginPath(); g.arc(ix + irx * 0.1, iy + iry * 0.2, 1.4, 0, TAU); g.fill(); g.globalAlpha = 1; }
        }
      }
      g.restore();
      // lash lines
      g.strokeStyle = P.lash; g.lineCap = 'round';
      if (lid >= 0.92) {
        g.lineWidth = 2.6;
        g.beginPath(); g.moveTo(ex - ew / 2, ey + 2); g.quadraticCurveTo(ex, ey + 7, ex + ew / 2, ey + 2); g.stroke();
      } else {
        g.lineWidth = 3.4;
        g.beginPath(); g.moveTo(ex - ew / 2 - 0.5, ey + 1.5);
        g.quadraticCurveTo(ex - ew * 0.45, top, ex + sx * ew * 0.1, top);
        g.quadraticCurveTo(ex + ew * 0.5, top + 1, ex + ew / 2 + 1, ey - 1);
        g.stroke();
        // outer flick
        const ox = sx > 0 ? ex + ew / 2 : ex - ew / 2;
        g.beginPath(); g.moveTo(ox, ey - 1 + (sx > 0 ? 0 : 2)); g.lineTo(ox + sx * 3.5, ey - 3.5); g.stroke();
        g.lineWidth = 1.1;
        g.beginPath(); g.moveTo(ex - ew * 0.3, ey + eh * 0.43); g.quadraticCurveTo(ex, ey + eh * 0.52, ex + ew * 0.32, ey + eh * 0.42); g.stroke();
        if (P.underEye) { g.strokeStyle = P.underEye; g.lineWidth = 1.6; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(ex - ew * 0.35, ey + eh * 0.62); g.quadraticCurveTo(ex, ey + eh * 0.72, ex + ew * 0.35, ey + eh * 0.6); g.stroke(); g.globalAlpha = 1; }
      }
      // brow
      g.strokeStyle = P.brow || P.lash; g.lineWidth = 1.6;
      const bInner = -15 - e.brow * 3.5 + 2, bOuter = -16 + e.brow * 3;
      g.beginPath(); g.moveTo(fx(sx * 7), bInner); g.quadraticCurveTo(fx(sx * 14), -18 - Math.abs(e.brow), fx(sx * 22), bOuter); g.stroke();
      // tears
      if (e.tear) {
        const tk = (t * 0.6 + (sx > 0 ? 0.4 : 0)) % 1;
        g.fillStyle = P.tear || 'rgba(185,230,255,0.9)';
        g.beginPath(); g.ellipse(ex + sx * 3, ey + eh * 0.55 + tk * 18, 1.6, 2.6, 0, 0, TAU); g.fill();
        g.globalAlpha = 0.5; g.fillRect(ex + sx * 3 - 0.8, ey + eh * 0.5, 1.6, tk * 18); g.globalAlpha = 1;
      }
      if (e.bloodTear) {
        g.fillStyle = '#c4122f';
        const len = 6 + e.bloodTear * 22;
        g.fillRect(ex + sx * 2 - 1, ey + eh * 0.45, 2.2, len);
        g.beginPath(); g.arc(ex + sx * 2 + 0.1, ey + eh * 0.45 + len, 1.8, 0, TAU); g.fill();
      }
    }
    // --- nose ---
    g.strokeStyle = P.noseLine || P.skinLine; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(fx(1.5), 12); g.lineTo(fx(0.2), 15); g.stroke();

    // --- mouth ---
    const mx = fx(0), my = 25;
    g.strokeStyle = P.mouthLine; g.fillStyle = P.mouthIn; g.lineWidth = 1.4;
    switch (e.mouth) {
      case 'smirk':
        g.beginPath(); g.moveTo(mx - 5, my); g.quadraticCurveTo(mx + 1, my + 1.5, mx + 6, my - 2.5); g.stroke(); break;
      case 'smile':
        g.beginPath(); g.moveTo(mx - 5, my - 1); g.quadraticCurveTo(mx, my + 3.5, mx + 5, my - 1); g.stroke(); break;
      case 'soft':
        g.beginPath(); g.moveTo(mx - 3.5, my); g.quadraticCurveTo(mx, my + 1.6, mx + 3.5, my); g.stroke(); break;
      case 'sad':
        g.beginPath(); g.moveTo(mx - 4, my + 1.5); g.quadraticCurveTo(mx, my - 1.5, mx + 4, my + 1.5); g.stroke(); break;
      case 'grin': {
        g.beginPath(); g.moveTo(mx - 9, my - 3); g.quadraticCurveTo(mx, my + 9, mx + 9, my - 3); g.quadraticCurveTo(mx, my + 1, mx - 9, my - 3); g.fill(); g.stroke();
        g.fillStyle = '#f2f0ea'; g.beginPath(); g.moveTo(mx - 7, my - 1.6); g.quadraticCurveTo(mx, my + 2.2, mx + 7, my - 1.6); g.quadraticCurveTo(mx, my + 0.6, mx - 7, my - 1.6); g.fill();
        break;
      }
      case 'open':
        g.beginPath(); g.ellipse(mx, my + 1, 3.2, 2.8, 0, 0, TAU); g.fill(); g.stroke();
        if (P.tongue) { g.fillStyle = P.tongue; g.beginPath(); g.ellipse(mx + 0.5, my + 2.4, 2, 1.2, 0, 0, TAU); g.fill(); }
        break;
      case 'o':
        g.beginPath(); g.ellipse(mx, my + 1, 2.4, 3.2, 0, 0, TAU); g.fill(); g.stroke(); break;
      default:
        g.beginPath(); g.moveTo(mx - 3.5, my); g.lineTo(mx + 3.5, my); g.stroke();
    }
    if (P.lips && e.mouth !== 'grin') { g.fillStyle = P.lips; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(mx, my + 2.2, 2.6, 1.1, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }

    // --- front hair (bangs, side locks) ---
    if (P.frontHair) P.frontHair(g, P, fx, turn, t, e);

    // --- yandere shadow over the eyes ---
    if (e.shadow) {
      g.save(); g.clip(face);
      const sg = g.createLinearGradient(0, -30, 0, 8);
      sg.addColorStop(0, `rgba(20,4,16,${0.85 * e.shadow})`); sg.addColorStop(1, 'rgba(20,4,16,0)');
      g.fillStyle = sg; g.fillRect(-50, -40, 100, 48);
      g.restore();
    }
    g.restore();
    // glowing eyes (drawn unscaled so the glow sprite is sized in pixels)
    if (e.glow > 0.05 && P.eyeGlow) {
      for (const sx of [-1, 1]) {
        const ex = cx + fx(sx * 15) * u, ey = cy + 2 * u;
        NM.glow(g, ex, ey, 14 * u * (0.8 + e.glow), P.eyeGlow, 0.45 * e.glow * (0.85 + 0.15 * Math.sin(t * 6)));
      }
    }
  }
  NM.animeHead = head;

  // ---------- Isolde ----------
  const ISOLDE = {
    skin: '#f6d6c8', skinShade: '#e3b3a8', skinLine: '#b77f7a', line: '#8a5a5e', blush: '#ff8a9a',
    sclera: '#fff6f2', iris: ['#3a0a14', '#c4122f', '#ff5a6e'], pupil: '#1a0408', lash: '#141022', brow: '#221c36',
    mouthLine: '#7a0e22', mouthIn: '#5a0a18', lips: '#c4122f', tongue: '#ff8a9a', eyeGlow: '#ff2040',
    hair: '#141022', hairMid: '#221c36', hairHi: '#4c4570', hairSheen: '#8a7fb0',
    backHair(g, P, turn, t) {
      const sway = Math.sin(t * 1.3) * 1.5;
      // veil (dark translucent) behind the hair
      g.fillStyle = 'rgba(30,22,48,0.85)';
      g.beginPath(); g.moveTo(-44, -40); g.quadraticCurveTo(-70, 30, -64 + sway, 130); g.lineTo(64 + sway, 130); g.quadraticCurveTo(70, 30, 44, -40); g.closePath(); g.fill();
      // long straight hair
      g.fillStyle = P.hair;
      g.beginPath();
      g.moveTo(-40, -20); g.quadraticCurveTo(-48, 40, -46 + sway, 120);
      for (let k = 0; k <= 8; k++) g.lineTo(-46 + sway + k * 11.5, 120 + (k % 2 ? 6 : 0));
      g.quadraticCurveTo(48, 40, 40, -20); g.closePath(); g.fill();
    },
    body(g, P, turn, t) {
      // black mourning dress, high lace collar, crimson cameo
      g.fillStyle = '#1a1424';
      g.beginPath(); g.moveTo(-14, 40); g.quadraticCurveTo(-46, 46, -58, 70); g.lineTo(-62, 130); g.lineTo(62, 130); g.lineTo(58, 70); g.quadraticCurveTo(46, 46, 14, 40); g.closePath(); g.fill();
      g.fillStyle = '#2c2440';
      g.beginPath(); g.moveTo(-6, 52); g.lineTo(0, 130); g.lineTo(6, 52); g.fill();
      // lace collar
      g.fillStyle = '#e8e2ec';
      g.beginPath(); g.moveTo(-12, 30);
      for (let k = 0; k <= 8; k++) g.lineTo(-12 + k * 3, 46 + (k % 2 ? 3 : 0));
      g.lineTo(12, 30); g.closePath(); g.fill();
      g.fillStyle = '#9a8fa8'; g.fillRect(-12, 30, 24, 2);
      // cameo
      g.fillStyle = '#7a0e22'; g.beginPath(); g.ellipse(0, 50, 5, 6, 0, 0, TAU); g.fill();
      g.fillStyle = '#e0203c'; g.beginPath(); g.ellipse(0, 49.5, 3.4, 4.2, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffd0d6'; g.fillRect(-1.2, 47, 1.6, 1.6);
    },
    frontHair(g, P, fx, turn, t, e) {
      // hime-cut bangs
      g.fillStyle = P.hair;
      g.beginPath();
      g.moveTo(fx(-40, 0.3), -14);
      g.quadraticCurveTo(fx(-42, 0.3), -50, fx(0, 0.5), -54);
      g.quadraticCurveTo(fx(42, 0.3), -50, fx(40, 0.3), -14);
      // jagged blunt fringe across the brow
      const pts = [36, 30, 24, 18, 12, 6, 0, -6, -12, -18, -24, -30, -36];
      pts.forEach((x, k) => g.lineTo(fx(x, 0.8), (k % 2 ? -11 : -5) + (Math.abs(x) > 30 ? -4 : 0)));
      g.closePath(); g.fill();
      // side locks (long, straight, framing the face)
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(fx(sx * 30, 0.4), -12);
        g.quadraticCurveTo(fx(sx * 38, 0.4), 20, fx(sx * 36, 0.4), 62);
        g.lineTo(fx(sx * 31, 0.4), 70); g.lineTo(fx(sx * 28, 0.4), 60);
        g.quadraticCurveTo(fx(sx * 30, 0.4), 20, fx(sx * 25, 0.4), -10);
        g.closePath(); g.fill();
      }
      // sheen ("angel ring")
      g.strokeStyle = P.hairHi; g.lineWidth = 2.4;
      g.beginPath(); g.arc(fx(0, 0.5), -6, 34, Math.PI * 1.15, Math.PI * 1.32); g.stroke();
      g.beginPath(); g.arc(fx(0, 0.5), -6, 34, Math.PI * 1.55, Math.PI * 1.8); g.stroke();
      g.strokeStyle = P.hairSheen; g.lineWidth = 1;
      g.beginPath(); g.arc(fx(0, 0.5), -6, 35, Math.PI * 1.6, Math.PI * 1.72); g.stroke();
      g.strokeStyle = P.hairMid; g.lineWidth = 1;
      for (const x of [-20, -8, 4, 16, 28]) { g.beginPath(); g.moveTo(fx(x, 0.6), -40); g.lineTo(fx(x + 1, 0.8), -12); g.stroke(); }
      // mourning headpiece with crimson rose
      g.fillStyle = '#0b0910';
      g.beginPath(); g.ellipse(fx(16, 0.4), -46, 17, 6, 0.35, 0, TAU); g.fill();
      g.save(); g.translate(fx(24, 0.4), -46); g.rotate(0.3);
      NM.miniRose(g, 0, 0, 7.5);
      g.restore();
      // black netting veil over one eye
      g.strokeStyle = 'rgba(10,8,16,0.55)'; g.lineWidth = 0.6;
      for (let k = -6; k <= 6; k++) {
        g.beginPath(); g.moveTo(fx(6 + k * 3, 0.8), -44); g.lineTo(fx(18 + k * 3, 0.8), 8); g.stroke();
        g.beginPath(); g.moveTo(fx(30 + k * 3, 0.8), -44); g.lineTo(fx(18 + k * 3, 0.8), 8); g.stroke();
      }
    },
  };

  // tiny rose for headpieces / icons
  NM.miniRose = function (g, x, y, r) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#7a0e22'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = '#c4122f';
    for (let k = 0; k < 5; k++) { const a = k * 1.26; g.beginPath(); g.ellipse(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.55, r * 0.38, a, 0, TAU); g.fill(); }
    g.strokeStyle = '#3a0a14'; g.lineWidth = Math.max(0.8, r * 0.14);
    g.beginPath(); g.arc(0, 0, r * 0.55, 0.3, 4.8); g.stroke();
    g.beginPath(); g.arc(r * 0.1, 0, r * 0.25, 2, 7); g.stroke();
    g.fillStyle = '#ff5a6e'; g.beginPath(); g.arc(-r * 0.35, -r * 0.35, r * 0.18, 0, TAU); g.fill();
    g.restore();
  };

  // ---------- Lucien (undead) ----------
  const LUCIEN = {
    skin: '#dfe4ea', skinShade: '#a3abbd', skinLine: '#7f879c', line: '#5c6278', blush: '#7f879c',
    sclera: '#e8eef2', iris: ['#3a3f52', '#7fc4e6', '#b9e6ff'], pupil: '#141022', lash: '#141022', brow: '#2c2030',
    mouthLine: '#3a3f52', mouthIn: '#141022', underEye: '#7f879c', eyeGlow: '#b9e6ff',
    hair: '#2c2030', hairMid: '#3a3040', hairHi: '#5a4a5a',
    backHair(g, P) {
      g.fillStyle = P.hair;
      g.beginPath(); g.moveTo(-38, -20); g.quadraticCurveTo(-42, 10, -34, 26); g.lineTo(34, 26); g.quadraticCurveTo(42, 10, 38, -20); g.closePath(); g.fill();
    },
    body(g, P) {
      // dark tailcoat, torn collar, white shirt, black cravat, crimson binding sigil at the throat
      g.fillStyle = '#1c1a26';
      g.beginPath(); g.moveTo(-14, 38); g.quadraticCurveTo(-50, 44, -64, 70); g.lineTo(-66, 130); g.lineTo(66, 130); g.lineTo(64, 70); g.quadraticCurveTo(50, 44, 14, 38); g.closePath(); g.fill();
      g.fillStyle = '#e6e8ee';
      g.beginPath(); g.moveTo(-12, 34); g.lineTo(-20, 52); g.lineTo(0, 76); g.lineTo(20, 52); g.lineTo(12, 34); g.closePath(); g.fill();
      g.fillStyle = '#0b0910';
      g.beginPath(); g.moveTo(-8, 44); g.lineTo(0, 60); g.lineTo(8, 44); g.lineTo(0, 48); g.closePath(); g.fill();
      // lapels
      g.fillStyle = '#2a2638';
      g.beginPath(); g.moveTo(-20, 52); g.lineTo(-30, 46); g.lineTo(-8, 92); g.fill();
      g.beginPath(); g.moveTo(20, 52); g.lineTo(30, 46); g.lineTo(8, 92); g.fill();
      // binding collar of crimson chain-light
      g.strokeStyle = '#c4122f'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-9, 31); g.quadraticCurveTo(0, 36, 9, 31); g.stroke();
      g.fillStyle = '#ff3a52'; for (let k = -2; k <= 2; k++) g.fillRect(k * 3.6 - 0.8, 32.5 + (Math.abs(k) < 2 ? 1 : 0), 1.6, 1.6);
    },
    faceMarks(g, P, fx) {
      // sunken cheek shadow + stitches
      g.fillStyle = 'rgba(80,88,110,0.35)';
      g.beginPath(); g.ellipse(fx(-22), 16, 6, 9, 0.2, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(fx(22), 16, 6, 9, -0.2, 0, TAU); g.fill();
      g.strokeStyle = '#5c3a4a'; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(fx(14), 12); g.lineTo(fx(28), 20); g.stroke();
      for (let k = 0; k < 5; k++) { const x = lerp(fx(14), fx(28), k / 4), y = lerp(12, 20, k / 4); g.beginPath(); g.moveTo(x - 1.5, y - 2.5); g.lineTo(x + 1.5, y + 2.5); g.stroke(); }
    },
    frontHair(g, P, fx, turn, t) {
      g.fillStyle = P.hair;
      g.beginPath();
      g.moveTo(fx(-38, 0.3), -8);
      g.quadraticCurveTo(fx(-44, 0.3), -52, fx(2, 0.5), -56);
      g.quadraticCurveTo(fx(44, 0.3), -50, fx(38, 0.3), -8);
      // messy fringe, longer over his right eye
      const xs = [34, 28, 22, 16, 10, 4, -2, -8, -14, -20, -26, -32, -38];
      const ys = [-2, -14, 2, -10, 8, -8, -2, -14, -4, -16, -8, -18, -6];
      xs.forEach((x, k) => g.lineTo(fx(x, 0.8), ys[k]));
      g.closePath(); g.fill();
      g.strokeStyle = P.hairHi; g.lineWidth = 1.6;
      g.beginPath(); g.arc(fx(0, 0.5), -8, 34, Math.PI * 1.25, Math.PI * 1.45); g.stroke();
      g.beginPath(); g.arc(fx(0, 0.5), -8, 34, Math.PI * 1.6, Math.PI * 1.75); g.stroke();
    },
  };
  // Lucien alive (flashback): warm skin, neat hair, no stitches
  const LUCIEN_ALIVE = Object.assign({}, LUCIEN, {
    skin: '#f6d6c8', skinShade: '#e3b3a8', skinLine: '#b77f7a', line: '#8a5a5e', blush: '#ff8a9a',
    iris: ['#2a1a10', '#6e5640', '#a98652'], underEye: null, faceMarks: null,
    hair: '#3a2a22', hairHi: '#83603f',
    body(g, P) { LUCIEN.body(g, P); g.fillStyle = '#e6e8ee'; g.fillRect(-9, 29, 18, 6); },
  });

  NM.isoldeFace = function (g, cx, cy, s, expr = 'cold', t = 0, turn = 0, over = {}) {
    const e = Object.assign({}, EX[expr] || EX.cold, over);
    const P = over.P ? Object.assign({}, ISOLDE, over.P) : ISOLDE;
    // natural blink every few seconds
    if (!over.noBlink) { const bp = (t + 1.7) % 4.1; if (bp < 0.12) e.lid = Math.max(e.lid, 0.95); }
    head(g, cx, cy, s, P, e, turn, t);
  };
  NM.lucienFace = function (g, cx, cy, s, expr = 'hollow', t = 0, turn = 0, over = {}) {
    const e = Object.assign({}, EX[expr] || EX.hollow, over);
    const base = expr === 'alive' || over.alive ? LUCIEN_ALIVE : LUCIEN;
    const P = over.P ? Object.assign({}, base, over.P) : base;
    if (!over.noBlink) { const bp = (t + 0.4) % 5.3; if (bp < 0.14) e.lid = Math.max(e.lid, 0.95); }
    head(g, cx, cy, s, P, e, turn, t);
  };
  NM.ISOLDE = ISOLDE; NM.LUCIEN = LUCIEN; NM.LUCIEN_ALIVE = LUCIEN_ALIVE;
})();
