// 2D styles. Each one paints the same projected scene (R2D) with its own
// palette, brush, background and post-processing.
window.STYLES2D = (() => {
  const { clamp, lerp, mix, hex, rgb, hash, rng, TAU, lum, scale, toHsl, fromHsl, noise2 } = U;
  const P = R2D.POST;

  // ---------------- shared helpers ----------------
  // Render the scene at any size with look L into a named scratch canvas.
  function renderScene(F, w, h, L, name = 'rs') {
    const [c, x] = R2D.scratch(name, w, h);
    const C = R2D.camera(F.S.cam, w, h);
    const F2 = { ...F, W: w, H: h, u: h / 720, C };
    F2.groups = R2D.buildGroups(F.S, C);
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    R2D.render(x, F2, L);
    return c;
  }
  const grayPal = (k = 1) => (c) => { const v = clamp((lum(c) - 0.5) * k + 0.5) * 255; return [v, v, v]; };
  const sepiaPal = (c) => { const v = lum(c); return [clamp(v * 1.07) * 255, clamp(v * 0.94) * 255, clamp(v * 0.76) * 255]; };
  const snap = (pal) => { const P = pal.map((x) => (typeof x === 'string' ? hex(x) : x)); return (c) => U.nearest(c, P); };
  const sat = (k, l = 0) => (c) => { const h = toHsl(c); return fromHsl([h[0], clamp(h[1] * k), clamp(h[2] + l)]); };
  function quantize(data, pal, dither = 0, w = 0) {
    const P = pal.map((x) => (typeof x === 'string' ? hex(x) : x));
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      let c = [data[i], data[i + 1], data[i + 2]];
      if (dither) {
        const x = j % w, y = (j / w) | 0;
        const b = R2D.BAYER[(y & 3) * 4 + (x & 3)] * dither;
        c = [c[0] + b, c[1] + b, c[2] + b];
      }
      const q = U.nearest(c, P);
      data[i] = q[0]; data[i + 1] = q[1]; data[i + 2] = q[2];
    }
  }
  function text(ctx, F, str, x, y, size, opts = {}) {
    ctx.save();
    ctx.font = `${opts.weight || ''} ${Math.round(size * F.u)}px ${opts.font || "'Luckiest Guy', sans-serif"}`;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.base || 'alphabetic';
    if (opts.rot) { ctx.translate(x * F.W, y * F.H); ctx.rotate(opts.rot); x = 0; y = 0; }
    const X = opts.rot ? 0 : x * F.W, Y = opts.rot ? 0 : y * F.H;
    if (opts.stroke) { ctx.lineWidth = (opts.sw || 4) * F.u; ctx.strokeStyle = opts.stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, X, Y); }
    ctx.fillStyle = opts.fill || '#000';
    ctx.fillText(str, X, Y);
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Procedural textures cached per size.
  const texCache = {};
  function cachedTex(key, w, h, fn) {
    const k = key + w + 'x' + h;
    if (!texCache[k]) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      fn(c.getContext('2d'), w, h);
      texCache[k] = c;
    }
    return texCache[k];
  }
  function bricks(ctx, F, base = [120, 52, 40], mortar = [60, 40, 38]) {
    const t = cachedTex('bricks' + base, F.W, F.H, (x, W, H) => {
      const u = H / 720, bw = 64 * u, bh = 28 * u;
      x.fillStyle = rgb(mortar); x.fillRect(0, 0, W, H);
      const R = rng(7);
      for (let r = 0; r * bh < H + bh; r++)
        for (let c = -1; c * bw < W + bw; c++) {
          const ox = (r % 2) * bw / 2;
          const k = 0.8 + 0.35 * R();
          x.fillStyle = rgb(scale(base, k));
          x.fillRect(c * bw + ox + 2 * u, r * bh + 2 * u, bw - 4 * u, bh - 4 * u);
        }
      R2D.overlayTex(x, R2D.paperTex(), 'overlay', 0.5, 2 * u);
    });
    ctx.drawImage(t, 0, 0);
  }
  function paperBg(ctx, F, col = [244, 238, 224]) {
    ctx.fillStyle = rgb(col); ctx.fillRect(0, 0, F.W, F.H);
  }

  // ---------------- painters ----------------
  // Crayon/pastel: clipped parallel scribbles + wobbly outline.
  const scribble = (o = {}) => (ctx, sh, col, F, L, gi, si) => {
    const u = F.u, seed = gi * 131 + si * 7 + (o.boil === false ? 0 : F.hold);
    const R = rng(seed + 1);
    for (const poly of R2D.shapePolys(sh)) {
      const path = R2D.polyPath(poly, (o.wob ?? 1.6) * u, seed, F);
      const [x0, y0, x1, y1] = sh.bb;
      const r = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
      if (r > 1.5) {
        ctx.save(); ctx.clip(path);
        if (o.base) { ctx.fillStyle = rgb(col, o.base); ctx.fill(path); }
        ctx.translate((x0 + x1) / 2, (y0 + y1) / 2); ctx.rotate(o.angle ?? R() * Math.PI);
        ctx.strokeStyle = rgb(col, o.alpha ?? 0.85); ctx.lineWidth = (o.lw ?? 3.2) * u;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const gap = (o.gap ?? 4.2) * u;
        for (let y = -r; y < r; y += gap) { ctx.moveTo(-r, y + (R() - 0.5) * 2 * u); ctx.lineTo(r, y + (R() - 0.5) * 2 * u); }
        ctx.stroke();
        ctx.restore();
      }
      if (o.outline !== false) {
        ctx.strokeStyle = o.lcSame ? rgb(col, o.la ?? 1) : o.lc ? rgb(o.lc, o.la ?? 1) : rgb(scale(col, 0.55), o.la ?? 1);
        ctx.lineWidth = (sh.deco ? 0.6 : 1) * (o.olw ?? 2.6) * u;
        ctx.lineJoin = 'round';
        ctx.stroke(R2D.polyPath(poly, (o.wob ?? 1.6) * 1.5 * u, seed + 1, F));
        if (o.passes > 1) ctx.stroke(R2D.polyPath(poly, (o.wob ?? 1.6) * 2 * u, seed + 2, F));
      }
    }
  };
  // Hatching by darkness (engraving / pencil).
  const hatch = (o = {}) => (ctx, sh, col, F, L, gi, si) => {
    const u = F.u, l = lum(col);
    const seed = gi * 71 + si * 3 + (o.boil ? F.hold : 0);
    for (const poly of R2D.shapePolys(sh)) {
      const path = R2D.polyPath(poly, (o.wob || 0) * u, seed, F);
      if (o.fill) { ctx.fillStyle = rgb(o.fill(col)); ctx.fill(path); }
      const dens = 1 - l;
      if (dens > 0.12 && sh.bb) {
        ctx.save(); ctx.clip(path);
        const [x0, y0, x1, y1] = sh.bb;
        const r = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
        ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
        ctx.strokeStyle = o.ink || 'rgba(40,36,34,0.85)';
        const sp = lerp(o.maxGap ?? 9, o.minGap ?? 2.6, dens) * u;
        const passes = dens > 0.62 ? 2 : 1;
        for (let k = 0; k < passes; k++) {
          ctx.rotate(k ? Math.PI / 2.4 : (o.angle ?? -0.7));
          ctx.lineWidth = (o.lw ?? 0.9) * u * (0.7 + dens * 0.8);
          ctx.beginPath();
          for (let y = -r; y < r; y += sp) { ctx.moveTo(-r, y); ctx.lineTo(r, y); }
          ctx.stroke();
        }
        ctx.restore();
      }
      if (o.outline !== false) {
        ctx.strokeStyle = o.line || 'rgba(30,26,24,0.9)';
        ctx.lineWidth = (sh.deco ? 0.7 : 1) * (o.olw ?? 1.4) * u;
        ctx.lineJoin = 'round';
        ctx.stroke(path);
        if (o.sketchy) for (let k = 1; k <= o.sketchy; k++) ctx.stroke(R2D.polyPath(poly, 1.6 * u * k, seed + k * 11, F));
      }
    }
  };
  // Watercolor: translucent jittered washes with darker pooled edges.
  const wash = (o = {}) => (ctx, sh, col, F, L, gi, si) => {
    const u = F.u, seed = gi * 31 + si;
    for (const poly of R2D.shapePolys(sh)) {
      for (let k = 0; k < (o.passes ?? 3); k++) {
        const path = R2D.polyPath(poly, (o.wob ?? 2.4) * u, seed + k * 17, F);
        ctx.fillStyle = rgb(col, o.alpha ?? 0.42);
        ctx.fill(path);
        if (k === 0) { ctx.strokeStyle = rgb(scale(col, o.edge ?? 0.72), 0.38); ctx.lineWidth = (o.elw ?? 1.6) * u; ctx.stroke(path); }
      }
    }
  };
  // Neon tubes: dark fill, glowing colored outline.
  const neonTube = (o = {}) => (ctx, sh, col, F, L, gi, si) => {
    const u = F.u;
    const h = toHsl(col);
    const nc = o.color ? o.color(col, sh) : fromHsl([h[0], 1, 0.6]);
    for (const poly of R2D.shapePolys(sh)) {
      const path = R2D.polyPath(poly, (o.wob || 0) * u, F.hold + gi, F);
      if (o.fill !== false) { ctx.fillStyle = rgb(o.fill ? o.fill(col) : scale(col, 0.12), o.fa ?? 1); ctx.fill(path); }
      ctx.save();
      ctx.shadowColor = rgb(nc); ctx.shadowBlur = (o.blur ?? 14) * u;
      ctx.strokeStyle = rgb(nc); ctx.lineWidth = (sh.deco ? 0.6 : 1) * (o.lw ?? 2.6) * u; ctx.lineJoin = 'round';
      ctx.stroke(path);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgb(mix(nc, [255, 255, 255], 0.65)); ctx.lineWidth = (sh.deco ? 0.4 : 1) * (o.core ?? 1.0) * u;
      ctx.stroke(path);
      ctx.restore();
    }
  };

  // Sample a canvas on a grid: returns {data, w, h}.
  const sample = (src, w, h) => {
    const [c, x] = R2D.scratch('smp', w, h);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, w, h);
    return { data: x.getImageData(0, 0, w, h).data, w, h };
  };
  // Full-resolution base render (flat cartoon) for image-based styles.
  const base = (F, L = { lw: 2.2 }, name = 'base') => renderScene(F, F.W, F.H, L, name);

  // Film damage for old-movie looks.
  function filmDamage(ctx, F, amt = 1) {
    const { W, H, u, hold } = F;
    const R = rng(hold * 7919 + 3);
    ctx.save();
    const n = Math.floor(R() * 3 * amt);
    for (let i = 0; i < n; i++) {
      ctx.strokeStyle = R() < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = (0.6 + R()) * u;
      const x = R() * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (R() - 0.5) * 20 * u, H); ctx.stroke();
    }
    for (let i = 0; i < 14 * amt; i++) {
      ctx.fillStyle = R() < 0.7 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(R() * W, R() * H, (0.6 + R() * 2.2) * u, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function flicker(ctx, F, amt = 0.08) {
    const k = (hash(F.hold, 77) - 0.5) * 2 * amt;
    ctx.fillStyle = k > 0 ? `rgba(255,255,255,${k})` : `rgba(0,0,0,${-k})`;
    ctx.fillRect(0, 0, F.W, F.H);
  }

  const S = {};

  // ======================= the styles =======================
  S.cartoon = { name: 'Classic Cartoon', cat: '2D', draw: (ctx, F) => R2D.render(ctx, F, { lw: 3.2, pal: sat(1.08) }) };

  S.watercolor = {
    name: 'Watercolor', cat: 'ART',
    draw(ctx, F) {
      const pal = (c, role) => mix(sat(1.15)(c), [252, 248, 236], role === 'sky' || role === 'cloud' ? 0.18 : role === 'ground' ? 0.12 : 0.02);
      R2D.render(ctx, F, { lw: 0, painter: wash({ alpha: 0.5 }), pal, stripes: false, fxLw: 0, titleStroke: false, sunGlow: false, groundShadows: true, shadowCol: 'rgba(60,70,120,0.18)' });
      P.filter(ctx, F, 'blur(0.7px) saturate(1.1)');
      P.paper(ctx, F, 0.45);
      const g = ctx.createRadialGradient(F.W / 2, F.H / 2, F.H * 0.72, F.W / 2, F.H / 2, F.H * 1.1);
      g.addColorStop(0, 'rgba(252,249,240,0)'); g.addColorStop(1, 'rgba(252,249,240,0.6)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, F.W, F.H);
    },
  };

  const NES = ['#000000', '#FCFCFC', '#BCBCBC', '#7C7C7C', '#A4E4FC', '#3CBCFC', '#0078F8', '#0000FC', '#B8B8F8', '#6888FC', '#0058F8',
    '#D8B8F8', '#9878F8', '#6844FC', '#F8B8F8', '#F878F8', '#D800CC', '#F8A4C0', '#F85898', '#E40058', '#F0D0B0', '#F87858', '#F83800',
    '#FCE0A8', '#FCA044', '#E45C10', '#F8D878', '#F8B800', '#AC7C00', '#D8F878', '#B8F818', '#00B800', '#B8F8B8', '#58D854', '#00A800',
    '#B8F8D8', '#58F898', '#00A844', '#00FCFC', '#00E8D8', '#008888', '#503000', '#881400', '#A81000', '#005800', '#004058'];
  S.nes = {
    name: '8-Bit Pixel Art', cat: 'RETRO',
    draw(ctx, F) {
      const w = 256, h = 144;
      const c = renderScene(F, w, h, { lw: 5, lc: [0, 0, 0], decoLw: 0.8, haze: false, sunGlow: false, titleFont: "'Press Start 2P', monospace", fxLw: 5 });
      const x = c.getContext('2d');
      const id = x.getImageData(0, 0, w, h);
      quantize(id.data, NES);
      x.putImageData(id, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, F.W, F.H); ctx.restore();
    },
  };

  S.papercut = {
    name: 'Paper Cut-Out Stop-Motion', cat: 'STOP-MOTION', fps: 8,
    draw(ctx, F) {
      R2D.render(ctx, F, { lw: 0, fill: 'flat', sky: 'flat', dropShadow: { dx: 3, dy: 5, blur: 7, col: 'rgba(50,30,10,0.4)' }, jitter: 2.6, wobble: 1.3, wobbleFixed: true,
        haze: false, sunGlow: false, fxLw: 0, pal: (c) => mix(sat(0.9)(c), [255, 248, 230], 0.08), shadowCol: 'rgba(60,40,20,0.25)' });
      P.paper(ctx, F, 0.42);
      P.vignette(ctx, F, 0.25, '60,40,20');
    },
  };

  S.rubberhose = {
    name: '1930s Rubber Hose', cat: '2D', fps: 12,
    draw(ctx, F) {
      const R = rng(F.hold * 31 + 1);
      ctx.save();
      ctx.translate((R() - 0.5) * 3 * F.u, (R() - 0.5) * 3 * F.u);
      R2D.render(ctx, F, { lw: 4.2, lc: [8, 8, 8], pal: grayPal(1.25), jitter: 0.6, sunGlow: false, raysA: 0.2 });
      ctx.restore();
      P.grain(ctx, F, 0.35);
      flicker(ctx, F, 0.07);
      filmDamage(ctx, F, 1);
      P.vignette(ctx, F, 0.75);
    },
  };

  S.crayon = {
    name: "Kid's Crayon Drawing", cat: '2D', fps: 8,
    draw(ctx, F) {
      const { W, H, u } = F;
      const L = {
        painter: scribble({ lw: 3.4, gap: 4.6, olw: 2.8 }), fxLw: 2.5, titleFont: "'Permanent Marker', sans-serif", raysA: 0.15,
        bg(ctx, F) {
          paperBg(ctx, F, [252, 252, 248]);
          const R = rng(F.hold * 3 + 5);
          const hy = R2D.horizonY(F.C);
          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(70,140,230,0.75)'; ctx.lineWidth = 5 * u;
          for (let y = 0; y < Math.min(hy, H * 0.3); y += 7 * u) { ctx.beginPath(); ctx.moveTo(-10, y + R() * 4 * u); ctx.lineTo(W + 10, y + R() * 6 * u); ctx.stroke(); }
          ctx.strokeStyle = 'rgba(70,170,60,0.85)';
          for (let y = hy; y < H; y += 7 * u) { ctx.beginPath(); ctx.moveTo(-10, y + R() * 4 * u); ctx.lineTo(W + 10, y + R() * 6 * u); ctx.stroke(); }
          // the classic corner sun
          ctx.strokeStyle = '#F2B705'; ctx.fillStyle = 'rgba(250,200,20,0.9)'; ctx.lineWidth = 4 * u;
          ctx.beginPath(); ctx.arc(W - 70 * u, 60 * u, 40 * u, 0, TAU); ctx.fill(); ctx.stroke();
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU + F.hold * 0.1;
            ctx.beginPath(); ctx.moveTo(W - 70 * u + Math.cos(a) * 50 * u, 60 * u + Math.sin(a) * 50 * u);
            ctx.lineTo(W - 70 * u + Math.cos(a) * 72 * u, 60 * u + Math.sin(a) * 72 * u); ctx.stroke();
          }
          // pond scribble
          R2D.drawShadows(ctx, F, { shadowCol: 'rgba(0,0,0,0.08)' });
        },
        groundShadows: false,
      };
      R2D.render(ctx, F, L);
      P.paper(ctx, F, 0.35);
    },
  };

  const UKI = ['#F1E5C9', '#E6D2A8', '#1E3557', '#33597A', '#7FA4B6', '#C5543B', '#A3392A', '#E0A153', '#7D8C59', '#4C6A3E', '#2A2522', '#B9A27A', '#D8C49B'];
  S.ukiyoe = {
    name: 'Ukiyo-e Woodblock', cat: 'ART',
    draw(ctx, F) {
      const { W, H, u } = F;
      const sn = snap(UKI);
      R2D.render(ctx, F, {
        lw: 2.6, lc: [38, 32, 36], pal: (c, role) => (role === 'sky' ? mix(sn(c), hex('#F1E5C9'), 0.35) : sn(c)), stripes: false, haze: false, sunGlow: false, raysA: 0.15,
        afterBg(ctx, F) {
          const g = ctx.createLinearGradient(0, 0, 0, H * 0.4);
          g.addColorStop(0, 'rgba(30,53,87,0.95)'); g.addColorStop(1, 'rgba(30,53,87,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.4);
        },
      });
      // wood grain + paper
      R2D.overlayTex(ctx, R2D.noiseTex('woodgrain', 256, 64, (i, j, R) => { const v = 128 + 30 * Math.sin(j * 0.9 + 3 * noise2(i * 0.02, j * 0.1, 3)) + 10 * R(); return [v, v, v, 255]; }), 'overlay', 0.25, 2.5 * u);
      P.paper(ctx, F, 0.35);
      // red seal stamp with "turtle"
      ctx.save();
      ctx.fillStyle = 'rgba(178,42,32,0.9)';
      roundRect(ctx, W - 92 * u, H - 210 * u, 58 * u, 58 * u, 6 * u); ctx.fill();
      ctx.fillStyle = 'rgba(241,229,201,0.95)';
      ctx.font = `${Math.round(40 * u)}px 'IPAGothic', 'WenQuanYi Zen Hei', 'Noto Sans CJK JP', serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('亀', W - 63 * u, H - 180 * u);
      ctx.restore();
    },
  };

  S.cctv = {
    name: 'Security Camera', cat: 'OTHER', fps: 15,
    draw(ctx, F) {
      const { W, H, u } = F;
      const c = renderScene(F, Math.round(W / 2.2), Math.round(H / 2.2), { lw: 1.6, fill: 'flat', sunGlow: false });
      ctx.save(); ctx.filter = 'grayscale(1) contrast(1.25) brightness(1.05) blur(0.8px)'; ctx.drawImage(c, 0, 0, W, H); ctx.restore();
      ctx.fillStyle = 'rgba(40,90,60,0.18)'; ctx.fillRect(0, 0, W, H);
      P.grain(ctx, F, 0.45);
      P.scanlines(ctx, F, 0.18, 3);
      P.vignette(ctx, F, 0.65);
      const t = 41 * 60 + 7 + Math.floor(F.tReal);
      const hh = String(9).padStart(2, '0'), mm = String(Math.floor(t / 60) % 60).padStart(2, '0'), ss = String(t % 60).padStart(2, '0');
      text(ctx, F, `CAM 04  SOUTH LAWN`, 0.04, 0.12, 16, { font: "'DejaVu Sans Mono', monospace", fill: '#E8F0E8', weight: 'bold' });
      text(ctx, F, `2026-10-18  ${hh}:${mm}:${ss}`, 0.96, 0.12, 16, { font: "'DejaVu Sans Mono', monospace", fill: '#E8F0E8', align: 'right', weight: 'bold' });
      if (F.hold % 15 < 9) { ctx.fillStyle = '#FF3030'; ctx.beginPath(); ctx.arc(0.05 * W, 0.2 * H, 7 * u, 0, TAU); ctx.fill(); text(ctx, F, 'REC', 0.065, 0.213, 15, { font: "'DejaVu Sans Mono', monospace", fill: '#FF5050', weight: 'bold' }); }
    },
  };

  function benDay(ctx, F, alpha = 0.22, col = '30,30,90') {
    const t = cachedTex('benday' + col, 12, 12, (x) => { x.fillStyle = `rgba(${col},1)`; x.beginPath(); x.arc(3, 3, 1.8, 0, TAU); x.arc(9, 9, 1.8, 0, TAU); x.fill(); });
    R2D.overlayTex(ctx, t, 'multiply', alpha, F.u * 1.1);
  }
  S.comic = {
    name: 'Comic Book', cat: '2D',
    draw(ctx, F) {
      const { W, H, u } = F;
      R2D.render(ctx, F, { lw: 4.6, fill: 'cel', pal: sat(1.35, 0.02), haze: false });
      benDay(ctx, F, 0.2);
      // caption box + panel border
      ctx.save();
      ctx.fillStyle = '#FFF2A8'; ctx.strokeStyle = '#111'; ctx.lineWidth = 4 * u;
      ctx.fillRect(24 * u, 56 * u, 440 * u, 52 * u); ctx.strokeRect(24 * u, 56 * u, 440 * u, 52 * u);
      ctx.restore();
      text(ctx, F, 'MEANWHILE, ON THE SOUTH LAWN...', 0.03, 0.125, 21, { fill: '#111' });
      ctx.lineWidth = 12 * u; ctx.strokeStyle = '#111'; ctx.strokeRect(0, 0, W, H);
    },
  };

  S.sketch = {
    name: 'Pencil Sketch', cat: 'ART', fps: 12,
    draw(ctx, F) {
      const { W, H, u } = F;
      R2D.render(ctx, F, {
        painter: hatch({ ink: 'rgba(60,58,62,0.55)', line: 'rgba(40,38,42,0.8)', olw: 1.2, sketchy: 2, boil: true, wob: 0.8 }),
        bg(ctx, F) {
          paperBg(ctx, F, [246, 243, 234]);
          const hy = R2D.horizonY(F.C);
          ctx.strokeStyle = 'rgba(60,58,62,0.35)'; ctx.lineWidth = 1 * u;
          const R = rng(F.hold);
          for (let i = 0; i < 26; i++) { const y = hy + (i / 26) ** 1.6 * (H - hy); ctx.beginPath(); ctx.moveTo(R() * W * 0.3, y); ctx.lineTo(W - R() * W * 0.3, y + (R() - 0.5) * 4 * u); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
        },
        fxLw: 1.6, pal: (c) => c, fxLine: true, titleFont: "'Permanent Marker', sans-serif", raysA: 0.1,
      });
      P.paper(ctx, F, 0.4);
    },
  };

  // Stained glass: saturated panes, thick leading and a Voronoi lattice.
  let vor = null;
  function voronoiCells(W, H, n, seed) {
    if (vor && vor.W === W && vor.H === H && vor.n === n) return vor.cells;
    const R = rng(seed);
    const cols = Math.round(Math.sqrt(n * W / H)), rows = Math.round(n / cols);
    const pts = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
      pts.push([(i + 0.15 + 0.7 * R()) * W / cols, (j + 0.15 + 0.7 * R()) * H / rows]);
    const cells = pts.map((p, idx) => {
      let poly = [[-10, -10], [W + 10, -10], [W + 10, H + 10], [-10, H + 10]];
      for (let k = 0; k < pts.length; k++) {
        if (k === idx) continue;
        const q = pts[k];
        if (Math.abs(q[0] - p[0]) > 3 * W / cols || Math.abs(q[1] - p[1]) > 3 * H / rows) continue;
        const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], nrm = [q[0] - p[0], q[1] - p[1]];
        const out = [];
        for (let a = 0; a < poly.length; a++) {
          const A = poly[a], B = poly[(a + 1) % poly.length];
          const da = (A[0] - m[0]) * nrm[0] + (A[1] - m[1]) * nrm[1], db = (B[0] - m[0]) * nrm[0] + (B[1] - m[1]) * nrm[1];
          if (da <= 0) out.push(A);
          if ((da < 0) !== (db < 0)) { const t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
        }
        poly = out;
      }
      return { p, poly };
    });
    vor = { W, H, n, cells };
    return cells;
  }
  S.stainedglass = {
    name: 'Stained Glass', cat: 'ART',
    draw(ctx, F) {
      const { W, H, u } = F;
      R2D.render(ctx, F, { lw: 6, lc: [22, 20, 24], pal: sat(1.5, 0.04), sunGlow: false, haze: false, stripes: false, fxLw: 5 });
      const cells = voronoiCells(W, H, 150, 11);
      ctx.save();
      for (const c of cells) {
        const r = hash(c.p[0] | 0, c.p[1] | 0);
        ctx.beginPath(); c.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
        ctx.fillStyle = r > 0.5 ? `rgba(255,255,255,${(r - 0.5) * 0.3})` : `rgba(0,0,0,${(0.5 - r) * 0.3})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(25,22,26,0.85)'; ctx.lineWidth = 2.6 * u; ctx.stroke();
      }
      ctx.restore();
      P.glow(ctx, F, 10, 0.35);
      ctx.lineWidth = 16 * u; ctx.strokeStyle = '#1A181C'; ctx.strokeRect(0, 0, W, H);
    },
  };

  S.ascii = {
    name: 'ASCII Art', cat: 'RETRO',
    draw(ctx, F) {
      const { W, H, u } = F;
      const cols = 132, rows = 50;
      const src = renderScene(F, cols * 4, rows * 6, { lw: 6, haze: false });
      const { data } = sample(src, cols, rows);
      ctx.fillStyle = '#05080A'; ctx.fillRect(0, 0, W, H);
      const ramp = ' .,:;-=+*%#@';
      const cw = W / cols, ch = H / rows;
      ctx.font = `bold ${Math.round(ch * 1.05)}px 'DejaVu Sans Mono', monospace`;
      ctx.textBaseline = 'top';
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const o = (j * cols + i) * 4;
        const c = [data[o], data[o + 1], data[o + 2]];
        const l = lum(c);
        const chr = ramp[Math.min(ramp.length - 1, Math.floor(l * ramp.length))];
        ctx.fillStyle = rgb(scale(c, 0.32));
        ctx.fillRect(i * cw, j * ch, cw + 0.5, ch + 0.5);
        if (chr === ' ') continue;
        ctx.fillStyle = rgb(sat(1.4, 0.12)(c));
        ctx.fillText(chr, i * cw, j * ch);
      }
      P.scanlines(ctx, F, 0.12, 3);
    },
  };

  // Oil painting: short strokes that follow edges, sampled from a flat render.
  function strokes(ctx, F, src, o) {
    const { W, H, u } = F;
    const gw = o.gw, gh = Math.round(gw * H / W);
    const { data } = sample(src, gw, gh);
    const L = (i, j) => { i = clamp(i, 0, gw - 1); j = clamp(j, 0, gh - 1); const k = (j * gw + i) * 4; return data[k] * 0.3 + data[k + 1] * 0.59 + data[k + 2] * 0.11; };
    const R = rng(o.seed ?? F.hold * 13 + 1);
    ctx.lineCap = 'round';
    for (let n = 0; n < o.count; n++) {
      const fx = R() * gw, fy = R() * gh;
      const i = fx | 0, j = fy | 0;
      const k = (j * gw + i) * 4;
      let c = [data[k], data[k + 1], data[k + 2]];
      const gx = L(i + 1, j) - L(i - 1, j), gy = L(i, j + 1) - L(i, j - 1);
      let a = Math.atan2(gy, gx) + Math.PI / 2;
      if (Math.hypot(gx, gy) < 6) a = o.flow ? o.flow(fx / gw, fy / gh) : (o.angle ?? 0.3) + (R() - 0.5) * 0.6;
      if (o.jitterCol) { const h = toHsl(c); c = fromHsl([h[0] + (R() - 0.5) * o.jitterCol, clamp(h[1] * (o.satK ?? 1.1)), clamp(h[2] + (R() - 0.5) * 0.1)]); }
      const len = (o.len[0] + R() * o.len[1]) * u, wd = (o.w[0] + R() * o.w[1]) * u;
      const x = fx * W / gw, y = fy * H / gh;
      const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
      ctx.strokeStyle = rgb(c, o.alpha ?? 1); ctx.lineWidth = wd;
      ctx.beginPath(); ctx.moveTo(x - dx, y - dy);
      if (o.curve) { const a2 = a + o.curve * (R() - 0.5); ctx.quadraticCurveTo(x, y, x + Math.cos(a2) * len / 2, y + Math.sin(a2) * len / 2); }
      else ctx.lineTo(x + dx, y + dy);
      ctx.stroke();
      if (o.impasto) {
        ctx.strokeStyle = rgb(mix(c, [255, 255, 255], 0.35), 0.35); ctx.lineWidth = wd * 0.3;
        ctx.beginPath(); ctx.moveTo(x - dx - wd * 0.15, y - dy - wd * 0.15); ctx.lineTo(x + dx - wd * 0.15, y + dy - wd * 0.15); ctx.stroke();
      }
      if (o.outline) {
        ctx.strokeStyle = rgb(scale(c, 0.55), 0.5); ctx.lineWidth = 0.8 * u;
        ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
      }
    }
  }
  S.oil = {
    name: 'Oil Painting', cat: 'ART', fps: 10,
    draw(ctx, F) {
      const src = base(F, { lw: 1.2, lc: 'darker', fill: 'shade', sunGlow: true, raysA: 0.2 });
      ctx.drawImage(src, 0, 0);
      strokes(ctx, F, src, { gw: 320, count: 9000, len: [10, 14], w: [5, 5], impasto: true, jitterCol: 0.04, satK: 1.15 });
      P.weave(ctx, F, 0.28);
      P.vignette(ctx, F, 0.35, '40,25,10');
    },
  };

  const THREAD = ['#FFFFFF', '#F2E6C8', '#1B1B1B', '#4A4A4A', '#9A9A9A', '#E8C25A', '#F7DB6A', '#E3A15A', '#F2A766', '#C8312E', '#E25A4A',
    '#1F3060', '#3858A8', '#6FA8DC', '#A8D0F0', '#2E7D32', '#4CAF50', '#8BC34A', '#C5E1A5', '#6D4C41', '#A1887F', '#F48FB1', '#7E57C2'];
  S.crossstitch = {
    name: 'Cross-Stitch', cat: 'CRAFT',
    draw(ctx, F) {
      const { W, H, u } = F;
      const cols = 112, rows = 63;
      const src = renderScene(F, cols * 4, rows * 4, { lw: 7, haze: false, sunGlow: false });
      const { data } = sample(src, cols, rows);
      quantize(data, THREAD);
      const cw = W / cols, ch = H / rows;
      // aida cloth
      ctx.fillStyle = '#F4EEDF'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(160,140,110,0.35)';
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) ctx.fillRect(i * cw - 1 * u, j * ch - 1 * u, 2 * u, 2 * u);
      ctx.lineCap = 'round';
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const o = (j * cols + i) * 4;
        const c = [data[o], data[o + 1], data[o + 2]];
        const x = i * cw, y = j * ch, m = cw * 0.16;
        ctx.strokeStyle = rgb(scale(c, 0.8)); ctx.lineWidth = cw * 0.34;
        ctx.beginPath(); ctx.moveTo(x + m, y + m); ctx.lineTo(x + cw - m, y + ch - m); ctx.stroke();
        ctx.strokeStyle = rgb(c);
        ctx.beginPath(); ctx.moveTo(x + cw - m, y + m); ctx.lineTo(x + m, y + ch - m); ctx.stroke();
        ctx.strokeStyle = rgb(mix(c, [255, 255, 255], 0.4), 0.5); ctx.lineWidth = cw * 0.1;
        ctx.beginPath(); ctx.moveTo(x + cw - m * 1.6, y + m * 1.3); ctx.lineTo(x + m * 2, y + ch * 0.55); ctx.stroke();
      }
      P.vignette(ctx, F, 0.25, '90,70,40');
    },
  };

  S.epicanime = {
    name: 'Epic Anime', cat: '2D',
    draw(ctx, F) {
      const { W, H, u, S: Sc, C } = F;
      R2D.render(ctx, F, {
        lw: 3.4, fill: 'cel', pal: sat(1.3, 0.03), raysA: 0.18,
        afterBg(ctx, F) {
          // dramatic radial speed lines behind everyone
          const q = Sc.turtle ? C.proj(Sc.turtle.top) : [W / 2, H / 3];
          const R = rng(F.hold * 3 + 9);
          ctx.save();
          ctx.globalAlpha = 0.55;
          for (let i = 0; i < 90; i++) {
            const a = R() * TAU, w = 0.004 + R() * 0.012;
            ctx.fillStyle = R() < 0.5 ? '#FFFFFF' : '#FFE9A8';
            ctx.beginPath(); ctx.moveTo(q[0] + Math.cos(a) * 60 * u, q[1] + Math.sin(a) * 60 * u);
            ctx.lineTo(q[0] + Math.cos(a - w) * 2000, q[1] + Math.sin(a - w) * 2000);
            ctx.lineTo(q[0] + Math.cos(a + w) * 2000, q[1] + Math.sin(a + w) * 2000);
            ctx.fill();
          }
          ctx.restore();
        },
      });
      // anime sparkle glints
      P.glow(ctx, F, 8, 0.25);
    },
  };

  const WARHOL = [
    ['#FF2E88', '#FFE03A', '#2EC5FF', '#151515'],
    ['#FF7A00', '#7A2EFF', '#B6FF2E', '#101040'],
    ['#2EFFB8', '#FF3A3A', '#FFD02E', '#401010'],
    ['#FFB0D8', '#2E6BFF', '#FFF2A0', '#0A2A1A'],
  ];
  S.popart = {
    name: 'Pop Art', cat: 'ART',
    draw(ctx, F) {
      const { W, H, u } = F;
      const w = Math.round(W / 2), h = Math.round(H / 2);
      const src = renderScene(F, w, h, { lw: 4, haze: false, sunGlow: false });
      const x = src.getContext('2d');
      const id = x.getImageData(0, 0, w, h);
      const [c2, x2] = R2D.scratch('pop2', w, h);
      for (let q = 0; q < 4; q++) {
        const pal = WARHOL[q].map(hex);
        const out = x2.createImageData(w, h);
        for (let i = 0; i < id.data.length; i += 4) {
          const l = (id.data[i] * 0.3 + id.data[i + 1] * 0.59 + id.data[i + 2] * 0.11) / 255;
          const k = l > 0.72 ? 0 : l > 0.48 ? 1 : l > 0.22 ? 2 : 3;
          out.data[i] = pal[k][0]; out.data[i + 1] = pal[k][1]; out.data[i + 2] = pal[k][2]; out.data[i + 3] = 255;
        }
        x2.putImageData(out, 0, 0);
        ctx.drawImage(c2, (q % 2) * w, Math.floor(q / 2) * h);
      }
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8 * u;
      ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w, H); ctx.moveTo(0, h); ctx.lineTo(W, h); ctx.stroke();
      ctx.strokeRect(0, 0, W, H);
      benDay(ctx, F, 0.18, '0,0,0');
    },
  };

  S.fresco = {
    name: 'Renaissance Fresco', cat: 'ART',
    draw(ctx, F) {
      const { W, H, u } = F;
      const earth = (c, role) => {
        const h = toHsl(c);
        let out = fromHsl([h[0], h[1] * 0.72, h[2] * 0.9 + 0.04]);
        return mix(out, [214, 186, 140], role === 'sky' ? 0.22 : 0.1);
      };
      R2D.render(ctx, F, { lw: 1.6, lc: [92, 60, 40], fill: 'shade', pal: earth, raysA: 0.35, sunGlow: true });
      // gold halo for the hero turtle when it is held up
      const tc = F.S.turtle && F.C.proj(F.S.turtle.head);
      if (tc && F.b >= 24 && F.b < 32) {
        ctx.save(); ctx.strokeStyle = 'rgba(214,170,60,0.9)'; ctx.lineWidth = 5 * u; ctx.fillStyle = 'rgba(240,200,90,0.35)';
        ctx.beginPath(); ctx.arc(tc[0], tc[1], 34 * u, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      // cracked plaster
      const cracks = cachedTex('cracks', W, H, (x, W, H) => {
        const R = rng(5);
        x.strokeStyle = 'rgba(70,50,35,0.55)';
        for (let i = 0; i < 22; i++) {
          let px = R() * W, py = R() * H, a = R() * TAU;
          x.lineWidth = 0.6 + R() * 1.4;
          x.beginPath(); x.moveTo(px, py);
          for (let k = 0; k < 18; k++) { a += (R() - 0.5) * 1.2; px += Math.cos(a) * 14; py += Math.sin(a) * 14; x.lineTo(px, py); }
          x.stroke();
        }
        // flaked patches showing bare plaster
        for (let i = 0; i < 5; i++) {
          x.fillStyle = 'rgba(236,224,200,0.85)';
          x.beginPath();
          const cx = R() < 0.5 ? R() * W * 0.15 : W - R() * W * 0.15, cy = R() * H, r = 30 + R() * 60;
          for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU, rr = r * (0.6 + 0.5 * R()); k ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
          x.fill();
        }
      });
      ctx.drawImage(cracks, 0, 0);
      P.paper(ctx, F, 0.38, 'multiply');
      P.vignette(ctx, F, 0.35, '90,60,30');
    },
  };

  const MSPAINT = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080FF', '#004080', '#8000FF', '#804000',
    '#FFFFFF', '#C0C0C0', '#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FFFF80', '#00FF80', '#80FFFF', '#8080FF', '#FF0080', '#FF8040'];
  S.mspaint = {
    name: '90s Paint Program', cat: 'RETRO',
    draw(ctx, F) {
      const { W, H, u } = F;
      const cx = 64 * u, cy = 52 * u, cw = W - cx - 8 * u, ch = H - cy - 64 * u;
      const w = Math.round(cw / 2), h = Math.round(ch / 2);
      const C2 = R2D.camera(F.S.cam, w, h);
      const [c, x] = R2D.scratch('msp', w, h);
      const F2 = { ...F, W: w, H: h, u: h / 720 * 1.6, C: C2 };
      F2.groups = R2D.buildGroups(F.S, C2);
      const paintMap = { suit: '#000080', suitDark: '#000080', skin: '#FF8040', skinLight: '#FFFF80', hair: '#FFFF00', brow: '#FFFF80', tie: '#FF0000',
        hat: '#FF0000', shell: '#008000', shellDark: '#004040', shellRim: '#00FF00', tSkin: '#00FF80', belly: '#FFFF80', leaf: '#008000', leafDark: '#004040' };
      const msSnap = snap(MSPAINT);
      R2D.render(x, F2, { lw: 1.8, lc: [0, 0, 0], sky: 'flat', stripes: false, haze: false, sunGlow: false, clouds: true,
        pal: (c, role, mat) => (role === 'shape' && paintMap[mat] ? hex(paintMap[mat]) : msSnap(c)) });
      const id = x.getImageData(0, 0, w, h); quantize(id.data, MSPAINT); x.putImageData(id, 0, 0);
      // window chrome
      ctx.fillStyle = '#C0C0C0'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#000080'); g.addColorStop(1, '#1084D0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 26 * u);
      text(ctx, F, 'trump_likes_turtles.bmp - Paint', 0.012, 0.027, 15, { font: "'DejaVu Sans', sans-serif", fill: '#FFF', weight: 'bold' });
      ['File', 'Edit', 'View', 'Image', 'Colors', 'Help'].forEach((m, i) => text(ctx, F, m, 0.012 + i * 0.05, 0.062, 14, { font: "'DejaVu Sans', sans-serif", fill: '#000' }));
      // toolbox
      for (let i = 0; i < 16; i++) {
        const bx = 8 * u + (i % 2) * 24 * u, by = cy + Math.floor(i / 2) * 26 * u;
        ctx.fillStyle = '#DFDFDF'; ctx.fillRect(bx, by, 22 * u, 24 * u);
        ctx.strokeStyle = '#808080'; ctx.strokeRect(bx, by, 22 * u, 24 * u);
      }
      ctx.fillStyle = '#808080'; ctx.fillRect(cx - 2 * u, cy - 2 * u, cw + 4 * u, ch + 4 * u);
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, cx, cy, cw, ch); ctx.restore();
      // palette
      MSPAINT.forEach((col, i) => {
        const bx = 60 * u + (i % 14) * 20 * u, by = H - 56 * u + Math.floor(i / 14) * 20 * u;
        ctx.fillStyle = col; ctx.fillRect(bx, by, 18 * u, 18 * u);
        ctx.strokeStyle = '#404040'; ctx.strokeRect(bx, by, 18 * u, 18 * u);
      });
    },
  };

  const GB = ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'];
  S.gameboy = {
    name: '4-Shade Handheld LCD', cat: 'RETRO',
    draw(ctx, F) {
      const w = 192, h = 108;
      const c = renderScene(F, w, h, { lw: 4.5, lc: [0, 0, 0], haze: false, sunGlow: false, titleFont: "'Press Start 2P', monospace", fxLw: 4 });
      const x = c.getContext('2d');
      const id = x.getImageData(0, 0, w, h);
      for (let i = 0; i < id.data.length; i += 4) { const l = (id.data[i] * 0.3 + id.data[i + 1] * 0.59 + id.data[i + 2] * 0.11); id.data[i] = id.data[i + 1] = id.data[i + 2] = l; }
      quantize(id.data, GB, 52, w);
      x.putImageData(id, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, F.W, F.H); ctx.restore();
      // LCD pixel grid
      ctx.fillStyle = 'rgba(15,56,15,0.18)';
      const px = F.W / w;
      for (let i = 0; i < w; i++) ctx.fillRect(i * px, 0, 1 * F.u, F.H);
      for (let j = 0; j < h; j++) ctx.fillRect(0, j * px, F.W, 1 * F.u);
    },
  };

  S.synthwave = {
    name: 'Synthwave Neon', cat: '2D',
    draw(ctx, F) {
      const { W, H, u, C } = F;
      const hy = R2D.horizonY(C);
      R2D.render(ctx, F, {
        painter: neonTube({ color: (c) => { const h = toHsl(c)[0]; return h > 0.4 && h < 0.75 ? [0, 240, 255] : h < 0.12 || h > 0.85 ? [255, 60, 200] : [255, 210, 60]; }, fill: (c) => mix(c, [30, 5, 50], 0.82) }),
        bg(ctx, F) {
          const g = ctx.createLinearGradient(0, 0, 0, hy);
          g.addColorStop(0, '#12002B'); g.addColorStop(0.6, '#4B0F6B'); g.addColorStop(1, '#FF3D8B');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 1);
          // striped sun
          const sx = W / 2, sy = hy - H * 0.02, sr = H * 0.22;
          const sg = ctx.createLinearGradient(0, sy - sr, 0, sy);
          sg.addColorStop(0, '#FFE45A'); sg.addColorStop(1, '#FF2E88');
          ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, sr, Math.PI, 0); ctx.clip();
          ctx.fillStyle = sg; ctx.fillRect(sx - sr, sy - sr, sr * 2, sr);
          ctx.fillStyle = '#4B0F6B';
          for (let i = 0; i < 7; i++) { const y = sy - sr * 0.08 - i * sr * 0.12; ctx.fillRect(sx - sr, y, sr * 2, (7 - i) * 0.9 * u + 2 * u); }
          ctx.restore();
          ctx.fillStyle = '#0B0018'; ctx.fillRect(0, hy, W, H - hy);
          ctx.strokeStyle = '#FF2EC4'; ctx.lineWidth = 2 * u; ctx.shadowColor = '#FF2EC4'; ctx.shadowBlur = 10 * u;
          for (let i = -30; i <= 30; i++) { const a = C.proj([i * 1.2, 0, 3]), b = C.proj([i * 1.2, 0, -300]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
          const off = (F.t * 2) % 1.2;
          for (let k = 0; k < 40; k++) { const z = 3 - k * 1.2 - off; const a = C.proj([-60, 0, z]), b = C.proj([60, 0, z]); if (a[2] <= 0) continue; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
          ctx.shadowBlur = 0;
        },
        fxLw: 2, raysA: 0.15,
      });
      P.glow(ctx, F, 10, 0.4);
      P.scanlines(ctx, F, 0.15, 3);
    },
  };

  S.sumie = {
    name: 'Ink Wash (Sumi-e)', cat: 'ART',
    draw(ctx, F) {
      const { W, H, u } = F;
      const ink = (c) => { const l = lum(c); const v = 255 * (0.18 + 0.82 * Math.pow(l, 0.9)); return [v, v, v * 0.98]; };
      R2D.render(ctx, F, {
        painter: (ctx, sh, col, F, L, gi, si) => {
          for (const poly of R2D.shapePolys(sh)) {
            const p = R2D.polyPath(poly, 1.2 * u, gi * 7 + si, F);
            ctx.fillStyle = rgb(col, 0.7); ctx.fill(p);
            ctx.strokeStyle = 'rgba(15,15,18,0.9)'; ctx.lineWidth = (sh.deco ? 1.2 : 2.8) * u; ctx.lineJoin = 'round'; ctx.stroke(p);
            ctx.strokeStyle = 'rgba(15,15,18,0.35)'; ctx.lineWidth = (sh.deco ? 0.6 : 1.2) * u; ctx.stroke(R2D.polyPath(poly, 2.4 * u, gi * 7 + si + 3, F));
          }
        },
        bg(ctx, F) {
          paperBg(ctx, F, [240, 235, 222]);
          const hy = R2D.horizonY(F.C);
          // distant misty hills
          ctx.fillStyle = 'rgba(80,80,90,0.18)';
          ctx.beginPath(); ctx.moveTo(0, hy);
          for (let x = 0; x <= W; x += 20 * u) ctx.lineTo(x, hy - (40 + 30 * Math.sin(x * 0.004 + 1) + 20 * noise2(x * 0.01, 0, 4)) * u);
          ctx.lineTo(W, hy); ctx.fill();
          const g = ctx.createLinearGradient(0, hy, 0, H);
          g.addColorStop(0, 'rgba(60,60,64,0.18)'); g.addColorStop(1, 'rgba(60,60,64,0.05)');
          ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
        },
        pal: ink, fxLw: 2, fxShine: false, raysA: 0.08,
      });
      P.filter(ctx, F, 'blur(0.5px)');
      P.paper(ctx, F, 0.45);
      ctx.save(); ctx.fillStyle = 'rgba(190,30,30,0.88)';
      roundRect(ctx, W - 80 * u, 30 * u, 50 * u, 50 * u, 5 * u); ctx.fill();
      ctx.fillStyle = 'rgba(240,235,222,0.95)'; ctx.font = `${Math.round(34 * u)}px 'IPAGothic', 'WenQuanYi Zen Hei', serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('亀', W - 55 * u, 56 * u);
      ctx.restore();
    },
  };

  S.rotoscope = {
    name: 'Rotoscope', cat: '2D', fps: 12,
    draw(ctx, F) {
      const { W, H, u } = F;
      const src = base(F, { lw: 0, fill: 'shade', sunGlow: true, raysA: 0.25 }, 'roto');
      const w = Math.round(W / 2), h = Math.round(H / 2);
      const [c, x] = R2D.scratch('roto2', w, h);
      x.drawImage(src, 0, 0, w, h);
      const id = x.getImageData(0, 0, w, h), d = id.data;
      const lumA = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const o = i * 4;
        for (let k = 0; k < 3; k++) d[o + k] = Math.round(d[o + k] / 255 * 4) / 4 * 255 * 0.9 + 20;
        lumA[i] = d[o] * 0.3 + d[o + 1] * 0.59 + d[o + 2] * 0.11;
      }
      for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) {
        const i = y * w + xx;
        const gx = lumA[i + 1] - lumA[i - 1], gy = lumA[i + w] - lumA[i - w];
        if (Math.abs(gx) + Math.abs(gy) > 38) { const o = i * 4; d[o] = 25; d[o + 1] = 20; d[o + 2] = 30; }
      }
      x.putImageData(id, 0, 0);
      const R = rng(F.hold + 3);
      ctx.save(); ctx.translate((R() - 0.5) * 2 * u, (R() - 0.5) * 2 * u);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(c, 0, 0, W, H); ctx.restore();
      P.filter(ctx, F, 'contrast(1.1) saturate(1.2)');
    },
  };

  S.chalkboard = {
    name: 'Chalkboard', cat: '2D', fps: 10,
    draw(ctx, F) {
      const { W, H, u } = F;
      const chalk = (c) => mix(sat(0.7, 0.18)(c), [245, 245, 240], 0.35);
      R2D.render(ctx, F, {
        painter: scribble({ lw: 2.2, gap: 6, alpha: 0.4, olw: 2.4, wob: 1.4, passes: 2, lcSame: true, la: 0.9 }),
        bg(ctx, F) {
          ctx.fillStyle = '#23372B'; ctx.fillRect(0, 0, W, H);
          R2D.overlayTex(ctx, R2D.paperTex(), 'overlay', 0.35, 3 * u);
          // smudges
          const R = rng(4);
          for (let i = 0; i < 8; i++) { const g = ctx.createRadialGradient(R() * W, R() * H, 0, R() * W, R() * H, 160 * u); g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
          ctx.strokeStyle = 'rgba(240,240,230,0.5)'; ctx.lineWidth = 2 * u;
          const hy = R2D.horizonY(F.C);
          ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
        },
        pal: chalk, fxLw: 2, titleFont: "'Permanent Marker', sans-serif", groundShadows: false, fxShine: false, raysA: 0.1,
      });
      // chalk grain + wooden frame
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      R2D.overlayTex(ctx, R2D.grainTex(F.hold % 4), 'destination-out', 0.18, 1);
      ctx.restore();
      ctx.lineWidth = 22 * u; ctx.strokeStyle = '#8A5A2E'; ctx.strokeRect(0, 0, W, H);
      ctx.lineWidth = 4 * u; ctx.strokeStyle = '#5E3B1C'; ctx.strokeRect(11 * u, 11 * u, W - 22 * u, H - 22 * u);
    },
  };

  S.gouache = {
    name: 'Picture Book Gouache', cat: '2D',
    draw(ctx, F) {
      const warm = (c, role) => mix(sat(0.92)(c), [255, 236, 200], role === 'sky' ? 0.12 : 0.1);
      R2D.render(ctx, F, { lw: 1.6, lc: 'darker', fill: 'shade', pal: warm, wobble: 0.8, wobbleFixed: true, fxLw: 1.5 });
      P.paper(ctx, F, 0.4);
      P.weave(ctx, F, 0.12);
      P.vignette(ctx, F, 0.3, '80,50,20');
    },
  };

  return Object.assign(S, { _h: { renderScene, base, sample, quantize, snap, sat, grayPal, sepiaPal, text, roundRect, cachedTex, bricks, paperBg, scribble, hatch, wash, neonTube, strokes, benDay, filmDamage, flicker, voronoiCells } });
})();
