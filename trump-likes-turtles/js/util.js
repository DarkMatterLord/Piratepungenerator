// Small math / random / color helpers shared by every module.
window.U = (() => {
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const ease = {
    linear: (t) => t,
    smooth,
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    out: (t) => 1 - (1 - t) * (1 - t),
    in: (t) => t * t,
    outBack: (t) => {
      const c1 = 1.9, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: (t) =>
      t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1,
  };
  // 0 before a, 1 after b, eased in between.
  const ramp = (x, a, b, e = smooth) => e(clamp((x - a) / (b - a)));
  // Bump: rises over [a,b], holds, falls over [c,d].
  const bump = (x, a, b, c, d) => ramp(x, a, b) * (1 - ramp(x, c, d));
  // Piecewise keyframes: keys = [[time, value], ...] (value may be number or array).
  function keys(x, ks, e = smooth) {
    if (x <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) {
      if (x <= ks[i][0]) {
        const [t0, v0] = ks[i - 1], [t1, v1] = ks[i];
        const f = e((x - t0) / (t1 - t0 || 1));
        if (Array.isArray(v0)) return v0.map((v, j) => lerp(v, v1[j], f));
        return lerp(v0, v1, f);
      }
    }
    return ks[ks.length - 1][1];
  }

  // Deterministic hashing / PRNG.
  function hash(a, b = 0, c = 0) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Smooth 1D/2D value noise in [-1, 1].
  function noise1(x, seed = 0) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u);
  }
  function noise2(x, y, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed);
    const c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
  }

  // Colors are [r, g, b] in 0..255.
  function hex(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = (c, a = 1) =>
    a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  const scale = (c, k) => [clamp(c[0] * k, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k, 0, 255)];
  function toHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }
  function fromHsl([h, s, l]) {
    h = ((h % 1) + 1) % 1;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => {
      t = ((t % 1) + 1) % 1;
      return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  // Ramp through a list of hex/rgb stops at x in 0..1.
  function gradient(stops, x) {
    x = clamp(x) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    const a = typeof stops[i] === 'string' ? hex(stops[i]) : stops[i];
    const b = typeof stops[i + 1] === 'string' ? hex(stops[i + 1]) : stops[i + 1];
    return mix(a, b, x - i);
  }
  // Closest palette color using the "redmean" approximation of perceived distance.
  function nearest(c, pal) {
    let best = pal[0], bd = Infinity;
    for (const p of pal) {
      const rm = (c[0] + p[0]) / 2, dr = c[0] - p[0], dg = c[1] - p[1], db = c[2] - p[2];
      const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // 3D vectors as plain arrays.
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
    lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
  };
  // 3x3 matrices stored row-major as arrays of 9; columns are the local axes.
  const m3 = {
    id: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
    rx: (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; },
    ry: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; },
    rz: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; },
    mul: (A, B) => {
      const r = new Array(9);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          r[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
      return r;
    },
    ap: (M, v) => [
      M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
      M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
      M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
    ],
    // Rotation that maps local +Y onto direction d (used for capsules/cylinders).
    alignY: (d) => {
      const y = v3.norm(d);
      const ref = Math.abs(y[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
      const x = v3.norm(v3.cross(ref, y));
      const z = v3.cross(x, y);
      return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
    },
    toQuat: (M) => {
      const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = M;
      const tr = m00 + m11 + m22;
      let x, y, z, w;
      if (tr > 0) {
        const s = Math.sqrt(tr + 1) * 2;
        w = 0.25 * s; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s;
      } else if (m00 > m11 && m00 > m22) {
        const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
        w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s;
      } else if (m11 > m22) {
        const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
        w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s;
      } else {
        const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
        w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s;
      }
      return [x, y, z, w];
    },
  };

  // Two-bone IK: root -> mid -> end reaching for target, mid bends toward hint.
  function ik(root, target, l1, l2, hint) {
    let d = v3.sub(target, root);
    let dist = v3.len(d);
    const maxR = (l1 + l2) * 0.999, minR = Math.abs(l1 - l2) + 1e-3;
    const dn = v3.norm(d);
    if (dist > maxR) { dist = maxR; target = v3.add(root, v3.mul(dn, maxR)); }
    if (dist < minR) { dist = minR; target = v3.add(root, v3.mul(dn, minR)); }
    const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    // Component of the hint perpendicular to the bone line.
    let perp = v3.sub(hint, v3.mul(dn, v3.dot(hint, dn)));
    if (v3.len(perp) < 1e-5) perp = Math.abs(dn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    perp = v3.norm(perp);
    const mid = v3.add(v3.add(root, v3.mul(dn, a)), v3.mul(perp, h));
    return { mid, end: target };
  }

  // Convex hull (Andrew's monotone chain) of 2D points [[x,y],...].
  function hull(pts) {
    if (pts.length < 3) return pts.slice();
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
      lo.push(q);
    }
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
      up.push(q);
    }
    up.pop(); lo.pop();
    return lo.concat(up);
  }

  return {
    TAU, clamp, lerp, smooth, ease, ramp, bump, keys, hash, rng, noise1, noise2,
    hex, rgb, mix, lum, scale, toHsl, fromHsl, gradient, nearest, v3, m3, ik, hull,
  };
})();
