// Necromantical — painterly finishing: oil-paint (soft Kuwahara) filter built on summed-area
// tables, "boiling" brush-stroke texture, canvas weave, and colour grading.
'use strict';
(function () {
  const { canvas, clamp, hash2, noise2, fbm2, TAU } = NM;

  // ---------- soft Kuwahara (generalised, 4 box sectors, O(1) per pixel via SATs) ----------
  let bufs = null;
  function ensure(w, h) {
    const n = (w + 1) * (h + 1);
    if (bufs && bufs.n === n) return bufs;
    bufs = { n, R: new Float64Array(n), G: new Float64Array(n), B: new Float64Array(n), L: new Float64Array(n), L2: new Float64Array(n) };
    return bufs;
  }
  // sharp: exponent of the variance weighting (higher -> crisper strokes)
  NM.kuwahara = function (cv, r = 5, sharp = 4) {
    const w = cv.width, h = cv.height, W1 = w + 1;
    const g = cv.getContext('2d');
    const img = g.getImageData(0, 0, w, h), d = img.data;
    const { R, G, B, L, L2 } = ensure(w, h);
    // build summed-area tables
    for (let y = 0; y < h; y++) {
      let sr = 0, sg = 0, sb = 0, sl = 0, sl2 = 0;
      const row = (y + 1) * W1, prev = y * W1;
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        const r0 = d[o], g0 = d[o + 1], b0 = d[o + 2];
        const lum = (r0 * 77 + g0 * 150 + b0 * 29) / 256;
        sr += r0; sg += g0; sb += b0; sl += lum; sl2 += lum * lum;
        const i = row + x + 1, j = prev + x + 1;
        R[i] = R[j] + sr; G[i] = G[j] + sg; B[i] = B[j] + sb; L[i] = L[j] + sl; L2[i] = L2[j] + sl2;
      }
    }
    const out = img.data; // safe: we only read from the SATs now
    const qx0 = [0, 0, 0, 0], qx1 = [0, 0, 0, 0], qy0 = [0, 0, 0, 0], qy1 = [0, 0, 0, 0];
    for (let y = 0; y < h; y++) {
      const ya = Math.max(0, y - r), yb = Math.min(h - 1, y + r);
      for (let x = 0; x < w; x++) {
        const xa = Math.max(0, x - r), xb = Math.min(w - 1, x + r);
        qx0[0] = xa; qx1[0] = x; qy0[0] = ya; qy1[0] = y;
        qx0[1] = x; qx1[1] = xb; qy0[1] = ya; qy1[1] = y;
        qx0[2] = xa; qx1[2] = x; qy0[2] = y; qy1[2] = yb;
        qx0[3] = x; qx1[3] = xb; qy0[3] = y; qy1[3] = yb;
        let wsum = 0, ar = 0, ag = 0, ab = 0;
        for (let q = 0; q < 4; q++) {
          const a = qy0[q] * W1 + qx0[q], b = qy0[q] * W1 + qx1[q] + 1, c = (qy1[q] + 1) * W1 + qx0[q], e = (qy1[q] + 1) * W1 + qx1[q] + 1;
          const n = (qx1[q] - qx0[q] + 1) * (qy1[q] - qy0[q] + 1);
          const ml = (L[e] - L[b] - L[c] + L[a]) / n;
          const v = (L2[e] - L2[b] - L2[c] + L2[a]) / n - ml * ml;
          const wq = 1 / (1 + Math.pow(Math.max(0, v) / 40, sharp / 2));
          wsum += wq;
          ar += wq * (R[e] - R[b] - R[c] + R[a]) / n;
          ag += wq * (G[e] - G[b] - G[c] + G[a]) / n;
          ab += wq * (B[e] - B[b] - B[c] + B[a]) / n;
        }
        const o = (y * w + x) * 4;
        out[o] = ar / wsum; out[o + 1] = ag / wsum; out[o + 2] = ab / wsum;
      }
    }
    g.putImageData(img, 0, 0);
  };

  // ---------- textures ----------
  const TX = (NM.TX = {});
  function strokeTexture(seed, size = 1024) {
    const c = canvas(size, size), g = c.getContext('2d');
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, size, size);
    const R = NM.rng(seed);
    g.lineCap = 'round';
    for (let i = 0; i < 9000; i++) {
      const x = R() * size, y = R() * size;
      // flow field: strokes follow a slowly turning direction (tileable via wrap draws)
      const a = fbm2(x * 0.004 + seed, y * 0.004 - seed, 3) * Math.PI * 1.4 + 0.6;
      const len = 14 + R() * 38, wid = 4 + R() * 9;
      const v = Math.round(128 + (R() - 0.5) * 70);
      const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
      const bow = (R() - 0.5) * len * 0.25;
      for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
        const cx = x + ox, cy = y + oy;
        if (cx < -60 || cx > size + 60 || cy < -60 || cy > size + 60) continue;
        // bristles: a few parallel thin lines of slightly varied value
        const nb = 4;
        for (let b = 0; b < nb; b++) {
          const off = (b / (nb - 1) - 0.5) * wid;
          const vv = clamp(v + (R() - 0.5) * 30, 0, 255) | 0;
          g.strokeStyle = `rgba(${vv},${vv},${vv},${0.18 + R() * 0.2})`;
          g.lineWidth = wid / nb + 0.8;
          g.beginPath();
          g.moveTo(cx - dx * len / 2 + nx * off, cy - dy * len / 2 + ny * off);
          g.quadraticCurveTo(cx + nx * (off + bow), cy + ny * (off + bow), cx + dx * len / 2 + nx * off, cy + dy * len / 2 + ny * off);
          g.stroke();
        }
      }
    }
    return c;
  }
  function weaveTexture(size = 256) {
    const c = canvas(size, size), g = c.getContext('2d');
    const img = g.createImageData(size, size), d = img.data;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const wv = Math.sin((x / 3) * Math.PI) * Math.sin((y / 3) * Math.PI);
      const thread = ((Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? 1 : -1) * wv;
      const v = 128 + thread * 18 + (hash2(x, y) - 0.5) * 26 + noise2(x * 0.05, y * 0.05) * 10;
      const o = (y * size + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = clamp(v, 0, 255); d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function grainTexture(k, size = 512) {
    const c = canvas(size, size), g = c.getContext('2d');
    const img = g.createImageData(size, size), d = img.data;
    for (let i = 0; i < size * size; i++) {
      const v = 128 + ((hash2(i, k * 131) + hash2(i * 7, k + 3) + hash2(i * 13, k + 9)) / 3 - 0.5) * 120;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function blotchTexture(seed, w = 960, h = 540) {
    const c = canvas(w, h), g = c.getContext('2d');
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = fbm2(x * 0.006 + seed, y * 0.006 - seed, 5);
      const hue = fbm2(x * 0.004 - seed * 2, y * 0.004 + 11, 3);
      const o = (y * w + x) * 4;
      const base = 128 + v * 120;
      d[o] = clamp(base + hue * 40, 0, 255); d[o + 1] = clamp(base - Math.abs(hue) * 18, 0, 255); d[o + 2] = clamp(base - hue * 34, 0, 255); d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  NM.buildPaintTextures = function () {
    TX.blotch = [blotchTexture(3), blotchTexture(17)];
    TX.strokes = [strokeTexture(11), strokeTexture(23), strokeTexture(37)];
    TX.weave = weaveTexture();
    TX.grain = [0, 1, 2, 3].map((k) => grainTexture(k));
  };

  function tiled(g, tex, alpha, mode, ox = 0, oy = 0, scale = 1) {
    g.save();
    g.globalCompositeOperation = mode; g.globalAlpha = alpha;
    const p = g.createPattern(tex, 'repeat');
    g.translate(-ox, -oy); g.scale(scale, scale);
    g.fillStyle = p; g.fillRect(ox / scale, oy / scale, NM.W / scale + tex.width, NM.H / scale + tex.height);
    g.restore();
  }
  NM.tiled = tiled;

  // ---------- the painterly pass applied to every scene frame ----------
  // P.paint: { r, sharp, strokes, weave }  (per-shot overrides via S.post.paint)
  NM.paintPass = function (cv, t, P) {
    const g = cv.getContext('2d');
    const pp = P.paint || {};
    // uneven paint: soft low-frequency value/hue variation that slowly drifts
    if ((pp.blotch ?? 0.3) > 0) {
      const k = (Math.sin(t * 0.21) + 1) / 2;
      g.save(); g.globalCompositeOperation = 'soft-light';
      g.globalAlpha = (pp.blotch ?? 0.3) * (1 - k); g.drawImage(TX.blotch[0], 0, 0, NM.W, NM.H);
      g.globalAlpha = (pp.blotch ?? 0.3) * k; g.drawImage(TX.blotch[1], 0, 0, NM.W, NM.H);
      g.restore();
    }
    if ((pp.r ?? 5) > 0) {
      NM.kuwahara(cv, pp.r ?? 5, pp.sharp ?? 2);
      // dissolve the box-sector edges with a light half-strength blur
      const tmp = NM._paintTmp || (NM._paintTmp = canvas(cv.width, cv.height));
      const tg = tmp.getContext('2d');
      tg.globalCompositeOperation = 'copy'; tg.filter = `blur(${pp.soften ?? 1.2}px)`; tg.drawImage(cv, 0, 0); tg.filter = 'none';
      g.save(); g.globalAlpha = 0.5; g.drawImage(tmp, 0, 0); g.restore();
    }
    // boiling brush strokes: the stroke layer changes a few times per second, like a hand-painted animation
    const f = Math.floor(t * 30 / 4);
    const tex = TX.strokes[f % TX.strokes.length];
    tiled(g, tex, pp.strokes ?? 0.55, 'overlay', (hash2(f, 1) * 512) | 0, (hash2(f, 2) * 512) | 0);
    tiled(g, TX.weave, pp.weave ?? 0.22, 'soft-light');
  };

  // ---------- colour grade ----------
  // grade: { shadow: '#hex', light: '#hex', amount }
  NM.grade = function (g, G) {
    if (!G) return;
    g.save();
    if (G.shadow) { g.globalCompositeOperation = 'soft-light'; g.globalAlpha = G.amount ?? 0.45; const gr = g.createLinearGradient(0, 0, 0, NM.H); gr.addColorStop(0, G.light || G.shadow); gr.addColorStop(1, G.shadow); g.fillStyle = gr; g.fillRect(0, 0, NM.W, NM.H); }
    if (G.lift) { g.globalCompositeOperation = 'lighten'; g.globalAlpha = 1; g.fillStyle = G.lift; g.fillRect(0, 0, NM.W, NM.H); }
    g.restore();
  };
})();
