// Necromantical — pixel-art pipeline: limited palettes + ordered (Bayer) dithering.
// Scenes draw at 480x270 with ordinary canvas calls; quantize() snaps every pixel to the
// shot's palette so the result reads as hand-placed pixel art (RPG Maker horror style).
'use strict';
(function () {
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);

  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  // Shared accent colours (blood, rose, skin, candle, soul) appear in most palettes so the
  // characters keep their colours from scene to scene.
  const ACCENT = ['#3a0a14', '#7a0e22', '#c4122f', '#ff3a52', '#ff8a9a', '#f6d6c8', '#d9a59a', '#a8706a', '#ffcf7a', '#b9e6ff', '#f2f0ea', '#07060b'];
  const PAL = {
    // exterior night: indigo sky, slate stone, cold grass, dirt
    night: ['#120f1c', '#1d1a2e', '#2b2a45', '#3d3f63', '#5a6287', '#8a93b8', '#c8cfe6',
      '#14201b', '#1c2a24', '#2c4235', '#456148', '#2e2420', '#4a3a2e', '#6e5640', '#6b4a8a', '#ff9a3a', '#3b1f3a', ...ACCENT],
    // Symbiosis-style maroon / salmon CG palette
    blood: ['#0e0709', '#1f0e12', '#35151b', '#561d25', '#7c2630', '#a8353a', '#d0554f', '#ec8a7a', '#f6b9a6', '#fde4d6', '#2a1a24', '#4a2a38', '#ff3a52', '#ffcf7a'],
    // mansion interior: wine wallpaper, dark wood, gold
    mansion: ['#0b0709', '#1c1114', '#2e1a1e', '#46262a', '#633236', '#8c4448', '#2a1d16', '#3a2a22', '#5c4130', '#83603f', '#b08850', '#e8c070',
      '#2a2440', '#433a63', '#6a5d8a', '#9a92b8', '#141826', ...ACCENT],
    // crypt / ghost: blue-violet (Ao Oni vibe)
    crypt: ['#05050a', '#0f0f1e', '#1b1b33', '#2a2a4d', '#3c3a6b', '#57528f', '#7d73b5', '#a89bd8', '#d6cdf0', '#2e2420', '#4a3a2e', ...ACCENT],
    // flashback sepia
    sepia: ['#140e0a', '#2b1f16', '#45321f', '#634a2e', '#86663f', '#a98652', '#c9a86c', '#e6cd96', '#f6ead0', '#8a3a2a', '#c4564a'],
    // ballroom: crimson, gold, marble
    ballroom: ['#0a0608', '#1e0f12', '#3a1418', '#6a0f1e', '#2a2228', '#4a3e44', '#7a6a70', '#c9bcc0', '#5c4130', '#b08850', '#e8c070', '#ffe6a8', '#6b4a8a', '#2b2a45', ...ACCENT],
    // portraits: skin ramp + hair + eyes
    portrait: ['#07060b', '#141022', '#221c36', '#332c4f', '#4c4570', '#fde8dc', '#f6d6c8', '#e9bfb2', '#d9a59a', '#b77f7a', '#8a5a5e',
      '#3a0a14', '#7a0e22', '#c4122f', '#ff3a52', '#ff8a9a', '#ffd0d6', '#f2f0ea', '#c8cfe6', '#8a93b8', '#5a6287', '#b9e6ff', '#ffcf7a', '#2c2030', '#9a8fa8', '#6a6080'],
    // undead husband portrait: colder skin
    corpse: ['#07060b', '#141022', '#221c36', '#332c4f', '#4c4570', '#dfe4ea', '#c3cad6', '#a3abbd', '#7f879c', '#5c6278', '#3a3f52',
      '#3a0a14', '#7a0e22', '#c4122f', '#ff3a52', '#f2f0ea', '#b9e6ff', '#7fc4e6', '#ffcf7a', '#5a4a3a', '#2c2030', '#f6d6c8', '#d9a59a'],
    // the single's cover art: grey stone, black chains, one crimson rose
    cover: ['#08080a', '#141418', '#24242a', '#36363e', '#4c4c54', '#66666e', '#86868c', '#a6a6aa', '#c8c8ca', '#e6e6e6',
      '#3a0a14', '#7a0e22', '#c4122f', '#ff3a52', '#14180f', '#2a3020', '#46503a'],
    // pure monochrome for jump-scare frames
    scare: ['#000000', '#1a0004', '#4a000c', '#9a0018', '#e0102a', '#ff6070', '#ffd6da', '#ffffff'],
  };
  // Per-palette dither strength (in 0..255 units)
  const DITHER = { cover: 22, night: 26, blood: 30, mansion: 24, crypt: 26, sepia: 30, ballroom: 24, portrait: 18, corpse: 18, scare: 40 };

  const cache = {};
  function getPal(name) {
    if (cache[name]) return cache[name];
    const cols = PAL[name].map(hex);
    const n = cols.length;
    const R = new Uint8Array(n), G = new Uint8Array(n), B = new Uint8Array(n);
    cols.forEach(([r, g, b], i) => { R[i] = r; G[i] = g; B[i] = b; });
    // 32^3 LUT -> nearest palette index (redmean perceptual distance)
    const lut = new Uint8Array(32768);
    const dist = new Uint8Array(32768); // distance to nearest colour (flat areas skip dithering)
    for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
      const rr = r * 8 + 4, gg = g * 8 + 4, bb = b * 8 + 4;
      let best = 0, bd = 1e12;
      for (let i = 0; i < n; i++) {
        const rm = (rr + R[i]) / 2, dr = rr - R[i], dg = gg - G[i], db = bb - B[i];
        const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
        if (d < bd) { bd = d; best = i; }
      }
      lut[(r << 10) | (g << 5) | b] = best;
      dist[(r << 10) | (g << 5) | b] = Math.min(255, Math.sqrt(bd));
    }
    return (cache[name] = { R, G, B, lut, dist, n, cols: PAL[name] });
  }
  NM.PAL = PAL;
  NM.palColor = (name, i) => PAL[name][i];

  // Quantize the whole canvas (or a region) in place.
  NM.quantize = function (cv, name = 'night', amt = 1, x = 0, y = 0, w = cv.width, h = cv.height) {
    const P = getPal(name);
    const g = cv.getContext('2d');
    const img = g.getImageData(x, y, w, h), d = img.data;
    const A = (DITHER[name] ?? 24) * amt;
    const { R, G, B, lut, dist } = P;
    const FLAT = 22;
    for (let yy = 0; yy < h; yy++) {
      const by = ((yy + y) & 3) * 4;
      for (let xx = 0; xx < w; xx++) {
        const o = (yy * w + xx) * 4;
        if (d[o + 3] === 0) continue;
        const c0 = ((d[o] >> 3) << 10) | ((d[o + 1] >> 3) << 5) | (d[o + 2] >> 3);
        if (dist[c0] < FLAT) { const i0 = lut[c0]; d[o] = R[i0]; d[o + 1] = G[i0]; d[o + 2] = B[i0]; d[o + 3] = d[o + 3] < 128 ? 0 : 255; continue; }
        const k = BAYER4[by + ((xx + x) & 3)] * A;
        let r = d[o] + k, gg = d[o + 1] + k, b = d[o + 2] + k;
        r = r < 0 ? 0 : r > 255 ? 255 : r; gg = gg < 0 ? 0 : gg > 255 ? 255 : gg; b = b < 0 ? 0 : b > 255 ? 255 : b;
        const i = lut[((r >> 3) << 10) | ((gg >> 3) << 5) | (b >> 3)];
        d[o] = R[i]; d[o + 1] = G[i]; d[o + 2] = B[i];
        d[o + 3] = d[o + 3] < 128 ? 0 : 255;
      }
    }
    g.putImageData(img, x, y);
  };

  // Hard-threshold alpha (removes anti-aliasing halos from text / UI art)
  NM.hardAlpha = function (cv, thr = 110) {
    const g = cv.getContext('2d');
    const img = g.getImageData(0, 0, cv.width, cv.height), d = img.data;
    for (let o = 3; o < d.length; o += 4) d[o] = d[o] < thr ? 0 : 255;
    g.putImageData(img, 0, 0);
  };

  // Glitch: shift horizontal slices (deterministic per frame)
  NM.glitch = function (cv, t, amt) {
    if (amt <= 0.01) return;
    const g = cv.getContext('2d');
    const f = Math.floor(t * 30);
    const n = Math.floor(3 + amt * 10);
    for (let i = 0; i < n; i++) {
      const y = Math.floor(NM.hash1(f * 31 + i) * cv.height);
      const h = 1 + Math.floor(NM.hash1(f * 17 + i * 3) * 10 * amt);
      const dx = Math.round((NM.hash1(f * 7 + i * 13) - 0.5) * 60 * amt);
      g.drawImage(cv, 0, y, cv.width, h, dx, y, cv.width, h);
    }
  };
})();
