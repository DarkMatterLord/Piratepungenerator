// Necromantical — scenes 0:36–1:18  (Chorus 1, interlude walk, Verse 2, Pre-Chorus 2)
'use strict';
(function () {
  const { clamp, lerp, range, ease, TAU, W, H, C, glow, hash1, noise1 } = NM;
  const T = 16;

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
    if (who === 'lucien') { // messy hair tufts
      q.beginPath(); q.moveTo(-40, -30); q.lineTo(-56, -40); q.lineTo(-42, -46); q.lineTo(-50, -60); q.lineTo(-30, -58); q.lineTo(-28, -74); q.lineTo(-10, -64); q.lineTo(4, -76); q.lineTo(12, -62); q.lineTo(30, -66); q.lineTo(30, -50); q.closePath(); q.fill();
    } else { // hair crown with the rose ornament
      q.beginPath(); q.ellipse(-12, -48, 30, 20, -0.3, 0, NM.TAU); q.fill();
      q.beginPath(); q.arc(-26, -64, 9, 0, NM.TAU); q.fill();
    }
    q.restore();
  };

  // big title slam used on every chorus downbeat
  NM.titleSlam = function (g, t, lt, opt = {}) {
    g.fillStyle = opt.bg || '#0e0709'; g.fillRect(0, 0, W, H);
    NM.sigil(g, 240, 100, 90 + lt * 20, t, 1, { squash: 1, width: 0.4, alpha: 0.55, color: '#ff2040', runes: 28, glowA: 0.35 });
    const k = ease.outBack(clamp(lt * 4));
    g.save();
    g.translate(240, 112); g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    g.font = '64px "UnifrakturMaguntia"'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText('Necromantical', 0, 0);
    const lg = g.createLinearGradient(0, -30, 0, 30); lg.addColorStop(0, '#fde4d6'); lg.addColorStop(0.5, '#d0554f'); lg.addColorStop(1, '#561d25');
    g.fillStyle = lg; g.fillText('Necromantical', 0, 0);
    // blood drips from the letters
    g.fillStyle = '#a8353a';
    for (let i = 0; i < 9; i++) {
      const x = -180 + i * 45 + hash1(i * 7) * 20, len = clamp(lt * 1.2 - hash1(i) * 0.3) * (14 + hash1(i * 3) * 30);
      if (len > 0) { g.fillRect(x, 18, 2, len); g.fillRect(x - 1, 18 + len, 4, 3); }
    }
    g.restore();
  };

  // ======================================================================
  // CHORUS 1  36.15 – 48.40
  // ======================================================================
  NM.shot(36.15, 37.0, (g, S) => {
    NM.titleSlam(g, S.t, S.lt);
    S.post.shake = S.lt < 0.35 ? 3 : 0;
    S.post.chroma = clamp(1 - S.lt * 2.5);
  }, { pal: 'blood', name: 'c1-title', in: { type: 'red', dur: 0.35 } });

  // 37.00 – 39.45  the grip: his hand bursts from the soil, hers seizes it
  NM.shot(37.0, 39.45, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#1f0e12'], [0.7, '#561d25'], [1, '#7c2630']]);
    NM.moon(g, 380, 60, 40, { blood: 0.4, halo: 0.7 });
    glow(g, 240, 176, 150, '#d0554f', 0.35 + NM.beat(t, 4) * 0.25);
    // grave soil
    g.fillStyle = '#35151b'; g.fillRect(0, 176, W, 100);
    g.fillStyle = '#561d25'; g.fillRect(0, 176, W, 3);
    for (let i = 0; i < 50; i++) { g.fillStyle = i % 3 ? '#1f0e12' : '#561d25'; g.fillRect(hash1(i) * W, 180 + hash1(i * 3) * 20, 2 + hash1(i * 5) * 6, 2); }
    const rise = ease.outBack(clamp(lt / 0.45));
    const grip = range(0.95, 1.35, lt);
    // --- his arm: pale, half-flesh, half-bone ---
    const wx = 236, wy = lerp(260, 118, rise);
    g.save(); g.beginPath(); g.rect(0, 0, W, 178); g.clip();
    g.strokeStyle = '#f6b9a6'; g.lineCap = 'round';
    g.lineWidth = 16; g.beginPath(); g.moveTo(wx - 6, wy + 120); g.lineTo(wx, wy + 14); g.stroke();
    g.strokeStyle = '#ec8a7a'; g.lineWidth = 4; g.beginPath(); g.moveTo(wx + 4, wy + 120); g.lineTo(wx + 5, wy + 16); g.stroke();
    g.strokeStyle = '#7c2630'; g.lineWidth = 1; g.beginPath(); g.moveTo(wx - 7, wy + 70); g.lineTo(wx - 2, wy + 40); g.moveTo(wx - 3, wy + 60); g.lineTo(wx + 2, wy + 52); g.stroke();
    // palm + fingers (spread, then curling round her hand)
    g.fillStyle = '#fde4d6'; g.beginPath(); g.ellipse(wx + 1, wy + 4, 11, 12, 0, 0, TAU); g.fill();
    const fingers = [[-0.55, 22], [-0.18, 26], [0.15, 25], [0.45, 20]];
    fingers.forEach(([a, len], i) => {
      const aa = a * (1 - grip * 0.4) - grip * 0.25, L1 = len * 0.55, L2 = len * 0.5;
      const bx = wx + Math.sin(aa) * 9, by = wy - 4;
      const mx = bx + Math.sin(aa) * L1, my = by - Math.cos(aa) * L1;
      const a2 = aa + grip * 1.4;
      const ex = mx + Math.sin(a2) * L2, ey = my - Math.cos(a2) * L2;
      g.strokeStyle = '#fde4d6'; g.lineWidth = 5; g.beginPath(); g.moveTo(bx, by); g.lineTo(mx, my); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = '#a8353a'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx, by); g.lineTo(mx, my); g.stroke();
      g.fillStyle = '#7c2630'; g.fillRect(Math.round(mx) - 1, Math.round(my) - 1, 2, 2);
    });
    g.strokeStyle = '#fde4d6'; g.lineWidth = 6; g.beginPath(); g.moveTo(wx - 8, wy + 6); g.lineTo(wx - 18, wy - 6 + grip * 4); g.stroke();
    g.restore();
    // dirt burst
    NM.particles(g, lt, { n: 40, seed: 11, kind: 'dot', x: 170, y: 90, w: 140, h: 90, vx: 0, vy: 70, size: [1, 2.6], color: '#1f0e12', alpha: 1 - clamp(lt / 1.2) });
    // --- her arm: black sleeve from top right, lace cuff, gloved hand with a crimson ring ---
    const reach = ease.outCubic(clamp((lt - 0.45) / 0.6));
    const hx = lerp(420, 268, reach), hy = lerp(-20, 86, reach);
    g.lineCap = 'round';
    g.strokeStyle = '#ec8a7a'; g.lineWidth = 26; g.beginPath(); g.moveTo(hx + 210, hy - 160); g.lineTo(hx + 26, hy - 20); g.stroke();
    g.strokeStyle = '#0e0709'; g.lineWidth = 22; g.beginPath(); g.moveTo(hx + 212, hy - 163); g.lineTo(hx + 28, hy - 23); g.stroke();
    // lace cuff
    for (let k = -3; k <= 3; k++) { g.fillStyle = '#fde4d6'; g.beginPath(); g.arc(hx + 20 + k * 3.6, hy - 14 + k * 3.2, 3, 0, TAU); g.fill(); }
    // glove
    g.fillStyle = '#1f0e12'; g.beginPath(); g.ellipse(hx + 6, hy - 2, 13, 11, -0.65, 0, TAU); g.fill();
    g.strokeStyle = '#1f0e12'; g.lineWidth = 6;
    const gf = [[-0.9, 24], [-0.55, 27], [-0.25, 25], [0.1, 20]];
    gf.forEach(([a, len]) => {
      const aa = Math.PI + 0.75 + a * 0.5 + grip * 0.3;
      const bx = hx + 2, by = hy + 4;
      const ex = bx + Math.sin(aa) * len * (1 - grip * 0.35), ey = by - Math.cos(aa) * len * (1 - grip * 0.35);
      g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
    });
    g.strokeStyle = '#d0554f'; g.lineWidth = 1; g.beginPath(); g.ellipse(hx + 6, hy - 2, 13, 11, -0.65, 3.6, 5.4); g.stroke();
    g.fillStyle = '#ff3a52'; g.fillRect(Math.round(hx - 6), Math.round(hy + 10), 3, 3);
    glow(g, hx - 5, hy + 11, 8, '#ff3a52', 0.8);
    if (grip > 0) glow(g, 250, 100, 70 * grip, '#ff3a52', 0.55 * grip);
    S.post.shake = lt < 0.45 ? 2 : grip > 0 && grip < 1 ? 1 : 0;
  }, { pal: 'blood', name: 'c1-grip' });

  // 39.45 – 42.45  the kiss before the blood moon (silhouettes)
  NM.shot(39.45, 42.45, (g, S) => {
    const t = S.t, lt = S.lt;
    const push = 1 + lt * 0.04;
    g.save(); g.translate(240, 140); g.scale(push, push); g.translate(-240, -140);
    NM.skyGrad(g, [[0, '#1f0e12'], [0.6, '#561d25'], [1, '#7c2630']]);
    NM.moon(g, 240, 92, 82, { blood: 0.5 });
    NM.clouds(g, t, { y: 100, h: 60, speed: 8, alpha: 0.25, tint: '#a8353a' });
    NM.ridge(g, 4, 190, 6, 0.01, '#35151b');
    // candle flames on the hill whose light is being drunk
    const drain = clamp((lt - 0.6) / 1.6);
    for (let i = 0; i < 6; i++) {
      const cx = 120 + i * 48 + (i > 2 ? 30 : -30), cy = 192;
      g.fillStyle = '#fde4d6'; g.fillRect(cx - 1, cy - 6, 3, 6);
      if (drain < 1 - i * 0.12) NM.flame(g, cx, cy - 6, 6, t, i, { color: '#ffcf7a', glowR: 4, glowA: 0.4 });
      // stolen light streams toward the kiss
      const k = clamp(drain * 1.6 - i * 0.12);
      if (k > 0 && k < 1) { const px = lerp(cx, 240, ease.inQuad(k)), py = lerp(cy - 8, 70, ease.inQuad(k)) - Math.sin(k * Math.PI) * 30; glow(g, px, py, 10, '#fde4d6', 0.8); }
    }
    // two profiles meeting in a kiss, backlit by the moon (rim on the upper edges)
    const kiss = (q) => {
      const lipX = 240, lipY = 100 + Math.sin(t * 1.3) * 0.6;
      // Lucien — taller, head bowed toward her, seen side-on
      NM.profileHead(q, lipX, lipY, 46, -1, 0.3, 'lucien');
      q.beginPath(); q.moveTo(248, 118); q.quadraticCurveTo(250, 140, 254, 160); q.lineTo(256, 280); q.lineTo(304, 280); q.lineTo(300, 170); q.quadraticCurveTo(298, 128, 280, 104); q.closePath(); q.fill();
      // Isolde — chin raised, hair falling down her back
      NM.profileHead(q, lipX, lipY, 40, 1, -0.25, 'isolde');
      const sw = Math.sin(t * 1.7) * 3;
      q.beginPath(); q.moveTo(206, 80); q.bezierCurveTo(192, 110, 190 + sw, 160, 176 + sw * 2, 220); q.lineTo(204, 224); q.bezierCurveTo(206, 170, 212, 124, 224, 98); q.closePath(); q.fill();
      q.beginPath(); q.moveTo(232, 114); q.quadraticCurveTo(242, 136, 238, 150); q.quadraticCurveTo(232, 166, 236, 176); q.lineTo(262, 280); q.lineTo(176, 280); q.lineTo(204, 176); q.quadraticCurveTo(208, 150, 206, 128); q.quadraticCurveTo(214, 112, 222, 108); q.closePath(); q.fill();
      // her arm curling up behind his neck; his arm around her back
      q.lineCap = 'round'; q.strokeStyle = q.fillStyle;
      q.lineWidth = 6; q.beginPath(); q.moveTo(222, 130); q.quadraticCurveTo(244, 122, 272, 100); q.stroke();
      q.lineWidth = 7; q.beginPath(); q.moveTo(286, 132); q.quadraticCurveTo(246, 176, 208, 160); q.stroke();
    };
    const veil = (q) => { const sw = Math.sin(t * 1.4) * 6; q.beginPath(); q.moveTo(206, 78); q.bezierCurveTo(170, 96 + sw, 130 - sw, 140, 90 - sw * 2, 220); q.lineTo(150, 230); q.bezierCurveTo(170, 160, 190, 120, 222, 98); q.closePath(); q.fill(); };
    NM.silhouette(g, 'rgba(53,21,27,0.8)', veil);
    g.save(); g.translate(-1, -1); NM.silhouette(g, '#ec8a7a', kiss); g.restore();
    g.save(); g.translate(1, -1); NM.silhouette(g, '#d0554f', kiss); g.restore();
    NM.silhouette(g, '#0e0709', kiss);
    NM.silhouette(g, '#0e0709', (q) => { NM.deadTree(q, 30, 230, 210, 31, t, { depth: 7, lean: 0.3 }); NM.deadTree(q, 460, 240, 230, 5, t, { depth: 7, lean: -0.25 }); });
    glow(g, 240, 70, 26, '#fde4d6', 0.5 * drain);
    for (let i = 0; i < 22; i++) NM.lily(g, (i * 41 + 7) % 500 - 10, 274 - (i % 3) * 3, 22 + (i % 4) * 5, t, i);
    g.restore();
    NM.particles(g, t, { n: 24, seed: 21, kind: 'petal', vx: -14, vy: 20, drift: 18, size: [1.4, 2.4], alpha: 0.9 });
  }, { pal: 'blood', name: 'c1-kiss', in: { type: 'fade', dur: 0.3 } });

  // 42.45 – 45.35  "You'll dance with me" — the waltz among the graves (map, 2x)
  NM.shot(42.45, 45.35, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.graveyard;
    const buf = NM._zoomBuf || (NM._zoomBuf = NM.canvas(W, H));
    const bg = buf.getContext('2d');
    bg.setTransform(1, 0, 0, 1, 0, 0);
    const cx = m.grave.x, cy = m.grave.y + 40;
    const cam = { x: Math.round(cx - W / 2), y: Math.round(cy - H / 2) };
    NM.drawGround(bg, m, cam);
    bg.save(); bg.translate(-cam.x, -cam.y);
    const items = NM.propItems(bg, m, t);
    items.push({ y: m.grave.y + 12, draw: (q) => NM.PROPS.freshGrave(q, m.grave.x, m.grave.y, { open: 1 }) });
    items.push({ y: m.grave.y - 20, draw: (q) => NM.PROPS.headstoneNew(q, m.grave.x, m.grave.y - 16) });
    const th = t * 2.6;
    const pos = (a) => ({ x: cx + Math.cos(a) * 13, y: cy + Math.sin(a) * 8 });
    const pI = pos(th), pL = pos(th + Math.PI);
    const face = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'; };
    const fr = [0, 1, 2, 1][Math.floor(t * 6) % 4];
    items.push({ y: pI.y, draw: (q) => NM.drawChar(q, 'isolde', pI.x, pI.y, face(pI, pL), fr) });
    items.push({ y: pL.y, draw: (q) => NM.drawChar(q, 'lucien', pL.x, pL.y, face(pL, pI), fr) });
    NM.drawSorted(bg, items);
    NM.chain(bg, [pI.x, pI.y - 14, cx, cy - 22, pL.x, pL.y - 18], 4, { color: '#ff3a52', thick: 1, glow: 0.5 });
    NM.balloon(bg, Math.floor(t * 1.5) % 2 ? 'note' : 'heart', pI.x, pI.y - 30, 1, t);
    // spectators: ghosts drifting
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + t * 0.4, gx = cx + Math.cos(a) * 70, gy = cy + Math.sin(a) * 30 - 10;
      NM.drawChar(bg, 'ghost', gx, gy + Math.sin(t * 3 + i) * 3, gx < cx ? 'right' : 'left', Math.floor(t * 5 + i) % 3, { alpha: 0.55, shadow: false });
    }
    bg.restore();
    NM.darkness(bg, [{ x: W / 2, y: H / 2 - 14, r: 110, color: '#ff2040', ca: 0.12 }], 0.62, '#05040c', t);
    g.imageSmoothingEnabled = false;
    g.drawImage(buf, W / 4, H / 4 - 12, W / 2, H / 2, 0, 0, W, H);
  }, { pal: 'night', name: 'c1-dance', in: { type: 'black', dur: 0.2 } });

  // 45.35 – 48.40  "A prisoner to the dead and drowned" — the dead rise all around
  NM.shot(45.35, 48.4, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.graveyard;
    const iso = NM.walk(t, [[45.35, m.grave.x, m.grave.y + 40], [48.4, m.grave.x, m.grave.y - 60]], 7);
    const luc = NM.walk(t - 0.55, [[45.35, m.grave.x, m.grave.y + 40], [48.4, m.grave.x, m.grave.y - 60]], 7);
    const cam = { x: Math.round(m.grave.x - W / 2), y: Math.round(lerp(m.grave.y - 80, m.grave.y - 150, lt / 3)) };
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    const items = NM.propItems(g, m, t);
    items.push({ y: m.grave.y + 12, draw: (q) => NM.PROPS.freshGrave(q, m.grave.x, m.grave.y, { open: 1 }) });
    items.push({ y: m.grave.y - 20, draw: (q) => NM.PROPS.headstoneNew(q, m.grave.x, m.grave.y - 16) });
    items.push({ y: iso.y, draw: (q) => NM.drawChar(q, 'isolde', iso.x, iso.y, iso.dir, iso.frame) });
    items.push({ y: luc.y, draw: (q) => NM.drawChar(q, 'lucien', luc.x, luc.y, luc.dir, luc.frame) });
    NM.drawSorted(g, items);
    // ghosts rise from the older graves
    const tombs = m.objects.filter((o) => ['tomb', 'cross', 'gothicTomb'].includes(o.type));
    tombs.forEach((o, i) => {
      const k = clamp((lt - (i % 9) * 0.18) / 0.8);
      if (k <= 0) return;
      NM.drawChar(g, 'ghost', o.x, o.y - 4 - ease.outCubic(k) * 16 + Math.sin(t * 3 + i) * 2, 'down', Math.floor(t * 5 + i) % 3, { alpha: 0.65 * k, shadow: false });
    });
    g.restore();
    NM.fog(g, t, 90, 160, 0.25, 12, cam.x);
    NM.darkness(g, [{ x: iso.x - cam.x, y: iso.y - 10 - cam.y, r: 120, color: '#b9e6ff', ca: 0.08 }], 0.5, '#05040c', t);
  }, { pal: 'night', name: 'c1-dead', out: { dur: 0.5 } });

  // ======================================================================
  // 48.40 – 53.55  THE MANSION (map, instrumental)
  // ======================================================================
  NM.shot(48.4, 53.55, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.mansionExt;
    const door = m.door;
    const keys = [[48.4, door.x, 380], [52.3, door.x, door.y + 14], [52.85, door.x, door.y + 14, 'up'], [53.4, door.x, door.y - 2]];
    const iso = NM.walk(t, keys, 7);
    const luc = NM.walk(t - 0.6, keys, 7);
    const cam = NM.follow(m, door.x, iso.y + 30);
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    const items = NM.propItems(g, m, t, (o) => o.type !== 'door');
    items.push({ y: door.y, draw: (q) => NM.PROPS.door(q, door.x, door.y, { open: t > 52.6 }) });
    // the black cat
    const catRun = clamp((t - 50.6) / 0.9);
    const catX = lerp(door.x - 30, door.x - 220, ease.inQuad(catRun)), catY = 250;
    items.push({ y: catY, draw: (q) => NM.drawChar(q, 'cat', catX, catY, catRun > 0 ? 'left' : 'down', catRun > 0 ? Math.floor(t * 12) % 3 : 1) });
    const enter = (st) => st.y < door.y + 2;
    items.push({ y: iso.y, draw: (q) => NM.drawChar(q, 'isolde', iso.x, iso.y, iso.dir, iso.frame, { clipBottom: enter(iso) ? 32 * clamp((door.y + 2 - iso.y) / 16) : null }) });
    items.push({ y: luc.y, draw: (q) => NM.drawChar(q, 'lucien', luc.x, luc.y, luc.dir, luc.frame) });
    NM.drawSorted(g, items);
    if (t > 50.3 && t < 51.3) NM.balloon(g, '!', door.x - 30, catY - 22, 1, t);
    if (t > 51.6 && t < 52.4) NM.balloon(g, 'dots', luc.x, luc.y - 30, 1, t - 51.6);
    // lit window glows
    for (const o of m.objects) if (o.type === 'window' && o.lit) glow(g, o.x, o.y - 14, 40, '#ffb347', 0.35);
    g.restore();
    const lights = [{ x: iso.x - cam.x, y: iso.y - 12 - cam.y, r: 80, color: '#ffb347', ca: 0.1 }];
    for (const o of m.objects) if (o.type === 'window' && o.lit) lights.push({ x: o.x - cam.x, y: o.y - 14 - cam.y, r: 60, flicker: true });
    if (t > 52.6) lights.push({ x: door.x - cam.x, y: door.y - 16 - cam.y, r: 40 });
    NM.darkness(g, lights, 0.55, '#05040c', t);
    NM.fog(g, t, 160, 120, 0.15, 10);
  }, { pal: 'night', name: 'mansion', in: { type: 'black', dur: 0.5 }, out: { dur: 0.35 } });

  // ======================================================================
  // VERSE 2  53.55 – 65.60
  // ======================================================================
  // 53.55 – 56.65 hall: footprints in the dust
  NM.shot(53.55, 56.65, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.hall;
    const keys = [[53.55, 40, 176], [56.65, 360, 176]];
    const iso = NM.walk(t, keys, 7), luc = NM.walk(t - 0.6, keys, 7);
    const cam = NM.follow(m, iso.x - 30, 120);
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    // moonlight shafts from the windows
    for (const o of m.objects) if (o.type === 'window') NM.shaft(g, o.x, o.y - 6, 14, o.x + 30, o.y + 120, 40, '#8a93b8', 0.12);
    // footprints left in the dust
    for (let tt = 53.6; tt < t - 0.2; tt += 0.22) {
      const p = NM.walk(tt, keys, 7), k = Math.round((tt - 53.6) / 0.22);
      g.fillStyle = '#3a2a22'; g.fillRect(Math.round(p.x) - 2 + (k % 2) * 3, Math.round(p.y) - 1, 2, 1);
    }
    const items = NM.propItems(g, m, t);
    items.push({ y: iso.y, draw: (q) => NM.drawChar(q, 'isolde', iso.x, iso.y, iso.dir, iso.frame) });
    items.push({ y: luc.y, draw: (q) => NM.drawChar(q, 'lucien', luc.x, luc.y, luc.dir, luc.frame) });
    NM.drawSorted(g, items);
    NM.chain(g, [iso.x - 6, iso.y - 14, (iso.x + luc.x) / 2, iso.y - 4, luc.x + 4, luc.y - 18], 4, { color: '#ff3a52', thick: 1, glow: 0.4 });
    g.restore();
    NM.particles(g, t, { n: 40, seed: 31, kind: 'dot', vx: 4, vy: -3, drift: 10, driftY: 6, size: [0.5, 1], color: '#e8e2d8', alpha: 0.5, twinkle: 2 });
    const lights = [{ x: iso.x - cam.x, y: iso.y - 14 - cam.y, r: 70 }];
    for (const o of m.objects) if (o.type === 'candelabra') lights.push({ x: o.x - cam.x, y: o.y - 24 - cam.y, r: 46, flicker: true, color: '#ffb347', ca: 0.12 });
    NM.darkness(g, lights, 0.5, '#0b0709', t);
  }, { pal: 'mansion', name: 'v2-hall', in: { type: 'black', dur: 0.3 } });

  // crypt map helper
  function cryptScene(g, S, opt) {
    const t = S.t;
    const m = NM.MAPS.crypt;
    const iso = opt.iso, luc = opt.luc;
    const cam = opt.cam || NM.follow(m, iso.x, iso.y + 20);
    NM.drawGround(g, m, cam);
    g.save(); g.translate(-cam.x, -cam.y);
    const items = NM.propItems(g, m, t);
    if (iso) items.push({ y: iso.y, draw: (q) => NM.drawChar(q, 'isolde', iso.x, iso.y, iso.dir, iso.frame) });
    if (luc) items.push({ y: luc.y, draw: (q) => NM.drawChar(q, 'lucien', luc.x, luc.y, luc.dir, luc.frame, { alpha: luc.alpha }) });
    if (opt.items) opt.items(items, cam);
    NM.drawSorted(g, items);
    if (opt.after) opt.after(g, cam);
    g.restore();
    const lights = [];
    if (iso) lights.push({ x: iso.x - cam.x, y: iso.y - 14 - cam.y, r: 80, color: '#ffb347', ca: 0.08 });
    for (const o of m.objects) if (o.type === 'candle') lights.push({ x: o.x - cam.x, y: o.y - 8 - cam.y, r: 40, flicker: true, color: '#ffb347', ca: 0.12 });
    if (opt.lights) lights.push(...opt.lights(cam));
    NM.darkness(g, lights, opt.dark ?? 0.62, '#05050a', t);
    return cam;
  }
  NM.cryptScene = cryptScene;

  // 56.65 – 59.65 crypt: "Through crypts of sorrow, grief, and rust"
  NM.shot(56.65, 59.65, (g, S) => {
    const t = S.t;
    const m = NM.MAPS.crypt;
    const keys = [[56.65, m.altar.x, 52], [59.4, m.altar.x, m.altar.y + 20]];
    const iso = NM.walk(t, keys, 7), luc = NM.walk(t - 0.6, keys, 7);
    cryptScene(g, S, { iso, luc, after: (q) => NM.chain(q, [iso.x + 5, iso.y - 14, iso.x + 8, (iso.y + luc.y) / 2 - 10, luc.x + 4, luc.y - 18], 4, { color: '#ff3a52', thick: 1, glow: 0.4 }) });
  }, { pal: 'crypt', name: 'v2-crypt', in: { type: 'black', dur: 0.25 } });

  // 59.65 – 61.20 sepia memory: the wedding
  NM.shot(59.65, 61.2, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#2b1f16'], [1, '#634a2e']]);
    // church window behind
    g.fillStyle = '#e6cd96'; g.beginPath(); NM.archPath(g, 240, 150, 120, 150); g.closePath(); g.fill();
    g.fillStyle = '#2b1f16'; g.fillRect(237, 10, 6, 140); g.fillRect(180, 80, 120, 5);
    NM.shaft(g, 240, 40, 100, 240, 220, 260, '#f6ead0', 0.25);
    g.fillStyle = '#45321f'; g.fillRect(0, 186, W, 90);
    const zoom = 1 + lt * 0.05;
    g.save(); g.translate(240, 150); g.scale(zoom, zoom); g.translate(-240, -150);
    NM.figLucien(g, 278, 194, 160, { dir: -1, alive: true, armF: [1.25, 0.35], armB: [0.15, 0.3], expr: 'alive', turn: 0.6 }, t);
    NM.figIsolde(g, 204, 194, 150, { dir: 1, armF: [1.2, 0.3], armB: [0.3, 0.6], expr: 'tender', turn: 0.6, wind: 0.2,
      over: { P: { hair: '#45321f', hairMid: '#634a2e', hairHi: '#a98652' } } }, t,
      { colors: { dress: '#f6ead0', dressHi: '#c9a86c', dressRim: '#ffffff', lace: '#ffffff', veil: 'rgba(246,234,208,0.6)', hair: '#45321f', glove: '#f6ead0' } });
    g.restore();
    glow(g, 241, 128, 12, '#ffffff', 0.9 * (0.6 + 0.4 * Math.sin(t * 6)));
    // old film scratches
    for (let i = 0; i < 3; i++) { const x = hash1(Math.floor(t * 12) * 7 + i) * W; g.fillStyle = 'rgba(246,234,208,0.35)'; g.fillRect(x, 0, 1, H); }
    S.post.vignette = 1;
  }, { pal: 'sepia', name: 'v2-wedding', in: { type: 'white', dur: 0.4 } });

  // 61.20 – 62.65 the chains of death shatter
  NM.shot(61.2, 62.65, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#05050a'], [1, '#1b1b33']]);
    glow(g, 240, 110, 160, '#57528f', 0.4);
    // coffin (front view, standing)
    g.fillStyle = '#2a2a4d';
    g.beginPath(); g.moveTo(205, 20); g.lineTo(275, 20); g.lineTo(295, 60); g.lineTo(270, 190); g.lineTo(210, 190); g.lineTo(185, 60); g.closePath(); g.fill();
    g.fillStyle = '#3c3a6b'; g.beginPath(); g.moveTo(212, 28); g.lineTo(268, 28); g.lineTo(284, 62); g.lineTo(262, 182); g.lineTo(218, 182); g.lineTo(196, 62); g.closePath(); g.fill();
    g.fillStyle = '#a89bd8'; g.fillRect(236, 50, 8, 70); g.fillRect(220, 70, 40, 8);
    const snap = 0.45;
    if (lt < snap) {
      NM.chain(g, [150, 40, 240, 100, 330, 170], 10, { color: '#7d73b5', thick: 2.2, highlight: '#d6cdf0' });
      NM.chain(g, [330, 40, 240, 100, 150, 170], 10, { color: '#7d73b5', thick: 2.2, highlight: '#d6cdf0' });
      g.strokeStyle = '#ff3a52'; g.lineWidth = 1;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(240, 100); g.lineTo(240 + Math.cos(i) * 40 * (lt / snap), 100 + Math.sin(i * 1.7) * 40 * (lt / snap)); g.stroke(); }
    } else {
      const k = lt - snap;
      for (let i = 0; i < 26; i++) {
        const a = hash1(i * 3) * TAU, sp = 120 + hash1(i * 5) * 200;
        const x = 240 + Math.cos(a) * sp * k, y = 100 + Math.sin(a) * sp * k + 160 * k * k;
        g.save(); g.translate(x, y); g.rotate(k * 10 + i);
        g.strokeStyle = '#7d73b5'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(0, 0, 5, 3, 0, 0, TAU); g.stroke();
        g.restore();
      }
      glow(g, 240, 100, 120 * clamp(1 - k), '#ff2040', 0.8 * clamp(1 - k));
      S.post.flash = clamp(1 - k * 4) * 0.7; S.post.flashColor = '#ff2040';
      S.post.shake = k < 0.4 ? 3 : 0;
    }
  }, { pal: 'crypt', name: 'v2-chains' });

  // 62.65 – 65.60 "Now flesh and shadow wear my reins" — he mirrors her every step (2x)
  NM.shot(62.65, 65.6, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.crypt;
    const buf = NM._zoomBuf || (NM._zoomBuf = NM.canvas(W, H));
    const bg = buf.getContext('2d'); bg.setTransform(1, 0, 0, 1, 0, 0);
    const ax = m.altar.x, ay = m.altar.y + 20;
    const iKeys = [[62.65, ax - 20, ay, 'right'], [63.3, ax - 20, ay, 'right'], [63.8, ax - 4, ay], [64.3, ax - 4, ay, 'down'], [64.8, ax - 20, ay], [65.6, ax - 20, ay, 'right']];
    const iso = NM.walk(t, iKeys, 6);
    // Lucien copies her motion exactly, mirrored, a beat later
    const isoLate = NM.walk(t - 0.12, iKeys, 6);
    const luc = { x: ax + 40 + (isoLate.x - (ax - 20)), y: ay, dir: isoLate.dir === 'right' ? 'left' : isoLate.dir === 'left' ? 'right' : isoLate.dir, frame: isoLate.frame };
    const cam = { x: Math.round(ax + 10 - W / 2), y: Math.round(ay - 20 - H / 2) };
    cryptScene(bg, S, { iso, luc, cam, dark: 0.55,
      after: (q) => {
        NM.chain(q, [iso.x + 6, iso.y - 14, (iso.x + luc.x) / 2, iso.y - 34, luc.x, luc.y - 18], 4, { color: '#ff3a52', thick: 1, glow: 0.5 });
        if (lt > 1.9) NM.balloon(q, 'dots', luc.x, luc.y - 30, 1, lt - 1.9);
      } });
    g.imageSmoothingEnabled = false;
    g.drawImage(buf, W / 4, H / 4 - 10, W / 2, H / 2, 0, 0, W, H);
  }, { pal: 'crypt', name: 'v2-reins', in: { type: 'black', dur: 0.15 } });

  // ======================================================================
  // PRE-CHORUS 2  65.60 – 78.15
  // ======================================================================
  // 65.60 – 68.55  he begs; the choice
  NM.shot(65.6, 68.55, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.crypt;
    const ax = m.altar.x, ay = m.altar.y + 20;
    const iso = { x: ax, y: ay - 20, dir: 'down', frame: 1 };
    const luc = { x: ax, y: ay + 6, dir: 'up', frame: 1 };
    cryptScene(g, S, { iso, luc, cam: { x: Math.round(ax - W / 2), y: Math.round(ay - H / 2 + 30) },
      after: (q) => { NM.balloon(q, lt < 1.4 ? 'brokenheart' : 'sweat', luc.x, luc.y - 30, 1, t); NM.chain(q, [iso.x + 6, iso.y - 14, iso.x + 8, iso.y + 4, luc.x + 2, luc.y - 18], 4, { color: '#ff3a52', thick: 1, glow: 0.4 }); } });
    S.post.extraUI = [(u) => {
      // his plea (small window, top)
      const o1 = range(0.0, 0.15, lt) * (1 - range(1.3, 1.45, lt));
      if (NM.uiWindow(u, 70, 14, 340, 58, o1)) {
        NM.faceGraphic(u, 78, 19, 48, 'lucien', 'plead', t);
        NM.uiText(u, 'Lucien', 134, 20, { color: '#b9e6ff' });
        NM.uiText(u, 'Please... let me rest.', 134, 40);
      }
      // the choice
      const o2 = range(1.35, 1.5, lt) * (1 - range(2.75, 2.9, lt));
      const sel = lt > 2.0 ? 1 : 0;
      NM.uiWindow(u, 70, 14, 340, 30, o2) && NM.uiText(u, 'Release his soul?', 84, 21, { color: '#ffd0d6' });
      NM.choiceWindow(u, 140, 50, ['Let him rest in peace', 'Never. He stays.'], sel, o2, lt > 2.45 ? t * 3 : t, { w: 200, colors: ['#9a92b8', '#ff5a6e'] });
    }];
    if (lt > 2.45 && lt < 2.65) S.post.flash = 0.35;
  }, { pal: 'crypt', name: 'p2-choice', in: { type: 'black', dur: 0.2 } });

  // 68.55 – 71.65 the light comes for him; she drags his soul back
  NM.shot(68.55, 71.65, (g, S) => {
    const t = S.t, lt = S.lt;
    const m = NM.MAPS.crypt;
    const ax = m.altar.x, ay = m.altar.y + 20;
    const iso = { x: ax - 50, y: ay, dir: 'right', frame: 1 };
    const luc = { x: ax + 20, y: ay, dir: 'down', frame: 1 };
    const light = range(0.1, 0.6, lt) * (1 - range(1.9, 2.05, lt));
    const up = ease.outCubic(clamp((lt - 0.6) / 1.1));
    const back = ease.inCubic(clamp((lt - 1.75) / 0.3));
    const gy = luc.y - up * 50 * (1 - back);
    const cam = cryptScene(g, S, { iso, luc, cam: { x: Math.round(ax - W / 2), y: Math.round(ay - H / 2 + 20) }, dark: 0.66,
      items: (items) => items.push({ y: luc.y + 1, draw: (q) => {
        if (light > 0) NM.shaft(q, luc.x, luc.y - 140, 18, luc.x, luc.y, 30, '#f2f0ea', 0.35 * light);
        if (up > 0 && back < 1) NM.drawChar(q, 'ghost', luc.x, gy, 'down', Math.floor(t * 6) % 3, { alpha: 0.75, shadow: false });
      } }),
      after: (q) => {
        if (lt > 1.45) {
          const r = clamp((lt - 1.45) / 0.3);
          NM.chain(q, [iso.x + 6, iso.y - 14, (iso.x + luc.x) / 2, gy - 30, luc.x, gy - 14], 4, { color: '#ff3a52', thick: 1.2, reveal: r, glow: 0.7 });
          NM.balloon(q, 'anger', iso.x, iso.y - 30, 1, t);
        }
        if (up > 0.2 && lt < 1.6) NM.balloon(q, 'note', luc.x + 14, gy - 30, 1, t);
      },
      lights: (c) => [{ x: luc.x - c.x, y: luc.y - 30 - c.y, r: 90 * light + 10, color: '#f2f0ea', ca: 0.2 * light }] });
    if (lt > 2.0 && lt < 2.4) { S.post.flash = 0.6 * (1 - (lt - 2.0) / 0.4); S.post.flashColor = '#ff2040'; S.post.shake = 3; }
  }, { pal: 'crypt', name: 'p2-light' });

  // 71.65 – 74.75 STATUS screen: his heartbeat slows
  NM.shot(71.65, 74.75, (g, S) => {
    const t = S.t, lt = S.lt;
    g.fillStyle = '#0f0f1e'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 8) { g.fillStyle = y % 16 ? '#141428' : '#121226'; g.fillRect(0, y, W, 8); }
    NM.lucienFace(g, 110, 104, 150, lt < 1.6 ? 'hollow' : 'pain', t, 0.15);
    const hp = Math.max(0.01, 0.4 - lt * 0.12);
    S.post.extraUI = [(u) => {
      const o = range(0, 0.15, lt);
      NM.uiWindow(u, 214, 10, 258, 182, o) && (() => {
        NM.uiText(u, 'Lucien', 228, 18, { color: '#b9e6ff' });
        NM.uiText(u, 'Husband', 330, 18, { color: '#9a92b8' });
        NM.uiText(u, 'Lv  27', 228, 40);
        NM.uiText(u, 'HP', 228, 62, { color: '#ff8a9a' }); NM.uiText(u, `${Math.round(hp * 412)} / 412`, 330, 62);
        NM.gauge(u, 228, 82, 228, hp, '#c4122f', '#ff8a9a');
        NM.uiText(u, 'SOUL', 228, 92, { color: '#b9e6ff' }); NM.uiText(u, 'BOUND', 330, 92, { color: '#ff3a52' });
        NM.gauge(u, 228, 112, 228, 1, '#7a0e22', '#ff3a52');
        NM.uiText(u, 'State', 228, 124, { color: '#9a92b8' });
        NM.uiText(u, 'Undead  Cursed  Puppet', 228, 144, { color: '#ff5a6e' });
        // heartbeat: pulses slow down and fade
        const rate = lerp(1.6, 0.35, clamp(lt / 3));
        const ph = (lt * rate) % 1;
        const beat = ph < 0.12 ? 1 : 0;
        NM.uiText(u, 'Heart', 228, 166, { color: '#9a92b8' });
        u.fillStyle = '#c4122f';
        for (let x = 0; x < 150; x++) {
          const xx = (x / 150 + ph) % 1;
          const yy = xx > 0.48 && xx < 0.52 ? -8 * Math.sin((xx - 0.48) / 0.04 * Math.PI) * (1 - clamp(lt / 3.2)) : 0;
          u.fillRect(300 + x, 176 + Math.round(yy), 1, 1);
        }
        if (beat) NM.balloon(u, 'heart', 464, 182, 1, t);
      })();
    }];
  }, { pal: 'corpse', name: 'p2-status', in: { type: 'black', dur: 0.15 } });

  // 74.75 – 77.50 "A puppet now in death's charade" — the marionette theatre
  NM.shot(74.75, 77.5, (g, S) => {
    const t = S.t, lt = S.lt;
    g.fillStyle = '#0e0709'; g.fillRect(0, 0, W, H);
    // stage floor + spotlight
    g.fillStyle = '#35151b'; g.fillRect(60, 188, 360, 40);
    for (let x = 60; x < 420; x += 24) { g.fillStyle = '#1f0e12'; g.fillRect(x, 188, 1, 40); }
    NM.shaft(g, 240, 0, 40, 240, 200, 200, '#fde4d6', 0.22);
    glow(g, 240, 190, 90, '#f6b9a6', 0.3);
    // marionette: jerky motion driven by the strings
    NM.shaft(g, 240, 0, 60, 240, 200, 230, '#fde4d6', 0.3);
    glow(g, 240, 140, 110, '#ec8a7a', 0.35);
    const j = (a) => Math.sin(t * 5 + a) * 0.5 + Math.sin(t * 9.3 + a * 2) * 0.25;
    const bob = Math.abs(Math.sin(t * 5)) * 6;
    const pose = { dir: 1, armF: [1.7 + j(0) * 0.8, -0.6], armB: [1.2 + j(1) * 0.8, -0.5], legF: [0.4 + j(2) * 0.4, -0.3], legB: [-0.2 + j(3) * 0.4, 0.5], headTilt: 0.35 + j(4) * 0.2, expr: 'hollow', turn: 0.3 };
    const lp = NM.figLucien(g, 236, 190 - bob, 150, pose, t, { colors: { coat: '#4a2a38', coatHi: '#7c2630', rim: '#d0554f', pants: '#2a1a24' } });
    // control bar and her gloved hands above
    const bx = 240 + Math.sin(t * 2.5) * 16, by = 18 + Math.sin(t * 5) * 4;
    const knees = [[lp.chest[0] - 6, 190 - bob - 34], [lp.chest[0] + 10, 190 - bob - 30]];
    const ends = [lp.hand2, lp.hand, lp.head, ...knees].sort((a, b) => a[0] - b[0]);
    g.strokeStyle = '#fde4d6'; g.lineWidth = 1;
    ends.forEach(([x, y], i) => { g.beginPath(); g.moveTo(bx - 44 + i * 22, by + 6); g.lineTo(x, y); g.stroke(); });
    g.fillStyle = '#7c2630'; g.fillRect(bx - 50, by, 100, 6); g.fillStyle = '#a8353a'; g.fillRect(bx - 50, by, 100, 1); g.fillRect(bx - 4, by - 12, 8, 28);
    NM.handGlove(g, bx - 64, by - 6, 60, 0.25, 0.8, '#1f0e12', '#ec8a7a');
    NM.handGlove(g, bx + 66, by - 4, 60, Math.PI - 0.25, 0.8, '#1f0e12', '#ec8a7a');
    // curtains
    for (const side of [-1, 1]) {
      g.fillStyle = '#7c2630';
      g.beginPath(); g.moveTo(240 + side * 240, 0); g.lineTo(240 + side * 160, 0);
      g.quadraticCurveTo(240 + side * 150, 120, 240 + side * 196, 230); g.lineTo(240 + side * 240, 230); g.closePath(); g.fill();
      g.strokeStyle = '#561d25'; g.lineWidth = 3;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(240 + side * (170 + k * 18), 0); g.quadraticCurveTo(240 + side * (160 + k * 18), 120, 240 + side * (200 + k * 10), 230); g.stroke(); }
    }
    g.fillStyle = '#561d25'; g.fillRect(0, 0, W, 12); for (let x = 0; x < W; x += 16) { g.beginPath(); g.arc(x + 8, 12, 8, 0, Math.PI); g.fill(); }
  }, { pal: 'blood', name: 'p2-puppet', in: { type: 'black', dur: 0.2 } });

  // 77.50 – 78.15 dropout: one last heartbeat, then nothing
  NM.shot(77.5, 78.15, (g, S) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const lt = S.lt;
    if (lt < 0.25) { glow(g, 240, 120, 30, '#ff2040', 0.6 * (1 - lt * 4)); g.fillStyle = '#c4122f'; g.fillRect(234, 114, 5, 4); g.fillRect(241, 114, 5, 4); g.fillRect(233, 116, 14, 4); g.fillRect(235, 120, 10, 3); g.fillRect(237, 123, 6, 2); g.fillRect(239, 125, 2, 1); }
    S.post.ui = 'none';
  }, { pal: 'blood', name: 'p2-drop' });
})();
