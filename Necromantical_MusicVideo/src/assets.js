// Necromantical — pre-rendered textures (built once at load, deterministically).
'use strict';
(function () {
  const { canvas, clamp, hash2, lerp } = NM;

  // horizontally/vertically periodic value noise so textures tile seamlessly
  function pnoise(x, y, px, py) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const m = (v, p) => ((v % p) + p) % p;
    const x0 = m(ix, px), x1 = m(ix + 1, px), y0 = m(iy, py), y1 = m(iy + 1, py);
    return lerp(lerp(hash2(x0, y0), hash2(x1, y0), ux), lerp(hash2(x0, y1), hash2(x1, y1), ux), uy);
  }
  function pfbm(x, y, px, py, oct) {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += a * pnoise(x * f + i * 31, y * f + i * 57, px * f, py * f); n += a; f *= 2; a *= 0.5; }
    return s / n;
  }
  function noiseTex(w, h, cellsX, cellsY, oct, fn) {
    const c = canvas(w, h), g = c.getContext('2d');
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = pfbm((x / w) * cellsX, (y / h) * cellsY, cellsX, cellsY, oct);
        const o = (y * w + x) * 4;
        const [r, gg, b, a] = fn(v, x / w, y / h);
        d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = a;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  const A = (NM.A = {});
  NM.buildAssets = function () {
    // clouds: soft billows, white with alpha
    A.clouds = noiseTex(1024, 512, 6, 3, 6, (v, x, y) => {
      const a = clamp((v - 0.42) * 3.2);
      const shade = 150 + 105 * clamp((v - 0.4) * 2);
      return [shade, shade, shade + 12, a * 255];
    });
    // thin wispy clouds
    A.wisps = noiseTex(1024, 256, 10, 2, 5, (v) => {
      const a = clamp((v - 0.5) * 4) ** 1.5;
      return [210, 214, 230, a * 200];
    });
    // ground fog band (tileable horizontally, fades top & bottom)
    A.fog = noiseTex(1024, 256, 8, 2, 5, (v, x, y) => {
      const band = Math.sin(Math.PI * y) ** 1.6;
      const a = clamp((v - 0.3) * 1.8) * band;
      return [190, 198, 220, a * 255];
    });
    // stone wall / crypt texture (opaque, dark)
    A.stone = noiseTex(512, 512, 8, 8, 5, (v, x, y) => {
      const s = 18 + v * 34;
      return [s, s + 2, s + 9, 255];
    });
    // grain tiles
    A.grain = [];
    for (let k = 0; k < 6; k++) {
      const w = 320, c = canvas(w, w), g = c.getContext('2d');
      const img = g.createImageData(w, w), d = img.data;
      for (let i = 0; i < w * w; i++) {
        const v = (hash2(i, k * 7919) + hash2(i * 3, k + 11) + hash2(i * 7, k + 23)) / 3; // ~gaussian
        const s = clamp((v - 0.5) * 3 + 0.5) * 255;
        d[i * 4] = s; d[i * 4 + 1] = s; d[i * 4 + 2] = s; d[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      A.grain.push(c);
    }
    // vignette
    {
      const c = canvas(NM.W, NM.H), g = c.getContext('2d');
      const r = g.createRadialGradient(NM.W / 2, NM.H / 2, NM.H * 0.32, NM.W / 2, NM.H / 2, NM.W * 0.62);
      r.addColorStop(0, 'rgba(0,0,0,0)');
      r.addColorStop(0.6, 'rgba(0,0,0,0.35)');
      r.addColorStop(1, 'rgba(0,0,0,0.92)');
      g.fillStyle = r; g.fillRect(0, 0, NM.W, NM.H);
      A.vignette = c;
    }
  };

  // radial glow sprite, cached by color (soft falloff, premultiplied look when drawn with 'lighter')
  const glowCache = {};
  NM.glowSprite = function (hex, hard = 0) {
    const key = hex + '|' + hard;
    if (glowCache[key]) return glowCache[key];
    const s = 256, c = canvas(s, s), g = c.getContext('2d');
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, NM.rgba(hex, 1));
    r.addColorStop(0.08 + hard * 0.3, NM.rgba(hex, 0.75));
    r.addColorStop(0.3 + hard * 0.3, NM.rgba(hex, 0.25));
    r.addColorStop(0.6, NM.rgba(hex, 0.07));
    r.addColorStop(1, NM.rgba(hex, 0));
    g.fillStyle = r; g.fillRect(0, 0, s, s);
    return (glowCache[key] = c);
  };
  // draw a glow (additive) centred at x,y with radius rad
  NM.glow = function (ctx, x, y, rad, hex, alpha = 1, mode = 'lighter', hard = 0) {
    if (alpha <= 0.003 || rad <= 0.5) return;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.drawImage(NM.glowSprite(hex, hard), x - rad, y - rad, rad * 2, rad * 2);
    ctx.restore();
  };
})();
