// Necromantical — painted close-up hands and forearms (living, gloved, corpse, skeletal).
// Local space: wrist at the origin, fingers pointing along +x, the back of the hand facing
// the viewer, thumb on the -y side. s = wrist-to-fingertip length in px.
'use strict';
(function () {
  const { clamp, lerp, TAU, rgba } = NM;

  const KIND = {
    skin: { dark: '#7a4e48', base: '#d9ab98', light: '#f6dccd', hi: '#fff3ea', nail: '#e8b8b0', crease: 'rgba(120,60,56,0.5)' },
    glove: { dark: '#050408', base: '#16111e', light: '#3a3048', hi: '#8a78a8', nail: null, crease: 'rgba(0,0,0,0.6)' },
    corpse: { dark: '#3a3e4e', base: '#8e94a4', light: '#c4c9d4', hi: '#eef0f4', nail: '#3a3040', crease: 'rgba(40,30,50,0.7)' },
    bone: { dark: '#6a5e50', base: '#cfc4b0', light: '#ece4d4', hi: '#fffaf0', nail: null, crease: 'rgba(60,50,40,0.6)' },
    ghost: { dark: '#5a7a9a', base: '#a8d4f0', light: '#d8f0ff', hi: '#ffffff', nail: '#c8e8ff', crease: 'rgba(60,100,140,0.4)' },
  };
  // index, middle, ring, little: base position on the knuckle line, length, width
  const FING = [[42, -14, 40, 9.6], [44, -4.6, 45, 10], [42.5, 4.8, 42, 9.4], [38.5, 13.6, 33, 8.2]];

  // a shaded cylindrical segment from (x0,y0) to (x1,y1)
  function seg(g, x0, y0, x1, y1, w0, w1, K, light) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const sgn = -light;
    const quad = (wa, wb, off, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x0 + nx * (wa / 2 + off * wa), y0 + ny * (wa / 2 + off * wa));
      g.lineTo(x1 + nx * (wb / 2 + off * wb), y1 + ny * (wb / 2 + off * wb));
      g.arc(x1 + nx * off * wb, y1 + ny * off * wb, wb / 2, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true);
      g.lineTo(x0 - nx * (wa / 2 - off * wa), y0 - ny * (wa / 2 - off * wa));
      g.arc(x0 + nx * off * wa, y0 + ny * off * wa, wa / 2, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI, true);
      g.closePath(); g.fill();
    };
    quad(w0, w1, 0, K.dark);
    quad(w0 * 0.82, w1 * 0.8, 0.08 * sgn, K.base);
    quad(w0 * 0.45, w1 * 0.42, 0.22 * sgn, K.light);
    g.globalAlpha *= 0.55; quad(w0 * 0.14, w1 * 0.12, 0.34 * sgn, K.hi); g.globalAlpha /= 0.55;
  }

  // a whole finger as one smooth tapered tube along a Catmull-Rom spine
  function tube(g, P, Wd, K, light) {
    const pts = [], ws = [];
    const n = P.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
      for (let k = 0; k < 6; k++) {
        const t = k / 6, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]); ws.push(lerp(Wd[i], Wd[i + 1], t));
      }
    }
    pts.push(P[n - 1]); ws.push(Wd[n - 1]);
    const N = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; });
    const shape = (sc, off, col) => {
      g.fillStyle = col; g.beginPath();
      pts.forEach((p, i) => { const w = ws[i] * sc, c = off * ws[i]; const x = p[0] + N[i][0] * (w / 2 + c), y = p[1] + N[i][1] * (w / 2 + c); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      const e = pts.length - 1, we = ws[e] * sc, ce = off * ws[e], an = Math.atan2(N[e][1], N[e][0]);
      g.arc(pts[e][0] + N[e][0] * ce, pts[e][1] + N[e][1] * ce, we / 2, an, an + Math.PI, true);
      for (let i = e; i >= 0; i--) { const w = ws[i] * sc, c = off * ws[i]; g.lineTo(pts[i][0] - N[i][0] * (w / 2 - c), pts[i][1] - N[i][1] * (w / 2 - c)); }
      g.closePath(); g.fill();
    };
    const sgn = -light;
    shape(1, 0, K.dark);
    shape(0.8, 0.08 * sgn, K.base);
    shape(0.46, 0.2 * sgn, K.light);
    g.globalAlpha *= 0.5; shape(0.14, 0.32 * sgn, K.hi); g.globalAlpha /= 0.5;
  }

  // o: { kind, curl | curls[5], spread, arm (forearm length in hand units), armW, sleeve, cuff:'lace'|'shirt'|'rags',
  //      ring, light (+1 light from -y), bones:[finger indices with exposed bone tips], veins, glowVeins (0..1), alpha }
  NM.paintHand = function (g, x, y, s, a, o = {}) {
    const K = KIND[o.kind || 'skin'];
    const bone = o.kind === 'bone';
    const u = s / 100, light = o.light ?? 1;
    const curls = o.curls || [0, 0, 0, 0, 0].map(() => o.curl || 0);
    const spread = o.spread ?? 0.2;
    g.save(); g.translate(x, y); g.rotate(a); if (o.flip) g.scale(1, -1); g.scale(u, u);
    if (o.alpha !== undefined) g.globalAlpha = o.alpha;
    g.lineCap = 'round'; g.lineJoin = 'round';

    // ---- forearm + sleeve ----
    if (o.arm) {
      const L = o.arm, aw = o.armW || 26;
      if (bone) {
        g.strokeStyle = K.dark; g.lineWidth = 8; g.beginPath(); g.moveTo(-L, -6); g.lineTo(-4, -6); g.moveTo(-L, 6); g.lineTo(-4, 6); g.stroke();
        g.strokeStyle = K.base; g.lineWidth = 5.5; g.beginPath(); g.moveTo(-L, -6.5); g.lineTo(-4, -6.5); g.moveTo(-L, 5.5); g.lineTo(-4, 5.5); g.stroke();
      } else {
        const ag = g.createLinearGradient(0, -aw / 2, 0, aw / 2);
        ag.addColorStop(0, light > 0 ? K.light : K.dark); ag.addColorStop(0.35, K.base); ag.addColorStop(1, light > 0 ? K.dark : K.light);
        g.fillStyle = ag;
        g.beginPath(); g.moveTo(-L, -aw / 2 - 3); g.quadraticCurveTo(-L * 0.4, -aw / 2 - 2, 0, -12); g.lineTo(0, 11); g.quadraticCurveTo(-L * 0.4, aw / 2 + 2, -L, aw / 2 + 3); g.closePath(); g.fill();
        if (o.veins) {
          g.strokeStyle = o.glowVeins ? rgba('#ff2a48', 0.4 + 0.6 * o.glowVeins) : 'rgba(60,40,90,0.45)'; g.lineWidth = o.glowVeins ? 1.6 : 1.1;
          const R = NM.rng(o.seed || 5);
          for (let k = 0; k < 4; k++) {
            const yy = (R() - 0.5) * aw * 0.6, len = o.glowVeins ? L * o.glowVeins : L;
            g.beginPath(); g.moveTo(0, yy * 0.4);
            for (let xx = 0; xx > -len; xx -= 12) g.lineTo(xx, yy + Math.sin(xx * 0.15 + k) * 3 + (R() - 0.5) * 3);
            g.stroke();
          }
          if (o.glowVeins) NM.glow(g, -L * 0.2, 0, 60, '#ff2a48', 0.35 * o.glowVeins);
        }
      }
      if (o.sleeve) {
        const sx = -L * (o.sleeveAt ?? 0.42);
        const sg = g.createLinearGradient(0, -aw, 0, aw);
        sg.addColorStop(0, rgba(o.sleeveHi || '#4a3e5a', 1)); sg.addColorStop(0.3, o.sleeve); sg.addColorStop(1, '#030205');
        g.fillStyle = sg;
        g.beginPath(); g.moveTo(-L - 20, -aw); g.lineTo(sx, -aw * 0.78);
        if (o.cuff === 'rags') { for (let k = 0; k <= 6; k++) g.lineTo(sx + (k % 2 ? 9 : -3) + (k === 3 ? 10 : 0), -aw * 0.78 + k * aw * 1.56 / 6); }
        else g.quadraticCurveTo(sx + 6, 0, sx, aw * 0.78);
        g.lineTo(-L - 20, aw); g.closePath(); g.fill();
        if (o.cuff === 'lace' || o.cuff === 'shirt') {
          const cw = o.cuff === 'lace' ? 9 : 7;
          g.fillStyle = o.cuff === 'lace' ? '#e6dfe8' : '#d8dce4';
          g.beginPath(); g.moveTo(sx - 2, -aw * 0.8);
          for (let k = 0; k <= 10; k++) { const yy = -aw * 0.8 + k * aw * 1.6 / 10; g.quadraticCurveTo(sx + cw + (o.cuff === 'lace' ? 5 : 0), yy - aw * 0.08, sx + cw, yy); }
          g.lineTo(sx - 2, aw * 0.8); g.closePath(); g.fill();
          if (o.cuff === 'lace') { g.fillStyle = 'rgba(40,30,50,0.55)'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(sx + 5, -aw * 0.7 + k * aw * 0.175, 1.3, 0, TAU); g.fill(); } }
          NM.softShade(g, sx + 4, aw * 0.4, 10, aw * 0.5, '#2a2436', 0.5);
        }
      }
    }

    // ---- fingers (behind the back of the hand) ----
    const tips = [];
    FING.forEach(([bx, by, len, w], i) => {
      const c = curls[i] || 0;
      let ang = (i - 1.5) * spread * 0.22, px = bx - 4, py = by * 0.92;
      const parts = [0.46, 0.3, 0.24];
      const ws = [w, w * 0.9, w * 0.8, w * 0.68];
      const P = [[px, py]], A = [ang], L = [];
      for (let k = 0; k < 3; k++) {
        ang += c * [0.55, 0.75, 0.55][k];
        const sl = len * parts[k] * (1 - c * 0.28);
        px += Math.cos(ang) * sl; py += Math.sin(ang) * sl;
        P.push([px, py]); A.push(ang); L.push(sl);
      }
      const boneFrom = bone ? 0 : o.bones && o.bones.includes(i) ? 2 : 4;   // spine index where bone starts
      if (boneFrom > 0) tube(g, P.slice(0, Math.min(4, boneFrom + 1)), ws.slice(0, Math.min(4, boneFrom + 1)), K, light);
      if (boneFrom < 4) {
        const B = KIND.bone;
        for (let k = Math.max(0, boneFrom - (bone ? 0 : 0)); k < 3; k++) {
          if (k < boneFrom) continue;
          seg(g, P[k][0], P[k][1], P[k + 1][0], P[k + 1][1], ws[k] * 0.5, ws[k + 1] * 0.45, B, light);
          g.fillStyle = B.light; g.beginPath(); g.arc(P[k + 1][0], P[k + 1][1], ws[k + 1] * 0.34, 0, TAU); g.fill();
        }
        if (!bone) { g.fillStyle = K.dark; g.beginPath(); g.arc(P[boneFrom][0], P[boneFrom][1], ws[boneFrom] * 0.42, 0, TAU); g.fill(); }
      }
      if (boneFrom > 0) {
        if (K.crease) for (let k = 1; k <= Math.min(2, boneFrom - 1); k++) { // joint creases
          const an = A[k], cx2 = P[k][0], cy2 = P[k][1], pnx = -Math.sin(an), pny = Math.cos(an), wk = ws[k];
          g.strokeStyle = K.crease; g.lineWidth = 0.7;
          for (const off of [-1.2, 0.8]) { g.beginPath(); g.moveTo(cx2 + pnx * wk * 0.28 + Math.cos(an) * off, cy2 + pny * wk * 0.28 + Math.sin(an) * off); g.quadraticCurveTo(cx2 + Math.cos(an) * (off + 0.9), cy2 + Math.sin(an) * (off + 0.9), cx2 - pnx * wk * 0.28 + Math.cos(an) * off, cy2 - pny * wk * 0.28 + Math.sin(an) * off); g.stroke(); }
          NM.softShade(g, cx2 - pnx * wk * 0.15 * light, cy2 - pny * wk * 0.15 * light, wk * 0.4, wk * 0.4, K.hi, 0.18, 'source-over');
        }
        if (boneFrom === 4 && K.nail) { // nail on the last segment
          const an = A[3], mx = lerp(P[2][0], P[3][0], 0.66), my = lerp(P[2][1], P[3][1], 0.66), sl = L[2];
          g.save(); g.translate(mx, my); g.rotate(an);
          g.fillStyle = K.nail; g.beginPath(); g.ellipse(0, -0.3 * light, sl * 0.34, ws[3] * 0.32, 0, 0, TAU); g.fill();
          g.fillStyle = rgba('#ffffff', 0.35); g.beginPath(); g.ellipse(-sl * 0.05, -ws[3] * 0.12 * light, sl * 0.16, ws[3] * 0.07, 0, 0, TAU); g.fill();
          g.restore();
        }
      }
      tips.push([px, py]);
      if (o.ring && i === 2) {
        const rx = lerp(P[0][0], P[1][0], 0.62), ry = lerp(P[0][1], P[1][1], 0.62);
        g.save(); g.translate(rx, ry); g.rotate(A[1]);
        g.fillStyle = '#c8a050'; g.beginPath(); g.ellipse(0, 0, 2.2, w * 0.52, 0, 0, TAU); g.fill();
        g.fillStyle = o.ring; g.beginPath(); g.ellipse(0, -w * 0.08, 3.4, 2.8, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(-0.8, -w * 0.15, 0.9, 0, TAU); g.fill();
        g.restore();
        NM.glow(g, rx, ry, 16, o.ring, 0.55);
      }
    });

    // ---- the back of the hand ----
    if (bone) {
      FING.forEach(([bx, by, , w]) => { seg(g, 2, by * 0.45, bx - 4, by * 0.92, w * 0.45, w * 0.55, K, light); g.fillStyle = K.light; g.beginPath(); g.arc(bx - 4, by * 0.92, w * 0.38, 0, TAU); g.fill(); });
      g.fillStyle = K.base; g.beginPath(); g.ellipse(2, 0, 7, 11, 0, 0, TAU); g.fill();
      NM.softShade(g, 2, 4, 9, 12, K.dark, 0.5);
    } else {
      const pg = g.createLinearGradient(0, -20, 0, 20);
      pg.addColorStop(0, light > 0 ? K.light : K.dark); pg.addColorStop(0.3, K.base); pg.addColorStop(0.75, K.base); pg.addColorStop(1, light > 0 ? K.dark : K.light);
      g.fillStyle = pg;
      g.beginPath();
      g.moveTo(-1, -11.5);
      g.bezierCurveTo(10, -15, 28, -20, 40, -19);
      g.quadraticCurveTo(45, -16, 43, -10);
      g.lineTo(44, 1); g.lineTo(42, 10);
      g.quadraticCurveTo(39, 19, 33, 18.5);
      g.bezierCurveTo(22, 18, 8, 14, -1, 11);
      g.closePath(); g.fill();
      // knuckles
      FING.forEach(([bx, by, , w]) => {
        NM.softShade(g, bx - 5, by * 0.92 - 1.2 * light, w * 0.62, w * 0.5, K.hi, 0.42, 'source-over');
        NM.softShade(g, bx - 3, by * 0.92 + 2.6 * light, w * 0.5, w * 0.34, K.dark, 0.35);
      });
      // tendons fanning to the knuckles
      g.strokeStyle = rgba(K.light, 0.35); g.lineWidth = 1.4;
      FING.forEach(([bx, by]) => { g.beginPath(); g.moveTo(4, by * 0.25); g.quadraticCurveTo(bx * 0.5, by * 0.65, bx - 7, by * 0.9); g.stroke(); });
      if (o.kind === 'corpse') {
        NM.softShade(g, 18, 6, 16, 9, '#4a3a5a', 0.45);
        NM.softShade(g, 30, -10, 8, 5, '#5a4a3a', 0.4);
        g.strokeStyle = 'rgba(50,30,70,0.5)'; g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(2, -4); g.bezierCurveTo(12, -8, 18, 2, 30, -2); g.moveTo(14, -5); g.lineTo(22, -12); g.moveTo(6, 6); g.bezierCurveTo(16, 10, 22, 6, 34, 10); g.stroke();
      }
      if (o.kind === 'glove') { // satin sheen streak
        g.save(); g.globalCompositeOperation = 'screen'; g.strokeStyle = rgba(K.hi, 0.35); g.lineWidth = 3;
        g.beginPath(); g.moveTo(4, -9 * light); g.quadraticCurveTo(22, -14 * light, 38, -14 * light); g.stroke(); g.restore();
      }
      if (o.veins && o.glowVeins) {
        g.strokeStyle = rgba('#ff2a48', 0.8 * o.glowVeins); g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(-2, 0); g.bezierCurveTo(12, -4, 20, 4, 34, 2); g.moveTo(10, -1); g.lineTo(26, -12); g.stroke();
      }
    }

    // ---- thumb (on the near side, over the hand) ----
    {
      const c = curls[4] || 0;
      let ang = -0.62 + c * 0.45 - spread * 0.25, px = 7, py = -10;
      const lens = [17, 14, 12], ws = [13, 11.6, 10, 8.4];
      const P = [[px, py]];
      for (let k = 0; k < 3; k++) {
        if (k) ang += 0.22 + c * 0.55;
        px += Math.cos(ang) * lens[k] * (1 - c * 0.15); py += Math.sin(ang) * lens[k] * (1 - c * 0.15);
        P.push([px, py]);
      }
      if (bone) for (let k = 0; k < 3; k++) { seg(g, P[k][0], P[k][1], P[k + 1][0], P[k + 1][1], ws[k] * 0.5, ws[k + 1] * 0.45, K, light); g.fillStyle = K.light; g.beginPath(); g.arc(P[k + 1][0], P[k + 1][1], ws[k + 1] * 0.32, 0, TAU); g.fill(); }
      else {
        tube(g, P, ws, K, light);
        if (K.nail) { const an = Math.atan2(P[3][1] - P[2][1], P[3][0] - P[2][0]), mx = lerp(P[2][0], P[3][0], 0.62), my = lerp(P[2][1], P[3][1], 0.62); g.save(); g.translate(mx, my); g.rotate(an); g.fillStyle = K.nail; g.beginPath(); g.ellipse(0, -0.4 * light, 4.2, ws[3] * 0.32, 0, 0, TAU); g.fill(); g.restore(); }
      }
      tips.push([px, py]);
    }
    if (o.kind === 'glove' && !o.noCuffLace) {
      // lace at the wrist of the glove
      g.fillStyle = 'rgba(10,8,14,0.9)';
      g.beginPath(); g.moveTo(-6, -15); for (let k = 0; k <= 8; k++) { const yy = -15 + k * 3.75; g.quadraticCurveTo(-1, yy - 1.8, -5 + (k % 2) * 2, yy); } g.lineTo(-10, 15); g.lineTo(-10, -15); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(140,120,170,0.5)'; g.lineWidth = 0.7;
      for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(-5, -13 + k * 3.7, 1.2, 0, TAU); g.stroke(); }
    }
    g.restore();
    // fingertip positions in screen space (for attaching chains, glows)
    const ca = Math.cos(a), sa = Math.sin(a), fl = o.flip ? -1 : 1;
    return tips.map(([tx, ty]) => [x + (tx * ca - ty * fl * sa) * u, y + (tx * sa + ty * fl * ca) * u]);
  };
})();
