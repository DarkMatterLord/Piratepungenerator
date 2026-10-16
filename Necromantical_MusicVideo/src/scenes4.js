// Necromantical — scenes 2:06–3:08  (Chorus 3, time-skip, Outro, Ending)
'use strict';
(function () {
  const { clamp, lerp, range, ease, TAU, W, H, C, glow, hash1, hash2, noise1, fbm2 } = NM;
  const T = 16;

  // ======================================================================
  // CHORUS 3  126.05 – 138.30
  // ======================================================================
  // 126.05 – 129.36 the blood moon over her army — pan up from the dead to the tower
  NM.shot(126.05, 129.36, (g, S) => {
    const t = S.t, lt = S.lt;
    const pan = ease.inOutCubic(clamp(lt / 2.6));
    const oy = lerp(-170, 0, pan); // world shifted up while panning
    g.save();
    g.translate(0, oy);
    NM.skyGrad(g, [[0, '#1f0e12'], [0.5, '#561d25'], [1, '#7c2630']], -260, 270);
    NM.moon(g, 300, 80, 92, { blood: 1 });
    NM.clouds(g, t, { y: 120, h: 70, speed: 10, alpha: 0.3, tint: '#a8353a' });
    const st = NM.strikeAt(t, [126.1, 127.4, 128.6], 0.4);
    if (st.v > 0.3) NM.bolt(g, 120 + st.seed * 50, -40, 140 + st.seed * 30, 200, st.seed * 13, st.v, { color: '#ff8a9a', w: 0.4 });
    // tower + balcony with the couple
    NM.silhouette(g, '#0e0709', (s) => {
      s.beginPath(); s.moveTo(150, 520); s.lineTo(166, 190); s.lineTo(150, 190); s.lineTo(150, 178); s.lineTo(250, 178); s.lineTo(250, 190); s.lineTo(234, 190); s.lineTo(250, 520); s.closePath(); s.fill();
      for (let x = 152; x < 250; x += 12) s.fillRect(x, 170, 7, 8);
      NM.figIsolde(s, 186, 178, 66, { dir: 1, wind: 1.2, armF: [2.6, 0.2], armB: [2.4, 0.1], glow: 0 }, t);
      NM.figLucien(s, 214, 178, 70, { dir: -1, armF: [0.2, 0.2] }, t);
      // the ridge of the army below
      NM.ridge(s, 6, 340, 10, 0.02, '#000', -50, 530, 600);
    }, { dx: 1, a: 1 });
    // her raised hands glow
    glow(g, 188, 128, 28, '#ff2040', 0.7 + NM.beat(t, 5) * 0.3);
    // the army of the dead: rows of silhouettes with red eyes
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 26; i++) {
        const x = i * 20 + (row % 2) * 10 - 10 + Math.sin(t * 2 + i + row) * 1.5, y = 300 + row * 24;
        const s = 26 + row * 6;
        g.fillStyle = '#0e0709';
        g.beginPath(); g.ellipse(x, y - s * 0.85, s * 0.18, s * 0.2, 0, 0, TAU); g.fill();
        g.fillRect(x - s * 0.22, y - s * 0.68, s * 0.44, s * 0.7);
        if ((i + row) % 3 !== 1) { g.fillRect(x - s * 0.3, y - s * 0.62 - (i % 2) * s * 0.3, s * 0.08, s * 0.4); }
        g.fillStyle = '#ff3a52'; g.fillRect(Math.round(x - 2), Math.round(y - s * 0.87), 1, 1); g.fillRect(Math.round(x + 1), Math.round(y - s * 0.87), 1, 1);
      }
    }
    g.restore();
    NM.particles(g, t, { n: 30, seed: 81, kind: 'dot', vx: 6, vy: -24, drift: 12, size: [0.6, 1.3], color: '#ff8a9a', alpha: 0.8, twinkle: 3 });
    if (lt < 0.9) NM.title(g, 'Necromantical', 240, 60, 46, t, clamp(lt * 3), { blur: 6, drips: lt, alpha: 1 - range(0.7, 0.9, lt) });
    S.post.flash = st.v * 0.45; S.post.flashColor = '#ff2040';
    S.post.shake = lt < 0.3 ? 3 : 0;
  }, { pal: 'blood', name: 'c3-moon', in: { type: 'red', dur: 0.35 } });

  // 129.36 – 132.30 the overworld map: her cruel domain spreads
  let world = null, worldDead = null;
  function buildWorld(dead) {
    const c = NM.canvas(W, H), q = c.getContext('2d');
    const img = q.createImageData(W, H), d = img.data;
    const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const P = dead
      ? { water: hex('#3a0a14'), water2: hex('#7a0e22'), sand: hex('#4a3a2e'), grass: hex('#2e2420'), grass2: hex('#4a3a2e'), forest: hex('#14100c'), mtn: hex('#2b2a45'), mtn2: hex('#3d3f63'), snow: hex('#8a93b8') }
      : { water: hex('#2b2a45'), water2: hex('#3d3f63'), sand: hex('#6e5640'), grass: hex('#2c4235'), grass2: hex('#456148'), forest: hex('#1c2a24'), mtn: hex('#3d3f63'), mtn2: hex('#5a6287'), snow: hex('#c8cfe6') };
    const terr = (x, y) => {
      const h = fbm2(x * 0.008 + 11, y * 0.008 + 3, 4) + (y < 70 ? (70 - y) / 140 : 0) - Math.hypot(x - 110, y - 210) / 900;
      const lake = Math.hypot((x - 400) / 60, (y - 200) / 34) + fbm2(x * 0.03, y * 0.03, 2) * 0.4;
      const moist = fbm2(x * 0.018 + 40, y * 0.018 - 9, 3);
      if (lake < 1) return lake < 0.8 ? 'water' : 'sand';
      if (h > 0.38) return h > 0.5 ? 'snow' : 'mtn';
      if (moist > 0.1) return 'forest';
      return 'grass';
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = terr(x, y), o = (y * W + x) * 4;
      let col = P[k];
      if (k === 'grass' && hash2(x, y) < 0.12) col = P.grass2;
      if (k === 'water' && hash2(x >> 2, y) < 0.08) col = P.water2;
      if (k === 'mtn' && ((x + y) % 7 === 0)) col = P.mtn2;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    q.putImageData(img, 0, 0);
    // icons on a grid: trees on forest, peaks on mountains
    for (let y = 4; y < H; y += 8) for (let x = 4 + ((y / 8) % 2) * 4; x < W; x += 8) {
      const k = terr(x, y);
      if (k === 'forest') {
        if (dead) { q.fillStyle = '#120f1c'; q.fillRect(x, y - 3, 1, 6); q.fillRect(x - 2, y - 2, 2, 1); q.fillRect(x + 1, y - 1, 2, 1); }
        else { q.fillStyle = '#14201b'; q.fillRect(x - 3, y - 2, 7, 5); q.fillStyle = '#456148'; q.fillRect(x - 2, y - 3, 5, 3); q.fillStyle = '#2e2420'; q.fillRect(x, y + 3, 1, 2); }
      } else if (k === 'mtn' || k === 'snow') {
        q.fillStyle = dead ? '#1d1a2e' : '#2b2a45'; q.beginPath(); q.moveTo(x - 5, y + 4); q.lineTo(x, y - 5); q.lineTo(x + 5, y + 4); q.fill();
        q.fillStyle = P.snow ? `rgb(${P.snow.join(',')})` : '#fff'; q.fillRect(x - 1, y - 4, 2, 2);
      }
    }
    // road, village, church, mansion
    q.strokeStyle = dead ? '#3a2a22' : '#8a6a4c'; q.lineWidth = 2;
    q.beginPath(); q.moveTo(330, 128); q.quadraticCurveTo(250, 176, 156, 158); q.quadraticCurveTo(100, 150, 40, 230); q.stroke();
    for (const [x, y] of [[140, 146], [152, 152], [134, 158], [148, 164], [162, 160]]) { q.fillStyle = dead ? '#4a3a2e' : '#c8cfe6'; q.fillRect(x, y, 7, 5); q.fillStyle = dead ? '#2e2420' : '#7a0e22'; q.beginPath(); q.moveTo(x - 1, y); q.lineTo(x + 3.5, y - 4); q.lineTo(x + 8, y); q.fill(); }
    q.fillStyle = dead ? '#2b2a45' : '#8a93b8'; q.fillRect(170, 134, 8, 10); q.beginPath(); q.moveTo(170, 134); q.lineTo(174, 124); q.lineTo(178, 134); q.fill();
    q.fillStyle = '#1d1a2e'; q.beginPath(); q.ellipse(333, 120, 22, 8, 0, 0, TAU); q.fill();
    q.fillStyle = '#120f1c'; q.fillRect(322, 104, 22, 14); q.beginPath(); q.moveTo(320, 104); q.lineTo(333, 92); q.lineTo(346, 104); q.fill(); q.fillRect(330, 84, 6, 10);
    q.fillStyle = '#ff3a52'; q.fillRect(331, 110, 3, 3);
    return c;
  }
  NM.shot(129.36, 132.3, (g, S) => {
    const t = S.t, lt = S.lt;
    if (!world) { world = buildWorld(false); worldDead = buildWorld(true); }
    g.drawImage(world, 0, 0);
    const r = ease.inOutSine(clamp((lt - 0.7) / 2.1)) * 430;
    // corruption: dead world revealed through a soft-edged circle (dithered by the quantizer)
    const tmp = NM._worldTmp || (NM._worldTmp = NM.canvas(W, H));
    const q = tmp.getContext('2d'); q.globalCompositeOperation = 'copy'; q.drawImage(worldDead, 0, 0);
    q.globalCompositeOperation = 'destination-in';
    const gr = q.createRadialGradient(333, 112, Math.max(0, r - 30), 333, 112, r + 1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    q.fillStyle = gr; q.fillRect(0, 0, W, H);
    q.globalCompositeOperation = 'source-over';
    g.drawImage(tmp, 0, 0);
    glow(g, 333, 112, 30 + r * 0.3, '#ff2040', 0.3);
    if (r > 16) { g.strokeStyle = '#ff3a52'; g.lineWidth = 1; g.globalAlpha = 0.6; g.beginPath(); g.arc(333, 112, r - 14, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    // clouds' shadows drifting over the world
    NM.band(g, NM.A.wisps, 20, 120, 600, t * 30, 0.25);
    // map cursor + region name
    S.post.extraUI = [(u) => {
      const o = range(0.2, 0.35, lt);
      if (NM.uiWindow(u, 8, 8, 170, 30, o)) NM.uiText(u, lt < 1.7 ? 'Ashgrove Vale' : 'Isolde\'s Domain', 18, 15, { color: lt < 1.7 ? '#f2ece6' : '#ff5a6e' });
    }];
  }, { pal: 'night', name: 'c3-world', in: { type: 'black', dur: 0.2 } });

  // 132.30 – 135.40 "In life you fled, in death you stay" — he runs; the chain drags him back
  NM.shot(132.3, 135.4, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.graveyard;
    const ix = m.grave.x, iy = m.grave.y + 34;
    const lucKeys = [[132.3, ix + 20, iy + 4], [134.0, ix + 20, iy + 110]];
    let luc = NM.walk(t, lucKeys, 6);
    const yank = ease.inCubic(clamp((lt - 1.9) / 0.35));
    if (yank > 0) luc = { x: ix + 20, y: lerp(iy + 110, iy + 10, yank), dir: 'up', frame: 1 };
    const cam = NM.follow(m, ix, iy + 60);
    NM.graveyardNight(g, S, { cam, isoKeys: [[0, ix, iy, 'down']], lanternDown: 0, candles: [0, 0], sigil: 1, dark: 0.6,
      extra: (items) => items.push({ y: luc.y, draw: (q) => NM.drawChar(q, 'lucien', luc.x, luc.y, luc.dir, luc.frame) }),
      after: (q) => {
        const sag = yank > 0 ? 2 : clamp(1 - lt / 1.7) * 18;
        NM.chain(q, [ix + 6, iy - 14, (ix + luc.x) / 2 + 10, (iy + luc.y) / 2 + sag, luc.x, luc.y - 18], 4, { color: '#ff3a52', thick: 1, glow: lt > 1.6 ? 0.9 : 0.4 });
        if (lt > 0.4 && lt < 1.9) NM.balloon(q, 'sweat', luc.x, luc.y - 30, 1, t);
        if (lt > 1.7) NM.balloon(q, 'anger', ix, iy - 30, 1, t);
        if (yank >= 1) NM.balloon(q, '!', luc.x, luc.y - 30, 1, t);
      } });
    S.post.shake = yank > 0 && yank < 1 ? 2 : 0;
  }, { pal: 'night', name: 'c3-flee', in: { type: 'black', dur: 0.15 } });

  // 135.40 – 138.30 "Forever locked in my decay" — the rose in chains (cover art), the lock clicks
  NM.shot(135.4, 138.3, (g, S) => {
    const t = S.t, lt = S.lt;
    // grey stone wall with bars, like the cover
    NM.skyGrad(g, [[0, '#4c4c54'], [0.5, '#66666e'], [1, '#36363e']]);
    for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? '#55555c' : '#3a3a42'; g.fillRect(hash1(i) * W, hash1(i * 3) * H, 20 + hash1(i * 5) * 60, 1); }
    g.fillStyle = '#141418'; g.fillRect(70, 0, 14, H); g.fillRect(396, 0, 14, H); g.fillRect(0, 150, W, 6);
    glow(g, 240, 100, 160, '#c8c8ca', 0.25);
    // hanging chains framing the rose
    const sw = Math.sin(t * 1.2) * 4;
    NM.chain(g, [120, -10, 110 + sw, 120, 140, 270], 9, { color: '#141418', thick: 2.2, highlight: '#86868c' });
    NM.chain(g, [360, -10, 370 - sw, 120, 340, 270], 9, { color: '#141418', thick: 2.2, highlight: '#86868c' });
    NM.chain(g, [-10, 60, 240, 150 + sw, 490, 70], 9, { color: '#141418', thick: 2.2, highlight: '#86868c' });
    NM.chain(g, [240, -10, 236, 60, 240, 100], 9, { color: '#141418', thick: 2.2, highlight: '#86868c' });
    const wither = range(1.1, 2.8, lt);
    NM.rose(g, 240, 102, 2.1, -0.15, { wither, petal: '#c4122f', deep: '#7a0e22', stemColor: '#14180f' });
    // chains wrapping the stem, and the padlock
    NM.chain(g, [170, 190, 240, 160, 310, 196], 8, { color: '#141418', thick: 2, highlight: '#a6a6aa' });
    const lockK = ease.outBack(clamp((lt - 0.35) / 0.5));
    const ly = lerp(150, 196, lockK);
    g.fillStyle = '#24242a'; g.fillRect(226, ly, 28, 22); g.fillStyle = '#66666e'; g.fillRect(226, ly, 28, 2);
    g.strokeStyle = '#4c4c54'; g.lineWidth = 4; g.beginPath(); g.arc(240, ly, 9, Math.PI, 0); g.stroke();
    g.fillStyle = '#08080a'; g.fillRect(238, ly + 8, 4, 8);
    if (lt > 0.85 && lt < 1.05) { glow(g, 240, ly + 10, 30, '#ff3a52', 0.8); S.post.shake = 1; }
    // falling petals as it decays
    if (wither > 0) NM.particles(g, lt, { n: 10, seed: 91, kind: 'petal', x: 200, y: 60, w: 80, h: 200, vy: 30, drift: 14, size: [1.6, 2.4], alpha: wither });
  }, { pal: 'cover', name: 'c3-rose', in: { type: 'fade', dur: 0.25 } });

  // ======================================================================
  // INSTRUMENTAL — TIME PASSES  138.30 – 149.50
  // ======================================================================
  NM.shot(138.3, 140.3, (g, S) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    S.post.ui = 'none';
    const a = range(0.15, 0.6, S.lt) * (1 - range(1.6, 1.95, S.lt));
    S.post.extraUI = [(u) => { if (a > 0.5) NM.uiText(u, '-  Many years later  -', W / 2, 126, { align: 'center', color: '#ece6da' }); }];
  }, { pal: 'night', name: 'skip' });

  // 140.30 – 145.00 the mansion through the seasons (day/night time-lapse)
  NM.shot(140.3, 145.0, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.mansionExt, door = m.door;
    const cam = { x: Math.round(door.x - W / 2), y: 20 };
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    const decay = clamp(lt / 4.7);
    // creeping dead vines
    const R = NM.rng(5);
    g.fillStyle = '#1d1a2e';
    for (let i = 0; i < 70 * decay; i++) { const x = R() * m.pw, y = 48 + R() * 110; g.fillRect(Math.round(x), Math.round(y), 1, 3 + Math.floor(R() * 8)); }
    // new graves appear in the yard, one per "year"
    const items = NM.propItems(g, m, t);
    for (let i = 0; i < 9; i++) if (decay * 9 > i) items.push({ y: 230 + (i % 3) * 30, draw: (q) => NM.PROPS[i % 2 ? 'cross' : 'tomb'](q, 60 + i * 44 + (i % 2) * 10, 230 + (i % 3) * 30, {}) });
    // the cat keeps watch
    items.push({ y: 220, draw: (q) => NM.drawChar(q, 'cat', door.x - 30, 220, 'down', 1) });
    NM.drawSorted(g, items);
    // silhouettes dancing in the lit window
    const w = m.objects.find((o) => o.type === 'window' && o.lit && o.y < 100);
    if (w) { const ph = Math.sin(t * 6); g.fillStyle = '#120f1c'; g.fillRect(w.x - 4 + Math.round(ph * 2), w.y - 20, 3, 8); g.fillRect(w.x + 1 - Math.round(ph * 2), w.y - 21, 3, 9); }
    g.restore();
    // day/night cycle: fast sweeps of tint
    const cyc = (lt / 4.7) * 3;
    const day = 0.5 - 0.5 * Math.cos(cyc * TAU);
    const night = 1 - day;
    const sun = { color: day > 0.5 ? '#ffe0c0' : '#8a7aa0', a: 0.0 };
    NM.darkness(g, [{ x: door.x - cam.x, y: 40, r: 60, flicker: true }], 0.15 + night * 0.55, '#05040c', t);
    if (day > 0.3) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = (day - 0.3) * 0.8; g.fillStyle = '#ffd0a0'; g.fillRect(0, 0, W, H); g.restore(); }
    // the moon/sun racing across the top
    const ax = ((cyc % 1) * (W + 60)) - 30;
    glow(g, ax, 12, 30, night > 0.5 ? '#c8cfe6' : '#ffcf7a', 0.6);
    S.post.ui = 'none';
    S.post.extraUI = [(u) => { NM.uiWindow(u, W - 112, 8, 104, 28, 1) && NM.uiText(u, `Year ${1871 + Math.floor(decay * 120)}`, W - 100, 14, { color: '#ffd0d6' }); }];
  }, { pal: 'night', name: 'timelapse', in: { type: 'black', dur: 0.3 } });

  // 145.00 – 149.50 their portrait ages on the wall; the candle burns down
  NM.shot(145.0, 149.5, (g, S) => {
    const t = S.t, lt = S.lt;
    const age = clamp(lt / 4.3);
    g.fillStyle = '#1c1114'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 24) { g.fillStyle = '#2a2440'; g.fillRect(x, 0, 2, H); }
    // ornate frame
    g.fillStyle = '#83603f'; g.fillRect(130, 14, 220, 176); g.fillStyle = '#e8c070'; g.fillRect(134, 18, 212, 168); g.fillStyle = '#b08850'; g.fillRect(140, 24, 200, 156);
    g.save(); g.beginPath(); g.rect(146, 30, 188, 144); g.clip();
    g.fillStyle = '#2e1a1e'; g.fillRect(146, 30, 188, 144);
    glow(g, 240, 90, 120, '#633236', 0.6);
    NM.lucienFace(g, 280, 98, 104, 'hollow', 0, 0.2, { noBlink: true });
    NM.isoldeFace(g, 204, 96, 104, 'smile', 0, -0.2, { noBlink: true });
    // craquelure + fading
    g.globalAlpha = age * 0.6; g.fillStyle = '#46262a'; g.fillRect(146, 30, 188, 144); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(20,10,10,0.8)'; g.lineWidth = 1;
    const R = NM.rng(3);
    for (let i = 0; i < 40 * age; i++) { const x = 146 + R() * 188, y = 30 + R() * 144; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 20, y + (R() - 0.5) * 20); g.stroke(); }
    g.restore();
    // cobweb grows in the corner
    NM.PROPS.cobweb(g, 134, 18, { s: 10 + 40 * age });
    // candle burning down beneath
    const ch = lerp(46, 6, age);
    g.fillStyle = '#e8e2d8'; g.fillRect(234, 236 - ch, 12, ch); g.fillStyle = '#b08850'; g.fillRect(222, 236, 36, 4);
    NM.flame(g, 240, 236 - ch, 10, t, 7, { color: '#ffcf7a', glowR: 7, glowA: 0.5 });
    NM.particles(g, t, { n: 30, seed: 101, kind: 'dot', vx: 3, vy: 4, drift: 8, size: [0.4, 0.9], color: '#e8e2d8', alpha: 0.4 });
    S.post.ui = 'none';
  }, { pal: 'mansion', name: 'portrait', in: { type: 'fade', dur: 0.3 }, out: { dur: 0.3 } });

  // ======================================================================
  // OUTRO A  149.50 – 161.90
  // ======================================================================
  // 149.50 – 152.85 "So whisper low, confess your fear"
  NM.shot(149.5, 152.85, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#141022'], [1, '#2c2030']]);
    glow(g, 300, 100, 160, '#7a0e22', 0.35);
    const d = lt * 3;
    NM.isoldeFace(g, 352 - d, 104, 210, lt < 1.8 ? 'tender' : 'smirk', t, -0.72, {});
    NM.lucienFace(g, 170 + d * 0.5, 132, 220, 'sleep', t, -0.55, { noBlink: true });
    // whisper: faint breath marks drifting from her lips to his ear
    for (let i = 0; i < 4; i++) { const k = (t * 0.6 + i / 4) % 1; glow(g, lerp(300, 252, k), 156 - k * 10, 6, '#ffd0d6', 0.45 * Math.sin(k * Math.PI)); }
  }, { pal: 'portrait', name: 'oa-whisper', in: { type: 'black', dur: 0.5 } });

  // 152.85 – 155.70 "In death's embrace, you're chained right here" — they embrace, the chain winds round them
  NM.shot(152.85, 155.7, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.ballroom, c = m.center;
    NM.zoom2(g, (q) => NM.ballroomScene(q, S, { dark: 0.68, chandelier: 0.6,
      chars: [{ name: 'isolde', x: c.x - 7, y: c.y + 10, dir: 'right', frame: 1 }, { name: 'lucien', x: c.x + 7, y: c.y + 10, dir: 'left', frame: 1 }],
      after: (qq) => {
        // chain spiralling around both
        const k = clamp(lt / 2.2);
        for (let i = 0; i < 40 * k; i++) {
          const a = i * 0.55 + t * 0.5, y = c.y + 6 - i * 0.55;
          const x = c.x + Math.cos(a) * 16, yy = y + Math.sin(a) * 4;
          if (Math.sin(a) < 0 && i > 2) continue;
          qq.fillStyle = i % 2 ? '#ff3a52' : '#7a0e22'; qq.fillRect(Math.round(x), Math.round(yy), 2, 1);
        }
        glow(qq, c.x, c.y - 10, 26, '#ff2040', 0.4 * k);
        if (lt > 1.6) NM.balloon(qq, 'heart', c.x, c.y - 22, 1, t);
      } }), W / 2, H / 2 + 6);
  }, { pal: 'ballroom', name: 'oa-embrace', in: { type: 'black', dur: 0.2 } });

  // 155.70 – 158.65 "They'll say it's wrong, a tale profaned" — the storybook
  NM.shot(155.7, 158.65, (g, S) => {
    const t = S.t, lt = S.lt;
    g.fillStyle = '#1c1114'; g.fillRect(0, 0, W, H);
    glow(g, 240, 120, 200, '#83603f', 0.5);
    // lectern + book
    g.fillStyle = '#3a2a22'; g.beginPath(); g.moveTo(80, 200); g.lineTo(400, 200); g.lineTo(380, 230); g.lineTo(100, 230); g.fill();
    g.fillStyle = '#5c4130'; g.fillRect(80, 194, 320, 8);
    const pageL = '#e6cd96', pageR = '#f6ead0';
    g.fillStyle = '#46262a'; g.fillRect(96, 28, 288, 172);
    g.fillStyle = pageL; g.fillRect(102, 32, 136, 162); g.fillStyle = pageR; g.fillRect(242, 32, 136, 162);
    g.fillStyle = '#a98652'; g.fillRect(238, 32, 4, 162);
    // left page: illustration of the couple in a vignette
    g.save(); g.beginPath(); g.ellipse(170, 110, 52, 66, 0, 0, TAU); g.clip();
    g.fillStyle = '#86663f'; g.fillRect(100, 40, 140, 150);
    NM.silhouette(g, '#2b1f16', (s) => {
      NM.figLucien(s, 186, 170, 108, { dir: -1, armF: [1.3, 0.4] }, t);
      NM.figIsolde(s, 154, 170, 100, { dir: 1, armF: [1.4, 0.3], wind: 0.6 }, t);
    });
    g.restore();
    g.strokeStyle = '#634a2e'; g.lineWidth = 2; g.beginPath(); g.ellipse(170, 110, 52, 66, 0, 0, TAU); g.stroke();
    // a page turning
    const k = clamp((lt - 1.4) / 0.7);
    if (k > 0 && k < 1) {
      const w = 136 * Math.cos(k * Math.PI);
      g.fillStyle = '#f6ead0'; g.fillRect(242 + Math.min(0, w), 32, Math.abs(w), 162);
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(242 + Math.min(0, w), 32, 3, 162);
    }
    NM.flame(g, 420, 160, 10, t, 4, { color: '#ffcf7a', glowR: 8, glowA: 0.5 }); g.fillStyle = '#e8e2d8'; g.fillRect(415, 160, 10, 34);
    S.post.extraUI = [(u) => {
      if (k < 0.5) {
        u.save(); u.font = '16px "DotGothic16"'; u.fillStyle = '#45321f'; u.textAlign = 'center';
        u.fillText('The Bride of', 310, 52); u.fillText('the Grave', 310, 70);
        u.font = '12px "DotGothic16"';
        const lines = ['She would not let', 'him sleep. They', 'say it was a sin.', 'She says it', 'was love.'];
        lines.forEach((l, i) => u.fillText(l, 310, 96 + i * 15));
        u.restore();
      }
    }];
  }, { pal: 'sepia', name: 'oa-book', in: { type: 'black', dur: 0.2 } });

  // 158.65 – 161.50 "But darling, we are death's ordained" — hand in hand before the moon
  NM.shot(158.65, 161.5, (g, S) => {
    const t = S.t, lt = S.lt;
    const push = 1 + lt * 0.03;
    g.save(); g.translate(240, 140); g.scale(push, push); g.translate(-240, -140);
    NM.skyGrad(g, [[0, '#1f0e12'], [0.6, '#561d25'], [1, '#7c2630']]);
    NM.stars(g, t, 60, 9, 0.8, 0, 0, W, 140);
    NM.moon(g, 240, 100, 96, { blood: 0.3 });
    NM.ridge(g, 8, 196, 6, 0.01, '#1f0e12');
    NM.silhouette(g, '#1f0e12', (s) => { for (const [x, ty] of [[80, 1], [120, 0], [370, 2], [420, 5]]) NM.grave(s, x, NM.ridgeY(8, 198, 6, 0.01, x), 16, 26, ty); });
    NM.figLucien(g, 258, 200, 132, { dir: -1, armF: [0.75, 0.15], armB: [0.1, 0.2], expr: 'hollow', turn: 0.45 }, t, { colors: { coat: '#1f0e12', coatHi: '#35151b', rim: '#d0554f' } });
    NM.figIsolde(g, 222, 200, 124, { dir: 1, armF: [0.75, 0.15], armB: [0.2, 0.4], expr: 'tender', turn: 0.45, wind: 0.7 }, t, { colors: { dress: '#1f0e12', dressHi: '#35151b', dressRim: '#d0554f' } });
    glow(g, 240, 150, 16, '#ff3a52', 0.6);
    for (let i = 0; i < 24; i++) NM.lily(g, (i * 37 + 3) % 500 - 10, 276 - (i % 3) * 4, 22 + (i % 4) * 5, t, i + 3);
    g.restore();
    NM.particles(g, t, { n: 22, seed: 111, kind: 'petal', vx: -10, vy: 18, drift: 16, size: [1.4, 2.2], alpha: 0.85 });
  }, { pal: 'blood', name: 'oa-ordained', in: { type: 'fade', dur: 0.4 } });

  NM.shot(161.5, 161.9, (g, S) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }, { pal: 'blood', name: 'oa-drop' });

  // ======================================================================
  // OUTRO B  161.90 – 173.60
  // ======================================================================
  // 161.90 – 164.75 the title, now with him beside her (bookend)
  NM.shot(161.9, 164.75, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#1f0e12'], [0.55, '#561d25'], [1, '#7c2630']]);
    NM.stars(g, t, 50, 5, 0.8, 0, 0, W, 120);
    NM.moon(g, 336, 92, 58, { blood: 0.8 });
    const st = NM.strikeAt(t, [162.0, 163.3], 0.4);
    if (st.v > 0.3) NM.bolt(g, 100 + st.seed * 40, -10, 130, 160, st.seed * 9, st.v, { color: '#ff8a9a', w: 0.4 });
    NM.ridge(g, 3, 196, 10, 0.012, '#35151b');
    NM.silhouette(g, '#1f0e12', (s) => {
      for (const [x, ty, sc] of [[60, 1, 0.5], [110, 0, 0.45], [175, 2, 0.55], [400, 5, 0.5], [440, 1, 0.45]]) NM.grave(s, x, NM.ridgeY(3, 198, 10, 0.012, x), 18 * sc * 2, 30 * sc * 2, ty);
      NM.figIsolde(s, 296, NM.ridgeY(3, 198, 10, 0.012, 296) + 2, 64, { dir: 1, wind: 0.8, armF: [0.9, 0.2] }, t);
      NM.figLucien(s, 318, NM.ridgeY(3, 198, 10, 0.012, 318) + 2, 70, { dir: -1, armF: [0.9, 0.2] }, t);
    });
    NM.deadTree(g, 18, 300, 300, 21, t, { color: '#0e0709', depth: 7, lean: 0.25 });
    NM.deadTree(g, 470, 290, 240, 8, t, { color: '#0e0709', depth: 7, lean: -0.3 });
    NM.ridge(g, 9, 238, 6, 0.02, '#0e0709');
    for (let i = 0; i < 26; i++) NM.lily(g, (i * 37 + 13) % 500 - 10, 270 - (i % 3) * 4, 26 + (i % 4) * 6, t, i);
    NM.particles(g, t, { n: 30, seed: 4, kind: 'petal', vx: -30, vy: 26, drift: 18, size: [1.5, 2.6], alpha: 0.9 });
    g.save();
    g.font = '58px "UnifrakturMaguntia"'; g.textAlign = 'center';
    g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#0e0709'; g.strokeText('Necromantical', 240, 98);
    const lg = g.createLinearGradient(0, 56, 0, 100); lg.addColorStop(0, '#fde4d6'); lg.addColorStop(0.45, '#ec8a7a'); lg.addColorStop(1, '#a8353a');
    g.fillStyle = lg; g.fillText('Necromantical', 240, 98);
    g.restore();
    S.post.flash = st.v * 0.5; S.post.flashColor = '#ff2040';
    S.post.shake = lt < 0.3 ? 2 : 0;
  }, { pal: 'blood', name: 'ob-title', in: { type: 'red', dur: 0.4 } });

  // 164.75 – 167.65 "This love of dark, the final price" — her own hand has begun to decay
  NM.shot(164.75, 167.65, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#141022'], [1, '#2c2030']]);
    glow(g, 160, 120, 140, '#4c4570', 0.4);
    NM.isoldeFace(g, 320, 118, 210, lt < 1.5 ? 'sad' : 'smile', t, -0.3, { tear: lt < 1.5 ? 1 : 0 });
    const lift = ease.outCubic(clamp(lt / 0.8));
    const flesh = 1 - range(0.8, 2.2, lt);
    // the glove peels away to bone
    NM.handBone(g, 150, lerp(300, 200, lift), 150, -Math.PI / 2 + 0.15, 0.25, '#e8e2ec', 0.25);
    g.save(); g.globalAlpha = flesh;
    NM.handGlove(g, 150, lerp(300, 200, lift), 150, -Math.PI / 2 + 0.15, 0.25, '#141022', '#6a6080');
    g.restore();
    if (flesh < 0.95) NM.particles(g, lt, { n: 16, seed: 121, kind: 'dot', x: 110, y: 60, w: 90, h: 100, vy: -16, drift: 12, size: [0.6, 1.4], color: '#332c4f', alpha: 1 - flesh });
  }, { pal: 'portrait', name: 'ob-price', in: { type: 'black', dur: 0.15 } });

  // 167.65 – 170.45 "I wear your soul, a triumph cold" — the locket glows on her breast
  NM.shot(167.65, 170.45, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#1a0a14'], [1, '#332c4f']]);
    const z = 1 + lt * 0.05;
    g.save(); g.translate(240, 135); g.scale(z, z); g.translate(-240, -135);
    NM.isoldeFace(g, 240, 92, 150, lt < 1.2 ? 'cold' : 'smirk', t, 0, { look: [0.2, 0.3] });
    g.restore();
    // locket over the cameo
    const lx = 240, ly = 92 + 150 * 0.5 * z;
    const pulse = 0.7 + 0.3 * Math.sin(t * 5);
    glow(g, lx, ly, 40 * pulse, '#b9e6ff', 0.8);
    g.fillStyle = '#e8c070'; g.beginPath(); g.moveTo(lx, ly + 9); g.bezierCurveTo(lx - 14, ly, lx - 9, ly - 11, lx, ly - 5); g.bezierCurveTo(lx + 9, ly - 11, lx + 14, ly, lx, ly + 9); g.fill();
    g.fillStyle = '#b9e6ff'; g.fillRect(lx - 2, ly - 2, 4, 4);
    g.strokeStyle = '#b08850'; g.lineWidth = 1; g.beginPath(); g.moveTo(lx, ly - 5); g.lineTo(lx - 30, ly - 40); g.moveTo(lx, ly - 5); g.lineTo(lx + 30, ly - 40); g.stroke();
  }, { pal: 'portrait', name: 'ob-locket', in: { type: 'black', dur: 0.15 } });

  // 170.45 – 173.60 "The lifeless heart, in death's firm hold"
  NM.shot(170.45, 173.6, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0e0709'], [1, '#35151b']]);
    const b = NM.beat(t, 7) * (1 - range(1.6, 2.6, lt));
    glow(g, 240, 120, 120, '#ff2040', 0.2 + b * 0.4);
    // heart resting in her palm
    const squeeze = range(1.2, 2.4, lt);
    g.save(); g.translate(240, 118); g.scale(1.5 * (1 - squeeze * 0.12), 1.5 * (1 - squeeze * 0.08));
    g.fillStyle = '#7c2630';
    g.beginPath(); g.moveTo(-6, -26); g.lineTo(-6, -40); g.lineTo(2, -40); g.lineTo(2, -24); g.fill();
    g.beginPath(); g.moveTo(6, -24); g.quadraticCurveTo(10, -44, 24, -40); g.lineTo(22, -34); g.quadraticCurveTo(14, -36, 13, -22); g.fill();
    g.fillStyle = '#a8353a';
    g.beginPath(); g.moveTo(0, 34); g.bezierCurveTo(-34, 12, -30, -28, -6, -26); g.bezierCurveTo(10, -32, 34, -16, 22, 8); g.quadraticCurveTo(14, 24, 0, 34); g.fill();
    g.fillStyle = '#ec8a7a'; g.beginPath(); g.ellipse(-14, -8, 4, 7, 0.4, 0, TAU); g.fill();
    g.restore();
    // her black-gloved hand cups it from below, fingers curling over the front
    const k = squeeze;
    g.lineCap = 'round';
    const stroke2 = (pts, w) => { for (const [lw, col] of [[w + 2, '#d0554f'], [w, '#0e0709']]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(pts[0], pts[1]); g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); g.stroke(); } };
    // wrist and sleeve from the bottom right, lace cuff
    stroke2([330, 280, 300, 230, 272, 196], 30);
    for (let j = -3; j <= 3; j++) { g.fillStyle = '#fde4d6'; g.beginPath(); g.arc(292 + j * 5, 214 - j * 3, 3, 0, TAU); g.fill(); }
    // palm
    g.fillStyle = '#d0554f'; g.beginPath(); g.ellipse(240, 170, 46, 20, -0.1, 0, TAU); g.fill();
    g.fillStyle = '#0e0709'; g.beginPath(); g.ellipse(240, 171, 44, 18, -0.1, 0, TAU); g.fill();
    // thumb (left) and four fingers (right) curling over the heart
    stroke2([200, 168, 186 - k * 4, 140, 204 + k * 10, 118 - k * 6], 10);
    for (let i = 0; i < 4; i++) {
      const bx = 262 - i * 2, by = 168 - i * 4;
      stroke2([bx + 18, by, bx + 26 - k * 6, by - 30 - i * 4, bx - 6 - k * (22 + i * 6), by - 44 - i * 6 + k * 8], 8);
    }
    g.fillStyle = '#ff3a52'; g.fillRect(268, 132, 3, 3); glow(g, 269, 133, 8, '#ff3a52', 0.7);
    // drips
    for (let i = 0; i < 5; i++) { const k = ((t * 0.9 + i * 0.21) % 1); g.fillStyle = '#a8353a'; g.fillRect(212 + i * 12, 230 + k * 50, 2, 3); }
    if (lt > 2.9) { S.post.flash = 0.6; S.post.flashColor = '#ff2040'; }
  }, { pal: 'blood', name: 'ob-heart', in: { type: 'black', dur: 0.15 } });

  // ======================================================================
  // ENDING  173.60 – 188.76
  // ======================================================================
  // 173.60 – 178.40 the mansion at night; two shadows still dance in the window
  NM.shot(173.6, 178.4, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.mansionExt, door = m.door;
    const cam = { x: Math.round(door.x - W / 2), y: Math.round(lerp(0, 120, ease.inOutSine(clamp(lt / 4.8)))) };
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    const items = NM.propItems(g, m, t);
    for (let i = 0; i < 9; i++) items.push({ y: 230 + (i % 3) * 30, draw: (q) => NM.PROPS[i % 2 ? 'cross' : 'tomb'](q, 60 + i * 44 + (i % 2) * 10, 230 + (i % 3) * 30, { moss: true }) });
    items.push({ y: 220, draw: (q) => NM.drawChar(q, 'cat', door.x - 30, 220, 'up', 1) });
    NM.drawSorted(g, items);
    for (const o of m.objects) if (o.type === 'window' && o.lit) {
      glow(g, o.x, o.y - 14, 40, '#ffb347', 0.35);
      const ph = Math.sin(t * 5 + o.x);
      g.fillStyle = '#120f1c'; g.fillRect(o.x - 4 + Math.round(ph * 2), o.y - 20, 3, 8); g.fillRect(o.x + 1 - Math.round(ph * 2), o.y - 21, 3, 9);
    }
    g.restore();
    const lights = [];
    for (const o of m.objects) if (o.type === 'window' && o.lit) lights.push({ x: o.x - cam.x, y: o.y - 14 - cam.y, r: 60, flicker: true });
    NM.darkness(g, lights, 0.66, '#05040c', t);
    NM.fog(g, t, 140, 140, 0.25, 10);
    S.post.ui = 'none';
  }, { pal: 'night', name: 'end-mansion', in: { type: 'fade', dur: 0.5 }, out: { dur: 0.6 } });

  // 178.40 – 184.40 ending card + credits
  NM.shot(178.4, 184.4, (g, S) => {
    const t = S.t, lt = S.lt;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const a = range(0.1, 0.6, lt) * (1 - range(5.3, 5.9, lt));
    if (a > 0.05) {
      g.save(); g.globalAlpha = a;
      g.font = '40px "UnifrakturMaguntia"'; g.textAlign = 'center';
      g.fillStyle = '#c4122f'; g.fillText('Necromantical', 240, 74);
      g.restore();
      NM.rose(g, 240, 196, 0.6, 0, { stem: false });
    }
    S.post.ui = 'none';
    S.post.extraUI = [(u) => {
      const lines = [
        [0.8, 'ENDING  -  Death\'s Ordained', '#ff5a6e'],
        [1.6, 'Music   darkmatter96', '#ece6da'],
        [2.3, 'Isolde & Lucien', '#9a92b8'],
        [3.0, 'Thank you for playing.', '#ece6da'],
      ];
      lines.forEach(([t0, s, col], i) => {
        const k = clamp((lt - t0) / 0.6);
        if (k <= 0 || a < 0.5) return;
        NM.uiText(u, s.slice(0, Math.floor(s.length * k)), W / 2, 96 + i * 22, { align: 'center', color: col });
      });
    }];
  }, { pal: 'blood', name: 'end-card', in: { type: 'black', dur: 0.4 } });

  // 184.40 – 185.80 "...?" — one last look
  NM.shot(184.4, 185.8, (g, S) => {
    const lt = S.lt;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    S.post.ui = 'none';
    if (lt < 0.75) { S.post.extraUI = [(u) => NM.uiText(u, '...?', W / 2, 126, { align: 'center', color: '#9a92b8' })]; }
    else if (lt < 1.15) { NM.scareFace(g, S.t, lt, { bg: '#000' }); S.post.pal = 'scare'; S.post.glitch = 0.7; S.post.chroma = 1; S.post.shake = 3; }
  }, { pal: 'blood', name: 'end-sting' });

  NM.shot(185.8, 189.0, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }, { pal: 'blood', name: 'end-black', ui: 'none' });
})();
