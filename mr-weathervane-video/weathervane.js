'use strict';
// Mr. Weathervane — an original articulated cut-paper puppet.
// Puppet space: origin between the feet on the ground, y up is negative, ~1030 units tall.
const WVC = {
  suit: '#3a3e47', suitLo: '#2c2f36', suitHi: '#4b505b', lapel: '#32363e',
  shirt: '#f7f3ea', shirtShade: '#ddd5c6',
  tie: '#14855e', tieHi: '#27aa7a', tieLo: '#0b5b40',
  skin: '#f1e5d6', skinShade: '#dccab6', blush: '#e9a597',
  hair: '#1a1c21', hairHi: '#55607a',
  mouth: '#3d1418', teeth: '#fffaf0', lip: '#b5626a', tongue: '#c75f6b',
  shoe: '#141519', iris: '#1e8e64', irisLo: '#0b4d36', sclera: '#fcf9f3',
  silver: '#cfd4dc', silverLo: '#8a919d',
};

function wvPose(o = {}) {
  return Object.assign(
    {
      x: 960, y: 1040, s: 0.8, lean: 0, bob: 0,
      headTilt: 0, nod: 0,
      al: { sh: 0.18, el: 0.12, wr: 0, hand: 'open' }, // screen-left arm (his right)
      ar: { sh: 0.18, el: 0.12, wr: 0, hand: 'open' }, // screen-right arm (his left)
      legL: 0, legR: 0,
      mouth: 0, smile: 1, brow: 0, eyeX: 0, eyeY: 0, blink: 0, eyes: 'open', storm: 0, wink: 0,
      pointer: null, pointerAng: 0, // 'l' | 'r'
      napkin: false, fork: false, stormT: 0,
      grin: 0, // 0..1 extra-wide uncanny grin
      pale: 0, // 0..1 drain colour toward a greenish pallor
    },
    o
  );
}

let _stripePat = null;
function stripePattern() {
  if (_stripePat) return _stripePat;
  const c = makeCanvas(14, 64), g = c.getContext('2d');
  g.fillStyle = 'rgba(210,216,230,0.24)';
  g.fillRect(6, 0, 1.4, 64);
  _stripePat = ctx.createPattern(c, 'repeat');
  return _stripePat;
}
function suitFill(build, color, o = {}) {
  paper(build, color, Object.assign({ tex: 0.55, edge: 'rgba(255,255,255,0.5)', edgeA: 0.25, edgeW: 1.4 }, o));
  if (o.stripes === false) return;
  ctx.save();
  ctx.beginPath(); build(ctx);
  const p = stripePattern();
  p.setTransform(new DOMMatrix().translateSelf(o.sx || 0, 0));
  ctx.fillStyle = p;
  ctx.fill();
  ctx.restore();
}

// ---------- hands (wrist at origin, fingers toward +y) ----------
function wvHand(kind, skin) {
  const sk = skin, sh = WVC.skinShade;
  const o = { d: 0.8, tex: 0.5, edge: 'rgba(255,255,255,0.6)', edgeA: 0.3 };
  if (kind === 'fist' || kind === 'point') {
    paper((c) => pRRect(c, -21, 2, 42, 40, 13), sk, o);
    line([[-12, 18], [-12, 30]], sh, 2);
    line([[0, 20], [0, 32]], sh, 2);
    line([[11, 18], [11, 30]], sh, 2);
    paper((c) => pBlob(c, -20, 18, 9, 15, 0.03, 4, 20, -0.3), sk, { d: 0.5, tex: 0.4 });
    if (kind === 'point') paper((c) => pRRect(c, 6, 30, 12, 50, 6), sk, o);
  } else if (kind === 'spread' || kind === 'wave') {
    paper((c) => pRRect(c, -20, 2, 40, 38, 14), sk, o);
    const angs = [-0.5, -0.17, 0.15, 0.45];
    angs.forEach((a, i) => {
      push(-14 + i * 9.5, 30, a);
      paper((c) => pRRect(c, -5, 0, 10, 34 - Math.abs(i - 1.5) * 4, 5), sk, { d: 0.6, tex: 0.4 });
      pop();
    });
    push(-18, 14, 0.9);
    paper((c) => pRRect(c, -5, 0, 10, 28, 5), sk, { d: 0.6, tex: 0.4 });
    pop();
  } else {
    // open, fingers together
    paper((c) => {
      c.moveTo(-19, 4);
      c.lineTo(19, 4);
      c.quadraticCurveTo(22, 40, 18, 64);
      c.quadraticCurveTo(0, 76, -16, 64);
      c.quadraticCurveTo(-22, 36, -19, 4);
      c.closePath();
    }, sk, o);
    line([[-6, 42], [-6, 66]], sh, 1.6);
    line([[4, 42], [4, 68]], sh, 1.6);
    line([[13, 42], [12, 62]], sh, 1.6);
    push(-18, 14, 0.75);
    paper((c) => pRRect(c, -5.5, 0, 11, 30, 5.5), sk, { d: 0.6, tex: 0.4 });
    pop();
  }
}

