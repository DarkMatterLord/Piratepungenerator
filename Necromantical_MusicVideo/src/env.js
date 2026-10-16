// Necromantical — painted environments with 2.5D perspective (skies, graveyard, manor,
// hall, crypt, ballroom, village). Everything is a pure function of time + camera.
'use strict';
(function () {
  const { clamp, lerp, TAU, W, H, rgba, rng, hash2, noise1, fbm1, glow } = NM;
  const softShade = (...a) => NM.softShade(...a);

  // ---------- perspective camera ----------
  // world: X lateral, Y up, Z depth (into the screen). cam: { x, y (eye height), z, f, vx, vy }
  NM.cam3 = (o = {}) => Object.assign({ x: 0, y: 160, z: 0, f: 900, vx: W / 2, vy: H * 0.42 }, o);
  NM.P3 = function (c, X, Y, Z) {
    const dz = Math.max(1, Z - c.z), k = c.f / dz;
    return { x: c.vx + (X - c.x) * k, y: c.vy + (c.y - Y) * k, k };
  };
  // fog amount for depth
  const fogK = (c, Z, density = 0.0009) => 1 - Math.exp(-Math.max(0, Z - c.z) * density);
  NM.fogK = fogK;

  // ---------- sky ----------
  // o: { top, mid, low, moon:{x,y,r,blood}, clouds, cloudDark, cloudLight, stars, storm }
  NM.paintSky = function (g, t, o = {}) {
    NM.skyGrad(g, [[0, o.top || '#0a0812'], [0.55, o.mid || '#2a2142'], [1, o.low || '#5a4256']]);
    if (o.stars !== 0) NM.stars(g, t, o.stars || 180, 5, 0.7, 0, 0, W, H * 0.55);
    if (o.moon) {
      const m = o.moon;
      glow(g, m.x, m.y, m.r * 9, m.blood > 0.5 ? '#a3122a' : '#c8c0ff', 0.18);
      NM.moon(g, m.x, m.y, m.r, { blood: m.blood || 0, halo: 1 });
    }
    const ca = o.clouds ?? 0.7;
    if (ca > 0) {
      const dark = NM.tinted(NM.A.clouds, o.cloudDark || '#1c1628');
      const light = NM.tinted(NM.A.clouds, o.cloudLight || '#b8a8d8');
      const y0 = o.cloudY ?? H * 0.08, hh = o.cloudH ?? H * 0.62;
      NM.band(g, dark, y0, hh, 2600, t * (o.speed ?? 10) + 300, ca);
      NM.band(g, light, y0 - 8, hh, 2600, t * (o.speed ?? 10) + 300, ca * 0.35, 'screen');
      NM.band(g, dark, y0 + hh * 0.3, hh * 0.7, 1900, t * (o.speed ?? 10) * 1.6 + 900, ca * 0.6);
      if (o.moon) glow(g, o.moon.x, o.moon.y, o.moon.r * 4, o.moon.blood > 0.5 ? '#ff6070' : '#e8e0ff', 0.25);
    }
    if (o.flash) NM.band(g, NM.A.clouds, H * 0.05, H * 0.6, 2600, t * (o.speed ?? 10) + 300, o.flash * 0.9, 'lighter');
  };

  // ---------- hills with atmospheric depth + rim ----------
  NM.paintRidge = function (g, seed, baseY, amp, freq, col, rim, x0 = -100, x1 = W + 100) {
    const pts = [];
    for (let x = x0; x <= x1; x += 10) pts.push([x, baseY + fbm1(x * freq + seed * 13.7, 4) * amp]);
    g.beginPath(); g.moveTo(x0, H + 50);
    for (const [x, y] of pts) g.lineTo(x, y);
    g.lineTo(x1, H + 50); g.closePath();
    const gr = g.createLinearGradient(0, baseY - amp, 0, H);
    gr.addColorStop(0, col); gr.addColorStop(1, '#050308');
    g.fillStyle = gr; g.fill();
    if (rim) {
      g.strokeStyle = rim; g.lineWidth = 2; g.globalAlpha = 0.6;
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + 1) : g.moveTo(x, y + 1))); g.stroke();
      g.globalAlpha = 1;
    }
  };

  // ---------- gravestones ----------
  function gravePath(g, type, w, h) {
    g.beginPath();
    if (type === 0) { g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h + w / 2); g.arc(0, -h + w / 2, w / 2, Math.PI, 0); g.lineTo(w / 2, 0); }
    else if (type === 1) {
      const a = w * 0.2;
      g.moveTo(-a, 0); g.lineTo(-a, -h * 0.62); g.lineTo(-w / 2, -h * 0.62); g.lineTo(-w / 2, -h * 0.62 - a * 2); g.lineTo(-a, -h * 0.62 - a * 2);
      g.lineTo(-a, -h); g.lineTo(a, -h); g.lineTo(a, -h * 0.62 - a * 2); g.lineTo(w / 2, -h * 0.62 - a * 2); g.lineTo(w / 2, -h * 0.62); g.lineTo(a, -h * 0.62); g.lineTo(a, 0);
    } else if (type === 2) {
      g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h * 0.68); g.quadraticCurveTo(-w / 2, -h * 0.9, 0, -h); g.quadraticCurveTo(w / 2, -h * 0.9, w / 2, -h * 0.68); g.lineTo(w / 2, 0);
    } else if (type === 3) {
      g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h * 0.14); g.lineTo(-w * 0.32, -h * 0.16); g.lineTo(-w * 0.22, -h * 0.9); g.lineTo(0, -h);
      g.lineTo(w * 0.22, -h * 0.9); g.lineTo(w * 0.32, -h * 0.16); g.lineTo(w / 2, -h * 0.14); g.lineTo(w / 2, 0);
    } else {
      g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h * 0.8); g.lineTo(-w * 0.35, -h * 0.8); g.quadraticCurveTo(-w * 0.35, -h, 0, -h);
      g.quadraticCurveTo(w * 0.35, -h, w * 0.35, -h * 0.8); g.lineTo(w / 2, -h * 0.8); g.lineTo(w / 2, 0);
    }
    g.closePath();
  }
  // o: { tilt, light (-1 left .. 1 right), fog (0..1), fogCol, moss, lit (0..1 warm candle light), seed }
  NM.paintGrave = function (g, x, y, w, h, type, o = {}) {
    g.save();
    g.translate(x, y); g.rotate(o.tilt || 0);
    const L = o.light ?? 0.6;
    // contact shadow
    softShade(g, 0, 0, w * 0.9, w * 0.18, '#000000', 0.6);
    gravePath(g, type, w, h);
    const sg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    const lit = '#7c7890', mid = '#45425a', dk = '#18161f';
    if (L > 0) { sg.addColorStop(0, dk); sg.addColorStop(0.6, mid); sg.addColorStop(1, lit); }
    else { sg.addColorStop(0, lit); sg.addColorStop(0.4, mid); sg.addColorStop(1, dk); }
    g.fillStyle = sg; g.fill();
    g.save(); g.clip();
    // stone texture
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.7;
    const pat = g.createPattern(NM.A.stone, 'repeat');
    g.fillStyle = pat; g.translate((o.seed || 0) * 37 % 400, 0); g.fillRect(-w - 400, -h - 10, w * 2 + 800, h + 20);
    g.setTransform(g.getTransform()); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.restore();
    g.save(); gravePath(g, type, w, h); g.clip();
    softShade(g, 0, 0, w, h * 0.5, '#0a080c', 0.6);          // dark, damp base
    if (o.moss) softShade(g, -w * 0.25, -h * 0.1, w * 0.4, h * 0.25, '#2a3a24', 0.7, 'source-over');
    if (o.lit) softShade(g, -L * w * 0.4, -h * 0.4, w, h * 0.8, '#ffb070', 0.45 * o.lit, 'screen');
    if (o.engrave) {
      g.strokeStyle = 'rgba(10,8,14,0.6)'; g.lineWidth = Math.max(1, w * 0.04);
      g.beginPath(); g.moveTo(0, -h * 0.82); g.lineTo(0, -h * 0.5); g.moveTo(-w * 0.14, -h * 0.72); g.lineTo(w * 0.14, -h * 0.72); g.stroke();
    }
    g.restore();
    // bevel highlight on the lit edge
    // moonlit top edge only (no outline)
    g.save(); gravePath(g, type, w, h); g.clip();
    softShade(g, L * w * 0.35, -h, w * 0.6, h * 0.18, '#d8d0f0', 0.45, 'screen');
    g.restore();
    if (o.fog) { g.save(); gravePath(g, type, w, h); g.fillStyle = rgba(o.fogCol || '#3a3450', clamp(o.fog)); g.fill(); g.restore(); }
    g.restore();
  };

  // dead tree with rim light toward the moon
  NM.paintTree = function (g, x, y, h, seed, t, o = {}) {
    if (o.rim) { g.save(); g.translate(o.rimDx ?? 2, o.rimDy ?? -1); NM.deadTree(g, x, y, h, seed, t, { color: o.rim, depth: o.depth || 7, lean: o.lean || 0, sway: o.sway ?? 1 }); g.restore(); }
    NM.deadTree(g, x, y, h, seed, t, { color: o.color || '#0a0810', depth: o.depth || 7, lean: o.lean || 0, sway: o.sway ?? 1 });
  };

  // layered fog bands
  NM.paintFog = function (g, t, y, h, a, col = '#8a80a8', speed = 20) {
    NM.fog(g, t, y, h, a, speed, 0, col);
    NM.fog(g, t, y + h * 0.3, h * 0.8, a * 0.8, speed * 1.7, 600, col);
  };

  // ---------- ground plane with a path, for perspective scenes ----------
  NM.groundPlane = function (g, c, o = {}) {
    const hy = NM.P3(c, 0, 0, 20000).y;
    const gr = g.createLinearGradient(0, hy, 0, H);
    gr.addColorStop(0, o.far || '#2a2436'); gr.addColorStop(0.25, o.mid || '#17131e'); gr.addColorStop(1, o.near || '#0a0810');
    g.fillStyle = gr; g.fillRect(0, hy - 2, W, H - hy + 2);
    if (o.path) {
      const [pw, pcol] = o.path;
      const a = NM.P3(c, -pw, 0, c.z + 60), b = NM.P3(c, pw, 0, c.z + 60), d = NM.P3(c, -pw * 0.6, 0, c.z + 6000), e = NM.P3(c, pw * 0.6, 0, c.z + 6000);
      const pg = g.createLinearGradient(0, d.y, 0, H); pg.addColorStop(0, rgba(pcol, 0.2)); pg.addColorStop(1, rgba(pcol, 0.9));
      g.fillStyle = pg; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(d.x, d.y); g.lineTo(e.x, e.y); g.lineTo(b.x, b.y); g.closePath(); g.fill();
    }
    // grass tufts in the foreground (perspective-scaled strokes)
    if (o.grass) {
      const R = rng(o.seed || 3);
      g.lineCap = 'round';
      for (let i = 0; i < o.grass; i++) {
        const X = (R() - 0.5) * 3000 + c.x, Z = c.z + 80 + R() * 1800;
        if (o.path && Math.abs(X - c.x * 0) < o.path[0] * 0.9) continue;
        const p = NM.P3(c, X, 0, Z);
        if (p.x < -20 || p.x > W + 20 || p.y > H + 20) continue;
        const len = 18 * p.k * (0.6 + R() * 0.8);
        g.strokeStyle = R() < 0.5 ? '#1c2420' : '#2a3428'; g.globalAlpha = 0.8; g.lineWidth = Math.max(1, 1.6 * p.k);
        for (let b = 0; b < 3; b++) { g.beginPath(); g.moveTo(p.x + (b - 1) * 2 * p.k, p.y); g.quadraticCurveTo(p.x + (b - 1) * 5 * p.k, p.y - len * 0.6, p.x + (b - 1) * 9 * p.k + Math.sin(i) * 3, p.y - len); g.stroke(); }
      }
      g.globalAlpha = 1;
    }
    return hy;
  };

  // ---------- the GRAVEYARD (perspective) ----------
  // o: { blood, moon, grave: {X,Z} fresh grave pos, candles: fn(i)->lit, fog }
  NM.graveyard = function (g, t, c, o = {}) {
    const bloodK = o.blood || 0;
    NM.paintSky(g, t, Object.assign({
      top: bloodK > 0.5 ? '#14060a' : '#0b0914', mid: bloodK > 0.5 ? '#4a1018' : '#2a2142', low: bloodK > 0.5 ? '#8a2a2a' : '#5a4458',
      moon: o.moon || { x: W * 0.68, y: H * 0.22, r: 120, blood: bloodK },
      cloudDark: bloodK > 0.5 ? '#2a0a10' : '#1c1628', cloudLight: bloodK > 0.5 ? '#ff8a8a' : '#b8a8d8',
    }, o.sky || {}));
    const hz = NM.P3(c, 0, 0, 20000).y;
    NM.paintRidge(g, 4, hz - 40, 34, 0.0025, bloodK > 0.5 ? '#3a1018' : '#241e32', bloodK > 0.5 ? '#ff6a6a' : '#8a80b8');
    // far church / trees on the horizon
    NM.silhouette(g, bloodK > 0.5 ? '#2a0a10' : '#1a1624', (s) => {
      for (const [x, h2, sd] of [[W * 0.12, 220, 3], [W * 0.3, 160, 9], [W * 0.86, 240, 14], [W * 0.95, 180, 6]]) NM.deadTree(s, x, hz + 6, h2, sd, t, { depth: 6, sway: 0.4 });
      if (o.church !== false) { s.fillRect(W * 0.42, hz - 70, 26, 72); s.beginPath(); s.moveTo(W * 0.42 - 4, hz - 70); s.lineTo(W * 0.42 + 13, hz - 150); s.lineTo(W * 0.42 + 30, hz - 70); s.fill(); s.fillRect(W * 0.42 + 26, hz - 34, 70, 36); }
    });
    NM.paintFog(g, t, hz - 80, 200, 0.35, bloodK > 0.5 ? '#a04050' : '#7a70a0', 14);
    NM.groundPlane(g, c, { far: bloodK > 0.5 ? '#3a1218' : '#28223a', mid: '#141018', near: '#08060a', path: o.path === false ? null : [70, '#3a3036'], grass: 160, seed: 5 });
    // rows of graves receding on both sides of the path
    const R = rng(o.seed || 21);
    const items = [];
    for (let row = 0; row < 18; row++) {
      const Z = 260 + row * 260;
      for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
        if (R() < 0.25) { R(); R(); R(); continue; }
        const X = side * (170 + k * 230 + R() * 80);
        const type = Math.floor(R() * 5);
        const w = 70 + R() * 40, h = type === 1 ? 170 + R() * 40 : type === 3 ? 230 : 110 + R() * 50;
        items.push({ Z, X, type, w, h, tilt: (R() - 0.5) * 0.16, moss: R() < 0.4, seed: Math.floor(R() * 1000) });
      }
    }
    if (o.grave) items.push({ Z: o.grave.Z, X: o.grave.X, fresh: true });
    for (const tr of [[-900, 900, 31], [1000, 1300, 8], [-1300, 2600, 17], [1400, 3200, 27]]) items.push({ Z: tr[1], X: tr[0], tree: tr[2] });
    items.sort((a, b) => b.Z - a.Z);
    const out = { hz, place: [] };
    const hooks = o.hooks || {};
    let hi = 0;
    const hookZs = Object.keys(hooks).map(Number).sort((a, b) => b - a);
    for (const it of items) {
      while (hi < hookZs.length && hookZs[hi] > it.Z) { hooks[hookZs[hi]](g); hi++; }
      if (it.Z <= c.z + 20) continue;
      const p = NM.P3(c, it.X, 0, it.Z);
      if (p.x < -400 || p.x > W + 400) continue;
      const fk = fogK(c, it.Z, 0.00035);
      if (it.tree) { NM.paintTree(g, p.x, p.y, 900 * p.k, it.tree, t, { rim: rgba(bloodK > 0.5 ? '#ff6a6a' : '#9a90c8', 0.5), depth: 7 }); continue; }
      if (it.fresh) { if (o.freshGrave) o.freshGrave(g, p, it); continue; }
      NM.paintGrave(g, p.x, p.y, it.w * p.k, it.h * p.k, it.type, { tilt: it.tilt, light: 0.7, fog: fk * 0.85, fogCol: bloodK > 0.5 ? '#4a1a22' : '#3a3450', moss: it.moss, seed: it.seed, lit: o.warm ? o.warm(it, p) : 0 });
    }
    while (hi < hookZs.length) { hooks[hookZs[hi]](g); hi++; }
    if (o.fog !== 0) NM.paintFog(g, t, H * 0.62, H * 0.4, o.fog ?? 0.28, bloodK > 0.5 ? '#8a3040' : '#6a6088', 26);
    return out;
  };

  // fresh grave: mound + new headstone (perspective-projected p)
  NM.freshGrave = function (g, p, t, o = {}) {
    const k = p.k;
    const open = o.open || 0;
    softShade(g, p.x, p.y + 10 * k, 170 * k, 40 * k, '#000000', 0.7);
    if (open > 0) {
      g.fillStyle = '#1a120e'; g.beginPath(); g.ellipse(p.x, p.y + 6 * k, 120 * k, 34 * k, 0, 0, TAU); g.fill();
      g.fillStyle = '#050304'; g.beginPath(); g.ellipse(p.x, p.y + 8 * k, 90 * k, 22 * k * open, 0, 0, TAU); g.fill();
      for (const sx of [-1, 1]) { g.fillStyle = '#2a1e16'; g.beginPath(); g.ellipse(p.x + sx * 150 * k, p.y, 50 * k, 22 * k, 0, Math.PI, 0); g.fill(); }
    } else {
      const mg = g.createLinearGradient(0, p.y - 30 * k, 0, p.y + 20 * k); mg.addColorStop(0, '#4a3a2e'); mg.addColorStop(1, '#1a120e');
      g.fillStyle = mg; g.beginPath(); g.ellipse(p.x, p.y + 4 * k, 130 * k, 30 * k, 0, Math.PI, TAU); g.ellipse(p.x, p.y + 4 * k, 130 * k, 12 * k, 0, 0, Math.PI); g.fill();
      for (let i = 0; i < 26; i++) { g.fillStyle = i % 2 ? '#5a4636' : '#2a1e16'; g.fillRect(p.x + (hash2(i, 3) - 0.5) * 220 * k, p.y - hash2(i, 5) * 22 * k, 5 * k, 3 * k); }
    }
    // headstone (white marble, new)
    const hx = p.x, hy = p.y - 20 * k;
    NM.paintGrave(g, hx, hy, 110 * k, 160 * k, 4, { light: 0.6, engrave: true, lit: o.lit || 0 });
    g.save(); g.globalCompositeOperation = 'screen'; softShade(g, hx, hy - 80 * k, 60 * k, 80 * k, '#cfc8e8', 0.35, 'screen'); g.restore();
    if (k > 0.5 && o.text !== false) {
      g.save(); g.fillStyle = 'rgba(20,16,26,0.7)'; g.textAlign = 'center';
      g.font = `${Math.round(13 * k)}px "Cinzel"`; g.fillText('LUCIEN', hx, hy - 95 * k);
      g.font = `${Math.round(10 * k)}px "Cinzel"`; g.fillText('ASHGROVE', hx, hy - 80 * k);
      g.font = `italic ${Math.round(9 * k)}px "IM Fell English"`; g.fillText('1849 - 1878', hx, hy - 64 * k); g.fillText('beloved', hx, hy - 50 * k);
      g.restore();
    }
    if (o.rose) NM.paintRose(g, p.x + 30 * k, p.y - 6 * k, 9 * k, 0.4, t);
  };

  // painted candle at a projected point
  NM.paintCandle = function (g, x, y, k, t, seed, o = {}) {
    const h = 34 * k, w = 9 * k;
    const lit = o.lit ?? 1;
    if (lit > 0.02) softShade(g, x, y, 90 * k, 26 * k, o.red ? '#ff2a44' : '#ffb060', 0.35 * lit, 'screen');
    const cg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    cg.addColorStop(0, '#5a5048'); cg.addColorStop(0.4, '#e8dcc8'); cg.addColorStop(1, '#4a4038');
    g.fillStyle = cg; g.fillRect(x - w / 2, y - h, w, h);
    g.fillStyle = '#e8dcc8'; g.beginPath(); g.ellipse(x, y - h, w / 2, w * 0.2, 0, 0, TAU); g.fill();
    if (lit > 0.02) NM.flame(g, x, y - h - 1, 16 * k * lit, t, seed, { color: o.red ? '#ff4a5a' : '#ffcf7a', glowColor: o.red ? '#ff2040' : '#ffaa50', glowR: 6, glowA: 0.55 * lit, base: o.red ? 'rgba(255,0,60,0.6)' : 'rgba(120,60,255,0.5)' });
  };

  // ---------- the MANOR (exterior painting) ----------
  NM.manorScene = function (g, t, o = {}) {
    const blood = o.blood || 0;
    NM.paintSky(g, t, { top: '#08070e', mid: '#221c36', low: '#4a3a4e', moon: { x: o.moonX ?? W * 0.78, y: H * 0.2, r: 90, blood }, clouds: 0.7, speed: 8 });
    NM.paintRidge(g, 7, H * 0.66, 40, 0.002, '#1e1a2a', '#7a70a0');
    const s = o.scale || 1, mx = o.x ?? W / 2, my = o.y ?? H * 0.7;
    // rim-lit silhouette of the manor
    NM.silhouette(g, '#8a80b8', (q) => NM.manor(q, mx + 2, my - 1, s, t, { color: '#000' }));
    NM.manor(g, mx, my, s, t, { color: '#16131e', lit: o.lit || [1, 4, 7, 10, 12], litColor: '#ffb860', darkWin: '#0e0c14' });
    // stone texture + moonlight falloff across the facade (clipped to the building)
    NM.silhouette(g, 'rgba(0,0,0,0)', () => {});
    const tmp = NM._manorTmp || (NM._manorTmp = NM.layer());
    const q = NM.beginLayer(tmp);
    NM.manor(q, mx, my, s, t, { color: '#000', lit: [], darkWin: '#000' });
    q.globalCompositeOperation = 'source-in';
    q.fillStyle = q.createPattern(NM.A.stone, 'repeat'); q.fillRect(0, 0, W, H);
    const mg = q.createLinearGradient(mx - 600 * s, 0, mx + 600 * s, 0); mg.addColorStop(0, 'rgba(0,0,0,0.75)'); mg.addColorStop(1, 'rgba(120,110,170,0.25)');
    q.globalCompositeOperation = 'source-atop'; q.fillStyle = mg; q.fillRect(0, 0, W, H);
    q.globalCompositeOperation = 'source-over';
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.9; g.drawImage(tmp, 0, 0, W, H); g.restore();
    // window glows
    for (const i of o.lit || [1, 4, 7, 10, 12]) { const w0 = NM.manorWin(i); glow(g, mx + w0.x * s, my + w0.y * s, 70 * s, '#ffaa50', 0.45); }
    NM.paintFog(g, t, my - 60 * s, 260, 0.3, '#6a6090', 16);
  };

  // ---------- one-point perspective interiors ----------
  // kind: 'hall' | 'crypt' | 'ballroom'.  o: { camZ, lights, decor }
  NM.interior = function (g, t, c, kind, o = {}) {
    const HW = kind === 'ballroom' ? 760 : kind === 'crypt' ? 360 : 300;   // half width
    const HC = kind === 'ballroom' ? 900 : kind === 'crypt' ? 420 : 460;   // ceiling height
    const SEG = kind === 'ballroom' ? 420 : 300, N = 16;
    const zStart = Math.floor(c.z / SEG) * SEG;
    const pal = {
      hall: { wall: '#2a1e2e', wall2: '#3c2a3a', trim: '#5a3a2a', floor: '#3a281e', floor2: '#24180f', ceil: '#0e0a0e', fog: '#1a1218' },
      crypt: { wall: '#2a2a36', wall2: '#3a3a4a', trim: '#4a4a5a', floor: '#2a2830', floor2: '#1a1820', ceil: '#0c0c12', fog: '#14141c' },
      ballroom: { wall: '#2a1018', wall2: '#4a1a24', trim: '#8a6a3a', floor: '#6a5a5a', floor2: '#140c10', ceil: '#100608', fog: '#1e0c10' },
    }[kind];
    // back wall (end of the corridor)
    const far = zStart + SEG * N;
    const a = NM.P3(c, -HW, HC, far), b = NM.P3(c, HW, 0, far);
    g.fillStyle = pal.fog; g.fillRect(0, 0, W, H);
    const items = [];
    for (let i = N - 1; i >= 0; i--) {
      const z0 = zStart + i * SEG, z1 = z0 + SEG;
      if (z1 <= c.z + 5) continue;
      const zz0 = Math.max(z0, c.z + 5);
      const fk = fogK(c, (zz0 + z1) / 2, kind === 'ballroom' ? 0.00045 : 0.0007);
      const P = (X, Y, Z) => NM.P3(c, X, Y, Z);
      const quad = (p1, p2, p3, p4, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.lineTo(p3.x, p3.y); g.lineTo(p4.x, p4.y); g.closePath(); g.fill(); };
      const mixF = (col) => fk > 0.01 ? NM.mixHex(col, pal.fog, fk) : col;
      // floor
      if (kind === 'ballroom') {
        for (let tx = -4; tx < 4; tx++) for (let tz = 0; tz < 2; tz++) {
          const x0 = tx * HW / 4, x1 = x0 + HW / 4, za = zz0 + (z1 - zz0) * tz / 2, zb = zz0 + (z1 - zz0) * (tz + 1) / 2;
          const light = ((tx + tz + Math.floor(z0 / SEG) * 2) % 2 + 2) % 2 === 0;
          quad(P(x0, 0, za), P(x1, 0, za), P(x1, 0, zb), P(x0, 0, zb), mixF(light ? pal.floor : pal.floor2));
        }
      } else {
        quad(P(-HW, 0, zz0), P(HW, 0, zz0), P(HW, 0, z1), P(-HW, 0, z1), mixF(pal.floor));
        g.strokeStyle = mixF(pal.floor2); g.lineWidth = 1;
        for (let k = -3; k <= 3; k++) { const p1 = P(k * HW / 4, 0, zz0), p2 = P(k * HW / 4, 0, z1); g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.stroke(); }
        const pz = P(-HW, 0, z1), pz2 = P(HW, 0, z1); g.beginPath(); g.moveTo(pz.x, pz.y); g.lineTo(pz2.x, pz2.y); g.stroke();
      }
      if (o.carpet) quad(P(-o.carpet, 0.5, zz0), P(o.carpet, 0.5, zz0), P(o.carpet, 0.5, z1), P(-o.carpet, 0.5, z1), mixF('#5a0c18'));
      // walls
      for (const side of [-1, 1]) {
        const X = side * HW;
        quad(P(X, 0, zz0), P(X, HC, zz0), P(X, HC, z1), P(X, 0, z1), mixF(i % 2 ? pal.wall : pal.wall2));
        if (kind !== 'crypt') quad(P(X, 0, zz0), P(X, 110, zz0), P(X, 110, z1), P(X, 0, z1), mixF(pal.trim));
        else for (let r = 0; r < 6; r++) { const yy = r * 70; const p1 = P(X, yy, zz0), p2 = P(X, yy, z1); g.strokeStyle = mixF('#1a1a24'); g.lineWidth = Math.max(1, 2 * p1.k); g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.stroke(); }
        // decorations at the middle of each segment
        const zm = (z0 + z1) / 2;
        if (zm > c.z + 180) items.push({ z: zm, side, i, fk });
      }
      // ceiling + arch / beam at the segment boundary
      quad(P(-HW, HC, zz0), P(HW, HC, zz0), P(HW, HC, z1), P(-HW, HC, z1), mixF(pal.ceil));
      if (z0 > c.z + 10) {
        const L = P(-HW, 0, z0), R = P(HW, 0, z0), T = P(0, HC + (kind === 'hall' ? 0 : 160), z0);
        g.strokeStyle = mixF(kind === 'ballroom' ? '#3a1a10' : kind === 'crypt' ? '#3a3a48' : '#1a100c');
        g.lineWidth = Math.max(2, (kind === 'hall' ? 18 : 34) * L.k);
        g.beginPath();
        if (kind === 'hall') { const tl = P(-HW, HC, z0), tr = P(HW, HC, z0); g.moveTo(L.x, L.y); g.lineTo(tl.x, tl.y); g.lineTo(tr.x, tr.y); g.lineTo(R.x, R.y); }
        else { const sl = P(-HW, HC * 0.7, z0), sr = P(HW, HC * 0.7, z0); g.moveTo(L.x, L.y); g.lineTo(sl.x, sl.y); g.quadraticCurveTo(sl.x, T.y, T.x, T.y); g.quadraticCurveTo(sr.x, T.y, sr.x, sr.y); g.lineTo(R.x, R.y); }
        g.stroke();
        if (kind === 'ballroom') { // columns
          for (const side of [-1, 1]) { const p0 = P(side * (HW - 40), 0, z0), p1 = P(side * (HW - 40), HC * 0.85, z0); const cw = 60 * p0.k; const cg = g.createLinearGradient(p0.x - cw / 2, 0, p0.x + cw / 2, 0); cg.addColorStop(0, mixF('#2a1a18')); cg.addColorStop(0.5, mixF('#8a7a6a')); cg.addColorStop(1, mixF('#2a1a18')); g.fillStyle = cg; g.fillRect(p0.x - cw / 2, p1.y, cw, p0.y - p1.y); }
        }
      }
      // decorations for this segment (drawn after its walls)
      for (const d of items.splice(0)) decorate(g, t, c, kind, d, HW, HC, pal, o);
    }
    return { HW, HC };
  };
  function decorate(g, t, c, kind, d, HW, HC, pal, o) {
    const X = d.side * (HW - 4);
    const P = (Y, dz = 0) => NM.P3(c, X, Y, d.z + dz);
    const mixF = (col) => (d.fk > 0.01 ? NM.mixHex(col, pal.fog, d.fk) : col);
    const lightA = 1 - d.fk;
    if (kind === 'hall') {
      if (d.i % 2 === 0) { // portrait in a gilded frame
        const tl = P(330, -70), br = P(170, 70);
        g.fillStyle = mixF('#8a6a3a'); g.fillRect(Math.min(tl.x, br.x), tl.y, Math.abs(br.x - tl.x), br.y - tl.y);
        const ix = Math.min(tl.x, br.x) + Math.abs(br.x - tl.x) * 0.12, iw = Math.abs(br.x - tl.x) * 0.76, iy = tl.y + (br.y - tl.y) * 0.1, ih = (br.y - tl.y) * 0.8;
        g.fillStyle = mixF('#1a1014'); g.fillRect(ix, iy, iw, ih);
        g.fillStyle = mixF('#8a6a5a'); g.beginPath(); g.ellipse(ix + iw / 2, iy + ih * 0.38, iw * 0.18, ih * 0.16, 0, 0, TAU); g.fill();
        g.fillStyle = mixF('#120a0e'); g.fillRect(ix + iw * 0.2, iy + ih * 0.58, iw * 0.6, ih * 0.42);
      } else { // tall moonlit window
        const tl = P(400, -80), br = P(120, 80);
        g.fillStyle = mixF('#0a080e'); g.fillRect(Math.min(tl.x, br.x), tl.y, Math.abs(br.x - tl.x), br.y - tl.y);
        g.fillStyle = mixF('#5a6a9a'); g.fillRect(Math.min(tl.x, br.x) + 3, tl.y + 3, Math.abs(br.x - tl.x) - 6, br.y - tl.y - 6);
        const cen = P(260, 0);
        if (lightA > 0.2) NM.shaft(g, cen.x, cen.y, Math.abs(br.x - tl.x), lerp(cen.x, W / 2, 0.6), H, Math.abs(br.x - tl.x) * 2, '#8a9ac8', 0.12 * lightA);
      }
      // candelabra on a stand
      const st = NM.P3(c, d.side * (HW - 60), 0, d.z + 130), top = NM.P3(c, d.side * (HW - 60), 150, d.z + 130);
      g.strokeStyle = mixF('#8a6a3a'); g.lineWidth = Math.max(1, 5 * st.k); g.beginPath(); g.moveTo(st.x, st.y); g.lineTo(top.x, top.y); g.stroke();
      for (const dx of [-24, 0, 24]) { const cp = NM.P3(c, d.side * (HW - 60) + dx, 150, d.z + 130); NM.paintCandle(g, cp.x, cp.y, cp.k * 0.8, t, d.z + dx, { red: o.red }); }
    } else if (kind === 'crypt') {
      // stone niches with skulls, coffins on plinths, candles
      const tl = P(300, -80), br = P(160, 80);
      g.fillStyle = mixF('#0c0c12'); g.beginPath(); NM.archPath(g, (tl.x + br.x) / 2, br.y, Math.abs(br.x - tl.x), br.y - tl.y); g.closePath(); g.fill();
      const sk = P(190, 0);
      for (const [dx, dy, s0] of [[-22, 6, 0.85], [0, 0, 1], [22, 6, 0.9], [-11, -26, 0.8], [11, -26, 0.8]]) NM.paintSkull(g, sk.x + dx * sk.k, sk.y + dy * sk.k, 15 * sk.k * s0, mixF('#c8bca8'), d.fk);
      if (d.i % 2 === 0) { // coffin on a plinth along the wall
        const cx = d.side * (HW - 110);
        const p0 = NM.P3(c, cx, 60, d.z - 90), p1 = NM.P3(c, cx, 60, d.z + 90), q0 = NM.P3(c, cx, 0, d.z - 90);
        g.fillStyle = mixF('#2a2a34'); g.fillRect(Math.min(p0.x, p1.x) - 30 * p0.k, p0.y, Math.abs(p1.x - p0.x) + 60 * p0.k, q0.y - p0.y);
        g.fillStyle = mixF('#3a2a20'); g.beginPath(); g.moveTo(p0.x - 34 * p0.k, p0.y); g.lineTo(p1.x - 26 * p1.k, p1.y); g.lineTo(p1.x + 26 * p1.k, p1.y); g.lineTo(p0.x + 34 * p0.k, p0.y); g.lineTo(p0.x + 28 * p0.k, p0.y - 30 * p0.k); g.lineTo(p0.x - 28 * p0.k, p0.y - 30 * p0.k); g.closePath(); g.fill();
      }
      const cp = NM.P3(c, d.side * (HW - 40), 0, d.z + 60); NM.paintCandle(g, cp.x, cp.y, cp.k, t, d.z, { red: o.red });
    } else {
      // ballroom: tall arched windows with moonlight, candelabras
      const tl = P(820, -150), br = P(160, 150);
      g.fillStyle = mixF('#0a0408'); g.beginPath(); NM.archPath(g, (tl.x + br.x) / 2, br.y, Math.abs(br.x - tl.x) * 1.1, br.y - tl.y); g.closePath(); g.fill();
      g.fillStyle = mixF(o.red ? '#6a1020' : '#3a4a7a'); g.beginPath(); NM.archPath(g, (tl.x + br.x) / 2, br.y - 4, Math.abs(br.x - tl.x) * 0.9, (br.y - tl.y) * 0.96); g.closePath(); g.fill();
      const cen = P(500, 0);
      if (lightA > 0.2) NM.shaft(g, cen.x, cen.y, Math.abs(br.x - tl.x), lerp(cen.x, W / 2, 0.7), H, Math.abs(br.x - tl.x) * 2.5, o.red ? '#ff4a5a' : '#8a9ad8', 0.1 * lightA);
      const cp = NM.P3(c, d.side * (HW - 100), 220, d.z); NM.paintCandle(g, cp.x, cp.y, cp.k * 1.2, t, d.z, { red: o.red });
    }
  }


  // painted skull (front view)
  NM.paintSkull = function (g, x, y, r, col = '#c8bca8', fog = 0) {
    g.save(); g.translate(x, y);
    const sg = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.2);
    sg.addColorStop(0, '#f4ecdc'); sg.addColorStop(0.5, col); sg.addColorStop(1, '#4a4038');
    g.fillStyle = sg;
    g.beginPath(); g.ellipse(0, -r * 0.1, r, r * 0.95, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-r * 0.62, r * 0.4); g.lineTo(-r * 0.5, r * 1.05); g.lineTo(r * 0.5, r * 1.05); g.lineTo(r * 0.62, r * 0.4); g.fill();
    g.fillStyle = '#0c0808';
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * r * 0.36, r * 0.1, r * 0.26, r * 0.3, sx * 0.2, 0, TAU); g.fill(); }
    g.beginPath(); g.moveTo(0, r * 0.38); g.lineTo(-r * 0.1, r * 0.58); g.lineTo(r * 0.1, r * 0.58); g.fill();
    g.fillStyle = '#2a2420'; for (let k = -3; k <= 3; k++) g.fillRect(k * r * 0.13 - r * 0.03, r * 0.72, r * 0.06, r * 0.26);
    if (fog > 0.01) { g.globalAlpha = fog * 0.8; g.fillStyle = '#14141c'; g.beginPath(); g.ellipse(0, r * 0.2, r * 1.05, r * 1.3, 0, 0, TAU); g.fill(); }
    g.restore();
  };

  // hex colour mix (for depth fog on flat fills)
  const mixCache = new Map();
  NM.mixHex = function (a, b, k) {
    const kk = Math.round(clamp(k) * 20) / 20;
    const key = a + b + kk;
    if (mixCache.has(key)) return mixCache.get(key);
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, kk)), gg = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, kk)), bb = Math.round(lerp(pa & 255, pb & 255, kk));
    const v = `rgb(${r},${gg},${bb})`;
    mixCache.set(key, v);
    return v;
  };

  // painted chandelier (perspective)
  NM.paintChandelier = function (g, x, y, k, t, lit = 1, red = false) {
    g.save();
    g.strokeStyle = '#8a6a3a'; g.lineWidth = Math.max(1, 3 * k);
    g.beginPath(); g.moveTo(x, y - 400 * k); g.lineTo(x, y); g.stroke();
    for (const [rr, yy] of [[150, 0], [95, -55], [50, -95]]) {
      g.beginPath(); g.ellipse(x, y + yy * k, rr * k, rr * 0.28 * k, 0, 0, TAU); g.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + t * 0.05;
        const cx = x + Math.cos(a) * rr * k, cy = y + yy * k + Math.sin(a) * rr * 0.28 * k;
        g.fillStyle = '#e8dcc8'; g.fillRect(cx - 2 * k, cy - 14 * k, 4 * k, 14 * k);
        if (lit > 0.05) NM.flame(g, cx, cy - 14 * k, 12 * k * lit, t, i + rr, { color: red ? '#ff4a5a' : '#ffcf7a', glowColor: red ? '#ff2040' : '#ffaa50', glowR: 3, glowA: 0.4 * lit });
        // crystal drops
        g.fillStyle = 'rgba(220,220,255,0.6)'; g.fillRect(cx - 1 * k, cy + 4 * k, 2 * k, 10 * k);
      }
    }
    if (lit > 0.05) glow(g, x, y - 40 * k, 420 * k, red ? '#ff2040' : '#ffb060', 0.35 * lit);
    g.restore();
  };

  // village street at night (painted, side-on)
  NM.villageScene = function (g, t, o = {}) {
    NM.paintSky(g, t, { top: '#0a0912', mid: '#2a2436', low: '#5a4a4a', moon: { x: W * 0.2, y: H * 0.18, r: 70 }, clouds: 0.6 });
    const gy = H * 0.74;
    // church
    NM.silhouette(g, '#7a70a0', (q) => { q.translate(2, -1); churchShape(q, W * 0.62, gy); });
    g.fillStyle = '#100c14'; churchShape(g, W * 0.62, gy);
    NM.roseWindow(g, W * 0.62, gy - 260, 34, t, { frame: '#100c14', colors: ['#7a1020', '#c4122f', '#3a2a6a', '#e05a2a', '#2a3a7a'], glow: 0.35, glowColor: '#ff7a3a' });
    // timber houses with lit windows
    for (const [x, w, h] of [[W * 0.08, 300, 300], [W * 0.3, 260, 260], [W * 0.88, 320, 320]]) {
      g.fillStyle = '#16121a'; g.fillRect(x - w / 2, gy - h, w, h);
      g.beginPath(); g.moveTo(x - w / 2 - 20, gy - h); g.lineTo(x, gy - h - 140); g.lineTo(x + w / 2 + 20, gy - h); g.fill();
      for (const [wx, wy] of [[-0.25, 0.35], [0.25, 0.35], [-0.25, 0.7], [0.25, 0.7]]) {
        const lit = hash2(Math.floor(x), Math.floor(wx * 10 + wy * 10)) > 0.35;
        g.fillStyle = lit ? '#ffb060' : '#1e1a26'; g.fillRect(x + wx * w - 22, gy - h * wy - 30, 44, 52);
        if (lit) glow(g, x + wx * w, gy - h * wy - 4, 90, '#ffaa50', 0.3);
        g.fillStyle = '#16121a'; g.fillRect(x + wx * w - 2, gy - h * wy - 30, 4, 52);
      }
    }
    // cobbled street
    const sg = g.createLinearGradient(0, gy, 0, H); sg.addColorStop(0, '#2a2430'); sg.addColorStop(1, '#0a080c');
    g.fillStyle = sg; g.fillRect(0, gy, W, H - gy);
    g.strokeStyle = 'rgba(120,110,140,0.12)'; g.lineWidth = 2;
    for (let i = 0; i < 70; i++) { const x = hash2(i, 1) * W, y = gy + 10 + hash2(i, 2) ** 1.5 * (H - gy); g.beginPath(); g.ellipse(x, y, 20 + hash2(i, 3) * 20, 6 + hash2(i, 4) * 4, 0, 0, Math.PI); g.stroke(); }
    // lamp posts
    for (const x of [W * 0.2, W * 0.46, W * 0.78]) {
      g.fillStyle = '#0a080c'; g.fillRect(x - 4, gy - 260, 8, 260); g.fillRect(x - 18, gy - 290, 36, 34);
      g.fillStyle = '#ffcf7a'; g.fillRect(x - 12, gy - 284, 24, 22); glow(g, x, gy - 272, 160, '#ffaa50', 0.45);
      softShade(g, x, gy + 10, 140, 26, '#ffaa50', 0.25, 'screen');
    }
    NM.paintFog(g, t, gy - 160, 220, 0.25, '#6a6088', 12);
    return gy;
  };
  function churchShape(g, x, gy) {
    g.beginPath();
    g.moveTo(x - 220, gy); g.lineTo(x - 220, gy - 300); g.lineTo(x - 70, gy - 300); g.lineTo(x - 70, gy - 470); g.lineTo(x, gy - 720); g.lineTo(x + 70, gy - 470); g.lineTo(x + 70, gy - 300);
    g.lineTo(x + 220, gy - 300); g.lineTo(x + 220, gy); g.closePath(); g.fill();
    g.fillRect(x - 3, gy - 790, 6, 80); g.fillRect(x - 22, gy - 765, 44, 6);
  }
})();
