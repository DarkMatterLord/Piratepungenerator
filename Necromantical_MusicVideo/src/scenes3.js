// Necromantical (painted) — scenes 1:18–2:06  (Chorus 2, Danse Macabre, Interlude, Bridge)
'use strict';
(function () {
  const { clamp, lerp, range, ease, TAU, W, H, glow, hash1, rgba } = NM;
  const softShade = (...a) => NM.softShade(...a);
  const BONE = '#e2d8c6';

  // ===================== helpers =====================
  // painted skull in three-quarter view, anchored on the eye line (hs = figure head size)
  NM.skullHead = function (g, x, y, hs, dir, t, o = {}) {
    const r = hs * 0.36;
    g.save(); g.translate(x, y); g.scale(dir, 1); g.rotate(o.tilt || 0);
    const sg = g.createRadialGradient(r * 0.1, -r * 0.7, r * 0.1, -r * 0.1, -r * 0.2, r * 1.5);
    sg.addColorStop(0, '#fbf4e6'); sg.addColorStop(0.5, o.bone || BONE); sg.addColorStop(1, '#5a4e42');
    g.fillStyle = sg;
    g.beginPath(); g.ellipse(-r * 0.12, -r * 0.4, r * 1.05, r * 1.0, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-r * 0.5, r * 0.1); g.quadraticCurveTo(r * 0.7, -r * 0.1, r * 0.92, -r * 0.25); g.lineTo(r * 0.88, r * 0.5); g.quadraticCurveTo(r * 0.5, r * 0.78, -r * 0.05, r * 0.7); g.closePath(); g.fill();
    // jaw
    g.save(); g.translate(-r * 0.4, r * 0.32); g.rotate((o.jaw || 0) * 0.35);
    g.beginPath(); g.moveTo(0, -r * 0.05); g.lineTo(r * 0.12, r * 0.7); g.quadraticCurveTo(r * 0.7, r * 0.95, r * 1.18, r * 0.62); g.lineTo(r * 1.14, r * 0.38); g.quadraticCurveTo(r * 0.7, r * 0.52, r * 0.32, r * 0.3); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,30,24,0.8)'; for (let k = 0; k < 5; k++) g.fillRect(r * (0.5 + k * 0.13), r * 0.36, r * 0.035, r * 0.18);
    g.restore();
    // sockets, nose, teeth
    g.fillStyle = '#0a0608';
    g.beginPath(); g.ellipse(r * 0.46, -r * 0.04, r * 0.27, r * 0.3, 0.2, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(-r * 0.12, -r * 0.04, r * 0.19, r * 0.28, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(r * 0.3, r * 0.2); g.lineTo(r * 0.18, r * 0.44); g.lineTo(r * 0.38, r * 0.44); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,30,24,0.85)'; for (let k = 0; k < 6; k++) g.fillRect(r * (-0.02 + k * 0.14), r * 0.55, r * 0.035, r * 0.2);
    softShade(g, -r * 0.55, r * 0.25, r * 0.55, r * 0.5, '#2a2018', 0.5);
    softShade(g, r * 0.2, -r * 0.85, r * 0.6, r * 0.3, '#ffffff', 0.3, 'source-over');
    if (o.eyeGlow) { NM.glow(g, r * 0.46, -r * 0.04, r * 0.8, '#ff2a44', 0.8); NM.glow(g, -r * 0.12, -r * 0.04, r * 0.6, '#ff2a44', 0.6); }
    g.restore();
  };
  const LADY = [
    { dress: '#2a1418', dressMid: '#4a1e26', dressHi: '#8a4a50', lace: '#b8a898', veil: 'rgba(200,190,170,0.28)' },
    { dress: '#14182a', dressMid: '#26304a', dressHi: '#5a6a8a', lace: '#b8b8c8', veil: 'rgba(190,200,220,0.28)' },
    { dress: '#1e1a14', dressMid: '#3a3020', dressHi: '#7a6a48', lace: '#c8b898', veil: 'rgba(210,200,170,0.28)' },
    { dress: '#3a3848', dressMid: '#6a6880', dressHi: '#c8c4d8', lace: '#e8e4f0', veil: 'rgba(225,220,245,0.45)' },
  ];
  NM.skelLady = function (g, x, y, s, pose, t, o = {}) {
    const C = Object.assign({ skin: BONE, glove: BONE }, LADY[(o.v || 0) % LADY.length]);
    const r = NM.figIsolde(g, x, y, s, pose, t, { noHead: true, handColor: BONE, colors: C, seed: 3 + (o.v || 0) });
    NM.skullHead(g, r.head[0], r.head[1], 14.5 * s / 100, pose.dir ?? 1, t, { eyeGlow: o.eyeGlow, jaw: o.jaw ?? 0.3 + 0.3 * Math.sin(t * 7), tilt: pose.headTilt });
    return r;
  };
  NM.skelGent = function (g, x, y, s, pose, t, o = {}) {
    const r = NM.figLucien(g, x, y, s, pose, t, { noHead: true, colors: { skin: BONE, coat: '#16121a', coatMid: '#2a2430', coatHi: '#5a5060', shirt: '#b8b0a0' } });
    NM.skullHead(g, r.head[0], r.head[1], 15 * s / 100, pose.dir ?? 1, t, { eyeGlow: o.eyeGlow, jaw: o.jaw ?? 0.2 + 0.3 * Math.sin(t * 6 + 1), tilt: pose.headTilt });
    return r;
  };
  // a couple turning about their centre; A, B: (q, x, y, s, pose, t) => figure
  NM.dancePair = function (q, cx, gy, s, t, spin, A, B) {
    const sx = Math.cos(spin);
    q.save(); q.translate(cx, 0); q.scale(Math.abs(sx) < 0.12 ? 0.12 * Math.sign(sx || 1) : sx, 1); q.translate(-cx, 0);
    const pb = { dir: -1, lean: 0.12, armF: [1.0, 0.9], armB: [1.55, -0.25], legF: [0.3 * Math.sin(t * 5), -0.1], legB: [-0.3 * Math.sin(t * 5), 0.25], yaw: 0.45 };
    const pa = { dir: 1, lean: 0.1, armF: [2.05, 0.55], armB: [1.55, -0.25], twirl: 0.7 + 0.3 * Math.sin(t * 2), wind: 1, yaw: 0.45, headTilt: -0.1 };
    if (Math.sin(spin) > 0) { A(q, cx - 0.1 * s, gy, s * 0.93, pa, t); B(q, cx + 0.12 * s, gy, s, pb, t); }
    else { B(q, cx + 0.12 * s, gy, s, pb, t); A(q, cx - 0.1 * s, gy, s * 0.93, pa, t); }
    q.restore();
  };
  const lady = (v, eg) => (q, x, y, s, p, t) => NM.skelLady(q, x, y, s, p, t, { v, eyeGlow: eg });
  const gent = (eg) => (q, x, y, s, p, t) => NM.skelGent(q, x, y, s, p, t, { eyeGlow: eg });

  // the ballroom with its chandelier; returns the chandelier's screen point
  function ballroom(g, t, c, o = {}) {
    NM.interior(g, t, c, 'ballroom', { red: o.red });
    const Z = o.chZ ?? 1100;
    const ch = NM.P3(c, 0, 640, Z), fl = NM.P3(c, 0, 0, Z);
    softShade(g, fl.x, fl.y, 1000 * fl.k, 260 * fl.k, o.red ? '#ff4060' : '#ffc890', 0.3 * (o.lit ?? 1), 'screen');
    NM.paintChandelier(g, ch.x, ch.y, ch.k, t, o.lit ?? 1, o.red);
    return ch;
  }
  NM.ballroomP = ballroom;

  // full-screen crazed face (jump-scare)
  function scareFace(g, t, lt, o = {}) {
    g.fillStyle = o.bg || '#1a0004'; g.fillRect(0, 0, W, H);
    glow(g, W / 2, H * 0.45, 1000, '#a3122a', o.bg ? 0.25 : 0.5);
    const z = 1 + lt * 0.1;
    NM.paintIsolde(g, W / 2 + Math.sin(t * 37) * 8, 430, 980 * z, 'crazed', t, { noBlink: true, yaw: 0, light: 0.2, e: { bloodTear: clamp(lt * 2), look: [Math.sin(t * 13) * 0.3, 0] } });
    for (let i = 0; i < 26; i++) { const y = hash1(i * 7 + Math.floor(t * 20)) * H; g.fillStyle = 'rgba(224,16,42,0.22)'; g.fillRect(0, y, W, 2 + hash1(i) * 5); }
  }
  NM.scareFaceP = scareFace;

  // throne room: rose window, pillars, the throne (returns seat anchor)
  function throneRoom(g, t, o = {}) {
    const x = o.x ?? W / 2, y = o.y ?? 880, k = o.k ?? 1;
    NM.skyGrad(g, [[0, '#0c0608'], [0.6, '#1e1016'], [1, '#2a1a20']]);
    NM.roseWindow(g, o.wx ?? W / 2, 250, 240, t, { glow: 0.45, glowColor: '#a8353a', colors: ['#7c2630', '#a8353a', '#561d25', '#d0554f', '#4a2a38'], frame: '#0e0608', rot: t * 0.02 });
    NM.shaft(g, o.wx ?? W / 2, 250, 300, x, y, 900, '#ff8a7a', 0.14);
    for (const px of [150, W - 150]) {
      const pg = g.createLinearGradient(px - 90, 0, px + 90, 0); pg.addColorStop(0, '#0a0608'); pg.addColorStop(0.6, '#2a1c22'); pg.addColorStop(1, '#0a0608');
      g.fillStyle = pg; g.fillRect(px - 90, 0, 180, H);
    }
    const fg = g.createLinearGradient(0, 820, 0, H); fg.addColorStop(0, '#2a1418'); fg.addColorStop(1, '#0a0406');
    g.fillStyle = fg; g.fillRect(0, 820, W, H - 820);
    g.fillStyle = '#4a0a14'; g.beginPath(); g.moveTo(x - 160 * k, 840); g.lineTo(x + 160 * k, 840); g.lineTo(x + 520, H); g.lineTo(x - 520, H); g.closePath(); g.fill();
    // throne
    g.save(); g.translate(x, y); g.scale(k, k);
    const tg = g.createLinearGradient(-200, 0, 200, 0); tg.addColorStop(0, '#0e0608'); tg.addColorStop(0.55, '#3a1a20'); tg.addColorStop(1, '#0c0406');
    g.fillStyle = tg;
    g.beginPath(); g.moveTo(-190, 0); g.lineTo(-190, -560); g.lineTo(-150, -640); g.lineTo(-110, -580); g.lineTo(-60, -700); g.lineTo(0, -620); g.lineTo(0, -780); g.lineTo(0, -620); g.lineTo(60, -700); g.lineTo(110, -580); g.lineTo(150, -640); g.lineTo(190, -560); g.lineTo(190, 0); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-14, -620); g.lineTo(0, -800); g.lineTo(14, -620); g.closePath(); g.fill();
    const vg = g.createLinearGradient(-130, 0, 130, 0); vg.addColorStop(0, '#3a040c'); vg.addColorStop(0.5, '#8a1424'); vg.addColorStop(1, '#2a0208');
    g.fillStyle = vg; g.beginPath(); NM.archPath(g, 0, -260, 250, 340); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(-80 + (i % 4) * 54, -520 + Math.floor(i / 4) * 90, 5, 0, TAU); g.fill(); }
    g.strokeStyle = '#a8853a'; g.lineWidth = 5; g.beginPath(); NM.archPath(g, 0, -260, 250, 340); g.stroke();
    // seat + arm rests
    g.fillStyle = '#1a0a0e'; g.fillRect(-210, -270, 420, 50); g.fillRect(-200, -220, 40, 220); g.fillRect(160, -220, 40, 220);
    g.fillStyle = '#5a0a16'; g.fillRect(-180, -290, 360, 30);
    g.strokeStyle = '#a8853a'; g.lineWidth = 3; g.strokeRect(-210, -270, 420, 50);
    for (const sx of [-1, 1]) { g.fillStyle = '#a8853a'; g.beginPath(); g.arc(sx * 190, -580, 12, 0, TAU); g.fill(); g.beginPath(); g.arc(sx * 200, -275, 16, 0, TAU); g.fill(); }
    g.restore();
    // floor candelabras
    for (const [cx, cy, s0] of [[x - 420 * k, 860, 1], [x + 420 * k, 860, 1], [300, 960, 1.4], [W - 300, 960, 1.4]]) {
      g.strokeStyle = '#6a5030'; g.lineWidth = 6 * s0; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 200 * s0); g.stroke();
      g.beginPath(); g.moveTo(cx - 50 * s0, cy - 200 * s0); g.quadraticCurveTo(cx, cy - 170 * s0, cx + 50 * s0, cy - 200 * s0); g.stroke();
      for (const dx of [-50, 0, 50]) NM.paintCandle(g, cx + dx * s0, cy - 200 * s0 - (dx ? 0 : 20 * s0), 1.2 * s0, t, cx + dx);
    }
    return { x, seatY: y - 290 * k, k };
  }

  // anatomical heart (painted), centred at 0,0, ~200 px tall at s=1
  function paintHeart(g, s, t, o = {}) {
    g.save(); g.scale(s, s);
    // great vessels
    const tube = (pts, w, c1, c2) => { g.lineCap = 'round'; g.strokeStyle = c1; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0], pts[1]); g.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); g.stroke(); g.strokeStyle = c2; g.lineWidth = w * 0.4; g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1; };
    tube([-10, -60, -14, -110, 40, -150, 60, -96], 34, '#8a1a24', '#d05060');
    tube([20, -66, 22, -110, 30, -130, 36, -140], 22, '#6a0a14', '#b04050');
    tube([-34, -50, -50, -90, -56, -110, -60, -128], 20, '#3a2a5a', '#7a6aa0');
    tube([60, -96, 80, -70, 90, -60, 96, -40], 20, '#8a1a24', '#c04858');
    // body
    const hg = g.createRadialGradient(-30, -20, 10, 0, 10, 130);
    hg.addColorStop(0, '#e0606a'); hg.addColorStop(0.35, '#a8222e'); hg.addColorStop(0.8, '#5a0a14'); hg.addColorStop(1, '#2a0408');
    g.fillStyle = hg;
    g.beginPath(); g.moveTo(10, 120); g.bezierCurveTo(-60, 80, -100, 10, -76, -40); g.bezierCurveTo(-60, -76, -10, -80, 10, -56); g.bezierCurveTo(40, -84, 96, -66, 96, -14); g.bezierCurveTo(98, 40, 50, 90, 10, 120); g.closePath(); g.fill();
    // coronary vessels
    g.strokeStyle = 'rgba(60,10,30,0.8)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(8, -50); g.bezierCurveTo(-8, 0, 20, 40, 6, 100); g.moveTo(8, -30); g.quadraticCurveTo(50, -10, 70, 30); g.moveTo(-6, 10); g.quadraticCurveTo(-40, 20, -56, 50); g.stroke();
    g.strokeStyle = 'rgba(255,200,180,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, -46); g.bezierCurveTo(-6, 0, 22, 40, 8, 98); g.stroke();
    softShade(g, -40, -30, 28, 18, '#ffffff', 0.4, 'source-over');
    softShade(g, 50, 60, 60, 50, '#000000', 0.45);
    g.restore();
  }
  NM.paintHeart = paintHeart;

  // ======================================================================
  // CHORUS 2  78.15 – 90.40
  // ======================================================================
  NM.shot(78.15, 79.45, (g, S) => {
    scareFace(g, S.t, S.lt);
    S.post.extraUI = [(u) => NM.titleSlamUI(u, S.lt, 190)];
    S.post.shake = S.lt < 0.4 ? 1.6 : 0.4; S.post.chroma = clamp(1 - S.lt); S.post.glitch = clamp(0.8 - S.lt);
    S.post.grade = { shadow: '#2a0008', light: '#ffb0b0', amount: 0.3 };
  }, { name: 'c2-scare', paint: { r: 4 }, in: { type: 'red', dur: 0.3 } });

  // 79.45 – 81.45 the ballroom ignites
  NM.shot(79.45, 81.45, (g, S) => {
    const t = S.t, lt = S.lt;
    const lit = ease.outCubic(range(0.1, 0.8, lt));
    const c = NM.cam3({ x: 0, y: 170, z: -60 + lt * 60, f: 950, vy: H * 0.4 });
    ballroom(g, t, c, { lit: 0.15 + 0.85 * lit, chZ: 800 });
    g.fillStyle = rgba('#05020a', 0.6 * (1 - lit)); g.fillRect(0, 0, W, H);
    const p = NM.P3(c, 0, 0, 480);
    NM.withRim(g, (q) => {
      NM.figIsolde(q, p.x - 50 * p.k, p.y, 172 * p.k, { dir: 1, armF: [1.3, 0.5], armB: [0.2, 0.3], expr: 'tender', yaw: 0.5, wind: 0.3 }, t);
      NM.figLucien(q, p.x + 50 * p.k, p.y, 185 * p.k, { dir: -1, armF: [1.1, 0.6], armB: [0.2, 0.3], expr: 'hollow', yaw: 0.5 }, t);
    }, '#ffcf8a', 0, -1, 3, 0.35 + 0.45 * lit);
    NM.particles(g, t, { n: 60, seed: 77, kind: 'dot', vx: 0, vy: -30, drift: 40, size: [1, 2.4], color: '#ffd8a0', alpha: 0.5 * lit });
    if (lt > 0.1 && lt < 0.35) { S.post.flash = 0.25 * (1 - (lt - 0.1) / 0.25); S.post.flashColor = '#ffcf8a'; }
    S.post.grade = { shadow: '#120608', light: '#ffc890', amount: 0.35 };
  }, { name: 'c2-ignite', in: { type: 'black', dur: 0.15 } });

  // 81.45 – 84.45 "Entangled deep in shadows steep" — the waltz, shadows stretching across the floor
  NM.shot(81.45, 84.45, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: Math.sin(lt * 0.7) * 50, y: 150, z: 120 + lt * 30, f: 1000, vy: H * 0.38 });
    ballroom(g, t, c, { chZ: 950 });
    const p = NM.P3(c, 0, 0, 560), s = 175 * p.k, spin = t * 2.8;
    g.save(); g.globalAlpha = 0.45; g.translate(0, p.y); g.scale(1, -0.3); g.translate(0, -p.y);
    NM.silhouette(g, '#0a0406', (q) => NM.waltz(q, p.x, p.y, s, t, spin));
    g.restore();
    NM.withRim(g, (q) => NM.waltz(q, p.x, p.y, s, t, spin, { iexpr: 'smirk' }), '#ffcf8a', 0, -1, 3, 0.6);
    const R = 0.42 * s, cy0 = p.y - 0.62 * s, pts = [];
    for (let k = 0; k <= 30; k++) { const a = k / 30 * TAU + spin; pts.push(p.x + Math.cos(a) * R, cy0 + Math.sin(a) * R * 0.22 + Math.sin(k * 0.8 + t * 3) * 6); }
    NM.chain(g, pts, 0.04 * s, { color: '#ff3a52', thick: 0.008 * s, glow: 0.6 });
    NM.particles(g, t, { n: 50, seed: 78, kind: 'dot', vx: 6, vy: -10, drift: 30, size: [1, 2.2], color: '#ffe0b0', alpha: 0.45, twinkle: 2 });
    S.post.grade = { shadow: '#140608', light: '#ffc890', amount: 0.35 };
  }, { name: 'c2-waltz', in: { type: 'black', dur: 0.15 } });

  // 84.45 – 87.45 "I drink your cries, each lifeless sigh"
  NM.shot(84.45, 87.45, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#12060c'], [1, '#3a1018']]);
    for (let i = 0; i < 26; i++) { const x = hash1(i * 3) * W, y = hash1(i * 5) * H * 0.85; glow(g, x + Math.sin(t * 0.3 + i) * 20, y, 30 + hash1(i * 7) * 70, i % 3 ? '#ffb060' : '#ff4060', 0.2 + 0.2 * hash1(i * 9)); }
    glow(g, 960, 560, 700, '#7a0e22', 0.4);
    const drift = lt * 14;
    const lx = 520 + drift, ix = 1400 - drift;
    NM.paintLucien(g, lx, 470, 600, lt < 1.6 ? 'pain' : 'sleep', t, { yaw: 0.5, noBlink: true, light: 0.6 });
    NM.paintIsolde(g, ix, 450, 620, 'hungry', t, { yaw: -0.5, noBlink: true, light: -0.6 });
    const ax = lx + 0.11 * 600, ay = 470 + 0.3 * 600, bx = ix - 0.11 * 620, by = 450 + 0.3 * 620;
    g.save(); g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 16; i++) {
      const k = (lt * 0.7 + i / 16) % 1;
      const x = lerp(ax, bx, k), y = lerp(ay, by, k) - Math.sin(k * Math.PI) * 110 + Math.sin(t * 4 + i) * 12;
      glow(g, x, y, 26 + 34 * Math.sin(k * Math.PI), '#b9e6ff', 0.5 * Math.sin(k * Math.PI));
    }
    g.restore();
    S.post.grade = { shadow: '#14040a', light: '#ffc0c8', amount: 0.3 };
  }, { name: 'c2-sigh', paint: { r: 4 }, in: { type: 'fade', dur: 0.25 } });

  // 87.45 – 90.40 "A tragic love that will not die" — spinning silhouettes before the rose window
  NM.shot(87.45, 90.4, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0e0709'], [1, '#2a1014']]);
    g.fillStyle = '#0a0406'; g.beginPath(); g.arc(960, 400, 430, 0, TAU); g.fill();
    NM.roseWindow(g, 960, 400, 380, t, { rot: t * 0.05, glow: 0.55, glowColor: '#d0554f', colors: ['#7c2630', '#a8353a', '#561d25', '#d0554f', '#ec8a7a'], frame: '#140608' });
    NM.shaft(g, 960, 400, 640, 960, H, 1500, '#ec8a7a', 0.16);
    const fg = g.createLinearGradient(0, 860, 0, H); fg.addColorStop(0, '#3a1418'); fg.addColorStop(1, '#0a0406');
    g.fillStyle = fg; g.fillRect(0, 860, W, H - 860);
    softShade(g, 960, 900, 700, 60, '#ff9a8a', 0.35, 'screen');
    const spin = t * 2.4;
    NM.withRim(g, (q) => NM.silhouette(q, '#0c0507', (r) => NM.waltz(r, 960, 905, 760, t, spin)), '#ffb0a0', 0, -1, 6, 0.85);
    NM.particles(g, t, { n: 60, seed: 41, kind: 'petal', vx: -40, vy: 70, drift: 40, size: [7, 13], alpha: 0.95 });
    S.post.grade = { shadow: '#14040a', light: '#ffb0a0', amount: 0.3 };
  }, { name: 'c2-spin', in: { type: 'fade', dur: 0.3 } });

  // ======================================================================
  // INSTRUMENTAL BREAK — DANSE MACABRE  90.40 – 101.45
  // ======================================================================
  const SPOTS = [[-470, 640], [450, 700], [-260, 1000], [280, 960], [-560, 1300], [560, 1260], [0, 1450], [-200, 1700], [240, 1850]];
  function danceFloor(g, t, c, spawn0, o = {}) {
    const items = [];
    SPOTS.forEach(([X, Z], i) => {
      const born = spawn0 === null ? 1 : clamp((t - spawn0 - i * 0.25) * 3);
      if (born <= 0) return;
      items.push({ Z, draw: () => {
        const p = NM.P3(c, X, 0, Z), s = 175 * p.k;
        g.save(); g.globalAlpha = born;
        NM.dancePair(g, p.x, p.y, s, t + i * 0.37, t * (o.speed ?? 2.4) + i * 1.1, lady(i, true), gent(i % 2 === 0));
        g.restore();
        if (born < 1) glow(g, p.x, p.y - s * 0.5, s * 0.9, '#c9bcc0', 0.7 * (1 - born));
      } });
    });
    if (o.couple) items.push({ Z: o.couple.Z, draw: () => { const p = NM.P3(c, 0, 0, o.couple.Z); NM.withRim(g, (q) => NM.waltz(q, p.x, p.y, 175 * p.k, t, t * (o.speed ?? 2.4), { iexpr: 'crazed' }), '#ff8a8a', 0, -1, 3, 0.6); } });
    items.sort((a, b) => b.Z - a.Z).forEach((it) => it.draw());
  }

  // 90.40 – 93.40 the dead arrive at the ball
  NM.shot(90.4, 93.4, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 240, z: 40 + lt * 40, f: 760, vy: H * 0.36 });
    const red = NM.beat(t, 6) > 0.4;
    ballroom(g, t, c, { red, chZ: 1300 });
    danceFloor(g, t, c, 90.6, { couple: { Z: 560 } });
    S.post.shake = NM.downbeat(t, 8) > 0.6 ? 0.8 : 0;
    S.post.grade = { shadow: '#14040a', light: '#ffb0a0', amount: 0.35 };
  }, { name: 'br-arrive', in: { type: 'black', dur: 0.2 } });

  // 93.40 – 95.60 the danse macabre procession past the windows
  NM.shot(93.4, 95.6, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.paintSky(g, t, { top: '#0e0709', mid: '#3a0e16', low: '#8a2a30', moon: { x: 1460, y: 250, r: 150, blood: 0.85 }, stars: 0, clouds: 0.5, cloudDark: '#1a0608', cloudLight: '#ff8a8a', speed: 14 });
    // the wall with tall gothic windows
    g.fillStyle = '#12060a'; g.beginPath(); g.rect(0, 0, W, H);
    for (const x of [240, 720, 1200, 1680]) NM.archPath(g, x, 840, 300, 700);
    g.fill('evenodd');
    g.strokeStyle = '#2a1014'; g.lineWidth = 10;
    for (const x of [240, 720, 1200, 1680]) { g.beginPath(); g.moveTo(x, 200); g.lineTo(x, 840); g.moveTo(x - 150, 520); g.lineTo(x + 150, 520); g.stroke(); }
    const fg = g.createLinearGradient(0, 840, 0, H); fg.addColorStop(0, '#2a1014'); fg.addColorStop(1, '#070304');
    g.fillStyle = fg; g.fillRect(0, 840, W, H - 840);
    const scroll = (lt * 300) % 520;
    NM.withRim(g, (q) => {
      for (let i = -1; i < 5; i++) {
        const x = i * 520 + scroll - 60, ph = t * 4.2 + i, bob = Math.abs(Math.sin(ph)) * 10;
        NM.skelGent(q, x, 915 - bob, 560, { dir: 1, lean: 0.1, legF: [0.5 * Math.sin(ph), -0.3], legB: [-0.5 * Math.sin(ph), 0.4], armF: [2.3 + Math.sin(ph) * 0.3, 0.5], armB: [1.4, -0.4], yaw: 0.4 }, t + i, { eyeGlow: true });
        NM.skelLady(q, x + 170, 915 - bob, 520, { dir: -1, twirl: 0.6, wind: 1, armF: [2.2, 0.5], armB: [1.5, -0.3], yaw: 0.4 }, t + i, { v: i + 4, eyeGlow: true });
      }
    }, '#ff6a6a', 0, -1, 5, 0.85);
    g.fillStyle = 'rgba(40,0,8,0.35)'; g.fillRect(0, 0, W, H);
    NM.particles(g, t, { n: 40, seed: 51, kind: 'petal', vx: -60, vy: 40, drift: 20, size: [6, 11], alpha: 0.85 });
    S.post.grade = { shadow: '#14040a', light: '#ff9a9a', amount: 0.35 };
  }, { name: 'br-procession', in: { type: 'black', dur: 0.15 } });

  // 95.60 – 97.80 the whirl: hard cuts on the downbeats
  NM.shot(95.6, 97.8, (g, S) => {
    const t = S.t;
    const cut = NM.lastIndexBefore(NM.T.beats, t) % 3;
    if (cut === 0) {
      g.save(); g.translate(W / 2, H / 2); g.rotate(Math.sin(t * 1.7) * 0.08); g.scale(1.12, 1.12); g.translate(-W / 2, -H / 2);
      const c = NM.cam3({ x: Math.sin(t) * 120, y: 230, z: 120, f: 900, vy: H * 0.36 });
      ballroom(g, t, c, { red: true, chZ: 1300 });
      danceFloor(g, t, c, null, { couple: { Z: 520 }, speed: 3.4 });
      g.restore();
    } else if (cut === 1) {
      NM.skyGrad(g, [[0, '#14040a'], [1, '#3a0a14']]);
      glow(g, 960, 300, 900, '#ff3a52', 0.35);
      for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + t * 1.5; g.strokeStyle = 'rgba(255,90,110,0.12)'; g.lineWidth = 40; g.beginPath(); g.moveTo(960, 300); g.lineTo(960 + Math.cos(a) * 1600, 300 + Math.sin(a) * 1600); g.stroke(); }
      NM.withRim(g, (q) => NM.dancePair(q, 960, 1180, 1050, t, t * 3.4, lady(3, true), gent(true)), '#ff8a8a', 0, -1, 5, 0.7);
    } else {
      NM.skyGrad(g, [[0, '#1a0408'], [1, '#4a0a14']]);
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU - t * 2; g.strokeStyle = i % 2 ? 'rgba(255,60,90,0.14)' : 'rgba(0,0,0,0.3)'; g.lineWidth = 70; g.beginPath(); g.moveTo(960, 520); g.lineTo(960 + Math.cos(a) * 1800, 520 + Math.sin(a) * 1800); g.stroke(); }
      NM.paintIsolde(g, 960, 420, 760, 'crazed', t, { yaw: Math.sin(t * 3) * 0.3, noBlink: true, light: 0.3, tilt: Math.sin(t * 2.3) * 0.12 });
    }
    S.post.flash = NM.beat(t, 12) * 0.25; S.post.flashColor = '#ff2040';
    S.post.grade = { shadow: '#14040a', light: '#ffb0a0', amount: 0.35 };
  }, { name: 'br-whirl' });

  // 97.80 – 100.00 the mirror shows what she has become
  NM.shot(97.8, 100.0, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#05050a'], [1, '#1b1b30']]);
    glow(g, 1240, 470, 700, '#4a4a8a', 0.3);
    const mx = 1250, my = 470, rx = 330, ry = 430;
    const fr = g.createLinearGradient(mx - rx, my - ry, mx + rx, my + ry); fr.addColorStop(0, '#f0d080'); fr.addColorStop(0.5, '#8a6a30'); fr.addColorStop(1, '#3a2a10');
    g.fillStyle = fr; g.beginPath(); g.ellipse(mx, my, rx + 40, ry + 40, 0, 0, TAU); g.fill();
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.fillStyle = i % 2 ? '#c8a050' : '#6a4a20'; g.beginPath(); g.arc(mx + Math.cos(a) * (rx + 40), my + Math.sin(a) * (ry + 40), 18, 0, TAU); g.fill(); }
    g.fillStyle = '#1a1a30'; g.beginPath(); g.ellipse(mx, my, rx, ry, 0, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.ellipse(mx, my, rx, ry, 0, 0, TAU); g.clip();
    glow(g, mx - 80, my - 160, 400, '#7d73b5', 0.4);
    NM.skelLady(g, mx + 30, my + 560, 900, { dir: -1, wind: 0.3, armF: [1.0, 0.6], armB: [0.2, 0.3], yaw: 0.45 }, t, { v: 3, eyeGlow: lt > 1.4, jaw: lt > 1.4 ? 0.8 : 0.1 });
    const ck = range(1.4, 1.6, lt);
    if (ck > 0) {
      g.strokeStyle = '#e8e4ff'; g.lineWidth = 2.5;
      const R0 = NM.rng(7);
      for (let i = 0; i < 12; i++) { let x = mx - 40, y = my - 60; g.beginPath(); g.moveTo(x, y); const a = R0() * TAU; for (let k = 0; k < 7 * ck; k++) { x += Math.cos(a + (R0() - 0.5)) * 60; y += Math.sin(a + (R0() - 0.5)) * 60; g.lineTo(x, y); } g.stroke(); }
    }
    const sh = g.createLinearGradient(mx - rx, my - ry, mx + rx, my); sh.addColorStop(0, 'rgba(255,255,255,0.12)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(mx - rx, my - ry, rx * 2, ry * 2);
    g.restore();
    NM.paintCandle(g, 860, 760, 1.6, t, 3);
    NM.withRim(g, (q) => NM.figIsolde(q, 470, 1120, 1020, { dir: 1, wind: 0.2, armF: [lt > 1.4 ? 0.6 : 1.0, 0.6], armB: [0.2, 0.3], expr: lt > 1.4 ? 'shock' : 'cold', yaw: 0.5 }, t), '#b8b0ff', 1, -0.3, 4, 0.7);
    if (lt > 1.4 && lt < 1.7) { S.post.flash = 0.5; S.post.flashColor = '#d6cdf0'; S.post.shake = 1.6; }
    S.post.grade = { shadow: '#06060e', light: '#c8c0ff', amount: 0.35 };
  }, { name: 'br-mirror', in: { type: 'black', dur: 0.2 } });

  // 100.00 – 101.45 glitch jump-scare, then black
  NM.shot(100.0, 101.45, (g, S) => {
    const lt = S.lt;
    if (lt < 1.1 && Math.floor(S.t * 15) % 4 !== 0) { scareFace(g, S.t, lt, { bg: '#000' }); S.post.glitch = 0.9; S.post.chroma = 1; S.post.shake = 2; }
    else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
    S.post.ui = 'none';
  }, { name: 'br-scare', paint: { r: 4 } });

  // ======================================================================
  // INTERLUDE  101.45 – 113.75
  // ======================================================================
  // 101.45 – 104.60 "To love is sweet, to own divine" — the throne
  NM.shot(101.45, 104.6, (g, S) => {
    const t = S.t, lt = S.lt;
    const z = 1 + lt * 0.025;
    g.save(); g.translate(W / 2, 600); g.scale(z, z); g.translate(-W / 2, -600);
    const th = throneRoom(g, t, { x: W / 2, y: 900, k: 1.05 });
    const breathe = Math.sin(t * 1.5) * 0.04;
    NM.withRim(g, (q) => {
      NM.figIsolde(q, th.x - 10, 900, 640, { dir: 1, sit: 1, armF: [1.75 + breathe, 0.2], armB: [0.6, 0.6], expr: lt < 1.6 ? 'tender' : 'smirk', yaw: 0.4, wind: 0.1, headTilt: 0.1 }, t);
      NM.figLucien(q, th.x + 300, 975, 640, { dir: -1, kneel: 1, lean: 0.5, headTilt: 0.65, armF: [1.2, 0.8], armB: [0.4, 0.5], expr: 'sleep', yaw: 0.3 }, t);
    }, '#ff9a8a', 0, -1, 4, 0.6);
    g.restore();
    S.post.grade = { shadow: '#14040a', light: '#ffb8a0', amount: 0.35 };
  }, { name: 'in-throne', in: { type: 'black', dur: 0.5 } });

  // 104.60 – 107.70 ITEM GET — the heart locket
  NM.shot(104.6, 107.7, (g, S) => {
    const t = S.t, lt = S.lt;
    const bg = g.createRadialGradient(960, 560, 50, 960, 560, 1100); bg.addColorStop(0, '#3a0c16'); bg.addColorStop(1, '#070204');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { g.strokeStyle = i % 2 ? 'rgba(0,0,0,0.35)' : 'rgba(255,90,110,0.06)'; g.lineWidth = 120; g.beginPath(); g.moveTo(i * 260 - 200, 0); g.quadraticCurveTo(i * 240 + 100, 540, i * 260 - 100, H); g.stroke(); }
    const open = ease.outBack(clamp((lt - 0.4) / 0.6));
    const lx = 960, ly = 560, s = 230;
    NM.chain(g, [lx, ly - s * 0.62, lx - 200, 200, lx - 420, -40], 22, { color: '#b08850', thick: 5, highlight: '#f8e0a0' });
    NM.chain(g, [lx, ly - s * 0.62, lx + 200, 200, lx + 420, -40], 22, { color: '#b08850', thick: 5, highlight: '#f8e0a0' });
    const heart = (q) => { q.beginPath(); q.moveTo(0, s * 0.62); q.bezierCurveTo(-s * 1.0, -s * 0.05, -s * 0.6, -s * 0.85, 0, -s * 0.36); q.bezierCurveTo(s * 0.6, -s * 0.85, s * 1.0, -s * 0.05, 0, s * 0.62); q.closePath(); };
    g.save(); g.translate(lx, ly);
    heart(g); const ig = g.createLinearGradient(-s, -s, s, s); ig.addColorStop(0, '#c8a050'); ig.addColorStop(1, '#4a3010'); g.fillStyle = ig; g.fill();
    g.scale(0.88, 0.88); heart(g); g.fillStyle = '#1a0a10'; g.fill();
    g.restore();
    if (open > 0.05) {
      const fl = 0.85 + 0.15 * Math.sin(t * 8);
      glow(g, lx, ly - 10, 260 * open * fl, '#b9e6ff', 0.8 * open);
      g.save(); g.globalAlpha = 0.55 * open; NM.paintLucien(g, lx, ly - 70, 150, 'sleep', t, { body: false, noBlink: true, P: { skin: '#cfe8f6', skinLight: '#ffffff', skinShadow: '#6f8fae', skinDeep: '#2a4060', hair: ['#4a6a8a', '#5a7a9a', '#6a8aaa', '#8aaacc'] } }); g.restore();
      NM.flame(g, lx, ly + 80, 150 * open, t, 3, { color: '#b9e6ff', glowColor: '#b9e6ff', base: 'rgba(120,180,255,0.6)', glowR: 3, glowA: 0.5 });
    }
    // the lid swings open on its left hinge
    const sc = 1 - open * 1.9;
    g.save(); g.translate(lx - s * 0.78, ly); g.scale(sc, 1); g.translate(s * 0.78, 0);
    heart(g);
    const lg = g.createLinearGradient(-s, -s, s, s);
    if (sc > 0) { lg.addColorStop(0, '#fbe6a0'); lg.addColorStop(0.45, '#d0a050'); lg.addColorStop(1, '#5a3a14'); }
    else { lg.addColorStop(0, '#8a6a30'); lg.addColorStop(1, '#3a2408'); }
    g.fillStyle = lg; g.fill();
    g.strokeStyle = '#4a3010'; g.lineWidth = 6; g.stroke();
    if (sc > 0) {
      g.strokeStyle = 'rgba(90,60,20,0.6)'; g.lineWidth = 3;
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.beginPath(); g.arc(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.22 - s * 0.05, s * 0.18, a, a + 2.4); g.stroke(); }
      NM.paintRose(g, 0, -s * 0.05, s * 0.2, 0, t);
      softShade(g, -s * 0.4, -s * 0.4, s * 0.3, s * 0.18, '#ffffff', 0.5, 'source-over');
    }
    g.restore();
    NM.particles(g, t, { n: 40, seed: 61, kind: 'glow', x: 660, y: 250, w: 600, h: 500, vy: -30, drift: 20, size: [2, 4], color: '#b9e6ff', alpha: 0.7 * open });
    const ba = range(0.9, 1.1, lt);
    S.post.extraUI = [(u) => NM.itemBanner(u, t, 'Obtained  [Lucien\'s Soul]', ba, (q, x, y) => { glow(q, x, y, 40, '#b9e6ff', 0.8); NM.flame(q, x, y + 18, 40, t, 5, { color: '#b9e6ff', glowColor: '#b9e6ff', base: 'rgba(120,180,255,0.6)', glowR: 2, glowA: 0.4 }); })];
    if (lt > 0.9 && lt < 1.1) { S.post.flash = 0.3; S.post.flashColor = '#d8f0ff'; }
    S.post.grade = { shadow: '#14040a', light: '#ffe0b0', amount: 0.3 };
  }, { name: 'in-item', paint: { r: 4 }, in: { type: 'black', dur: 0.25 } });

  // 107.70 – 110.70 "I wield your will, I bend your breath"
  NM.shot(107.7, 110.7, (g, S) => {
    const t = S.t, lt = S.lt;
    const th = throneRoom(g, t, { x: 640, y: 900, k: 0.95, wx: 960 });
    const gest = Math.sin(lt * 2.2) * 0.5, gest2 = Math.sin((lt - 0.2) * 2.2) * 0.5;
    let iso, luc;
    NM.withRim(g, (q) => {
      iso = NM.figIsolde(q, th.x - 10, 900, 600, { dir: 1, sit: 1, armF: [1.9 + gest, 0.2 + gest * 0.4], armB: [0.6, 0.6], expr: 'smirk', yaw: 0.45, glow: 0.8, wind: 0.1 }, t);
      luc = NM.figLucien(q, 1300 + Math.sin(lt * 1.1) * 40, 930, 720, { dir: -1, lean: 0.1 + gest2 * 0.2, armF: [1.6 + gest2, 0.3 - gest2 * 0.5], armB: [1.3 - gest2, 0.4], legF: [0.2 + gest2 * 0.3, -0.1], legB: [-0.15, 0.2], headTilt: 0.2 - gest2 * 0.3, expr: lt < 1.5 ? 'pain' : 'hollow', yaw: 0.35 }, t);
    }, '#ff9a8a', 0, -1, 4, 0.6);
    const reveal = clamp(lt / 0.5);
    for (const tgt of [luc.hand, luc.hand2, luc.head]) NM.chain(g, [iso.hand[0], iso.hand[1], (iso.hand[0] + tgt[0]) / 2, Math.min(iso.hand[1], tgt[1]) - 120, tgt[0], tgt[1]], 16, { color: '#ff3a52', thick: 3, reveal, glow: 0.7 });
    g.save(); g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 9; i++) { const k = (t * 0.6 + i / 9) % 1; glow(g, lerp(luc.head[0] - 30, iso.head[0] + 30, k), lerp(luc.head[1] + 50, iso.head[1] + 40, k) - Math.sin(k * Math.PI) * 80, 24, '#f2ece6', 0.5 * Math.sin(k * Math.PI)); }
    g.restore();
    S.post.grade = { shadow: '#14040a', light: '#ffb8a0', amount: 0.35 };
  }, { name: 'in-wield', in: { type: 'black', dur: 0.2 } });

  // 110.70 – 113.75 "A captive heart, enslaved in death" — the heart in a gilded cage
  NM.shot(110.7, 113.75, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0e0709'], [1, '#35151b']]);
    const b = NM.beat(t, 7);
    glow(g, 960, 560, 700, '#ff2040', 0.2 + b * 0.3);
    const sw = Math.sin(t * 1.4) * 0.04;
    g.save(); g.translate(960, -40); g.rotate(sw);
    const cy = 600, R = 300;
    NM.chain(g, [0, 0, 0, cy - R - 40], 26, { color: '#8a6a30', thick: 6, highlight: '#f0d090' });
    const bar = (x, back) => { const top = cy - Math.sqrt(Math.max(0, R * R - x * x)); g.strokeStyle = back ? '#5a4018' : '#d8b060'; g.lineWidth = back ? 6 : 9; g.beginPath(); g.moveTo(x, top); g.lineTo(x, cy + 280); g.stroke(); if (!back) { g.strokeStyle = 'rgba(255,240,200,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 2, top + 4); g.lineTo(x - 2, cy + 276); g.stroke(); } };
    for (let k = -6; k <= 6; k++) bar(k * 48 + 24, true);
    g.strokeStyle = '#5a4018'; g.lineWidth = 8; g.beginPath(); g.arc(0, cy, R, Math.PI, 0); g.stroke();
    // the heart, beating
    const hs = 1.35 * (1 + b * 0.1);
    glow(g, 0, cy + 70, 320, '#ff2040', 0.15 + b * 0.25);
    g.save(); g.translate(0, cy + 70); paintHeart(g, hs, t); g.restore();
    NM.chain(g, [-R + 20, cy - 20, 0, cy + 120, R - 20, cy - 20], 26, { color: '#ff3a52', thick: 5, glow: 0.7 });
    NM.chain(g, [-R + 30, cy + 200, 0, cy + 10, R - 30, cy + 200], 26, { color: '#ff3a52', thick: 5, glow: 0.7 });
    for (let k = -6; k <= 6; k++) bar(k * 48, false);
    const rg = g.createLinearGradient(0, cy + 270, 0, cy + 320); rg.addColorStop(0, '#f0d080'); rg.addColorStop(1, '#5a3a14');
    g.fillStyle = rg; g.beginPath(); g.ellipse(0, cy + 290, R + 30, 40, 0, 0, TAU); g.fill();
    g.strokeStyle = '#d8b060'; g.lineWidth = 9; g.beginPath(); g.ellipse(0, cy + 80, R, 34, 0, 0, Math.PI); g.stroke();
    g.fillStyle = '#d8b060'; g.beginPath(); g.arc(0, cy - R - 20, 26, 0, TAU); g.fill();
    g.restore();
    // blood drips
    for (let i = 0; i < 5; i++) { const k = (t * 0.7 + i * 0.23) % 1; g.fillStyle = '#8a0a1e'; g.beginPath(); g.ellipse(930 + i * 16, 820 + k * 260, 5, 9, 0, 0, TAU); g.fill(); }
    S.post.grade = { shadow: '#14040a', light: '#ffb0a0', amount: 0.3 };
  }, { name: 'in-heart', in: { type: 'fade', dur: 0.3 } });

  // ======================================================================
  // BRIDGE  113.75 – 126.05
  // ======================================================================
  // 113.75 – 116.75 "They call me vile, a villain's creed" — the torch mob climbs the hill
  NM.shot(113.75, 116.75, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.manorScene(g, t, { x: 1450, y: 600, scale: 0.55, lit: [1, 4, 7], moonX: 420 });
    const hill = (x) => 640 + (x / W) * 260 - Math.sin(x * 0.003) * 30;
    g.fillStyle = '#0c0a12'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 20) g.lineTo(x, hill(x) + 120); g.lineTo(W, H); g.closePath(); g.fill();
    const road = g.createLinearGradient(0, 700, 0, H); road.addColorStop(0, 'rgba(70,56,60,0.6)'); road.addColorStop(1, 'rgba(30,24,28,0.9)');
    g.fillStyle = road; g.beginPath(); g.moveTo(1380, 620); g.lineTo(1420, 620); g.lineTo(700, H); g.lineTo(200, H); g.closePath(); g.fill();
    glow(g, 900, 860, 800, '#ff7a2a', 0.3);
    const mob = [];
    for (let i = 0; i < 16; i++) {
      const f = ((i * 0.13 + lt * 0.05) % 1);
      const x = lerp(260, 1340, f) + (hash1(i * 3) - 0.5) * 220 * (1 - f), y = lerp(1080, 640, f) + (hash1(i * 7) - 0.5) * 40;
      mob.push({ x, y, s: lerp(460, 70, f), i });
    }
    mob.sort((a, b) => a.y - b.y).forEach((m) => NM.figMob(g, m.x, m.y, m.s, t + m.i, 20 + m.i, { dir: 1, tool: m.i % 3 === 2 ? 'fork' : 'torch', rim: '#ff9a4a' }));
    NM.particles(g, t, { n: 90, seed: 91, kind: 'dot', x: 0, y: 300, w: W, h: 780, vx: 20, vy: -70, drift: 30, size: [1.2, 3], color: '#ffb060', alpha: 0.7 });
    NM.paintFog(g, t, 560, 300, 0.3, '#5a3a3a', 20);
    S.post.grade = { shadow: '#08060e', light: '#ffb070', amount: 0.35 };
  }, { name: 'br-mob', in: { type: 'black', dur: 0.3 } });

  // 116.75 – 119.85 "But love demands the darkest deed" — skill cut-in
  NM.shot(116.75, 119.85, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0a0004'], [1, '#2a0008']]);
    NM.sigil(g, W / 2, H * 0.5, 520 + lt * 60, t, 1, { squash: 1, width: 2.4, alpha: 0.5, color: '#ff2a44', runes: 36, glowA: 0.3 });
    NM.cutInP(g, t, lt / 3.1, (q, y0) => {
      const slide = ease.outCubic(clamp(lt * 2.5));
      NM.paintIsolde(q, lerp(2400, 1340, slide), y0 + 330, 780, lt < 1.5 ? 'cold' : 'crazed', t, { noBlink: true, yaw: -0.3, light: 0.5 });
    });
    S.post.extraUI = [(u) => {
      const slide = ease.outCubic(clamp(lt * 2.5)), open = clamp(lt * 4) * (1 - clamp((lt / 3.1 - 0.86) / 0.14));
      if (open <= 0.05) return;
      NM.uiText(u, 'Raise the Dead', lerp(-500, 120, slide), 410, { font: '140px "UnifrakturMaguntia"', color: '#ffd0d0', alpha: range(0.3, 0.7, lt) * open, shadow: 'rgba(255,40,70,0.8)', blur: 30 });
      NM.uiText(u, 'Necromancy  ·  Lv. MAX', lerp(-500, 150, slide), 490, { font: 'italic 54px "IM Fell English"', color: '#f0b8b8', alpha: range(0.3, 0.7, lt) * open });
    }];
    S.post.shake = lt < 0.3 ? 1.2 : 0;
  }, { name: 'br-cutin', paint: { r: 4 } });

  // 119.85 – 122.10 "I took your life, yet set you free" — a negative flash of the crash, then his eyes open
  NM.shot(119.85, 122.1, (g, S) => {
    const t = S.t, lt = S.lt;
    if (lt < 0.9) {
      g.fillStyle = '#ffd6da'; g.fillRect(0, 0, W, H);
      NM.silhouette(g, '#1a0004', (q) => {
        NM.horse(q, 1480, 820, 620, t, { rear: 1, speed: 2 });
        NM.carriage(q, 560, 820 + lt * 180, 600, t, { brokenWheel: true, rot: 0.4 + lt * 1.6, lantern: 0 });
        q.fillRect(0, 820, W, H - 820);
      });
      S.post.glitch = 0.6; S.post.chroma = 0.8; S.post.shake = 1;
      S.post.grade = null;
    } else {
      g.fillStyle = '#060204'; g.fillRect(0, 0, W, H);
      const k = clamp((lt - 1.0) / 0.6);
      NM.paintLucien(g, 960, 470, 1900, 'hollow', t, { noBlink: true, yaw: 0, light: 0.2, e: { lid: 1 - ease.outCubic(k) * 0.95, glow: k, pupil: 0.4 }, P: { eyeGlow: '#ff2040', iris: ['#3a0a14', '#c4122f', '#ff5a6e'] } });
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, W, H);
      S.post.grade = { shadow: '#0a0408', light: '#ff9aa0', amount: 0.35 };
    }
  }, { name: 'br-flash', paint: { r: 4 } });

  // 122.10 – 125.45 "In chains of night, you're bound to me" — the dead rise, the mob flees
  NM.shot(122.1, 125.45, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.manorScene(g, t, { x: W / 2, y: 640, scale: 0.85, lit: [1, 4, 7, 10, 12], blood: 1 });
    glow(g, W / 2, 610, 360, '#ff2040', 0.45);
    NM.withRim(g, (q) => { NM.figIsolde(q, W / 2 - 22, 660, 130, { dir: 1, armF: [1.9, 0.2], glow: 1, expr: 'crazed' }, t); NM.figLucien(q, W / 2 + 26, 660, 140, { dir: -1, expr: 'hollow' }, t); }, '#ff4060', 0, -1, 2, 0.8);
    NM.chain(g, [W / 2 - 4, 610, W / 2 + 4, 630, W / 2 + 22, 600], 6, { color: '#ff3a52', thick: 1.5, glow: 0.7 });
    const gy = (x) => 790 + Math.sin(x * 0.004) * 16;
    g.fillStyle = '#0e0a10'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 20) g.lineTo(x, gy(x)); g.lineTo(W, H); g.closePath(); g.fill();
    // the mob turns and flees
    const flee = clamp((lt - 1.2) / 2);
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1, x0 = W / 2 + side * (180 + (i >> 1) * 120);
      const x = x0 + side * ease.inQuad(flee) * 900, y = 800 + (i % 3) * 18 + flee * 60;
      NM.figMob(g, x, y, 190 + (i % 3) * 20 + flee * 80, t * (flee > 0 ? 1.8 : 1) + i, 40 + i, { dir: flee > 0 ? side : -side, tool: i % 3 === 2 ? 'fork' : 'torch', rim: '#ff7a3a', still: flee <= 0 });
    }
    // the dead claw up out of the earth
    const risers = [[160, 1010, 520], [520, 1060, 560], [880, 1100, 600], [1180, 1080, 580], [1500, 1040, 540], [1780, 1000, 500], [340, 940, 380], [1640, 930, 380]];
    risers.sort((a, b) => a[1] - b[1]).forEach(([x, y, s], i) => {
      const k = ease.outCubic(clamp((lt - 0.15 - i * 0.14) / 0.9));
      if (k <= 0) return;
      g.save(); g.beginPath(); g.rect(0, 0, W, y - 30); g.clip();
      const up = (1 - k) * s * 0.9, pose = { dir: x < W / 2 ? 1 : -1, armF: [2.6 - k * 0.6, 0.4], armB: [2.3, 0.3], legF: [0.1, 0], legB: [-0.1, 0], headTilt: 0.3 - k * 0.3, yaw: 0.3 };
      if (i % 3 === 1) NM.figSkeleton(g, x, y + up, s, Object.assign({ eyeGlow: true }, pose), t);
      else NM.skelGent(g, x, y + up, s, pose, t + i, { eyeGlow: true });
      g.restore();
      if (k < 1) NM.particles(g, k, { n: 18, seed: 70 + i, kind: 'dot', x: x - 120, y: y - 60, w: 240, h: 40, vy: -160, size: [3, 7], color: '#2a1a12', alpha: 1 - k });
      g.fillStyle = '#140c0c'; g.beginPath(); g.ellipse(x, y - 28, s * 0.32, s * 0.05, 0, 0, TAU); g.fill();
    });
    S.post.shake = lt < 1.0 ? 0.8 : 0;
    S.post.grade = { shadow: '#08040c', light: '#ff9a8a', amount: 0.35 };
  }, { name: 'br-rise', in: { type: 'black', dur: 0.15 } });

  // 125.45 – 126.05 dropout: a single eye opens in the dark
  NM.shot(125.45, 126.05, (g, S) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const k = ease.outCubic(clamp((S.lt - 0.08) / 0.4));
    g.save(); g.beginPath(); g.ellipse(W / 2, H / 2, 560, 230 * k + 1, 0, 0, TAU); g.clip();
    NM.paintIsolde(g, W / 2 + 330, H / 2, 2500, 'crazed', S.t, { noBlink: true, yaw: 0, light: 0.2 });
    g.restore();
    S.post.ui = 'none';
  }, { name: 'br-eye', paint: { r: 4 } });
})();
