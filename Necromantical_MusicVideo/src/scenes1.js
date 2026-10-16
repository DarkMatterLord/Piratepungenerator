// Necromantical — scenes 0:00–0:36  (Title, Prologue, Verse 1, Pre-Chorus 1)
'use strict';
(function () {
  const { clamp, lerp, range, ease, TAU, W, H, C, glow, hash1, noise1 } = NM;
  const T = 16;
  const L = (i) => NM.T.lines[i];

  // ---------- shared helpers ----------
  let silC = null;
  // draw something into a temp layer, then flood it with one colour (silhouette)
  NM.silhouette = function (g, color, fn, rim) {
    if (!silC) silC = NM.canvas(W, H);
    const s = silC.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, W, H);
    fn(s);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = color; s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'source-over';
    if (rim) { g.save(); g.globalAlpha = rim.a ?? 1; g.drawImage(silC, rim.dx ?? -1, rim.dy ?? 0); g.restore(); }
    g.drawImage(silC, 0, 0);
  };
  // tinted copy of a silhouette rim: draw shape twice — offset in rim colour, then dark on top
  NM.rimmed = function (g, dark, rimCol, dx, dy, fn) {
    NM.silhouette(g, rimCol, fn);
    g.save(); g.translate(dx, dy); NM.silhouette(g, dark, fn); g.restore();
  };

  // red spider lily (higanbana) — vector, for CG foregrounds
  NM.lily = function (g, x, y, s, t, seed, col = '#d0554f', hi = '#ec8a7a') {
    const sw = Math.sin(t * 1.2 + seed) * 0.08;
    g.save(); g.translate(x, y); g.rotate(sw);
    g.strokeStyle = '#1f0e12'; g.lineWidth = Math.max(1, s * 0.06);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.1, -s * 0.5, 0, -s); g.stroke();
    g.translate(0, -s);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + seed;
      g.save(); g.rotate(a);
      g.strokeStyle = col; g.lineWidth = Math.max(1, s * 0.07);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.25, -s * 0.08, s * 0.32, s * 0.08); g.stroke();
      g.strokeStyle = hi; g.lineWidth = Math.max(1, s * 0.025);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.32, -s * 0.22, s * 0.5, -s * 0.1); g.stroke();
      g.restore();
    }
    g.fillStyle = col; g.beginPath(); g.arc(0, 0, s * 0.08, 0, TAU); g.fill();
    g.restore();
  };

  // anime cut-in band (battle skill style)
  NM.cutIn = function (g, t, k, draw, opt = {}) {
    const bandH = 150, y0 = opt.y ?? 40;
    const open = ease.outCubic(clamp(k * 4)) * (1 - ease.inCubic(clamp((k - 0.85) / 0.15)));
    if (open <= 0) return;
    const h = bandH * open;
    g.save();
    g.beginPath(); g.rect(0, y0 + (bandH - h) / 2, W, h); g.clip();
    g.fillStyle = opt.bg || '#3a0a14'; g.fillRect(0, y0, W, bandH);
    // speed lines
    g.strokeStyle = opt.lines || '#7a0e22'; g.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const yy = y0 + hash1(i * 13) * bandH, len = 60 + hash1(i * 7) * 160;
      const xx = ((hash1(i * 3) * W * 2 - t * 900 * (0.7 + hash1(i * 5))) % (W * 1.5) + W * 1.5) % (W * 1.5) - 100;
      g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + len, yy); g.stroke();
    }
    draw(g, y0, bandH, open);
    g.restore();
    g.fillStyle = '#f2f0ea';
    g.fillRect(0, y0 + (bandH - h) / 2 - 2, W, 2); g.fillRect(0, y0 + (bandH + h) / 2, W, 2);
  };

  // ======================================================================
  // 0.00 – 5.80  TITLE SCREEN
  // ======================================================================
  NM.shot(0, 5.8, (g, S) => {
    const t = S.t;
    NM.skyGrad(g, [[0, '#1f0e12'], [0.55, '#561d25'], [1, '#7c2630']]);
    NM.stars(g, t, 50, 5, 0.8, 0, 0, W, 120);
    NM.moon(g, 336, 92, 58, { blood: 0.35 });
    NM.clouds(g, t, { y: 40, h: 120, speed: 6, alpha: 0.35, tint: '#a8353a' });
    // far hill + graves
    NM.ridge(g, 3, 196, 10, 0.012, '#35151b');
    NM.silhouette(g, '#1f0e12', (s) => {
      for (const [x, ty, sc] of [[60, 1, 0.5], [110, 0, 0.45], [175, 2, 0.55], [400, 5, 0.5], [440, 1, 0.45]]) NM.grave(s, x, NM.ridgeY(3, 198, 10, 0.012, x), 18 * sc * 2, 30 * sc * 2, ty);
      NM.figIsolde(s, 300, NM.ridgeY(3, 198, 10, 0.012, 300) + 2, 64, { dir: -1, wind: 0.8, expr: 'cold', armF: [0.1, 0.1] }, t);
    });
    // big framing trees
    NM.deadTree(g, 18, 300, 300, 21, t, { color: '#0e0709', depth: 7, lean: 0.25 });
    NM.deadTree(g, 470, 290, 240, 8, t, { color: '#0e0709', depth: 7, lean: -0.3 });
    NM.ridge(g, 9, 238, 6, 0.02, '#0e0709');
    // foreground lilies
    for (let i = 0; i < 26; i++) NM.lily(g, (i * 37 + 13) % 500 - 10, 270 - (i % 3) * 4, 26 + (i % 4) * 6, t, i);
    NM.particles(g, t, { n: 26, seed: 4, kind: 'petal', vx: -18, vy: 22, drift: 18, size: [1.5, 2.6], alpha: 0.9 });
    // logo
    const a = range(0.2, 1.6, t);
    g.save();
    g.globalAlpha = a;
    g.font = '58px "UnifrakturMaguntia"'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#0e0709'; g.strokeText('Necromantical', 240, 98);
    const lg = g.createLinearGradient(0, 56, 0, 100); lg.addColorStop(0, '#fde4d6'); lg.addColorStop(0.45, '#ec8a7a'); lg.addColorStop(1, '#a8353a');
    g.fillStyle = lg; g.fillText('Necromantical', 240, 98);
    g.font = '16px "DotGothic16"'; g.fillStyle = '#f6b9a6';
    g.fillText('~ a love that will not die ~', 240, 122);
    g.fillStyle = '#ec8a7a'; g.fillRect(150, 107, 180, 1); g.fillRect(238, 104, 4, 6);
    g.restore();
    // press-start → menu → select → fade
    const fade = range(5.25, 5.75, t);
    if (fade > 0) { g.fillStyle = '#000'; g.globalAlpha = Math.round(fade * 8) / 8; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    S.post.ui = 'none';
    S.post.extraUI = [(u) => {
      const open = range(2.3, 2.5, t) * (1 - range(5.05, 5.2, t));
      NM.titleMenu(u, t, 0, open, t > 4.75);
      // lyric subtitle under the menu
      if (fade < 0.5 && NM.SHOW_LYRICS !== false) NM.drawSubtitle(u, t, { y: 250, color: '#fde4d6' });
    }];
    if (t > 4.75 && t < 5.0) S.post.flash = 0.25 * (Math.floor(t * 20) % 2);
  }, { pal: 'blood', name: 'title' });

  // ======================================================================
  // 5.80 – 8.70  PROLOGUE: THE ACCIDENT (storm, cliff road)
  // ======================================================================
  const STRIKES = [6.05, 7.15, 7.95, 8.35];
  NM.shot(5.8, 8.7, (g, S) => {
    const t = S.t, lt = S.lt;
    const st = NM.strikeAt(t, STRIKES, 0.45);
    NM.skyGrad(g, [[0, '#0f0f1e'], [0.6, '#2a2a4d'], [1, '#3c3a6b']]);
    NM.clouds(g, t, { y: -10, h: 150, speed: 40, alpha: 0.6, tint: '#57528f', flash: st.v * 0.8 });
    if (st.v > 0.3) NM.bolt(g, 120 + st.seed * 70, -10, 160 + st.seed * 60, 150, st.seed * 17, st.v, { w: 0.4 });
    // sea / abyss on the right, cliff on the left
    g.fillStyle = '#1b1b33'; g.fillRect(0, 160, W, 120);
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#2a2a4d' : '#3c3a6b'; g.fillRect(((i * 97 + t * 30) % 520) - 40 + 300, 176 + i * 5, 50, 1); }
    const edgeX = 330;
    g.fillStyle = '#05050a';
    g.beginPath(); g.moveTo(-10, 186); g.lineTo(edgeX, 184); g.lineTo(edgeX + 12, 200); g.lineTo(edgeX + 4, 230); g.lineTo(edgeX + 20, 280); g.lineTo(-10, 280); g.closePath(); g.fill();
    g.fillStyle = '#3c3a6b'; g.fillRect(0, 184, edgeX, 2);
    // carriage + horses
    const run = ease.inOutSine(clamp(lt / 1.8)) * 0.6 + clamp(lt / 1.8) * 0.4;
    const hx = lerp(-20, 312, run);
    const rear = range(1.5, 1.9, lt);
    NM.silhouette(g, '#05050a', (s) => {
      NM.horse(s, hx, 186, 66, t, { rear, speed: 10 * (1 - rear) + 2 });
      NM.horse(s, hx - 34, 187, 66, t + 0.13, { rear: rear * 0.7, speed: 10 * (1 - rear) + 2 });
      const fall = clamp((lt - 1.75) / 0.9);
      const cx = hx - 132 + ease.outCubic(fall) * 150, cy = 186 + ease.inQuad(fall) * 160;
      NM.carriage(s, cx, cy, 86, t, { brokenWheel: lt > 1.4, rot: range(1.4, 1.75, lt) * 0.25 + ease.inQuad(fall) * 2.2, lantern: 0 });
    }, { dx: -1, dy: 0, a: 1 });
    // lanterns + flying debris
    const fall = clamp((lt - 1.75) / 0.9);
    if (fall < 0.4) NM.glow(g, hx - 132 + ease.outCubic(fall) * 150 + 36, 186 - 62 + ease.inQuad(fall) * 160, 22, '#ffb347', 0.8);
    if (lt > 1.4) NM.particles(g, lt - 1.4, { n: 18, seed: 8, kind: 'dot', x: hx - 170, y: 120, w: 120, h: 70, vx: 50, vy: 80, size: [0.8, 1.6], color: '#7d73b5' });
    NM.rain(g, t, 1.2, 3, '#7d73b5');
    if (st.v > 0) { S.post.flash = st.v * 0.55; S.post.flashColor = '#d6cdf0'; }
    S.post.shake = lt > 1.4 && lt < 2.3 ? 2 : 0;
  }, { pal: 'crypt', name: 'crash', in: { type: 'black', dur: 0.25 } });

  // ======================================================================
  // 8.70 – 10.30  FUNERAL IN THE RAIN (map)
  // ======================================================================
  NM.shot(8.7, 10.3, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.graveyard;
    const gx = m.grave.x, gy = m.grave.y;
    const cam = { x: Math.round(gx - W / 2), y: Math.round(gy - H / 2 + 10) };
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    const items = NM.propItems(g, m, t);
    items.push({ y: gy + 12, draw: (q) => NM.PROPS.freshGrave(q, gx, gy, { open: 1 }) });
    items.push({ y: gy - 12, draw: (q) => NM.PROPS.coffin(q, gx, gy + 6 + range(0.2, 1.4, lt) * 6) });
    items.push({ y: gy - 20, draw: (q) => NM.PROPS.headstoneNew(q, gx, gy - 16) });
    const mourners = [[-44, -6, 'right'], [-40, 22, 'right'], [44, -4, 'left'], [42, 22, 'left'], [-22, 40, 'up'], [22, 42, 'up'], [-56, 8, 'right'], [58, 10, 'left']];
    mourners.forEach(([dx, dy, dir], i) => items.push({ y: gy + dy, draw: (q) => {
      NM.drawChar(q, i % 3 === 2 ? 'villagerW' : 'mourner', gx + dx, gy + dy, dir, 1);
      // black umbrella
      q.fillStyle = '#07060b'; q.beginPath(); q.ellipse(gx + dx, gy + dy - 30, 11, 6, 0, Math.PI, 0); q.fill(); q.fillRect(gx + dx, gy + dy - 30, 1, 10);
    } }));
    items.push({ y: gy - 30, draw: (q) => NM.drawChar(q, 'priest', gx, gy - 30, 'down', 1) });
    items.push({ y: gy + 34, draw: (q) => NM.drawChar(q, 'isolde', gx, gy + 34, 'up', 1) });
    NM.drawSorted(g, items);
    if (lt > 0.5) NM.balloon(g, 'dots', gx, gy + 34 - 30, 1, lt);
    g.restore();
    NM.rain(g, t, 1, 5, '#8a93b8');
    S.post.tint = { color: '#7d8098', a: 0.55, mode: 'multiply' };
  }, { pal: 'night', name: 'funeral', in: { type: 'black', dur: 0.2 } });

  // ======================================================================
  // 10.30 – 11.55  CLOSE-UP: TEAR TURNS TO BLOOD, EYES IGNITE
  // ======================================================================
  NM.shot(10.3, 11.55, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0b0910'], [1, '#221c36']]);
    const snap = lt > 0.62;
    const zoom = 1 + lt * 0.08;
    g.save();
    g.translate(240, 150); g.scale(zoom, zoom); g.translate(-240, -150);
    NM.isoldeFace(g, 240, 128, 230, snap ? 'crazed' : 'sad', t, 0, snap ? { bloodTear: clamp((lt - 0.62) * 3), tear: 0, noBlink: true } : { noBlink: true });
    g.restore();
    NM.rain(g, t, 0.8, 9, '#8a93b8');
    if (snap) { S.post.flash = Math.max(0, 1 - (lt - 0.62) * 5) * 0.8; S.post.flashColor = '#ff2040'; S.post.chroma = clamp(1 - (lt - 0.62) * 3); S.post.shake = lt < 0.9 ? 2 : 0; }
    if (lt > 1.15) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
  }, { pal: 'portrait', name: 'closeup1' });

  // ======================================================================
  // 11.55 – 23.60  VERSE 1: THE RITUAL AT THE GRAVE (map, night)
  // ======================================================================
  const RIT_CANDLES = 8;
  function graveyardNight(g, S, opt = {}) {
    const t = S.t;
    const m = NM.MAPS.graveyard;
    const gx = m.grave.x, gy = m.grave.y;
    const isoKeys = opt.isoKeys || [[11.55, gx, 430], [14.6, gx, gy + 34, 'up']];
    const st = NM.walk(t, isoKeys, 7);
    const cam = opt.cam || NM.follow(m, st.x, st.y + 24);
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    // magic circle on the ground (under props)
    const sig = opt.sigil ?? 0;
    if (sig > 0) NM.sigil(g, gx, gy + 2, 46, t, sig, { squash: 0.82, width: 0.28, alpha: 0.9, color: '#ff2040', runes: 20, glowA: 0.25 * sig });
    const items = NM.propItems(g, m, t);
    items.push({ y: gy + 12, draw: (q) => NM.PROPS.freshGrave(q, gx, gy, { open: opt.open || 0, rose: !opt.open }) });
    items.push({ y: gy - 20, draw: (q) => NM.PROPS.headstoneNew(q, gx, gy - 16) });
    // ritual candles in a ring
    const lights = [];
    for (let i = 0; i < RIT_CANDLES; i++) {
      const a = (i / RIT_CANDLES) * TAU - Math.PI / 2;
      const cx = gx + Math.cos(a) * 40, cy = gy + 4 + Math.sin(a) * 30;
      const shown = opt.candles ? clamp((t - opt.candles[0] - i * opt.candles[1]) * 6) : 0;
      if (shown <= 0) continue;
      const red = opt.redCandles ? (t > opt.redCandles[0] + i * opt.redCandles[1] ? 1 : 0) : 0;
      items.push({ y: cy, draw: (q) => NM.PROPS.candle(q, cx, cy, { lit: shown, red }, t) });
      lights.push({ x: cx - cam.x, y: cy - 8 - cam.y, r: 34, flicker: true, color: red ? '#ff2040' : null, ca: 0.15 });
    }
    // Isolde
    items.push({ y: st.y, draw: (q) => { NM.drawChar(q, 'isolde', st.x, st.y, st.dir, st.frame); } });
    // her lantern (set down once she arrives)
    let lan;
    if (opt.lanternDown != null && t > opt.lanternDown) {
      lan = { x: gx - 18, y: gy + 40 };
      items.push({ y: lan.y, draw: (q) => { q.fillStyle = '#b08850'; q.fillRect(lan.x - 2, lan.y - 7, 5, 1); q.fillStyle = '#ffcf7a'; q.fillRect(lan.x - 1, lan.y - 6, 3, 5); q.fillStyle = '#b08850'; q.fillRect(lan.x - 2, lan.y - 1, 5, 1); NM.glow(q, lan.x, lan.y - 4, 20, '#ffb347', 0.4); } });
    } else {
      items.push({ y: st.y + 1, draw: (q) => { lan = NM.lantern(q, st, t); } });
    }
    if (opt.extra) opt.extra(items, { gx, gy, st, cam, t });
    NM.drawSorted(g, items);
    if (opt.after) opt.after(g, { gx, gy, st, cam, t });
    g.restore();
    // drifting ground fog
    NM.fog(g, t, 120, 120, 0.18, 8, cam.x * 0.6);
    // darkness with light around lantern / candles / sigil
    const L0 = lan ? { x: lan.x - cam.x, y: lan.y - cam.y, r: 95, flicker: true, color: '#ffb347', ca: 0.12 } : null;
    const all = [...lights];
    if (L0) all.push(L0);
    if (sig > 0) all.push({ x: gx - cam.x, y: gy - cam.y, r: 70 * sig, color: '#ff2040', ca: 0.18 * sig });
    if (opt.lightsExtra) all.push(...opt.lightsExtra(cam));
    NM.darkness(g, all, opt.dark ?? 0.6, '#05040c', t);
    return { m, st, cam, gx, gy };
  }
  NM.graveyardNight = graveyardNight;

  // 11.55 – 14.70  walking up to the grave
  NM.shot(11.55, 14.7, (g, S) => {
    graveyardNight(g, S, {});
  }, { pal: 'night', name: 'v1-walk', in: { type: 'black', dur: 0.4 } });

  // 14.70 – 17.90  candles light one by one
  NM.shot(14.7, 17.9, (g, S) => {
    const r = graveyardNight(g, S, { candles: [15.15, 0.3], lanternDown: 15.0,
      after: (q, c) => { if (S.lt < 1.2) NM.balloon(q, 'dots', c.st.x, c.st.y - 30, 1, S.lt); if (S.t > 17.3) NM.balloon(q, 'heart', c.st.x, c.st.y - 30, 1, S.t); } });
  }, { pal: 'night', name: 'v1-candles' });

  // 17.90 – 20.90  the magic circle draws itself
  NM.shot(17.9, 20.9, (g, S) => {
    const k = clamp((S.t - 18.0) / 2.6);
    graveyardNight(g, S, { candles: [0, 0], lanternDown: 0, sigil: ease.inOutSine(k), dark: 0.66 });
    S.post.tint = { color: '#ff6070', a: 0.12 * k, mode: 'multiply' };
    S.post.shake = S.t > 20.3 ? 1 : 0;
  }, { pal: 'night', name: 'v1-sigil' });

  // 20.90 – 23.60  his soul rises and is chained to her
  NM.shot(20.9, 23.6, (g, S) => {
    const lt = S.lt, t = S.t;
    const rise = ease.outCubic(clamp(lt / 1.2));
    const pull = ease.inOutCubic(clamp((lt - 1.4) / 1.0));
    graveyardNight(g, S, { candles: [0, 0], lanternDown: 0, sigil: 1, dark: 0.68,
      extra: (items, c) => {
        const gxx = c.gx + Math.sin(t * 5) * 6 * (1 - pull) - pull * 6;
        const gyy = c.gy - rise * 34 + pull * 50;
        items.push({ y: c.gy + 200, draw: (q) => {
          // chain from her hand to the soul
          const hx = c.st.x + 6, hy = c.st.y - 14;
          const reach = clamp((lt - 0.9) / 0.5);
          if (reach > 0) NM.chain(q, [hx, hy, (hx + gxx) / 2, Math.min(hy, gyy) - 18 * (1 - pull), gxx, gyy - 14], 5, { color: '#ff3a52', thick: 1.2, reveal: reach, glow: 0.6 });
          NM.drawChar(q, 'ghost', gxx, gyy, 'down', Math.floor(t * 6) % 3, { alpha: 0.85, shadow: false });
          NM.glow(q, gxx, gyy - 14, 30, '#b9e6ff', 0.35);
          if (lt > 2.0) NM.balloon(q, '!', gxx, gyy - 30, 1, t);
        } });
      },
      lightsExtra: (cam) => [{ x: 320 - cam.x, y: 160 - cam.y - rise * 34, r: 50, color: '#b9e6ff', ca: 0.1 }] });
    S.post.shake = lt > 1.4 && lt < 2.4 ? 1 : 0;
  }, { pal: 'night', name: 'v1-soul' });

  // ======================================================================
  // 23.60 – 36.15  PRE-CHORUS 1
  // ======================================================================
  // 23.60 – 26.60  "They call it sin..." — villagers whisper as she passes
  NM.shot(23.6, 26.6, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.village;
    const cam = { x: Math.round(lerp(40, 70, lt / 3)), y: 70 };
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    const items = NM.propItems(g, m, t);
    const iso = NM.walk(t, [[23.6, 120, 262], [26.6, 400, 262]], 7);
    items.push({ y: iso.y, draw: (q) => NM.drawChar(q, 'isolde', iso.x, iso.y, iso.dir, iso.frame) });
    const vill = [[200, 214, 'villager'], [226, 220, 'villagerW'], [252, 212, 'villager2'], [300, 222, 'villager'], [330, 216, 'villagerW'], [160, 228, 'villager2']];
    vill.forEach(([x, y, n], i) => {
      const turned = t > 24.0 + i * 0.25;
      const dir = turned ? (iso.x < x - 10 ? 'left' : iso.x > x + 10 ? 'right' : 'down') : (i % 2 ? 'left' : 'right');
      items.push({ y, draw: (q) => NM.drawChar(q, n, x, y, dir, 1) });
    });
    NM.drawSorted(g, items);
    vill.forEach(([x, y], i) => { const b = t > 24.2 + i * 0.3; if (b) NM.balloon(g, ['dots', 'anger', '!', 'dots', 'anger', 'sweat'][i], x, y - 30, 1, t); });
    g.restore();
    S.post.tint = { color: '#9a90b0', a: 0.35, mode: 'multiply' };
  }, { pal: 'night', name: 'p1-village', in: { type: 'black', dur: 0.25 } });

  // 26.60 – 29.60  "Yet here with you, I grow more strong" — 2x zoom, red aura
  NM.shot(26.6, 29.6, (g, S) => {
    const t = S.t, lt = S.lt;
    // draw the map scene at 1x into a buffer, then show a 2x crop (pixel-perfect zoom)
    const buf = NM._zoomBuf || (NM._zoomBuf = NM.canvas(W, H));
    const bg = buf.getContext('2d');
    bg.setTransform(1, 0, 0, 1, 0, 0); bg.fillStyle = '#000'; bg.fillRect(0, 0, W, H);
    const m = NM.MAPS.graveyard;
    const r = graveyardNight(bg, S, { candles: [0, 0], lanternDown: 0, sigil: 1, dark: 0.7, isoKeys: [[0, m.grave.x, m.grave.y + 34, 'up']],
      extra: (items, c) => items.push({ y: c.gy + 200, draw: (q) => {
        const gxx = c.gx + 14 + Math.sin(t * 2) * 3, gyy = c.gy + 22 + Math.sin(t * 3) * 2;
        NM.chain(q, [c.st.x + 6, c.st.y - 14, (c.st.x + gxx) / 2 + 4, c.st.y - 6, gxx, gyy - 14], 5, { color: '#ff3a52', thick: 1.2, glow: 0.5 });
        NM.drawChar(q, 'ghost', gxx, gyy, 'left', Math.floor(t * 6) % 3, { alpha: 0.8, shadow: false });
        // red aura pulses on the beat
        const b = NM.beat(t, 5);
        NM.glow(q, c.st.x, c.st.y - 14, 26 + b * 16, '#ff2040', 0.35 + b * 0.4);
      } }) });
    const zx = r.st.x - r.cam.x, zy = r.st.y - 16 - r.cam.y;
    g.imageSmoothingEnabled = false;
    const z = 2;
    g.drawImage(buf, clamp(zx - W / (2 * z), 0, W - W / z), clamp(zy - H / (2 * z), 0, H - H / z), W / z, H / z, 0, 0, W, H);
    S.post.shake = NM.beat(t, 8) > 0.6 ? 1 : 0;
    S.post.tint = { color: '#ff8090', a: 0.15, mode: 'multiply' };
  }, { pal: 'night', name: 'p1-strong' });

  // 29.60 – 32.70  "A spell-bound force, I hold, I claim" — skill cut-in
  NM.shot(29.6, 32.7, (g, S) => {
    const t = S.t, lt = S.lt;
    // background: dim graveyard
    const m = NM.MAPS.graveyard;
    graveyardNight(g, S, { candles: [0, 0], lanternDown: 0, sigil: 1, dark: 0.85, isoKeys: [[0, m.grave.x, m.grave.y + 34, 'up']] });
    NM.cutIn(g, t, lt / 3.1, (q, y0, bh, open) => {
      const slide = ease.outCubic(clamp(lt * 2.5));
      const fx = lerp(560, 330, slide);
      NM.isoldeFace(q, fx, y0 + 92, 200, lt < 1.6 ? 'smirk' : 'crazed', t, -0.25, { noBlink: true });
      q.save(); q.font = '32px "UnifrakturMaguntia"'; q.fillStyle = '#ff8a9a'; q.textAlign = 'left';
      q.globalAlpha = range(0.3, 0.6, lt); q.fillText('Soulbind', lerp(-80, 40, slide), y0 + 70);
      q.font = '16px "DotGothic16"'; q.fillStyle = '#ffd0d6'; q.fillText('Forbidden Art', lerp(-80, 42, slide), y0 + 92);
      q.restore();
    });
    S.post.shake = lt < 0.3 ? 2 : 0;
  }, { pal: 'portrait', name: 'p1-cutin' });

  // 32.70 – 35.50  "I live to taste this haunted flame" — candles turn red, quake
  NM.shot(32.7, 35.5, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.graveyard;
    graveyardNight(g, S, { candles: [0, 0], lanternDown: 0, sigil: 1, redCandles: [32.9, 0.22], dark: 0.64 + lt * 0.06, isoKeys: [[0, m.grave.x, m.grave.y + 34, 'up']],
      cam: { x: Math.round(m.grave.x - W / 2), y: Math.round(m.grave.y - H / 2 + 10) },
      after: (q, c) => { if (lt > 1.8) NM.balloon(q, '!', c.st.x, c.st.y - 30, 1, t); } });
    const strike = NM.strikeAt(t, [34.2, 34.9], 0.4);
    S.post.flash = strike.v * 0.6; S.post.flashColor = '#ff2040';
    S.post.shake = 1 + Math.floor(lt);
    S.post.tint = { color: '#ff7080', a: 0.1 + lt * 0.08, mode: 'multiply' };
  }, { pal: 'night', name: 'p1-flame' });

  // 35.50 – 36.15  dropout: silence, only the sigil breathes in the dark
  NM.shot(35.5, 36.15, (g, S) => {
    const t = S.t, lt = S.lt;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const k = lt / 0.65;
    NM.sigil(g, 240, 130, 60 + k * 30, t, 1, { squash: 0.82, width: 0.35, alpha: 0.5 + k * 0.5, color: '#ff2040', runes: 24, glowA: 0.2 + k * 0.4 });
    S.post.ui = 'none';
  }, { pal: 'night', name: 'p1-drop' });
})();
