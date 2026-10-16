// Necromantical (painted) — scenes 0:00–0:36  (Title, Prologue, Verse 1, Pre-Chorus 1)
'use strict';
(function () {
  const { clamp, lerp, range, ease, TAU, W, H, glow, hash1, noise1, rgba } = NM;

  // ===================== shared helpers =====================
  // red spider lily (higanbana)
  NM.lily = function (g, x, y, s, t, seed, o = {}) {
    const sw = Math.sin(t * 1.1 + seed) * 0.07;
    const C1 = o.dark || '#5a0812', C2 = o.mid || '#b0142c', C3 = o.light || '#ff5a6a';
    g.save(); g.translate(x, y); g.rotate(sw);
    g.strokeStyle = '#141a10'; g.lineWidth = Math.max(1, s * 0.035); g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.08, -s * 0.5, 0, -s); g.stroke();
    g.translate(0, -s);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + seed * 1.7;
      g.save(); g.rotate(a);
      g.strokeStyle = C1; g.lineWidth = Math.max(1, s * 0.07);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(s * 0.18, -s * 0.04, s * 0.3, s * 0.02, s * 0.32, s * 0.12); g.stroke();
      g.strokeStyle = C2; g.lineWidth = Math.max(1, s * 0.045); g.stroke();
      g.strokeStyle = C3; g.lineWidth = Math.max(0.6, s * 0.015); g.stroke();
      g.strokeStyle = rgba(C2, 0.9); g.lineWidth = Math.max(0.6, s * 0.012);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.35, -s * 0.28, s * 0.52, -s * 0.16); g.stroke();
      g.fillStyle = '#ffcf7a'; g.beginPath(); g.arc(s * 0.52, -s * 0.16, Math.max(0.8, s * 0.016), 0, TAU); g.fill();
      g.restore();
    }
    g.fillStyle = C2; g.beginPath(); g.arc(0, 0, s * 0.06, 0, TAU); g.fill();
    g.restore();
  };
  NM.lilyField = function (g, t, y0, n, seed, o = {}) {
    for (let i = 0; i < n; i++) {
      const x = ((hash1(i * 7 + seed) * 1.15 - 0.07) * W), dy = hash1(i * 13 + seed) * (o.depth ?? 160);
      const s = (o.size ?? 120) * (0.45 + (dy / (o.depth ?? 160)) * 0.8) * (0.8 + hash1(i * 3 + seed) * 0.4);
      NM.lily(g, x, y0 + dy, s, t, i + seed, o);
    }
  };

  // lantern hanging from a hand
  NM.lantern = function (g, x, y, k, t, lit = 1) {
    g.save();
    g.strokeStyle = '#3a2a1a'; g.lineWidth = Math.max(1, 2 * k);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16 * k); g.stroke();
    const ly = y + 16 * k + Math.sin(t * 2.2) * 1.5 * k;
    if (lit > 0.02) glow(g, x, ly + 22 * k, 260 * k, '#ffaa50', 0.55 * lit);
    g.fillStyle = '#20160e'; g.fillRect(x - 13 * k, ly, 26 * k, 5 * k); g.fillRect(x - 11 * k, ly + 40 * k, 22 * k, 6 * k);
    const gg = g.createRadialGradient(x, ly + 22 * k, 1, x, ly + 22 * k, 16 * k);
    gg.addColorStop(0, lit > 0.02 ? '#fff4d0' : '#3a3440'); gg.addColorStop(1, lit > 0.02 ? '#ff9a3a' : '#1a1820');
    g.fillStyle = gg; g.fillRect(x - 10 * k, ly + 5 * k, 20 * k, 35 * k);
    g.fillStyle = '#20160e'; g.fillRect(x - 1.5 * k, ly + 5 * k, 3 * k, 35 * k); g.fillRect(x - 10 * k, ly + 20 * k, 20 * k, 2.5 * k);
    if (lit > 0.02) NM.flame(g, x, ly + 32 * k, 12 * k, t, 4, { color: '#ffd890', glowR: 2, glowA: 0.4 });
    g.restore();
  };

  // painted cut-in band (skill activation)
  NM.cutInP = function (g, t, k, draw, opt = {}) {
    const bandH = opt.h ?? 600, y0 = opt.y ?? 140;
    const open = ease.outCubic(clamp(k * 4)) * (1 - ease.inCubic(clamp((k - 0.86) / 0.14)));
    if (open <= 0) return;
    const h = bandH * open;
    g.save();
    g.beginPath(); g.rect(0, y0 + (bandH - h) / 2, W, h); g.clip();
    const bg = g.createLinearGradient(0, y0, W, y0 + bandH);
    bg.addColorStop(0, opt.bg1 || '#2a0410'); bg.addColorStop(1, opt.bg2 || '#6a0a1c');
    g.fillStyle = bg; g.fillRect(0, y0, W, bandH);
    g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const yy = y0 + hash1(i * 13) * bandH, len = 200 + hash1(i * 7) * 600;
      const xx = ((hash1(i * 3) * W * 2 - t * 2600 * (0.6 + hash1(i * 5))) % (W * 1.6) + W * 1.6) % (W * 1.6) - 300;
      g.strokeStyle = rgba(hash1(i) > 0.5 ? '#ff4a5a' : '#2a0008', 0.35 + hash1(i * 9) * 0.4); g.lineWidth = 2 + hash1(i * 11) * 10;
      g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + len, yy); g.stroke();
    }
    draw(g, y0, bandH, open);
    g.restore();
    g.fillStyle = '#c09a5a';
    g.fillRect(0, y0 + (bandH - h) / 2 - 4, W, 4); g.fillRect(0, y0 + (bandH + h) / 2, W, 4);
  };

  // storm sky preset
  NM.stormSky = function (g, t, flash = 0) {
    NM.paintSky(g, t, { top: '#05060c', mid: '#1a1e30', low: '#3a3a52', stars: 0, clouds: 0.95, cloudDark: '#0c0e18', cloudLight: '#8a90b8', speed: 60, flash });
  };

  // ======================================================================
  // 0.00 – 5.80  TITLE
  // ======================================================================
  const ridgeY = (x) => 700 + NM.fbm1(x * 0.002 + 3 * 13.7, 4) * 26;
  NM.titleArt = function (g, t, lt, withLucien) {
    const z = 1 + lt * 0.008;
    g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
    NM.paintSky(g, t, { top: '#0c0610', mid: '#3a1424', low: '#7a2a3a', moon: { x: 1360, y: 330, r: 190, blood: withLucien ? 0.8 : 0.4 }, cloudDark: '#1e0a12', cloudLight: '#ff9a9a', speed: 8 });
    NM.paintRidge(g, 3, 700, 26, 0.002, '#2a0e18', '#ff7a7a');
    NM.silhouette(g, '#12060a', (s) => {
      for (const [x, ty, sc] of [[240, 1, 0.8], [420, 0, 0.7], [610, 3, 0.75], [1600, 2, 0.8], [1760, 1, 0.7]]) {
        const y = ridgeY(x) + 4;
        s.save(); s.translate(x, y); s.fillRect(-26 * sc, -110 * sc, 52 * sc, 110 * sc); if (ty === 1) { s.fillRect(-60 * sc, -86 * sc, 120 * sc, 22 * sc); s.fillRect(-12 * sc, -150 * sc, 24 * sc, 150 * sc); } s.restore();
      }
    });
    NM.withRim(g, (q) => {
      NM.figIsolde(q, 1160, ridgeY(1160) + 12, 300, { dir: withLucien ? 1 : -1, wind: 1.1, armF: withLucien ? [1.0, 0.2] : [0.15, 0.1], armB: [0.1, 0.1], expr: 'cold' }, t);
      if (withLucien) NM.figLucien(q, 1250, ridgeY(1250) + 12, 320, { dir: -1, armF: [1.0, 0.2] }, t);
    }, '#ff8a8a', -1, -0.6, 3, 0.9);
    NM.paintTree(g, 60, 1150, 1100, 21, t, { rim: 'rgba(255,120,120,0.35)', lean: 0.25 });
    NM.paintTree(g, 1880, 1140, 960, 8, t, { rim: 'rgba(255,120,120,0.35)', lean: -0.3, rimDx: -2 });
    NM.paintFog(g, t, 640, 240, 0.4, '#a04858', 10);
    NM.lilyField(g, t, 880, 70, 3, { size: 150, depth: 200 });
    NM.particles(g, t, { n: 60, seed: 4, kind: 'petal', vx: -40, vy: 50, drift: 40, size: [4, 7], alpha: 0.9 });
    g.restore();
  };
  NM.titleLogo = function (g, a, y = 360) {
    if (a <= 0.01) return;
    g.save(); g.globalAlpha = a;
    g.font = '200px "UnifrakturMaguntia"'; g.textAlign = 'center';
    g.shadowColor = 'rgba(255,40,70,0.8)'; g.shadowBlur = 40;
    g.fillStyle = '#5a0a14'; g.fillText('Necromantical', W / 2, y);
    g.shadowBlur = 0;
    const lg = g.createLinearGradient(0, y - 160, 0, y + 20); lg.addColorStop(0, '#ffe2d0'); lg.addColorStop(0.45, '#e85a5a'); lg.addColorStop(1, '#6a0a16');
    g.fillStyle = lg; g.fillText('Necromantical', W / 2, y);
    g.lineWidth = 2; g.strokeStyle = 'rgba(200,160,90,0.7)'; g.strokeText('Necromantical', W / 2, y);
    g.restore();
  };
  NM.shot(0, 5.8, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.titleArt(g, t, lt, false);
    S.post.ui = 'none';
    S.post.extraUI = [(u) => {
      const a = range(0.2, 1.8, t) * (1 - range(5.2, 5.6, t));
      NM.titleLogo(u, a);
      NM.uiText(u, '~ a love that will not die ~', W / 2, 440, { font: 'italic 46px "IM Fell English"', align: 'center', color: '#f0c8c0', alpha: a });
      NM.titleMenu(u, t, 0, range(2.3, 2.8, t) * (1 - range(5.0, 5.3, t)), t > 4.75);
      if (NM.SHOW_LYRICS !== false && t < 5.4) NM.drawSubtitle(u, t, { y: 1020, color: '#f6dcd2' });
    }];
    if (t > 4.75 && t < 5.0) S.post.flash = 0.2 * (Math.floor(t * 20) % 2);
    S.post.grade = { shadow: '#1a0610', light: '#ff9a8a', amount: 0.3 };
  }, { name: 'title', out: { dur: 0.5 } });

  // ======================================================================
  // 5.80 – 8.70  THE ACCIDENT (storm, cliff road)
  // ======================================================================
  const STRIKES = [6.0, 7.1, 7.95, 8.35];
  NM.shot(5.8, 8.7, (g, S) => {
    const t = S.t, lt = S.lt;
    const st = NM.strikeAt(t, STRIKES, 0.5);
    NM.paintSky(g, t, { top: '#0a0c16', mid: '#2a3048', low: '#4a4a66', stars: 0, clouds: 0.95, cloudDark: '#141828', cloudLight: '#a0a8d8', speed: 60, flash: st.v * 0.8 });
    if (st.v > 0.3) NM.bolt(g, 300 + st.seed * 280, -20, 380 + st.seed * 220, 560, st.seed * 17, st.v, { w: 1.2 });
    const sg = g.createLinearGradient(0, 620, 0, H); sg.addColorStop(0, '#1a1e2e'); sg.addColorStop(1, '#05060a');
    g.fillStyle = sg; g.fillRect(0, 620, W, H - 620);
    for (let i = 0; i < 40; i++) { g.strokeStyle = rgba('#8a90b8', 0.15 + st.v * 0.3); g.lineWidth = 2; const x = ((i * 137 + t * 90) % 2200) - 100, y = 650 + (i % 9) * 40; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 80, y - 3); g.stroke(); }
    const edgeX = 1320, roadY = 700;
    const cg = g.createLinearGradient(0, roadY, 0, H); cg.addColorStop(0, '#16141e'); cg.addColorStop(1, '#030305');
    g.fillStyle = cg;
    g.beginPath(); g.moveTo(-20, roadY + 6); g.lineTo(edgeX, roadY); g.lineTo(edgeX + 50, roadY + 70); g.lineTo(edgeX + 20, roadY + 200); g.lineTo(edgeX + 90, H + 10); g.lineTo(-20, H + 10); g.closePath(); g.fill();
    g.fillStyle = rgba('#8a90c0', 0.3 + st.v * 0.6); g.fillRect(0, roadY - 1, edgeX, 4);
    const run = ease.inOutSine(clamp(lt / 1.8)) * 0.6 + clamp(lt / 1.8) * 0.4;
    const hx = lerp(200, 1300, run);
    const rear = range(1.45, 1.85, lt);
    const fall = clamp((lt - 1.75) / 0.95);
    const rimCol = st.v > 0.2 ? '#e8ecff' : '#6a70a0';
    NM.withRim(g, (q) => {
      NM.horse(q, hx, roadY + 2, 360, t, { rear, speed: 10 * (1 - rear) + 2, eye: '#ffcf7a' });
      NM.horse(q, hx - 190, roadY + 4, 360, t + 0.13, { rear: rear * 0.7, speed: 10 * (1 - rear) + 2 });
      const cx = hx - 700 + ease.outCubic(fall) * 760, cy = roadY + ease.inQuad(fall) * 700;
      NM.carriage(q, cx, cy, 440, t, { brokenWheel: lt > 1.4, rot: range(1.4, 1.75, lt) * 0.25 + ease.inQuad(fall) * 2.4, lantern: fall < 0.5 ? 0.9 : 0, passenger: true });
    }, rimCol, 1, -0.7, 6, 0.7 + st.v * 0.3);
    if (lt > 1.4) NM.particles(g, lt - 1.4, { n: 40, seed: 8, kind: 'dot', x: hx - 650, y: 400, w: 500, h: 300, vx: 160, vy: 300, size: [2, 5], color: '#2a2a3a', alpha: 1 });
    NM.rain(g, t, 1.4, 3, '#9aa0c8');
    S.post.flash = st.v * 0.5; S.post.flashColor = '#dfe4ff';
    S.post.shake = lt > 1.4 && lt < 2.4 ? 1.2 : 0.15;
    S.post.grade = { shadow: '#060812', light: '#9aa8e0', amount: 0.4 };
  }, { name: 'crash', in: { type: 'black', dur: 0.3 } });

  // ======================================================================
  // 8.70 – 10.30  FUNERAL IN THE RAIN
  // ======================================================================
  NM.shot(8.7, 10.3, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.paintSky(g, t, { top: '#2a2a34', mid: '#4a4a56', low: '#6a6a74', stars: 0, clouds: 0.9, cloudDark: '#2a2a32', cloudLight: '#9a9aa8', speed: 6 });
    NM.paintRidge(g, 6, 640, 20, 0.002, '#3a3a42', null);
    const c = NM.cam3({ x: 0, y: 150, z: -300, f: 1100, vy: H * 0.58 });
    NM.groundPlane(g, c, { far: '#3a3a40', mid: '#24242a', near: '#101014', grass: 0 });
    for (let i = 0; i < 14; i++) { const p = NM.P3(c, (hash1(i) - 0.5) * 4000, 0, 1400 + hash1(i * 3) * 2000); NM.paintGrave(g, p.x, p.y, 80 * p.k, 140 * p.k, i % 5, { fog: 0.7, fogCol: '#5a5a64' }); }
    const gp = NM.P3(c, 60, 0, 900);
    g.fillStyle = '#0a0806'; g.beginPath(); g.ellipse(gp.x, gp.y, 210 * gp.k, 40 * gp.k, 0, 0, TAU); g.fill();
    const lower = range(0.1, 1.5, lt) * 40;
    g.save(); g.beginPath(); g.rect(0, 0, W, gp.y + 6); g.clip();
    const cy = gp.y - 70 * gp.k + lower * gp.k;
    const cbg = g.createLinearGradient(0, cy - 30 * gp.k, 0, cy + 40 * gp.k); cbg.addColorStop(0, '#5a3a24'); cbg.addColorStop(1, '#1a0e08');
    g.fillStyle = cbg; g.beginPath(); g.moveTo(gp.x - 190 * gp.k, cy); g.lineTo(gp.x - 150 * gp.k, cy - 34 * gp.k); g.lineTo(gp.x + 190 * gp.k, cy - 30 * gp.k); g.lineTo(gp.x + 200 * gp.k, cy + 6 * gp.k); g.lineTo(gp.x - 180 * gp.k, cy + 30 * gp.k); g.closePath(); g.fill();
    g.restore();
    const mourners = [[-560, 980], [-380, 1060], [-200, 1120], [300, 1120], [480, 1060], [640, 980], [-80, 1300], [160, 1320], [-760, 1500], [820, 1500]];
    mourners.sort((a, b2) => b2[1] - a[1]).forEach(([X, Z], i) => {
      const p = NM.P3(c, X, 0, Z);
      NM.figMourner(g, p.x, p.y, 560 * p.k, t, 40 + i, { dir: X < 0 ? 1 : -1, fog: NM.fogK(c, Z, 0.0006) * 0.7, fogCol: '#5a5a66' });
    });
    const pp = NM.P3(c, 60, 0, 1250);
    NM.figMourner(g, pp.x, pp.y, 560 * pp.k, t, 7, { umbrella: false, female: false, fog: 0.3, fogCol: '#5a5a66' });
    NM.withRim(g, (q) => NM.figIsolde(q, 1420, 1180, 900, { dir: -1, wind: 0.2, armF: [0.5, 0.6], armB: [0.4, 0.5], expr: 'sad', headTilt: 0.12, yaw: 0.45 }, t), '#c8c8d8', -1, -0.4, 4, 0.5);
    NM.rain(g, t, 1.6, 7, '#b0b0c0');
    NM.paintFog(g, t, 700, 300, 0.25, '#8a8a96', 8);
    S.post.grade = { shadow: '#14141a', light: '#c8c8d4', amount: 0.5 };
  }, { name: 'funeral', in: { type: 'black', dur: 0.25 } });

  // ======================================================================
  // 10.30 – 11.55  THE TEAR TURNS TO BLOOD; HER EYES IGNITE
  // ======================================================================
  NM.shot(10.3, 11.55, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#14121c'], [1, '#2a2632']]);
    const snap = lt > 0.62;
    glow(g, 960, 480, 900, snap ? '#a3122a' : '#4a4a6a', snap ? 0.5 : 0.3);
    const z = 1 + lt * 0.06;
    g.save(); g.translate(960, 540); g.scale(z, z); g.translate(-960, -540);
    NM.paintIsolde(g, 960, 470, 860, snap ? 'crazed' : 'sad', t, { noBlink: true, yaw: 0, light: -0.5, e: snap ? { bloodTear: clamp((lt - 0.62) * 2.5), tear: 0 } : {} });
    g.restore();
    NM.rain(g, t, 0.9, 9, '#b0b0c0');
    if (snap) { S.post.flash = Math.max(0, 1 - (lt - 0.62) * 4) * 0.7; S.post.flashColor = '#ff2040'; S.post.chroma = clamp(1 - (lt - 0.62) * 2.5); S.post.shake = lt < 0.95 ? 1.4 : 0; }
    if (lt > 1.15) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
    S.post.grade = { shadow: '#140810', light: '#ffd0c8', amount: 0.3 };
  }, { name: 'closeup1', paint: { r: 4 } });

  // ======================================================================
  // VERSE 1 — THE RITUAL  11.55 – 23.60
  // ======================================================================
  const GRAVE = { X: 0, Z: 1500 };
  function gy(g, t, c, o = {}) {
    return NM.graveyard(g, t, c, Object.assign({
      grave: GRAVE,
      freshGrave: (q, p) => {
        NM.freshGrave(q, p, t, { rose: o.rose ?? false, open: o.open || 0, lit: o.candles ? 0.6 : 0 });
        if (o.sigil) {
          q.save(); q.translate(p.x, p.y + 4 * p.k); q.scale(1, 0.32);
          NM.sigil(q, 0, 0, 380 * p.k, t, o.sigil, { squash: 1, width: 2.2 * p.k, alpha: 0.95, color: '#ff2a44', runes: 30, glowA: 0.35 * o.sigil });
          q.restore();
        }
        if (o.candles) {
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU;
            const X = GRAVE.X + Math.cos(a) * 300, Z = GRAVE.Z + Math.sin(a) * 160;
            const lit = o.candles(i);
            if (lit < 0) continue;
            const cp = NM.P3(c, X, 0, Z);
            NM.paintCandle(q, cp.x, cp.y, cp.k * 1.4, t, i, { lit, red: o.red ? o.red(i) : false });
          }
        }
        if (o.atGrave) o.atGrave(q, p);
      },
      warm: o.candles ? (it) => clamp(1 - Math.hypot(it.X - GRAVE.X, it.Z - GRAVE.Z) / 900) * 0.8 : null,
    }, o.gyOpts || {}));
  }
  NM.gyNight = gy;
  NM.GRAVE = GRAVE;

  // 11.55 – 14.70 the lantern walk (lateral tracking shot, graves pass in front)
  NM.shot(11.55, 14.7, (g, S) => {
    const t = S.t, lt = S.lt;
    const walkX = lerp(-700, 200, lt / 3.15);
    const c = NM.cam3({ x: walkX + 120, y: 190, z: 0, f: 1000, vy: H * 0.5 });
    const p = NM.P3(c, walkX, 0, 820);
    gy(g, t, c, { gyOpts: { hooks: { 900: (q) => {
      const bob = Math.abs(Math.sin(t * 4.4)) * 6 * p.k;
      let hand;
      NM.withRim(q, (r) => { hand = NM.figIsolde(r, p.x, p.y - bob, 640 * p.k, { dir: 1, wind: 0.5, armF: [0.45 + Math.sin(t * 4.4) * 0.08, 0.35], armB: [0.2 - Math.sin(t * 4.4) * 0.12, 0.3], expr: 'sad', yaw: 0.5 }, t); }, '#c8c0ff', 1, -0.6, 4, 0.7);
      NM.lantern(q, hand.hand[0], hand.hand[1], p.k * 1.2, t);
    } } } });
    for (const [X, ty] of [[-900, 0], [-300, 1], [500, 2], [1100, 4]]) {
      const fp = NM.P3(c, X, 0, 240);
      NM.paintGrave(g, fp.x, fp.y + 40, 130 * fp.k, 220 * fp.k, ty, { light: 0.7, moss: true });
    }
    S.post.grade = { shadow: '#0c0818', light: '#c8b8ff', amount: 0.35 };
  }, { name: 'v1-walk', in: { type: 'black', dur: 0.5 } });

  // 14.70 – 17.90 she kneels at his grave; candles ignite one by one
  NM.shot(14.7, 17.9, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: -60, y: 140, z: 1000 - lt * 30, f: 1100, vy: H * 0.5 });
    gy(g, t, c, { rose: lt > 1.0, candles: (i) => clamp((t - 15.1 - i * 0.24) * 5), atGrave: (q, p) => {
      NM.withRim(q, (r) => NM.figIsolde(r, p.x - 230 * p.k, p.y + 30 * p.k, 560 * p.k, { dir: 1, kneel: 1, wind: 0.4, armF: [1.2 - range(0.6, 1.2, lt) * 0.4, 0.4], armB: [0.6, 0.5], expr: 'tender', headTilt: 0.18, yaw: 0.4 }, t), '#d8c8ff', 1, -0.5, 4, 0.7);
      NM.lantern(q, p.x - 400 * p.k, p.y - 10 * p.k, p.k * 1.2, t);
    } });
    S.post.grade = { shadow: '#0c0818', light: '#ffc89a', amount: 0.35 };
  }, { name: 'v1-candles' });

  // 17.90 – 20.90 the circle draws itself; she raises her hands
  NM.shot(17.9, 20.9, (g, S) => {
    const t = S.t, lt = S.lt;
    const k = ease.inOutSine(clamp((t - 18.0) / 2.6));
    const c = NM.cam3({ x: 0, y: 520, z: 600 - lt * 40, f: 1000, vy: H * 0.3 });
    gy(g, t, c, { rose: true, sigil: k, candles: () => 1, atGrave: (q, p) => {
      NM.withRim(q, (r) => NM.figIsolde(r, p.x - 380 * p.k, p.y + 60 * p.k, 680 * p.k, { dir: 1, wind: 1 + k, armF: [2.4, 0.4], armB: [2.2, 0.3], expr: 'crazed', glow: k, yaw: 0.3, headTilt: -0.15 }, t), '#ff4a5a', 1, -0.3, 5, 0.6 + k * 0.3);
    } });
    glow(g, W / 2, H * 0.62, 800, '#ff2040', 0.25 * k);
    S.post.shake = t > 20.3 ? 0.4 : 0;
    S.post.grade = { shadow: '#14060c', light: '#ff8a8a', amount: 0.3 + 0.2 * k };
  }, { name: 'v1-sigil' });

  // 20.90 – 23.60 his soul rises and the crimson chain binds it
  NM.shot(20.9, 23.6, (g, S) => {
    const t = S.t, lt = S.lt;
    const rise = ease.outCubic(clamp(lt / 1.3));
    const pull = ease.inOutCubic(clamp((lt - 1.5) / 1.0));
    const c = NM.cam3({ x: 0, y: 200, z: 700, f: 1100, vy: H * 0.5 });
    gy(g, t, c, { rose: true, sigil: 1, open: 0.6, candles: () => 1, atGrave: (q, p) => {
      let hand = null;
      NM.withRim(q, (r) => { hand = NM.figIsolde(r, p.x - 420 * p.k, p.y + 80 * p.k, 700 * p.k, { dir: 1, wind: 1, armF: [1.7, 0.1], armB: [0.5, 0.4], expr: 'smirk', glow: 0.8, yaw: 0.35 }, t); }, '#ff4a5a', 1, -0.4, 4, 0.7);
      const gx = p.x + Math.sin(t * 4) * 30 * p.k * (1 - pull) - pull * 120 * p.k, gyy = p.y - rise * 120 * p.k + pull * 40 * p.k;
      NM.figGhost(q, gx, gyy, 420 * p.k, t, { alpha: 0.9, expr: lt > 1.6 ? 'pain' : 'sleep' });
      const reach = clamp((lt - 0.8) / 0.6);
      if (reach > 0) NM.chain(q, [hand.hand[0], hand.hand[1], (hand.hand[0] + gx) / 2, Math.min(hand.hand[1], gyy - 240 * p.k) - 80 * p.k * (1 - pull), gx, gyy - 240 * p.k], 26 * p.k, { color: '#ff3a52', thick: 5 * p.k, reveal: reach, glow: 0.9, glowColor: '#ff2040' });
    } });
    S.post.shake = lt > 1.5 && lt < 2.5 ? 0.6 : 0;
    S.post.grade = { shadow: '#0c0818', light: '#ff9aa8', amount: 0.35 };
  }, { name: 'v1-soul' });

  // ======================================================================
  // PRE-CHORUS 1  23.60 – 36.15
  // ======================================================================
  NM.shot(23.6, 26.6, (g, S) => {
    const t = S.t, lt = S.lt;
    const pan = lt * 18;
    g.save(); g.translate(-pan, 0);
    const gyY = NM.villageScene(g, t, {});
    const crowd = [[260, 0], [340, 10], [420, -6], [520, 8], [620, 0], [700, 12], [790, -4]];
    crowd.forEach(([x, dy], i) => {
      const turned = t > 24.0 + i * 0.22;
      NM.figMourner(g, x, gyY + 40 + dy, 360, t, 30 + i, { umbrella: false, dir: turned ? 1 : (i % 2 ? 1 : -1), color: '#0c0a10', hi: '#4a3a30' });
    });
    g.restore();
    const ix = lerp(2300, 900, lt / 3);
    NM.withRim(g, (q) => NM.figIsolde(q, ix, H + 300, 1300, { dir: -1, wind: 0.6, armF: [0.3, 0.3], expr: 'cold', yaw: 0.6 }, t, { colors: { dress: '#050307', dressMid: '#0e0a12', dressHi: '#1e1828' } }), '#ff5a6a', -1, -0.3, 6, 0.8);
    S.post.grade = { shadow: '#0c0810', light: '#ffc890', amount: 0.35 };
  }, { name: 'p1-village', in: { type: 'black', dur: 0.3 } });

  NM.shot(26.6, 29.6, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: -200, y: 260, z: 820, f: 1100, vy: H * 0.48 });
    gy(g, t, c, { rose: true, sigil: 1, candles: () => 1, gyOpts: { fog: 0.2 } });
    const b = NM.beat(t, 5);
    glow(g, 760, 600, 600 + b * 200, '#ff2040', 0.35 + b * 0.25);
    NM.particles(g, t, { n: 70, seed: 12, kind: 'glow', x: 300, y: 200, w: 1000, h: 900, vy: -120, drift: 60, size: [1, 2.5], color: '#ff3a52', alpha: 0.8, mode: 'lighter' });
    NM.withRim(g, (q) => NM.figIsolde(q, 760, 1760, 1900, { dir: 1, wind: 1.6 + b, armF: [1.0, 0.8], armB: [0.8, 0.9], expr: 'hungry', glow: 0.8 + b * 0.4, yaw: 0.3, headTilt: -0.08 }, t), '#ff4a5a', 1, -0.3, 7, 0.9);
    NM.figGhost(g, 1350, 900, 900, t, { alpha: 0.7, expr: 'sleep' });
    NM.chain(g, [930, 1000, 1150, 900, 1330, 420], 40, { color: '#ff3a52', thick: 7, glow: 0.8, offset: t * 40 });
    S.post.shake = b > 0.6 ? 0.3 : 0;
    S.post.grade = { shadow: '#14040a', light: '#ff8a8a', amount: 0.4 };
  }, { name: 'p1-strong', paint: { r: 5 } });

  NM.shot(29.6, 32.7, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 300, z: 600, f: 1000, vy: H * 0.4 });
    gy(g, t, c, { rose: true, sigil: 1, candles: () => 1 });
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, W, H);
    NM.cutInP(g, t, lt / 3.1, (q, y0) => {
      const slide = ease.outCubic(clamp(lt * 2.4));
      NM.paintIsolde(q, lerp(2400, 1340, slide), y0 + 330, 780, lt < 1.6 ? 'smirk' : 'crazed', t, { noBlink: true, yaw: -0.3, light: 0.5 });
    });
    S.post.extraUI = [(u) => {
      const slide = ease.outCubic(clamp(lt * 2.4)), open = clamp(lt * 4) * (1 - clamp((lt / 3.1 - 0.86) / 0.14));
      if (open <= 0.05) return;
      NM.uiText(u, 'Soulbind', lerp(-400, 140, slide), 410, { font: '150px "UnifrakturMaguntia"', color: '#ffd0d0', alpha: range(0.3, 0.7, lt) * open, shadow: 'rgba(255,40,70,0.8)', blur: 30 });
      NM.uiText(u, 'a forbidden art', lerp(-400, 160, slide), 490, { font: 'italic 54px "IM Fell English"', color: '#f0b8b8', alpha: range(0.3, 0.7, lt) * open });
    }];
    S.post.shake = lt < 0.3 ? 1 : 0;
  }, { name: 'p1-cutin', paint: { r: 4 } });

  NM.shot(32.7, 35.5, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 230, z: 300 - lt * 60, f: 1000, vy: H * 0.5 });
    const strike = NM.strikeAt(t, [34.15, 34.85], 0.45);
    gy(g, t, c, { rose: true, sigil: 1, candles: () => 1, red: (i) => t > 32.9 + i * 0.2, atGrave: (q, p) => {
      NM.withRim(q, (r) => NM.figIsolde(r, p.x - 320 * p.k, p.y + 60 * p.k, 680 * p.k, { dir: 1, wind: 2, armF: [2.6, 0.2], armB: [2.4, 0.2], expr: 'crazed', glow: 1, yaw: 0.2 }, t), '#ff4a5a', 1, -0.3, 5, 0.9);
    }, gyOpts: { blood: range(0.2, 2.2, lt) * 0.8, sky: { speed: 40 } } });
    const vp = NM.P3(c, 0, 900, 1500);
    g.save(); g.translate(vp.x, vp.y); g.rotate(t * 1.4); g.scale(1, 0.35);
    for (let k = 0; k < 6; k++) { g.rotate(1.05); g.strokeStyle = rgba(k % 2 ? '#ff4a5a' : '#2a0810', 0.35); g.lineWidth = 40; g.beginPath(); g.arc(0, 0, 140 + k * 70, 0, Math.PI * 1.2); g.stroke(); }
    g.restore();
    glow(g, vp.x, vp.y, 500, '#ff2040', 0.3 + strike.v * 0.4);
    if (strike.v > 0.3) { const gp = NM.P3(c, 0, 0, 1500); NM.bolt(g, vp.x, vp.y, gp.x, gp.y, strike.seed * 23, strike.v, { color: '#ff8a9a', w: 1.4 }); }
    S.post.flash = strike.v * 0.55; S.post.flashColor = '#ff2040';
    S.post.shake = 0.3 + lt * 0.25;
  }, { name: 'p1-flame' });

  NM.shot(35.5, 36.15, (g, S) => {
    const t = S.t, lt = S.lt;
    g.fillStyle = '#030204'; g.fillRect(0, 0, W, H);
    const k = lt / 0.65;
    g.save(); g.translate(W / 2, H * 0.58); g.scale(1, 0.4);
    NM.sigil(g, 0, 0, 520 + k * 120, t, 1, { squash: 1, width: 2.4, alpha: 0.4 + k * 0.6, color: '#ff2a44', runes: 30, glowA: 0.3 + k * 0.4 });
    g.restore();
    S.post.ui = 'none';
  }, { name: 'p1-drop' });
})();
