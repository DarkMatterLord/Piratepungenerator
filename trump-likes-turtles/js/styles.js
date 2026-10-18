// The 80 styles, one per beat (0.5 s), in order. 3D ones are defined here;
// 2D ones live in styles2d.js and are looked up by key.
window.STYLES = (() => {
  const { clamp, mix, toHsl, fromHsl, hash, v3, rgb, lum } = U;

  // ---------- color helpers ----------
  const sat = (k, l = 0) => (c) => { const h = toHsl(c); return fromHsl([h[0], clamp(h[1] * k), clamp(h[2] + l)]); };
  const pastel = (k = 0.35) => (c) => mix(c, [255, 255, 255], k);
  const snapPal = (pal) => (c) => U.nearest(c, pal.map(U.hex));
  const chain = (...fs) => (c, role, mat) => fs.reduce((x, f) => f(x, role, mat), c);
  const onlyShapes = (f) => (c, role, mat) => (role === 'shape' || role === 'fx' ? f(c, role, mat) : c);

  // ---------- scene tweaks applied before 3D rendering ----------
  const CHAR = (g) => g.name === 'trump' || g.name === 'turtle';
  function scalePrim(p, anchor, k) {
    const T = (x) => v3.add(anchor, v3.mul(v3.sub(x, anchor), k));
    if (p.c) p.c = T(p.c);
    if (p.a) { p.a = T(p.a); p.b = T(p.b); p.ra *= k; p.rb *= k; }
    if (p.r) p.r *= k;
    if (p.rad) p.rad = p.rad.map((x) => x * k);
    if (p.h) p.h = p.h.map((x) => x * k);
    if (p.hh) p.hh *= k;
    if (p.rr) p.rr *= k;
  }
  // Toy proportions: heads scaled up around the neck.
  const bigHead = (k) => (F) => {
    for (const g of F.S.groups) {
      if (!CHAR(g)) continue;
      const head = g.prims.filter((p) => p.part === 'head');
      if (!head.length) continue;
      const neck = head[0];
      const anchor = neck.a || neck.c;
      head.forEach((p) => scalePrim(p, anchor, k));
    }
  };
  // Stop-motion: puppets are nudged slightly between held frames.
  const jitter = (amt) => (F) => {
    F.S.groups.forEach((g, gi) => {
      if (g.bg) return;
      const o = [(hash(gi, F.hold, 1) - 0.5) * amt, (hash(gi, F.hold, 2) - 0.5) * amt * 0.5, (hash(gi, F.hold, 3) - 0.5) * amt];
      for (const p of g.prims) {
        const po = [(hash(gi * 97 + 5, F.hold, p.c ? p.c[0] * 100 : 7) - 0.5) * amt * 0.25, 0, 0];
        if (p.c) p.c = v3.add(v3.add(p.c, o), po);
        if (p.a) { p.a = v3.add(p.a, o); p.b = v3.add(p.b, o); }
      }
    });
  };
  const both = (...fs) => (F) => fs.forEach((f) => f(F));

  // HUD overlays used by camera-ish styles
  function hud(ctx, F, lines, col = '#fff', font = "'Press Start 2P', monospace") {
    const { W, H, u } = F;
    ctx.save();
    ctx.font = `${Math.round(14 * u)}px ${font}`;
    ctx.fillStyle = col;
    ctx.textBaseline = 'top';
    lines.forEach(([txt, x, y, align]) => { ctx.textAlign = align || 'left'; ctx.fillText(txt, x * W, y * H); });
    ctx.restore();
  }

  // ---------- 3D style factory ----------
  function s3(name, cat, o) {
    return {
      name, cat, fps: o.fps, kind: '3d',
      draw(ctx, F) {
        if (o.prep) o.prep(F);
        const cv = R3D.render(F, o);
        if (!cv) { R2D.render(ctx, F, { lw: 3 }); return; }
        ctx.save();
        ctx.imageSmoothingEnabled = !o.pixel;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(cv, 0, 0, F.W, F.H);
        ctx.restore();
        if (o.before) o.before(ctx, F);
        R2D.drawFx(ctx, F, { lw: 2.2, pal: o.fxPal || o.pal, ...(o.fx || {}) });
        if (o.after) o.after(ctx, F);
      },
    };
  }

  // Per-material recolor (keys from RIG.MATS), with an optional fallback transform.
  const matPal = (map, fb) => (c, role, mat) => (role === 'shape' && map[mat] ? U.hex(map[mat]) : fb ? fb(c, role, mat) : c);
  const PLAYDOH = ['#E8352E', '#FFD23F', '#2E86DE', '#2ECC71', '#FF8C1A', '#9B59B6', '#F5F5F0', '#FF6FA8', '#1E2B55', '#7A4A24', '#111111'];
  const BALLOON = ['#FF3B3B', '#FFD43B', '#3B8BFF', '#3BD16F', '#FF7AD9', '#FF9A3B', '#B05CFF', '#FFFFFF', '#222222'];
  const CANDY = ['#FF2E4D', '#FF8A00', '#FFE135', '#38D430', '#2EC4FF', '#B44CFF', '#FFFFFF', '#3A1E0A'];

  const D3 = {
    pixar: s3('3D Animated Feature', '3D', { mode: 'pixar', res: 0.6, pal: onlyShapes(sat(1.1)) }),
    claymation: s3('Claymation', 'CLAYMATION', { mode: 'clay', res: 0.55, fps: 12, disp: 0.012, p: [11, 2.6, 0, 0], blend: 0.015, allObj: true, post: ['dof'], pp: [0.07, 6, 3.5, 0.5], prep: jitter(0.012), pal: onlyShapes(chain(sat(1.15), (c) => mix(c, [255, 240, 220], 0.12))) }),
    lowpoly: s3('Low-Poly 3D', '3D', { mode: 'lowpoly', res: 0.6, allObj: true, pal: onlyShapes(chain(sat(0.85), pastel(0.12))) }),
    anime3d: s3('Anime Cel-Shaded 3D', '3D', { mode: 'toon', res: 0.6, post: ['outline'], pal: sat(1.25, 0.03) }),
    lego: s3('Toy Brick Stop-Motion', 'STOP-MOTION', { mode: 'lego', res: 0.55, fps: 10, prep: jitter(0.01), pal: onlyShapes(sat(1.25)) }),
    felt: s3('Felt Puppet Stop-Motion', 'STOP-MOTION', { mode: 'felt', res: 0.55, fps: 12, allObj: true, prep: jitter(0.014), post: ['grain'], blend: 0.02, pal: onlyShapes(chain(sat(0.8), (c) => mix(c, [235, 220, 200], 0.15))) }),
    voxel: s3('Voxel 3D', '3D', { mode: 'voxel', res: 0.55 }),
    vinyl: s3('Vinyl Toy', '3D', { mode: 'vinyl', res: 0.6, prep: bigHead(1.55), blend: 0.015, pal: onlyShapes(sat(1.2, 0.02)) }),
    plasticine: s3('Plasticine Close-Up', 'CLAYMATION', { mode: 'clay', res: 0.55, fps: 12, disp: 0.01, p: [11, 1.4, 0, 0], blend: 0.02, prep: jitter(0.01), post: ['dof'], pp: [0.055, 14, 7, 0.5], pal: onlyShapes(chain(sat(1.05), pastel(0.2))) }),
    gold: s3('Golden Statue', '3D', { mode: 'gold', res: 0.6, fxPal: (c) => mix(c, [255, 210, 90], 0.6) }),
    marble: s3('Marble Statue', '3D', { mode: 'marble', res: 0.6, fx: { raysA: 0.12 }, fxPal: (c) => mix(c, [235, 235, 230], 0.7) }),
    hologram: s3('Hologram', '3D', { mode: 'holo', res: 0.55, post: ['glow'], fxPal: (c) => mix([60, 200, 255], [255, 255, 255], lum(c) * 0.6),
      after: (ctx, F) => R2D.POST.scanlines(ctx, F, 0.18, 4) }),
    crochet: s3('Crochet Amigurumi', 'CRAFT', { mode: 'crochet', res: 0.6, prep: bigHead(1.22), blend: 0.03, pal: onlyShapes(chain(sat(0.9), pastel(0.18))) }),
    playdough: s3('Modeling Dough', 'CLAYMATION', { mode: 'clay', res: 0.55, fps: 12, disp: 0.012, p: [9, 0.6, 0, 0], blend: 0.03, prep: both(bigHead(1.15), jitter(0.012)), pal: onlyShapes(snapPal(PLAYDOH)) }),
    balloon: s3('Balloon Animals', '3D', { mode: 'balloon', res: 0.6, blend: 0.07, p: [18, 1, 0.012, 0],
      pal: matPal({ suit: '#2F5BE0', suitDark: '#2448B8', skin: '#FF9A3B', skinLight: '#FFB86B', hair: '#FFD43B', tie: '#FF3B3B', shirt: '#FFFFFF',
        shell: '#3BD16F', shellDark: '#28A855', shellRim: '#9BEA6A', tSkin: '#7BE07B', belly: '#FFE78A', hat: '#FF3B3B' }, onlyShapes(snapPal(BALLOON))) }),
    origami: s3('Origami Papercraft', 'CRAFT', { mode: 'origami', res: 0.6, post: ['crease'], pal: onlyShapes(chain(sat(0.9), pastel(0.2))) }),
    thermal: s3('Thermal Camera', 'OTHER', { mode: 'thermal', res: 0.5, post: ['blur'], fxPal: (c) => [255, 255, 200],
      after: (ctx, F) => {
        const { W, H, u } = F;
        const g = ctx.createLinearGradient(0, H * 0.8, 0, H * 0.25);
        ['#000019', '#4C0099', '#E61A33', '#FF9900', '#FFFFD9'].forEach((c, i) => g.addColorStop(i / 4, c));
        ctx.fillStyle = g; ctx.fillRect(W - 40 * u, H * 0.25, 14 * u, H * 0.55);
        hud(ctx, F, [['37.2°C', 0.955, 0.2, 'right'], ['18.0°C', 0.955, 0.81, 'right'], ['IR  TRK  x1.0', 0.03, 0.1]]);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2 * u;
        const cx = W / 2, cy = H / 2;
        ctx.beginPath(); ctx.moveTo(cx - 20 * u, cy); ctx.lineTo(cx + 20 * u, cy); ctx.moveTo(cx, cy - 20 * u); ctx.lineTo(cx, cy + 20 * u); ctx.stroke();
      } }),
    plush: s3('Plush Toy', 'CRAFT', { mode: 'plush', res: 0.55, prep: bigHead(1.4), blend: 0.05, p: [18, 1, 0.01, 0], pal: onlyShapes(chain(sat(0.85), pastel(0.25))) }),
    porcelain: s3('Blue Porcelain', '3D', { mode: 'porcelain', res: 0.6, fxPal: (c) => mix([30, 60, 170], [255, 255, 255], lum(c)) }),
    terracotta: s3('Terracotta Clay Relief', 'CLAYMATION', { mode: 'terracotta', res: 0.55, disp: 0.008, p: [10, 0.5, 0, 0], blend: 0.02, fxPal: (c) => mix(c, [200, 110, 70], 0.7) }),
    noir: s3('Film Noir 3D', '3D', { mode: 'noir', res: 0.55, post: ['grain'], pal: (c) => { const l = lum(c) * 255; return [l, l, l]; },
      after: (ctx, F) => R2D.POST.vignette(ctx, F, 0.5) }),
    nightvision: s3('Night Vision', 'OTHER', { mode: 'pixar', res: 0.5, post: ['nv'], fxPal: (c) => [120, 255, 140],
      after: (ctx, F) => hud(ctx, F, [['REC ●', 0.04, 0.1], ['NV-3  x2.0', 0.96, 0.1, 'right']], '#9CFFA8') }),
    actionfig: s3('Action Figure Stop-Motion', 'STOP-MOTION', { mode: 'vinyl', res: 0.55, fps: 12, prep: jitter(0.015), pal: onlyShapes(sat(1.1)) }),
    tin: s3('Tin Toy', '3D', { mode: 'tin', res: 0.6, pal: onlyShapes(sat(1.3)) }),
    tiltshift: s3('Tilt-Shift Miniature', '3D', { mode: 'pixar', res: 0.6, post: ['tilt'], pp: [0, 0, 0, 0.42], pal: sat(1.25) }),
    wood: s3('Wood Carving', 'CRAFT', { mode: 'wood', res: 0.6, fxPal: (c) => mix(c, [160, 100, 50], 0.5) }),
    ps1: s3('90s Console 3D', 'RETRO', { mode: 'ps1', res: 0.25, pixel: true, post: ['dither'], pal: sat(1.1) }),
    chrome: s3('Chrome', '3D', { mode: 'chrome', res: 0.6, fxPal: (c) => mix(c, [230, 240, 255], 0.5) }),
    gummy: s3('Gummy Candy', '3D', { mode: 'gummy', res: 0.6, blend: 0.03, p: [18, 1, 0.008, 0],
      pal: matPal({ suit: '#E0182E', suitDark: '#B0101F', skin: '#FF8A00', skinLight: '#FFA640', hair: '#FFE135', brow: '#FFE135', tie: '#B44CFF', shirt: '#FFF6E0',
        shell: '#2BC42A', shellDark: '#1E9A1E', shellRim: '#9BEA3A', tSkin: '#6CFF5A', belly: '#FFE135', hat: '#FF2E4D' }, onlyShapes(snapPal(CANDY))) }),
    anaglyph: s3('Red/Cyan Anaglyph 3D', '3D', { mode: 'pixar', res: 0.6, post: ['anaglyph'] }),
    chocolate: s3('Chocolate Sculpture', '3D', { mode: 'chocolate', res: 0.6, fxPal: (c) => mix(c, [110, 60, 30], 0.5) }),
    ice: s3('Ice Sculpture', '3D', { mode: 'ice', res: 0.6, fxPal: (c) => mix(c, [200, 235, 255], 0.6) }),
    bronze: s3('Bronze Monument', '3D', { mode: 'bronze', res: 0.6, fxPal: (c) => mix(c, [170, 120, 70], 0.55) }),
  };

  // Order of the 80 beats. Strings name 3D styles (D3) or 2D styles (STYLES2D).
  const ORDER = [
    'cartoon', 'pixar', 'watercolor', 'nes', 'papercut', 'oil', 'lowpoly', 'rubberhose',
    'anime3d', 'crayon', 'lego', 'ukiyoe', 'cctv', 'felt', 'comic', 'voxel',
    'sketch', 'vinyl', 'stainedglass', 'perler', 'ascii', 'claymation', 'crossstitch', 'gold',
    'epicanime', 'marble', 'popart', 'fresco', 'hologram', 'mspaint', 'crochet', 'gameboy',
    'synthwave', 'playdough', 'sumie', 'balloon', 'rotoscope', 'origami', 'chalkboard', 'thermal',
    'gouache', 'plush', 'cubism', 'plasticine', 'porcelain', 'pointillism', 'terracotta', 'mosaic',
    'newspaper', 'vhs', 'courtroom', 'noir', 'engraving', 'nightvision', 'comicstrip', 'actionfig',
    'tin', 'artdeco', 'shadowpuppet', 'tiltshift', 'wood', 'graffiti', 'ps1', 'cave',
    'neon', 'chrome', 'vaporwave', 'glitch', 'gummy', 'oscilloscope', 'anaglyph', 'laser',
    'impressionist', 'chocolate', 'vangogh', 'ice', 'popup', 'bronze', 'silentfilm', 'iris',
  ];

  const S2 = window.STYLES2D || {};
  const fallback = (key) => ({ name: key, cat: '2D', draw: (ctx, F) => R2D.render(ctx, F, { lw: 3.2 }) });
  const list = ORDER.map((k) => D3[k] || S2[k] || fallback(k));
  list.D3 = D3;
  list.ORDER = ORDER;
  list.helpers = { sat, pastel, snapPal, chain, onlyShapes, bigHead, jitter, hud };
  return list;
})();
