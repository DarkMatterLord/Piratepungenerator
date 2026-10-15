/*
 * Asriel Dreemurr (God of Hyperdeath) · Reaper of the Void
 * R1 chain animation reference: low horizontal reap → rising reverse hook →
 * advancing waist hook → overhead diagonal reap → recovery to guard.
 *
 * Pure code, no assets. A small 3D rig (FK spine, two-bone IK arms and legs,
 * planted feet that may only pivot on the ball), a keyframed weapon that both
 * hands grip, spring-driven secondary motion (ears, mane, robe hem) and a
 * Canvas 2D renderer that depth-sorts projected primitives.
 *
 * Units: metres, seconds, degrees. World axes: +x = Asriel's starting right,
 * +y = up, +z = toward the target. Positive yaw turns to the right.
 *
 * Works in the browser (window.ReaperAnim) and in Node (require) for the
 * pose/validation functions; rendering needs a Canvas 2D context.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReaperAnim = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 1920, H = 1080, FPS = 60, DURATION = 8;
  const D2R = Math.PI / 180;

  // ------------------------------------------------------------------ math
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); };
  const UP = [0, 1, 0];

  // Orthonormal frame {r, u, f}. Yaw + turns right, pitch + raises f, roll + raises r.
  // Built from a yaw-only right vector, so pitch may pass ±90° without flipping.
  function frameYPR(yaw, pitch, roll) {
    const y = yaw * D2R, p = pitch * D2R, ro = roll * D2R;
    const f = [Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)];
    const rf = [Math.cos(y), 0, -Math.sin(y)];
    const u0 = cross(f, rf);
    const c = Math.cos(ro), s = Math.sin(ro);
    return { r: add(mul(rf, c), mul(u0, s)), u: add(mul(rf, -s), mul(u0, c)), f };
  }
  // local (x right, y up, z forward) → world
  const lw = (o, F, x, y, z) => [
    o[0] + F.r[0] * x + F.u[0] * y + F.f[0] * z,
    o[1] + F.r[1] * x + F.u[1] * y + F.f[1] * z,
    o[2] + F.r[2] * x + F.u[2] * y + F.f[2] * z,
  ];
  const ldir = (F, x, y, z) => norm(lw([0, 0, 0], F, x, y, z));

  // Monotone cubic (PCHIP) channel: smooth through keys, no overshoot, holds on
  // repeated values (planted feet stay exactly planted).
  function channel(keys, name) {
    const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]);
    for (let i = 1; i < n; i++) if (!(xs[i] > xs[i - 1])) throw new Error(`channel ${name}: keys out of order at ${xs[i]}`);
    if (n === 1) return () => ys[0];
    const h = [], d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] > 0) {
        const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
    }
    return t => {
      if (t <= xs[0]) return ys[0];
      if (t >= xs[n - 1]) return ys[n - 1];
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= t) lo = mid; else hi = mid; }
      const i = lo, s = (t - xs[i]) / h[i], s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h[i] * m[i] +
        (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h[i] * m[i + 1];
    };
  }

  // ------------------------------------------------------------ appearance
  // Matched to the reference sheet: white-furred goat face and long white hair,
  // black ram horns, a thin gold halo, black armour with gold filigree and a
  // glowing heart, spiked pauldrons, a floor-length galaxy coat with a tattered
  // hem over a front tabard, white fur tufts at wrists and shins, black
  // hoof-boots. Weapon: black shaft with gold fittings, twin galaxy crescents
  // with gold rims and a white star at the head.
  const LOOK = {
    fur: ['#fdfbf9', '#e6e1e9', '#a9a1b3'], furLine: '#2a2131',
    armor: ['#423c4d', '#18151d', '#060508'], armorLine: '#020203',
    gold: ['#f8e6b0', '#cfa865', '#7a5a28'], goldLine: 'rgba(48,32,10,0.85)', goldThin: 'rgba(222,190,120,0.92)',
    horn: ['#625c69', '#1c1920', '#040305'], hornLine: '#000000', hornRidge: 'rgba(130,122,140,0.5)',
    eye: '#f1ecff', eyeLine: '#100816', brow: '#2c2333', nose: '#191118',
    heart: '#ffffff', heartCore: '#3a2160', glow: [226, 206, 255],
    coatShade: [3, 2, 8], liningShade: [10, 6, 24],
    shaft: ['#3d3943', '#141217', '#040405'], shaftLine: '#000000',
    headPiece: ['#3a2a5c', '#1a1230', '#07050e'],
    galaxy: { base: ['#05041a', '#130c3a', '#09061f'], nebula: [[106, 63, 208], [59, 79, 216], [154, 63, 192], [40, 22, 96]] },
    trailInner: [16, 6, 30], trailOuter: [150, 92, 255],
  };

  // ------------------------------------------------------------------- rig
  const RIG = {
    thigh: 0.50, shin: 0.50, hipHalf: 0.11, hipDrop: 0.06,
    spine: 0.55, shoulderHalf: 0.215,
    upper: 0.32, fore: 0.34, protract: 0.07,     // fore includes the hand up to the grip
    shaft: 2.15, uAnchor: 0.40,                  // butt (u=0) → head (u=shaft)
  };
  // Foot points relative to the ball contact (forward, up): sphere centres.
  const FOOT = { heel: [-0.155, 0.048], ankle: [-0.112, 0.092], ball: [0, 0.046], toe: [0.085, 0.036] };
  // Blade outline in (s, t): s outward along the blade direction, t along the
  // shaft (+ beyond the head). Traced from the reference sheet (1 px ≈ 2.4 mm).
  const BLADE = {
    // main crescent: outer back (spine) and inner cutting edge, root → tip
    spine: [[0.06, 0.07], [0.10, 0.115], [0.20, 0.11], [0.31, 0.075], [0.42, 0.01], [0.51, -0.08], [0.57, -0.19],
      [0.60, -0.31], [0.59, -0.43], [0.55, -0.55], [0.48, -0.66], [0.40, -0.74], [0.33, -0.79]],
    edge: [[0.10, -0.075], [0.18, -0.09], [0.27, -0.12], [0.36, -0.18], [0.42, -0.26], [0.46, -0.36], [0.465, -0.46],
      [0.44, -0.57], [0.40, -0.67], [0.33, -0.79]],
    // rear crescent hooking upward on the opposite side
    backLow: [[-0.05, -0.035], [-0.16, -0.025], [-0.25, 0.04], [-0.31, 0.15]],
    backHigh: [[-0.05, 0.05], [-0.14, 0.055], [-0.22, 0.085], [-0.31, 0.15]],
    // head piece the blades are seated in
    head: [[-0.075, -0.045], [0.12, -0.075], [0.12, 0.09], [-0.07, 0.055]],
  };
  // Resample a polyline at k ∈ [0,1] by arc length (Catmull-Rom smoothed).
  function polyAt(P, k) {
    const segs = []; let total = 0;
    for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); segs.push(l); total += l; }
    let dd = clamp(k, 0, 1) * total, i = 0;
    while (i < segs.length - 1 && dd > segs[i]) { dd -= segs[i]; i++; }
    const t = segs[i] ? dd / segs[i] : 0, t2 = t * t, t3 = t2 * t;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const f = j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
    return [f(0), f(1)];
  }

  // ----------------------------------------------------------- choreography
  // Keys are [time s, value]. Angles in degrees. Interpolated with PCHIP.
  //   pelvis: px/py/pz root position, pYaw, pPitch (forward tilt), pRoll (+ raises right hip)
  //   chest:  sYaw (twist relative to pelvis), lean (forward), sRoll
  //   weapon: aR/aU/aF grip anchor offset from the shoulder line in the chest's yaw
  //           frame; wYaw/wPitch/wRoll shaft orientation (world); uL/uR hand grips
  //           along the shaft (left hand at the butt, right hand leads).
  //   feet:   ball position (bx, bz), yaw, heel lift (deg, pivots on the ball), lift (m)
  //
  // Beats: 0.00 guard · 0.50–1.72 R1·1 · 1.72–2.58 R1·2 · 2.58–3.58 R1·3 ·
  //        3.58–5.00 R1·4 · 5.00–7.15 recovery · 7.15–8.00 guard
  const KEYS = {
    px: [[0, .06], [.50, .06], [1.02, .10], [1.30, .00], [1.48, -.04], [1.72, -.05], [2.00, .06], [2.36, .07], [2.58, .06],
      [2.80, .02], [2.96, -.02], [3.10, -.03], [3.34, -.04], [3.58, -.03], [4.22, .07], [4.62, -.03], [5.00, -.04], [5.50, -.02],
      [6.20, .04], [7.15, .06], [8, .06]],
    pz: [[0, -.02], [.50, -.02], [1.02, -.07], [1.30, .06], [1.48, .10], [1.72, .11], [2.00, -.04], [2.22, -.03], [2.58, -.03],
      [2.70, .02], [2.84, .14], [2.96, .26], [3.10, .33], [3.22, .38], [3.34, .42], [3.58, .42], [4.22, .30], [4.32, .30],
      [4.48, .44], [4.62, .56], [5.00, .58], [5.50, .50], [6.20, .40], [7.15, .38], [8, .38]],
    py: [[0, .93], [.50, .93], [1.02, .89], [1.30, .86], [1.48, .86], [1.72, .87], [1.86, .85], [2.00, .84], [2.22, .91],
      [2.36, .96], [2.58, .95], [2.70, .94], [2.84, .92], [2.96, .89], [3.10, .88], [3.34, .87], [3.58, .89], [4.22, .98],
      [4.32, .98], [4.48, .91], [4.62, .82], [4.75, .79], [5.00, .80], [5.50, .87], [6.20, .93], [8, .93]],
    pYaw: [[0, 30], [.50, 31], [1.02, 44], [1.10, 40], [1.30, -8], [1.48, -40], [1.72, -48], [1.86, -40], [2.00, -34],
      [2.12, -16], [2.22, 6], [2.36, 26], [2.58, 30], [2.84, 33], [3.00, 34], [3.10, 30], [3.22, 8], [3.34, -14], [3.58, -16],
      [3.80, 2], [4.22, 26], [4.32, 27], [4.48, 0], [4.62, -20], [5.00, -22], [5.50, -6], [6.20, 18], [7.15, 30], [8, 30]],
    pPitch: [[0, 10], [1.02, 12], [1.48, 8], [2.36, 4], [3.10, 10], [4.22, 2], [4.62, 16], [5.00, 18], [6.08, 10], [8, 10]],
    pRoll: [[0, 0], [1.30, 3], [2.00, -2], [2.36, -3], [2.84, 4], [3.10, 0], [4.22, -3], [4.62, 3], [5.82, -4], [6.45, 0], [8, 0]],
    sYaw: [[0, 10], [.50, 11], [1.02, 20], [1.10, 24], [1.30, -14], [1.48, -30], [1.72, -34], [1.86, -30], [2.00, -32],
      [2.12, -24], [2.22, -1], [2.36, 14], [2.58, 18], [2.84, 14], [3.00, 12], [3.10, 16], [3.22, -4], [3.34, -22], [3.58, -22],
      [3.80, -6], [4.22, 18], [4.32, 19], [4.48, 4], [4.62, -6], [5.00, -6], [5.50, 0], [6.20, 6], [7.15, 10], [8, 10]],
    lean: [[0, 16], [.50, 16], [1.02, 20], [1.30, 13], [1.48, 14], [1.72, 17], [2.00, 22], [2.22, 10], [2.36, 4], [2.58, 5],
      [2.84, 10], [3.10, 14], [3.34, 16], [3.58, 15], [4.22, -3], [4.32, -4], [4.48, 12], [4.62, 30], [5.00, 33], [5.50, 22],
      [6.08, 15], [7.15, 16], [8, 16]],
    sRoll: [[0, 0], [1.02, -4], [1.48, 6], [2.00, 8], [2.36, -8], [2.58, -6], [3.10, -2], [3.34, 4], [4.22, -10], [4.62, 8],
      [5.00, 6], [6.08, 0], [8, 0]],
    hYaw: [[0, 0], [8, 0]],
    hPitch: [[0, -3], [8, -3]],

    aR: [[0, .22], [.50, .22], [1.02, .26], [1.10, .26], [1.30, .05], [1.48, -.12], [1.72, -.18], [1.86, -.15], [2.00, -.13],
      [2.12, -.08], [2.22, .05], [2.36, .18], [2.58, .24], [2.84, .26], [3.00, .24], [3.10, .22], [3.22, .08], [3.34, -.10],
      [3.58, -.12], [3.80, .04], [4.22, .14], [4.32, .14], [4.48, .06], [4.62, -.06], [5.00, -.06], [5.50, .04], [5.90, .14],
      [6.40, .22], [7.15, .22], [8, .22]],
    aU: [[0, -.52], [.50, -.52], [1.02, -.46], [1.10, -.45], [1.30, -.38], [1.48, -.36], [1.72, -.40], [1.86, -.46], [2.00, -.48],
      [2.12, -.42], [2.22, -.25], [2.36, -.04], [2.58, .04], [2.80, -.06], [2.96, -.22], [3.08, -.30], [3.10, -.30], [3.34, -.30],
      [3.58, -.32], [3.80, -.18], [4.00, -.10], [4.22, .20], [4.32, .22], [4.48, .0], [4.62, -.40], [5.00, -.42], [5.50, -.25],
      [5.90, -.18], [6.40, -.34], [7.15, -.52], [8, -.52]],
    aF: [[0, .30], [.50, .30], [1.02, .12], [1.10, .13], [1.30, .50], [1.48, .48], [1.72, .44], [1.86, .40], [2.00, .36],
      [2.12, .42], [2.22, .50], [2.36, .40], [2.58, .28], [2.84, .36], [3.00, .46], [3.10, .52], [3.22, .52], [3.34, .48],
      [3.58, .52], [3.80, .50], [4.05, .26], [4.22, .06], [4.32, .04], [4.48, .30], [4.62, .50], [5.00, .50], [5.50, .44], [5.90, .38],
      [6.40, .34], [7.15, .30], [8, .30]],
    wYaw: [[0, 132], [.50, 133], [1.02, 158], [1.10, 155], [1.30, 10], [1.48, -95], [1.72, -122], [1.86, -124], [2.00, -118],
      [2.12, -70], [2.22, -5], [2.36, 55], [2.58, 72], [2.80, 74], [2.96, 64], [3.10, 56], [3.22, 22], [3.34, -10], [3.58, -18],
      [3.80, -26], [4.22, -30], [4.48, -30], [4.62, -34], [5.00, -34], [5.50, -10], [5.90, 30], [6.40, 95], [7.15, 132], [8, 132]],
    wPitch: [[0, -19], [.50, -19], [1.02, -23], [1.10, -22], [1.30, -11], [1.48, -13], [1.72, -21], [1.86, -27], [2.00, -26],
      [2.12, -16], [2.22, 12], [2.36, 42], [2.58, 52], [2.80, 40], [2.96, 16], [3.08, 3], [3.22, 0], [3.34, -2], [3.58, -5],
      [3.80, 40], [4.00, 90], [4.22, 148], [4.32, 152], [4.40, 140], [4.48, 96], [4.56, 40], [4.62, 6], [4.75, 4], [5.00, 5],
      [5.50, 45], [5.90, 68], [6.40, 20], [7.15, -19], [8, -19]],
    wRoll: [[0, 38], [.50, 36], [1.02, 20], [1.30, 24], [1.48, 24], [1.72, 18], [1.86, -50], [2.00, -172], [2.12, -165], [2.22, -152],
      [2.36, -140], [2.58, -136], [2.80, -84], [2.96, -12], [3.08, 14], [3.10, 18], [3.34, 22], [3.58, 24], [3.80, 48], [4.05, 80],
      [4.22, 92], [4.32, 92], [4.48, 95], [4.62, 100], [5.00, 100], [5.50, 80], [5.90, 40], [6.40, 20], [7.15, 38], [8, 38]],
    uL: [[0, .12], [8, .12]],
    uR: [[0, .60], [1.02, .58], [1.30, .52], [1.72, .48], [2.00, .50], [2.36, .62], [2.58, .62], [3.10, .60], [3.34, .52],
      [3.58, .52], [4.22, .62], [4.48, .50], [4.62, .44], [5.00, .44], [5.50, .52], [6.40, .60], [8, .60]],

    // Lead (left) foot: planted until one advancing step during R1·3.
    Lbx: [[0, -.16], [2.66, -.16], [2.92, -.14], [8, -.14]],
    Lbz: [[0, .36], [2.66, .36], [2.80, .56], [2.92, .76], [8, .76]],
    Lyaw: [[0, -8], [2.66, -8], [2.92, -10], [8, -10]],
    Lheel: [[0, 0], [2.56, 0], [2.66, 16], [2.78, 8], [2.90, -4], [2.96, 0], [8, 0]],
    Llift: [[0, 0], [2.64, 0], [2.75, .085], [2.86, .06], [2.95, 0], [8, 0]],
    // Rear (right) foot: pivots on the ball (heel up) as the hips turn, then steps up in recovery.
    Rbx: [[0, .24], [2.97, .24], [3.13, .25], [8, .25]],
    Rbz: [[0, -.30], [2.97, -.30], [3.06, -.12], [3.13, .10], [8, .10]],
    Ryaw: [[0, 42], [1.13, 42], [1.30, 20], [1.48, 2], [1.72, -6], [1.86, 4], [2.00, 26], [2.06, 30], [2.96, 30], [3.13, 34],
      [3.24, 34], [3.40, 22], [3.58, 20], [3.95, 28], [4.46, 28], [4.62, 14], [5.40, 14], [6.05, 42], [8, 42]],
    Rheel: [[0, 0], [1.08, 0], [1.16, 10], [1.30, 26], [1.48, 38], [1.72, 40], [1.86, 30], [2.00, 12], [2.06, 7], [2.14, 0],
      [2.80, 0], [2.92, 18], [3.04, 10], [3.12, 3], [3.16, 0], [3.20, 0], [3.26, 10], [3.40, 16], [3.58, 14], [3.95, 8], [4.10, 0],
      [4.41, 0], [4.46, 12], [4.62, 34], [5.00, 36], [5.40, 30], [5.90, 14], [6.05, 6], [6.20, 0], [8, 0]],
    Rlift: [[0, 0], [2.95, 0], [3.03, .06], [3.10, .04], [3.15, 0], [8, 0]],
  };
  const CH = {};
  for (const k in KEYS) CH[k] = channel(KEYS[k], k);

  // Move list for the annotated overlay and the frame-data table. Active
  // windows (60 fps frames) are authored like hitbox frames; tools/check_motion.js
  // reports the measured blade speed inside each window as a cross-check.
  const MOVES = [
    { tag: 'GUARD', name: 'Low Two-Handed Stance', t0: 0.00, t1: 0.50 },
    { tag: 'R1 · 1', name: 'Low Horizontal Reap', t0: 0.50, t1: 1.72, active: [68, 87] },
    { tag: 'R1 · 2', name: 'Rising Reverse Hook', t0: 1.72, t1: 2.58, active: [123, 139] },
    { tag: 'R1 · 3', name: 'Advancing Waist Hook', t0: 2.58, t1: 3.58, active: [188, 198] },
    { tag: 'R1 · 4', name: 'Overhead Diagonal Reap', t0: 3.58, t1: 5.00, active: [265, 276] },
    { tag: 'RECOVERY', name: 'Recovery to Guard', t0: 5.00, t1: 8.00 },
  ];

  // ------------------------------------------------------------- the pose
  function footPose(bx, bz, yaw, heelDeg, lift) {
    const F = frameYPR(yaw, 0, 0);
    const a = heelDeg * D2R, c = Math.cos(a), s = Math.sin(a);
    // Rotate about the ball contact: heel rises for positive angles.
    const rot = ([f, u], k = 1) => {
      const cc = Math.cos(a * k), ss = Math.sin(a * k);
      return [f * cc + u * ss, -f * ss + u * cc];
    };
    const toeK = 0.35 + 0.65 * smoothstep(0.0, 0.04, lift); // toes stay flatter while planted
    const pts = { heel: rot(FOOT.heel), ankle: rot(FOOT.ankle), ball: FOOT.ball, toe: rot(FOOT.toe, toeK) };
    void c; void s;
    // keep every sphere above the floor (toe-up landings)
    let raise = 0;
    for (const k in pts) raise = Math.max(raise, 0.03 - (pts[k][1] + lift));
    const base = [bx, lift + raise, bz];
    const out = { F, contact: [bx, 0, bz], planted: lift < 0.004 };
    for (const k in pts) out[k] = lw(base, F, 0, pts[k][1], pts[k][0]);
    return out;
  }

  function twoBone(a, target, l1, l2, pole) {
    const toT = sub(target, a), dist0 = len(toT), dir = norm(toT);
    const dist = clamp(dist0, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
    const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    let pd = sub(pole, a); pd = norm(sub(pd, mul(dir, dot(pd, dir))));
    return { mid: add(add(a, mul(dir, x)), mul(pd, h)), end: add(a, mul(dir, dist)), err: Math.max(0, dist0 - dist) };
  }

  function legPointAtY(leg, y) {
    const pts = [leg.hip, leg.knee, leg.ankle];
    for (let i = 0; i < 2; i++) {
      const a = pts[i], b = pts[i + 1];
      if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) return mix3(a, b, (a[1] - y) / (a[1] - b[1]));
    }
    return y > leg.hip[1] ? leg.hip : leg.ankle;
  }

  function evalPose(t) {
    const c = {};
    for (const k in CH) c[k] = CH[k](t);
    const breath = Math.sin(t * 2 * Math.PI / 2.4);

    const fL = footPose(c.Lbx, c.Lbz, c.Lyaw, c.Lheel, c.Llift);
    const fR = footPose(c.Rbx, c.Rbz, c.Ryaw, c.Rheel, c.Rlift);

    // Pelvis. Its height is softly clamped so both legs always reach their
    // planted feet with a slight knee bend: feet never slide to meet the body.
    const P = frameYPR(c.pYaw, -c.pPitch, c.pRoll);
    const hipOff = side => add(mul(P.r, side * RIG.hipHalf), mul(P.u, -RIG.hipDrop));
    let py = c.py + breath * 0.004;
    const reach = (RIG.thigh + RIG.shin) * 0.985;
    for (const [side, f] of [[-1, fL], [1, fR]]) {
      const o = hipOff(side);
      const hx = c.px + o[0] - f.ankle[0], hz = c.pz + o[2] - f.ankle[2];
      py = smin(py, f.ankle[1] - o[1] + Math.sqrt(Math.max(0, reach * reach - hx * hx - hz * hz)), 0.03);
    }
    const pel = [c.px, py, c.pz];

    const legs = [[-1, fL], [1, fR]].map(([side, f]) => {
      const hip = add(pel, hipOff(side));
      const pole = add(add(hip, f.F.f), mul(P.r, side * 0.18));
      const ik = twoBone(hip, f.ankle, RIG.thigh, RIG.shin, pole);
      return { side, hip, knee: ik.mid, ankle: ik.end, foot: f, err: ik.err };
    });

    // Spine and head.
    const chestYaw = c.pYaw + c.sYaw;
    const lean = c.lean + breath * 0.8;
    const C = frameYPR(chestYaw, -lean, c.sRoll);
    const Cy = frameYPR(chestYaw, 0, 0);
    const spineBase = add(pel, mul(P.u, 0.05));
    const chest = add(spineBase, mul(C.u, RIG.spine));          // centre of the shoulder line
    const B = frameYPR(c.pYaw + c.sYaw * 0.5, -(lean + c.pPitch) * 0.5, c.sRoll * 0.5);
    const waist = add(spineBase, mul(norm(add(P.u, C.u)), RIG.spine * 0.42));
    const lookYaw = clamp(-chestYaw * 0.72, -68, 68);              // eyes stay on the target ahead
    const Hf = frameYPR(chestYaw + lookYaw + c.hYaw, -lean * 0.45 + c.hPitch, -c.sRoll * 0.4);
    const neck = add(chest, mul(C.u, 0.05));
    const head = add(add(neck, mul(Hf.u, 0.17)), mul(Hf.f, 0.035));

    // Weapon: the grip anchor rides the chest, so hip and torso rotation drive the swing.
    const S = frameYPR(c.wYaw, c.wPitch, c.wRoll);
    const d = S.f, b = mul(S.r, -1), n = S.u;
    const anchor = add(add(add(chest, mul(Cy.r, c.aR)), mul(UP, c.aU)), mul(Cy.f, c.aF));
    const butt = sub(anchor, mul(d, RIG.uAnchor));
    const at = u => add(butt, mul(d, u));
    const headPt = at(RIG.shaft);
    const bladePt = (s, tb) => add(add(headPt, mul(b, s)), mul(d, tb));

    // Arms: hands grip the shaft. If a grip point is out of reach the hand
    // slides along the shaft (as on a real polearm) instead of letting go.
    const shBase = side => add(add(chest, mul(C.r, side * RIG.shoulderHalf)), mul(C.u, -0.035));
    const maxReach = RIG.upper + RIG.fore + RIG.protract - 0.004;
    const findGrip = (sh, want, lo, hi) => {
      if (len(sub(at(want), sh)) <= maxReach) return want;
      let best = null, bestD = Infinity, near = want, nearD = Infinity;
      for (let u = lo; u <= hi + 1e-9; u += 0.005) {
        const dd = len(sub(at(u), sh));
        if (dd <= maxReach && Math.abs(u - want) < bestD) { bestD = Math.abs(u - want); best = u; }
        if (dd < nearD) { nearD = dd; near = u; }
      }
      return best === null ? near : best;
    };
    const uL = findGrip(shBase(-1), c.uL, 0.10, 0.45);
    const uR = findGrip(shBase(1), Math.max(c.uR, uL + 0.16), uL + 0.16, 0.95);
    const arms = [[-1, uL, c.uL], [1, uR, c.uR]].map(([side, u, want]) => {
      const base = shBase(side), target = at(u);
      const toT = sub(target, base), dist = len(toT);
      const sh = add(base, mul(norm(toT), clamp(dist - 0.50, 0, RIG.protract)));
      const rel = sub(target, sh);
      const high = smoothstep(-0.15, 0.30, rel[1]);
      const pole = add(sh, add(add(mul(Cy.r, side * 0.75), mul(UP, lerp(-0.9, 0.35, high))), mul(Cy.f, lerp(-0.35, 0.55, high))));
      const ik = twoBone(sh, target, RIG.upper, RIG.fore, pole);
      return { side, shoulder: sh, elbow: ik.mid, hand: ik.end, grip: target, u, slide: u - want, err: ik.err };
    });

    return {
      t, c, pel, P, legs, chest, C, Cy, B, waist, spineBase, neck, head, Hf, lean,
      scythe: { S, d, b, n, anchor, butt, at, head: headPt, bladePt },
      arms,
    };
  }

  // Blade sample points in world space (used by renderer, trail and checks).
  function bladeOutline(pose, N = 14) {
    const sc = pose.scythe, spine = [], edge = [];
    for (let i = 0; i <= N; i++) {
      const k = i / N, s1 = polyAt(BLADE.spine, k), s2 = polyAt(BLADE.edge, k);
      spine.push(sc.bladePt(s1[0], s1[1]));
      edge.push(sc.bladePt(s2[0], s2[1]));
    }
    return { spine, edge };
  }
  // Trail / speed reference: the outermost belly of the crescent (where a reap connects).
  const BELLY = polyAt(BLADE.spine, 0.62);
  const bladeTip = pose => pose.scythe.bladePt(BELLY[0], BELLY[1]);
  function tipSpeed(t, dt = 1 / 240) {
    return len(sub(bladeTip(evalPose(t)), bladeTip(evalPose(Math.max(0, t - dt))))) / dt;
  }

  // ------------------------------------------------- secondary motion (sim)
  // Spring chains (hair, tabard, cape columns) and spring rings (coat) run at
  // 240 Hz from t = 0 and are stored at 120 Hz, so any time can be rendered.
  const COAT_N = 18, COAT_OPEN = 32;
  const LOCK_SEG = 4, BACK_N = 3, BACK_SEG = 4, TAB_SEG = 3, CAPE_N = 5, CAPE_SEG = 5;
  const SIM_HZ = 240, STORE_HZ = 120;
  const coatAngle = i => (i + 0.5) * 360 / COAT_N - 180;

  function coatTargets(pose) {
    const { pel, P, legs } = pose, out = [];
    const ctr = add(pel, mul(P.u, 0.05));
    for (let i = 0; i < COAT_N; i++) {
      const th = coatAngle(i) * D2R;
      const waist = lw(ctr, P, Math.sin(th) * 0.19, 0, Math.cos(th) * 0.15);
      let o = add(mul(P.r, Math.sin(th)), mul(P.f, Math.cos(th)));
      o = norm([o[0], 0, o[2]]);
      const hemY = Math.max(0.07, waist[1] - 0.84);
      const midY = lerp(waist[1], hemY, 0.45);
      const base = Math.hypot(waist[0] - pel[0], waist[2] - pel[2]);
      let rMid = base + 0.07, rHem = base + 0.18;
      for (const leg of legs) {
        const lm = legPointAtY(leg, midY), lh = legPointAtY(leg, hemY + 0.05);
        rMid = Math.max(rMid, dot([lm[0] - pel[0], 0, lm[2] - pel[2]], o) + 0.12);
        rHem = Math.max(rHem, dot([lh[0] - pel[0], 0, lh[2] - pel[2]], o) + 0.12, rMid + 0.03);
      }
      out.push({
        waist, out: o,
        mid: [pel[0] + o[0] * rMid, midY, pel[2] + o[2] * rMid],
        hem: [pel[0] + o[0] * rHem, hemY, pel[2] + o[2] * rHem],
      });
    }
    return out;
  }
  function lockRig(pose, side) {           // long white hair falling in front of the shoulders
    const { head, Hf } = pose;
    const root = lw(head, Hf, side * 0.1, 0.035, -0.015);
    const segs = [0.10, 0.10, 0.095, 0.085], dirs = [];
    for (let i = 0; i < LOCK_SEG; i++) dirs.push(norm(mix3(ldir(Hf, side * 0.2, -1, 0.22), [0, -1, 0], 0.3 + i * 0.12)));
    return { root, dirs, segs };
  }
  function backHairRig(pose, k) {
    const { head, Hf, C } = pose;
    const sp = (k - (BACK_N - 1) / 2) / ((BACK_N - 1) / 2);
    const root = lw(head, Hf, sp * 0.06, 0.07, -0.085);
    const dirs = [], segs = [];
    for (let i = 0; i < BACK_SEG; i++) { const tt = i / (BACK_SEG - 1); dirs.push(ldir(C, sp * 0.3, -1, lerp(-0.8, -0.2, tt))); segs.push(0.105); }
    return { root, dirs, segs };
  }
  function tabardRig(pose) {                // front panel hanging from the belt
    const { pel, P } = pose;
    const root = lw(pel, P, 0, 0.02, 0.155);
    const dirs = [], segs = [0.18, 0.18, 0.16];
    for (let i = 0; i < TAB_SEG; i++) dirs.push(norm(add([0, -1, 0], mul(P.f, 0.12))));
    return { root, dirs, segs };
  }
  function capeRig(pose, k) {               // back of the coat, hung from the shoulders
    const { chest, C, Cy } = pose;
    const x = (k / (CAPE_N - 1) - 0.5) * 2;
    const root = lw(chest, C, x * 0.215, -0.02, -0.105 - 0.035 * (1 - x * x));
    const dirs = [], segs = [];
    for (let i = 0; i < CAPE_SEG; i++) {
      const tt = (i + 1) / CAPE_SEG;
      dirs.push(ldir(Cy, x * lerp(0.12, 0.42, tt), -1, lerp(-0.22, -0.34, tt)));
      segs.push(0.275);
    }
    return { root, dirs, segs };
  }
  function colliders(pose) {
    const caps = [[pose.spineBase, pose.chest, 0.16], [pose.pel, pose.pel, 0.22], [pose.head, pose.head, 0.15]];
    for (const l of pose.legs) { caps.push([l.hip, l.knee, 0.10]); caps.push([l.knee, l.ankle, 0.08]); }
    for (const a of pose.arms) caps.push([a.shoulder, a.shoulder, 0.11]);
    return caps;
  }
  function pushOut(x, caps, bias) {
    for (const [a, b, r] of caps) {
      const ab = sub(b, a), tt = clamp(dot(sub(x, a), ab) / (dot(ab, ab) || 1), 0, 1), cp = add(a, mul(ab, tt));
      const dv = sub(x, cp), dl = len(dv);
      if (dl < r) {
        let dir = dl > 1e-6 ? mul(dv, 1 / dl) : (bias || [0, 0, 1]);
        if (bias) dir = norm(add(dir, bias));
        x = add(cp, mul(dir, r));
      }
    }
    return x;
  }

  function buildSim() {
    const dt = 1 / SIM_HZ, frames = [];
    const mk = p => ({ x: p.slice(), v: [0, 0, 0] });
    let pose = evalPose(0);
    const initChain = rig => { let p = rig.root; return rig.dirs.map((d, i) => mk(p = add(p, mul(d, rig.segs[i])))); };
    const locks = [-1, 1].map(s => initChain(lockRig(pose, s)));
    const back = []; for (let k = 0; k < BACK_N; k++) back.push(initChain(backHairRig(pose, k)));
    const tab = initChain(tabardRig(pose));
    const cape = []; for (let k = 0; k < CAPE_N; k++) cape.push(initChain(capeRig(pose, k)));
    const ct0 = coatTargets(pose);
    const mid = ct0.map(c => mk(c.mid)), hem = ct0.map(c => mk(c.hem));

    const stepChain = (chain, rig, stiff, damp, grav, collide) => {
      let prev = rig.root;
      for (let i = 0; i < chain.length; i++) {
        const p = chain[i], target = add(prev, mul(rig.dirs[i], rig.segs[i]));
        p.v = add(p.v, mul(sub(target, p.x), stiff[i] * dt));
        p.v[1] -= grav * dt;
        p.v = mul(p.v, Math.exp(-damp * dt));
        let x = add(p.x, mul(p.v, dt));
        const dv = sub(x, prev), l = len(dv) || 1e-6;
        x = add(prev, mul(dv, rig.segs[i] / l));
        if (collide) x = collide(x, i);
        p.v = mul(sub(x, p.x), 1 / dt);
        p.x = x;
        prev = x;
      }
    };
    const stepRing = (pts, key, targets, k, damp) => pts.forEach((p, i) => {
      p.v = add(p.v, mul(sub(targets[i][key], p.x), k * dt));
      p.v = mul(p.v, Math.exp(-damp * dt));
      p.x = add(p.x, mul(p.v, dt));
      if (p.x[1] < 0.03) { p.x[1] = 0.03; p.v[1] = Math.max(0, p.v[1]); }
    });
    const step = t => {
      pose = evalPose(t);
      const caps = colliders(pose);
      const legCaps = caps.slice(3);
      const capeCaps = [[pose.spineBase, pose.chest, 0.17], [pose.pel, pose.pel, 0.25]].concat(pose.legs.map(l => [l.hip, l.knee, 0.12]));
      const behind = (x, lim) => { const zf = dot(sub(x, pose.chest), pose.C.f); return zf > lim ? add(x, mul(pose.C.f, lim - zf)) : x; };
      const floor = x => (x[1] < 0.02 ? [x[0], 0.02, x[2]] : x);
      [-1, 1].forEach((s, j) => stepChain(locks[j], lockRig(pose, s), [1100, 800, 600, 450], 9, 1.0, x => pushOut(x, caps)));
      for (let k = 0; k < BACK_N; k++) stepChain(back[k], backHairRig(pose, k), [1200, 800, 550, 400], 8, 1.0, x => behind(x, -0.14));
      stepChain(tab, tabardRig(pose), [700, 500, 380], 8, 2.0, x => floor(pushOut(x, legCaps, mul(pose.P.f, 0.9))));
      const capeRigs = [];
      for (let k = 0; k < CAPE_N; k++) {
        capeRigs.push(capeRig(pose, k));
        stepChain(cape[k], capeRigs[k], [620, 460, 340, 260, 200], 6.5, 2.0,
          (x, i) => floor(pushOut(i < 1 ? behind(x, -0.15) : x, capeCaps)));
      }
      // cloth spacing between neighbouring columns: no crossing, limited stretch
      const restRows = capeRigs.map(r => { let p = r.root; return r.dirs.map((d, i) => (p = add(p, mul(d, r.segs[i])))); });
      for (let it = 0; it < 2; it++) {
        for (let i = 0; i < CAPE_SEG; i++) {
          for (let k = 0; k < CAPE_N - 1; k++) {
            const a = cape[k][i], b = cape[k + 1][i];
            const rest = len(sub(restRows[k][i], restRows[k + 1][i]));
            const dv = sub(b.x, a.x), dl = len(dv) || 1e-6;
            const want = clamp(dl, rest * 0.7, rest * 1.2);
            // keep column k on its own side: project onto the rest direction
            const restDir = norm(sub(restRows[k + 1][i], restRows[k][i]));
            const side = dot(dv, restDir) < rest * 0.35 ? rest * 0.35 - dot(dv, restDir) : 0;
            const corr = mul(dv, (dl - want) / dl * 0.5);
            const xa = add(add(a.x, corr), mul(restDir, -side * 0.5)), xb = add(sub(b.x, corr), mul(restDir, side * 0.5));
            a.v = add(a.v, mul(sub(xa, a.x), 1 / dt)); b.v = add(b.v, mul(sub(xb, b.x), 1 / dt));
            a.x = floor(xa); b.x = floor(xb);
          }
        }
      }
      const ct = coatTargets(pose);
      stepRing(mid, 'mid', ct, 80, 8);
      stepRing(hem, 'hem', ct, 55, 7);
    };
    for (let i = 0; i < SIM_HZ * 1.5; i++) step(0);             // settle at rest
    const xs = ch => ch.map(p => p.x.slice());
    const snap = () => ({ locks: locks.map(xs), back: back.map(xs), tab: xs(tab), cape: cape.map(xs), mid: xs(mid), hem: xs(hem) });
    frames.push(snap());
    const total = Math.round(DURATION * SIM_HZ), every = SIM_HZ / STORE_HZ;
    for (let i = 1; i <= total; i++) {
      step(i * dt);
      if (i % every === 0) frames.push(snap());
    }
    return frames;
  }
  let SIM = null;
  const lerpDeep = (a, b, k) => (typeof a[0] === 'number' ? mix3(a, b, k) : a.map((x, i) => lerpDeep(x, b[i], k)));
  function simAt(t) {
    if (!SIM) SIM = buildSim();
    const x = clamp(t, 0, DURATION) * STORE_HZ, i = Math.min(SIM.length - 2, Math.floor(x)), k = x - i;
    const a = SIM[i], b = SIM[i + 1], o = {};
    for (const key in a) o[key] = lerpDeep(a[key], b[key], k);
    return o;
  }

  // ---------------------------------------------------------------- camera
  // One locked three-quarter gameplay camera (front-right of Asriel, slightly high).
  const CAM = (() => {
    const target = [-0.04, 1.6, 0.75];
    const az = 47 * D2R, el = 14 * D2R, dist = 8.1, fov = 30 * D2R;
    const pos = [target[0] + Math.sin(az) * Math.cos(el) * dist, target[1] + Math.sin(el) * dist,
      target[2] + Math.cos(az) * Math.cos(el) * dist];
    const f = norm(sub(target, pos)), r = norm(cross(UP, f)), u = cross(f, r);
    return { pos, target, f, r, u, focal: (H / 2) / Math.tan(fov / 2), cx: W / 2, cy: H / 2 };
  })();
  function project(p) {
    const v = sub(p, CAM.pos), z = dot(v, CAM.f);
    return [CAM.cx + CAM.focal * dot(v, CAM.r) / z, CAM.cy - CAM.focal * dot(v, CAM.u) / z, z];
  }
  const pr = (r, z) => r * CAM.focal / z;
  const toCam = p => norm(sub(CAM.pos, p));
  const LIGHT = norm([-0.45, -1, 0.30]);     // direction light travels (key light from screen upper-left)
  const LS = [-0.6, -0.8];                   // same light, screen space

  // ======================================================== renderer (2D)
  const makeCanvas = (w, h) => {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  };
  const OUT = 2.3;   // outline width, px at 1080p

  function circlePts(c2, r, n = 18) {
    const o = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([c2[0] + Math.cos(a) * r, c2[1] + Math.sin(a) * r]); }
    return o;
  }
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    hi.pop(); lo.pop();
    return lo.concat(hi);
  }
  function polyPath(ctx, pts, closed = true, smooth = false) {
    ctx.beginPath();
    if (!smooth || pts.length < 3) {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    } else {
      const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (closed) {
        const s = mid(pts[n - 1], pts[0]); ctx.moveTo(s[0], s[1]);
        for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
      } else {
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
        ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
      }
    }
    if (closed) ctx.closePath();
  }
  // Screen-space Catmull-Rom resample so tapered limbs bend smoothly.
  function resample(pts, rads, sub_ = 5) {
    if (pts.length < 3) return { pts, rads };
    const P = [], R = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let j = 0; j < sub_; j++) {
        const t = j / sub_, t2 = t * t, t3 = t2 * t;
        const f = k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        P.push([f(0), f(1)]); R.push(lerp(rads[i], rads[i + 1], t));
      }
    }
    P.push(pts[pts.length - 1]); R.push(rads[rads.length - 1]);
    return { pts: P, rads: R };
  }
  function taperPath(ctx, pts0, rads0, caps = true) {
    const { pts, rads } = resample(pts0, rads0);
    const n = pts.length, L = [], Rr = [], tans = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      tans.push([tx, ty]);
      L.push([pts[i][0] - ty * rads[i], pts[i][1] + tx * rads[i]]);
      Rr.push([pts[i][0] + ty * rads[i], pts[i][1] - tx * rads[i]]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    const te = Math.atan2(tans[n - 1][1], tans[n - 1][0]);
    if (caps && rads[n - 1] > 0.3) ctx.arc(pts[n - 1][0], pts[n - 1][1], rads[n - 1], te + Math.PI / 2, te - Math.PI / 2, true);
    else ctx.lineTo(Rr[n - 1][0], Rr[n - 1][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
    const t0 = Math.atan2(tans[0][1], tans[0][0]);
    if (caps && rads[0] > 0.3) ctx.arc(pts[0][0], pts[0][1], rads[0], t0 - Math.PI / 2, t0 + Math.PI / 2 - 2 * Math.PI, true);
    ctx.closePath();
  }
  function capsulePath(ctx, A, B, ra, rb) {
    const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy);
    ctx.beginPath();
    if (d <= Math.abs(ra - rb) + 0.01) { const big = ra > rb ? A : B; ctx.arc(big[0], big[1], Math.max(ra, rb), 0, Math.PI * 2); return; }
    const ang = Math.atan2(dy, dx), off = Math.acos(clamp((ra - rb) / d, -1, 1));
    ctx.arc(A[0], A[1], ra, ang + off, ang + 2 * Math.PI - off);
    ctx.arc(B[0], B[1], rb, ang - off, ang + off);
    ctx.closePath();
  }
  // Cylinder-style shading: gradient across the long axis, lit side toward the key light.
  function axisGradient(ctx, A, B, R, pal, rimLit = true) {
    const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d, ny = dx / d;
    if (nx * LS[0] + ny * LS[1] > 0) { nx = -nx; ny = -ny; }       // n points away from the light
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    const g = ctx.createLinearGradient(mx - nx * R, my - ny * R, mx + nx * R, my + ny * R);
    g.addColorStop(0, rimLit ? pal[1] : pal[0]); g.addColorStop(0.18, pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[2]);
    return g;
  }
  function bigGradient(ctx, pts, pal) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.max(x1 - x0, y1 - y0) / 2;
    const g = ctx.createLinearGradient(cx + LS[0] * r, cy + LS[1] * r, cx - LS[0] * r, cy - LS[1] * r);
    g.addColorStop(0, pal[0]); g.addColorStop(0.45, pal[1]); g.addColorStop(1, pal[2]);
    return g;
  }
  const strokeIt = (ctx, color, w = OUT) => { ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); };

  // ------------------------------------------------------------ background
  function hash(i, j) { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }
  function buildBackground() {
    const cv = makeCanvas(W, H), g = cv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b0c0f'); bg.addColorStop(0.55, '#16171b'); bg.addColorStop(1, '#1d1e22');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const C0 = [0.2, 0, 0.4], RW = 9.6;
    const fog = (col, p) => {
      const k = smoothstep(7, 19, len(sub(p, CAM.pos)));
      return `rgb(${Math.round(lerp(col[0], 14, k))},${Math.round(lerp(col[1], 15, k))},${Math.round(lerp(col[2], 18, k))})`;
    };
    const visible = pts => pts.every(p => dot(sub(p, CAM.pos), CAM.f) > 0.6);
    const quads = [];
    // floor: concentric stone rings around the arena centre
    const ringW = 0.9;
    for (let ri = 0; ri * ringW < RW; ri++) {
      const r0 = ri * ringW, r1 = Math.min(RW, r0 + ringW);
      const nSeg = ri === 0 ? 1 : Math.max(6, Math.round(2 * Math.PI * (r0 + r1) / 2 / 1.15));
      for (let s = 0; s < nSeg; s++) {
        const a0 = s / nSeg * Math.PI * 2 + ri * 0.37, a1 = (s + 1) / nSeg * Math.PI * 2 + ri * 0.37;
        const pts = [];
        const steps = ri === 0 ? 48 : 6;
        for (let k = 0; k <= steps; k++) { const a = lerp(a0, a1, k / steps); pts.push([C0[0] + Math.cos(a) * r1, 0, C0[2] + Math.sin(a) * r1]); }
        if (ri > 0) for (let k = steps; k >= 0; k--) { const a = lerp(a0, a1, k / steps); pts.push([C0[0] + Math.cos(a) * r0, 0, C0[2] + Math.sin(a) * r0]); }
        if (!visible(pts)) continue;
        const mid = [C0[0] + Math.cos((a0 + a1) / 2) * (r0 + r1) / 2, 0, C0[2] + Math.sin((a0 + a1) / 2) * (r0 + r1) / 2];
        const lightK = 1 - smoothstep(1.5, 8.5, len(sub(mid, [0.1, 0, 0.5])));
        const v = 0.86 + hash(ri, s) * 0.22;
        const base = [70 * v * lerp(0.62, 1.12, lightK), 68 * v * lerp(0.62, 1.12, lightK), 66 * v * lerp(0.62, 1.12, lightK)];
        quads.push({ z: project(mid)[2], pts, col: fog(base, mid), grout: true, mid, seed: hash(s, ri) });
      }
    }
    quads.sort((a, b) => b.z - a.z);
    for (const q of quads) {
      const sp = q.pts.map(project);
      polyPath(g, sp); g.fillStyle = q.col; g.fill();
      g.lineWidth = 1.6; g.strokeStyle = 'rgba(12,12,14,0.55)'; g.stroke();
      if (q.seed > 0.62) {                       // hairline cracks
        const c0 = project(q.mid), k = q.seed * 40;
        g.beginPath(); g.moveTo(c0[0] - k, c0[1] - 2); g.lineTo(c0[0] - k * 0.2, c0[1] + 3); g.lineTo(c0[0] + k * 0.6, c0[1] - 1);
        g.lineWidth = 1; g.strokeStyle = 'rgba(20,20,22,0.45)'; g.stroke();
      }
    }
    // training circle inlay
    g.beginPath();
    for (let k = 0; k <= 96; k++) {
      const a = k / 96 * Math.PI * 2, p = project([C0[0] + Math.cos(a) * 3.6, 0.001, C0[2] + Math.sin(a) * 3.6]);
      if (k === 0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]);
    }
    g.lineWidth = 3; g.strokeStyle = 'rgba(150,146,140,0.16)'; g.stroke();

    // wall ring and pillars
    const walls = [];
    const nW = 120, wallH = 1.5;
    for (let s = 0; s < nW; s++) {
      const a0 = s / nW * Math.PI * 2, a1 = (s + 1) / nW * Math.PI * 2;
      const p = (a, r, y) => [C0[0] + Math.cos(a) * r, y, C0[2] + Math.sin(a) * r];
      const face = [p(a0, RW, 0), p(a1, RW, 0), p(a1, RW, wallH), p(a0, RW, wallH)];
      const top = [p(a0, RW, wallH), p(a1, RW, wallH), p(a1, RW + 0.5, wallH), p(a0, RW + 0.5, wallH)];
      if (!visible(face)) continue;
      const mid = p((a0 + a1) / 2, RW, wallH / 2);
      const v = 0.9 + hash(s, 7) * 0.12;
      walls.push({ z: project(mid)[2] + 0.01, pts: face, col: fog([62 * v, 60 * v, 58 * v], mid) });
      walls.push({ z: project(mid)[2] + 0.02, pts: top, col: fog([84 * v, 82 * v, 79 * v], mid) });
    }
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2 + 0.13, rr = RW + 0.35, hw = 0.38, ph = 5.2;
      const cx = C0[0] + Math.cos(a) * rr, cz = C0[2] + Math.sin(a) * rr;
      const tx = -Math.sin(a), tz = Math.cos(a), nx = Math.cos(a), nz = Math.sin(a);
      const corner = (i, j, y) => [cx + tx * hw * i + nx * hw * j, y, cz + tz * hw * i + nz * hw * j];
      const faces = [
        [corner(-1, -1, 0), corner(1, -1, 0), corner(1, -1, ph), corner(-1, -1, ph)],  // facing the arena
        [corner(-1, 1, 0), corner(-1, -1, 0), corner(-1, -1, ph), corner(-1, 1, ph)],
        [corner(1, -1, 0), corner(1, 1, 0), corner(1, 1, ph), corner(1, -1, ph)],
      ];
      const mid = [cx, ph / 2, cz];
      if (!visible(faces[0])) continue;
      faces.forEach((f, fi) => {
        const fm = mul(f.reduce((s2, q) => add(s2, q), [0, 0, 0]), 0.25);
        const nrm = fi === 0 ? [-nx, 0, -nz] : fi === 1 ? [-tx, 0, -tz] : [tx, 0, tz];
        if (dot(nrm, sub(CAM.pos, fm)) <= 0) return;
        const shade = fi === 0 ? 1 : 0.72;
        walls.push({ z: project(mid)[2] - 0.2 - fi * 0.01, pts: f, col: fog([74 * shade, 72 * shade, 69 * shade], mid) });
      });
    }
    walls.sort((a, b) => b.z - a.z);
    for (const w of walls) {
      polyPath(g, w.pts.map(project)); g.fillStyle = w.col; g.fill();
      g.lineWidth = 1.2; g.strokeStyle = 'rgba(8,8,10,0.5)'; g.stroke();
    }
    // soft overhead light pool + atmospheric falloff
    const c2 = project([0.1, 0, 0.5]);
    const pool = g.createRadialGradient(c2[0], c2[1], 30, c2[0], c2[1], 900);
    pool.addColorStop(0, 'rgba(255,248,236,0.10)'); pool.addColorStop(0.5, 'rgba(255,248,236,0.03)'); pool.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = pool; g.fillRect(0, 0, W, H);
    return cv;
  }
  function buildVignette() {
    const cv = makeCanvas(W, H), g = cv.getContext('2d');
    const v = g.createRadialGradient(W / 2, H * 0.52, H * 0.42, W / 2, H * 0.52, H * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return cv;
  }

  // ------------------------------------------------------- galaxy texture
  function buildGalaxy() {
    const S = 512, cv = makeCanvas(S, S), g = cv.getContext('2d'), G = LOOK.galaxy;
    const bg = g.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, G.base[0]); bg.addColorStop(0.5, G.base[1]); bg.addColorStop(1, G.base[2]);
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    let seed = 1234567;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 30; i++) {
      const x = rnd() * S, y = rnd() * S, r = 30 + rnd() * 130, c = G.nebula[i % G.nebula.length], a = 0.08 + rnd() * 0.2;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        const rg = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        rg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`); rg.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        g.fillStyle = rg; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r);
      }
    }
    for (let i = 0; i < 560; i++) {
      const x = rnd() * S, y = rnd() * S, big = rnd() < 0.05, r = big ? 1.2 + rnd() * 0.9 : 0.45 + rnd() * 0.8;
      const a = 0.45 + rnd() * 0.55;
      g.fillStyle = rnd() < 0.7 ? `rgba(255,255,255,${a})` : `rgba(214,196,255,${a})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      if (big) {
        g.strokeStyle = `rgba(236,226,255,${a * 0.7})`; g.lineWidth = 0.7;
        g.beginPath(); g.moveTo(x - r * 4, y); g.lineTo(x + r * 4, y); g.moveTo(x, y - r * 4); g.lineTo(x, y + r * 4); g.stroke();
      }
    }
    return cv;
  }
  let GAL = null;
  const PATS = new WeakMap();
  function galaxyPattern(ctx, m) {
    let pat = PATS.get(ctx);
    if (!pat) { pat = ctx.createPattern(GAL, 'repeat'); PATS.set(ctx, pat); }
    pat.setTransform(new DOMMatrix(m));
    return pat;
  }
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function fourStar(ctx, x, y, r, glowA = 0.5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, `rgba(240,230,255,${glowA})`); g.addColorStop(1, 'rgba(150,110,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.22 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
  }

  // --------------------------------------------------------- scene build
  function buildPrims(pose, sim, t, opts) {
    const prims = [];
    const P2 = project;
    const push = (z, fn) => prims.push({ z, fn });
    const { C, P, B, chest, head, Hf } = pose;
    const pel2 = P2(pose.pel), clothK = 0.0034 * CAM.focal / pel2[2];
    const clothM = [clothK, 0, 0, clothK, pel2[0], pel2[1]];
    const ring = (o, F, rx, rz, n = 18) => { const o2 = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o2.push(lw(o, F, Math.sin(a) * rx, 0, Math.cos(a) * rz)); } return o2; };
    const avgZ = pts => pts.reduce((s, p) => s + p[2], 0) / pts.length;
    const fluff = (ctx, c2, r, n, seedK) => {           // white fur tuft as a spiky blob
      ctx.beginPath();
      for (let i = 0; i <= n * 2; i++) {
        const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r * (0.72 + 0.1 * hash(i, seedK)) : r * (1.05 + 0.2 * hash(seedK, i));
        ctx.lineTo(c2[0] + Math.cos(a) * rr, c2[1] + Math.sin(a) * rr * 0.85);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(c2[0] + LS[0] * r * 0.4, c2[1] + LS[1] * r * 0.4, 1, c2[0], c2[1], r * 1.2);
      g.addColorStop(0, LOOK.fur[0]); g.addColorStop(0.65, LOOK.fur[1]); g.addColorStop(1, LOOK.fur[2]);
      ctx.fillStyle = g; ctx.fill(); strokeIt(ctx, LOOK.furLine, 1.6);
    };

    // Hanging fur: a band from a (top centre) to b (bottom centre), jagged at the bottom.
    const furCollar = (ctx, a, b, wa, wb, spikes, seedK) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux;
      ctx.beginPath();
      ctx.moveTo(a[0] + nx * wa, a[1] + ny * wa);
      ctx.quadraticCurveTo(a[0] - ux * wa * 0.5, a[1] - uy * wa * 0.5, a[0] - nx * wa, a[1] - ny * wa);
      for (let i = 0; i <= spikes * 2; i++) {
        const k = i / (spikes * 2), w = lerp(-wb, wb, k), long = i % 2 === 0;
        const ext = long ? 1 + 0.35 * hash(i, seedK) : 0.55;
        ctx.lineTo(b[0] + nx * w * (long ? 1.05 : 0.9) + ux * (ext - 1) * dl * 0.6, b[1] + ny * w * (long ? 1.05 : 0.9) + uy * (ext - 1) * dl * 0.6);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(a[0] + nx * wa, a[1] + ny * wa, a[0] - nx * wa, a[1] - ny * wa);
      const lit = nx * LS[0] + ny * LS[1] < 0;
      g.addColorStop(0, lit ? LOOK.fur[0] : LOOK.fur[2]); g.addColorStop(0.5, LOOK.fur[1]); g.addColorStop(1, lit ? LOOK.fur[2] : LOOK.fur[0]);
      ctx.fillStyle = g; ctx.fill(); strokeIt(ctx, LOOK.furLine, 1.6);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(120,110,135,0.45)';
      for (const o of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.moveTo(a[0] + nx * wa * o + ux * dl * 0.25, a[1] + ny * wa * o + uy * dl * 0.25); ctx.lineTo(b[0] + nx * wb * o * 1.1, b[1] + ny * wb * o * 1.1); ctx.stroke(); }
    };

    // ---- legs: dark greaves with gold trim, white fur tufts, black hoof-boots
    for (const leg of pose.legs) {
      const pts = [leg.hip, leg.knee, leg.ankle].map(P2);
      const rads = [0.085, 0.064, 0.05].map((r, i) => pr(r, pts[i][2]));
      push((pts[0][2] + pts[1][2] * 2 + pts[2][2]) / 4 + 0.03, ctx => {
        taperPath(ctx, pts, rads);
        ctx.fillStyle = axisGradient(ctx, pts[0], pts[2], Math.max(...rads), LOOK.armor); ctx.fill();
        strokeIt(ctx, LOOK.armorLine);
        // knee cop: a gold-rimmed plate edge across the knee
        { const dx = pts[2][0] - pts[0][0], dy = pts[2][1] - pts[0][1], dl = Math.hypot(dx, dy) || 1, r = rads[1] * 0.95;
          ctx.beginPath(); ctx.moveTo(pts[1][0] - dy / dl * r, pts[1][1] + dx / dl * r);
          ctx.quadraticCurveTo(pts[1][0] + dx / dl * r * 0.9, pts[1][1] + dy / dl * r * 0.9, pts[1][0] + dy / dl * r, pts[1][1] - dx / dl * r);
          strokeIt(ctx, LOOK.goldThin, 1.6); }
      });
      const ft = P2(mix3(leg.knee, leg.ankle, 0.42)), fb = P2(mix3(leg.knee, leg.ankle, 1.02));
      push(ft[2] - 0.02, ctx => furCollar(ctx, ft, fb, pr(0.075, ft[2]), pr(0.09, fb[2]), 6, leg.side + 3));
      const f = leg.foot, fp = [f.heel, f.ball, f.toe].map(P2), ak = P2(f.ankle);
      push(fp[1][2] - 0.01, ctx => {
        const sh = hull([...circlePts(fp[0], pr(0.052, fp[0][2])), ...circlePts(fp[1], pr(0.055, fp[1][2])),
          ...circlePts(fp[2], pr(0.036, fp[2][2])), ...circlePts(ak, pr(0.05, ak[2]))]);
        polyPath(ctx, sh, true, true); ctx.fillStyle = bigGradient(ctx, sh, LOOK.armor); ctx.fill(); strokeIt(ctx, LOOK.armorLine);
        ctx.beginPath(); ctx.moveTo(fp[0][0], fp[0][1] + pr(0.03, fp[0][2])); ctx.lineTo(fp[2][0], fp[2][1] + pr(0.02, fp[2][2]));
        strokeIt(ctx, LOOK.goldThin, 1.6);
      });
    }

    // ---- floor-length galaxy coat, open at the front, tattered hem
    const ct = coatTargets(pose), waistP = ct.map(c => c.waist), midP = sim.mid, hemP = sim.hem;
    const quadOpen = i => Math.abs(coatAngle(i) + 180 / COAT_N) < COAT_OPEN;
    const order = [];
    { let s0 = 0; while (!quadOpen(s0)) s0++; while (quadOpen(s0)) s0++; for (let k = 0; k < COAT_N; k++) { const i = (s0 + k) % COAT_N; if (!quadOpen(i)) order.push(i); } }
    const firstPt = order[0], lastPt = (order[order.length - 1] + 1) % COAT_N;
    const tatter = (a, b, seedI) => {
      const out = [];
      for (const [f, dy] of [[0.25, -(0.035 + 0.05 * hash(seedI, 1))], [0.5, 0.02], [0.75, -(0.03 + 0.06 * hash(seedI, 2))]]) {
        const p = mix3(a, b, f); out.push([p[0], Math.max(0.006, p[1] + dy), p[2]]);
      }
      return out;
    };
    let run = null; const runs = [];
    for (const i of order) {
      const j = (i + 1) % COAT_N;
      const ctr = mul(add(add(waistP[i], waistP[j]), add(hemP[i], hemP[j])), 0.25);
      const front = dot(norm(add(ct[i].out, ct[j].out)), sub(CAM.pos, ctr)) > 0;
      if (!run || run.front !== front) { run = { front, idx: [i], ctrs: [ctr] }; runs.push(run); }
      else { run.idx.push(i); run.ctrs.push(ctr); }
    }
    for (const r of runs) {
      const ids = r.idx.concat([(r.idx[r.idx.length - 1] + 1) % COAT_N]);
      const top = ids.map(i => P2(waistP[i]));
      const hem3 = [];
      ids.forEach((id, k) => { hem3.push(hemP[id]); if (k < ids.length - 1) hem3.push(...tatter(hemP[id], hemP[ids[k + 1]], id)); });
      const hem2 = hem3.map(P2);
      const m0 = P2(midP[ids[0]]), m1 = P2(midP[ids[ids.length - 1]]);
      const z = avgZ(r.ctrs.map(P2)) + (r.front ? -0.04 : 0.2);
      const edgeA = ids[0] === firstPt, edgeB = ids[ids.length - 1] === lastPt;
      push(z, ctx => {
        ctx.beginPath();
        ctx.moveTo(top[0][0], top[0][1]);
        for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
        ctx.quadraticCurveTo(m1[0], m1[1], hem2[hem2.length - 1][0], hem2[hem2.length - 1][1]);
        for (let i = hem2.length - 2; i >= 0; i--) ctx.lineTo(hem2[i][0], hem2[i][1]);
        ctx.quadraticCurveTo(m0[0], m0[1], top[0][0], top[0][1]);
        ctx.closePath();
        ctx.fillStyle = galaxyPattern(ctx, clothM); ctx.fill();
        const poly = top.concat(hem2);
        const shade = bigGradient(ctx, poly, r.front
          ? [rgba(LOOK.coatShade, 0.25), rgba(LOOK.coatShade, 0.55), rgba(LOOK.coatShade, 0.85)]
          : [rgba(LOOK.liningShade, 0.15), rgba(LOOK.liningShade, 0.3), rgba(LOOK.liningShade, 0.6)]);
        ctx.fillStyle = shade; ctx.fill();
        strokeIt(ctx, LOOK.armorLine, 2.2);
        if (r.front) {
          ctx.save(); ctx.clip();
          for (let k = 1; k < ids.length - 1; k++) {          // fold lines
            const a = P2(waistP[ids[k]]), m = P2(midP[ids[k]]), h = P2(hemP[ids[k]]);
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], h[0], h[1]);
            ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.stroke();
          }
          ctx.restore();
          ctx.beginPath();
          if (edgeA) { ctx.moveTo(top[0][0], top[0][1]); ctx.quadraticCurveTo(m0[0], m0[1], hem2[0][0], hem2[0][1]); }
          if (edgeB) { const L = hem2.length - 1; ctx.moveTo(top[top.length - 1][0], top[top.length - 1][1]); ctx.quadraticCurveTo(m1[0], m1[1], hem2[L][0], hem2[L][1]); }
          strokeIt(ctx, LOOK.goldThin, 1.8);
        }
      });
    }

    // ---- cape (back of the coat) hung from the shoulders
    const capeCols = sim.cape.map((col, k) => [capeRig(pose, k).root, ...col]);
    for (let k = 0; k < CAPE_N - 1; k++) {
      const A3 = capeCols[k], B3 = capeCols[k + 1];
      const bottom = [A3[A3.length - 1], ...tatter(A3[A3.length - 1], B3[B3.length - 1], 40 + k), B3[B3.length - 1]];
      const poly3 = A3.concat(bottom.slice(1, -1), B3.slice().reverse());
      const ctr = mul(poly3.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / poly3.length);
      const outward = norm([ctr[0] - chest[0], 0, ctr[2] - chest[2]]);
      const front = dot(outward, sub(CAM.pos, ctr)) > 0;
      const poly = poly3.map(P2);
      push(avgZ(poly) + 0.08, ctx => {
        polyPath(ctx, poly, true, false);
        ctx.fillStyle = galaxyPattern(ctx, clothM); ctx.fill();
        ctx.fillStyle = bigGradient(ctx, poly, front
          ? [rgba(LOOK.coatShade, 0.3), rgba(LOOK.coatShade, 0.6), rgba(LOOK.coatShade, 0.85)]
          : [rgba(LOOK.liningShade, 0.12), rgba(LOOK.liningShade, 0.3), rgba(LOOK.liningShade, 0.55)]);
        ctx.fill();
        strokeIt(ctx, LOOK.armorLine, 2);
      });
    }

    // ---- tabard: black panel with gold trim, crescent moon and a fur tip
    {
      const pts3 = [tabardRig(pose).root, ...sim.tab];
      const wv = norm([P.r[0], 0, P.r[2]]);
      const widths = [0.17, 0.165, 0.155, 0.13];
      const L3 = pts3.map((p, i) => add(p, mul(wv, -widths[i] / 2))), R3 = pts3.map((p, i) => add(p, mul(wv, widths[i] / 2)));
      const tip3 = add(pts3[pts3.length - 1], [0, -0.09, 0]);
      const Lp = L3.map(P2), Rp = R3.map(P2), tip = P2(tip3);
      const poly = Lp.concat([tip], Rp.slice().reverse());
      push(avgZ(pts3.map(P2)) - 0.03, ctx => {
        polyPath(ctx, poly); ctx.fillStyle = bigGradient(ctx, poly, LOOK.armor); ctx.fill(); strokeIt(ctx, LOOK.armorLine);
        // inset gold border
        const inset = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
        ctx.beginPath();
        for (let i = 0; i < Lp.length; i++) { const q = inset(Lp[i], Rp[i], 0.12); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
        const tq = inset(tip, P2(pts3[pts3.length - 1]), 0.3); ctx.lineTo(tq[0], tq[1]);
        for (let i = Rp.length - 1; i >= 0; i--) { const q = inset(Rp[i], Lp[i], 0.12); ctx.lineTo(q[0], q[1]); }
        strokeIt(ctx, LOOK.goldThin, 1.6);
        // crescent moon emblem and centre line
        const c1 = P2(pts3[1]), rr = pr(0.04, c1[2]);
        ctx.beginPath(); ctx.arc(c1[0], c1[1], rr, 0.15 * Math.PI, 0.85 * Math.PI); ctx.arc(c1[0], c1[1] - rr * 0.35, rr * 0.8, 0.82 * Math.PI, 0.18 * Math.PI, true);
        ctx.closePath(); ctx.fillStyle = LOOK.gold[1]; ctx.fill();
        const c2 = P2(pts3[2]);
        ctx.beginPath(); ctx.moveTo(c1[0], c1[1] + rr * 1.3); ctx.lineTo(c2[0], c2[1]); strokeIt(ctx, LOOK.goldThin, 1.6);
        ctx.beginPath(); ctx.moveTo(c2[0], c2[1] - rr * 0.6); ctx.lineTo(c2[0] + rr * 0.35, c2[1]); ctx.lineTo(c2[0], c2[1] + rr * 0.6); ctx.lineTo(c2[0] - rr * 0.35, c2[1]); ctx.closePath();
        ctx.fillStyle = LOOK.gold[1]; ctx.fill();
        const l3 = P2(pts3[3]);
        furCollar(ctx, [lerp(l3[0], tip[0], -0.2), lerp(l3[1], tip[1], -0.2)], [lerp(l3[0], tip[0], 1.25), lerp(l3[1], tip[1], 1.25)], pr(0.05, tip[2]), pr(0.04, tip[2]), 4, 11);
      });
    }

    // ---- torso: armour hull, gold filigree, glowing heart, high collar
    const tRings = [
      ring(lw(chest, C, 0, 0.075, -0.01), C, 0.085, 0.08),
      ring(lw(chest, C, 0, -0.02, 0), C, 0.235, 0.13),
      ring(lw(chest, C, 0, -0.17, 0.005), C, 0.205, 0.14),
      ring(pose.waist, B, 0.155, 0.11),
      ring(add(pose.pel, mul(P.u, 0.04)), P, 0.185, 0.135),
    ];
    const torsoHull = hull([].concat(...tRings).map(P2));
    const zt = P2(lw(chest, C, 0, -0.2, 0))[2];
    const facing = dot(C.f, toCam(chest));
    push(zt + 0.01, ctx => {
      polyPath(ctx, torsoHull, true, true);
      ctx.fillStyle = bigGradient(ctx, torsoHull, LOOK.armor); ctx.fill();
      strokeIt(ctx, LOOK.armorLine);
      ctx.save(); polyPath(ctx, torsoHull, true, true); ctx.clip();
      // gold-trimmed belt (visible half)
      const belt = ring(add(pose.pel, mul(P.u, 0.07)), P, 0.19, 0.14, 28).map(p => ({ p, v: dot(sub(p, pose.pel), toCam(p)) }));
      ctx.beginPath(); let started = false;
      for (const s of belt) { if (s.v <= 0) { started = false; continue; } const q = P2(s.p); if (!started) { ctx.moveTo(q[0], q[1]); started = true; } else ctx.lineTo(q[0], q[1]); }
      ctx.lineWidth = pr(0.055, zt); ctx.strokeStyle = '#0c0a10'; ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = LOOK.goldThin; ctx.stroke();
      const vis = smoothstep(0.02, 0.35, facing);
      if (vis > 0) {
        ctx.globalAlpha = vis;
        const surf = (x, y) => {
          const rx = 0.215, rz = 0.14, zz = rz * Math.sqrt(Math.max(0, 1 - (x / rx) * (x / rx))) + 0.004;
          return P2(lw(chest, C, x, y, zz));
        };
        const line = (pts, w = 1.6) => { ctx.beginPath(); pts.forEach((q, i) => { const s = surf(q[0], q[1]); if (i) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); }); strokeIt(ctx, LOOK.goldThin, w); };
        // filigree framing the chest plate
        for (const sx of [-1, 1]) {
          line([[sx * 0.09, 0.05], [sx * 0.15, -0.03], [sx * 0.16, -0.13], [sx * 0.1, -0.25], [sx * 0.03, -0.33], [0, -0.37]]);
          line([[sx * 0.05, -0.06], [sx * 0.1, -0.1], [sx * 0.11, -0.17]], 1.3);
          line([[sx * 0.04, -0.21], [sx * 0.08, -0.24], [sx * 0.12, -0.23]], 1.3);
        }
        line([[0, -0.19], [0, -0.42]]);
        const dm = [surf(0, -0.3), surf(0.016, -0.32), surf(0, -0.345), surf(-0.016, -0.32)];
        polyPath(ctx, dm); ctx.fillStyle = LOOK.gold[1]; ctx.fill();
        // glowing heart
        const hc = surf(0, -0.115), gr = pr(0.11, zt);
        const g = ctx.createRadialGradient(hc[0], hc[1], 0, hc[0], hc[1], gr);
        g.addColorStop(0, rgba(LOOK.glow, 0.75)); g.addColorStop(0.35, rgba(LOOK.glow, 0.28)); g.addColorStop(1, rgba(LOOK.glow, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hc[0], hc[1], gr, 0, Math.PI * 2); ctx.fill();
        const heartPts = size => {
          const o = [];
          for (let i = 0; i < 28; i++) {
            const a = i / 28 * Math.PI * 2, hx = 16 * Math.pow(Math.sin(a), 3), hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
            o.push(surf(hx / 16 * size, -0.115 + hy / 16 * size));
          }
          return o;
        };
        polyPath(ctx, heartPts(0.05), true, true); ctx.fillStyle = LOOK.heart; ctx.fill();
        polyPath(ctx, heartPts(0.021), true, true); ctx.fillStyle = LOOK.heartCore; ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    });

    // ---- neck and high collar
    {
      const a = P2(lw(chest, C, 0, 0.02, 0)), b = P2(lw(head, Hf, 0, -0.06, -0.02));
      push(a[2] + 0.02, ctx => {
        capsulePath(ctx, a, b, pr(0.062, a[2]), pr(0.058, b[2]));
        ctx.fillStyle = axisGradient(ctx, a, b, pr(0.06, a[2]), LOOK.fur); ctx.fill(); strokeIt(ctx, LOOK.furLine);
      });
      const col = ring(lw(chest, C, 0, 0.1, -0.01), C, 0.1, 0.095, 20).concat(ring(lw(chest, C, 0, 0.02, -0.01), C, 0.11, 0.1, 20)).map(P2);
      push(a[2] + 0.012, ctx => {
        const hh = hull(col); polyPath(ctx, hh, true, true);
        ctx.fillStyle = bigGradient(ctx, hh, LOOK.armor); ctx.fill(); strokeIt(ctx, LOOK.armorLine);
        const top = ring(lw(chest, C, 0, 0.1, -0.01), C, 0.1, 0.095, 24).filter(p => dot(sub(p, chest), toCam(p)) > -0.02).map(P2);
        if (top.length > 2) { polyPath(ctx, top, false); strokeIt(ctx, LOOK.goldThin, 1.6); }
      });
    }

    // ---- spiked pauldrons: layered plates with gold edges
    for (const side of [-1, 1]) {
      const base = lw(chest, C, side * 0.2, -0.02, -0.01);
      const plates = [
        [side * 0.30, 1.0, -0.12, 0.25, 0.085, [0, 0.05, -0.03]],
        [side * 0.85, 0.80, -0.18, 0.27, 0.095, [side * 0.03, 0.03, -0.01]],
        [side * 1.0, 0.30, -0.12, 0.23, 0.09, [side * 0.06, 0.0, 0.01]],
        [side * 0.9, -0.25, 0.0, 0.16, 0.10, [side * 0.07, -0.04, 0.02]],
      ];
      plates.forEach(([dx, dy, dz, L, wd, off], k) => {
        const root = lw(base, C, off[0], off[1], off[2]);
        const dir = ldir(C, dx, dy, dz);
        let wv = cross(dir, C.f); wv = norm(len(wv) > 1e-3 ? wv : C.u);
        const tip3 = add(root, mul(dir, L));
        const pts3 = [add(root, mul(wv, -wd * 0.5)), add(add(root, mul(dir, L * 0.45)), mul(wv, -wd * 0.55)), tip3,
          add(add(root, mul(dir, L * 0.5)), mul(wv, wd * 0.5)), add(root, mul(wv, wd * 0.5))];
        const pts = pts3.map(P2);
        const z = avgZ(pts) - 0.004 * k - (k === 3 ? 0.01 : 0);
        push(z, ctx => {
          polyPath(ctx, pts, true, false);
          ctx.fillStyle = bigGradient(ctx, pts, LOOK.armor); ctx.fill();
          strokeIt(ctx, LOOK.armorLine, 2.4); strokeIt(ctx, LOOK.goldThin, 1.3);
          const r2 = P2(root), m2 = P2(add(root, mul(dir, L * 0.75)));
          ctx.beginPath(); ctx.moveTo(r2[0], r2[1]); ctx.lineTo(m2[0], m2[1]); strokeIt(ctx, 'rgba(222,190,120,0.55)', 1.1);
        });
      });
    }

    // ---- arms: armoured sleeves, gold-trimmed bracers, fur cuffs, clawed hands
    for (const arm of pose.arms) {
      const fwd = norm(sub(arm.hand, arm.elbow));
      const wrist = sub(arm.hand, mul(fwd, 0.075));
      const pts = [arm.shoulder, arm.elbow, wrist].map(P2);
      const rads = [0.062, 0.054, 0.05].map((r, i) => pr(r, pts[i][2]));
      push((pts[0][2] + pts[1][2] * 2 + pts[2][2]) / 4, ctx => {
        taperPath(ctx, pts, rads);
        ctx.fillStyle = axisGradient(ctx, pts[0], pts[2], Math.max(...rads), LOOK.armor); ctx.fill(); strokeIt(ctx, LOOK.armorLine);
        for (const k of [0.25, 0.8]) {                      // bracer rims
          const q = P2(mix3(arm.elbow, wrist, k)), dx = pts[2][0] - pts[1][0], dy = pts[2][1] - pts[1][1], dl = Math.hypot(dx, dy) || 1, rr = pr(0.056, q[2]);
          ctx.beginPath(); ctx.moveTo(q[0] - dy / dl * rr, q[1] + dx / dl * rr); ctx.lineTo(q[0] + dy / dl * rr, q[1] - dx / dl * rr);
          strokeIt(ctx, LOOK.goldThin, 2);
        }
        const ca = P2(sub(arm.hand, mul(fwd, 0.13))), cb = P2(sub(arm.hand, mul(fwd, 0.035)));
        furCollar(ctx, ca, cb, pr(0.055, ca[2]), pr(0.068, cb[2]), 5, arm.side + 7);
      });
      const hp = P2(arm.hand), shaftZ = P2(arm.grip)[2];
      push(Math.min(hp[2], shaftZ) - 0.035, ctx => {
        const r = pr(0.048, hp[2]);
        ctx.beginPath(); ctx.arc(hp[0], hp[1], r, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(hp[0] + LS[0] * r * 0.5, hp[1] + LS[1] * r * 0.5, 1, hp[0], hp[1], r);
        g.addColorStop(0, LOOK.fur[0]); g.addColorStop(0.7, LOOK.fur[1]); g.addColorStop(1, LOOK.fur[2]);
        ctx.fillStyle = g; ctx.fill(); strokeIt(ctx, LOOK.furLine);
        // knuckles with dark claws curling around the shaft
        const d2 = P2(add(arm.grip, mul(pose.scythe.d, 0.05)));
        const ax = d2[0] - hp[0], ay = d2[1] - hp[1], al = Math.hypot(ax, ay) || 1, ux = ax / al, uy = ay / al;
        const side2 = (P2(add(arm.grip, mul(pose.scythe.n, 0.05)))[0] - hp[0]) >= 0 ? 1 : -1;
        for (let i = -1; i <= 1; i++) {
          const cx = hp[0] + ux * r * 0.5 * i - uy * r * 0.85 * side2, cy = hp[1] + uy * r * 0.5 * i + ux * r * 0.85 * side2;
          ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.2, r * 0.16), 0, Math.PI * 2); ctx.fillStyle = '#1a1220'; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(hp[0] + ux * r * 0.3, hp[1] + uy * r * 0.3, Math.max(1, r * 0.14), 0, Math.PI * 2); ctx.fillStyle = LOOK.gold[1]; ctx.fill();
      });
    }

    // ---- head: hair, black ram horns, halo, face
    sim.back.forEach((strand, k) => {
      const pts = [backHairRig(pose, k).root, ...strand].map(P2);
      const rads = [0.05, 0.055, 0.05, 0.035, 0.004].map((r, i) => pr(r, pts[i][2]));
      push(avgZ(pts) + 0.02, ctx => {
        taperPath(ctx, pts, rads);
        ctx.fillStyle = axisGradient(ctx, pts[0], pts[pts.length - 1], Math.max(...rads), LOOK.fur); ctx.fill(); strokeIt(ctx, LOOK.furLine);
      });
    });
    sim.locks.forEach((lock, j) => {
      const side = j === 0 ? -1 : 1;
      const pts = [lockRig(pose, side).root, ...lock].map(P2);
      const rads = [0.04, 0.055, 0.058, 0.048, 0.006].map((r, i) => pr(r, pts[i][2]));
      push(avgZ(pts.slice(1, 3)) - 0.03, ctx => {
        taperPath(ctx, pts, rads);
        ctx.fillStyle = axisGradient(ctx, pts[0], pts[pts.length - 1], Math.max(...rads), LOOK.fur); ctx.fill(); strokeIt(ctx, LOOK.furLine);
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(120,110,135,0.45)';
        for (const o of [-0.35, 0.3]) {
          ctx.beginPath();
          pts.slice(0, -1).forEach((q, i) => { const n = pts[Math.min(i + 1, pts.length - 1)], dx = n[0] - q[0], dy = n[1] - q[1], dl = Math.hypot(dx, dy) || 1; const x = q[0] - dy / dl * rads[i] * o, y = q[1] + dx / dl * rads[i] * o; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
          ctx.stroke();
        }
      });
    });
    for (const side of [-1, 1]) {
      const loc = [[0.06, 0.1, 0.0], [0.095, 0.19, -0.04], [0.165, 0.255, -0.095], [0.245, 0.23, -0.135], [0.29, 0.14, -0.125],
        [0.285, 0.05, -0.085], [0.25, 0.0, -0.045], [0.215, 0.012, -0.005]];
      const pts = loc.map(([x, y, z]) => P2(lw(head, Hf, side * x, y, z)));
      const rads = [0.045, 0.043, 0.039, 0.034, 0.028, 0.021, 0.013, 0.004].map((r, i) => pr(r, pts[i][2]));
      push(avgZ(pts.slice(1, 5)), ctx => {
        taperPath(ctx, pts, rads);
        ctx.fillStyle = axisGradient(ctx, pts[0], pts[4], Math.max(...rads), LOOK.horn); ctx.fill(); strokeIt(ctx, LOOK.hornLine);
        const rs = resample(pts, rads, 4);
        ctx.lineWidth = 1.2; ctx.strokeStyle = LOOK.hornRidge;
        for (let i = 2; i < rs.pts.length - 3; i += 2) {
          const a = rs.pts[i], b = rs.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, rr = rs.rads[i] * 0.85;
          ctx.beginPath(); ctx.moveTo(a[0] - dy / dl * rr, a[1] + dx / dl * rr); ctx.lineTo(a[0] + dy / dl * rr, a[1] - dx / dl * rr); ctx.stroke();
        }
      });
    }
    {
      // halo: a vertical gold ring behind the head, a tilted orbit ring, a star above
      const hz = P2(head)[2];
      const ringA = [], ringB = [];
      const cA = lw(head, Hf, 0, 0.17, -0.13), cB = lw(head, Hf, 0, 0.2, -0.03), tilt = 16 * D2R;
      for (let i = 0; i <= 64; i++) {
        const a = i / 64 * Math.PI * 2;
        ringA.push(P2(lw(cA, Hf, Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0)));
        const ca = Math.cos(a), sa = Math.sin(a);
        ringB.push(P2(lw(cB, Hf, ca * 0.29, -sa * 0.19 * Math.sin(tilt), sa * 0.19 * Math.cos(tilt))));
      }
      const starP = P2(lw(cA, Hf, 0, 0.33, 0)), topA = P2(lw(cA, Hf, 0, 0.26, 0));
      push(hz + 0.16, ctx => {
        ctx.globalAlpha = 0.85;
        polyPath(ctx, ringA, false); strokeIt(ctx, LOOK.goldThin, 1.7);
        ctx.beginPath(); ctx.moveTo(topA[0], topA[1]); ctx.lineTo(starP[0], starP[1]); strokeIt(ctx, LOOK.goldThin, 1.3);
        for (const a of [-2.4, -0.74]) {                    // diamond pendants
          const p3 = lw(cA, Hf, Math.cos(a) * 0.26, Math.sin(a) * 0.26 - 0.045, 0), q = P2(p3), s = pr(0.02, q[2]);
          ctx.beginPath(); ctx.moveTo(q[0], q[1] - s); ctx.lineTo(q[0] + s * 0.6, q[1]); ctx.lineTo(q[0], q[1] + s * 1.3); ctx.lineTo(q[0] - s * 0.6, q[1]); ctx.closePath();
          ctx.fillStyle = '#241640'; ctx.fill(); strokeIt(ctx, LOOK.goldThin, 1.2);
        }
        ctx.globalAlpha = 1;
        fourStar(ctx, starP[0], starP[1], pr(0.032, starP[2]), 0.45);
      });
      const half = front => {
        const pts = [];
        ringB.forEach(q => { if ((q[2] < hz) === front) pts.push(q); else pts.push(null); });
        return pts;
      };
      for (const front of [true, false]) {
        const pts = half(front);
        push(hz + (front ? -0.2 : 0.15), ctx => {
          ctx.globalAlpha = 0.8; ctx.beginPath(); let on = false;
          for (const q of pts) { if (!q) { on = false; continue; } if (!on) { ctx.moveTo(q[0], q[1]); on = true; } else ctx.lineTo(q[0], q[1]); }
          strokeIt(ctx, LOOK.goldThin, 1.5); ctx.globalAlpha = 1;
        });
      }
    }
    {
      const hc = P2(head);
      const mz = P2(lw(head, Hf, 0, -0.035, 0.1)), nz = P2(lw(head, Hf, 0, -0.06, 0.19));
      const view = toCam(head);
      push(hc[2], ctx => {
        const sil = hull([...circlePts(hc, pr(0.122, hc[2]), 28), ...circlePts(mz, pr(0.078, mz[2]), 20), ...circlePts(nz, pr(0.05, nz[2]), 18)]);
        polyPath(ctx, sil, true, true);
        const r = pr(0.17, hc[2]);
        const g = ctx.createRadialGradient(hc[0] + LS[0] * r * 0.45, hc[1] + LS[1] * r * 0.45, r * 0.1, hc[0], hc[1], r * 1.25);
        g.addColorStop(0, LOOK.fur[0]); g.addColorStop(0.6, LOOK.fur[1]); g.addColorStop(1, LOOK.fur[2]);
        ctx.fillStyle = g; ctx.fill(); strokeIt(ctx, LOOK.furLine);
        // eyes: pale, narrowed, with a heavy brow
        for (const side of [-1, 1]) {
          const nrm = norm(add(mul(Hf.f, 0.72), mul(Hf.r, side * 0.69)));
          const vis = smoothstep(0.0, 0.3, dot(nrm, view));
          if (vis <= 0) continue;
          ctx.globalAlpha = vis;
          const e = lw(head, Hf, side * 0.056, 0.02, 0.1);
          const ec = P2(e), er = P2(add(e, mul(Hf.r, 0.024))), eu = P2(add(e, mul(Hf.u, 0.011)));
          const rx = Math.hypot(er[0] - ec[0], er[1] - ec[1]), ry = Math.hypot(eu[0] - ec[0], eu[1] - ec[1]);
          const rot = Math.atan2(er[1] - ec[1], er[0] - ec[0]) + side * -0.18 * (er[0] > ec[0] ? 1 : -1);
          ctx.beginPath(); ctx.ellipse(ec[0], ec[1], Math.max(1.6, rx), Math.max(1.1, ry), rot, 0, Math.PI * 2);
          ctx.fillStyle = LOOK.eye; ctx.fill(); strokeIt(ctx, LOOK.eyeLine, 1.8);
          const pp = P2(lw(head, Hf, side * 0.052, 0.02, 0.104));
          ctx.beginPath(); ctx.arc(pp[0], pp[1], Math.max(1, pr(0.005, ec[2])), 0, Math.PI * 2); ctx.fillStyle = '#3b2a5a'; ctx.fill();
          const b0 = P2(lw(head, Hf, side * 0.025, 0.04, 0.108)), b1 = P2(lw(head, Hf, side * 0.085, 0.05, 0.085));
          ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); strokeIt(ctx, LOOK.brow, Math.max(1.6, pr(0.01, ec[2])));
          ctx.globalAlpha = 1;
        }
        const nf = dot(Hf.f, view);
        if (nf > -0.35) {
          const np = P2(lw(head, Hf, 0, -0.04, 0.232));
          ctx.beginPath(); ctx.ellipse(np[0], np[1], pr(0.016, np[2]), pr(0.01, np[2]), 0, 0, Math.PI * 2);
          ctx.fillStyle = LOOK.nose; ctx.fill();
          const m0 = P2(lw(head, Hf, -0.028, -0.088, 0.17)), m1 = P2(lw(head, Hf, 0, -0.094, 0.2)), m2 = P2(lw(head, Hf, 0.028, -0.088, 0.17));
          ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.quadraticCurveTo(m1[0], m1[1] + 1, m2[0], m2[1]);
          ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(30,20,34,0.55)'; ctx.stroke();
        }
        // spiky crest of white hair on the crown
        const crest = [[-0.05, 0.1, 0.03, -0.09, 0.25, -0.03], [-0.02, 0.11, 0.04, -0.03, 0.29, -0.05], [0.01, 0.11, 0.04, 0.02, 0.3, -0.06],
          [0.04, 0.105, 0.03, 0.08, 0.26, -0.04], [0.0, 0.1, 0.07, 0.0, 0.2, 0.08]];
        for (const [x, y, z, x2, y2, z2] of crest) {
          const a = P2(lw(head, Hf, x, y, z)), b = P2(lw(head, Hf, x2, y2, z2));
          taperPath(ctx, [a, b], [pr(0.032, a[2]), 0.6], true);
          ctx.fillStyle = axisGradient(ctx, a, b, pr(0.03, a[2]), LOOK.fur); ctx.fill(); strokeIt(ctx, LOOK.furLine, 1.6);
        }
        ctx.beginPath(); ctx.arc(hc[0], hc[1] - pr(0.06, hc[2]), pr(0.07, hc[2]), 0, Math.PI * 2);
        ctx.fillStyle = LOOK.fur[1]; ctx.fill();
      });
    }

    // ---- the Reaper of the Void
    const sc = pose.scythe, shaftR = 0.022;
    const NS = 12, u0 = 0.0, u1 = RIG.shaft + 0.04;
    for (let i = 0; i < NS; i++) {
      const ua = lerp(u0, u1, i / NS), ub = lerp(u0, u1, (i + 1) / NS);
      const A = P2(sc.at(ua)), Bp = P2(sc.at(ub));
      push((A[2] + Bp[2]) / 2, ctx => {
        const ra = pr(shaftR, A[2]), rb = pr(shaftR, Bp[2]);
        const dx = Bp[0] - A[0], dy = Bp[1] - A[1], dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
        const ext = 0.6 / dl;
        const a = [A[0] - dx * ext, A[1] - dy * ext], b = [Bp[0] + dx * ext, Bp[1] + dy * ext];
        ctx.beginPath();
        ctx.moveTo(a[0] + nx * ra, a[1] + ny * ra); ctx.lineTo(b[0] + nx * rb, b[1] + ny * rb);
        ctx.lineTo(b[0] - nx * rb, b[1] - ny * rb); ctx.lineTo(a[0] - nx * ra, a[1] - ny * ra); ctx.closePath();
        ctx.fillStyle = axisGradient(ctx, A, Bp, Math.max(ra, rb), LOOK.shaft); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(a[0] + nx * ra, a[1] + ny * ra); ctx.lineTo(b[0] + nx * rb, b[1] + ny * rb);
        ctx.moveTo(a[0] - nx * ra, a[1] - ny * ra); ctx.lineTo(b[0] - nx * rb, b[1] - ny * rb);
        strokeIt(ctx, LOOK.shaftLine, 2);
        // twisted grip texture
        ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(120,112,130,0.4)';
        for (let u = Math.ceil(ua / 0.035) * 0.035; u < ub; u += 0.035) {
          if (u < 0.1 || u > 0.66) continue;
          const q = P2(sc.at(u)), rr = pr(shaftR, q[2]);
          ctx.beginPath(); ctx.moveTo(q[0] + nx * rr, q[1] + ny * rr); ctx.lineTo(q[0] - nx * rr + dx / dl * 4, q[1] - ny * rr + dy / dl * 4); ctx.stroke();
        }
        // gold fittings
        for (const [uc, hw, rr0] of [[0.69, 0.018, 0.031], [1.51, 0.018, 0.031], [2.03, 0.04, 0.033]]) {
          if (uc + hw < ua || uc - hw >= ub) continue;
          const p0 = P2(sc.at(uc - hw)), p1 = P2(sc.at(uc + hw));
          capsulePath(ctx, p0, p1, pr(rr0, p0[2]), pr(rr0, p1[2]));
          ctx.fillStyle = axisGradient(ctx, p0, p1, pr(rr0, p0[2]), LOOK.gold); ctx.fill(); strokeIt(ctx, LOOK.goldLine, 1.4);
        }
      });
    }
    {
      // gold bell pommel
      const a = P2(sc.at(0.0)), b = P2(sc.at(0.095));
      push(a[2] - 0.005, ctx => {
        taperPath(ctx, [a, b], [pr(0.036, a[2]), pr(0.025, b[2])], true);
        ctx.fillStyle = axisGradient(ctx, a, b, pr(0.036, a[2]), LOOK.gold); ctx.fill(); strokeIt(ctx, LOOK.goldLine, 1.6);
      });
    }
    // crescents: galaxy fill mapped onto the blade plane, gold rims, chunked for depth
    const hp = P2(sc.head);
    const sAx = P2(add(sc.head, mul(sc.b, 0.5))), tAx = P2(add(sc.head, mul(sc.d, 0.5)));
    const kG = 0.0017;
    const bladeM = [(sAx[0] - hp[0]) * 2 * kG, (sAx[1] - hp[1]) * 2 * kG, -(tAx[0] - hp[0]) * 2 * kG, -(tAx[1] - hp[1]) * 2 * kG, hp[0], hp[1]];
    const bladeDet = Math.abs(bladeM[0] * bladeM[3] - bladeM[1] * bladeM[2]);
    const lightK = 0.35 + 0.65 * Math.abs(dot(sc.n, LIGHT));
    const fillBlade = (ctx, poly) => {
      polyPath(ctx, poly);
      ctx.fillStyle = bigGradient(ctx, poly, LOOK.headPiece); ctx.fill();
      if (bladeDet > 1e-5) { ctx.fillStyle = galaxyPattern(ctx, bladeM); ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.fillStyle = `rgba(140,110,220,${0.05 + 0.12 * lightK})`; ctx.fill();
    };
    const bl = bladeOutline(pose, 24);
    const chunks = 4, per = 24 / chunks;
    for (let k = 0; k < chunks; k++) {
      const i0 = k * per, i1 = (k + 1) * per;
      const sp = bl.spine.slice(i0, i1 + 1).map(P2), ed = bl.edge.slice(i0, i1 + 1).map(P2);
      push(avgZ(sp.concat(ed)) - 0.01, ctx => {
        const poly = sp.concat(ed.slice().reverse());
        fillBlade(ctx, poly);
        ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; polyPath(ctx, poly); ctx.stroke();
        polyPath(ctx, sp, false); strokeIt(ctx, LOOK.goldLine, Math.max(3, pr(0.02, sp[0][2])) + 2);
        polyPath(ctx, sp, false); strokeIt(ctx, LOOK.gold[1], Math.max(3, pr(0.02, sp[0][2])));
        polyPath(ctx, sp, false); strokeIt(ctx, 'rgba(255,240,200,0.55)', 1);
        polyPath(ctx, ed, false); strokeIt(ctx, LOOK.goldLine, Math.max(2, pr(0.011, ed[0][2])) + 1.6);
        polyPath(ctx, ed, false); strokeIt(ctx, LOOK.gold[0], Math.max(2, pr(0.011, ed[0][2])));
      });
    }
    {
      const lo = [], hi = [];
      for (let i = 0; i <= 10; i++) { const a = polyAt(BLADE.backLow, i / 10), b = polyAt(BLADE.backHigh, i / 10); lo.push(P2(sc.bladePt(a[0], a[1]))); hi.push(P2(sc.bladePt(b[0], b[1]))); }
      const headPoly = BLADE.head.map(([s1, t1]) => P2(sc.bladePt(s1, t1)));
      push(hp[2] - 0.006, ctx => {
        const poly = lo.concat(hi.slice().reverse());
        fillBlade(ctx, poly); strokeIt(ctx, LOOK.goldLine, 1.2);
        polyPath(ctx, lo, false); strokeIt(ctx, LOOK.gold[1], Math.max(2.2, pr(0.013, lo[0][2])));
        polyPath(ctx, hi, false); strokeIt(ctx, LOOK.gold[0], Math.max(1.6, pr(0.008, hi[0][2])));
        polyPath(ctx, headPoly, true, true);
        ctx.fillStyle = bigGradient(ctx, headPoly, LOOK.headPiece); ctx.fill(); strokeIt(ctx, LOOK.goldLine, 2.2); strokeIt(ctx, LOOK.goldThin, 1.2);
        fourStar(ctx, hp[0], hp[1], pr(0.05, hp[2]), 0.55);
      });
    }

    // ---- restrained violet-black trail following the crescent's belly
    if (opts.trail !== false) {
      const N = 22, dt = 1 / 240, samples = [];
      const outer = polyAt(BLADE.spine, 0.62), inner = polyAt(BLADE.edge, 0.22);
      for (let j = 0; j <= N; j++) {
        const tau = t - j * dt;
        if (tau < 0) break;
        const ps = j === 0 ? pose : evalPose(tau);
        samples.push({ tp: ps.scythe.bladePt(outer[0], outer[1]), mp: ps.scythe.bladePt(inner[0], inner[1]), speed: tipSpeed(tau) });
      }
      for (let j = 0; j < samples.length - 1; j++) {
        const s0 = samples[j], s1 = samples[j + 1];
        const age = j / N, spd = smoothstep(10.5, 18, Math.min(s0.speed, s1.speed));
        const a = 0.55 * spd * Math.pow(1 - age, 1.3);
        if (a < 0.01) continue;
        const q = [s0.mp, s0.tp, s1.tp, s1.mp].map(P2);
        push(avgZ(q) - 0.02, ctx => {
          polyPath(ctx, q);
          const g = ctx.createLinearGradient(q[0][0], q[0][1], q[1][0], q[1][1]);
          const [ir, ig, ib] = LOOK.trailInner, [or_, og, ob] = LOOK.trailOuter;
          g.addColorStop(0, `rgba(${ir},${ig},${ib},0)`); g.addColorStop(0.55, `rgba(${ir},${ig},${ib},${a * 0.8})`);
          g.addColorStop(1, `rgba(${or_},${og},${ob},${a})`);
          ctx.fillStyle = g; ctx.fill();
          ctx.beginPath(); ctx.moveTo(q[1][0], q[1][1]); ctx.lineTo(q[2][0], q[2][1]);
          ctx.lineWidth = 1.6; ctx.strokeStyle = `rgba(200,170,255,${a * 0.7})`; ctx.stroke();
        });
      }
    }
    return prims;
  }

  // ---------------------------------------------------------- shadows
  function drawShadows(sctx, pose, sim) {
    const S = sctx.canvas.width / W;
    sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, sctx.canvas.width, sctx.canvas.height);
    sctx.setTransform(S, 0, 0, S, 0, 0);
    sctx.fillStyle = '#000'; sctx.strokeStyle = '#000'; sctx.lineCap = 'round'; sctx.lineJoin = 'round';
    const flo = p => project(add(p, mul(LIGHT, p[1] / -LIGHT[1])));
    const line = (pts, r) => {
      const q = pts.map(flo); sctx.beginPath(); sctx.moveTo(q[0][0], q[0][1]);
      for (let i = 1; i < q.length; i++) sctx.lineTo(q[i][0], q[i][1]);
      sctx.lineWidth = pr(r * 2, q[0][2]); sctx.stroke();
    };
    const fillHull = pts => { const q = hull(pts.map(flo)); polyPath(sctx, q); sctx.fill(); };
    for (const leg of pose.legs) line([leg.hip, leg.knee, leg.ankle, leg.foot.toe], 0.07);
    const ct = coatTargets(pose);
    fillHull(ct.map(c => c.waist).concat(sim.hem, sim.mid));
    sim.cape.forEach(col => line(col, 0.12));
    const { C, chest } = pose;
    fillHull([lw(chest, C, -0.3, 0.1, 0), lw(chest, C, 0.3, 0.1, 0), lw(chest, C, 0.16, -0.5, 0), lw(chest, C, -0.16, -0.5, 0), lw(pose.head, pose.Hf, 0, 0.12, 0)]);
    line([pose.neck, pose.head], 0.14);
    line([lw(pose.head, pose.Hf, -0.28, 0.15, -0.08), lw(pose.head, pose.Hf, 0.28, 0.15, -0.08)], 0.05);
    for (const arm of pose.arms) line([arm.shoulder, arm.elbow, arm.hand], 0.055);
    const sc = pose.scythe;
    line([sc.at(0), sc.at(RIG.shaft)], 0.024);
    const bl = bladeOutline(pose, 12);
    polyPath(sctx, bl.spine.concat(bl.edge.slice().reverse()).map(flo)); sctx.fill();
  }

  // ------------------------------------------------------------- HUD
  let FRAME_DATA = null;
  function frameData() {
    if (FRAME_DATA) return FRAME_DATA;
    const speeds = [];
    for (let f = 0; f <= DURATION * FPS; f++) speeds.push(tipSpeed(f / FPS));
    const moves = MOVES.map(m => {
      if (!m.active) return { ...m };
      const f0 = Math.round(m.t0 * FPS), f1 = Math.round(m.t1 * FPS), [a0, a1] = m.active;
      const win = speeds.slice(a0, a1 + 1);
      return { ...m, f0, f1, a0, a1, startup: a0 - f0, active: a1 - a0 + 1, recovery: f1 - a1,
        peakSpeed: Math.max(...win), minActiveSpeed: Math.min(...win) };
    });
    FRAME_DATA = { moves, speeds };
    return FRAME_DATA;
  }
  function drawHUD(ctx, t) {
    const fd = frameData(), frame = Math.round(t * FPS);
    const cur = fd.moves.find(m => t >= m.t0 && t < m.t1) || fd.moves[fd.moves.length - 1];
    ctx.save();
    // title
    ctx.font = '600 22px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = 'rgba(236,232,244,0.88)';
    ctx.textBaseline = 'top'; ctx.fillText('ASRIEL DREEMURR  ·  REAPER OF THE VOID', 56, 46);
    ctx.font = '400 17px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = 'rgba(200,194,214,0.65)';
    ctx.fillText('R1 chain · animation reference · locked gameplay camera', 56, 78);
    ctx.textAlign = 'right';
    ctx.font = '500 18px "DejaVu Sans Mono", monospace'; ctx.fillStyle = 'rgba(220,214,232,0.75)';
    ctx.fillText(`F ${String(frame).padStart(3, '0')} / ${DURATION * FPS}   ${t.toFixed(2)} s   ${FPS} fps`, W - 56, 50);
    // move caption
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const k = Math.min(1, (t - cur.t0) / 0.12);
    ctx.globalAlpha = k;
    ctx.font = '600 20px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = 'rgba(176,140,255,0.95)';
    ctx.fillText(cur.tag, 56, H - 128);
    ctx.font = '400 40px Caladea, "Liberation Serif", Georgia, serif'; ctx.fillStyle = 'rgba(242,238,248,0.96)';
    ctx.fillText(cur.name, 56, H - 84);
    ctx.globalAlpha = 1;
    // timeline: startup / active / recovery per attack
    const x0 = 56, x1 = W - 56, y = H - 52, hgt = 10, X = tt => x0 + (x1 - x0) * tt / DURATION;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x0, y, x1 - x0, hgt);
    for (const m of fd.moves) {
      if (m.a0 === undefined) continue;
      ctx.fillStyle = 'rgba(200,196,210,0.22)'; ctx.fillRect(X(m.t0), y, X(m.a0 / FPS) - X(m.t0), hgt);
      ctx.fillStyle = 'rgba(150,100,255,0.85)'; ctx.fillRect(X(m.a0 / FPS), y, X((m.a1 + 1) / FPS) - X(m.a0 / FPS), hgt);
      ctx.fillStyle = 'rgba(200,196,210,0.12)'; ctx.fillRect(X((m.a1 + 1) / FPS), y, X(m.t1) - X((m.a1 + 1) / FPS), hgt);
      ctx.fillStyle = 'rgba(10,10,14,0.9)'; ctx.fillRect(X(m.t0) - 1, y - 3, 2, hgt + 6);
    }
    ctx.fillStyle = '#f4f0fa'; ctx.fillRect(X(t) - 1.5, y - 7, 3, hgt + 14);
    ctx.font = '400 14px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = 'rgba(210,204,222,0.6)'; ctx.textAlign = 'right';
    ctx.fillText('startup  ▪  active  ▪  recovery', x1, y - 12);
    ctx.restore();
  }

  // Skeleton overlay for the interactive player.
  function drawSkeleton(ctx, pose) {
    const P2 = project;
    ctx.save(); ctx.lineWidth = 3; ctx.lineCap = 'round';
    const seg = (a, b, col) => { const p = P2(a), q = P2(b); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.strokeStyle = col; ctx.stroke(); };
    const dotAt = (a, col, r = 5) => { const p = P2(a); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); };
    seg(pose.pel, pose.chest, '#5ef0ff'); seg(pose.chest, pose.head, '#5ef0ff');
    for (const leg of pose.legs) {
      const col = leg.side < 0 ? '#ffd166' : '#ff6b9a';
      seg(leg.hip, leg.knee, col); seg(leg.knee, leg.ankle, col); seg(leg.foot.heel, leg.foot.toe, col);
      dotAt(leg.foot.contact, leg.foot.planted ? '#43ff8a' : '#ff4040', 7);
    }
    for (const arm of pose.arms) {
      const col = arm.side < 0 ? '#ffd166' : '#ff6b9a';
      seg(arm.shoulder, arm.elbow, col); seg(arm.elbow, arm.hand, col); dotAt(arm.hand, col);
    }
    seg(pose.hips ? pose.hips[0] : pose.legs[0].hip, pose.legs[1].hip, '#5ef0ff');
    seg(pose.arms[0].shoulder, pose.arms[1].shoulder, '#5ef0ff');
    // centre of mass ground projection
    const com = mix3(pose.pel, pose.chest, 0.35); dotAt([com[0], 0, com[2]], '#ffffff', 6);
    ctx.restore();
  }

  // ------------------------------------------------------------- API
  let BG = null, VIG = null, SH = null, SHB = null;
  function renderFrame(ctx, t, opts = {}) {
    if (!BG) { BG = buildBackground(); VIG = buildVignette(); SH = makeCanvas(W / 4, H / 4); SHB = makeCanvas(W / 4, H / 4); GAL = buildGalaxy(); }
    t = clamp(t, 0, DURATION);
    const pose = evalPose(t), sim = simAt(t);
    ctx.save();
    ctx.drawImage(BG, 0, 0);
    // soft cast shadow + contact shadows
    const sctx = SH.getContext('2d');
    drawShadows(sctx, pose, sim);
    SHB.getContext('2d').clearRect(0, 0, W / 4, H / 4); SHB.getContext('2d').filter = 'blur(3px)'; SHB.getContext('2d').drawImage(SH, 0, 0);
    ctx.globalAlpha = 0.3; ctx.imageSmoothingEnabled = true; ctx.drawImage(SHB, 0, 0, W, H); ctx.globalAlpha = 1;
    for (const leg of pose.legs) {
      const c0 = project(leg.foot.contact), v = norm(sub(leg.foot.contact, CAM.pos)), sq = Math.abs(v[1]);
      const r = pr(0.2, c0[2]), op = 0.42 * (1 - smoothstep(0.0, 0.12, leg.foot.ball[1] - 0.046));
      const g = ctx.createRadialGradient(c0[0], c0[1], 1, c0[0], c0[1], r);
      g.addColorStop(0, `rgba(0,0,0,${op})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(c0[0], c0[1]); ctx.scale(1, Math.max(0.2, sq)); ctx.translate(-c0[0], -c0[1]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c0[0], c0[1], r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const prims = buildPrims(pose, sim, t, opts);
    prims.sort((a, b) => b.z - a.z);
    for (const p of prims) { ctx.save(); p.fn(ctx); ctx.restore(); }
    if (opts.skeleton) drawSkeleton(ctx, pose);
    ctx.drawImage(VIG, 0, 0);
    if (opts.hud) drawHUD(ctx, t);
    ctx.restore();
  }

  return {
    W, H, FPS, DURATION, RIG, LOOK, KEYS, MOVES, BLADE, CAM,
    evalPose, bladeOutline, bladeTip, tipSpeed, project, frameData, simAt, renderFrame,
    _math: { add, sub, mul, dot, len, norm, cross, lw },
  };
});