// ---------- arm (shoulder at origin, hanging toward +y) ----------
function wvArm(a, skin, side, P) {
  const UA = 160, FA = 150;
  push(0, 0, a.sh);
  // upper arm
  suitFill((c) => {
    c.moveTo(-24, -6);
    c.quadraticCurveTo(0, -20, 24, -6);
    c.lineTo(19, UA + 6);
    c.quadraticCurveTo(0, UA + 16, -19, UA + 6);
    c.closePath();
  }, WVC.suit, { d: 1.2 });
  push(0, UA, a.el);
  // forearm
  suitFill((c) => {
    c.moveTo(-19, -10);
    c.quadraticCurveTo(0, -22, 19, -10);
    c.lineTo(16.5, FA);
    c.lineTo(-16.5, FA);
    c.closePath();
  }, WVC.suit, { d: 1.2 });
  // shirt cuff + cufflink
  paper((c) => pRRect(c, -16, FA - 4, 32, 15, 4), WVC.shirt, { d: 0.6, tex: 0.5 });
  splitPin(9, FA + 4, 3.2, 'silver');
  push(0, FA + 10, a.wr);
  if (P.pointer === side) {
    // pointer rod passes through the fist
    push(0, 22, P.pointerAng);
    line([[0, -60], [0, 320]], '#18191d', 8, { d: 1 });
    line([[-1.5, -58], [-1.5, 316]], 'rgba(255,255,255,0.18)', 2);
    splitPin(0, 322, 9, 'silver');
    pop();
    wvHand('fist', skin);
  } else wvHand(a.hand || 'open', skin);
  if (P.hold && P.hold[side]) P.hold[side]();
  pop();
  splitPin(0, -2, 6.5);
  pop();
  splitPin(0, 0, 7);
  pop();
}

// ---------- weathervane emblem: rooster on an arrow, on a spindle (lapel pin; also drawn huge) ----------
function wvEmblem(x, y, s, spin = 0, o = {}) {
  push(x, y, 0, s);
  const sil = o.color || WVC.silver, lo = o.lo || WVC.silverLo;
  const oo = { d: o.d ?? 0.8, tex: 0.25, edge: 'rgba(255,255,255,0.9)', edgeA: 0.6, edgeW: 1.2 / Math.max(s, 0.01) };
  if (o.ring) {
    // compass ring with N E S W (big versions only)
    ctx.save();
    ctx.strokeStyle = lo; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 18, 26, 0, TAU); ctx.stroke();
    ctx.restore();
    const f = '9px "Bebas Neue"';
    ptext('N', 0, -4, f, sil, { d: 0, tex: 0 });
    ptext('S', 0, 50, f, sil, { d: 0, tex: 0 });
    ptext('W', -32, 22, f, sil, { d: 0, tex: 0 });
    ptext('E', 32, 22, f, sil, { d: 0, tex: 0 });
  }
  // spindle with a ball finial at the bottom
  paper((c) => pRect(c, -1.5, -18, 3, 40), lo, oo);
  splitPin(0, 23, 3.4, 'silver');
  // arrow + rooster turn together around the spindle
  push(0, -16, 0, Math.cos(spin) * 1.15, 1.15);
  paper((c) => {
    c.moveTo(-30, 0); c.lineTo(-22, -6); c.lineTo(-22, -2); c.lineTo(20, -2); c.lineTo(20, -7); c.lineTo(32, 0);
    c.lineTo(20, 7); c.lineTo(20, 2); c.lineTo(-22, 2); c.lineTo(-22, 6); c.closePath();
  }, sil, oo);
  paper((c) => {
    // rooster body, tail and comb
    c.moveTo(-8, -3); c.quadraticCurveTo(-15, -15, -7, -23); c.lineTo(-2, -16);
    c.quadraticCurveTo(6, -18, 9, -12); c.lineTo(13, -13); c.lineTo(10, -9);
    c.quadraticCurveTo(8, -4, 2, -3); c.closePath();
    c.moveTo(-7, -23); c.lineTo(-13, -31); c.lineTo(-3, -25); c.closePath();
    c.moveTo(6, -15); c.lineTo(7, -21); c.lineTo(10, -15); c.closePath();
  }, sil, oo);
  pop();
  splitPin(0, -16, 2.4, 'silver');
  pop();
}

