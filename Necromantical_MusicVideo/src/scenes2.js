// Necromantical (painted) — scenes 0:36–1:18  (Chorus 1, the manor, Verse 2, Pre-Chorus 2)
'use strict';
(function () {
  const { clamp, lerp, range, ease, TAU, W, H, glow, hash1, noise1, rgba } = NM;
  const softShade = (...a) => NM.softShade(...a);

  // ===================== helpers =====================
  // big title slam (logo crisp in the UI layer; crimson smoke + sigil painted)
  NM.titleSlamBG = function (g, t, lt) {
    NM.skyGrad(g, [[0, '#0a0206'], [1, '#2a060e']]);
    glow(g, W / 2, H * 0.45, 1100, '#a3122a', 0.45);
    NM.band(g, NM.tinted(NM.A.clouds, '#6a0a18'), 0, H, 2200, t * 80, 0.55);
    NM.sigil(g, W / 2, H * 0.45, 380 + lt * 80, t, 1, { squash: 1, width: 2.4, alpha: 0.6, color: '#ff2a44', runes: 36, glowA: 0.4 });
  };
  NM.titleSlamUI = function (u, lt, y = 520) {
    const k = ease.outBack(clamp(lt * 4));
    u.save(); u.translate(W / 2, y); u.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); u.translate(-W / 2, -y);
    NM.titleLogo(u, clamp(lt * 5), y);
    // blood drips from the letters
    u.fillStyle = '#9a0a1e';
    for (let i = 0; i < 12; i++) {
      const x = W / 2 - 600 + i * 104 + hash1(i * 7) * 50, len = clamp(lt * 1.3 - hash1(i) * 0.3) * (40 + hash1(i * 3) * 120);
      if (len > 0) { u.fillRect(x, y + 20, 6, len); u.beginPath(); u.arc(x + 3, y + 20 + len, 6, 0, TAU); u.fill(); }
    }
    u.restore();
  };

  // silhouette head in profile; lips anchored at (lx, ly); dir +1 faces right
  NM.profileHead = function (q, lx, ly, sz, dir, tilt, who) {
    q.save(); q.translate(lx, ly); q.scale(dir, 1); q.rotate(tilt); q.scale(sz / 100, sz / 100); q.translate(-37, -17);
    q.beginPath();
    q.moveTo(-46, -8);
    q.bezierCurveTo(-48, -50, -20, -66, 10, -62);
    q.bezierCurveTo(30, -58, 38, -40, 36, -20);
    q.lineTo(39, -12); q.lineTo(48, 2); q.lineTo(37, 6);
    q.lineTo(40, 12); q.lineTo(35, 16); q.lineTo(38, 21);
    q.quadraticCurveTo(34, 32, 26, 36); q.lineTo(8, 40);
    q.lineTo(-2, 34); q.lineTo(-4, 60); q.lineTo(-24, 60); q.lineTo(-26, 30);
    q.quadraticCurveTo(-44, 20, -46, -8);
    q.closePath(); q.fill();
    if (who === 'lucien') {
      q.beginPath(); q.moveTo(-40, -30); q.lineTo(-56, -40); q.lineTo(-42, -46); q.lineTo(-50, -60); q.lineTo(-30, -58); q.lineTo(-28, -74); q.lineTo(-10, -64); q.lineTo(4, -76); q.lineTo(12, -62); q.lineTo(30, -66); q.lineTo(30, -50); q.closePath(); q.fill();
    } else {
      q.beginPath(); q.ellipse(-12, -48, 30, 20, -0.3, 0, TAU); q.fill();
      q.beginPath(); q.arc(-26, -64, 9, 0, TAU); q.fill();
    }
    q.restore();
  };

  // painted black cat (sitting)
  NM.paintCat = function (g, x, y, s, t, o = {}) {
    g.save(); g.translate(x, y); g.scale((o.dir ?? 1) * s / 100, s / 100);
    g.fillStyle = '#060508';
    g.beginPath(); g.ellipse(0, -30, 26, 32, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(4, -70, 17, 15, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-10, -78); g.lineTo(-8, -98); g.lineTo(2, -82); g.fill();
    g.beginPath(); g.moveTo(8, -82); g.lineTo(18, -98); g.lineTo(20, -76); g.fill();
    g.lineWidth = 7; g.lineCap = 'round'; g.strokeStyle = '#060508';
    const tw = Math.sin(t * 2) * 8;
    g.beginPath(); g.moveTo(-20, -8); g.bezierCurveTo(-50, 0, -50, -40 + tw, -36, -56 + tw); g.stroke();
    g.strokeStyle = 'rgba(120,110,160,0.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, -30, 26, 32, 0, -1.2, 0.2); g.stroke();
    const blink = ((t + 0.7) % 3.7) < 0.12;
    if (!blink) for (const ex of [-2, 12]) { g.fillStyle = '#ffd04a'; g.beginPath(); g.ellipse(ex, -71, 3.6, 2.6, 0, 0, TAU); g.fill(); g.fillStyle = '#000'; g.fillRect(ex - 0.6, -73.5, 1.2, 5); NM.glow(g, ex, -71, 10, '#ffcf4a', 0.6); }
    g.restore();
  };

  // bat silhouette; flap in radians
  NM.bat = function (g, x, y, s, flap, col = '#07050a') {
    const w = Math.sin(flap);
    g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col;
    g.beginPath(); g.ellipse(0, 0, 4, 6, 0, 0, TAU); g.fill();
    for (const sx of [-1, 1]) {
      g.beginPath(); g.moveTo(0, -2); g.lineTo(sx * 10, -6 - w * 10); g.lineTo(sx * 22, -2 - w * 14); g.lineTo(sx * 18, 2 - w * 6); g.lineTo(sx * 13, 0 - w * 4); g.lineTo(sx * 9, 4 - w * 3); g.lineTo(sx * 4, 2); g.closePath(); g.fill();
    }
    g.beginPath(); g.moveTo(-3, -5); g.lineTo(-2, -9); g.lineTo(0, -6); g.lineTo(2, -9); g.lineTo(3, -5); g.fill();
    g.restore();
  };
  // a stream of bats bursting from a point (local time lt, start t0)
  NM.batBurst = function (g, lt, t0, x, y, n, seed, s = 1) {
    for (let i = 0; i < n; i++) {
      const k = lt - t0 - hash1(i * 7 + seed) * 0.8;
      if (k <= 0 || k > 3) continue;
      const a = -Math.PI / 2 + (hash1(i * 3 + seed) - 0.5) * 2.2, v = 260 + hash1(i * 5 + seed) * 300;
      const px = x + Math.cos(a) * v * k + Math.sin(k * 6 + i) * 20, py = y + Math.sin(a) * v * k * 0.6 - k * 40 + Math.cos(k * 5 + i) * 14;
      NM.bat(g, px, py, s * (0.8 + hash1(i + seed) * 0.6) * (1 + k * 0.3), k * 22 + i);
    }
  };

  // wrought-iron gate (two leaves), open 0..1
  NM.ironGate = function (g, cx, y, w, h, open, o = {}) {
    for (const side of [-1, 1]) {
      g.save(); g.translate(cx + side * w / 2, y); g.scale(side * Math.max(0.08, 1 - open * 0.85), 1);
      g.strokeStyle = o.color || '#08070a'; g.fillStyle = o.color || '#08070a'; g.lineWidth = 7;
      for (let i = 0; i <= 8; i++) { const x = -(i / 8) * (w / 2); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -h + Math.abs(i - 4) * 12); g.stroke(); g.beginPath(); g.moveTo(x - 9, -h + Math.abs(i - 4) * 12 + 4); g.lineTo(x, -h + Math.abs(i - 4) * 12 - 22); g.lineTo(x + 9, -h + Math.abs(i - 4) * 12 + 4); g.fill(); }
      g.lineWidth = 9; g.beginPath(); g.moveTo(0, -h * 0.12); g.lineTo(-w / 2, -h * 0.12); g.moveTo(0, -h * 0.72); g.lineTo(-w / 2, -h * 0.72); g.stroke();
      g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-w / 16 - i * w / 8, -h * 0.62, w / 22, 0, TAU); g.stroke(); }
      g.restore();
    }
    // pillars
    for (const side of [-1, 1]) {
      const px = cx + side * (w / 2 + 50);
      const pg = g.createLinearGradient(px - 50, 0, px + 50, 0); pg.addColorStop(0, '#0e0c12'); pg.addColorStop(0.6, '#2a2836'); pg.addColorStop(1, '#0a080c');
      g.fillStyle = pg; g.fillRect(px - 50, y - h - 60, 100, h + 60); g.fillRect(px - 62, y - h - 80, 124, 26);
    }
  };

  // ======================================================================
  // CHORUS 1  36.15 – 48.40
  // ======================================================================
  NM.shot(36.15, 37.0, (g, S) => {
    NM.titleSlamBG(g, S.t, S.lt);
    S.post.extraUI = [(u) => NM.titleSlamUI(u, S.lt)];
    S.post.shake = S.lt < 0.35 ? 1.5 : 0;
    S.post.chroma = clamp(1 - S.lt * 2.5);
  }, { name: 'c1-title', in: { type: 'red', dur: 0.35 } });

  // 37.00 – 39.45 the grip
  NM.shot(37.0, 39.45, (g, S) => {
    const t = S.t, lt = S.lt;
    const zoom = 1 + lt * 0.035;
    g.save(); g.translate(W / 2, H * 0.45); g.scale(zoom, zoom); g.translate(-W / 2, -H * 0.45);
    NM.paintSky(g, t, { top: '#14060a', mid: '#3a1018', low: '#6a1a24', moon: { x: 1480, y: 300, r: 190, blood: 0.6 }, cloudDark: '#1e0810', cloudLight: '#ff8a8a', speed: 10 });
    glow(g, 900, 640, 760, '#d0554f', 0.3 + NM.beat(t, 4) * 0.2);
    NM.paintRidge(g, 3, 770, 50, 0.004, '#1a0a0e', '#6a2a30');
    // a leaning headstone and the grave soil
    g.save(); g.translate(330, 800); g.rotate(-0.12);
    const hg = g.createLinearGradient(-110, 0, 110, 0); hg.addColorStop(0, '#2a1a20'); hg.addColorStop(0.6, '#4a3238'); hg.addColorStop(1, '#1a0c10');
    g.fillStyle = hg; g.beginPath(); g.moveTo(-110, 20); g.lineTo(-110, -300); g.quadraticCurveTo(-110, -420, 0, -420); g.quadraticCurveTo(110, -420, 110, -300); g.lineTo(110, 20); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(10,4,6,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-40, -380); g.lineTo(-10, -300); g.lineTo(-30, -240); g.stroke();
    g.fillStyle = 'rgba(20,8,10,0.75)'; g.font = 'italic 30px "IM Fell English"'; g.textAlign = 'center'; g.fillText('L. A.', 0, -300); g.fillText('1849 – 1878', 0, -260);
    g.restore();
    const sg = g.createLinearGradient(0, 780, 0, H); sg.addColorStop(0, '#2a1610'); sg.addColorStop(1, '#0a0605');
    g.fillStyle = sg; g.beginPath(); g.moveTo(0, 800); g.quadraticCurveTo(900, 740, W, 810); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    for (let i = 0; i < 140; i++) { g.fillStyle = i % 3 ? 'rgba(10,6,4,0.7)' : 'rgba(90,60,40,0.5)'; g.beginPath(); g.ellipse(hash1(i) * W, 800 + hash1(i * 3) * 280, 6 + hash1(i * 5) * 22, 3 + hash1(i * 9) * 6, 0, 0, TAU); g.fill(); }
    const rise = ease.outBack(clamp(lt / 0.5));
    const reach = ease.outCubic(clamp((lt - 0.45) / 0.65));
    const grip = ease.inOutSine(range(1.0, 1.4, lt));
    const bind = range(1.35, 2.3, lt);
    // his corpse arm tears up out of the soil
    const wx = 860, wy = lerp(1250, 470, rise);
    g.save(); g.beginPath(); g.rect(0, 0, W, 790); g.clip();
    NM.paintHand(g, wx, wy, 340, -Math.PI / 2 + 0.1, { kind: 'corpse', curls: [0.45 - 0.3 * reach + 0.3 * grip, 0.4 - 0.3 * reach + 0.35 * grip, 0.5 - 0.3 * reach + 0.3 * grip, 0.6 - 0.3 * reach + 0.3 * grip, 0.2], spread: 1 - 0.6 * grip, bones: [3], arm: 150, armW: 30, sleeve: '#120f18', sleeveHi: '#3a3448', cuff: 'rags', veins: true, glowVeins: bind, light: 1 });
    g.restore();
    // soil bursting around the arm
    for (let i = 0; i < 26; i++) { const k = clamp(lt / 0.9); const a = -Math.PI / 2 + (hash1(i * 5) - 0.5) * 2.4, v = 260 + hash1(i * 7) * 480; const px = wx + Math.cos(a) * v * k, py = 790 + Math.sin(a) * v * k + 900 * k * k; if (py > 800 && k > 0.2) continue; g.fillStyle = i % 2 ? '#1a0e08' : '#3a2416'; g.beginPath(); g.ellipse(px, py, 8 + hash1(i) * 14, 6 + hash1(i * 2) * 8, a, 0, TAU); g.fill(); }
    g.fillStyle = '#1e120c'; g.beginPath(); g.ellipse(wx - 10, 800, 120, 26, 0, 0, TAU); g.fill();
    // her gloved hand descends and closes around his wrist
    if (reach > 0) {
      const hx = lerp(1500, wx + 120, reach), hy = lerp(-120, wy + 70, reach);
      NM.paintHand(g, hx, hy, 300, Math.PI - 0.32, { kind: 'glove', flip: true, curl: 0.15 + 0.8 * grip, spread: 0.3 - 0.3 * grip, arm: 170, armW: 28, sleeve: '#0e0b14', sleeveHi: '#4a3a5e', cuff: 'lace', ring: '#ff3a52', light: 1 });
      if (grip > 0) glow(g, wx + 20, wy + 80, 340 * grip, '#ff3a52', 0.5 * grip);
    }
    // the binding: a crimson sigil and chain coil around both wrists
    if (bind > 0) {
      NM.sigil(g, wx + 30, wy + 90, 260, t, bind, { squash: 0.32, width: 3, alpha: 0.85, color: '#ff3a52', runes: true });
      const pts = []; for (let k = 0; k <= 40; k++) { const f = k / 40, an = f * TAU * 2.2 + t * 2; pts.push(wx + 30 + Math.cos(an) * 90, wy + 260 - f * 240 + Math.sin(an) * 26); }
      NM.chain(g, pts, 20, { color: '#ff3a52', thick: 4, reveal: bind, glow: 0.8 });
    }
    NM.particles(g, t, { n: 40, seed: 9, kind: 'ember', x: 500, y: 300, w: 900, h: 600, vx: 10, vy: -60, size: [1.5, 3.5], color: '#ff6a6a', alpha: 0.6 * bind });
    g.restore();
    S.post.shake = lt < 0.5 ? 1.2 : grip > 0 && grip < 1 ? 0.6 : 0;
    if (lt > 1.0 && lt < 1.12) { S.post.flash = 0.35; S.post.flashColor = '#ff2040'; }
    S.post.grade = { shadow: '#14040a', light: '#ffb0a0', amount: 0.35 };
  }, { name: 'c1-grip', paint: { r: 5 } });

  // 39.45 – 42.45 the kiss before the blood moon
  NM.shot(39.45, 42.45, (g, S) => {
    const t = S.t, lt = S.lt;
    const push = 1 + lt * 0.04;
    g.save(); g.translate(960, 560); g.scale(push, push); g.translate(-960, -560);
    NM.paintSky(g, t, { top: '#14060a', mid: '#4a1018', low: '#8a2a2a', moon: { x: 960, y: 400, r: 330, blood: 0.6 }, cloudDark: '#2a0a10', cloudLight: '#ff8a8a', cloudY: 420, cloudH: 260, speed: 8 });
    NM.paintRidge(g, 4, 780, 24, 0.0025, '#2a0a10', '#ff7a7a');
    const drain = clamp((lt - 0.6) / 1.6);
    for (let i = 0; i < 6; i++) {
      const cx = 480 + i * 192 + (i > 2 ? 120 : -120), cy = 790;
      NM.paintCandle(g, cx, cy, 1.4, t, i, { lit: clamp(1 - drain * 1.4 + i * 0.12) });
      const k = clamp(drain * 1.6 - i * 0.12);
      if (k > 0 && k < 1) { const px = lerp(cx, 960, ease.inQuad(k)), py = lerp(cy - 60, 290, ease.inQuad(k)) - Math.sin(k * Math.PI) * 120; glow(g, px, py, 40, '#fff0d8', 0.85); }
    }
    // they lean in, meet with a little spring, then his arm wraps her and they sway
    const meet = NM.spring(lt, 0.15, 6, 3.4), gap = Math.max(0, 1 - meet) * 14 + (meet > 1 ? (1 - meet) * 6 : 0);
    const herArm = ease.outCubic(range(0.45, 1.0, lt)), hisArm = ease.outCubic(range(0.75, 1.4, lt));
    const rock = Math.sin(lt * 1.6) * 0.02 * range(0.6, 1.4, lt);
    const kiss = (q) => {
      q.save(); q.scale(4, 4); q.translate(240, 280); q.rotate(rock); q.translate(-240, -280);
      const lipX = 240, lipY = 100 + Math.sin(t * 1.3) * 0.6;
      q.save(); q.translate(gap / 2, 0);
      NM.profileHead(q, lipX, lipY, 46, -1, 0.3 - gap * 0.01, 'lucien');
      q.beginPath(); q.moveTo(248, 118); q.quadraticCurveTo(250, 140, 254, 160); q.lineTo(256, 280); q.lineTo(304, 280); q.lineTo(300, 170); q.quadraticCurveTo(298, 128, 280, 104); q.closePath(); q.fill();
      q.restore();
      q.save(); q.translate(-gap / 2, 0);
      NM.profileHead(q, lipX, lipY, 40, 1, -0.25 + gap * 0.012, 'isolde');
      const sw = Math.sin(t * 1.7) * 3;
      q.beginPath(); q.moveTo(206, 80); q.bezierCurveTo(192, 110, 190 + sw, 160, 176 + sw * 2, 220); q.lineTo(204, 224); q.bezierCurveTo(206, 170, 212, 124, 224, 98); q.closePath(); q.fill();
      q.beginPath(); q.moveTo(232, 114); q.quadraticCurveTo(242, 136, 238, 150); q.quadraticCurveTo(232, 166, 236, 176); q.lineTo(262, 280); q.lineTo(176, 280); q.lineTo(204, 176); q.quadraticCurveTo(208, 150, 206, 128); q.quadraticCurveTo(214, 112, 222, 108); q.closePath(); q.fill();
      q.restore();
      q.lineCap = 'round'; q.strokeStyle = q.fillStyle;
      if (herArm > 0) { q.lineWidth = 6; q.beginPath(); q.moveTo(222 - gap / 2, 150 - 20 * herArm); q.quadraticCurveTo(244, 150 - 28 * herArm, lerp(232, 272, herArm), lerp(150, 100, herArm)); q.stroke(); }
      if (hisArm > 0) { q.lineWidth = 7; q.beginPath(); q.moveTo(286 + gap / 2, 132); q.quadraticCurveTo(lerp(280, 246, hisArm), lerp(150, 176, hisArm), lerp(270, 208, hisArm), lerp(170, 160, hisArm)); q.stroke(); }
      q.restore();
    };
    const veil = (q) => { q.save(); q.scale(4, 4); const sw = Math.sin(t * 1.4) * 6; q.beginPath(); q.moveTo(206, 78); q.bezierCurveTo(170, 96 + sw, 130 - sw, 140, 90 - sw * 2, 220); q.lineTo(150, 230); q.bezierCurveTo(170, 160, 190, 120, 222, 98); q.closePath(); q.fill(); q.restore(); };
    NM.silhouette(g, 'rgba(53,21,27,0.75)', veil);
    g.save(); g.translate(-4, -4); NM.silhouette(g, '#ff9a8a', kiss); g.restore();
    g.save(); g.translate(4, -4); NM.silhouette(g, '#d0554f', kiss); g.restore();
    NM.silhouette(g, '#0c0406', kiss);
    NM.paintTree(g, 120, 1000, 900, 31, t, { color: '#0c0406', rim: 'rgba(255,120,120,0.35)', lean: 0.3 });
    NM.paintTree(g, 1840, 1020, 920, 5, t, { color: '#0c0406', rim: 'rgba(255,120,120,0.35)', lean: -0.25, rimDx: -2 });
    glow(g, 960, 290, 120, '#fff0d8', 0.5 * drain);
    NM.lilyField(g, t, 950, 50, 9, { size: 130, depth: 140 });
    for (let i = 0; i < 26; i++) { const a = i * 2.39 + lt * (0.9 + (i % 4) * 0.2), r = 260 + (i % 5) * 70 + Math.sin(lt + i) * 30; const px = 960 + Math.cos(a) * r, py = 520 + Math.sin(a) * r * 0.45; g.save(); g.translate(px, py); g.rotate(a * 2); g.fillStyle = i % 3 ? '#c4122f' : '#ff5a6e'; g.beginPath(); g.ellipse(0, 0, 9, 4.5, 0, 0, TAU); g.fill(); g.restore(); }
    g.restore();
    NM.particles(g, t, { n: 50, seed: 21, kind: 'petal', vx: -40, vy: 60, drift: 50, size: [5, 8], alpha: 0.9 });
    S.post.grade = { shadow: '#1a0408', light: '#ffb0a0', amount: 0.3 };
  }, { name: 'c1-kiss', in: { type: 'fade', dur: 0.3 } });

  // waltz pair helper (spinning via horizontal scale)
  NM.waltz = function (q, cx, gy, s, t, spin, o = {}) {
    const sx = Math.cos(spin);
    q.save(); q.translate(cx, 0); q.scale(Math.abs(sx) < 0.12 ? 0.12 * Math.sign(sx || 1) : sx, 1); q.translate(-cx, 0);
    const lu = { dir: -1, lean: 0.12, armF: [1.0, 0.9], armB: [1.55, -0.25], legF: [0.3 * Math.sin(t * 5), -0.1], legB: [-0.3 * Math.sin(t * 5), 0.25], expr: o.lexpr || 'hollow', yaw: 0.45 };
    const is = { dir: 1, lean: 0.1, armF: [2.05, 0.55], armB: [1.55, -0.25], twirl: 0.7 + 0.3 * Math.sin(t * 2), wind: 1, expr: o.iexpr || 'tender', yaw: 0.45, headTilt: -0.1 };
    if (Math.sin(spin) > 0) { NM.figIsolde(q, cx - 0.1 * s, gy, s * 0.93, is, t); NM.figLucien(q, cx + 0.12 * s, gy, s, lu, t); }
    else { NM.figLucien(q, cx + 0.12 * s, gy, s, lu, t); NM.figIsolde(q, cx - 0.1 * s, gy, s * 0.93, is, t); }
    q.restore();
  };

  // 42.45 – 45.35 the waltz among the graves (camera drifts around them)
  NM.shot(42.45, 45.35, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: Math.sin(lt * 0.8) * 160, y: 120, z: 860 + lt * 20, f: 1100, vy: H * 0.4 });
    NM.gyNight(g, t, c, { rose: true, open: 1, candles: () => 1, gyOpts: { hooks: { 1300: (q) => {
      const p = NM.P3(c, 0, 0, 1220);
      NM.withRim(q, (r) => NM.waltz(r, p.x, p.y, 185 * p.k, t, t * 2.6), '#c8c0ff', 1, -0.5, 4, 0.7);
      NM.chain(q, [p.x - 12 * p.k, p.y - 95 * p.k, p.x, p.y - 75 * p.k, p.x + 18 * p.k, p.y - 150 * p.k], 6 * p.k, { color: '#ff3a52', thick: 1.2 * p.k, glow: 0.7 });
    } } } });
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + t * 0.4; const p = NM.P3(c, Math.cos(a) * 1000, 0, 1800 + Math.sin(a) * 400); NM.figGhost(g, p.x, p.y - 20 * p.k, 150 * p.k, t + i, { alpha: 0.4, face: true, expr: 'sleep' }); }
    S.post.grade = { shadow: '#0c0818', light: '#ffc0d0', amount: 0.35 };
  }, { name: 'c1-dance', in: { type: 'black', dur: 0.2 } });

  // 45.35 – 48.40 the dead rise all around as they walk away
  NM.shot(45.35, 48.4, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 260 + lt * 40, z: 200 - lt * 60, f: 1000, vy: H * 0.46 });
    const walkZ = c.z + lerp(520, 820, lt / 3);
    NM.gyNight(g, t, c, { open: 1, gyOpts: { hooks: { [walkZ + 10]: (q) => {
      const p1 = NM.P3(c, -50, 0, walkZ), p2 = NM.P3(c, 60, 0, walkZ + 140);
      NM.withRim(q, (r) => { NM.figLucienBack(r, p2.x, p2.y, 185 * p2.k, t); NM.figIsoldeBack(r, p1.x, p1.y, 172 * p1.k, t, { lantern: true }); }, '#bfe9ff', 0, -1, 3, 0.5);
    } } } });
    // spirits rising from the graves
    for (let i = 0; i < 18; i++) {
      const X = (hash1(i * 7) - 0.5) * 2600, Z = 500 + hash1(i * 13) * 3600;
      const k = clamp((lt - hash1(i * 3) * 1.6) / 0.9);
      if (k <= 0) continue;
      const p = NM.P3(c, X, ease.outCubic(k) * 160, Z);
      NM.figGhost(g, p.x, p.y, 170 * p.k, t + i, { alpha: 0.55 * k, face: p.k > 0.5, expr: 'sleep', color: i % 4 ? '#bfe9ff' : '#d8c8ff' });
    }
    S.post.grade = { shadow: '#0c0818', light: '#b8d8ff', amount: 0.35 };
  }, { name: 'c1-dead', out: { dur: 0.5 } });

  // ======================================================================
  // 48.40 – 53.55  THE MANOR
  // ======================================================================
  NM.shot(48.4, 53.55, (g, S) => {
    const t = S.t, lt = S.lt;
    const z = 1 + lt * 0.035;
    const st = NM.strikeAt(t, [51.4], 0.5);
    g.save(); g.translate(W / 2 - lt * 8, H * 0.55); g.scale(z, z); g.translate(-W / 2, -H * 0.55);
    NM.manorScene(g, t, { x: W / 2, y: 720, scale: 1.0, lit: [1, 4, 7, 10, 12] });
    if (st.v > 0.3) NM.bolt(g, 1400, -20, 1460, 420, 11, st.v, { color: '#e8e4ff', w: 1.2 });
    NM.batBurst(g, lt, 1.6, W / 2, 330, 26, 4, 1.4);
    // the doors open: warm light
    const door = range(3.9, 4.6, lt);
    if (door > 0) { g.fillStyle = rgba('#ffcf8a', 0.9 * door); g.fillRect(W / 2 - 30, 640, 60 * door, 80); glow(g, W / 2, 680, 220, '#ffaa50', 0.6 * door); }
    // path up the hill
    const pg = g.createLinearGradient(0, 720, 0, H); pg.addColorStop(0, 'rgba(70,60,80,0.4)'); pg.addColorStop(1, 'rgba(40,34,46,0.9)');
    g.fillStyle = pg; g.beginPath(); g.moveTo(W / 2 - 40, 720); g.lineTo(W / 2 + 40, 720); g.lineTo(W / 2 + 360, H); g.lineTo(W / 2 - 360, H); g.closePath(); g.fill();
    // the couple walking up the path (back views), shrinking with distance
    const k = clamp(lt / 4.5);
    const yy = lerp(1000, 735, ease.inOutSine(k)), sc = lerp(1, 0.16, ease.inOutSine(k));
    if (lt < 4.9) { NM.figLucienBack(g, W / 2 + 40 * sc, yy - 4 * sc, 560 * sc, t); NM.figIsoldeBack(g, W / 2 - 40 * sc, yy, 520 * sc, t, { lantern: true }); }
    g.restore();
    // foreground gate swinging open, cat on the pillar
    // the heavy gate creaks open, swings past and settles with a clang
    const gate = Math.min(1.06, NM.spring(lt, 0.2, 5, 2.6) * 0.98);
    const gx = W / 2 - lt * 26;
    NM.ironGate(g, gx, H + 40, 1100, 760, clamp(gate, 0, 1.06));
    NM.paintCat(g, gx - 600, H + 40 - 760 - 80, 120, t, { dir: 1 });
    NM.paintFog(g, t, 820, 280, 0.28, '#6a6090', 14);
    S.post.shake = NM.impact(lt, 0.9, 0.35) * 0.8 + NM.impact(lt, 3.0, 0.5) * 0.4;
    S.post.flash = st.v * 0.35; S.post.flashColor = '#dcd8ff';
    S.post.grade = { shadow: '#0c0818', light: '#ffc89a', amount: 0.35 };
  }, { name: 'mansion', in: { type: 'black', dur: 0.6 }, out: { dur: 0.4 } });

  // ======================================================================
  // VERSE 2  53.55 – 65.60
  // ======================================================================
  NM.shot(53.55, 56.65, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 150, z: lt * 90, f: 900, vy: H * 0.4 });
    NM.interior(g, t, c, 'hall', { carpet: 90 });
    const z0 = c.z + 330 + lt * 70;
    const p1 = NM.P3(c, -50, 0, z0), p2 = NM.P3(c, 60, 0, z0 + 90);
    NM.withRim(g, (q) => { NM.figLucienBack(q, p2.x, p2.y, 185 * p2.k, t); NM.figIsoldeBack(q, p1.x, p1.y, 172 * p1.k, t, { lantern: true }); }, '#ffcf8a', 0, -1, 3, 0.5);
    NM.particles(g, t, { n: 120, seed: 31, kind: 'dot', vx: 6, vy: -4, drift: 30, driftY: 20, size: [1, 2.2], color: '#f0e0c8', alpha: 0.45, twinkle: 2 });
    S.post.grade = { shadow: '#120a0c', light: '#ffcf9a', amount: 0.35 };
  }, { name: 'v2-hall', in: { type: 'black', dur: 0.4 } });

  NM.shot(56.65, 59.65, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 160, z: lt * 70, f: 900, vy: H * 0.4 });
    NM.interior(g, t, c, 'crypt', {});
    const z0 = c.z + 300 + lt * 80;
    const p1 = NM.P3(c, -40, 0, z0), p2 = NM.P3(c, 70, 0, z0 + 90);
    NM.withRim(g, (q) => { NM.figLucienBack(q, p2.x, p2.y, 185 * p2.k, t); NM.figIsoldeBack(q, p1.x, p1.y, 172 * p1.k, t, { lantern: true }); }, '#ffcf8a', 0, -1, 3, 0.5);
    S.post.grade = { shadow: '#0a0a14', light: '#c8b8a0', amount: 0.35 };
  }, { name: 'v2-crypt', in: { type: 'black', dur: 0.3 } });

  // 59.65 – 61.20 sepia memory: the wedding
  NM.shot(59.65, 61.2, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#2a1e14'], [1, '#5a4228']]);
    // great window behind the altar
    g.fillStyle = '#1a120a'; g.beginPath(); NM.archPath(g, 960, 760, 600, 720); g.closePath(); g.fill();
    g.fillStyle = '#e6cd96'; g.beginPath(); NM.archPath(g, 960, 740, 540, 680); g.closePath(); g.fill();
    g.fillStyle = '#2a1e14'; g.fillRect(952, 80, 16, 660); g.fillRect(690, 360, 540, 14);
    NM.shaft(g, 960, 200, 420, 960, H, 1100, '#fff0d0', 0.3);
    g.fillStyle = '#3a2a1a'; g.fillRect(0, 780, W, 300);
    softShade(g, 960, 790, 700, 80, '#fff0d0', 0.4, 'screen');
    const z = 1 + lt * 0.04;
    g.save(); g.translate(960, 600); g.scale(z, z); g.translate(-960, -600);
    NM.figLucien(g, 1090, 800, 640, { dir: -1, alive: true, armF: [1.25, 0.35], armB: [0.15, 0.3], expr: 'alive', yaw: 0.5 }, t, { colors: { coat: '#2a1e14', coatMid: '#3a2a1a', coatHi: '#6a5030' } });
    NM.figIsolde(g, 820, 800, 600, { dir: 1, armF: [1.2, 0.3], armB: [0.3, 0.6], expr: 'tender', yaw: 0.5, wind: 0.2 }, t, { colors: { dress: '#e6d8c0', dressMid: '#f4e8d4', dressHi: '#ffffff', lace: '#ffffff', veil: 'rgba(250,240,220,0.55)', glove: '#f4ead8' } });
    g.restore();
    glow(g, 958, 520, 30, '#ffffff', 0.9 * (0.6 + 0.4 * Math.sin(t * 6)));
    NM.particles(g, t, { n: 40, seed: 41, kind: 'dot', vx: 4, vy: 20, drift: 30, size: [1.5, 3], color: '#fff4dc', alpha: 0.6 });
    for (let i = 0; i < 3; i++) { const x = hash1(Math.floor(t * 12) * 7 + i) * W; g.fillStyle = 'rgba(246,234,208,0.25)'; g.fillRect(x, 0, 2, H); }
    S.post.grade = { shadow: '#2a1a0a', light: '#f0d8a8', amount: 0.6 };
  }, { name: 'v2-wedding', in: { type: 'white', dur: 0.4 } });

  // 61.20 – 62.65 the chains of death shatter
  NM.shot(61.2, 62.65, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 260, z: 0, f: 900, vy: H * 0.46 });
    NM.interior(g, t, c, 'crypt', {});
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, W, H);
    // coffin standing upright
    const cg = g.createLinearGradient(780, 0, 1140, 0); cg.addColorStop(0, '#1a100a'); cg.addColorStop(0.55, '#5a3a24'); cg.addColorStop(1, '#140c08');
    g.fillStyle = cg;
    g.beginPath(); g.moveTo(860, 90); g.lineTo(1060, 90); g.lineTo(1150, 260); g.lineTo(1060, 980); g.lineTo(860, 980); g.lineTo(770, 260); g.closePath(); g.fill();
    g.fillStyle = '#b08850'; g.fillRect(946, 220, 28, 300); g.fillRect(880, 300, 160, 28);
    const snap = 0.45;
    if (lt < snap) {
      NM.chain(g, [560, 120, 960, 520, 1360, 940], 54, { color: '#3a3a48', thick: 12, highlight: '#a0a0b8' });
      NM.chain(g, [1360, 120, 960, 520, 560, 940], 54, { color: '#3a3a48', thick: 12, highlight: '#a0a0b8' });
      g.strokeStyle = '#ff3a52'; g.lineWidth = 4;
      for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(960, 520); g.lineTo(960 + Math.cos(i) * 180 * (lt / snap), 520 + Math.sin(i * 1.7) * 180 * (lt / snap)); g.stroke(); }
    } else {
      const k = lt - snap;
      for (let i = 0; i < 40; i++) {
        const a = hash1(i * 3) * TAU, sp = 500 + hash1(i * 5) * 900;
        const x = 960 + Math.cos(a) * sp * k, y = 520 + Math.sin(a) * sp * k + 700 * k * k;
        g.save(); g.translate(x, y); g.rotate(k * 10 + i);
        g.strokeStyle = '#4a4a5a'; g.lineWidth = 10; g.beginPath(); g.ellipse(0, 0, 26, 15, 0, 0, TAU); g.stroke();
        g.strokeStyle = '#b0b0c8'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -3, 22, 11, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        g.restore();
      }
      glow(g, 960, 520, 600 * clamp(1 - k), '#ff2040', 0.8 * clamp(1 - k));
      S.post.flash = clamp(1 - k * 4) * 0.6; S.post.flashColor = '#ff2040';
      S.post.shake = k < 0.4 ? 1.4 : 0;
    }
  }, { name: 'v2-chains' });

  // 62.65 – 65.60 he mirrors her every gesture; their shadows loom on the crypt wall
  NM.shot(62.65, 65.6, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 220, z: -200 + lt * 40, f: 900, vy: H * 0.4 });
    NM.interior(g, t, c, 'crypt', {});
    // she snaps from pose to pose on the beat; he follows a moment later, heavier, overshooting
    const POSES = [
      { aF: [0.5, 0.4], aB: [0.3, 0.4], lean: 0, tilt: 0.1 },
      { aF: [2.3, 0.2], aB: [0.5, 0.5], lean: -0.08, tilt: -0.1 },
      { aF: [1.3, -0.4], aB: [1.6, 0.3], lean: 0.12, tilt: 0.2 },
      { aF: [2.7, 0.5], aB: [2.4, 0.4], lean: -0.12, tilt: -0.25 },
    ];
    const pi = NM.poseAt(t, NM.T.beats, POSES, 0, 16, 9), pl = NM.poseAt(t, NM.T.beats, POSES, 0.17, 10, 4.5);
    const snap = NM.beat(t, 9);
    const isoP = { dir: 1, armF: pi.aF, armB: pi.aB, lean: pi.lean, expr: 'smirk', yaw: 0.45, glow: 0.5 + snap * 0.5, wind: 0.4 + snap * 0.6, headTilt: -pi.tilt * 0.4 };
    const lucP = { dir: -1, armF: pl.aF, armB: pl.aB, lean: pl.lean, expr: 'hollow', yaw: 0.45, headTilt: 0.1 + pl.tilt, idle: 0.3 };
    // giant shadows on the back wall
    g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.55;
    NM.silhouette(g, '#100810', (q) => { q.translate(W / 2, 760); q.scale(1.7, 1.7); q.translate(-W / 2, -760); NM.figIsolde(q, 780, 760, 560, isoP, t, { noHead: true }); NM.figLucien(q, 1140, 760, 600, lucP, t, { noHead: true }); });
    g.restore();
    let hand;
    NM.withRim(g, (q) => { hand = NM.figIsolde(q, 700, 1000, 820, isoP, t); NM.figLucien(q, 1240, 1000, 880, lucP, t); }, '#ffcf8a', -1, -0.5, 4, 0.6);
    NM.chain(g, [hand.hand[0], hand.hand[1], 970, hand.hand[1] - 120 * (1 - snap * 0.8), 1205, 312], 30, { color: '#ff3a52', thick: 6, glow: 0.6 + snap * 0.6 });
    S.post.shake = snap * 0.35;
    S.post.grade = { shadow: '#0a0a14', light: '#ffc8a0', amount: 0.35 };
  }, { name: 'v2-reins', in: { type: 'black', dur: 0.2 } });

  // ======================================================================
  // PRE-CHORUS 2  65.60 – 78.15
  // ======================================================================
  NM.shot(65.6, 68.55, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 220, z: -200, f: 900, vy: H * 0.4 });
    NM.interior(g, t, c, 'crypt', {});
    NM.withRim(g, (q) => {
      NM.figLucien(q, 1120, 1010, 820, { dir: -1, kneel: 1, armF: [2.3, 0.1], armB: [1.9, 0.2], expr: 'plead', yaw: 0.3, headTilt: -0.25 }, t);
      NM.figIsolde(q, 760, 1010, 900, { dir: 1, armF: [0.3, 0.3], armB: [0.2, 0.3], expr: 'cold', yaw: 0.4, headTilt: 0.12, wind: 0.3 }, t);
    }, '#ffcf8a', -1, -0.5, 4, 0.6);
    S.post.extraUI = [(u) => {
      const o1 = range(0.0, 0.25, lt) * (1 - range(1.25, 1.5, lt));
      if (o1 > 0.01) {
        NM.ornateBox(u, 420, 60, 1080, 170, o1);
        NM.drawCameo(u, 520, 145, 58, 68, 'lucien', 'plead', o1);
        NM.uiText(u, 'Lucien', 610, 118, { font: '40px "UnifrakturMaguntia"', color: '#bfe9ff', alpha: o1, shadow: 'rgba(120,180,255,0.6)', blur: 12 });
        NM.uiText(u, 'Please... let me rest.', 610, 184, { alpha: o1 });
      }
      const o2 = range(1.35, 1.6, lt) * (1 - range(2.7, 2.95, lt));
      NM.choiceCard(u, t, 'Release his soul?', ['Let him rest in peace', 'Never. He stays.'], lt > 2.0 ? 1 : 0, o2, lt > 2.45);
    }];
    if (lt > 2.45 && lt < 2.65) S.post.flash = 0.3;
    S.post.grade = { shadow: '#0a0a14', light: '#ffc8a0', amount: 0.35 };
  }, { name: 'p2-choice', in: { type: 'black', dur: 0.2 } });

  NM.shot(68.55, 71.65, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 220, z: -200, f: 900, vy: H * 0.4 });
    NM.interior(g, t, c, 'crypt', {});
    const light = range(0.1, 0.6, lt) * (1 - range(1.9, 2.05, lt));
    const up = ease.outCubic(clamp((lt - 0.6) / 1.1));
    const back = ease.inCubic(clamp((lt - 1.75) / 0.3));
    if (light > 0) { NM.shaft(g, 1180, -40, 260, 1180, 1040, 520, '#fff4e0', 0.45 * light); glow(g, 1180, 300, 600, '#fff4e0', 0.3 * light); }
    let hand;
    NM.withRim(g, (q) => {
      NM.figLucien(q, 1180, 1010, 860, { dir: -1, armF: [0.6 + light * 0.6, 0.3], armB: [0.5 + light * 0.5, 0.3], expr: light > 0.5 ? 'sleep' : 'pain', yaw: 0.2, headTilt: -0.3 * light }, t);
      hand = NM.figIsolde(q, 640, 1010, 860, { dir: 1, armF: lt > 1.45 ? [1.6, 0.0] : [0.3, 0.3], armB: [0.3, 0.3], expr: lt > 1.45 ? 'crazed' : 'cold', glow: lt > 1.45 ? 1 : 0, yaw: 0.4, wind: 0.6 }, t);
    }, light > 0.2 ? '#fff4e0' : '#ffcf8a', 0, -1, 4, 0.7);
    const gy0 = 640 - up * 380 * (1 - back);
    if (up > 0 && back < 1) NM.figGhost(g, 1180, gy0, 520, t, { alpha: 0.8, expr: 'sleep' });
    if (lt > 1.45) NM.chain(g, [hand.hand[0], hand.hand[1], 900, gy0 - 300, 1180, gy0 - 280], 30, { color: '#ff3a52', thick: 6, reveal: clamp((lt - 1.45) / 0.3), glow: 0.9 });
    if (lt > 2.0 && lt < 2.4) { S.post.flash = 0.6 * (1 - (lt - 2.0) / 0.4); S.post.flashColor = '#ff2040'; S.post.shake = 1.4; }
    S.post.grade = { shadow: '#0a0a14', light: '#fff0d8', amount: 0.35 };
  }, { name: 'p2-light' });

  // 71.65 – 74.75 the dossier: his heartbeat slows
  NM.shot(71.65, 74.75, (g, S) => {
    const t = S.t, lt = S.lt;
    // dark desk
    const dg = g.createLinearGradient(0, 0, 0, H); dg.addColorStop(0, '#1a100c'); dg.addColorStop(1, '#0a0605');
    g.fillStyle = dg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(60,40,24,0.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, i * 38 + 10); g.bezierCurveTo(600, i * 38 + 20, 1300, i * 38, W, i * 38 + 14); g.stroke(); }
    glow(g, 1300, 520, 900, '#ffb060', 0.25);
    // parchment page
    g.save(); g.translate(1240, 540); g.rotate(-0.03);
    const pg = g.createRadialGradient(0, 0, 100, 0, 0, 640); pg.addColorStop(0, '#e8d8b4'); pg.addColorStop(0.75, '#c8a878'); pg.addColorStop(1, '#6a4a28');
    g.fillStyle = pg; g.fillRect(-540, -440, 1080, 880);
    for (let i = 0; i < 8; i++) softShade(g, (hash1(i) - 0.5) * 900, (hash1(i * 3) - 0.5) * 700, 60 + hash1(i * 5) * 90, 40 + hash1(i * 7) * 60, '#8a6a40', 0.3);
    g.restore();
    // pinned portrait photograph
    g.save(); g.translate(430, 500); g.rotate(0.05);
    g.fillStyle = '#e8dcc0'; g.fillRect(-300, -380, 600, 760);
    g.save(); g.beginPath(); g.rect(-270, -350, 540, 680); g.clip();
    g.fillStyle = '#2a2a34'; g.fillRect(-270, -350, 540, 680);
    NM.paintLucien(g, 0, -40, 520, lt < 1.6 ? 'hollow' : 'pain', t, { noBlink: false, yaw: 0.15 });
    g.restore();
    g.fillStyle = '#7a0e22'; g.beginPath(); g.arc(0, -360, 14, 0, TAU); g.fill();
    g.restore();
    const rate = lerp(1.6, 0.3, clamp(lt / 3));
    const ph = (lt * rate) % 1;
    S.post.extraUI = [(u) => {
      const ink = '#2a1810';
      NM.uiText(u, 'Lucien Ashgrove', 760, 220, { font: '64px "UnifrakturMaguntia"', color: '#3a0a10', shadow: 'rgba(0,0,0,0)', blur: 0 });
      NM.uiText(u, 'beloved husband  ·  1849 – 1878', 764, 280, { font: 'italic 38px "IM Fell English"', color: ink, shadow: 'rgba(0,0,0,0)', blur: 0 });
      const rows = [['Condition', 'Undead'], ['Soul', 'Bound to Isolde'], ['State', 'Cursed  ·  Puppet'], ['Vitality', '']];
      rows.forEach(([k, v], i) => {
        NM.uiText(u, k, 764, 380 + i * 80, { font: '40px "Cinzel"', color: ink, shadow: 'rgba(0,0,0,0)', blur: 0 });
        NM.uiText(u, v, 1080, 380 + i * 80, { font: 'italic 44px "IM Fell English"', color: i ? '#7a0e22' : ink, shadow: 'rgba(0,0,0,0)', blur: 0 });
      });
      const vit = Math.max(0.02, 0.35 - lt * 0.1);
      u.fillStyle = 'rgba(42,24,16,0.4)'; u.fillRect(1080, 600, 560, 18); u.fillStyle = '#7a0e22'; u.fillRect(1080, 600, 560 * vit, 18);
      NM.uiText(u, 'Heart', 764, 760, { font: '40px "Cinzel"', color: ink, shadow: 'rgba(0,0,0,0)', blur: 0 });
      u.strokeStyle = '#8a0a1e'; u.lineWidth = 4; u.beginPath();
      for (let x = 0; x <= 620; x += 4) {
        const xx = (x / 620 + ph) % 1;
        const yy = xx > 0.47 && xx < 0.53 ? -60 * Math.sin((xx - 0.47) / 0.06 * Math.PI) * (1 - clamp(lt / 3.2)) : 0;
        x ? u.lineTo(1040 + x, 750 + yy) : u.moveTo(1040 + x, 750 + yy);
      }
      u.stroke();
    }];
    S.post.grade = { shadow: '#140a06', light: '#ffd8a8', amount: 0.3 };
  }, { name: 'p2-status', paint: { r: 4 }, in: { type: 'black', dur: 0.2 } });

  // 74.75 – 77.50 the marionette theatre
  NM.shot(74.75, 77.5, (g, S) => {
    const t = S.t, lt = S.lt;
    g.fillStyle = '#080406'; g.fillRect(0, 0, W, H);
    const fg = g.createLinearGradient(0, 760, 0, 920); fg.addColorStop(0, '#4a2a18'); fg.addColorStop(1, '#1a0c06');
    g.fillStyle = fg; g.fillRect(240, 760, 1440, 160);
    for (let x = 240; x < 1680; x += 96) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x, 760, 3, 160); }
    NM.shaft(g, 960, -40, 200, 960, 800, 900, '#fff0d8', 0.32);
    softShade(g, 960, 770, 460, 70, '#fff0d8', 0.45, 'screen');
    // on every beat the strings yank him up into a new pose; he drops and lands with a thud
    const PP = [
      { aF: [1.7, -0.6], aB: [1.2, -0.5], lF: [0.4, -0.3], lB: [-0.2, 0.5], ht: 0.35 },
      { aF: [2.6, -0.2], aB: [0.4, -0.6], lF: [1.0, -1.2], lB: [-0.1, 0.2], ht: 0.1 },
      { aF: [0.6, -0.8], aB: [2.4, -0.3], lF: [-0.1, 0.3], lB: [0.9, -1.0], ht: 0.55 },
      { aF: [2.2, 0.4], aB: [2.2, 0.4], lF: [0.6, -0.8], lB: [0.6, -0.8], ht: -0.1 },
    ];
    const pp = NM.poseAt(t, NM.T.beats, PP, 0, 18, 7);
    const bi = NM.lastIndexBefore(NM.T.beats, t), kb = bi >= 0 ? t - NM.T.beats[bi] : 1;
    const lift = kb < 0.3 ? Math.sin((kb / 0.3) * Math.PI) * 70 : 0, land = NM.impact(kb, 0.3, 0.22);
    const bob = lift - land * 10;
    const pose = { dir: 1, armF: pp.aF, armB: pp.aB, legF: pp.lF, legB: pp.lB, headTilt: pp.ht + land * 0.25, expr: 'hollow', yaw: 0.2, idle: 0 };
    let lp;
    NM.withRim(g, (q) => { q.save(); NM.squash(q, 944, 770, land * 0.08); lp = NM.figLucien(q, 944, 770 - bob, 620, pose, t); q.restore(); }, '#fff0d8', 0, -1, 4, 0.8);
    if (land > 0) NM.particles(g, kb - 0.3, { n: 16, seed: 23 + bi, kind: 'dot', x: 820, y: 740, w: 260, h: 30, vx: 0, vy: -90, drift: 30, size: [2, 5], color: '#8a6a4a', alpha: land });
    const side = bi % 2 ? 1 : -1;
    const bx = 960 + side * 50 * (1 - Math.exp(-kb * 8)) + Math.sin(t * 2.5) * 20, by = 70 - lift * 0.6 + Math.sin(t * 5) * 6;
    const knees = [[lp.chest[0] - 24, 770 - bob - 140], [lp.chest[0] + 40, 770 - bob - 120]];
    const ends = [lp.hand2, lp.hand, lp.head, ...knees].sort((a, b) => a[0] - b[0]);
    g.strokeStyle = 'rgba(255,240,220,0.75)'; g.lineWidth = 2;
    ends.forEach(([x, y], i) => { g.beginPath(); g.moveTo(bx - 176 + i * 88, by + 24); g.lineTo(x, y); g.stroke(); });
    const bg2 = g.createLinearGradient(0, by, 0, by + 24); bg2.addColorStop(0, '#8a5a30'); bg2.addColorStop(1, '#3a2010');
    g.fillStyle = bg2; g.fillRect(bx - 200, by, 400, 24); g.fillRect(bx - 16, by - 48, 32, 112);
    // velvet curtains
    for (const side of [-1, 1]) {
      const cx0 = 960 + side * 960, cx1 = 960 + side * 640;
      const cg = g.createLinearGradient(cx1, 0, cx0, 0);
      cg.addColorStop(0, '#5a0a16'); cg.addColorStop(0.5, '#a3122a'); cg.addColorStop(1, '#3a040c');
      g.fillStyle = cg;
      g.beginPath(); g.moveTo(cx0, 0); g.lineTo(cx1, 0); g.quadraticCurveTo(960 + side * 600, 480, 960 + side * 784, 920); g.lineTo(cx0, 920); g.closePath(); g.fill();
      for (let k = 0; k < 5; k++) { g.strokeStyle = k % 2 ? 'rgba(20,0,4,0.45)' : 'rgba(255,90,110,0.18)'; g.lineWidth = 22; g.beginPath(); g.moveTo(960 + side * (680 + k * 60), 0); g.quadraticCurveTo(960 + side * (640 + k * 60), 480, 960 + side * (800 + k * 34), 920); g.stroke(); }
    }
    g.fillStyle = '#3a040c'; g.fillRect(0, 0, W, 50);
    for (let x = 0; x < W; x += 64) { g.fillStyle = '#5a0a16'; g.beginPath(); g.arc(x + 32, 50, 32, 0, Math.PI); g.fill(); }
    NM.withRim(g, (q) => {
      NM.paintHand(q, bx - 170, by - 95, 200, Math.PI / 2 + 0.12, { kind: 'glove', curl: 0.75, spread: 0.1, arm: 110, armW: 26, sleeve: '#0e0b14', sleeveHi: '#4a3a5e', cuff: 'lace', ring: '#ff3a52', light: -1 });
      NM.paintHand(q, bx + 170, by - 95, 200, Math.PI / 2 - 0.12, { kind: 'glove', flip: true, curl: 0.75, spread: 0.1, arm: 110, armW: 26, sleeve: '#0e0b14', sleeveHi: '#4a3a5e', cuff: 'lace', light: -1 });
    }, '#fff0d8', 0, -1, 3, 0.6);
    S.post.shake = land * 0.6;
    S.post.grade = { shadow: '#14040a', light: '#fff0d8', amount: 0.3 };
  }, { name: 'p2-puppet', in: { type: 'black', dur: 0.2 } });

  NM.shot(77.5, 78.15, (g, S) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const lt = S.lt;
    if (lt < 0.3) { const k = 1 - lt / 0.3; glow(g, 960, 520, 220, '#ff2040', 0.7 * k); glow(g, 960, 520, 60, '#ff6070', k); }
    S.post.ui = 'none';
  }, { name: 'p2-drop' });
})();
