'use strict';
// Malacay as a jointed stained-glass figure. Figure space: feet at y = 0, up is negative,
// full height ≈ 1110. Parts are cached glass regions; joints rotate like a hinged panel.

const MC = {
  crimson: '#a8101c', crimson2: '#c41e2a', crimsonDk: '#6a0812', crimsonBk: '#480610',
  black: '#1e1926', black2: '#2c2536', steel: '#4c586c', steel2: '#6a7a92', steelDk: '#363e4d',
  silver: '#e2e7ef', silver2: '#bcc5d2', skin: '#f4e1d2', skin2: '#e8cdb9',
  hair: '#e6ecf4', hair2: '#cfd8e6', hair3: '#f5f7fb', hair4: '#aeb9cc', hairDk: '#8f9bb2',
  mail: '#3a4050', gem: '#ff1a24', boot: '#1a1620',
};
function mcPose(o = {}) {
  return Object.assign({
    x: 960, y: 1060, s: 0.9, lean: 0, headTilt: 0, nod: 0,
    al: { sh: 0.18, el: 0.12, wr: 0, hand: 'open' }, ar: { sh: 0.18, el: 0.12, wr: 0, hand: 'open' },
    mouth: 0, brow: 0, look: 0, lookY: 0, blink: 0, eyeGlow: 0, blood: 0, smirk: 0.15, snarl: 0, nimbus: 0,
  }, o);
}
const _M = (sx, pts) => (sx < 0 ? pts : mxp(pts));

// ---------- hands (hand space: wrist at the origin, fingers toward +y, thumb toward -x) ----------
function handDef(kind) {
  const shapes = [], brushes = [], fingers = [];
  const F = (bx, by, a, len, w, curl = 0) => {
    const d1 = [Math.sin(a), Math.cos(a)], m = [bx + d1[0] * len * 0.52, by + d1[1] * len * 0.52];
    const d2 = [Math.sin(a + curl), Math.cos(a + curl)], e = [m[0] + d2[0] * len * 0.48, m[1] + d2[1] * len * 0.48];
    shapes.push({ pts: capsulePts([[bx - d1[0] * 8, by - d1[1] * 8], m, e], w, w * 0.86), poly: true });
    const k = [lerp(bx, m[0], 0.95), lerp(by, m[1], 0.95)], px = d1[1] * w * 0.28, py = -d1[0] * w * 0.28;
    brushes.push({ pts: [[k[0] - px, k[1] - py], [k[0] + px, k[1] + py]], w: 1.2 });
    fingers.push({ b: [bx, by], m, e });
  };
  const thumb = (pts, w = 13) => shapes.push({ pts: capsulePts(pts, w, w * 0.84), poly: true });
  if (kind === 'fist' || kind === 'hold') {
    shapes.push({ pts: [[-25, -8], [24, -8], [28, 20], [28, 54], [18, 66], [-18, 66], [-29, 54], [-28, 20]] });
    for (const x of [-12, 1, 14]) brushes.push({ pts: [[x, 36], [x + 0.5, 50], [x, 64]], w: 1.8 });
    brushes.push({ pts: [[-24, 34], [0, 30], [25, 34]], w: 1.6 });
    thumb([[-22, 10], [-8, 30], [10, 38]], 13);
    return { shapes, brushes };
  }
  shapes.push({ pts: [[-22, -8], [21, -8], [24, 18], [24, 44], [12, 54], [-12, 55], [-25, 46], [-24, 18]] });
  if (kind === 'open') {
    F(-15, 46, -0.05, 46, 11.5); F(-5, 50, 0, 52, 11.5); F(5, 50, 0.03, 48, 11); F(15, 46, 0.08, 38, 10);
    thumb([[-18, 8], [-32, 28], [-40, 48]]);
  } else if (kind === 'reach') {
    F(-16, 46, -0.32, 48, 11.5, 0.12); F(-6, 50, -0.1, 54, 11.5, 0.06); F(5, 50, 0.1, 50, 11, -0.04); F(15, 46, 0.32, 40, 10, -0.1);
    thumb([[-18, 8], [-38, 22], [-54, 32]]);
  } else if (kind === 'claw') {
    F(-16, 46, -0.36, 44, 12, 0.95); F(-6, 50, -0.12, 50, 12, 0.85); F(5, 50, 0.12, 48, 11.5, -0.85); F(15, 46, 0.36, 38, 10.5, -0.95);
    thumb([[-18, 8], [-40, 26], [-44, 48]]);
  } else if (kind === 'point') {
    F(-15, 46, -0.04, 56, 11.5);
    for (const [x, l] of [[-4, 18], [6, 17], [15, 14]]) F(x, 50, 0, l, 11.5);
    thumb([[-18, 8], [-26, 30], [-16, 46]]);
  } else if (kind === 'bless') {
    F(-15, 46, -0.03, 54, 11.5); F(-5, 50, 0.02, 56, 11.5);
    for (const [x, l] of [[5, 16], [15, 13]]) F(x, 50, 0, l, 11);
    thumb([[-18, 8], [-20, 32], [-8, 44]]);
  }
  for (let i = 0; i + 1 < fingers.length; i++) {
    const A = fingers[i], B = fingers[i + 1];
    if (Math.hypot(A.e[0] - B.e[0], A.e[1] - B.e[1]) > 22) continue;
    brushes.push({ pts: [[(A.b[0] + B.b[0]) / 2, (A.b[1] + B.b[1]) / 2 + 6], [(A.m[0] + B.m[0]) / 2, (A.m[1] + B.m[1]) / 2], [lerp((A.m[0] + B.m[0]) / 2, (A.e[0] + B.e[0]) / 2, 0.75), lerp((A.m[1] + B.m[1]) / 2, (A.e[1] + B.e[1]) / 2, 0.75)]], w: 1.2, a: 0.4, b: 0.05 });
  }
  return { shapes, brushes };
}
function mcHand(kind = 'open') {
  unionPiece('mc.hand.' + kind, () => {
    const d = handDef(kind);
    d.mattes = [{ pts: [[-18, 8], [-20, 30], [-10, 48]], w: 14, a: 0.12 }];
    return d;
  }, MC.skin, { lw: 3.6 });
}

