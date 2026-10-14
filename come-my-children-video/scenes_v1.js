'use strict';
// VERSE 1 (47.9 – 73.06) and PRE-CHORUS 1 (73.06 – 86.24)

function warmGround(key, t, o = {}) {
  quarries(key, 0, 0, W, H, o.size || 92, (x, y, c) => {
    const v = hash(c.seed), k = clamp(y / H);
    const a = o.a || '#f0a838', b = o.b || '#c86418';
    return v < 0.15 ? lerpRGB(o.c || '#ffd060', b, k) : lerpRGB(a, b, k);
  }, { leadW: 3.5 });
  if (o.ros !== false) rosettes(key, 0, 0, W, H, o.size || 92, o.rosCol || ['#c8202c', '#ffffff']);
}
function frameBorder(cols) {
  jewelBorder('full', 18, 18, W - 18, H - 18, 22, cols || ['#c8202c', '#ffcc40', '#2a46c8', '#ffcc40'], { seg: 70 });
}

// a sword breaks before the Shaikan
SCENES.noWeapon = (lt, p) => {
  const cam = camAt(lt, 3, { z0: 1.08, z1: 1.0 });
  E.light = sunLight(960, 360, 560, 0.6, 0.7);
  withCamera(cam, () => {
    warmGround('nw', lt);
    const brk = smooth(clamp((lt - 0.9) / 1.4));
    for (let i = 0; i < 5; i++) {
      const x = 260 + i * 350, kneel = i % 2 ? 0 : 0.0;
      drawPerson(x + (i < 2 ? -40 : i > 2 ? 40 : 0), 1000, 0.95 - Math.abs(i - 2) * 0.08, { kind: 'shaikan', arms: i === 2 ? 'pray' : 'down', kneel, glow: 0.35, look: (2 - i) * 0.4, flip: i > 2 });
    }
    drawSword(960, 330, 0.85, { broken: brk > 0, brk, rot: brk * 0.05 });
    if (brk > 0 && brk < 0.4) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - brk / 0.4; const g = ctx.createRadialGradient(960, 590, 0, 960, 590, 260); g.addColorStop(0, 'rgba(255,240,210,0.9)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  });
  frameBorder();
};
// the door opens on the Shaikan
SCENES.door = (lt, p) => {
  const open = smooth(clamp((lt - 0.4) / 2.2));
  E.light = sunLight(960, 520, 480, 0.55, 0.7 * (0.4 + open));
  const cam = camAt(lt, 3.3, { z0: 1.0, z1: 1.1, y0: 540, y1: 520 });
  withCamera(cam, () => {
    quarries('door', 0, 0, W, H, 90, (x, y, c) => (hash(c.seed) < 0.15 ? '#3a1f6a' : '#2a1a58'), { leadW: 3.5 });
    rosettes('door', 0, 0, W, H, 90, ['#ffcc40']);
    drawDoor(960, 1010, 1.0, open, {
      beyond: (w, h) => {
        for (let i = 0; i < 3; i++) drawPerson((i - 1) * 140, 0, 0.6 + (i === 1 ? 0.08 : 0), { kind: 'shaikan', arms: i === 1 ? 'reach' : 'down', glow: 0.8 * open });
      },
    });
    // mankind, approaching the light
    const walk = smooth(clamp(lt / 3.3));
    drawPerson(250 + walk * 150, 1070, 0.62, { kind: 'folk', back: true });
    drawPerson(420 + walk * 120, 1090, 0.56, { kind: 'child', back: true });
    drawPerson(1670 - walk * 150, 1070, 0.62, { kind: 'folk', back: true, flip: true, robe: '#5a4a6a', robe2: '#6e5e80' });
    drawPerson(1500 - walk * 110, 1090, 0.58, { kind: 'folk', back: true, flip: true, robe: '#3a5a4a', robe2: '#4e7060' });
  });
  if (open > 0) lightBeam(960, 560, 360 * open, 960, 1150, 1100 * open, '#ffd890', 0.25 * open);
  frameBorder(['#7a2aa8', '#ffcc40', '#c8202c', '#ffcc40']);
};
// blood runs along the borders of the kingdoms
SCENES.bridge = (lt, p) => {
  const u = clamp(lt / 3.0);
  E.light = sunLight(960, 520, 700, 0.75, 0.35);
  const cam = camAt(lt, 3.1, { z0: 1.0, z1: 1.06 });
  withCamera(cam, () => {
    const src = [700, 500], R = lerp(0, 1500, smooth(clamp((lt - 0.55) / 2.4)));
    drawMap(lt, {
      borderBlood: lt > 0.55 ? 1 : 0, bloodFrom: [src[0], src[1], R],
      bleed: (c) => 0.45 * clamp((R - Math.hypot(c.cx - src[0], c.cy - src[1])) / 300),
    });
    // a single drop falls and spreads
    if (lt < 0.6) { const y = lerp(-40, 500, (lt / 0.6) ** 2); push(700, y, 0, 1.2); region('drop', () => ({ out: [[0, -40, 1], [18, 0], [16, 22], [0, 30], [-16, 22], [-18, 0]] }), ['#d01020'], { lw: 4, glow: 0.8, glowR: 30 }); pop(); }
  });
  frameBorder(['#1a3a8a', '#ffcc40', '#c8202c', '#ffcc40']);
};
// hearts bound by threads of blood
SCENES.hearts = (lt, p) => {
  E.light = sunLight(960, 540, 700, 0.6, 0.5);
  quarries('hearts', 0, 0, W, H, 80, (x, y, c) => (hash(c.seed) < 0.2 ? '#3a0a1a' : '#2a0612'), { leadW: 3 });
  const pts = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) pts.push([260 + i * 350 + (j % 2) * 60 - 30, 230 + j * 300]);
  // the bond: threads of blood between hearts
  const th = new Path2D();
  const grow = smooth(clamp(lt / 1.6));
  pts.forEach((a, i) => {
    const b = pts[i + 1], c = pts[i + 5];
    if (b && (i % 5) !== 4) { th.moveTo(a[0], a[1]); th.quadraticCurveTo((a[0] + b[0]) / 2, a[1] + 50, lerp(a[0], b[0], grow), lerp(a[1], b[1], grow)); }
    if (c) { th.moveTo(a[0], a[1]); th.quadraticCurveTo(a[0] + 40, (a[1] + c[1]) / 2, lerp(a[0], c[0], grow), lerp(a[1], c[1], grow)); }
  });
  bloodLead(th, 12, 1);
  pts.forEach(([x, y], i) => drawHeart(x, y, 1.45, E.beat, { rot: (hash(i) - 0.5) * 0.3 }));
  frameBorder(['#c8202c', '#ffcc40', '#5a0a1a', '#ffcc40']);
};
// bickering kings
SCENES.kings = (lt, p) => {
  E.light = sunLight(960, 400, 700, 0.6, 0.5);
  const cam = camAt(lt, 3.2, { z0: 1.0, z1: 1.08, x0: 960, x1: 1000 });
  withCamera(cam, () => {
    warmGround('kings', lt, { a: '#2a46a8', b: '#1a2a70', c: '#3a5ac8', rosCol: ['#ffcc40'] });
    const robes = [['#8a1a2a', '#a82a3a'], ['#2a5a2a', '#3a7a3a'], ['#5a2a7a', '#74409a'], ['#7a5a1a', '#9a7a2a'], ['#1a4a7a', '#2a6a9a'], ['#7a2a4a', '#9a3a5e']];
    for (let i = 0; i < 6; i++) {
      const x = 210 + i * 300, ph = Math.floor(lt * 2.2 + i * 1.7);
      const arms = ['point', 'down', 'point', 'raise', 'point', 'cover'][(ph + i) % 6];
      drawPerson(x, 1000 + (i % 2) * 40, 0.92, { kind: 'king', arms, look: (ph + i) % 2 ? 0.9 : -0.9, flip: (ph + i) % 2 === 1, mouth: (ph + i) % 3 ? 'open' : null, brow: 1, frown: 1, robe: robes[i][0], robe2: robes[i][1], tilt: Math.sin(lt * 5 + i) * 0.08 });
    }
  });
  frameBorder(['#2a46c8', '#ffcc40', '#c8202c', '#ffcc40']);
};
// a sealed oath cracks; a crown tumbles
SCENES.oath = (lt, p) => {
  E.light = sunLight(960, 460, 600, 0.6, 0.55);
  const cam = camAt(lt, 2.7, { z0: 1.0, z1: 1.06 });
  withCamera(cam, () => {
    warmGround('oath', lt, { a: '#5a2a7a', b: '#2a1450', c: '#7a3a9a', rosCol: ['#ffcc40'] });
    const crack = clamp((lt - 0.5) / 1.0), split = smooth(clamp((lt - 1.6) / 1.1));
    drawScroll(960, 560, 1.12, { crack, split });
    // a crown tumbles past
    const cy = lerp(-150, 1200, clamp((lt - 1.0) / 1.7) ** 2);
    drawCrown(1350, cy, 0.9, { rot: lt * 1.6 });
  });
  frameBorder(['#7a2aa8', '#ffcc40', '#c8202c', '#ffcc40']);
};
// his hand rises, steady, as withered hands crumble
SCENES.ageless = (lt, p) => {
  const u = smooth(clamp(lt / 1.4));
  E.light = sunLight(960, 420, 520, 0.6, 0.8);
  withCamera(camAt(lt, 3.4, { z0: 1.0, z1: 1.05 }), () => {
    warmGround('age', lt, { a: '#f0a030', b: '#a84010', c: '#ffd860', rosCol: ['#ffffff', '#c8202c'] });
    mandorla('age', 960, 470, 300, 430, E.T, { rays: 30 });
    // withered hands crumble at the sides while his rises, steady
    for (const sx of [-1, 1]) {
      const fade = clamp((lt - 1.2) / 1.6);
      ctx.save(); ctx.globalAlpha = 1 - fade;
      smallHand(960 + sx * 560, 1100 + fade * 160, 1.25, sx * 0.25, 'claw', '#b8a890');
      ctx.restore();
    }
    push(960, lerp(1300, 980, u), 0, 2.2, 2.2);
    scaled(2.2, () => { push(0, 0, Math.PI); mcForearm(); push(0, MC_FA + 2, 0); mcHand('open'); pop(); pop(); });
    pop();
  });
  frameBorder();
};
// his bust, hand to his heart
function bustBg(key, t, o = {}) {
  quarries('bust_' + key, 0, 0, W, H, 92, (x, y, c) => {
    const v = hash(c.seed);
    return o.cols ? o.cols(c, v) : v < 0.15 ? '#3a1f8a' : '#1a2a86';
  }, { leadW: 3.5 });
  rosettes('bust_' + key, 0, 0, W, H, 92, o.ros || ['#ffcc40']);
  push(960, 0, 0, 2.4); scaled(2.4, () => mandorla('bust_' + key, 0, 400, 300, 520, t, { heat: o.heat || 0, cold: o.cold || 0 })); pop();
}
function singBust(lt, o = {}) {
  const t = E.T;
  const P = mcPose(Object.assign({
    x: 960, y: 3240, s: 2.75, nimbus: 1, brow: 0.15, smirk: 0.25, look: Math.sin(t * 0.7) * 0.25, lookY: 0.15,
    mouth: mouthAt(t), blink: blinkAt(t, 3), headTilt: Math.sin(t * 0.9) * 0.03, nod: E.beat * 0.6,
  }, o.pose || {}));
  drawMalacay(P, t);
}
SCENES.handIsMe = (lt, p) => {
  E.light = sunLight(960, 360, 520, 0.65, 0.6);
  withCamera(camAt(lt, 3.4, { z0: 1.0, z1: 1.08, y0: 560, y1: 520 }), () => {
    bustBg('me', E.T);
    singBust(lt, { pose: { brow: 0.2, smirk: 0.15, ar: { sh: -0.3, el: -2.2, wr: 0.3, hand: 'open' }, al: { sh: 0.2, el: 0.2, hand: 'open' } } });
  });
};

// ---- PRE-CHORUS ----
// threads of blood rising from the vials to his fingers
SCENES.threads = (lt, p) => {
  E.light = sunLight(960, 380, 560, 0.5, 0.7);
  withCamera(camAt(lt, 2.9, { z0: 1.06, z1: 1.0, y0: 560, y1: 540 }), () => {
    quarries('thr_bg', 0, 0, W, H, 88, (x, y, c) => (hash(c.seed) < 0.18 ? '#4a0a1a' : '#2a0610'), { leadW: 3.5 });
    rosettes('thr_bg', 0, 0, W, H, 88, ['#ff4a30']);
    push(960, 0, 0, 2.4); scaled(2.4, () => mandorla('threads', 0, 330, 300, 520, E.T, { heat: 0.6 })); pop();
    drawMalacay(mcPose({ x: 960, y: 2750, s: 2.3, nimbus: 1, brow: 0.2, smirk: 0.3, lookY: 0.7, look: -0.1, mouth: mouthAt(E.T), blink: blinkAt(E.T, 5),
      al: { sh: 0.5, el: -1.55, wr: 0.3, hand: 'claw' }, ar: { sh: 0.5, el: -1.55, wr: 0.3, hand: 'claw' } }), E.T);
    // the table of vials, threads of blood rising from each to his fingers
    region('table', () => ({ out: [[0, 890], [W, 890], [W, H], [0, H]], poly: true, cuts: [[[0, 920], [W, 920]]], panels: [{ pts: [[0, 920], [W, 920], [W, H], [0, H]], poly: true, ci: 1 }] }), ['#5a3018', '#3a1e10'], { lw: 6 });
    const th = new Path2D(), grow = smooth(clamp(lt / 2.0));
    for (let i = 0; i < 9; i++) {
      const x0 = 240 + i * 180, y0 = 760, tx = i < 4.5 ? 640 : 1280, ty = 520;
      th.moveTo(x0, y0);
      for (let k = 1; k <= 14; k++) {
        const u = k / 14;
        if (u > grow) break;
        th.lineTo(lerp(x0, tx, u) + Math.sin(u * 8 + i * 1.3) * 40 * (1 - u), lerp(y0, ty, u) - Math.sin(u * Math.PI) * 120);
      }
    }
    bloodLead(th, 8, 1);
    for (let i = 0; i < 9; i++) drawVial(240 + i * 180, 870, 1.15, 0.7 + 0.2 * Math.sin(E.T * 1.4 + i), { rot: (i - 4) * 0.03, glow: 0.8 });
  });
  frameBorder(['#c8202c', '#ffcc40', '#4a0a1a', '#ffcc40']);
};
// between the living and the dead
SCENES.livingDead = (lt, p) => {
  const t = E.T;
  E.light = (x, y) => (x < 960 ? 0.95 : 0.55) * (0.6 + 0.5 * Math.exp(-((x - 960) ** 2 + (y - 400) ** 2) / (2 * 600 * 600)));
  withCamera(camAt(lt, 3.2, { z0: 1.06, z1: 1.0, x0: 900, x1: 1020 }), () => {
    quarries('ld', 0, 0, W, H, 90, (x, y, c) => (c.cx < 960 ? (hash(c.seed) < 0.2 ? '#ffc040' : '#e88a28') : (hash(c.seed) < 0.2 ? '#5a6a8a' : '#3a4a6a')), { leadW: 3.5 });
    rosettes('ld', 0, 0, W, H, 90, ['#ffffff']);
    for (let i = 0; i < 3; i++) drawPerson(170 + i * 230, 1030 - (i % 2) * 30, 0.8, { kind: ['folk', 'child', 'folk'][i], arms: i === 1 ? 'reach' : 'down', look: 0.8, robe: ['#8a5a2a', '#4a7a3a', '#7a3a4a'][i] });
    for (let i = 0; i < 3; i++) drawPerson(1290 + i * 230, 1030 - (i % 2) * 30, 0.8, { kind: 'dead', arms: 'down', look: -0.8, flip: true });
    const walk = Math.sin(t * 2.6);
    drawMalacay(mcPose({ x: 960, y: 1060, s: 0.82, nimbus: 0.7, lean: walk * 0.02, look: Math.sin(t * 0.6), mouth: mouthAt(t), blink: blinkAt(t, 6), smirk: 0.3,
      al: { sh: 0.5 + walk * 0.15, el: -0.3, hand: 'open' }, ar: { sh: 0.5 - walk * 0.15, el: -0.3, hand: 'open' } }), t);
  });
  frameBorder(['#ffcc40', '#c8202c', '#5a6a8a', '#c8202c']);
};
// people kneel to far, cold gods
SCENES.distantGods = (lt, p) => {
  E.light = sunLight(960, 160, 700, 0.55, 0.5);
  withCamera(camAt(lt, 3.1, { z0: 1.0, z1: 1.08, y0: 600, y1: 500 }), () => {
    quarries('gods', 0, 0, W, H, 90, (x, y, c) => lerpRGB('#6a8ac8', '#1a2050', clamp(y / H)), { leadW: 3.5 });
    // a far, cold heaven
    cloudBand('heaven', 120, 1800, 260, 70, 9, ['#e8eef8', '#c8d4e8', '#d8e0f0']);
    for (let i = 0; i < 5; i++) drawPerson(560 + i * 200, 250, 0.36, { kind: 'god', arms: 'down', look: 0 });
    cloudBand('heaven2', 80, 1840, 320, 60, 11, ['#d0dcef', '#b8c6e0']);
    for (let i = 0; i < 6; i++) drawPerson(230 + i * 290, 1070, 0.66, { kind: i % 2 ? 'folk' : 'hooded', back: true, arms: 'raise', kneel: 1, flip: i > 2 });
  });
  frameBorder(['#2a46c8', '#e8eef8', '#1a2050', '#e8eef8']);
};
// his bust turning to blood
SCENES.inBlood = (lt, p) => {
  const u = smooth(clamp((lt - 0.6) / 2.8));
  E.light = sunLight(960, 360, 520, 0.6, 0.6);
  withCamera(camAt(lt, 3.9, { z0: 1.0, z1: 1.12, y0: 560, y1: 500 }), () => {
    bustBg('blood', E.T, { heat: u, cols: (c, v) => lerpRGB(v < 0.15 ? '#3a1f8a' : '#1a2a86', v < 0.5 ? '#5a0610' : '#3a0410', u), ros: u > 0.5 ? ['#ff3020'] : ['#ffcc40'] });
    singBust(lt, { pose: { blood: u, eyeGlow: u, brow: 0.1, smirk: 0.35, lookY: -0.1 } });
  });
};
