// Necromantical — pixel-art finishing. Shots are drawn at 640x360, colour-graded, given a little
// bloom, then snapped to the shot's own limited palette with ordered (Bayer) dithering. Transitions
// dissolve through a dither pattern, and the frame is upscaled 3x with hard pixel edges. The UI is
// drawn on its own 640x360 layer with pixel fonts and dithered transparency.
'use strict';
(function () {
  const { clamp, W, H } = NM;
  const RW = NM.RW, RH = NM.RH, SC = W / RW;

  // ---------- ordered dither matrices ----------
  const B8 = (() => {
    const m = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
      [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]];
    const out = new Float32Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out[y * 8 + x] = (m[y][x] + 0.5) / 64;
    return out;
  })();
  NM.bayer = (x, y) => B8[(y & 7) * 8 + (x & 7)];

  // ---------- palettes ----------
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  // colours every shot keeps so the cast reads the same everywhere
  NM.PAL_ACCENT = ['#05030a', '#f4ece4', '#ff3a52', '#c4122f', '#6a0a18', '#ffcf7a', '#b9e6ff', '#ecd3c6'];
  const DEFAULT = ['#05030a', '#140c1a', '#24182c', '#38243c', '#4e3450', '#6a4a66', '#8a6a80', '#b098a8', '#d8c8d0', '#f4ece4',
    '#1a1420', '#2a2a40', '#40466a', '#6a7aa0', '#a0b0d0', '#3a0a14', '#6a0a18', '#a3122a', '#e0203c', '#ff6a7a', '#ffcf7a', '#c08040', '#5a3a20', '#b9e6ff', '#ecd3c6'];
  const palCache = new Map();
  function getPal(list) {
    const key = list.join('');
    if (palCache.has(key)) return palCache.get(key);
    const cols = list.map(hex), n = cols.length;
    const R = new Uint8Array(n), G = new Uint8Array(n), B = new Uint8Array(n);
    cols.forEach(([r, g, b], i) => { R[i] = r; G[i] = g; B[i] = b; });
    const lut = new Uint8Array(32768), dist = new Uint8Array(32768);
    for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
      const rr = r * 8 + 4, gg = g * 8 + 4, bb = b * 8 + 4;
      let best = 0, bd = 1e12;
      for (let i = 0; i < n; i++) {
        const rm = (rr + R[i]) / 2, dr = rr - R[i], dg = gg - G[i], db = bb - B[i];
        const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
        if (d < bd) { bd = d; best = i; }
      }
      const c = (r << 10) | (g << 5) | b;
      lut[c] = best; dist[c] = Math.min(255, Math.sqrt(bd) / 2);
    }
    const P = { R, G, B, lut, dist, n };
    palCache.set(key, P);
    return P;
  }
  // k-means palette from RGB samples (deterministic), plus the shared accent colours
  NM.kmeansPalette = function (S, K = 28, iters = 12) {
    const n = S.length / 3, R0 = NM.rng(7);
    const C = new Float64Array(K * 3), D = new Float64Array(n).fill(1e18);
    const dist = (i, k) => { const dr = S[i * 3] - C[k * 3], dg = S[i * 3 + 1] - C[k * 3 + 1], db = S[i * 3 + 2] - C[k * 3 + 2]; return 2 * dr * dr + 4 * dg * dg + 3 * db * db; };
    let i0 = Math.floor(R0() * n); C[0] = S[i0 * 3]; C[1] = S[i0 * 3 + 1]; C[2] = S[i0 * 3 + 2];
    for (let k = 1; k < K; k++) { // k-means++ seeding
      let tot = 0;
      for (let i = 0; i < n; i++) { D[i] = Math.min(D[i], dist(i, k - 1)); tot += D[i]; }
      let r = R0() * tot, j = 0;
      for (; j < n - 1; j++) { r -= D[j]; if (r <= 0) break; }
      C[k * 3] = S[j * 3]; C[k * 3 + 1] = S[j * 3 + 1]; C[k * 3 + 2] = S[j * 3 + 2];
    }
    const A = new Int32Array(n);
    for (let it = 0; it < iters; it++) {
      const sum = new Float64Array(K * 4);
      for (let i = 0; i < n; i++) { let b = 0, bd = 1e18; for (let k = 0; k < K; k++) { const d = dist(i, k); if (d < bd) { bd = d; b = k; } } A[i] = b; sum[b * 4] += S[i * 3]; sum[b * 4 + 1] += S[i * 3 + 1]; sum[b * 4 + 2] += S[i * 3 + 2]; sum[b * 4 + 3]++; }
      for (let k = 0; k < K; k++) if (sum[k * 4 + 3]) { C[k * 3] = sum[k * 4] / sum[k * 4 + 3]; C[k * 3 + 1] = sum[k * 4 + 1] / sum[k * 4 + 3]; C[k * 3 + 2] = sum[k * 4 + 2] / sum[k * 4 + 3]; }
    }
    const out = [];
    const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
    for (let k = 0; k < K; k++) {
      // a touch more saturation and contrast than the raw cluster mean
      let r = C[k * 3], g = C[k * 3 + 1], b = C[k * 3 + 2];
      const l = 0.3 * r + 0.59 * g + 0.11 * b;
      r = l + (r - l) * 1.12; g = l + (g - l) * 1.12; b = l + (b - l) * 1.12;
      const f = l < 60 ? 0.9 : 1;
      out.push(toHex(r * f, g * f, b * f));
    }
    for (const a of NM.PAL_ACCENT) {
      const [ar, ag, ab] = hex(a);
      const near = out.some((h) => { const [r, g, b] = hex(h); return 2 * (r - ar) ** 2 + 4 * (g - ag) ** 2 + 3 * (b - ab) ** 2 < 1800; });
      if (!near) out.push(a);
    }
    return [...new Set(out)];
  };
  NM.PALETTES = /[?&]nopal=1/.test(location.search) ? null : window.NM_PALETTES || null;
  NM.shotPalette = (shot) => (shot && NM.PALETTES && NM.PALETTES[shot.name]) || DEFAULT;

  // snap every pixel to the palette; dither only where the colour falls between palette entries
  NM.quantize = function (cv, list, amt = 1) {
    const P = getPal(list), { R, G, B, lut, dist } = P;
    const g = cv.getContext('2d');
    const img = g.getImageData(0, 0, cv.width, cv.height), d = img.data, w = cv.width, h = cv.height;
    const A = 34 * amt, FLAT = 7;
    for (let y = 0; y < h; y++) {
      const by = (y & 7) * 8;
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        const c0 = ((d[o] >> 3) << 10) | ((d[o + 1] >> 3) << 5) | (d[o + 2] >> 3);
        let i;
        if (dist[c0] < FLAT) i = lut[c0];
        else {
          const k = (B8[by + (x & 7)] - 0.5) * A;
          let r = d[o] + k, gg = d[o + 1] + k, b = d[o + 2] + k;
          r = r < 0 ? 0 : r > 255 ? 255 : r; gg = gg < 0 ? 0 : gg > 255 ? 255 : gg; b = b < 0 ? 0 : b > 255 ? 255 : b;
          i = lut[((r >> 3) << 10) | ((gg >> 3) << 5) | (b >> 3)];
        }
        d[o] = R[i]; d[o + 1] = G[i]; d[o + 2] = B[i]; d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  };

  // dither dissolve: reveal src over dst where the Bayer threshold is below k
  NM.dissolve = function (dst, src, k) {
    const gd = dst.getContext('2d'), gs = src.getContext('2d');
    const a = gd.getImageData(0, 0, RW, RH), b = gs.getImageData(0, 0, RW, RH), da = a.data, db = b.data;
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      if (B8[(y & 7) * 8 + (x & 7)] < k) { const o = (y * RW + x) * 4; da[o] = db[o]; da[o + 1] = db[o + 1]; da[o + 2] = db[o + 2]; }
    }
    gd.putImageData(a, 0, 0);
  };
  // dithered fade towards a flat colour
  NM.ditherFill = function (cv, k, col = '#000000') {
    if (k <= 0) return;
    const [cr, cg, cb] = hex(col);
    const g = cv.getContext('2d'), img = g.getImageData(0, 0, RW, RH), d = img.data;
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      if (B8[(y & 7) * 8 + (x & 7)] < k) { const o = (y * RW + x) * 4; d[o] = cr; d[o + 1] = cg; d[o + 2] = cb; }
    }
    g.putImageData(img, 0, 0);
  };

  // ---------- per-shot finishing at render resolution (before quantize) ----------
  let half, halfB, fin, vig;
  function ensure() {
    if (fin) return;
    half = NM.canvas(RW / 2, RH / 2); halfB = NM.canvas(RW / 2, RH / 2); fin = NM.canvas(RW, RH);
    vig = NM.canvas(RW, RH);
    const vg = vig.getContext('2d');
    const r = vg.createRadialGradient(RW / 2, RH * 0.48, RH * 0.32, RW / 2, RH / 2, RW * 0.68);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(0.6, 'rgba(8,2,6,0.25)'); r.addColorStop(1, 'rgba(4,0,2,0.8)');
    vg.fillStyle = r; vg.fillRect(0, 0, RW, RH);
  }
  NM.pixelStage = function (cv, shot, post) {
    ensure();
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    NM.grade(g, post.grade);
    if (post.vignette > 0) { g.globalAlpha = post.vignette * 0.85; g.drawImage(vig, 0, 0); g.globalAlpha = 1; }
    if (post.bloom > 0.01) {
      const hg = half.getContext('2d'), bg = halfB.getContext('2d');
      hg.globalCompositeOperation = 'copy'; hg.filter = 'brightness(1.05) contrast(2.6)'; hg.drawImage(cv, 0, 0, RW / 2, RH / 2); hg.filter = 'none';
      bg.globalCompositeOperation = 'copy'; bg.filter = 'blur(3px)'; bg.drawImage(half, 0, 0); bg.filter = 'none';
      g.globalCompositeOperation = 'screen'; g.globalAlpha = post.bloom * 0.9; g.drawImage(halfB, 0, 0, RW, RH);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    if (post.flash > 0.004) {
      g.globalCompositeOperation = 'screen'; g.globalAlpha = clamp(post.flash); g.fillStyle = post.flashColor; g.fillRect(0, 0, RW, RH);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    if (post.quantize !== false) NM.quantize(cv, post.palette || NM.shotPalette(shot), post.dither ?? 1);
  };

  // ---------- upscale to 1080p with hard pixels, shake in whole pixels ----------
  NM.finishPixel = function (main, scene, t, P) {
    ensure();
    const f = fin.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'copy'; f.drawImage(scene, 0, 0); f.globalCompositeOperation = 'source-over';
    if (P.chroma > 0.01) {
      const off = Math.max(1, Math.round(P.chroma * 3));
      f.globalCompositeOperation = 'lighter'; f.globalAlpha = 0.5;
      f.drawImage(scene, -off, 0); f.globalCompositeOperation = 'multiply'; f.globalAlpha = 1;
      f.fillStyle = '#ff9a9a'; f.fillRect(0, 0, RW, RH);
      f.globalCompositeOperation = 'source-over';
    }
    if (P.glitch > 0.01) {
      const fr = Math.floor(t * 30), n = Math.floor(4 + P.glitch * 12);
      for (let i = 0; i < n; i++) {
        const y = Math.floor(NM.hash1(fr * 31 + i) * RH), h = 1 + Math.floor(NM.hash1(fr * 17 + i * 3) * 16 * P.glitch);
        const dx = Math.round((NM.hash1(fr * 7 + i * 13) - 0.5) * 70 * P.glitch);
        f.drawImage(scene, 0, y, RW, h, dx, y, RW, h);
      }
    }
    const ctx = main.getContext('2d');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    let sx = 0, sy = 0;
    if (P.shake > 0) { sx = Math.round(NM.fbm1(t * 14 + 3.1, 2) * P.shake * 5) * SC; sy = Math.round(NM.fbm1(t * 14 + 71.7, 2) * P.shake * 3.5) * SC; }
    ctx.drawImage(fin, sx, sy, W, H);
    // fill edges revealed by the shake with the border pixels
    if (sx > 0) ctx.drawImage(fin, 0, 0, 1, RH, 0, sy, sx, H);
    if (sx < 0) ctx.drawImage(fin, RW - 1, 0, 1, RH, W + sx, sy, -sx, H);
    if (sy > 0) ctx.drawImage(fin, 0, 0, RW, 1, sx, 0, W, sy);
    if (sy < 0) ctx.drawImage(fin, 0, RH - 1, RW, 1, sx, H + sy, W, -sy);
    ctx.restore();
  };

  // ---------- pixel UI layer ----------
  // Fonts set on the UI context are remapped to pixel fonts at sizes that land on whole pixels.
  const fontDesc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
  function pixFont(f) {
    const m = /(\d+(?:\.\d+)?)px\s+"?([^",]+)"?/.exec(f);
    if (!m) return f;
    const size = +m[1], fam = m[2].trim(), bold = /\b(700|bold)\b/.test(f);
    if (/Unifraktur/.test(fam) && size >= 90) return f;
    if (/Unifraktur/.test(fam)) return `700 ${size >= 70 ? 72 : 48}px "Pixelify Sans"`;
    if (/IM Fell/.test(fam)) return `${size <= 62 ? 48 : 96}px "DotGothic16"`;
    if (/Cinzel/.test(fam)) return `${bold ? '700 ' : ''}${size <= 62 ? 48 : 96}px "Pixelify Sans"`;
    return f;
  }
  NM.pixFont = pixFont;
  NM.rawFont = (g, f) => fontDesc.set.call(g, f);
  // device-space position of a point under the context's current transform
  NM.devXY = (g, x, y) => { const m = g.getTransform(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, m.a]; };
  // palette for the small portrait cameos in the UI
  NM.PAL_PORTRAIT = ['#05030a', '#140c18', '#241a2c', '#3a2c48', '#56486a', '#2a1218', '#4a1e28', '#fbeee6', '#ecd3c6', '#d8b0a4', '#b07c7a', '#7a4a52',
    '#e8ebf0', '#c4c8d2', '#8a90a6', '#5e6478', '#3a0a14', '#7a0e22', '#c4122f', '#ff4a62', '#ff9aa8', '#bfe9ff', '#7ab0d8', '#ffcf7a', '#3a2a1a', '#d8cce2'];
  let ui = null;
  NM.uiLayerBegin = function () {
    if (!ui) {
      ui = NM.layer();
      const c = ui.getContext('2d');
      Object.defineProperty(c, 'font', { configurable: true, get() { return fontDesc.get.call(this); }, set(v) { fontDesc.set.call(this, pixFont(v)); } });
    }
    return NM.beginLayer(ui);
  };
  // dithered alpha: solid where opaque, Bayer-pattern holes where translucent
  NM.uiLayerCommit = function (main) {
    const c = ui.getContext('2d');
    const img = c.getImageData(0, 0, RW, RH), d = img.data;
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      const o = (y * RW + x) * 4 + 3, a = d[o];
      if (a === 0 || a === 255) continue;
      const af = a / 255;
      if (af > B8[(y & 7) * 8 + (x & 7)] * 0.9 + 0.05) d[o] = 255;
      else d[o] = 0;
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.putImageData(img, 0, 0);
    const ctx = main.getContext('2d');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(ui, 0, 0, W, H); ctx.restore();
  };
})();