// ---------- arms (arm space: shoulder pivot at the origin, the arm hangs toward +y) ----------
const MC_UA = 200, MC_FA = 172;
function mcUpperArm() {
  region('mc.upper', () => ({
    out: [[-40, -26, 1], [40, -26, 1], [46, 40], [44, 120], [38, 186], [32, 214, 1], [-32, 214, 1], [-38, 186], [-44, 120], [-46, 40]],
    cuts: [[[12, -10], [18, 90], [8, 206]]],
    panels: [{ pts: [[12, -40], [18, 90], [8, 230], [80, 230], [80, -40]], poly: true, ci: 1 }],
    mattes: [{ pts: [[-40, -10], [-42, 100], [-34, 206]], w: 26, a: 0.3 }, { pts: [[20, 0], [24, 100], [14, 200]], w: 12, a: 0.18 }],
  }), [MC.crimson, MC.crimson2], { lw: 5.5 });
}
// forearm with the silver-flame cuff (elbow at the origin, wrist at (0, MC_FA))
function mcForearm() {
  region('mc.fore', () => ({
    out: [[-34, -16, 1], [34, -16, 1], [36, 50], [32, 106], [40, 134], [50, 172, 1], [-50, 172, 1], [-40, 134], [-32, 106], [-36, 50]],
    cuts: [[[-60, 114], [0, 120], [60, 114]], [[10, -10], [14, 60], [8, 112]]],
    panels: [{ pts: [[-70, 114], [0, 120], [70, 114], [70, 200], [-70, 200]], poly: true, ci: 2 }, { pts: [[10, -30], [14, 60], [8, 116], [70, 116], [70, -30]], poly: true, ci: 1 }],
    mattes: [{ pts: [[-32, -4], [-34, 60], [-30, 108]], w: 22, a: 0.28 }],
  }), [MC.crimson, MC.crimson2, MC.crimsonDk], { lw: 5.5 });
  glassSet('mc.cufflame', () => [-36, -12, 12, 36].map((x, i) => tongue([x - 13, 170], [x + 13, 170], [x + (i % 2 ? 5 : -5), 130 - (i % 2) * 8], i % 2 ? 0.14 : -0.14)),
    (i) => (i % 2 ? MC.silver2 : MC.silver), { lw: 3 });
}
function mcArm(a, P) {
  push(0, 0, a.sh);
  mcUpperArm();
  push(0, MC_UA, a.el);
  mcForearm();
  push(0, MC_FA + 2, a.wr);
  if (P.hold && P.hold[a.side]) P.hold[a.side]('under');
  mcHand(a.hand || 'open');
  if (P.hold && P.hold[a.side]) P.hold[a.side]('over');
  pop();
  pop();
  pop();
}

