// Second half of the 2D styles (extends window.STYLES2D).
(() => {
  const { clamp, lerp, mix, hex, rgb, hash, rng, TAU, lum, scale, toHsl, fromHsl, noise2 } = U;
  const P = R2D.POST;
  const S = window.STYLES2D;
  const { renderScene, base, sample, quantize, snap, sat, grayPal, sepiaPal, text, roundRect, cachedTex, bricks, paperBg,
    scribble, hatch, neonTube, strokes, benDay, filmDamage, flicker } = S._h;

  // Voronoi cells with their own cache key.
  const vcache = {};
  function cells(W, H, n, seed) {
    const k = `${W}x${H}:${n}:${seed}`;
    if (!vcache[k]) {
      const R = rng(seed);
      const pts = [];
      for (let i = 0; i < n; i++) pts.push([R() * W, R() * H]);
      vcache[k] = pts.map((p, idx) => {
        let poly = [[-20, -20], [W + 20, -20], [W + 20, H + 20], [-20, H + 20]];
        pts.forEach((q, j) => {
          if (j === idx) return;
          const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], nr = [q[0] - p[0], q[1] - p[1]];
          const out = [];
          for (let a = 0; a < poly.length; a++) {
            const A = poly[a], B = poly[(a + 1) % poly.length];
            const da = (A[0] - m[0]) * nr[0] + (A[1] - m[1]) * nr[1], db = (B[0] - m[0]) * nr[0] + (B[1] - m[1]) * nr[1];
            if (da <= 0) out.push(A);
            if ((da < 0) !== (db < 0)) { const t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
          }
          poly = out;
        });
        return { p, poly };
      });
    }
    return vcache[k];
  }
  const polyPathOf = (ctx, poly) => { ctx.beginPath(); poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };

  // ---------------- Cubism ----------------
  S.cubism = {
    name: 'Cubism', cat: 'ART',
    draw(ctx, F) {
      const { W, H, u } = F;
      const earthy = (c) => mix(sat(0.55)(c), [150, 118, 84], 0.22);
      const src = base(F, { lw: 2.6, lc: [44, 34, 26], fill: 'shade', pal: earthy, raysA: 0.15 }, 'cub');
      ctx.fillStyle = '#6E5A43'; ctx.fillRect(0, 0, W, H);
      const tints = ['rgba(120,90,60,0.25)', 'rgba(70,90,110,0.25)', 'rgba(200,170,120,0.22)', 'rgba(60,50,40,0.25)', 'rgba(160,110,70,0.2)'];
      cells(W, H, 30, 7).forEach((c, i) => {
        ctx.save();
        polyPathOf(ctx, c.poly); ctx.clip();
        const ox = (hash(i, 1) - 0.5) * 34 * u, oy = (hash(i, 2) - 0.5) * 22 * u, r = (hash(i, 3) - 0.5) * 0.12, s = 1 + (hash(i, 4) - 0.5) * 0.12;
        ctx.translate(c.p[0], c.p[1]); ctx.rotate(r); ctx.scale(s, s); ctx.translate(-c.p[0] + ox, -c.p[1] + oy);
        ctx.drawImage(src, 0, 0);
        ctx.restore();
        polyPathOf(ctx, c.poly);
        ctx.fillStyle = tints[i % tints.length]; ctx.fill();
        ctx.strokeStyle = 'rgba(40,30,22,0.85)'; ctx.lineWidth = 3 * u; ctx.stroke();
        ctx.strokeStyle = 'rgba(240,220,180,0.25)'; ctx.lineWidth = 1.2 * u;
        ctx.save(); ctx.translate(2 * u, 2 * u); ctx.stroke(); ctx.restore();
      });
      P.weave(ctx, F, 0.25);
    },
  };

  // ---------------- Perler beads ----------------
  const BEADS = ['#FFFFFF', '#1C1C1C', '#8A8A8A', '#C9C9C9', '#F2D16B', '#F7A940', '#E8743B', '#F2A766', '#D9262E', '#8E1F2F', '#2A3A7A', '#3B6FD8',
    '#7CC3F2', '#BFE3F7', '#2F8F3A', '#5FC24C', '#A6DD6B', '#7A4E2D', '#B98A5B', '#F4B6C8', '#9B6BD8', '#F3EBD3'];
  S.perler = {
    name: 'Fuse Beads', cat: 'CRAFT',
    draw(ctx, F) {
      const { W, H, u } = F;
      const cols = 80, rows = 45;
      const src = renderScene(F, cols * 5, rows * 5, { lw: 8, haze: false, sunGlow: false });
      const { data } = sample(src, cols, rows);
      quantize(data, BEADS);
      const cw = W / cols, ch = H / rows;
      ctx.fillStyle = '#DADDE2'; ctx.fillRect(0, 0, W, H);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const o = (j * cols + i) * 4, c = [data[o], data[o + 1], data[o + 2]];
        const x = (i + 0.5) * cw, y = (j + 0.5) * ch, r = cw * 0.47;
        ctx.fillStyle = rgb(scale(c, 0.75)); ctx.beginPath(); ctx.arc(x + 0.8 * u, y + 0.8 * u, r, 0, TAU); ctx.fill();
        ctx.fillStyle = rgb(c); ctx.beginPath(); ctx.arc(x, y, r * 0.95, 0, TAU); ctx.fill();
        ctx.fillStyle = rgb(scale(c, 0.55)); ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, TAU); ctx.fill();
        ctx.strokeStyle = rgb(mix(c, [255, 255, 255], 0.55), 0.7); ctx.lineWidth = r * 0.16;
        ctx.beginPath(); ctx.arc(x, y, r * 0.66, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
      }
    },
  };

  // ---------------- Pointillism ----------------
  S.pointillism = {
    name: 'Pointillism', cat: 'ART', fps: 10,
    draw(ctx, F) {
      const { W, H, u } = F;
      const src = base(F, { lw: 0, fill: 'shade', pal: sat(1.25, 0.04), raysA: 0.2 }, 'pt');
      const gw = 320, gh = 180;
      const { data } = sample(src, gw, gh);
      ctx.fillStyle = '#F4EEDC'; ctx.fillRect(0, 0, W, H);
      const R = rng(F.hold * 17 + 3);
      const r = 2.7 * u;
      for (let n = 0; n < 24000; n++) {
        const fx = R() * gw, fy = R() * gh;
        const k = ((fy | 0) * gw + (fx | 0)) * 4;
        const h = toHsl([data[k], data[k + 1], data[k + 2]]);
        const c = fromHsl([h[0] + (R() - 0.5) * 0.12, clamp(h[1] * 1.25), clamp(h[2] + (R() - 0.45) * 0.16)]);
        ctx.fillStyle = rgb(c);
        ctx.beginPath(); ctx.arc(fx * W / gw, fy * H / gh, r, 0, TAU); ctx.fill();
      }
    },
  };

  // ---------------- Roman mosaic ----------------
  const STONE = ['#F1E8D6', '#D9C9A8', '#B89B6E', '#8C6A45', '#5A4330', '#2B231C', '#C7472E', '#8E2E22', '#3E6E8E', '#6FA0B8', '#A9C6CF',
    '#4E7A3A', '#87A85A', '#E2B54A', '#C68A3A', '#E8A07A'];
  S.mosaic = {
    name: 'Roman Mosaic', cat: 'ART',
    draw(ctx, F) {
      const { W, H, u } = F;
      const t = 13 * u;
      const cols = Math.ceil(W / t), rows = Math.ceil(H / t);
      const src = renderScene(F, cols * 3, rows * 3, { lw: 7, haze: false, sunGlow: false });
      const { data } = sample(src, cols, rows);
      quantize(data, STONE);
      ctx.fillStyle = '#CFC6B4'; ctx.fillRect(0, 0, W, H);
      const jx = (i, j) => (hash(i, j, 11) - 0.5) * t * 0.35, jy = (i, j) => (hash(i, j, 12) - 0.5) * t * 0.35;
      const g = 1.3 * u;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const o = (j * cols + i) * 4, c = [data[o], data[o + 1], data[o + 2]];
        const k = 0.9 + 0.2 * hash(i, j, 13);
        const pts = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => [a * t + jx(a, b), b * t + jy(a, b)]);
        const cx = (pts[0][0] + pts[2][0]) / 2, cy = (pts[0][1] + pts[2][1]) / 2;
        ctx.beginPath();
        pts.forEach(([x, y], q) => { const X = x + (cx - x) * (g / t) * 2, Y = y + (cy - y) * (g / t) * 2; q ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.closePath();
        ctx.fillStyle = rgb(scale(c, k)); ctx.fill();
      }
      R2D.overlayTex(ctx, R2D.paperTex(), 'overlay', 0.35, 1.5 * u);
      P.vignette(ctx, F, 0.3, '60,45,30');
    },
  };

  // ---------------- Newspaper ----------------
  S.newspaper = {
    name: 'Newspaper Halftone', cat: '2D',
    draw(ctx, F) {
      const { W, H, u } = F;
      ctx.fillStyle = '#E9E3D2'; ctx.fillRect(0, 0, W, H);
      const serif = "'DejaVu Serif', 'Liberation Serif', Georgia, serif";
      text(ctx, F, 'The Daily Turtle', 0.5, 0.115, 58, { font: serif, weight: 'bold', align: 'center', fill: '#151515' });
      ctx.fillStyle = '#151515'; ctx.fillRect(0.04 * W, 0.135 * H, 0.92 * W, 3 * u); ctx.fillRect(0.04 * W, 0.17 * H, 0.92 * W, 1.2 * u);
      text(ctx, F, 'SATURDAY, OCTOBER 18, 2026', 0.04, 0.162, 13, { font: serif, fill: '#333' });
      text(ctx, F, 'LATE EDITION  ·  25¢', 0.96, 0.162, 13, { font: serif, fill: '#333', align: 'right' });
      text(ctx, F, '“NOBODY’S EVER SEEN A TURTLE LIKE THAT”', 0.5, 0.235, 30, { font: serif, weight: 'bold', align: 'center', fill: '#151515' });
      // photo with halftone
      const px = 0.04 * W, py = 0.27 * H, pw = 0.6 * W, ph = 0.6 * H;
      const src = renderScene(F, Math.round(pw / 2), Math.round(ph / 2), { lw: 4, sunGlow: false });
      const sw = src.width, shh = src.height;
      const d = src.getContext('2d').getImageData(0, 0, sw, shh).data;
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
      ctx.fillStyle = '#F2EEE2'; ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#141414';
      const cell = 6.5 * u, a = Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
      const R = Math.hypot(pw, ph);
      for (let gy = -R; gy < R; gy += cell) for (let gx = -R; gx < R; gx += cell) {
        const x = pw / 2 + gx * ca - gy * sa, y = ph / 2 + gx * sa + gy * ca;
        if (x < 0 || y < 0 || x >= pw || y >= ph) continue;
        const k = ((Math.floor(y / ph * shh) * sw) + Math.floor(x / pw * sw)) * 4;
        const l = (d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11) / 255;
        const r = cell * 0.62 * Math.sqrt(1 - l);
        if (r < 0.3) continue;
        ctx.beginPath(); ctx.arc(px + x, py + y, r, 0, TAU); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#151515'; ctx.lineWidth = 1.5 * u; ctx.strokeRect(px, py, pw, ph);
      // column of body text
      text(ctx, F, 'PRESIDENT HAILS', 0.67, 0.31, 20, { font: serif, weight: 'bold', fill: '#151515' });
      text(ctx, F, 'SHELLED FRIEND', 0.67, 0.345, 20, { font: serif, weight: 'bold', fill: '#151515' });
      const Rr = rng(3);
      ctx.fillStyle = '#7A766C';
      for (let i = 0; i < 17; i++) {
        const y = 0.375 * H + i * 15 * u;
        if (y > 0.86 * H) break;
        ctx.fillRect(0.67 * W, y, (0.29 - (i % 6 === 5 ? 0.12 : Rr() * 0.03)) * W, 5 * u);
      }
      P.paper(ctx, F, 0.35);
    },
  };

  // ---------------- VHS ----------------
  S.vhs = {
    name: 'VHS Tape', cat: 'RETRO',
    draw(ctx, F) {
      const { W, H, u, hold } = F;
      const src = base(F, { lw: 2.4, pal: sat(1.3) }, 'vhs');
      ctx.drawImage(src, 0, 0);
      ctx.save(); ctx.globalAlpha = 0.35; ctx.drawImage(src, 3 * u, 0); ctx.drawImage(src, 6 * u, 0); ctx.restore();
      P.chroma(ctx, F, 4);
      P.filter(ctx, F, 'saturate(1.2) contrast(1.05) blur(0.6px)');
      // tracking band
      const R = rng(hold * 3 + 2);
      const by = ((F.tReal * 0.35) % 1.2 - 0.1) * H;
      for (let y = by; y < by + 36 * u; y += 3 * u) {
        const dx = (R() - 0.5) * 30 * u;
        ctx.drawImage(ctx.canvas, 0, y, W, 3 * u, dx, y, W, 3 * u);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, by + 10 * u, W, 6 * u);
      P.grain(ctx, F, 0.28);
      P.scanlines(ctx, F, 0.16, 3);
      const mono = "'DejaVu Sans Mono', monospace";
      text(ctx, F, 'PLAY ▶', 0.05, 0.13, 26, { font: mono, weight: 'bold', fill: '#F2F2F2', stroke: '#000', sw: 3 });
      const sec = 24 * 60 + 31 + Math.floor(F.tReal);
      text(ctx, F, `SP  0:${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`, 0.95, 0.13, 22, { font: mono, weight: 'bold', fill: '#F2F2F2', align: 'right', stroke: '#000', sw: 3 });
    },
  };

  // ---------------- Courtroom sketch ----------------
  S.courtroom = {
    name: 'Courtroom Sketch', cat: 'ART', fps: 8,
    draw(ctx, F) {
      const { W, H, u } = F;
      const pastel = (c) => mix(sat(0.85)(c), [250, 240, 225], 0.12);
      R2D.render(ctx, F, {
        painter: scribble({ lw: 2.8, gap: 4.6, alpha: 0.85, base: 0.3, olw: 1.7, passes: 2, lc: [45, 40, 48], la: 0.85, angle: -0.95, wob: 2.4 }),
        bg(ctx, F) {
          paperBg(ctx, F, [240, 232, 214]);
          const R = rng(F.hold + 1);
          ctx.strokeStyle = 'rgba(110,130,170,0.35)'; ctx.lineWidth = 3 * u;
          for (let i = 0; i < 30; i++) { const x = R() * W, y = R() * H * 0.45; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40 * u, y - 25 * u); ctx.stroke(); }
        },
        pal: pastel, bgFade: 0.45, groundShadows: false, fxLw: 1.5, titleFont: "'Permanent Marker', sans-serif",
      });
      P.paper(ctx, F, 0.4);
      text(ctx, F, 'M. T. ’26', 0.93, 0.83, 18, { font: "'Permanent Marker', cursive", fill: 'rgba(50,45,55,0.8)', align: 'right' });
    },
  };

  // ---------------- Victorian engraving ----------------
  S.engraving = {
    name: 'Victorian Engraving', cat: 'ART',
    draw(ctx, F) {
      const { W, H, u } = F;
      const w = Math.round(W / 2), h = Math.round(H / 2);
      const src = renderScene(F, w, h, { lw: 0, fill: 'shade', sunGlow: false, raysA: 0.15, pal: (c, role) => (role === 'sky' ? mix(c, [255, 255, 255], 0.3) : scale(c, 0.8)) }, 'eng');
      const d = src.getContext('2d').getImageData(0, 0, w, h).data;
      const L = (x, y) => { const k = (clamp(y | 0, 0, h - 1) * w + clamp(x | 0, 0, w - 1)) * 4; return (d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11) / 255; };
      ctx.fillStyle = '#F1E8D2'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#2A1E16';
      const sp = 4.6 * u, step = 4 * u;
      for (const [ang, thr] of [[0, 1], [0.62, 0.42]]) {
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const R = Math.hypot(W, H);
        for (let v = -R; v < R; v += sp) {
          const top = [], bot = [];
          let any = false;
          for (let t = -R; t <= R; t += step) {
            const x = W / 2 + t * ca - v * sa, y = H / 2 + t * sa + v * ca;
            if (x < -step || y < -step || x > W + step || y > H + step) continue;
            const l = L(x / 2, y / 2);
            const wd = l < thr ? (thr === 1 ? Math.pow(1 - l, 0.75) * sp * 0.95 : (thr - l) / thr * sp * 0.8) : 0;
            if (wd > 0.2) any = true;
            top.push([x - sa * wd / 2, y + ca * wd / 2 * -1]);
            bot.push([x + sa * wd / 2, y + ca * wd / 2]);
          }
          if (!any || top.length < 2) continue;
          ctx.beginPath();
          top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
          ctx.closePath(); ctx.fill();
        }
      }
      // crisp contour lines
      R2D.drawGroups(ctx, F, { lw: 1.4, fill: 'none', lc: [42, 30, 22], decoLw: 0.7, details: false });
      R2D.drawFx(ctx, F, { lw: 1.4, lc: [42, 30, 22], pal: sepiaPal, fxShine: false, raysA: 0.1 });
      ctx.strokeStyle = '#2A1E16'; ctx.lineWidth = 3 * u; ctx.strokeRect(14 * u, 14 * u, W - 28 * u, H - 28 * u);
      ctx.lineWidth = 1 * u; ctx.strokeRect(20 * u, 20 * u, W - 40 * u, H - 40 * u);
      P.paper(ctx, F, 0.3);
    },
  };

  // ---------------- Comic strip with speech bubble ----------------
  S.comicstrip = {
    name: 'Comic Strip', cat: '2D',
    draw(ctx, F) {
      const { W, H, u, C, S: Sc } = F;
      ctx.fillStyle = '#FBF6E6'; ctx.fillRect(0, 0, W, H);
      const m = 16 * u;
      ctx.save(); ctx.beginPath(); ctx.rect(m, m, W - 2 * m, H - 2 * m); ctx.clip();
      R2D.render(ctx, F, { lw: 4.2, fill: 'cel', pal: (c) => mix(sat(1.2)(c), [255, 240, 200], 0.08), haze: false });
      benDay(ctx, F, 0.16, '120,60,40');
      ctx.restore();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 6 * u; ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
      // caption box
      ctx.fillStyle = '#FFE680'; ctx.lineWidth = 3 * u;
      ctx.fillRect(m, m, 420 * u, 44 * u); ctx.strokeRect(m, m, 420 * u, 44 * u);
      text(ctx, F, 'LATER, AT THE PRESS CONFERENCE...', 0.025, 0.077, 18, { fill: '#111' });
      // speech bubble anchored at Trump's mouth
      const head = C.proj(Sc.trump.head);
      const bx = Math.min(W - 330 * u, head[0] + 70 * u), by = 150 * u, bw = 300 * u, bh = 120 * u;
      ctx.fillStyle = '#FFF'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3.5 * u;
      ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + bw * 0.22, by + bh * 0.85); ctx.lineTo(head[0] + 18 * u, head[1] + 10 * u); ctx.lineTo(bx + bw * 0.38, by + bh * 0.95); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFF'; ctx.fillRect(bx + bw * 0.2, by + bh * 0.8, bw * 0.2, 6 * u);
      ['NOBODY’S EVER SEEN', 'A TURTLE LIKE THAT!'].forEach((l, i) => text(ctx, F, l, (bx + bw / 2) / W, (by + bh * 0.47 + i * 28 * u) / H, 22, { fill: '#111', align: 'center' }));
    },
  };

  // ---------------- Art Deco poster ----------------
  const DECO = ['#111111', '#D4AF37', '#F2E6C8', '#1E5F5F', '#7A1F1F', '#8C7A4B', '#2E2A24'];
  S.artdeco = {
    name: 'Art Deco Poster', cat: 'ART',
    draw(ctx, F) {
      const { W, H, u, C } = F;
      const sn = snap(DECO);
      R2D.render(ctx, F, {
        lw: 2.2, lc: [212, 175, 55], pal: sn, decoLw: 0.6,
        bg(ctx, F) {
          ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, W, H);
          const hy = R2D.horizonY(C);
          ctx.fillStyle = '#1E1B16';
          for (let i = 0; i < 24; i++) {
            const a0 = Math.PI + (i / 24) * Math.PI, a1 = a0 + Math.PI / 48;
            if (i % 2) continue;
            ctx.fillStyle = 'rgba(212,175,55,0.22)';
            ctx.beginPath(); ctx.moveTo(W / 2, hy); ctx.lineTo(W / 2 + Math.cos(a0) * 2000, hy + Math.sin(a0) * 2000); ctx.lineTo(W / 2 + Math.cos(a1) * 2000, hy + Math.sin(a1) * 2000); ctx.fill();
          }
          ctx.fillStyle = '#1E5F5F'; ctx.fillRect(0, hy, W, H - hy);
          ctx.strokeStyle = 'rgba(212,175,55,0.7)'; ctx.lineWidth = 1.5 * u;
          for (let i = 0; i < 12; i++) { const y = hy + (i / 12) ** 1.7 * (H - hy); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        },
        stripes: false, groundShadows: false, fxLw: 2, raysA: 0.15,
      });
      // stepped gold frame
      ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 4 * u;
      ctx.strokeRect(18 * u, 18 * u, W - 36 * u, H - 36 * u);
      ctx.lineWidth = 1.5 * u; ctx.strokeRect(28 * u, 28 * u, W - 56 * u, H - 56 * u);
      for (const [x, y, sx, sy] of [[18, 18, 1, 1], [W / u - 18, 18, -1, 1], [18, H / u - 18, 1, -1], [W / u - 18, H / u - 18, -1, -1]]) {
        ctx.fillStyle = '#D4AF37';
        for (let k = 0; k < 3; k++) ctx.fillRect(x * u + sx * k * 10 * u - (sx < 0 ? 30 * u - k * 10 * u : 0), y * u + sy * k * 10 * u - (sy < 0 ? 10 * u : 0), (30 - k * 10) * u, 10 * u);
      }
      ctx.save();
      ctx.font = `bold ${Math.round(30 * u)}px 'DejaVu Sans', sans-serif`;
      ctx.letterSpacing = `${Math.round(10 * u)}px`;
      ctx.textAlign = 'center'; ctx.fillStyle = '#D4AF37';
      ctx.fillText('THE GREAT TURTLE PARADE', W / 2, 80 * u);
      ctx.restore();
    },
  };

  // ---------------- Shadow puppets ----------------
  S.shadowpuppet = {
    name: 'Shadow Puppets', cat: '2D', fps: 12,
    draw(ctx, F) {
      const { W, H, u, C, S: Sc } = F;
      const g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.1, W / 2, H * 0.5, H * 0.95);
      g.addColorStop(0, '#FFE2A0'); g.addColorStop(0.55, '#F2A64A'); g.addColorStop(1, '#8A3A12');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      R2D.overlayTex(ctx, R2D.canvasTex(), 'overlay', 0.25, 1.5 * u);
      const hy = R2D.horizonY(C);
      ctx.fillStyle = 'rgba(60,25,8,0.35)'; ctx.fillRect(0, hy, W, H - hy);
      ctx.save(); ctx.shadowColor = 'rgba(20,8,2,0.6)'; ctx.shadowBlur = 5 * u;
      R2D.drawGroups(ctx, F, { jitter: 0.8, painter: (ctx, sh, col, F, L, gi, si, grp) => {
        for (const poly of R2D.shapePolys(sh)) {
          ctx.fillStyle = grp && grp.bg ? 'rgba(70,30,10,0.4)' : '#1A0E08';
          ctx.fill(R2D.polyPath(poly));
        }
      } });
      ctx.restore();
      // puppet rods to the hands and turtles
      ctx.strokeStyle = 'rgba(26,14,8,0.9)'; ctx.lineWidth = 3 * u;
      const rods = [];
      if (Sc.trump.hands) Sc.trump.hands.forEach((h) => rods.push(C.proj(h.center)));
      rods.push(C.proj(Sc.turtle.shellTop));
      rods.forEach((p) => { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + (p[0] - W / 2) * 0.15, H + 10); ctx.stroke(); });
      R2D.drawFx(ctx, F, { lw: 0, pal: () => [26, 14, 8], fxShine: false, fxAdd: false, raysA: 0.1 });
      P.vignette(ctx, F, 0.5, '40,12,2');
    },
  };

  // ---------------- Graffiti ----------------
  S.graffiti = {
    name: 'Graffiti', cat: 'ART',
    draw(ctx, F) {
      const { W, H, u, C } = F;
      bricks(ctx, F);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
      const hy = R2D.horizonY(C);
      ctx.save(); ctx.shadowColor = '#3CE06A'; ctx.shadowBlur = 18 * u;
      ctx.fillStyle = 'rgba(60,200,90,0.75)'; ctx.fillRect(-20, hy + 10 * u, W + 40, H);
      ctx.restore();
      R2D.drawShadows(ctx, F, {});
      R2D.drawGroups(ctx, F, { painter: (ctx, sh, col, F, L, gi, si, grp) => {
        const c = sat(1.5, 0.05)(col);
        for (const poly of R2D.shapePolys(sh)) {
          const p = R2D.polyPath(poly, 1.2 * u, gi * 9 + si, F);
          ctx.save(); ctx.shadowColor = rgb(c); ctx.shadowBlur = 9 * u; ctx.fillStyle = rgb(c, grp && grp.bg ? 0.55 : 0.95); ctx.fill(p); ctx.restore();
          if (!(grp && grp.bg)) {
            ctx.strokeStyle = '#0A0A0A'; ctx.lineWidth = (sh.deco ? 1.6 : 4.2) * u; ctx.lineJoin = 'round'; ctx.stroke(p);
            if (!sh.deco && hash(gi, si, 5) < 0.25 && sh.bb) {
              ctx.strokeStyle = rgb(c, 0.85); ctx.lineWidth = 2.4 * u;
              const x = lerp(sh.bb[0], sh.bb[2], hash(gi, si, 6)), y = sh.bb[3] - 2 * u, len = (10 + 30 * hash(gi, si, 7)) * u;
              ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
              ctx.beginPath(); ctx.arc(x, y + len, 2.4 * u, 0, TAU); ctx.fillStyle = rgb(c); ctx.fill();
            }
          }
        }
      } });
      R2D.drawFx(ctx, F, { lw: 3, pal: sat(1.4) });
      text(ctx, F, 'TRUMP ♥ TURTLES', 0.5, 0.16, 64, { font: "'Permanent Marker', sans-serif", align: 'center', fill: '#FF3FA4', stroke: '#111', sw: 7, rot: -0.05 });
    },
  };

  // ---------------- Cave painting ----------------
  S.cave = {
    name: 'Cave Painting', cat: 'ART', fps: 8,
    draw(ctx, F) {
      const { W, H, u } = F;
      const rock = cachedTex('rock', W, H, (x, W, H) => {
        const id = x.createImageData(W, H);
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
          const n = 0.55 * noise2(i * 0.006, j * 0.006, 1) + 0.3 * noise2(i * 0.03, j * 0.03, 2) + 0.15 * noise2(i * 0.12, j * 0.12, 3);
          const o = (j * W + i) * 4;
          id.data[o] = 196 + n * 40; id.data[o + 1] = 160 + n * 36; id.data[o + 2] = 118 + n * 30; id.data[o + 3] = 255;
        }
        x.putImageData(id, 0, 0);
      });
      ctx.drawImage(rock, 0, 0);
      const ochre = (c) => { const l = lum(c); return l < 0.3 ? [46, 34, 26] : l < 0.62 ? [142, 58, 30] : [196, 132, 58]; };
      R2D.drawGroups(ctx, F, { painter: (ctx, sh, col, F, L, gi, si, grp) => {
        const c = ochre(col);
        for (const poly of R2D.shapePolys(sh)) {
          const p = R2D.polyPath(poly, 2 * u, gi * 5 + si, F);
          if (grp && grp.bg) { ctx.strokeStyle = rgb(c, 0.4); ctx.lineWidth = 2 * u; ctx.stroke(p); continue; }
          ctx.fillStyle = rgb(c, 0.82); ctx.fill(p);
          if (sh.deco) continue;
          ctx.strokeStyle = 'rgba(40,28,20,0.5)'; ctx.lineWidth = 1.6 * u; ctx.stroke(p);
        }
      } });
      R2D.drawFx(ctx, F, { lw: 0, pal: (c) => ochre(c), fxShine: false, fxAdd: false, raysA: 0.1 });
      // hand stencils
      const hand = (x, y, s, a) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
        ctx.fillStyle = 'rgba(150,50,25,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 60, 0, TAU); ctx.fill();
        ctx.fillStyle = rgb([200, 160, 118]);
        ctx.beginPath(); ctx.ellipse(0, 10, 22, 26, 0, 0, TAU); ctx.fill();
        [[-20, -20, -0.5], [-8, -30, -0.15], [6, -32, 0.1], [18, -26, 0.35], [28, 4, 1.1]].forEach(([fx, fy, fa]) => { ctx.save(); ctx.translate(fx, fy); ctx.rotate(fa); ctx.beginPath(); ctx.ellipse(0, -10, 6, 18, 0, 0, TAU); ctx.fill(); ctx.restore(); });
        ctx.restore();
      };
      hand(80 * u, 120 * u, u, -0.3); hand(W - 110 * u, 150 * u, 0.9 * u, 0.4);
      R2D.overlayTex(ctx, R2D.paperTex(), 'multiply', 0.3, 3 * u);
      P.vignette(ctx, F, 0.6, '40,25,10');
    },
  };

  // ---------------- Neon sign ----------------
  S.neon = {
    name: 'Neon Sign', cat: '2D',
    draw(ctx, F) {
      const { W, H, u } = F;
      bricks(ctx, F, [52, 30, 34], [20, 14, 16]);
      ctx.fillStyle = 'rgba(5,0,15,0.55)'; ctx.fillRect(0, 0, W, H);
      const neonCol = (c, sh) => { const h = toHsl(c)[0], l = lum(c); return l > 0.85 ? [255, 255, 255] : h > 0.45 && h < 0.75 ? [60, 220, 255] : h > 0.2 && h < 0.45 ? [90, 255, 120] : h < 0.06 || h > 0.9 ? [255, 50, 120] : [255, 210, 60]; };
      R2D.drawGroups(ctx, F, { painter: (ctx, sh, col, F, L, gi, si, grp) => {
        if (grp && grp.bg) { ctx.globalAlpha = 0.35; neonTube({ color: neonCol, fill: false, lw: 1.6, blur: 8 })(ctx, sh, col, F, L, gi, si); ctx.globalAlpha = 1; return; }
        neonTube({ color: neonCol, fill: false, lw: 2.8, blur: 16 })(ctx, sh, col, F, L, gi, si);
      } });
      R2D.drawFx(ctx, F, { lw: 0, pal: (c) => sat(1.5, 0.1)(c) });
      P.glow(ctx, F, 12, 0.5);
      // flickering sign
      const on = hash(F.hold, 3) > 0.12;
      text(ctx, F, 'TRUMP ♥ TURTLES', 0.5, 0.12, 46, { font: "'Permanent Marker', sans-serif", align: 'center', fill: on ? '#FFE8F6' : '#5A2A44', stroke: on ? '#FF3FA4' : '#3A1A2A', sw: 6 });
    },
  };

  // ---------------- Vaporwave ----------------
  S.vaporwave = {
    name: 'Vaporwave', cat: 'RETRO',
    draw(ctx, F) {
      const { W, H, u, C } = F;
      const vap = (c) => { const h = toHsl(c); return fromHsl([0.78 + h[0] * 0.25, clamp(h[1] * 0.7 + 0.25), clamp(h[2] * 0.75 + 0.22)]); };
      const hy = R2D.horizonY(C);
      R2D.render(ctx, F, {
        lw: 2.4, lc: [90, 40, 140], pal: vap,
        bg(ctx, F) {
          const g = ctx.createLinearGradient(0, 0, 0, hy);
          g.addColorStop(0, '#2A1B5C'); g.addColorStop(0.5, '#FF71CE'); g.addColorStop(1, '#01CDFE');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 1);
          ctx.fillStyle = '#FFFB96'; ctx.beginPath(); ctx.arc(W * 0.72, hy - H * 0.12, H * 0.13, 0, TAU); ctx.fill();
          // checkerboard floor
          for (let i = -30; i < 30; i++) for (let k = 0; k < 40; k++) {
            if ((i + k) % 2) continue;
            const z0 = 4 - k * 1.2, z1 = z0 - 1.2;
            const q = [C.proj([i * 1.2, 0, z0]), C.proj([i * 1.2 + 1.2, 0, z0]), C.proj([i * 1.2 + 1.2, 0, z1]), C.proj([i * 1.2, 0, z1])];
            if (q[0][2] <= 0) continue;
            ctx.fillStyle = '#B967FF'; ctx.beginPath(); q.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.fill();
          }
          ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#05FFA1'; ctx.fillRect(0, hy, W, H - hy); ctx.globalCompositeOperation = 'source-over';
        },
        stripes: false, groundShadows: true, fxLw: 2, raysA: 0.15,
      });
      P.chroma(ctx, F, 3);
      P.scanlines(ctx, F, 0.12, 3);
      text(ctx, F, 'トランプ ♥ カメ', 0.5, 0.13, 40, { font: "'IPAGothic', 'WenQuanYi Zen Hei', sans-serif", align: 'center', fill: '#FFFFFF', stroke: '#FF71CE', sw: 4 });
    },
  };

  // ---------------- Glitch ----------------
  S.glitch = {
    name: 'Glitch Art', cat: 'OTHER',
    draw(ctx, F) {
      const { W, H, u, hold } = F;
      const src = base(F, { lw: 3, pal: sat(1.3) }, 'gl');
      ctx.drawImage(src, 0, 0);
      P.chroma(ctx, F, 7);
      const R = rng(hold * 101 + 7);
      for (let i = 0; i < 14; i++) {
        const y = R() * H, h = (4 + R() * 46) * u, dx = (R() - 0.5) * 140 * u;
        ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
        if (R() < 0.3) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = R() < 0.5 ? '#00FFFF' : '#FF00FF'; ctx.fillRect(0, y, W, h * 0.5); ctx.restore(); }
      }
      for (let i = 0; i < 8; i++) {
        const w = (30 + R() * 160) * u, h = (10 + R() * 60) * u;
        ctx.drawImage(src, R() * W, R() * H, w, h, R() * W, R() * H, w, h);
      }
      P.scanlines(ctx, F, 0.1, 2);
    },
  };

  // ---------------- Oscilloscope ----------------
  S.oscilloscope = {
    name: 'Oscilloscope Vector', cat: 'RETRO',
    draw(ctx, F) {
      const { W, H, u } = F;
      ctx.fillStyle = '#020A04'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(70,160,90,0.25)'; ctx.lineWidth = 1 * u;
      for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * W / 10, 0); ctx.lineTo(i * W / 10, H); ctx.stroke(); }
      for (let j = 1; j < 8; j++) { ctx.beginPath(); ctx.moveTo(0, j * H / 8); ctx.lineTo(W, j * H / 8); ctx.stroke(); }
      R2D.drawGroups(ctx, F, { painter: (ctx, sh, col, F, L, gi, si, grp) => {
        ctx.globalAlpha = grp && grp.bg ? 0.35 : 1;
        neonTube({ color: () => [120, 255, 140], fill: false, lw: 1.5, blur: 9, core: 0.7, wob: 0.4 })(ctx, sh, col, F, L, gi, si);
        ctx.globalAlpha = 1;
      } });
      R2D.drawFx(ctx, F, { lw: 0, pal: () => [140, 255, 150], fxShine: false });
      P.glow(ctx, F, 8, 0.6);
      P.scanlines(ctx, F, 0.1, 2);
      ctx.save();
      ctx.fillStyle = '#000';
      const crt = new Path2D();
      crt.rect(0, 0, W, H);
      const rx = 22 * u, ry = 18 * u, rw = W - 44 * u, rh = H - 36 * u, rr = 60 * u;
      crt.moveTo(rx + rr, ry); crt.arcTo(rx + rw, ry, rx + rw, ry + rh, rr); crt.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
      crt.arcTo(rx, ry + rh, rx, ry, rr); crt.arcTo(rx, ry, rx + rw, ry, rr); crt.closePath();
      ctx.fill(crt, 'evenodd');
      ctx.restore();
      P.vignette(ctx, F, 0.5);
    },
  };

  // ---------------- Laser show ----------------
  S.laser = {
    name: 'Laser Show', cat: 'OTHER',
    draw(ctx, F) {
      const { W, H, u, t } = F;
      ctx.fillStyle = '#02030A'; ctx.fillRect(0, 0, W, H);
      const haze = ctx.createLinearGradient(0, H * 0.4, 0, H);
      haze.addColorStop(0, 'rgba(40,40,90,0)'); haze.addColorStop(1, 'rgba(60,50,120,0.35)');
      ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const beams = ['rgba(60,255,90,0.22)', 'rgba(255,40,60,0.2)', 'rgba(60,120,255,0.22)'];
      for (let i = 0; i < 12; i++) {
        const sx = (i % 2 ? 0.15 : 0.85) * W, a = -Math.PI / 2 + Math.sin(t * 2 + i) * 0.9;
        ctx.strokeStyle = beams[i % 3]; ctx.lineWidth = 3 * u;
        ctx.beginPath(); ctx.moveTo(sx, H); ctx.lineTo(sx + Math.cos(a) * 2000, H + Math.sin(a) * 2000); ctx.stroke();
      }
      ctx.restore();
      const lc = (c) => { const h = toHsl(c)[0]; return h > 0.45 && h < 0.75 ? [80, 140, 255] : h > 0.15 && h < 0.45 ? [80, 255, 100] : [255, 50, 70]; };
      R2D.drawGroups(ctx, F, { painter: (ctx, sh, col, F, L, gi, si, grp) => {
        ctx.globalAlpha = grp && grp.bg ? 0.4 : 1;
        neonTube({ color: lc, fill: false, lw: 1.8, blur: 12, core: 0.8 })(ctx, sh, col, F, L, gi, si);
        ctx.globalAlpha = 1;
      } });
      R2D.drawFx(ctx, F, { lw: 0, pal: (c) => sat(1.6, 0.1)(c) });
      P.glow(ctx, F, 14, 0.7);
    },
  };

  // ---------------- Impressionism ----------------
  S.impressionist = {
    name: 'Impressionist', cat: 'ART', fps: 10,
    draw(ctx, F) {
      const src = base(F, { lw: 0, fill: 'shade', pal: (c) => mix(sat(1.15)(c), [255, 245, 225], 0.1) }, 'imp');
      ctx.save(); ctx.filter = 'blur(4px)'; ctx.drawImage(src, 0, 0); ctx.restore();
      strokes(ctx, F, src, { gw: 320, count: 15000, len: [7, 7], w: [4.5, 3], angle: 0.1, jitterCol: 0.09, satK: 1.2, alpha: 0.9 });
      P.weave(ctx, F, 0.2);
    },
  };

  // ---------------- Van Gogh ----------------
  S.vangogh = {
    name: 'Van Gogh Swirls', cat: 'ART', fps: 10,
    draw(ctx, F) {
      const { W, H } = F;
      const vg = (c) => { const h = toHsl(c); const hh = h[0] > 0.45 && h[0] < 0.75 ? h[0] + 0.02 : h[0]; return fromHsl([hh, clamp(h[1] * 1.35), h[2]]); };
      const src = base(F, { lw: 2, lc: [30, 40, 70], pal: vg }, 'vg');
      ctx.drawImage(src, 0, 0);
      const vort = [[0.2, 0.18], [0.55, 0.12], [0.85, 0.25], [0.35, 0.32]];
      const flow = (x, y) => {
        let best = 0, a = 0.2;
        for (const [vx, vy] of vort) {
          const dx = x - vx, dy = (y - vy) * 0.56, d = Math.hypot(dx, dy) + 0.02;
          const w = 1 / (d * d);
          if (w > best) { best = w; a = Math.atan2(dy, dx) + Math.PI / 2; }
        }
        return y < 0.45 ? a : 0.15 + noise2(x * 6, y * 6, 4) * 0.8;
      };
      strokes(ctx, F, src, { gw: 300, count: 10500, len: [12, 12], w: [4.5, 3], flow, curve: 0.8, outline: true, jitterCol: 0.05, satK: 1.25 });
      P.weave(ctx, F, 0.2);
    },
  };

  // ---------------- Pop-up book ----------------
  S.popup = {
    name: 'Pop-Up Book', cat: 'CRAFT',
    draw(ctx, F) {
      const { W, H, u } = F;
      ctx.fillStyle = '#5B3A22'; ctx.fillRect(0, 0, W, H);
      const px = 34 * u, py = 26 * u, pw = W - 68 * u, ph = H - 46 * u;
      // page stack edges
      for (let i = 6; i > 0; i--) { ctx.fillStyle = i % 2 ? '#E9DFC8' : '#D9CDB2'; roundRect(ctx, px - i * 2 * u, py + i * 2 * u, pw + i * 4 * u, ph, 8 * u); ctx.fill(); }
      const [c, x] = R2D.scratch('pop', Math.round(pw), Math.round(ph));
      const C2 = R2D.camera(F.S.cam, c.width, c.height);
      const F2 = { ...F, W: c.width, H: c.height, C: C2, u: c.height / 720 };
      F2.groups = R2D.buildGroups(F.S, C2);
      R2D.render(x, F2, { lw: 0, sky: 'flat', haze: false, sunGlow: false,
        painter: (ctx, sh, col, F, L, gi, si, grp) => {
          for (const poly of R2D.shapePolys(sh)) {
            const p = R2D.polyPath(poly);
            if (!(grp && grp.bg) && !sh.deco) {
              ctx.save(); ctx.shadowColor = 'rgba(40,25,10,0.45)'; ctx.shadowBlur = 8 * F.u; ctx.shadowOffsetX = 5 * F.u; ctx.shadowOffsetY = 7 * F.u;
              ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 7 * F.u; ctx.lineJoin = 'round'; ctx.stroke(p); ctx.restore();
            }
            ctx.fillStyle = rgb(col); ctx.fill(p);
            if (sh.deco) { ctx.strokeStyle = 'rgba(30,20,10,0.6)'; ctx.lineWidth = 1 * F.u; ctx.stroke(p); }
          }
        }, fxLw: 2.5 });
      R2D.overlayTex(x, R2D.paperTex(), 'multiply', 0.25, 2 * F.u);
      ctx.save(); roundRect(ctx, px, py, pw, ph, 8 * u); ctx.clip(); ctx.drawImage(c, px, py); ctx.restore();
      // center fold shading
      const g = ctx.createLinearGradient(W / 2 - 50 * u, 0, W / 2 + 50 * u, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(40,25,10,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(W / 2 - 50 * u, py, 100 * u, ph);
      // pull tab
      ctx.fillStyle = '#E2363C'; roundRect(ctx, W - 130 * u, H - 64 * u, 86 * u, 34 * u, 6 * u); ctx.fill();
      text(ctx, F, 'PULL →', (W - 87 * u) / W, (H - 40 * u) / H, 17, { align: 'center', fill: '#FFF' });
    },
  };

  // ---------------- Silent film ----------------
  S.silentfilm = {
    name: 'Silent Film', cat: '2D', fps: 16,
    draw(ctx, F) {
      const { W, H, u } = F;
      const R = rng(F.hold * 13 + 5);
      ctx.save(); ctx.translate((R() - 0.5) * 4 * u, (R() - 0.5) * 5 * u);
      R2D.render(ctx, F, { lw: 2.6, lc: [30, 22, 14], pal: (c) => sepiaPal(grayPal(1.2)(c)), fill: 'shade', raysA: 0.15 });
      ctx.restore();
      P.grain(ctx, F, 0.42);
      flicker(ctx, F, 0.1);
      filmDamage(ctx, F, 1.6);
      P.vignette(ctx, F, 0.85, '20,12,4');
      // ornate intertitle frame
      ctx.strokeStyle = 'rgba(240,225,190,0.8)'; ctx.lineWidth = 3 * u;
      ctx.strokeRect(26 * u, 22 * u, W - 52 * u, H - 44 * u);
      ctx.lineWidth = 1 * u; ctx.strokeRect(34 * u, 30 * u, W - 68 * u, H - 60 * u);
    },
  };

  // ---------------- Technicolor iris-out ----------------
  S.iris = {
    name: '1940s Color Cartoon', cat: '2D',
    draw(ctx, F) {
      const { W, H, u, b } = F;
      R2D.render(ctx, F, { lw: 3.6, lc: [38, 20, 18], fill: 'shade', pal: (c) => mix(sat(1.4, 0.02)(c), [255, 200, 120], 0.06), theEnd: false });
      P.glow(ctx, F, 10, 0.2);
      P.grain(ctx, F, 0.14);
      if (b > 79.2) {
        const a = clamp((b - 79.2) / 0.3);
        ctx.save(); ctx.globalAlpha = a;
        ctx.font = `${Math.round(110 * u)}px 'Luckiest Guy', sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const g = ctx.createLinearGradient(0, H * 0.32, 0, H * 0.52);
        g.addColorStop(0, '#FFE04A'); g.addColorStop(1, '#FF5A2E');
        ctx.lineWidth = 12 * u; ctx.strokeStyle = '#4A1A10'; ctx.strokeText('THE END', W / 2, H * 0.42 + 6 * u);
        ctx.fillStyle = g; ctx.fillText('THE END', W / 2, H * 0.42);
        ctx.font = `${Math.round(30 * u)}px 'Luckiest Guy', sans-serif`;
        ctx.fillStyle = '#7FD36B'; ctx.fillText('(slow and steady wins the race)', W / 2, H * 0.55);
        ctx.restore();
      }
    },
  };
})();
