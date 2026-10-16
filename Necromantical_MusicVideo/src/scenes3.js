// Necromantical — scenes 1:18–2:06  (Chorus 2, Danse Macabre break, Interlude, Bridge)
'use strict';
(function () {
  const { clamp, lerp, range, ease, TAU, W, H, C, glow, hash1, noise1 } = NM;
  const T = 16;

  // ---------- ballroom map scene ----------
  function ballroomScene(g, S, opt = {}) {
    const t = S.t;
    const m = NM.MAPS.ballroom;
    const cam = opt.cam || { x: Math.round(m.center.x - W / 2), y: Math.round(m.center.y - H / 2 - 10) };
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    // moonlight from the tall windows
    for (const o of m.objects) if (o.type === 'window') NM.shaft(g, o.x, o.y - 4, 14, o.x + 24, o.y + 150, 44, '#9a92b8', 0.1);
    const items = NM.propItems(g, m, t);
    for (const c of opt.chars || []) items.push({ y: c.y, draw: (q) => NM.drawChar(q, c.name, c.x, c.y, c.dir, c.frame, { alpha: c.alpha, clipBottom: c.clip }) });
    if (opt.items) opt.items(items);
    NM.drawSorted(g, items);
    if (opt.after) opt.after(g);
    const lit = opt.chandelier ?? 1;
    NM.CH_RED = !!opt.red;
    NM.chandelier(g, m.center.x, m.center.y - 46, t, lit, 34);
    g.restore();
    const lights = [{ x: m.center.x - cam.x, y: m.center.y - 30 - cam.y, r: 60 + 150 * lit, color: opt.red ? '#ff2040' : '#ffb347', ca: 0.08 * lit, flicker: true }];
    for (const o of m.objects) if (o.type === 'candelabra') lights.push({ x: o.x - cam.x, y: o.y - 24 - cam.y, r: 50, flicker: true });
    if (opt.lights) lights.push(...opt.lights(cam));
    NM.darkness(g, lights, opt.dark ?? 0.62, '#0a0608', t);
    return cam;
  }
  NM.ballroomScene = ballroomScene;

  // zoom helper: render fn into a buffer, show a 2x crop centred at (cx, cy) in screen space
  function zoom2(g, fn, cx = W / 2, cy = H / 2) {
    const buf = NM._zoomBuf || (NM._zoomBuf = NM.canvas(W, H));
    const bg = buf.getContext('2d'); bg.setTransform(1, 0, 0, 1, 0, 0); bg.fillStyle = '#000'; bg.fillRect(0, 0, W, H);
    fn(bg);
    g.imageSmoothingEnabled = false;
    g.drawImage(buf, clamp(cx - W / 4, 0, W / 2), clamp(cy - H / 4, 0, H / 2), W / 2, H / 2, 0, 0, W, H);
  }
  NM.zoom2 = zoom2;

  // full-screen crazed face (jump-scare cut-in)
  function scareFace(g, t, lt, opt = {}) {
    g.fillStyle = opt.bg || '#1a0004'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { const y = hash1(i * 7 + Math.floor(t * 20)) * H; g.fillStyle = 'rgba(224,16,42,0.25)'; g.fillRect(0, y, W, 1); }
    const z = 1 + lt * 0.12;
    g.save(); g.translate(240, 120); g.scale(z, z);
    NM.isoldeFace(g, 0, 10, 300, 'crazed', t, 0, { noBlink: true, bloodTear: clamp(lt * 2), look: [Math.sin(t * 13) * 0.3, 0] });
    g.restore();
  }
  NM.scareFace = scareFace;

  // ======================================================================
  // CHORUS 2  78.15 – 90.40
  // ======================================================================
  NM.shot(78.15, 79.45, (g, S) => {
    scareFace(g, S.t, S.lt);
    g.save(); g.globalAlpha = range(0.15, 0.3, S.lt);
    g.font = '52px "UnifrakturMaguntia"'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#000';
    g.strokeText('Necromantical', 240, 186); g.fillStyle = '#ffd6da'; g.fillText('Necromantical', 240, 186);
    g.restore();
    S.post.shake = S.lt < 0.4 ? 3 : 1; S.post.chroma = clamp(1 - S.lt); S.post.glitch = clamp(0.8 - S.lt);
  }, { pal: 'scare', name: 'c2-scare', in: { type: 'red', dur: 0.3 } });

  // 79.45 – 81.45 the ballroom ignites
  NM.shot(79.45, 81.45, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.ballroom;
    const c = m.center;
    ballroomScene(g, S, { chandelier: range(0.1, 0.35, lt), dark: 0.66,
      chars: [{ name: 'isolde', x: c.x - 10, y: c.y + 10, dir: 'right', frame: 1 }, { name: 'lucien', x: c.x + 12, y: c.y + 10, dir: 'left', frame: 1 }],
      after: (q) => { if (lt > 0.6) NM.balloon(q, 'heart', c.x - 10, c.y - 20, 1, t); } });
  }, { pal: 'ballroom', name: 'c2-ignite' });

  // 81.45 – 84.45 "Entangled deep in shadows steep" — the waltz (2x)
  NM.shot(81.45, 84.45, (g, S) => {
    const t = S.t;
    const m = NM.MAPS.ballroom, c = m.center;
    zoom2(g, (q) => {
      const th = t * 2.8;
      const pI = { x: c.x + Math.cos(th) * 13, y: c.y + 10 + Math.sin(th) * 8 }, pL = { x: c.x - Math.cos(th) * 13, y: c.y + 10 - Math.sin(th) * 8 };
      const face = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'; };
      const fr = [0, 1, 2, 1][Math.floor(t * 6) % 4];
      ballroomScene(q, S, { dark: 0.55, chars: [{ name: 'isolde', ...pI, dir: face(pI, pL), frame: fr }, { name: 'lucien', ...pL, dir: face(pL, pI), frame: fr }],
        items: (items) => items.push({ y: c.y - 100, draw: (qq) => {
          // long entangled shadows cast by the chandelier
          qq.save(); qq.globalAlpha = 0.45; qq.fillStyle = '#0a0608';
          for (const p of [pI, pL]) { qq.beginPath(); qq.moveTo(p.x - 4, p.y); qq.lineTo(p.x + 4, p.y); qq.lineTo(p.x + (p.x - c.x) * 3 + 4, p.y + 40); qq.lineTo(p.x + (p.x - c.x) * 3 - 4, p.y + 40); qq.fill(); }
          qq.restore();
        } }),
        after: (qq) => NM.chain(qq, [pI.x, pI.y - 14, c.x, c.y - 10, pL.x, pL.y - 18], 4, { color: '#ff3a52', thick: 1, glow: 0.5 }) });
    }, W / 2, H / 2 + 6);
  }, { pal: 'ballroom', name: 'c2-waltz', in: { type: 'black', dur: 0.15 } });

  // 84.45 – 87.45 "I drink your cries, each lifeless sigh" — close faces, his breath drawn into her
  NM.shot(84.45, 87.45, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#1a0a14'], [1, '#3a1418']]);
    glow(g, 240, 120, 160, '#7a0e22', 0.5);
    const drift = lt * 4;
    NM.lucienFace(g, 150 + drift, 132, 200, lt < 1.5 ? 'pain' : 'sleep', t, 0.62, { noBlink: true });
    NM.isoldeFace(g, 336 - drift, 120, 205, 'hungry', t, -0.62, { noBlink: true });
    // the stolen sigh: pale wisps flow from his lips to hers
    for (let i = 0; i < 9; i++) {
      const k = ((lt * 0.8 + i / 9) % 1);
      const x = lerp(186 + drift, 300 - drift, k), y = lerp(184, 172, k) - Math.sin(k * Math.PI) * 18 + Math.sin(t * 4 + i) * 3;
      glow(g, x, y, 10 + 6 * Math.sin(k * Math.PI), '#b9e6ff', 0.6 * Math.sin(k * Math.PI));
    }
  }, { pal: 'portrait', name: 'c2-sigh', in: { type: 'fade', dur: 0.25 } });

  // 87.45 – 90.40 "A tragic love that will not die" — spinning silhouettes before the rose window
  NM.shot(87.45, 90.4, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0e0709'], [1, '#35151b']]);
    NM.roseWindow(g, 240, 96, 84, t, { rot: t * 0.05, glow: 0.5, glowColor: '#d0554f', colors: ['#7c2630', '#a8353a', '#561d25', '#d0554f', '#ec8a7a'] });
    NM.shaft(g, 240, 100, 160, 240, 230, 320, '#ec8a7a', 0.18);
    g.fillStyle = '#1f0e12'; g.fillRect(0, 196, W, 80);
    const spin = t * 2.4;
    const sx = Math.cos(spin);
    NM.silhouette(g, '#0e0709', (s) => {
      s.save(); s.translate(240, 0); s.scale(Math.abs(sx) < 0.15 ? 0.15 * Math.sign(sx || 1) : sx, 1); s.translate(-240, 0);
      NM.figLucien(s, 252, 198, 130, { dir: -1, lean: 0.15, armF: [1.6, 0.9], armB: [1.3, 0.6], legF: [0.35, -0.2], legB: [-0.3, 0.3] }, t);
      NM.figIsolde(s, 228, 198, 120, { dir: 1, lean: 0.1, armF: [1.9, 0.6], armB: [1.6, 0.8], twirl: 0.9, wind: 1.2, headTilt: -0.2 }, t);
      s.restore();
    }, { dx: 1, a: 1 });
    NM.particles(g, t, { n: 34, seed: 41, kind: 'petal', vx: -20, vy: 26, drift: 20, size: [1.4, 2.4], alpha: 0.95 });
  }, { pal: 'blood', name: 'c2-spin', in: { type: 'fade', dur: 0.3 } });

  // ======================================================================
  // INSTRUMENTAL BREAK — DANSE MACABRE  90.40 – 101.45
  // ======================================================================
  function danceFloor(g, S, n, spawn0) {
    const t = S.t;
    const m = NM.MAPS.ballroom, c = m.center;
    const pairs = [];
    const spots = [[-80, -20], [80, -20], [-100, 30], [100, 30], [-50, 62], [50, 62], [0, -44], [-140, -10], [140, -10], [0, 80]];
    for (let i = 0; i < n; i++) {
      const [ox, oy] = spots[i];
      const born = clamp((t - spawn0 - i * 0.28) * 3);
      if (born <= 0) continue;
      const th = t * 2.4 + i * 1.1;
      const a = { x: c.x + ox + Math.cos(th) * 10, y: c.y + oy + Math.sin(th) * 6 }, b = { x: c.x + ox - Math.cos(th) * 10, y: c.y + oy - Math.sin(th) * 6 };
      const face = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'; };
      const fr = [0, 1, 2, 1][Math.floor(t * 6 + i) % 4];
      pairs.push({ name: 'skeleton', ...a, dir: face(a, b), frame: fr, alpha: born });
      pairs.push({ name: i % 3 === 1 ? 'ghost' : 'skeleton', ...b, dir: face(b, a), frame: fr, alpha: born * (i % 3 === 1 ? 0.7 : 1) });
    }
    return pairs;
  }
  // 90.40 – 93.40 the dead arrive at the ball
  NM.shot(90.4, 93.4, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.ballroom, c = m.center;
    const chars = danceFloor(g, S, 8, 90.6);
    chars.push({ name: 'isolde', x: c.x - 10, y: c.y + 12, dir: 'right', frame: [0, 1, 2, 1][Math.floor(t * 6) % 4] }, { name: 'lucien', x: c.x + 10, y: c.y + 12, dir: 'left', frame: [0, 1, 2, 1][Math.floor(t * 6) % 4] });
    ballroomScene(g, S, { chars, red: NM.beat(t, 6) > 0.5, dark: 0.6,
      after: (q) => {
        // puffs of grave-smoke where each dancer appears
        for (let i = 0; i < 8; i++) { const k = (t - 90.6 - i * 0.28) * 3; if (k > 0 && k < 1.2) glow(q, c.x + [-80, 80, -100, 100, -50, 50, 0, -140][i], c.y + [-20, -20, 30, 30, 62, 62, -44, -10][i] - 10, 24, '#c9bcc0', 0.6 * (1.2 - k)); }
      } });
    S.post.shake = NM.downbeat(t, 8) > 0.6 ? 1 : 0;
  }, { pal: 'ballroom', name: 'br-arrive', in: { type: 'black', dur: 0.2 } });

  // 93.40 – 95.60 CG: the danse macabre procession
  NM.shot(93.4, 95.6, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0e0709'], [0.7, '#561d25'], [1, '#7c2630']]);
    NM.moon(g, 380, 70, 50, { blood: 0.6 });
    // tall gothic windows
    for (const x of [80, 160, 320, 400]) { g.fillStyle = '#1f0e12'; g.beginPath(); NM.archPath(g, x, 200, 40, 160); g.closePath(); g.fill(); g.fillStyle = '#7c2630'; g.beginPath(); NM.archPath(g, x, 196, 30, 150); g.closePath(); g.fill(); g.fillStyle = '#1f0e12'; g.fillRect(x - 1, 40, 2, 160); g.fillRect(x - 15, 120, 30, 2); }
    g.fillStyle = '#1f0e12'; g.fillRect(0, 200, W, 80);
    const scroll = (lt * 70) % 120;
    for (let i = -1; i < 6; i++) {
      const x = i * 120 - scroll + 40;
      const bob = Math.abs(Math.sin(t * 4.2 + i)) * 6;
      const ph = t * 4.2 + i;
      NM.figSkeleton(g, x, 202 - bob, 92, { dir: 1, legF: [0.5 * Math.sin(ph), -0.3], legB: [-0.5 * Math.sin(ph), 0.4], armF: [2.2 + Math.sin(ph) * 0.3, 0.6], armB: [1.6, -0.6], eyeGlow: true }, t);
      NM.figSkeleton(g, x + 36, 202 - bob, 88, { dir: -1, legF: [0.5 * Math.sin(ph + 1), -0.3], legB: [-0.5 * Math.sin(ph + 1), 0.4], armF: [2.0, 0.7], armB: [1.4, -0.5] }, t);
    }
    NM.particles(g, t, { n: 20, seed: 51, kind: 'petal', vx: -40, vy: 20, drift: 10, size: [1.2, 2], alpha: 0.8 });
  }, { pal: 'blood', name: 'br-procession', in: { type: 'black', dur: 0.15 } });

  // 95.60 – 97.80 the whirl: quick cuts on the downbeats
  NM.shot(95.6, 97.8, (g, S) => {
    const t = S.t;
    const m = NM.MAPS.ballroom, c = m.center;
    const cut = NM.lastIndexBefore(NM.T.downbeats, t) % 3;
    const chars = danceFloor(g, S, 10, 0);
    const fr = [0, 1, 2, 1][Math.floor(t * 8) % 4];
    const th = t * 3.4;
    const pI = { x: c.x + Math.cos(th) * 12, y: c.y + 12 + Math.sin(th) * 7 }, pL = { x: c.x - Math.cos(th) * 12, y: c.y + 12 - Math.sin(th) * 7 };
    chars.push({ name: 'isolde', ...pI, dir: ['down', 'right', 'up', 'left'][Math.floor(t * 4) % 4], frame: fr }, { name: 'lucien', ...pL, dir: ['up', 'left', 'down', 'right'][Math.floor(t * 4) % 4], frame: fr });
    const centers = [[c.x, c.y], [c.x - 90, c.y], [c.x + 90, c.y + 30]];
    const [fx, fy] = centers[cut];
    zoom2(g, (q) => ballroomScene(q, S, { chars, red: true, dark: 0.55, cam: { x: Math.round(fx - W / 2), y: Math.round(fy - H / 2) } }), W / 2, H / 2 + 8);
    S.post.flash = NM.downbeat(t, 10) * 0.25; S.post.flashColor = '#ff2040';
  }, { pal: 'ballroom', name: 'br-whirl' });

  // 97.80 – 100.00 the mirror shows what she has become
  NM.shot(97.8, 100.0, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#05050a'], [1, '#1b1b33']]);
    // mirror frame
    const mx = 320, my = 110;
    g.fillStyle = '#b08850'; g.beginPath(); g.ellipse(mx, my, 78, 104, 0, 0, TAU); g.fill();
    g.fillStyle = '#e8c070'; g.beginPath(); g.ellipse(mx, my, 74, 100, 0, 0, TAU); g.fill();
    g.fillStyle = '#2a2a4d'; g.beginPath(); g.ellipse(mx, my, 68, 94, 0, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.ellipse(mx, my, 68, 94, 0, 0, TAU); g.clip();
    glow(g, mx - 20, my - 40, 90, '#7d73b5', 0.4);
    // reflection: a skeleton bride in her veil
    NM.figIsolde(g, mx + 6, 214, 150, { dir: -1, wind: 0.3, armF: [0.4, 0.4] }, t, { noHead: true, colors: { dress: '#1b1b33', dressHi: '#3c3a6b', dressRim: '#7d73b5', veil: 'rgba(214,205,240,0.35)' } });
    g.fillStyle = '#e8e2d8'; g.beginPath(); g.ellipse(mx + 2, 214 - 150 * 0.95, 11, 13, 0, 0, TAU); g.fill();
    g.fillStyle = '#07060b'; g.beginPath(); g.ellipse(mx - 3, 214 - 150 * 0.96, 3, 3.6, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(mx + 6, 214 - 150 * 0.96, 3, 3.6, 0, 0, TAU); g.fill();
    glow(g, mx - 3, 214 - 150 * 0.96, 6, '#ff2040', 0.8); glow(g, mx + 6, 214 - 150 * 0.96, 6, '#ff2040', 0.8);
    for (let k = 0; k < 4; k++) g.fillRect(mx - 4 + k * 3, 214 - 150 * 0.9, 1.5, 3);
    // cracks
    const ck = range(1.4, 1.6, lt);
    if (ck > 0) {
      g.strokeStyle = '#d6cdf0'; g.lineWidth = 1;
      const R0 = NM.rng(7);
      for (let i = 0; i < 9; i++) { let x = mx - 10, y = my - 10; g.beginPath(); g.moveTo(x, y); const a = R0() * TAU; for (let k = 0; k < 5 * ck; k++) { x += Math.cos(a + (R0() - 0.5)) * 14; y += Math.sin(a + (R0() - 0.5)) * 14; g.lineTo(x, y); } g.stroke(); }
    }
    g.restore();
    // Isolde before the mirror (from behind, left)
    NM.figIsolde(g, 130, 230, 170, { dir: 1, wind: 0.2, armF: [1.0, 0.6], expr: lt > 1.4 ? 'shock' : 'cold', turn: 0.5 }, t);
    if (lt > 1.4 && lt < 1.7) { S.post.flash = 0.5; S.post.flashColor = '#d6cdf0'; S.post.shake = 2; }
  }, { pal: 'crypt', name: 'br-mirror', in: { type: 'black', dur: 0.2 } });

  // 100.00 – 101.45 glitch jump-scare, then black
  NM.shot(100.0, 101.45, (g, S) => {
    const lt = S.lt;
    if (lt < 1.1) { scareFace(g, S.t, lt, { bg: '#000' }); S.post.glitch = 0.9; S.post.chroma = 1; S.post.shake = 3; }
    else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
    // flicker frames
    if (Math.floor(S.t * 15) % 4 === 0 && lt < 1.1) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
    S.post.ui = 'none';
  }, { pal: 'scare', name: 'br-scare' });

  // ======================================================================
  // INTERLUDE  101.45 – 113.75
  // ======================================================================
  // 101.45 – 104.60 "To love is sweet, to own divine" — the throne
  NM.shot(101.45, 104.6, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0e0709'], [1, '#2a1a24']]);
    NM.roseWindow(g, 240, 70, 60, t, { glow: 0.4, glowColor: '#a8353a', colors: ['#7c2630', '#a8353a', '#561d25', '#d0554f', '#4a2a38'] });
    // throne
    g.fillStyle = '#1f0e12';
    g.beginPath(); g.moveTo(190, 196); g.lineTo(190, 60); g.lineTo(206, 30); g.lineTo(222, 60); g.lineTo(240, 20); g.lineTo(258, 60); g.lineTo(274, 30); g.lineTo(290, 60); g.lineTo(290, 196); g.closePath(); g.fill();
    g.fillStyle = '#561d25'; g.fillRect(202, 70, 76, 80);
    g.strokeStyle = '#a8353a'; g.lineWidth = 2; g.strokeRect(202, 70, 76, 80);
    g.fillStyle = '#1f0e12'; g.fillRect(180, 150, 120, 14); g.fillRect(186, 164, 10, 32); g.fillRect(284, 164, 10, 32);
    g.fillStyle = '#35151b'; g.fillRect(0, 196, W, 80); g.fillStyle = '#4a2a38'; g.fillRect(120, 196, 240, 6);
    // candles
    for (const x of [120, 140, 340, 360]) { g.fillStyle = '#fde4d6'; g.fillRect(x - 2, 176 - (x % 3) * 6, 4, 22); NM.flame(g, x, 176 - (x % 3) * 6, 8, t, x, { color: '#ffcf7a', glowR: 5, glowA: 0.45 }); }
    // Isolde seated, Lucien kneeling with his head in her lap
    const breathe = Math.sin(t * 1.5) * 0.04;
    NM.figLucien(g, 288, 198, 134, { dir: -1, kneel: 1, lean: 0.25, headTilt: 0.28, legF: [1.5, -1.5], legB: [0.15, -1.75], armF: [0.45, 0.5], armB: [0.3, 0.4], expr: 'sleep', turn: 0.5 }, t);
    const iso = NM.figIsolde(g, 232, 196, 128, { dir: 1, sit: 1, armF: [1.84 + breathe, 0.15], armB: [0.6, 0.6], expr: lt < 1.6 ? 'tender' : 'smirk', turn: 0.45, wind: 0.1, headTilt: 0.12 }, t);
  }, { pal: 'blood', name: 'in-throne', in: { type: 'black', dur: 0.5 } });

  // 104.60 – 107.70 "In shadows deep, your soul is mine" — ITEM GET
  NM.shot(104.6, 107.7, (g, S) => {
    const t = S.t, lt = S.lt;
    g.fillStyle = '#0b0709'; g.fillRect(0, 0, W, H);
    glow(g, 240, 112, 140, '#633236', 0.6);
    // heart locket opening
    const open = ease.outBack(clamp((lt - 0.4) / 0.6));
    const lx = 240, ly = 112, s = 46;
    g.strokeStyle = '#b08850'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(lx, ly - s * 0.55); g.quadraticCurveTo(lx - 30, 20, lx - 60, -10); g.moveTo(lx, ly - s * 0.55); g.quadraticCurveTo(lx + 30, 20, lx + 60, -10); g.stroke();
    const heart = (q, sc) => { q.beginPath(); q.moveTo(0, s * 0.55); q.bezierCurveTo(-s * 0.9, -s * 0.05, -s * 0.55, -s * 0.75, 0, -s * 0.32); q.bezierCurveTo(s * 0.55, -s * 0.75, s * 0.9, -s * 0.05, 0, s * 0.55); q.closePath(); };
    // inside (revealed)
    g.save(); g.translate(lx, ly); heart(g); g.fillStyle = '#2e1a1e'; g.fill();
    g.restore();
    if (open > 0.05) {
      const fl = 0.85 + 0.15 * Math.sin(t * 8);
      glow(g, lx, ly - 4, 40 * open * fl, '#b9e6ff', 0.9 * open);
      NM.flame(g, lx, ly + 10, 26 * open, t, 3, { color: '#b9e6ff', glowColor: '#b9e6ff', base: 'rgba(120,180,255,0.6)', glowR: 3, glowA: 0.5 });
    }
    // lid swings open (squashes horizontally to the right)
    g.save(); g.translate(lx + s * 0.62, ly); g.scale(1 - open * 1.9, 1); g.translate(-s * 0.62, 0);
    heart(g); const lg = g.createLinearGradient(-s, -s, s, s); lg.addColorStop(0, '#e8c070'); lg.addColorStop(1, '#83603f'); g.fillStyle = lg; g.fill();
    g.strokeStyle = '#5c4130'; g.lineWidth = 2; g.stroke();
    NM.miniRose(g, 0, 0, 9);
    g.restore();
    NM.particles(g, t, { n: 24, seed: 61, kind: 'glow', x: 160, y: 40, w: 160, h: 130, vy: -10, drift: 10, size: [0.6, 1.2], color: '#b9e6ff', alpha: 0.7 * open });
    S.post.extraUI = [(u) => NM.popup(u, 'Obtained [Lucien\'s Soul]!', range(0.9, 1.05, lt), { y: 12, icon: (q, x, y) => { q.fillStyle = '#e8c070'; q.fillRect(x - 4, y - 3, 3, 3); q.fillRect(x + 1, y - 3, 3, 3); q.fillRect(x - 5, y - 1, 10, 3); q.fillRect(x - 3, y + 2, 6, 2); q.fillRect(x - 1, y + 4, 2, 1); q.fillStyle = '#b9e6ff'; q.fillRect(x - 1, y - 1, 2, 2); } })];
    if (lt > 0.9 && lt < 1.1) S.post.flash = 0.3;
  }, { pal: 'mansion', name: 'in-item', in: { type: 'black', dur: 0.25 } });

  // 107.70 – 110.70 "I wield your will, I bend your breath" — the throne room map, he moves as she gestures
  NM.shot(107.7, 110.7, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.ballroom, th = m.throne, c = m.center;
    const ly = th.y + 34;
    const lKeys = [[107.7, c.x, ly, 'up'], [108.3, c.x, ly, 'up'], [108.7, c.x - 24, ly], [109.1, c.x - 24, ly, 'up'], [109.5, c.x + 24, ly], [109.9, c.x + 24, ly, 'up'], [110.3, c.x, ly], [110.7, c.x, ly, 'up']];
    const luc = NM.walk(t, lKeys, 6);
    zoom2(g, (q) => ballroomScene(q, S, { dark: 0.6, cam: { x: Math.round(c.x - W / 2), y: 0 },
      chars: [{ name: 'isolde', x: th.x, y: th.y + 4, dir: luc.x < th.x - 6 ? 'left' : luc.x > th.x + 6 ? 'right' : 'down', frame: 1 }, { name: 'lucien', ...luc }],
      after: (qq) => {
        NM.chain(qq, [th.x + 6, th.y - 12, (th.x + luc.x) / 2, (th.y + luc.y) / 2 - 20, luc.x, luc.y - 18], 4, { color: '#ff3a52', thick: 1, glow: 0.5 });
        // his breath drifts to her
        for (let i = 0; i < 5; i++) { const k = (t * 0.7 + i / 5) % 1; glow(qq, lerp(luc.x, th.x, k), lerp(luc.y - 22, th.y - 20, k), 5, '#f2ece6', 0.6 * Math.sin(k * Math.PI)); }
        NM.balloon(qq, lt < 1.5 ? 'dots' : 'sweat', luc.x, luc.y - 30, 1, t);
      } }), W / 2, 112);
  }, { pal: 'ballroom', name: 'in-wield', in: { type: 'black', dur: 0.2 } });

  // 110.70 – 113.75 "A captive heart, enslaved in death" — heart in a gilded cage
  NM.shot(110.7, 113.75, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0e0709'], [1, '#35151b']]);
    const sw = Math.sin(t * 1.4) * 0.05;
    g.save(); g.translate(240, -10); g.rotate(sw);
    g.strokeStyle = '#5c4130'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 40); g.stroke();
    // cage
    const cx = 0, cy = 120;
    g.fillStyle = '#2a1a24'; g.fillRect(-60, cy + 60, 120, 8);
    g.strokeStyle = '#b08850'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy - 20, 60, Math.PI, 0); g.stroke();
    for (let k = -5; k <= 5; k++) { const x = k * 11; const top = cy - 20 - Math.sqrt(Math.max(0, 3600 - x * x)); g.beginPath(); g.moveTo(x, top); g.lineTo(x, cy + 60); g.stroke(); }
    g.beginPath(); g.moveTo(-60, cy + 20); g.lineTo(60, cy + 20); g.stroke();
    // anatomical heart, beating on the music
    const b = NM.beat(t, 7);
    const hs = 1 + b * 0.12;
    g.save(); g.translate(cx, cy + 10); g.scale(hs, hs);
    g.fillStyle = '#7c2630';
    g.beginPath(); g.moveTo(-6, -26); g.lineTo(-6, -40); g.lineTo(2, -40); g.lineTo(2, -24); g.fill();
    g.beginPath(); g.moveTo(6, -24); g.quadraticCurveTo(10, -44, 24, -40); g.lineTo(22, -34); g.quadraticCurveTo(14, -36, 13, -22); g.fill();
    g.fillStyle = '#a8353a';
    g.beginPath(); g.moveTo(0, 34); g.bezierCurveTo(-34, 12, -30, -28, -6, -26); g.bezierCurveTo(10, -32, 34, -16, 22, 8); g.quadraticCurveTo(14, 24, 0, 34); g.fill();
    g.strokeStyle = '#561d25'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-4, -20); g.quadraticCurveTo(-12, 0, -2, 26); g.moveTo(8, -18); g.quadraticCurveTo(18, 0, 6, 20); g.stroke();
    g.fillStyle = '#ec8a7a'; g.beginPath(); g.ellipse(-14, -8, 4, 7, 0.4, 0, TAU); g.fill();
    g.restore();
    // chains binding it
    NM.chain(g, [-58, cy - 30, 0, cy + 30, 58, cy - 30], 8, { color: '#ff3a52', thick: 1.6, glow: 0.5 });
    g.restore();
    glow(g, 240, 120, 70, '#ff2040', 0.2 + b * 0.35);
    // blood drips
    for (let i = 0; i < 4; i++) { const k = ((t * 0.8 + i * 0.27) % 1); g.fillStyle = '#a8353a'; g.fillRect(232 + i * 5, 150 + k * 60, 2, 3); }
  }, { pal: 'blood', name: 'in-heart', in: { type: 'fade', dur: 0.3 } });

  // ======================================================================
  // BRIDGE  113.75 – 126.05
  // ======================================================================
  function mansionNight(g, S, opt) {
    const t = S.t;
    const m = NM.MAPS.mansionExt, door = m.door;
    const cam = opt.cam;
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    const items = NM.propItems(g, m, t);
    for (const c of opt.chars) items.push({ y: c.y, draw: (q) => { NM.drawChar(q, c.name, c.x, c.y, c.dir, c.frame, { clipBottom: c.clip, alpha: c.alpha }); if (c.torch) NM.PROPS.torch(q, c.x + (c.dir === 'left' ? -7 : 7), c.y - 24, {}, t); } });
    NM.drawSorted(g, items);
    if (opt.after) opt.after(g);
    g.restore();
    const lights = [];
    for (const c of opt.chars) if (c.torch) lights.push({ x: c.x - cam.x, y: c.y - 28 - cam.y, r: 56, flicker: true, color: '#ff9a3a', ca: 0.15 });
    for (const o of m.objects) if (o.type === 'window' && o.lit) lights.push({ x: o.x - cam.x, y: o.y - 14 - cam.y, r: 50, flicker: true });
    if (opt.lights) lights.push(...opt.lights(cam));
    NM.darkness(g, lights, opt.dark ?? 0.68, '#05040c', t);
  }
  const MOB = [[-60, 0, 'villager'], [-30, 10, 'villager2'], [0, 4, 'villager'], [30, 12, 'villagerW'], [60, 2, 'villager2'], [-45, 30, 'villagerW'], [15, 32, 'villager'], [45, 34, 'villager2']];

  // 113.75 – 116.75 the mob marches with torches
  NM.shot(113.75, 116.75, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.mansionExt, door = m.door;
    const front = lerp(370, 280, lt / 3);
    const chars = MOB.map(([dx, dy, n], i) => {
      const y = front + dy, x = door.x + dx;
      return { name: n, x, y, dir: 'up', frame: [0, 1, 2, 1][Math.floor(t * 6 + i) % 4], torch: i % 2 === 0 };
    });
    mansionNight(g, S, { chars, cam: { x: Math.round(door.x - W / 2), y: Math.round(lerp(220, 170, lt / 3)) },
      after: (q) => chars.forEach((c, i) => { if (t > 114.2 + i * 0.15) NM.balloon(q, i % 3 ? 'anger' : '!', c.x, c.y - 32, 1, t); }) });
  }, { pal: 'night', name: 'br-mob', in: { type: 'black', dur: 0.3 } });

  // 116.75 – 119.85 "But love demands the darkest deed" — skill cut-in
  NM.shot(116.75, 119.85, (g, S) => {
    const t = S.t, lt = S.lt;
    g.fillStyle = '#1a0004'; g.fillRect(0, 0, W, H);
    NM.cutIn(g, t, lt / 3.1, (q, y0) => {
      const slide = ease.outCubic(clamp(lt * 2.5));
      NM.isoldeFace(q, lerp(-80, 150, slide), y0 + 92, 200, lt < 1.5 ? 'cold' : 'crazed', t, 0.25, { noBlink: true });
      q.save(); q.font = '32px "UnifrakturMaguntia"'; q.fillStyle = '#ff8a9a'; q.textAlign = 'right';
      q.globalAlpha = range(0.3, 0.6, lt); q.fillText('Raise the Dead', lerp(560, 450, slide), y0 + 72);
      q.font = '16px "DotGothic16"'; q.fillStyle = '#ffd0d6'; q.fillText('Necromancy  Lv.MAX', lerp(560, 448, slide), y0 + 94);
      q.restore();
    }, { bg: '#2a0008' });
    S.post.shake = lt < 0.3 ? 2 : 0;
  }, { pal: 'portrait', name: 'br-cutin' });

  // 119.85 – 122.10 "I took your life, yet set you free" — negative flash of the crash, then his eyes open
  NM.shot(119.85, 122.1, (g, S) => {
    const t = S.t, lt = S.lt;
    if (lt < 0.9) {
      g.fillStyle = '#ffd6da'; g.fillRect(0, 0, W, H);
      NM.silhouette(g, '#1a0004', (s) => {
        NM.horse(s, 300, 190, 70, t, { rear: 1, speed: 2 });
        NM.carriage(s, 180, 200 + lt * 60, 90, t, { brokenWheel: true, rot: 0.4 + lt * 1.6, lantern: 0 });
      });
      S.post.glitch = 0.6; S.post.chroma = 0.8;
    } else {
      g.fillStyle = '#0b0709'; g.fillRect(0, 0, W, H);
      const k = clamp((lt - 1.0) / 0.6);
      g.save(); g.translate(240, 130); g.scale(1.6, 1.6);
      NM.lucienFace(g, 0, 0, 200, 'hollow', t, 0, { noBlink: true, lid: 1 - ease.outCubic(k), glow: k, P: { eyeGlow: '#ff2040', iris: ['#3a0a14', '#c4122f', '#ff5a6e'] } });
      g.restore();
    }
  }, { pal: 'scare', name: 'br-flash' });
  // palette switch for the eye-opening half
  NM.SHOTS[NM.SHOTS.length - 1].draw = ((orig) => (g, S) => { orig(g, S); if (S.lt >= 0.9) S.post.pal = 'corpse'; })(NM.SHOTS[NM.SHOTS.length - 1].draw);

  // 122.10 – 125.45 "In chains of night, you're bound to me" — the dead rise, the mob flees
  NM.shot(122.1, 125.45, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.mansionExt, door = m.door;
    const flee = clamp((lt - 1.3) / 2);
    const chars = MOB.map(([dx, dy, n], i) => {
      const y = 280 + dy + ease.inQuad(flee) * 160, x = door.x + dx;
      return { name: n, x, y, dir: flee > 0 ? 'down' : 'up', frame: flee > 0 ? [0, 1, 2, 1][Math.floor(t * 10 + i) % 4] : 1, torch: i % 2 === 0 };
    });
    const risers = [[-70, 236, 'zombie'], [-36, 244, 'skeleton'], [0, 238, 'zombie'], [36, 246, 'skeleton'], [70, 236, 'zombie'], [-90, 256, 'skeleton'], [92, 254, 'zombie']];
    risers.forEach(([dx, y, n], i) => {
      const k = clamp((lt - 0.2 - i * 0.12) / 0.7);
      if (k > 0) chars.push({ name: n, x: door.x + dx, y, dir: 'down', frame: k < 1 ? 1 : [0, 1, 2, 1][Math.floor(t * 4 + i) % 4], clip: Math.round(30 * (1 - ease.outCubic(k))) });
    });
    chars.push({ name: 'isolde', x: door.x - 10, y: door.y + 14, dir: 'down', frame: 1 }, { name: 'lucien', x: door.x + 12, y: door.y + 14, dir: 'down', frame: 1 });
    mansionNight(g, S, { chars, dark: 0.62, cam: { x: Math.round(door.x - W / 2), y: Math.round(door.y - 40) },
      after: (q) => {
        NM.chain(q, [door.x - 4, door.y, door.x + 1, door.y + 6, door.x + 14, door.y - 4], 4, { color: '#ff3a52', thick: 1, glow: 0.6 });
        if (flee > 0) MOB.forEach(([dx, dy], i) => NM.balloon(q, i % 2 ? '!' : 'sweat', door.x + dx, 280 + dy + ease.inQuad(flee) * 160 - 32, 1, t));
        risers.forEach(([dx, y], i) => { const k = (lt - 0.2 - i * 0.12) / 0.7; if (k > 0 && k < 1.3) NM.particles(q, k, { n: 8, seed: 70 + i, kind: 'dot', x: door.x + dx - 10, y: y - 10, w: 20, h: 10, vy: -20, size: [0.6, 1.2], color: '#4a3a2e', alpha: 1.3 - k }); });
      },
      lights: (cam) => [{ x: door.x - cam.x, y: door.y - 10 - cam.y, r: 70, color: '#ff2040', ca: 0.18 }] });
    S.post.shake = lt < 1.0 ? 1 : 0;
  }, { pal: 'night', name: 'br-rise', in: { type: 'black', dur: 0.15 } });

  // 125.45 – 126.05 dropout: a single eye opens in the dark
  NM.shot(125.45, 126.05, (g, S) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const k = ease.outCubic(clamp((S.lt - 0.1) / 0.4));
    g.save(); g.beginPath(); g.ellipse(240, 120, 70, 26 * k + 0.5, 0, 0, TAU); g.clip();
    g.translate(240, 120); g.scale(3.2, 3.2);
    NM.isoldeFace(g, 0, 0, 100, 'crazed', S.t, 0, { noBlink: true });
    g.restore();
    S.post.ui = 'none';
  }, { pal: 'portrait', name: 'br-eye' });
})();