// ---------- head (head space: chin at the origin) ----------
const MC_FACE = [[0, 4], [11, 3], [21, -2], [33, -14], [43, -27], [47, -36], [50, -54], [53, -78], [55, -100], [54, -120], [48, -136], [35, -149], [18, -156], [0, -159], [-18, -156], [-35, -149], [-48, -136], [-54, -120], [-55, -100], [-53, -78], [-50, -54], [-47, -36], [-43, -27], [-33, -14], [-21, -2], [-11, 3]];
// hairline, temple to temple; the swept-back locks rise from it toward tips on the silhouette
const MC_HL = [[-57, -98], [-53, -121], [-39, -136], [-19, -144], [0, -146], [19, -144], [39, -136], [53, -121], [57, -98]];
const MC_SWEEPS = [
  [0, 1, [-96, -122], 0.2], [1, 2, [-90, -166], 0.16], [2, 3, [-66, -198], 0.13], [3, 4, [-28, -214], 0.1],
  [4, 5, [26, -214], -0.1], [5, 6, [64, -200], -0.13], [6, 7, [90, -168], -0.16], [7, 8, [98, -124], -0.2],
];
function mcHeadBack(P, t) {
  // swept hair gathered behind the head, ending in flared points at the nape
  region('mc.hairback', () => {
    const out = [[0, -204], [50, -196], [82, -166], [94, -122], [92, -76], [96, -34], [112, 2, 1], [86, -10], [92, 24, 1], [66, 0], [62, 28, 1], [42, 2], [0, -6], [-42, 2], [-62, 28, 1], [-66, 0], [-92, 24, 1], [-86, -10], [-112, 2, 1], [-96, -34], [-92, -76], [-94, -122], [-82, -166], [-50, -196]];
    const strands = [];
    for (const sx of [-1, 1]) for (const [x0, y0, x1, y1, x2, y2] of [[40, -200, 90, -110, 104, -4], [30, -190, 76, -90, 86, 18], [20, -180, 58, -70, 60, 22]]) strands.push([[sx * x0, y0], [sx * x1, y1], [sx * x2, y2]]);
    return { out, strands, cuts: [[[-74, -60], [-80, -4]], [[74, -60], [80, -4]]] };
  }, [MC.hair4], { lw: 5, keep: true, strandW: 1.8, strandCol: 'rgba(60,64,90,0.45)' });
}
function mcHeadFront(P, t) {
  const sw = Math.sin(t * 1.3) * 1.6;
  // ears, half hidden by the swept hair
  for (const sx of [-1, 1]) region('mc.ear' + sx, () => ({ out: _M(sx, [[-50, -98], [-60, -102], [-66, -92], [-64, -76], [-58, -62], [-50, -60]]), brushes: [{ pts: _M(sx, [[-58, -92], [-61, -82], [-57, -70]]), w: 2 }] }), [MC.skin2], { lw: 4, keep: true });
  region('mc.face', () => ({
    out: MC_FACE,
    mattes: [
      { pts: [[-51, -80], [-42, -62], [-30, -52]], w: 16, a: 0.18 }, { pts: [[51, -80], [42, -62], [30, -52]], w: 16, a: 0.18 },
      { pts: [[-50, -50], [-40, -20], [-18, -2]], w: 14, a: 0.16 }, { pts: [[50, -50], [40, -20], [18, -2]], w: 14, a: 0.16 },
      { pts: [[-55, -128], [-55, -98]], w: 14, a: 0.12 }, { pts: [[55, -128], [55, -98]], w: 14, a: 0.12 },
      { pts: [[-9, -94], [-11, -62]], w: 9, a: 0.16 },
    ],
  }), [MC.skin], { lw: 5, keep: true, paint: () => mcFacePaint(P, t) });
  // the crown of hair behind the locks
  region('mc.crown', () => ({ out: [[-60, -96], [-92, -122], [-94, -162], [-72, -198], [-32, -216], [0, -212], [30, -216], [70, -200], [94, -164], [98, -124], [60, -96], [52, -124], [38, -140], [0, -150], [-38, -140], [-52, -124]] }), [MC.hair4], { lw: 5, keep: true });
  glassSet('mc.sweeps', () => MC_SWEEPS.map(([i0, i1, tip, k]) => tongue(MC_HL[i0], MC_HL[i1], tip, k, k * 0.75)), [MC.hair2, MC.hair, MC.hair3, MC.hair, MC.hair3, MC.hair, MC.hair3, MC.hair2], { lw: 4.6, keep: true });
  ctx.save();
  ctx.strokeStyle = 'rgba(70,74,100,0.4)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  for (const [i0, i1, tip, k] of MC_SWEEPS) for (const s of tongueStrands(MC_HL[i0], MC_HL[i1], tip, k, 2)) ctx.stroke(spath(s, false));
  ctx.restore();
  // loose locks falling over the brow
  push(sw * 0.3, 0);
  glassSet('mc.locks', () => [
    [[-19, -146, 1], [-27, -132], [-32, -116], [-28, -100, 1], [-23, -114], [-16, -128], [-7, -147, 1]],
    [[16, -146, 1], [27, -132], [36, -116], [34, -100, 1], [28, -114], [22, -128], [27, -142, 1]],
  ], [MC.hair3, MC.hair], { lw: 3.6, keep: true });
  pop();
}
function mcFacePaint(P, t) {
  const bl = E.blood || 0, b = clamp(P.brow, -1, 1), sm = P.smirk, sn = P.snarl || 0;
  const lk = P.look * 5, ly = P.lookY * 2.5, open = 1 - clamp(P.blink);
  for (const sx of [-1, 1]) {
    const X = (x) => sx * x;
    // brow: thick at the inner end, drawn down in resolve or anger
    brush([[X(12), -101 + b * 3.5], [X(27), -108 - (1 - Math.abs(b)) * 1.5 + b * 1.2], [X(47), -105 - b * 1.5]], 6.2, { a: 0.6, b: 0.1 });
    // eye
    const ix = X(27.5) + lk, iy = -88.5 + ly;
    const lower = [[X(15), -85.5], [X(28), -82.5], [X(39), -87]];
    const upY = (y, ly2) => lerp(ly2, y, open) + Math.max(0, b) * 1.2 * open;
    const upper = [[X(11), -86.5], [X(20), upY(-93, -84.5)], [X(30), upY(-95, -83)], [X(43), -90]];
    matteLine([[X(12), -96], [X(28), -100], [X(44), -96]], 10, 0.14);
    if (open > 0.15) {
      const eye = spath([[upper[0][0], upper[0][1], 1], upper[1], upper[2], [upper[3][0], upper[3][1], 1], ...lower.slice().reverse()], true);
      ctx.save();
      ctx.fillStyle = 'rgba(252,250,246,0.8)'; ctx.fill(eye);
      ctx.clip(eye);
      const glow = Math.max(P.eyeGlow || 0, bl);
      ctx.fillStyle = glow > 0.3 ? `rgb(255,${(60 + 80 * glow) | 0},50)` : 'rgb(128,18,30)';
      ctx.beginPath(); ctx.arc(ix, iy, 6.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(20,6,6,0.95)'; ctx.beginPath(); ctx.arc(ix, iy, 2.7, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(ix - 2, iy - 2.2, 1.5, 0, TAU); ctx.fill();
      ctx.restore();
      if (glow > 0.05) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, 18);
        g.addColorStop(0, `rgba(255,60,40,${0.8 * glow})`); g.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, iy, 18, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    // lids: heavy upper lid, faint lower lid, crease
    brush(upper, 4.4, { a: 0.25, b: 0.55 });
    if (open > 0.15) brush(lower, 1.7, { c: 'rgba(42,20,12,0.5)' });
    brush([[X(16), -97], [X(29), -101.5], [X(41), -97]], 1.5, { c: 'rgba(42,20,12,0.4)' });
    // under the cheekbone
    brush([[X(36), -66], [X(31), -57]], 1.4, { c: 'rgba(42,20,12,0.3)' });
  }
  // nose: shaded side, tip and nostrils
  brush([[-7, -92], [-9.5, -72], [-11, -58]], 2.3, { a: 0.1, b: 0.6 });
  brush([[-12, -55], [-7, -50.5], [-1, -51.5]], 2.4, { a: 0.3, b: 0.2 });
  brush([[3, -51.5], [8, -50.5], [12, -55]], 2.2, { a: 0.2, b: 0.3 });
  matteEll(0, -47, 13, 4, 0.22);
  // mouth: firm, sculpted; the faint smirk lifts its right corner
  const m = clamp(P.mouth), yU = -28, drop = m * 15;
  const lc = [-19 - sn * 2, yU + 1 + sn * 1.5], rc = [19 + sn * 2, yU - sm * 3.5 + sn * 1.5];
  if (m > 0.06) {
    ctx.save();
    const mp = new Path2D();
    mp.moveTo(lc[0], lc[1]);
    mp.bezierCurveTo(-8, yU - 2 - sn * 2, 8, yU - 2 - sn * 2, rc[0], rc[1]);
    mp.bezierCurveTo(8, yU + drop * 1.15 + 2, -8, yU + drop * 1.15 + 2, lc[0], lc[1]);
    ctx.fillStyle = 'rgba(52,8,12,0.94)'; ctx.fill(mp);
    ctx.clip(mp);
    if (m > 0.25) { ctx.fillStyle = 'rgba(250,244,234,0.85)'; ctx.fillRect(-14, yU - 4 - sn * 2, 28, 4.2 + sn * 2); }
    ctx.restore();
  }
  brush([lc, [-8, yU - 1.8 - sn * 2], [0, yU - 0.6 - sn * 2], [8, yU - 1.8 - sn * 2], rc], 3.3, { a: 0.15, b: 0.15 });
  matteLine([[-11, yU - 3.5], [0, yU - 5], [11, yU - 3.5]], 4, 0.18);
  matteLine([[-10, yU + 6 + drop], [0, yU + 8 + drop], [10, yU + 6 + drop]], 6, 0.24);
  brush([[-6, yU + 13 + drop], [0, yU + 14.5 + drop], [6, yU + 13 + drop]], 1.5, { c: 'rgba(42,20,12,0.45)' });
  if (sm > 0.1) brush([[rc[0] - 1, rc[1] - 2], [rc[0] + 2.5, rc[1] + 1.5]], 1.4, { c: `rgba(42,20,12,${0.5 * sm})` });
  brush([[-5, -8], [0, -6.5], [5, -8]], 1.4, { c: 'rgba(42,20,12,0.35)' });
  if (bl > 0.05) {
    ctx.save(); ctx.globalAlpha = bl;
    drawVeins(veinGeo('mcface', [[-30, 6, -1.75, 70], [30, 6, -1.4, 70], [-44, -30, -2.1, 46], [44, -30, -1.05, 46], [-6, 6, -1.6, 36]], { seed: 5, wander: 0.8, branch: 0.3 }), 1.6, bl, E.pulse ?? 1);
    ctx.restore();
  }
}

// ---------- body ----------
function mcFolds(key, tops, bots, y0, y1, bow) {
  const f = fanFolds(tops, bots, y0, y1, bow);
  return { cuts: f.cuts, panels: f.panels, mattes: f.cuts.map((c) => ({ pts: c.map(([x, y]) => [x + 11, y]), w: 24, a: 0.32 })) };
}
function drawMalacay(P, t = E.T) {
  const prevBlood = E.blood, prevK = E.leadK;
  E.blood = P.blood || 0;
  push(P.x, P.y, 0, P.s);
  const dsc = devScale();
  E.leadK = dsc > 1.2 ? Math.pow(1.2 / dsc, 0.4) : 1;
  scaled(P.s, () => {
    if (P.nimbus > 0) mcNimbus(P, t);
    // long coat back and tails
    region('mc.back', () => Object.assign({
      out: [[-150, -900, 1], [150, -900, 1], [178, -760], [206, -520], [242, -290], [272, -90], [292, -24, 1], [246, -36], [214, -16, 1], [178, -40], [120, -34], [0, -42], [-120, -34], [-178, -40], [-214, -16, 1], [-246, -36], [-292, -24, 1], [-272, -90], [-242, -290], [-206, -520], [-178, -760]],
    }, mcFolds('back', [-118, -78, -38, 0, 38, 78, 118], [-250, -168, -84, 0, 84, 168, 250], -660, -30, 0.03)),
    (i) => (i % 2 ? MC.crimsonDk : MC.crimsonBk), { lw: 6, veins: { key: 'back', roots: [[0, -660, 1.57, 420], [-90, -640, 1.9, 420], [90, -640, 1.25, 420]], w: 3, seed: 11 } });
    push(0, -650, P.lean); ctx.translate(0, 650);
    // tall flared collar
    for (const sx of [-1, 1]) {
      region('mc.collar' + sx, () => ({
        out: _M(sx, [[-34, -908, 1], [-44, -950], [-58, -1000], [-72, -1046, 1], [-112, -1064], [-168, -1092, 1], [-158, -1034], [-140, -976], [-122, -910, 1]]),
        panels: [
          { pts: _M(sx, [[-184, -1104], [-174, -1034], [-156, -976], [-138, -896], [-110, -896], [-126, -976], [-144, -1034], [-154, -1082]]), poly: true, ci: 1 },
          { pts: _M(sx, [[-66, -1064], [-110, -1082], [-184, -1112], [-154, -1082], [-108, -1052], [-66, -1036]]), poly: true, ci: 1 },
        ],
        cuts: [_M(sx, [[-154, -1082], [-144, -1034], [-126, -976], [-110, -900]]), _M(sx, [[-66, -1036], [-108, -1052], [-154, -1082]])],
        mattes: [{ pts: _M(sx, [[-48, -930], [-60, -990], [-76, -1040]]), w: 46, a: 0.35 }],
      }), [MC.black, MC.silver], { lw: 6 });
    }
    // hair falling behind the head
    push(0, -950, P.headTilt); ctx.translate(0, P.nod * 5);
    mcHeadBack(P, t);
    pop();
    // legs
    for (const sx of [-1, 1]) {
      region('mc.breech' + sx, () => ({
        out: _M(sx, [[-12, -660, 1], [-90, -660, 1], [-94, -470], [-88, -322, 1], [-18, -322, 1], [-14, -470]]),
        cuts: [_M(sx, [[-54, -660], [-58, -480], [-50, -322]])], panels: [{ pts: _M(sx, [[-54, -700], [-58, -480], [-50, -300], [40, -300], [40, -700]]), poly: true, ci: 1 }],
      }), [MC.black, MC.black2], { lw: 5 });
      region('mc.boot' + sx, () => ({
        out: _M(sx, [[-90, -340, 1], [-14, -340, 1], [-18, -200], [-20, -96], [-14, -46], [-18, -6], [-56, 4], [-102, 0], [-116, -14], [-100, -44], [-84, -98], [-88, -200]]),
        cuts: [_M(sx, [[-92, -126], [-50, -118], [-14, -126]]), _M(sx, [[-92, -102], [-50, -94], [-14, -102]])],
        panels: [{ pts: _M(sx, [[-120, -126], [-50, -118], [10, -126], [10, -102], [-50, -94], [-120, -102]]), poly: true, ci: 1 }],
        mattes: [{ pts: _M(sx, [[-80, -330], [-78, -200], [-74, -60]]), w: 20, a: 0.25 }],
      }), [MC.boot, MC.silver2], { lw: 5 });
      region('mc.cuffb' + sx, () => ({ out: _M(sx, [[-98, -356, 1], [-8, -356, 1], [-10, -316, 1], [-96, -316, 1]]), panels: [{ pts: _M(sx, [[-110, -330], [0, -330], [0, -300], [-110, -300]]), poly: true, ci: 1 }], cuts: [_M(sx, [[-110, -326], [0, -326]])] }), [MC.black2, MC.silver2], { lw: 5 });
    }
    // coat skirts with the silver flame hem
    for (const sx of [-1, 1]) {
      region('mc.skirt' + sx, () => Object.assign({
        out: _M(sx, [[-36, -632, 1], [-122, -632, 1], [-152, -480], [-194, -280], [-250, -64, 1], [-200, -58], [-150, -66], [-104, -82], [-70, -98, 1], [-56, -300], [-44, -500]]),
      }, (() => { const f = mcFolds('sk', _M(sx, [[-62, 0], [-88, 0], [-108, 0]]).map((p) => p[0]), _M(sx, [[-112, 0], [-162, 0], [-212, 0]]).map((p) => p[0]), -632, -60, 0.035); return f; })()),
      (i) => [MC.crimson2, MC.crimson, MC.crimsonDk, MC.crimson, MC.crimson2][sx < 0 ? i : 4 - i], { lw: 6, veins: { key: 'skirt' + sx, roots: [[sx * -60, -632, sx < 0 ? 1.8 : 1.34, 380], [sx * -110, -632, sx < 0 ? 1.95 : 1.19, 360]], w: 2.6, seed: 21 + sx } });
      glassSet('mc.hem' + sx, () => {
        const hem = _M(sx, [[-72, -96], [-104, -82], [-150, -66], [-200, -58], [-246, -66]]);
        const out = [], n = 7;
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n, f = u * (hem.length - 1), j = Math.min(hem.length - 2, Math.floor(f)), r = f - j;
          const x = lerp(hem[j][0], hem[j + 1][0], r), y = lerp(hem[j][1], hem[j + 1][1], r) - 4, w = 29;
          out.push(tongue([x - w / 2, y + 2], [x + w / 2, y - 2], [x + (i % 2 ? 6 : -6), y - 44 - (i % 3) * 8], i % 2 ? 0.16 : -0.16));
        }
        return out;
      }, (i) => (i % 2 ? MC.silver2 : MC.silver), { lw: 3.2 });
    }
    // neck
    region('mc.neck', () => ({ out: [[-22, -972, 1], [22, -972, 1], [27, -905, 1], [-27, -905, 1]], poly: true, mattes: [{ pts: [[-30, -956], [0, -948], [30, -956]], w: 28, a: 0.45 }, { pts: [[-18, -940], [-20, -910]], w: 10, a: 0.2 }] }), [MC.skin2], { lw: 4.5, keep: true });
    // chainmail vest and straps
    region('mc.vest', () => ({ out: [[-46, -914], [46, -914], [42, -644], [-42, -644]], poly: true }), [MC.mail], {
      lw: 5,
      paint: () => {
        ctx.save(); ctx.strokeStyle = 'rgba(10,10,16,0.55)'; ctx.lineWidth = 1.5;
        if (!E._mail) { E._mail = new Path2D(); for (let y = -908; y < -644; y += 9) for (let x = -44 + ((Math.round(y / 9) & 1) * 4.5); x < 46; x += 9) { E._mail.moveTo(x + 3.8, y); E._mail.arc(x, y, 3.8, 0, Math.PI); } }
        ctx.stroke(E._mail); ctx.restore();
      },
    });
    glassSet('mc.straps', () => [-872, -820, -768, -716].map((y) => ({ pts: [[-50, y - 8], [50, y - 8], [50, y + 8], [-50, y + 8]], poly: true, ci: 0 })), [MC.black], { lw: 4 });
    glassSet('mc.buckles', () => [-872, -820, -768, -716].map((y) => ({ pts: [[-11, y - 12], [11, y - 12], [11, y + 12], [-11, y + 12]], poly: true, ci: 0 })), [MC.silver], { lw: 3.5 });
    // crimson coat chest: lapel, chest, silver edging down the opening
    for (const sx of [-1, 1]) {
      region('mc.chest' + sx, () => ({
        out: _M(sx, [[-40, -914, 1], [-100, -908], [-170, -890, 1], [-168, -800], [-146, -720], [-118, -646, 1], [-40, -646, 1]]),
        panels: [{ pts: _M(sx, [[-30, -930], [-112, -924], [-66, -790], [-30, -756]]), poly: true, ci: 1 }, { pts: _M(sx, [[-200, -812], [-150, -760], [-112, -700], [-96, -620], [-200, -620]]), poly: true, ci: 2 }],
        cuts: [_M(sx, [[-112, -924], [-66, -790], [-30, -756]]), _M(sx, [[-200, -812], [-150, -760], [-112, -700], [-96, -620]])],
        mattes: [{ pts: _M(sx, [[-164, -880], [-150, -780], [-126, -680]]), w: 34, a: 0.32 }, { pts: _M(sx, [[-60, -780], [-50, -700]]), w: 18, a: 0.2 }],
      }), [MC.crimson2, MC.crimsonDk, MC.crimson], { lw: 6, veins: { key: 'chest' + sx, roots: [[sx * -48, -800, sx < 0 ? 3.3 : -0.16, 130], [sx * -60, -700, sx < 0 ? 2.6 : 0.54, 110]], w: 2.4, seed: 31 + sx } });
      region('mc.edge' + sx, () => ({ out: _M(sx, [[-52, -912], [-40, -912], [-40, -646], [-52, -646]]), poly: true }), [MC.silver2], { lw: 3.5 });
    }
    // belt, buckle and the great red gem; a hanging chain
    region('mc.belt', () => ({ out: [[-124, -674], [124, -674], [124, -628], [-124, -628]], poly: true }), [MC.black], { lw: 5 });
    region('mc.buckle', () => ({ out: arcPts(0, -651, 30, 30, 0, TAU, 20).slice(0, -1) }), [MC.silver], { lw: 4.5 });
    region('mc.gem', () => ({ out: arcPts(0, -651, 16, 18, 0, TAU, 16).slice(0, -1) }), [MC.gem], { lw: 3.5, keep: true, glow: 1, glowR: 22 });
    mcChain(-112, -630, -50, -626, 46, 8);
    // pendant at the throat
    glassSet('mc.pendant', () => [{ pts: [[0, -936], [16, -916], [0, -892], [-16, -916]], poly: true, ci: 0 }, { pts: [[0, -928], [9, -916], [0, -901], [-9, -916]], poly: true, ci: 1 }], [MC.silver, MC.gem], { lw: 3, keep: true, glow: 0.7, glowR: 14 });
    // arms, then the pauldrons over the shoulder tops
    for (const [a, sx] of [[P.al, -1], [P.ar, 1]]) {
      push(sx * 168, -874, 0, -sx, 1);
      mcArm(Object.assign({ side: sx < 0 ? 'l' : 'r' }, a), P);
      pop();
    }
    for (const sx of [-1, 1]) mcPauldron(sx, sx < 0 ? P.al.sh : P.ar.sh);
    // head
    push(0, -950, P.headTilt); ctx.translate(0, P.nod * 5);
    mcHeadFront(P, t);
    pop();
    pop();
  });
  pop();
  E.blood = prevBlood; E.leadK = prevK;
}
// a golden nimbus behind the head: the god he has made himself
function mcNimbus(P, t) {
  push(0, -1040, P.headTilt * 0.5);
  ctx.globalAlpha *= clamp(P.nimbus);
  const R = 172;
  const tt = tessRadial('mc.nimbus', 0, 0, 0, R, 2, 18, { rot: 0.1 });
  glassField(tt, (x, y, c) => _bloodCol(c.rr < R * 0.45 ? '#fff0a8' : ((Math.round((c.a + 4) * 18 / TAU) & 1) ? '#ffc23a' : '#f4a020'), {}), { leadW: 4.5 });
  const ring = arcPts(0, 0, R, R, 0, TAU, 60).slice(0, -1);
  ringJewels(ring, 18, 24, ['#ffd24a', '#c8202c']);
  pop();
}
function mcPauldron(sx, sh) {
  const lames = [
    [[-98, -930, 1], [-134, -952], [-186, -948], [-228, -912], [-244, -866, 1], [-214, -880], [-172, -900], [-130, -906], [-102, -900, 1]],
    [[-108, -904, 1], [-142, -924], [-192, -918], [-234, -880], [-252, -832, 1], [-220, -846], [-178, -868], [-138, -876], [-110, -872, 1]],
    [[-120, -876, 1], [-152, -894], [-198, -886], [-238, -848], [-256, -798, 1], [-224, -814], [-184, -838], [-146, -848], [-122, -844, 1]],
  ];
  for (let k = 2; k >= 0; k--) {
    push(sx * 168, -874, -sx * sh * (k * 0.22)); ctx.translate(-sx * 168, 874);
    region(`mc.paul${sx}.${k}`, () => {
      const L = lames[k], bot = L.slice(4, 9);
      const up = bot.map(([x, y]) => [x, y - 10]), down = bot.map(([x, y]) => [x, y + 24]);
      return {
        out: _M(sx, L),
        panels: [{ pts: _M(sx, down.concat(up.slice().reverse())), poly: true, ci: 1 }],
        cuts: [_M(sx, up)],
        mattes: [{ pts: _M(sx, [[L[1][0], L[1][1] + 6], [L[2][0], L[2][1] + 8], [L[3][0] + 6, L[3][1] + 4]]), w: 10, a: 0.2 }],
      };
    }, [k === 1 ? MC.steel2 : MC.steel, MC.crimson2], {
      lw: 5.5,
      paint: () => {
        const L = lames[k];
        ctx.save();
        for (const j of [1, 2, 3]) {
          const y = L[j][1] + 12, px = sx < 0 ? L[j][0] : -L[j][0];
          ctx.fillStyle = 'rgba(20,20,26,0.7)'; ctx.beginPath(); ctx.arc(px, y, 3.6, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(235,240,248,0.85)'; ctx.beginPath(); ctx.arc(px - 0.8, y - 0.8, 2, 0, TAU); ctx.fill();
        }
        ctx.restore();
      },
    });
    pop();
  }
}
function mcChain(x0, y0, x1, y1, sag, n) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u) + Math.sin(u * Math.PI) * sag;
    const dx = x1 - x0, dy = (y1 - y0) + Math.cos(u * Math.PI) * Math.PI * sag, a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath();
    if (i % 2) ctx.ellipse(0, 0, 8, 2.5, 0, 0, TAU); else ctx.ellipse(0, 0, 8, 5.5, 0, 0, TAU);
    ctx.lineWidth = 5.5; ctx.strokeStyle = '#151419'; ctx.stroke();
    ctx.lineWidth = 2.6; ctx.strokeStyle = (E.blood || 0) > 0.3 ? '#a02030' : '#d8dee8'; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ---------- lip-sync (word-driven replacement mouths) ----------
