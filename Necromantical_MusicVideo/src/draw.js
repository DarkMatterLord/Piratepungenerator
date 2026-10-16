// Necromantical — drawing primitives (environments, props, effects).
'use strict';
(function () {
  const { clamp, lerp, TAU, hash1, hash2, rng, noise1, fbm1, C, rgba, W, H, glow, canvas } = NM;

  // ---------- texture tinting (cached) ----------
  const tintCache = new Map();
  NM.tinted = function (tex, hex, mode = 'multiply') {
    const key = tex.__id + '|' + hex + '|' + mode;
    if (!tex.__id) tex.__id = 'tex' + Math.floor(Math.random() * 1e9);
    const k2 = tex.__id + '|' + hex + '|' + mode;
    if (tintCache.has(k2)) return tintCache.get(k2);
    const c = canvas(tex.width, tex.height), g = c.getContext('2d');
    g.drawImage(tex, 0, 0);
    g.globalCompositeOperation = mode;
    g.fillStyle = hex; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(tex, 0, 0);
    tintCache.set(k2, c);
    return c;
  };

  // ---------- sky / atmosphere ----------
  NM.skyGrad = function (ctx, stops, y0 = 0, y1 = H) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(-W, y0 - H, W * 3, y1 - y0 + H * 2);
  };
  NM.stars = function (ctx, t, n, seed, alpha = 1, x0 = 0, y0 = 0, w = W, h = H * 0.6) {
    ctx.save();
    for (let i = 0; i < n; i++) {
      const x = x0 + hash2(i, seed) * w, y = y0 + hash2(i, seed + 1) ** 1.3 * h;
      const tw = 0.55 + 0.45 * Math.sin(t * (1 + hash2(i, seed + 2) * 3) + i);
      const s = 0.6 + hash2(i, seed + 3) ** 4 * 2.2;
      ctx.globalAlpha = alpha * tw * (0.35 + 0.65 * hash2(i, seed + 4));
      ctx.fillStyle = '#dfe6ff';
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();
  };

  // moon texture is built lazily
  let moonTex = null, moonBlood = null;
  function buildMoon() {
    const s = 512, c = canvas(s, s), g = c.getContext('2d');
    const img = g.createImageData(s, s), d = img.data;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const dx = (x - s / 2) / (s / 2), dy = (y - s / 2) / (s / 2), r2 = dx * dx + dy * dy;
      const o = (y * s + x) * 4;
      if (r2 > 1) { d[o + 3] = 0; continue; }
      const limb = Math.sqrt(1 - r2);
      const mare = NM.fbm2(dx * 2.2 + 4, dy * 2.2 + 1, 5);
      const crater = NM.fbm2(dx * 9, dy * 9, 3);
      let v = 0.86 - clamp(mare * 1.4 + 0.1, 0, 0.5) * 0.55 + crater * 0.07;
      v *= 0.72 + 0.28 * limb;
      const edge = clamp((1 - Math.sqrt(r2)) * s * 0.5); // anti-alias
      d[o] = 236 * v; d[o + 1] = 238 * v; d[o + 2] = 246 * v; d[o + 3] = 255 * edge;
    }
    g.putImageData(img, 0, 0);
    moonTex = c;
    moonBlood = NM.tinted(c, '#ff2a2a');
  }
  // blood: 0 = silver, 1 = blood moon. phase: 0 full, +-1 new (shadow sweeps)
  NM.moon = function (ctx, x, y, r, opt = {}) {
    if (!moonTex) buildMoon();
    const blood = opt.blood || 0, halo = opt.halo ?? 1;
    const hc = blood > 0.5 ? C.crimson : '#cfd8ff';
    glow(ctx, x, y, r * 7, hc, 0.22 * halo);
    glow(ctx, x, y, r * 3.2, blood > 0.5 ? C.rose : '#e8eeff', 0.35 * halo);
    ctx.save();
    if (opt.phase) {
      // clip to the lit part of the disc
      ctx.beginPath(); ctx.arc(x, y, r + 1, 0, TAU);
      ctx.clip();
    }
    ctx.globalAlpha = opt.alpha ?? 1;
    ctx.drawImage(moonTex, x - r, y - r, r * 2, r * 2);
    if (blood > 0) { ctx.globalAlpha = (opt.alpha ?? 1) * clamp(blood); ctx.drawImage(moonBlood, x - r, y - r, r * 2, r * 2); }
    if (opt.phase) {
      const ph = opt.phase; // -1..1
      ctx.globalAlpha = 0.93;
      ctx.fillStyle = opt.shadowColor || '#0b0d18';
      ctx.beginPath();
      const k = Math.cos(ph * Math.PI); // terminator ellipse x-radius
      if (ph > 0) { ctx.arc(x, y, r + 1, -Math.PI / 2, Math.PI / 2, true); ctx.ellipse(x, y, Math.abs(k) * (r + 1), r + 1, 0, Math.PI / 2, -Math.PI / 2, k > 0); }
      else { ctx.arc(x, y, r + 1, -Math.PI / 2, Math.PI / 2, false); ctx.ellipse(x, y, Math.abs(k) * (r + 1), r + 1, 0, Math.PI / 2, -Math.PI / 2, k < 0); }
      ctx.fill();
    }
    ctx.restore();
  };

  // horizontally tiled texture band in screen space (clouds / fog)
  NM.band = function (ctx, tex, y, h, tileW, scroll, alpha = 1, mode = 'source-over') {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.globalCompositeOperation = mode;
    const off = ((scroll % tileW) + tileW) % tileW;
    for (let x = -off - tileW; x < W + tileW; x += tileW) ctx.drawImage(tex, x, y, tileW + 1, h);
    ctx.restore();
  };
  NM.clouds = function (ctx, t, opt = {}) {
    const tex = opt.tint ? NM.tinted(NM.A.clouds, opt.tint) : NM.A.clouds;
    const y = opt.y ?? 0, h = opt.h ?? H * 0.6, sp = opt.speed ?? 12, a = opt.alpha ?? 0.5;
    NM.band(ctx, tex, y, h, opt.tile ?? 2200, (opt.offset ?? 0) + t * sp, a);
    if (opt.flash) NM.band(ctx, NM.A.clouds, y, h, opt.tile ?? 2200, (opt.offset ?? 0) + t * sp, opt.flash * 0.9, 'lighter');
  };
  NM.fog = function (ctx, t, y, h, alpha = 0.5, speed = 20, offset = 0, tint = null) {
    const tex = tint ? NM.tinted(NM.A.fog, tint) : NM.A.fog;
    NM.band(ctx, tex, y, h, 1800, offset + t * speed, alpha);
  };

  // ---------- terrain ----------
  // ridge from x0..x1 with top edge baseY + fbm*amp, filled down to bottom
  NM.ridge = function (ctx, seed, baseY, amp, freq, color, x0 = -200, x1 = W + 200, bottom = H + 400) {
    ctx.beginPath();
    ctx.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, baseY + fbm1(x * freq + seed * 13.7, 4) * amp);
    ctx.lineTo(x1, bottom);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  NM.ridgeY = (seed, baseY, amp, freq, x) => baseY + fbm1(x * freq + seed * 13.7, 4) * amp;

  // ---------- dead tree ----------
  NM.deadTree = function (ctx, x, y, h, seed, t = 0, opt = {}) {
    const R = rng(seed);
    const depthMax = opt.depth ?? 7;
    const sway = opt.sway ?? 1;
    ctx.save();
    ctx.strokeStyle = opt.color || C.ink;
    ctx.lineCap = 'round';
    const lean = (R() - 0.5) * 0.3 + (opt.lean || 0);
    function br(x, y, ang, len, w, d) {
      const s = sway * Math.sin(t * 1.1 + d * 0.9 + seed) * 0.012 * (depthMax - d + 1);
      const a = ang + s;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      const bend = (R() - 0.5) * len * 0.35;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo((x + x2) / 2 + Math.cos(a + Math.PI / 2) * bend, (y + y2) / 2 + Math.sin(a + Math.PI / 2) * bend, x2, y2);
      ctx.stroke();
      if (d <= 0) return;
      const n = R() < 0.35 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const spread = 0.25 + R() * 0.55;
        const na = a + (i === 0 ? -spread : i === 1 ? spread : (R() - 0.5) * 0.3);
        br(x2, y2, na + (R() - 0.5) * 0.2, len * (0.62 + R() * 0.18), Math.max(0.8, w * 0.62), d - 1);
      }
    }
    br(x, y, -Math.PI / 2 + lean, h * 0.32, h * 0.055, depthMax);
    // roots / flare
    ctx.fillStyle = opt.color || C.ink;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.09, y + 4); ctx.quadraticCurveTo(x - h * 0.03, y - h * 0.02, x - h * 0.025, y - h * 0.12);
    ctx.lineTo(x + h * 0.025, y - h * 0.12); ctx.quadraticCurveTo(x + h * 0.03, y - h * 0.02, x + h * 0.1, y + 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  // cached tree sprite (for crowds of trees; no sway)
  const treeCache = new Map();
  NM.treeSprite = function (seed, h, color = C.ink, depth = 7) {
    const key = seed + '|' + h + '|' + color + '|' + depth;
    if (treeCache.has(key)) return treeCache.get(key);
    const c = canvas(h * 1.4, h * 1.15), g = c.getContext('2d');
    NM.deadTree(g, c.width / 2, h * 1.1, h, seed, 0, { color, depth, sway: 0 });
    const s = { c, ox: c.width / 2, oy: h * 1.1 };
    treeCache.set(key, s);
    return s;
  };

  // ---------- graveyard ----------
  function gravePath(ctx, type, w, h) {
    ctx.beginPath();
    if (type === 0) { // rounded slab
      ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h + w / 2); ctx.arc(0, -h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(w / 2, 0);
    } else if (type === 1) { // cross
      const a = w * 0.22;
      ctx.moveTo(-a, 0); ctx.lineTo(-a, -h * 0.62); ctx.lineTo(-w / 2, -h * 0.62); ctx.lineTo(-w / 2, -h * 0.62 - a * 2); ctx.lineTo(-a, -h * 0.62 - a * 2);
      ctx.lineTo(-a, -h); ctx.lineTo(a, -h); ctx.lineTo(a, -h * 0.62 - a * 2); ctx.lineTo(w / 2, -h * 0.62 - a * 2); ctx.lineTo(w / 2, -h * 0.62); ctx.lineTo(a, -h * 0.62); ctx.lineTo(a, 0);
    } else if (type === 2) { // celtic cross
      const a = w * 0.17, cy = -h * 0.7;
      ctx.moveTo(-a, 0); ctx.lineTo(-a, cy + a); ctx.lineTo(-w / 2, cy + a); ctx.lineTo(-w / 2, cy - a); ctx.lineTo(-a, cy - a);
      ctx.lineTo(-a, -h); ctx.lineTo(a, -h); ctx.lineTo(a, cy - a); ctx.lineTo(w / 2, cy - a); ctx.lineTo(w / 2, cy + a); ctx.lineTo(a, cy + a); ctx.lineTo(a, 0);
      ctx.closePath();
      ctx.moveTo(w * 0.33, cy); ctx.arc(0, cy, w * 0.33, 0, TAU, true);
      ctx.moveTo(w * 0.24, cy); ctx.arc(0, cy, w * 0.24, 0, TAU, false);
    } else if (type === 3) { // gothic pointed slab
      ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.68);
      ctx.quadraticCurveTo(-w / 2, -h * 0.9, 0, -h); ctx.quadraticCurveTo(w / 2, -h * 0.9, w / 2, -h * 0.68); ctx.lineTo(w / 2, 0);
    } else if (type === 4) { // obelisk
      ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.14); ctx.lineTo(-w * 0.32, -h * 0.16); ctx.lineTo(-w * 0.22, -h * 0.9); ctx.lineTo(0, -h);
      ctx.lineTo(w * 0.22, -h * 0.9); ctx.lineTo(w * 0.32, -h * 0.16); ctx.lineTo(w / 2, -h * 0.14); ctx.lineTo(w / 2, 0);
    } else { // square slab with shoulders
      ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.8); ctx.lineTo(-w * 0.35, -h * 0.8); ctx.quadraticCurveTo(-w * 0.35, -h, 0, -h);
      ctx.quadraticCurveTo(w * 0.35, -h, w * 0.35, -h * 0.8); ctx.lineTo(w / 2, -h * 0.8); ctx.lineTo(w / 2, 0);
    }
    ctx.closePath();
  }
  NM.grave = function (ctx, x, y, w, h, type, opt = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(opt.tilt || 0);
    if (opt.rim) {
      ctx.save(); ctx.translate(opt.rimDx ?? -2, opt.rimDy ?? -2); gravePath(ctx, type, w, h); ctx.fillStyle = opt.rim; ctx.fill('evenodd'); ctx.restore();
    }
    gravePath(ctx, type, w, h);
    ctx.fillStyle = opt.color || C.ink;
    ctx.fill('evenodd');
    if (opt.face) { // lit stone face with subtle gradient
      const g = ctx.createLinearGradient(-w / 2, -h, w / 2, 0);
      g.addColorStop(0, opt.face); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fill('evenodd');
    }
    if (opt.text) {
      ctx.fillStyle = opt.textColor || 'rgba(0,0,0,0.6)';
      ctx.textAlign = 'center';
      opt.text.forEach((ln, i) => { ctx.font = ln.font; ctx.fillText(ln.s, 0, -h + ln.y); });
    }
    ctx.restore();
  };
  // a row of graves generated from a seed
  NM.graveRow = function (ctx, seed, x0, x1, y, scale, opt = {}) {
    const R = rng(seed);
    let x = x0;
    while (x < x1) {
      const type = Math.floor(R() * 6);
      const w = (40 + R() * 40) * scale, h = (type === 4 ? 2.6 : type === 1 || type === 2 ? 2 : 1.25) * w * (0.85 + R() * 0.5);
      NM.grave(ctx, x, y + R() * 6 * scale, w, h, type, { tilt: (R() - 0.5) * 0.18, color: opt.color, rim: opt.rim, face: opt.face });
      x += w + (30 + R() * 110) * scale;
    }
  };

  NM.fence = function (ctx, x0, x1, y, h, color = C.ink, spacing = 22) {
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += spacing) {
      ctx.moveTo(x, y); ctx.lineTo(x, y - h);
    }
    ctx.stroke();
    for (let x = x0; x <= x1; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x - 6, y - h + 2); ctx.lineTo(x, y - h - 16); ctx.lineTo(x + 6, y - h + 2); ctx.closePath(); ctx.fill();
    }
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x0, y - h * 0.82); ctx.lineTo(x1, y - h * 0.82); ctx.moveTo(x0, y - h * 0.15); ctx.lineTo(x1, y - h * 0.15); ctx.stroke();
    // scrolls between rails
    ctx.lineWidth = 2;
    for (let x = x0; x < x1; x += spacing * 2) {
      ctx.beginPath(); ctx.arc(x + spacing / 2, y - h * 0.74, spacing * 0.32, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };

  // ---------- gothic manor (bottom-centre at x,y; width ~ 900*s) ----------
  NM.manor = function (ctx, x, y, s, t, opt = {}) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    const col = opt.color || C.ink;
    ctx.fillStyle = col;
    const P = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
    // main hall
    P([-300, 0, -300, -300, -240, -380, -180, -300, -180, -330, -120, -330, -120, -300, 120, -300, 120, -330, 180, -330, 180, -300, 240, -380, 300, -300, 300, 0]);
    // central tower + spire
    P([-70, -300, -70, -520, -85, -520, 0, -760, 85, -520, 70, -520, 70, -300]);
    ctx.fillRect(-2, -830, 4, 80); ctx.fillRect(-14, -800, 28, 4); // cross on spire
    // side towers
    P([-420, 0, -420, -420, -440, -420, -380, -560, -320, -420, -340, -420, -340, 0]);
    P([340, 0, 340, -380, 320, -380, 380, -520, 440, -380, 420, -380, 420, 0]);
    // wings
    P([-560, 0, -560, -220, -490, -300, -420, -220, -420, 0]);
    P([420, 0, 420, -200, 500, -280, 580, -200, 580, 0]);
    // chimneys & pinnacles
    ctx.fillRect(-260, -420, 22, 90); ctx.fillRect(220, -410, 22, 80);
    for (const px of [-300, -180, 180, 300]) P([px - 8, -300, px, -350, px + 8, -300]);
    // windows
    const lit = opt.lit ?? [];
    const win = (wx, wy, ww, wh, i) => {
      const on = lit.includes(i) || lit === 'all';
      ctx.beginPath();
      ctx.moveTo(wx - ww / 2, wy); ctx.lineTo(wx - ww / 2, wy - wh + ww / 2); ctx.quadraticCurveTo(wx - ww / 2, wy - wh, wx, wy - wh - ww * 0.25);
      ctx.quadraticCurveTo(wx + ww / 2, wy - wh, wx + ww / 2, wy - wh + ww / 2); ctx.lineTo(wx + ww / 2, wy); ctx.closePath();
      if (on) {
        const fl = 0.85 + 0.15 * noise1(t * 6 + i * 3);
        ctx.fillStyle = opt.litColor || '#ffb85a';
        ctx.globalAlpha = fl; ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.fillRect(wx - 1.5, wy - wh, 3, wh); ctx.fillRect(wx - ww / 2, wy - wh * 0.55, ww, 3);
      } else {
        ctx.fillStyle = opt.darkWin || '#141826'; ctx.fill();
      }
      ctx.fillStyle = col;
    };
    let wi = 0;
    for (const wx of [-240, -150, -60, 60, 150, 240]) win(wx, -40, 34, 90, wi++);
    for (const wx of [-240, -150, 150, 240]) win(wx, -180, 30, 80, wi++);
    win(0, -340, 40, 110, wi++); // tower window (index 10)
    win(-380, -260, 26, 70, wi++); win(380, -240, 26, 70, wi++);
    win(-490, -60, 26, 70, wi++); win(500, -60, 26, 70, wi++);
    // glow of lit windows
    ctx.restore();
  };
  // world position of manor window i (for adding glows) — matches the order above
  NM.manorWin = function (i) {
    const L = [[-240, -40, 34, 90], [-150, -40, 34, 90], [-60, -40, 34, 90], [60, -40, 34, 90], [150, -40, 34, 90], [240, -40, 34, 90],
      [-240, -180, 30, 80], [-150, -180, 30, 80], [150, -180, 30, 80], [240, -180, 30, 80], [0, -340, 40, 110], [-380, -260, 26, 70], [380, -240, 26, 70], [-490, -60, 26, 70], [500, -60, 26, 70]];
    const [x, y, w, h] = L[i];
    return { x, y: y - h / 2, w, h };
  };

  // ---------- pointed arch path ----------
  NM.archPath = function (ctx, x, y, w, h, pointK = 0.55) {
    // bottom-centre at x,y; total height h; springline at h - w*pointK
    const sh = h - w * pointK * 1.1;
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x - w / 2, y - sh);
    ctx.quadraticCurveTo(x - w / 2, y - h + w * 0.12, x, y - h);
    ctx.quadraticCurveTo(x + w / 2, y - h + w * 0.12, x + w / 2, y - sh);
    ctx.lineTo(x + w / 2, y);
  };

  // stained-glass gothic window (lancet) with crimson/blue panes
  NM.stainedWindow = function (ctx, x, y, w, h, t, opt = {}) {
    ctx.save();
    ctx.beginPath(); NM.archPath(ctx, x, y, w, h); ctx.closePath();
    ctx.fillStyle = opt.frame || C.ink; ctx.fill();
    ctx.beginPath(); NM.archPath(ctx, x, y - 10, w - 20, h - 22); ctx.closePath();
    ctx.save(); ctx.clip();
    const R = rng(opt.seed || 7);
    const cols = opt.colors || ['#7a0618', '#c4122f', '#1b2350', '#2b3a7a', '#5a0a2a', '#d8c9a0'];
    const cell = opt.cell || 26;
    const lum = opt.lum ?? 1;
    for (let yy = y - h; yy < y; yy += cell) for (let xx = x - w / 2; xx < x + w / 2; xx += cell * 0.8) {
      ctx.fillStyle = cols[Math.floor(R() * cols.length)];
      ctx.globalAlpha = lum * (0.55 + 0.45 * R());
      ctx.beginPath(); ctx.moveTo(xx + R() * 6, yy + R() * 6); ctx.lineTo(xx + cell * 0.8, yy + R() * 6); ctx.lineTo(xx + cell * 0.8 - R() * 6, yy + cell); ctx.lineTo(xx, yy + cell - R() * 6); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // lead lines
    ctx.strokeStyle = opt.frame || C.ink; ctx.lineWidth = 3;
    for (let yy = y - h; yy < y; yy += cell) { ctx.beginPath(); ctx.moveTo(x - w, yy + 3); ctx.lineTo(x + w, yy - 3); ctx.stroke(); }
    for (let xx = x - w / 2; xx < x + w / 2; xx += cell * 0.8) { ctx.beginPath(); ctx.moveTo(xx, y - h); ctx.lineTo(xx + 4, y); ctx.stroke(); }
    ctx.restore();
    // mullion + tracery circle
    ctx.fillStyle = opt.frame || C.ink;
    ctx.fillRect(x - 4, y - h * 0.62, 8, h * 0.62);
    ctx.lineWidth = 7; ctx.strokeStyle = opt.frame || C.ink;
    ctx.beginPath(); ctx.arc(x, y - h * 0.72, w * 0.22, 0, TAU); ctx.stroke();
    ctx.restore();
    if (opt.glow) glow(ctx, x, y - h / 2, h * 0.9, opt.glowColor || C.crimson, opt.glow);
  };

  // round rose window (radial tracery)
  NM.roseWindow = function (ctx, x, y, r, t, opt = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(opt.rot || 0);
    const n = opt.n || 12;
    const cols = opt.colors || ['#9a0a22', '#c4122f', '#5a0a2a', '#1b2350', '#e01a3c'];
    ctx.fillStyle = opt.frame || C.ink;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.08, 0, TAU); ctx.fill();
    for (let ring = 0; ring < 3; ring++) {
      const r0 = r * [0.18, 0.45, 0.75][ring], r1 = r * [0.42, 0.72, 1.0][ring];
      const m = n * (ring === 0 ? 0.5 : ring === 1 ? 1 : 2);
      for (let i = 0; i < m; i++) {
        const a0 = (i / m) * TAU + 0.02, a1 = ((i + 1) / m) * TAU - 0.02;
        ctx.beginPath(); ctx.arc(0, 0, r1 - 3, a0, a1); ctx.arc(0, 0, r0 + 3, a1, a0, true); ctx.closePath();
        ctx.fillStyle = cols[(i + ring * 2) % cols.length];
        ctx.globalAlpha = (opt.lum ?? 1) * (0.6 + 0.4 * hash2(i, ring + 3));
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = cols[1];
    ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, TAU); ctx.fill();
    ctx.restore();
    if (opt.glow) glow(ctx, x, y, r * 2.4, opt.glowColor || C.crimson, opt.glow);
  };

  // ---------- candles ----------
  NM.flame = function (ctx, x, y, fh, t, seed, opt = {}) {
    const fl = 1 + 0.18 * noise1(t * 9 + seed * 7) + 0.08 * noise1(t * 23 + seed);
    const sway = noise1(t * 3 + seed * 3) * fh * 0.18 + (opt.lean || 0) * fh;
    const h = fh * fl, w = fh * 0.32;
    const col = opt.color || C.candle;
    glow(ctx, x + sway * 0.5, y - h * 0.45, fh * (opt.glowR || 7), opt.glowColor || col, (opt.glowA ?? 0.5) * fl);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h * 0.15);
    ctx.bezierCurveTo(x - w / 2, y + h * 0.12, x + w / 2, y + h * 0.12, x + w / 2, y - h * 0.15);
    ctx.quadraticCurveTo(x + w * 0.35, y - h * 0.55, x + sway, y - h);
    ctx.quadraticCurveTo(x - w * 0.35, y - h * 0.55, x - w / 2, y - h * 0.15);
    const g = ctx.createLinearGradient(0, y, 0, y - h);
    g.addColorStop(0, opt.base || 'rgba(120,60,255,0.6)');
    g.addColorStop(0.25, col);
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + sway * 0.2, y - h * 0.22, w * 0.22, h * 0.22, 0, 0, TAU);
    ctx.fillStyle = 'rgba(255,250,230,0.85)'; ctx.fill();
    ctx.restore();
  };
  NM.candle = function (ctx, x, y, h, w, t, seed, opt = {}) {
    // body
    ctx.save();
    const wax = opt.wax || '#d9d0bf';
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, opt.waxShade || '#3a3530'); g.addColorStop(0.35, wax); g.addColorStop(1, opt.waxShade || '#2a2622');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + 4); ctx.quadraticCurveTo(x, y - h - 3, x + w / 2, y - h + 4); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
    // drips
    const R = rng(seed);
    for (let i = 0; i < 3; i++) {
      const dx = x - w / 2 + R() * w, dl = h * (0.08 + R() * 0.3);
      ctx.beginPath(); ctx.moveTo(dx - 2.5, y - h + 2); ctx.lineTo(dx - 2, y - h + dl); ctx.arc(dx, y - h + dl, 2.2, Math.PI, 0, true); ctx.lineTo(dx + 2.5, y - h + 2); ctx.fill();
    }
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y - h - w * 0.25); ctx.stroke();
    ctx.restore();
    if ((opt.lit ?? 1) > 0.02) {
      ctx.save(); ctx.globalAlpha = clamp(opt.lit ?? 1);
      NM.flame(ctx, x, y - h - w * 0.15, (opt.flameH || w * 1.6) * (opt.lit ?? 1), t, seed, opt);
      ctx.restore();
    }
  };

  // ---------- chain along a quadratic curve ----------
  // pts: [x0,y0, cx,cy, x1,y1]. link: link length. opt.glow -> crimson soul-chain
  NM.chain = function (ctx, pts, link, opt = {}) {
    // 3 points = quadratic curve (start, control, end); more = polyline
    const P = [];
    let L = 0;
    if (pts.length > 6) {
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const x = pts[i], y = pts[i + 1];
        if (P.length) L += Math.hypot(x - P[P.length - 1].x, y - P[P.length - 1].y);
        P.push({ x, y, L });
      }
    } else {
      const [x0, y0, cx, cy, x1, y1] = pts;
      for (let i = 0; i <= 80; i++) {
        const u = i / 80, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
        const x = a * x0 + b * cx + c * x1, y = a * y0 + b * cy + c * y1;
        if (i) L += Math.hypot(x - P[i - 1].x, y - P[i - 1].y);
        P.push({ x, y, L });
      }
    }
    const N = P.length - 1;
    const upto = L * clamp(opt.reveal ?? 1);
    const step = link * 0.78;
    const col = opt.color || '#2a2a30';
    const th = opt.thick || link * 0.16;
    let j = 0, k = 0;
    ctx.save();
    ctx.lineCap = 'round';
    if (opt.glow) { ctx.globalCompositeOperation = 'lighter'; }
    for (let s = (opt.offset || 0) % step; s < upto; s += step, k++) {
      while (j < N - 1 && P[j + 1].L < s) j++;
      const p0 = P[j], p1 = P[j + 1];
      const f = (s - p0.L) / Math.max(1e-6, p1.L - p0.L);
      const x = lerp(p0.x, p1.x, f), y = lerp(p0.y, p1.y, f);
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.strokeStyle = col; ctx.lineWidth = th;
      if (k % 2 === 0) { ctx.beginPath(); ctx.ellipse(0, 0, link / 2, link * 0.28, 0, 0, TAU); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(-link / 2, 0); ctx.lineTo(link / 2, 0); ctx.lineWidth = th * 1.5; ctx.stroke(); }
      if (opt.highlight) { ctx.strokeStyle = opt.highlight; ctx.lineWidth = th * 0.35; ctx.beginPath(); ctx.ellipse(0, -link * 0.06, link / 2.4, link * 0.18, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      ctx.restore();
      if (opt.glow && k % 3 === 0) glow(ctx, x, y, link * 2.4, opt.glowColor || C.crimson, opt.glow * 0.5);
    }
    ctx.restore();
    // return the endpoint of the revealed portion
    let e = P[P.length - 1];
    for (const p of P) if (p.L >= upto) { e = p; break; }
    return e;
  };

  // ---------- magic sigil ----------
  NM.sigil = function (ctx, x, y, r, t, prog = 1, opt = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, opt.squash ?? 1);
    ctx.rotate(opt.rot ?? t * 0.25);
    const col = opt.color || C.crimson;
    const P = clamp(prog);
    const passes = [[10, 0.18], [4, 0.5], [1.6, 1]];
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [lw, a] of passes) {
      ctx.lineWidth = lw * (opt.width || 1);
      ctx.strokeStyle = rgba(col, a * (opt.alpha ?? 1));
      // outer rings
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU * clamp(P * 2)); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, -TAU * clamp(P * 2 - 0.2), true); ctx.stroke();
      // star polygon (7/3 heptagram)
      const n = opt.points || 7, sk = opt.skip || 3;
      const sp = clamp(P * 1.6 - 0.35);
      if (sp > 0) {
        ctx.beginPath();
        const segs = n * sp;
        for (let i = 0; i <= Math.ceil(segs); i++) {
          const ii = Math.min(i, segs);
          const a0 = ((Math.floor(ii) * sk) / n) * TAU - Math.PI / 2;
          const a1 = (((Math.floor(ii) + 1) * sk) / n) * TAU - Math.PI / 2;
          const f = ii - Math.floor(ii);
          const px = lerp(Math.cos(a0), Math.cos(a1), f) * r * 0.88, py = lerp(Math.sin(a0), Math.sin(a1), f) * r * 0.88;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      const ip = clamp(P * 2 - 1);
      if (ip > 0) { ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, TAU * ip); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU * ip); ctx.stroke(); }
    }
    // runes around the ring
    const rp = clamp(P * 1.5 - 0.3);
    const nR = opt.runes || 24;
    ctx.lineWidth = 2 * (opt.width || 1);
    ctx.strokeStyle = rgba(col, 0.9 * (opt.alpha ?? 1));
    for (let i = 0; i < nR * rp; i++) {
      const a = (i / nR) * TAU;
      ctx.save(); ctx.rotate(a); ctx.translate(0, -r * 0.94);
      const s = r * 0.035;
      ctx.beginPath();
      const k = Math.floor(hash1(i * 13 + 5) * 5) + 2;
      for (let q = 0; q < k; q++) {
        const ax = (hash1(i * 31 + q) - 0.5) * 2 * s, ay = (hash1(i * 17 + q * 3) - 0.5) * 2 * s;
        const bx = (hash1(i * 7 + q * 11) - 0.5) * 2 * s, by = (hash1(i * 5 + q * 13) - 0.5) * 2 * s;
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    if (opt.glowA) glow(ctx, x, y, r * 2.2, col, opt.glowA);
  };

  // ---------- lightning ----------
  NM.bolt = function (ctx, x0, y0, x1, y1, seed, intensity = 1, opt = {}) {
    if (intensity <= 0.01) return;
    const R = rng(seed);
    const segs = [];
    function gen(ax, ay, bx, by, disp, depth, w) {
      if (depth === 0) { segs.push([ax, ay, bx, by, w]); return; }
      const mx = (ax + bx) / 2 + (R() - 0.5) * disp, my = (ay + by) / 2 + (R() - 0.5) * disp * 0.3;
      gen(ax, ay, mx, my, disp / 2, depth - 1, w);
      gen(mx, my, bx, by, disp / 2, depth - 1, w);
      if (depth >= 3 && R() < 0.35 * (opt.branch ?? 1)) {
        const ang = Math.atan2(by - ay, bx - ax) + (R() - 0.5) * 1.6;
        const len = Math.hypot(bx - ax, by - ay) * (0.4 + R() * 0.5);
        gen(mx, my, mx + Math.cos(ang) * len, my + Math.sin(ang) * len, disp / 2, depth - 2, w * 0.5);
      }
    }
    gen(x0, y0, x1, y1, Math.hypot(x1 - x0, y1 - y0) * 0.35, 7, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const col = opt.color || '#c9d4ff';
    const bw = opt.w ?? 1;
    for (const [lw0, a, c] of [[22, 0.08, col], [8, 0.25, col], [2.6, 0.95, '#ffffff']]) {
      const lw = Math.max(1, lw0 * bw);
      ctx.strokeStyle = c; ctx.globalAlpha = a * intensity;
      for (const [ax, ay, bx, by, w] of segs) { ctx.lineWidth = lw * w; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
    }
    ctx.restore();
  };
  // lightning envelope: list of strike times -> brightness at t
  NM.strikeAt = function (t, times, dur = 0.5) {
    let v = 0, seed = 0;
    for (let i = 0; i < times.length; i++) {
      const dt = t - times[i];
      if (dt >= 0 && dt < dur) {
        const k = (dt < 0.06 ? 1 : dt < 0.1 ? 0.35 : dt < 0.16 ? 0.9 : Math.exp(-(dt - 0.16) * 9)) ;
        if (k > v) { v = k; seed = i + 1; }
      }
    }
    return { v, seed };
  };

  // ---------- particles ----------
  // kinds: 'dot' (embers/dust), 'streak' (rain), 'petal', 'glow' (soul motes)
  NM.particles = function (ctx, t, o) {
    const n = o.n || 50, seed = o.seed || 1;
    const x0 = o.x ?? 0, y0 = o.y ?? 0, w = o.w ?? W, h = o.h ?? H;
    ctx.save();
    if (o.mode) ctx.globalCompositeOperation = o.mode;
    for (let i = 0; i < n; i++) {
      const r1 = hash2(i, seed), r2 = hash2(i, seed + 1), r3 = hash2(i, seed + 2), r4 = hash2(i, seed + 3);
      const sp = 0.6 + r3 * 0.8;
      let px = r1 * w + (o.vx || 0) * t * sp + (o.drift || 0) * noise1(t * 0.4 + i * 1.7);
      let py = r2 * h + (o.vy || 0) * t * sp + (o.driftY || 0) * noise1(t * 0.5 + i * 2.3 + 50);
      px = x0 + (((px % w) + w) % w);
      py = y0 + (((py % h) + h) % h);
      const size = lerp(o.size?.[0] ?? 1, o.size?.[1] ?? 3, r4);
      let a = (o.alpha ?? 1) * (0.4 + 0.6 * hash2(i, seed + 4));
      if (o.twinkle) a *= 0.5 + 0.5 * Math.sin(t * o.twinkle * (0.5 + r3) + i);
      if (o.fadeEdges) { const ey = (py - y0) / h; a *= Math.sin(Math.PI * ey); }
      if (a <= 0.01) continue;
      ctx.globalAlpha = clamp(a);
      if (o.kind === 'streak') {
        ctx.strokeStyle = o.color || '#9fb0d8'; ctx.lineWidth = size * 0.5;
        const len = o.len || 30;
        const ang = Math.atan2(o.vy || 1, o.vx || 0);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(ang) * len, py - Math.sin(ang) * len); ctx.stroke();
      } else if (o.kind === 'petal') {
        ctx.save(); ctx.translate(px, py); ctx.rotate(t * (1 + r3 * 2) + i); ctx.scale(1, 0.45 + 0.55 * Math.abs(Math.sin(t * 2 + i)));
        ctx.fillStyle = r4 > 0.5 ? C.rose : C.crimson;
        ctx.beginPath(); ctx.moveTo(0, -size); ctx.bezierCurveTo(size, -size, size, size * 0.6, 0, size); ctx.bezierCurveTo(-size, size * 0.6, -size, -size, 0, -size); ctx.fill();
        ctx.restore();
      } else if (o.kind === 'glow') {
        ctx.globalAlpha = 1;
        glow(ctx, px, py, size * 6, o.color || C.soul, a * 0.8);
        ctx.globalAlpha = clamp(a);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, size * 0.5, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = o.color || '#ffffff';
        ctx.beginPath(); ctx.arc(px, py, size, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  };

  // ---------- raven ----------
  NM.raven = function (ctx, x, y, s, flap, dir = 1, color = C.ink) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * dir, s);
    ctx.fillStyle = color;
    const wv = Math.sin(flap); // -1..1
    // body
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 7, -0.05, 0, TAU); ctx.fill();
    // head & beak
    ctx.beginPath(); ctx.arc(20, -3, 6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(24, -5); ctx.lineTo(36, -1); ctx.lineTo(24, 1); ctx.fill();
    // tail
    ctx.beginPath(); ctx.moveTo(-18, -3); ctx.lineTo(-36, -7); ctx.lineTo(-38, 3); ctx.lineTo(-18, 4); ctx.fill();
    // wings (far + near)
    for (const [k, off] of [[0.75, -2], [1, 2]]) {
      const tipY = -wv * 42 * k, midY = -wv * 18 * k;
      ctx.beginPath();
      ctx.moveTo(-6, off);
      ctx.quadraticCurveTo(-4, midY - 4, -14 + wv * 3, tipY);
      ctx.lineTo(-24, tipY + 6 * Math.sign(wv || 1));
      ctx.quadraticCurveTo(-8, midY + 6, 10, off);
      ctx.closePath();
      ctx.globalAlpha = k === 1 ? 1 : 0.85;
      ctx.fill();
    }
    ctx.restore();
  };
  // flock flying across: returns nothing, draws n birds
  NM.flock = function (ctx, t, seed, n, x0, y0, vx, s, color) {
    for (let i = 0; i < n; i++) {
      const r = rng(seed * 100 + i);
      const ox = (r() - 0.5) * 380, oy = (r() - 0.5) * 140;
      const bob = Math.sin(t * 2 + i) * 10;
      NM.raven(ctx, x0 + ox + vx * t, y0 + oy + bob, s * (0.6 + r() * 0.5), t * (9 + r() * 4) + i, Math.sign(vx) || 1, color);
    }
  };

  // ---------- rose ----------
  NM.rose = function (ctx, x, y, s, rot, opt = {}) {
    const wither = opt.wither || 0;
    const petal = opt.petal || C.rose;
    const deep = opt.deep || C.blood;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    if (opt.stem !== false) {
      ctx.strokeStyle = opt.stemColor || '#14180f'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(4, 50, -6, 90, 2, 140); ctx.stroke();
      ctx.fillStyle = opt.stemColor || '#14180f';
      for (const [ty, side] of [[40, 1], [75, -1], [105, 1]]) { ctx.beginPath(); ctx.moveTo(1, ty); ctx.lineTo(1 + side * 7, ty - 4); ctx.lineTo(1, ty + 3); ctx.fill(); }
      // leaves
      for (const [ty, side] of [[60, -1], [92, 1]]) {
        ctx.save(); ctx.translate(0, ty); ctx.rotate(side * (0.9 + wither * 0.6)); ctx.scale(side, 1);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(14, -12, 32, -2); ctx.quadraticCurveTo(14, 8, 0, 0); ctx.fill(); ctx.restore();
      }
    }
    // petals: outer ring then inner spiral
    const droop = wither * 0.5;
    const shade = (c, k) => c;
    ctx.save();
    ctx.rotate(droop * 0.4);
    const outer = 5;
    for (let i = 0; i < outer; i++) {
      const a = (i / outer) * TAU + 0.3;
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-16, -8 - droop * 6, -12, -30, 0, -28 + droop * 10); ctx.bezierCurveTo(12, -30, 16, -8 - droop * 6, 0, 0);
      const g = ctx.createRadialGradient(0, -6, 2, 0, -14, 26);
      g.addColorStop(0, deep); g.addColorStop(0.7, petal); g.addColorStop(1, deep);
      ctx.fillStyle = g; ctx.globalAlpha = 1 - wither * 0.3; ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, rr = 18 - i * 1.7;
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.arc(0, -rr * 0.25, rr, Math.PI * 1.05, Math.PI * 1.95);
      ctx.strokeStyle = i % 2 ? deep : '#3a0008'; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -rr * 0.25, rr - 1.5, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = petal; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.restore();
    if (wither > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = `rgba(20,8,8,${wither * 0.7})`; ctx.fillRect(-40, -40, 80, 190); }
    ctx.restore();
  };

  // ---------- coffin (hexagonal, top view or side) ----------
  NM.coffinPath = function (ctx, x, y, w, l, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-w * 0.32, -l / 2); ctx.lineTo(w * 0.32, -l / 2); ctx.lineTo(w / 2, -l * 0.22); ctx.lineTo(w * 0.3, l / 2); ctx.lineTo(-w * 0.3, l / 2); ctx.lineTo(-w / 2, -l * 0.22); ctx.closePath();
    ctx.restore();
  };

  // ---------- title ----------
  NM.title = function (ctx, text, x, y, size, t, k, opt = {}) {
    // k: 0..1 reveal
    if (k <= 0.001) return;
    ctx.save();
    ctx.font = `${size}px "UnifrakturMaguntia"`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const wTot = ctx.measureText(text).width;
    const letters = text.split('');
    let cx = x - wTot / 2;
    const glowA = opt.glow ?? 1;
    letters.forEach((ch, i) => {
      const cw = ctx.measureText(ch).width;
      const lk = clamp(k * (letters.length + 4) / 1 - i * 0.6, 0, 4) / 4; // staggered
      const a = clamp(lk);
      if (a > 0) {
        const jitter = (1 - a) * 16;
        ctx.save();
        ctx.translate(cx + cw / 2, y + jitter);
        ctx.globalAlpha = a * (opt.alpha ?? 1);
        ctx.shadowColor = opt.shadow || 'rgba(255,20,50,0.9)';
        ctx.shadowBlur = (opt.blur ?? 30) * glowA;
        ctx.fillStyle = opt.color || '#e8122f';
        ctx.fillText(ch, 0, 0);
        ctx.shadowBlur = 0;
        const g = ctx.createLinearGradient(0, -size * 0.7, 0, size * 0.1);
        g.addColorStop(0, opt.top || '#ff5a6e'); g.addColorStop(0.55, opt.color || '#c4122f'); g.addColorStop(1, opt.bottom || '#3a0008');
        ctx.fillStyle = g; ctx.fillText(ch, 0, 0);
        // blood drips
        if (opt.drips) {
          const dk = clamp(opt.drips);
          const nd = hash1(i * 7 + 3) > 0.45 ? 1 : 0;
          for (let d = 0; d < nd; d++) {
            const dx = (hash1(i * 13 + d) - 0.5) * cw * 0.5;
            const len = dk * size * (0.25 + hash1(i * 29 + d) * 0.6);
            ctx.fillStyle = '#9a0a1e';
            ctx.fillRect(dx - 2.5, -size * 0.04, 5, len);
            ctx.beginPath(); ctx.arc(dx, len - size * 0.04, 4.5, 0, TAU); ctx.fill();
          }
        }
        ctx.restore();
      }
      cx += cw;
    });
    ctx.restore();
  };
  NM.caption = function (ctx, text, x, y, size, alpha, opt = {}) {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.font = `${opt.weight || 400} ${size}px "${opt.font || 'Cinzel'}"`;
    ctx.textAlign = opt.align || 'center'; ctx.textBaseline = 'middle';
    if (opt.spacing) ctx.letterSpacing = opt.spacing + 'px';
    ctx.globalAlpha = clamp(alpha);
    ctx.shadowColor = opt.shadow || 'rgba(0,0,0,0.9)'; ctx.shadowBlur = opt.blur ?? 12;
    ctx.fillStyle = opt.color || '#e8e0d4';
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  // ---------- light shaft (god ray) ----------
  NM.shaft = function (ctx, x0, y0, w0, x1, y1, w1, color, alpha) {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0 - w0 / 2, y0); ctx.lineTo(x0 + w0 / 2, y0); ctx.lineTo(x1 + w1 / 2, y1); ctx.lineTo(x1 - w1 / 2, y1); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  // rain over the whole frame
  NM.rain = function (ctx, t, amt = 1, seed = 3, color = '#8d9cc4') {
    NM.particles(ctx, t, { n: Math.floor(260 * amt), seed, kind: 'streak', vx: -260, vy: 1700, len: 36, size: [1.4, 2.6], alpha: 0.32, color, x: -100, y: -100, w: W + 300, h: H + 200 });
  };

  // draw something into a temp layer, then flood it with one colour (silhouette)
  const silPool = [];
  let silDepth = 0;
  NM.silhouette = function (g, color, fn, rim) {
    const silC = silPool[silDepth] || (silPool[silDepth] = NM.layer());
    silDepth++;
    try {
      const s = NM.beginLayer(silC);
      s.save(); fn(s); s.restore();
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.globalCompositeOperation = 'source-in';
      s.fillStyle = color; s.fillRect(0, 0, silC.width, silC.height);
      s.globalCompositeOperation = 'source-over';
      const k = NM.PIXEL ? 1 / NM.RS : 1;
      if (rim) { g.save(); g.globalAlpha = rim.a ?? 1; g.drawImage(silC, Math.sign(rim.dx ?? -1) * k, Math.sign(rim.dy ?? 0) * k, W, H); g.restore(); }
      g.drawImage(silC, 0, 0, W, H);
    } finally { silDepth--; }
  };
})();