// ---------- head (origin at neck joint; face upward) ----------
function wvFaceShape(c) {
  c.moveTo(0, -2);
  c.bezierCurveTo(26, -2, 50, -24, 55, -62);
  c.bezierCurveTo(60, -96, 61, -116, 60, -134);
  c.bezierCurveTo(57, -176, 30, -194, 0, -194);
  c.bezierCurveTo(-30, -194, -57, -176, -60, -134);
  c.bezierCurveTo(-61, -116, -60, -96, -55, -62);
  c.bezierCurveTo(-50, -24, -26, -2, 0, -2);
  c.closePath();
}
function wvEye(cx, cy, P, t, mirror) {
  const open = 1 - clamp(P.blink + (mirror && P.wink ? P.wink : 0));
  if (P.eyes === 'happy') {
    line([[cx - 15, cy + 3], [cx - 7, cy - 7], [cx + 7, cy - 7], [cx + 15, cy + 3]], WVC.hair, 4.5);
    return;
  }
  const eyeShape = (c) => {
    c.moveTo(cx - 18, cy + 1);
    c.bezierCurveTo(cx - 10, cy - 13 * open, cx + 10, cy - 14 * open, cx + 18, cy - 1);
    c.bezierCurveTo(cx + 10, cy + 9 * open, cx - 10, cy + 10 * open, cx - 18, cy + 1);
    c.closePath();
  };
  if (open < 0.12) {
    line([[cx - 18, cy + 1], [cx, cy + 4], [cx + 18, cy - 1]], WVC.hair, 3.2);
    return;
  }
  const scl = P.storm > 0.5 ? mix(WVC.sclera, '#cfe2da', (P.storm - 0.5) * 1.2) : WVC.sclera;
  paper(eyeShape, scl, { d: 0.3, tex: 0.3 });
  ctx.save();
  ctx.beginPath(); eyeShape(ctx); ctx.clip();
  const ix = cx + P.eyeX * 5, iy = cy + P.eyeY * 3 + 1;
  const R = 9.5 + P.storm * 1.5;
  if (P.storm > 0.02) {
    // storm iris: rotating spiral system with lightning glints
    const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, R);
    g.addColorStop(0, mix('#e9fff6', '#ffffff', P.storm));
    g.addColorStop(0.25, mix(WVC.iris, '#3fd6a0', P.storm));
    g.addColorStop(0.7, mix(WVC.iris, '#0f3b5a', P.storm));
    g.addColorStop(1, mix(WVC.irisLo, '#06121f', P.storm));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ix, iy, R, 0, TAU); ctx.fill();
    const rot = (P.stormT || t) * 2.2 * (mirror ? -1 : 1);
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) {
      ctx.strokeStyle = `rgba(220,255,240,${0.35 + 0.5 * P.storm})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let k = 0; k <= 14; k++) {
        const u = k / 14, a = rot + arm * (TAU / 3) + u * 3.4, r = u * R * 0.95;
        const X = ix + Math.cos(a) * r, Y = iy + Math.sin(a) * r;
        k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
    }
    if (hash2(E.f, 77) < 0.25 * P.storm) {
      ctx.strokeStyle = 'rgba(255,255,220,0.95)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ix - 3, iy - R * 0.8); ctx.lineTo(ix + 1, iy - 1); ctx.lineTo(ix - 2, iy + 1); ctx.lineTo(ix + 3, iy + R * 0.8); ctx.stroke();
    }
  } else {
    ctx.fillStyle = WVC.irisLo; ctx.beginPath(); ctx.arc(ix, iy, R, 0, TAU); ctx.fill();
    ctx.fillStyle = WVC.iris; ctx.beginPath(); ctx.arc(ix, iy, R - 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0d1512'; ctx.beginPath(); ctx.arc(ix, iy, 4.2, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(ix - 3, iy - 3.5, 2.4, 0, TAU); ctx.fill();
  // upper lid shade
  ctx.fillStyle = 'rgba(120,90,70,0.18)';
  ctx.fillRect(cx - 20, cy - 16, 40, 6);
  ctx.restore();
  line([[cx - 19, cy + 1], [cx - 9, cy - 12.5 * open], [cx + 9, cy - 13.5 * open], [cx + 19, cy - 1]], WVC.hair, 2.6);
}
function wvMouth(P) {
  const open = clamp(P.mouth);
  const w = 40 * (P.smile || 1) * (1 + 0.3 * P.grin);
  const cy = -40;
  const lift = 11 + 9 * P.grin;
  const lowerDepth = 13 + open * 19 + P.grin * 5;
  const shape = (c) => {
    c.moveTo(-w, cy - lift);
    c.bezierCurveTo(-w * 0.5, cy - 1, w * 0.5, cy - 1, w, cy - lift);
    c.bezierCurveTo(w * 0.62, cy + lowerDepth, -w * 0.62, cy + lowerDepth, -w, cy - lift);
    c.closePath();
  };
  paper(shape, WVC.mouth, { d: 0.25, tex: 0.25 });
  ctx.save();
  ctx.beginPath(); shape(ctx); ctx.clip();
  const tb = 8.5 + P.grin * 2;
  const upper = (c, dy) => {
    c.moveTo(-w - 2, cy - lift - 3 + dy);
    c.bezierCurveTo(-w * 0.5, cy - 3 + dy, w * 0.5, cy - 3 + dy, w + 2, cy - lift - 3 + dy);
  };
  // upper teeth
  ctx.fillStyle = WVC.teeth;
  ctx.beginPath(); upper(ctx, 0);
  ctx.lineTo(w + 2, cy - lift + tb);
  ctx.bezierCurveTo(w * 0.5, cy + tb - 1, -w * 0.5, cy + tb - 1, -w - 2, cy - lift + tb);
  ctx.closePath(); ctx.fill();
  if (open < 0.3) {
    // lower teeth meet the upper: the fixed broadcaster grin
    ctx.fillStyle = '#f1e9dc';
    ctx.beginPath();
    ctx.moveTo(-w - 2, cy - lift + tb + 1.5);
    ctx.bezierCurveTo(-w * 0.5, cy + tb + 0.5, w * 0.5, cy + tb + 0.5, w + 2, cy - lift + tb + 1.5);
    ctx.lineTo(w + 2, cy + 40); ctx.lineTo(-w - 2, cy + 40); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = '#5a1d26';
    ctx.beginPath(); ctx.ellipse(0, cy + lowerDepth * 0.82, w * 0.38, 7 + open * 4, 0, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(150,128,108,0.42)'; ctx.lineWidth = 0.9;
  const nT = 10 + Math.round(P.grin * 6);
  for (let i = 1; i < nT; i++) {
    const u = i / nT, x = lerp(-w, w, u);
    const yTop = cy - 2 - lift * Math.pow(Math.abs(u * 2 - 1), 1.7);
    ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yTop + tb); ctx.stroke();
    if (open < 0.3) { ctx.beginPath(); ctx.moveTo(x, yTop + tb + 2); ctx.lineTo(x, yTop + tb + 9); ctx.stroke(); }
  }
  ctx.restore();
  // upper lip line + smile creases + dimples
  line([[-w - 2, cy - lift - 1], [-w * 0.5, cy - 4], [w * 0.5, cy - 4], [w + 2, cy - lift - 1]], WVC.lip, 2, { alpha: 0.75 });
  line([[-w * 0.3, cy + lowerDepth * 0.84], [0, cy + lowerDepth * 0.9], [w * 0.3, cy + lowerDepth * 0.84]], 'rgba(170,110,100,0.22)', 1.6);
  line([[-w - 9, cy - lift - 14], [-w - 12, cy - lift + 1], [-w - 7, cy - lift + 11]], WVC.skinShade, 2.6);
  line([[w + 9, cy - lift - 14], [w + 12, cy - lift + 1], [w + 7, cy - lift + 11]], WVC.skinShade, 2.6);
}
function wvHead(P, t) {
  const skin = mix(WVC.skin, '#d3e2d2', P.pale * 0.8);
  const shade = mix(WVC.skinShade, '#b3c6b5', P.pale * 0.8);
  // neck
  paper((c) => pRRect(c, -22, -30, 44, 70, 10), shade, { d: 0.5, tex: 0.5 });
  // ears
  paper((c) => pBlob(c, -59, -100, 10, 19, 0.03, 2, 24), skin, { d: 0.6, tex: 0.5 });
  paper((c) => pBlob(c, 59, -100, 10, 19, 0.03, 3, 24), skin, { d: 0.6, tex: 0.5 });
  line([[-61, -110], [-57, -92]], shade, 2.2);
  line([[61, -110], [57, -92]], shade, 2.2);
  // face
  paper(wvFaceShape, skin, { d: 1.2, tex: 0.6, edge: 'rgba(255,255,255,0.7)', edgeA: 0.35 });
  ctx.save(); ctx.beginPath(); wvFaceShape(ctx); ctx.clip();
  // shadow side of the face (cut-paper shading layer)
  ctx.fillStyle = 'rgba(140,108,84,0.13)';
  ctx.beginPath(); ctx.moveTo(30, -194); ctx.bezierCurveTo(70, -150, 64, -60, 20, 0); ctx.lineTo(80, 0); ctx.lineTo(80, -194); ctx.closePath(); ctx.fill();
  // cheekbone highlights
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.ellipse(-36, -80, 16, 7, -0.35, 0, TAU); ctx.ellipse(36, -80, 16, 7, 0.35, 0, TAU); ctx.fill();
  ctx.restore();
  // blush
  ctx.save();
  ctx.fillStyle = rgba(WVC.blush, 0.3 * (1 - P.pale));
  ctx.beginPath(); ctx.ellipse(-36, -64, 12, 7, 0, 0, TAU); ctx.ellipse(36, -64, 12, 7, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // nose
  paper((c) => {
    c.moveTo(1, -118); c.quadraticCurveTo(-4, -96, -9, -78); c.quadraticCurveTo(-11, -71, -3, -69);
    c.quadraticCurveTo(5, -68, 8, -73); c.quadraticCurveTo(4, -76, 3, -80); c.quadraticCurveTo(3, -100, 4, -118); c.closePath();
  }, shade, { d: 0.25, tex: 0.4 });
  line([[-7, -72], [-2, -70]], 'rgba(110,75,58,0.5)', 1.8);
  // eyes + brows
  wvEye(-25, -113, P, t, false);
  wvEye(25, -113, P, t, true);
  const by = -136 - P.brow * 7;
  const inner = P.brow < 0 ? -P.brow * 8 : 0; // lowered inner brows while still smiling = menace
  line([[-44, by + 6], [-30, by - 3], [-12, by + 1 + inner]], WVC.hair, 3.8);
  line([[44, by + 6], [30, by - 3], [12, by + 1 + inner]], WVC.hair, 3.8);
  wvMouth(P);
  line([[-7, -12], [0, -10], [7, -12]], shade, 1.8);
  // hair: slick pompadour with a hard side part
  const hair = (c) => {
    c.moveTo(-57, -114);
    c.bezierCurveTo(-64, -140, -64, -168, -50, -186);
    c.bezierCurveTo(-36, -206, -10, -218, 16, -216);
    c.bezierCurveTo(44, -214, 64, -194, 64, -162);
    c.bezierCurveTo(65, -142, 62, -126, 58, -114);
    c.lineTo(54, -116);
    c.bezierCurveTo(52, -138, 46, -154, 34, -162);
    c.bezierCurveTo(18, -172, -6, -174, -22, -170);
    c.bezierCurveTo(-36, -166, -48, -152, -52, -116);
    c.closePath();
  };
  paper(hair, WVC.hair, { d: 1.2, tex: 0.2, edge: 'rgba(255,255,255,0.4)', edgeA: 0.22 });
  ctx.save(); ctx.beginPath(); hair(ctx); ctx.clip();
  // glossy wave
  ctx.fillStyle = 'rgba(120,138,170,0.28)';
  ctx.beginPath(); ctx.moveTo(-34, -190); ctx.bezierCurveTo(-10, -214, 30, -214, 56, -186);
  ctx.bezierCurveTo(34, -202, -4, -204, -34, -190); ctx.closePath(); ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(170,184,210,${0.26 - i * 0.03})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-24 + i * 14, -172 - i * 1.5);
    ctx.bezierCurveTo(-18 + i * 14, -194, 10 + i * 10, -206 + i * 2, 40 + i * 5, -196 + i * 7);
    ctx.stroke();
  }
  // side part
  ctx.strokeStyle = 'rgba(236,222,204,0.65)'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-26, -170); ctx.bezierCurveTo(-30, -184, -32, -196, -30, -210); ctx.stroke();
  ctx.restore();
}

// ---------- torso (hips at origin) ----------
function wvJacketShape(c) {
  c.moveTo(-28, -344);
  c.bezierCurveTo(-64, -340, -96, -336, -110, -322);
  c.bezierCurveTo(-115, -304, -104, -286, -98, -272);
  c.bezierCurveTo(-88, -222, -74, -182, -70, -150);
  c.bezierCurveTo(-74, -80, -82, -10, -86, 42);
  c.quadraticCurveTo(-54, 60, -20, 60);
  c.lineTo(0, -140);
  c.lineTo(20, 60);
  c.quadraticCurveTo(54, 60, 86, 42);
  c.bezierCurveTo(82, -10, 74, -80, 70, -150);
  c.bezierCurveTo(74, -182, 88, -222, 98, -272);
  c.bezierCurveTo(104, -286, 115, -304, 110, -322);
  c.bezierCurveTo(96, -336, 64, -340, 28, -344);
  c.closePath();
}
function wvLapel(c, m) {
  // m = -1 screen-left, +1 screen-right
  c.moveTo(m * 24, -346);
  c.lineTo(m * 42, -304);
  c.lineTo(m * 56, -309);
  c.lineTo(m * 80, -280);
  c.quadraticCurveTo(m * 64, -230, m * 4, -142);
  c.lineTo(m * 1, -150);
  c.quadraticCurveTo(m * 20, -250, m * 16, -340);
  c.closePath();
}

function drawWeathervane(P, t = E.T) {
  const skin = mix(WVC.skin, '#d6e3d4', P.pale * 0.8);
  push(P.x, P.y + P.bob * P.s, 0, P.s);
  // legs (hips at y=-470)
  push(0, -470, P.lean * 0.25);
  for (const [lx, la, seed] of [[-36, P.legL, 1], [36, -P.legR, 2]]) {
    push(lx, 0, la);
    suitFill((c) => {
      c.moveTo(-33, -10); c.lineTo(33, -10); c.lineTo(25, 432); c.lineTo(-25, 432); c.closePath();
    }, WVC.suit, { d: 1.1 });
    line([[lx < 0 ? 6 : -6, 70], [lx < 0 ? 4 : -4, 425]], 'rgba(255,255,255,0.12)', 2);
    // shoe
    const dir = lx < 0 ? -1 : 1;
    paper((c) => {
      c.moveTo(-28 * dir, 428);
      c.quadraticCurveTo(-30 * dir, 466, -10 * dir, 468);
      c.lineTo(62 * dir, 468);
      c.quadraticCurveTo(76 * dir, 466, 66 * dir, 448);
      c.quadraticCurveTo(44 * dir, 432, 28 * dir, 426);
      c.closePath();
    }, WVC.shoe, { d: 1, tex: 0.2 });
    line([[0, 440], [44 * dir, 444]], 'rgba(255,255,255,0.45)', 2.5);
    pop();
  }
  // torso
  push(0, 0, P.lean);
  // back arm drawn first if lowered behind? arms always in front of the jacket sides here
  suitFill(wvJacketShape, WVC.suit, { d: 1.6 });
  // vest showing in the jacket V and the cutaway below the button
  paper((c) => { c.moveTo(-28, -344); c.lineTo(28, -344); c.lineTo(0, -140); c.closePath(); }, WVC.suitLo, { d: 0.4, tex: 0.4 });
  paper((c) => { c.moveTo(-20, 62); c.lineTo(0, -138); c.lineTo(20, 62); c.lineTo(0, 30); c.closePath(); }, WVC.suitLo, { d: 0.3, tex: 0.4 });
  // shirt V + collar
  paper((c) => { c.moveTo(-22, -346); c.lineTo(22, -346); c.lineTo(0, -212); c.closePath(); }, WVC.shirt, { d: 0.4, tex: 0.5 });
  // tie
  paper((c) => {
    c.moveTo(-11, -318); c.lineTo(11, -318); c.lineTo(7, -300); c.lineTo(-7, -300); c.closePath();
  }, WVC.tieLo, { d: 0.5, tex: 0.4 });
  paper((c) => {
    c.moveTo(-7, -301); c.lineTo(7, -301); c.lineTo(13, -226); c.lineTo(0, -212); c.lineTo(-13, -226); c.closePath();
  }, WVC.tie, { d: 0.6, tex: 0.4, edge: WVC.tieHi, edgeA: 0.6 });
  line([[-2, -296], [-6, -236]], rgba(WVC.tieHi, 0.6), 2);
  paper((c) => pRect(c, -14, -262, 28, 4), WVC.silver, { d: 0.4, tex: 0 });
  // collar points
  paper((c) => { c.moveTo(-24, -350); c.lineTo(-4, -320); c.lineTo(-22, -302); c.lineTo(-30, -340); c.closePath(); }, WVC.shirt, { d: 0.5, tex: 0.4 });
  paper((c) => { c.moveTo(24, -350); c.lineTo(4, -320); c.lineTo(22, -302); c.lineTo(30, -340); c.closePath(); }, WVC.shirt, { d: 0.5, tex: 0.4 });
  // vest buttons
  for (const by of [-196, -176, -158]) splitPin(0, by, 3.2, 'silver');
  // lapels
  suitFill((c) => wvLapel(c, -1), WVC.lapel, { d: 0.9, sx: 3 });
  suitFill((c) => wvLapel(c, 1), WVC.lapel, { d: 0.9, sx: 9 });
  // jacket button
  splitPin(0, -138, 6.5, 'brass');
  // pocket square on his left breast (screen-right)
  paper((c) => { c.moveTo(46, -206); c.lineTo(58, -226); c.lineTo(72, -206); c.closePath(); }, WVC.tieHi, { d: 0.5, tex: 0.4 });
  line([[40, -205], [78, -206]], WVC.suitLo, 3.5);
  // silver weathervane lapel pin
  wvEmblem(50, -266, 0.62, Math.sin(t * 1.3) * 0.6 + (P.pinSpin || 0));
  // napkin tucked in collar
  if (P.napkin) {
    paper((c) => { c.moveTo(-26, -330); c.lineTo(26, -330); c.lineTo(64, -170); c.quadraticCurveTo(0, -150, -64, -170); c.closePath(); }, '#fbf9f2', { d: 1.2, tex: 0.6 });
    line([[-54, -186], [54, -186]], 'rgba(200,60,60,0.5)', 3);
    line([[-50, -196], [50, -196]], 'rgba(200,60,60,0.5)', 3);
  }
  // arms
  push(-100, -314);
  wvArm(P.al, skin, 'l', P);
  pop();
  push(100, -314, 0, -1, 1);
  wvArm(P.ar, skin, 'r', P);
  pop();
  // head
  push(0, -340, P.headTilt, 1.32);
  ctx.translate(0, P.nod * 4);
  scaled(1.32, () => wvHead(P, t));
  pop();
  pop(); // torso
  pop(); // legs
  pop();
}

// Lip-sync helper: replacement-mouth levels from the vocal envelope.
function vocalAt(t) {
  const D = window.MV_DATA, i = Math.floor(t * D.fps);
  const v = (D.voc[i] || 0) * 0.6 + (D.voc[i - 1] || 0) * 0.25 + (D.voc[i + 1] || 0) * 0.15;
  return v;
}
function mouthAt(t) {
  const v = vocalAt(t);
  return v > 0.42 ? 1 : v > 0.16 ? 0.5 : 0;
}
function blinkAt(t, seed = 0) {
  // blink ~ every 3-5s, 2 frames
  const k = Math.floor(t / 3.7 + hash(seed) * 3);
  const start = k * 3.7 + hash2(k, seed) * 2.5;
  return t > start && t < start + 0.17 ? 1 : 0;
}