let _wordSpans = null;
function wordSpans() {
  if (_wordSpans) return _wordSpans;
  _wordSpans = [];
  for (const L of window.MV_DATA.lines) L.words.forEach((w, k) => {
    const next = k + 1 < L.words.length ? L.words[k + 1].t : L.e;
    const letters = w.w.replace(/[^A-Za-z]/g, '').length;
    _wordSpans.push([w.t, w.t + Math.max(0.16, Math.min(next - w.t - 0.02, 0.12 + letters * 0.08, 1.0)), L.e]);
  });
  return _wordSpans;
}
const MOUTH_CYCLE = [1, 0.6, 1, 0.5, 0.2, 1, 0.6, 0.9, 0.2];
function mouthAt(t) {
  const sp = wordSpans();
  let lo = 0, hi = sp.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (sp[m][0] <= t) { r = m; lo = m + 1; } else hi = m - 1; }
  if (r < 0) return 0;
  const [a, b, lineEnd] = sp[r];
  if (t <= b) return MOUTH_CYCLE[Math.floor((t - a) * 12) % MOUTH_CYCLE.length];
  const nextStart = r + 1 < sp.length ? sp[r + 1][0] : Infinity;
  const D = window.MV_DATA, i = Math.floor(t * D.fps);
  if (t < Math.min(nextStart, lineEnd + 0.2) && (D.voc[i] || 0) > 0.3) return 0.8;
  return 0;
}
function blinkAt(t, seed = 0) {
  const k = Math.floor(t / 4.1 + hash(seed) * 3);
  const start = k * 4.1 + hash2(k, seed) * 2.8;
  return t > start && t < start + 0.17 ? 1 : 0;
}
