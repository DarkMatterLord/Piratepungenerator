'use strict';
// VERSE 2 (126.06 – 155.12) and PRE-CHORUS 2 (155.12 – 168.0)

// Ur in glory over the kingdoms; it falls; they split
SCENES.urFracture = (lt, p) => {
  const t = E.T, fall = smooth(clamp((lt - 3.2) / 1.2)), split = smooth(clamp((lt - 3.8) / 3.4));
  E.light = sunLight(960, 360, 700, 0.6 - 0.2 * fall, 0.6 - 0.3 * fall);
  withCamera(camAt(lt, 7.5, { z0: 1.0, z1: 1.1 }), () => {
    drawMap(lt, split > 0 ? {
      split: (c) => { const dx = c.cx - 960, dy = c.cy - 540, d = Math.hypot(dx, dy) + 1; const k = split * (90 + hash(c.seed) * 60); return [(dx / d) * k, (dy / d) * k, (hash(c.seed + 1) - 0.5) * 0.3 * split]; },
      tint: (c, col) => lerpRGB(col, '#3a2a30', split * 0.4),
    } : {});
    if (fall < 1) {
      ctx.save(); ctx.globalAlpha = 1 - fall;
      drawUr(1000, 600 + fall * 300, 0.62, { flap: 0.08, rot: fall * 0.3 });
      if (fall > 0) drawCracks(crackPaths(1000, 520, 600, 3, fall * 1.3), 5);
      ctx.restore();
    }
  });
  frameBorder(['#ffcc40', '#c8202c', '#1a3a8a', '#c8202c']);
};
// the mages' ring, the sigil, the blast
SCENES.circle = (lt, p) => {
  const t = E.T, charge = clamp(lt / 1.9), blast = clamp((lt - 1.9) / 0.5);
  E.light = (x, y) => 0.5 + 0.9 * charge * Math.exp(-((x - 960) ** 2 + (y - 560) ** 2) / (2 * 360 * 360)) + 0.2 * E.beat;
  withCamera(camAt(lt, 3.0, { z0: 1.0, z1: 1.12, r0: 0, r1: 0.04 }), () => {
    quarries('circ', 0, 0, W, H, 86, (x, y, c) => (hash(c.seed) < 0.2 ? '#2a1a5a' : '#140e34'), { leadW: 3.5 });
    // the glowing circle on the ground (an ellipse of rings and runes)
    push(960, 760); ctx.scale(1, 0.36);
    const ring = tessRadial('circRing', 0, 0, 120, 520, 3, 24, { rot: t * 0.6 });
    glassField(ring, (x, y, c) => (c.seed % 3 === 0 ? '#c8a8ff' : c.seed % 3 === 1 ? '#8a5aff' : '#fff0ff'), { leadW: 6 });
    pop();
    // the mages around it, arms raised to the working
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2, x = 960 + Math.cos(a) * 640, y = 760 + Math.sin(a) * 230;
      if (Math.sin(a) < 0) drawPerson(x, y, 0.55, { kind: 'mage', arms: 'raise', back: true, flip: Math.cos(a) > 0 });
    }
    // the pillar of power
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, 0, 760);
    g.addColorStop(0, `rgba(200,160,255,${0.1 * charge})`); g.addColorStop(1, `rgba(255,240,255,${0.8 * charge})`);
    ctx.fillStyle = g; ctx.fillRect(960 - 90 * charge, 0, 180 * charge, 760);
    ctx.restore();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2, x = 960 + Math.cos(a) * 640, y = 760 + Math.sin(a) * 230;
      if (Math.sin(a) >= 0) drawPerson(x, y, 0.72, { kind: 'mage', arms: 'raise', back: false, flip: Math.cos(a) > 0, look: -Math.cos(a), robe: ['#3a2a6a', '#2a3a6a', '#4a2a5a'][i % 3] });
    }
  });
  if (blast > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - clamp((lt - 2.4) / 0.6);
    const g = ctx.createRadialGradient(960, 560, 0, 960, 560, 1400 * blast);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(230,200,255,0.8)'); g.addColorStop(1, 'rgba(160,100,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  frameBorder(['#8a5aff', '#ffffff', '#2a1a5a', '#ffffff']);
};
// a gallery of gods whose niches go dark
SCENES.godsFade = (lt, p) => {
  stoneWall(0, 0, W, H, { color: '#0e0c13' });
  withCamera(camAt(lt, 3.1, { z0: 1.06, z1: 1.0, x0: 900, x1: 1020 }), () => {
    const cols = [['#2a46c8', '#7a9aff'], ['#1a7a5a', '#6ad0a0'], ['#a8641a', '#ffc860'], ['#7a2aa8', '#c08aff'], ['#a81a2a', '#ff7a6a']];
    for (let i = 0; i < 5; i++) {
      const ax = 130 + i * 340, aw = 300, ah = 820, ay = 960;
      const fade = smooth(clamp((lt - 0.4 - i * 0.5) / 0.7));
      const win = archPath(ax, ay, aw, ah);
      ctx.save(); ctx.clip(win);
      E.light = () => lerp(1.05, 0.08, fade);
      quarries('godn' + i, ax, ay - ah, ax + aw, ay, 60, (x, y, c) => (hash(c.seed) < 0.25 ? cols[i][1] : cols[i][0]), { leadW: 3 });
      drawPerson(ax + aw / 2, ay - 40, 0.92, { kind: 'god', arms: ['raise', 'down', 'pray', 'reach', 'down'][i], halo: true });
      ctx.restore();
      E.light = null;
      tracery(win, 26);
    }
  });
  dust(0, 0, W, H, 50, E.T);
};
// a begging crowd as rot creeps through the glass
SCENES.decay = (lt, p) => {
  const rot = smooth(clamp(lt / 2.9));
  E.light = sunLight(960, 400, 700, 0.7 - rot * 0.3, 0.4);
  withCamera(camAt(lt, 3.0, { z0: 1.0, z1: 1.06 }), () => {
    quarries('decay', 0, 0, W, H, 88, (x, y, c) => {
      const d = clamp(rot * 1.6 - hash(c.seed) * 0.6 - (1 - y / H) * 0.4);
      return lerpRGB(hash(c.seed) < 0.2 ? '#4a8ac8' : '#2a5a9a', '#3a3a2a', d);
    }, { leadW: 3.5 });
    for (let i = 0; i < 7; i++) drawPerson(170 + i * 263, 1040 - (i % 2) * 40, 0.86, { kind: i % 3 ? 'folk' : 'hooded', arms: i % 2 ? 'raise' : 'reach', mouth: 'open', look: (3 - i) * 0.2, flip: i > 3, robe: lerpRGB(['#6a5434', '#4a5a7a', '#6a3a4a'][i % 3], '#3a3a30', rot * 0.6) });
    drawCracks(crackPaths(960, 140, 900, 12, rot * 1.2), 4);
    drawCracks(crackPaths(200, 300, 500, 14, rot), 3.5);
    drawCracks(crackPaths(1700, 350, 500, 15, rot), 3.5);
  });
  frameBorder(['#5a5a3a', '#8a8a6a', '#2a2a20', '#8a8a6a']);
};
// the pyre, built by every generation, and then the fire
function pyre(cx, cy, s) {
  push(cx, cy, 0, s);
  glassSet('pyre.logs', () => {
    const out = [];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 6 - r; k++) {
      const x = -250 + r * 50 + k * 100, y = -r * 52;
      out.push({ pts: [[x, y - 22], [x + 92, y - 22], [x + 92, y + 22], [x, y + 22]], poly: true, ci: (r + k) % 3 });
    }
    return out;
  }, ['#6a3a1a', '#7e4a24', '#5a2e14'], { lw: 5 });
  pop();
}
SCENES.pyre = (lt, p) => {
  const t = E.T;
  E.light = sunLight(960, 400, 700, 0.6, 0.45);
  withCamera(camAt(lt, 2.9, { z0: 1.0, z1: 1.08 }), () => {
    warmGround('pyre', lt, { a: '#7a3a1a', b: '#3a1a10', c: '#a85a2a', rosCol: ['#ffcc40'] });
    pyre(960, 900, 1.2);
    // generations: the child, the man, the elder, each carrying a log to the stack
    const cyc = (lt * 0.45) % 1;
    const gen = [['child', '#4a6a3a', 0.6], ['folk', '#6a5434', 0.82], ['hooded', '#5a5a6a', 0.8]];
    gen.forEach(([kind, robe, sc], i) => {
      const k = (cyc + i / 3) % 1, side = i % 2 ? 1 : -1;
      const x = 960 + side * lerp(820, 360, k);
      drawPerson(x, 1050, sc, { kind, robe, arms: 'reach', flip: side > 0, look: -side });
      push(x - side * 70 * sc, 1050 - 400 * sc, side * 0.2, sc); region('log.carry', () => ({ out: [[-80, -20], [80, -20], [80, 20], [-80, 20]], poly: true }), ['#7e4a24'], { lw: 4 }); pop();
    });
  });
  frameBorder(['#a8641a', '#ffcc40', '#3a1a10', '#ffcc40']);
};
SCENES.liberty = (lt, p) => {
  const t = E.T, burn = smooth(clamp(lt / 1.2));
  E.light = (x, y) => 0.6 + 0.6 * clamp((y - 200) / 800) + 0.3 * E.beat;
  withCamera(camAt(lt, 3.1, { z0: 1.08, z1: 1.0 }), () => {
    quarries('lib', 0, 0, W, H, 86, (x, y, c) => lerpRGB('#5a1a0a', '#ff7a1a', clamp(y / H + hash(c.seed) * 0.2)), { leadW: 3.5 });
    drawBanner(960, 80, 1.3, { col: lerpRGB('#9a0e1a', '#2a1a14', burn * 0.6), torn: burn > 0.5 ? 1 : 0, sway: 10 });
    pyre(960, 900, 1.2);
    flames('lib', 200, 1720, 1000, 380 + 300 * burn, 18, t, { glow: 0.7 });
    embers(0, 0, W, H, 90, t);
  });
  frameBorder(['#c8202c', '#ff8a1a', '#3a0a10', '#ff8a1a']);
};
// he rises from the flames
SCENES.rise = (lt, p) => {
  const t = E.T, u = smooth(clamp(lt / 2.6));
  E.light = (x, y) => 0.6 + 0.5 * clamp((y - 200) / 800) + 0.5 * Math.exp(-((x - 960) ** 2 + (y - 300) ** 2) / (2 * 400 * 400)) * u + 0.2 * E.beat;
  withCamera(camAt(lt, 2.9, { z0: 1.1, z1: 1.0, y0: 600, y1: 540 }), () => {
    quarries('rise', 0, 0, W, H, 86, (x, y, c) => lerpRGB('#3a0a10', '#ff6a1a', clamp(y / H + hash(c.seed) * 0.2)), { leadW: 3.5 });
    mandorla('rise', 960, 560, 320, 500, t, { heat: 0.4 });
    drawMalacay(mcPose({ x: 960, y: lerp(1500, 1040, u), s: 0.74, nimbus: u, brow: 0.3, smirk: 0.25, lookY: -0.2, mouth: mouthAt(t), blink: blinkAt(t, 9),
      al: { sh: lerp(0.3, 1.6, u), el: -0.3, hand: 'open' }, ar: { sh: lerp(0.3, 1.6, u), el: -0.3, hand: 'open' } }), t);
    flames('rise', 0, W, 1090, 300, 20, t, { glow: 0.7 });
    embers(0, 0, W, H, 80, t);
  });
  frameBorder(['#c8202c', '#ff8a1a', '#3a0a10', '#ff8a1a']);
};
// many hands pulling at the world
SCENES.manyHands = (lt, p) => {
  const t = E.T;
  E.light = sunLight(960, 540, 520, 0.6, 0.6);
  quarries('mh', 0, 0, W, H, 88, (x, y, c) => (hash(c.seed) < 0.2 ? '#3a1f6a' : '#1e1448'), { leadW: 3.5 });
  rosettes('mh', 0, 0, W, H, 88, ['#ffcc40']);
  withCamera(camAt(lt, 3.3, { z0: 1.0, z1: 1.1 }), () => {
    const pull = Math.sin(t * 3) * 0.5 + 0.5;
    drawOrb(960, 540, 190, { key: 'world2', rot: Math.sin(t * 2) * 0.1, glow: 0.4, cols: (c, k) => (hash(c.seed) < 0.45 ? lerpRGB('#3a7a4a', '#2a5a3a', k) : lerpRGB('#3a6ac8', '#1a3a8a', k)) });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.3, r = 300 + 18 * Math.sin(t * 4 + i * 1.7) * pull;
      const sk = ['#f0d8c4', '#e0b89a', '#c89878', '#a87858', '#f4e0d0'][i % 5];
      smallHand(960 + Math.cos(a) * r, 540 + Math.sin(a) * r, 0.95, a - Math.PI / 2, i % 3 ? 'claw' : 'reach', sk);
    }
  });
  frameBorder(['#3a1f6a', '#ffcc40', '#c8202c', '#ffcc40']);
};

// ---- PRE-CHORUS 2 ----
// he pours the blood into a chalice
function drawChalice(x, y, s) {
  push(x, y, 0, s);
  scaled(s, () => {
    region('chal.cup', () => ({ out: [[-90, -120], [90, -120], [70, -40], [30, 0], [-30, 0], [-70, -40]], panels: [{ pts: [[-120, -100], [120, -100], [120, -80], [-120, -80]], poly: true, ci: 1 }], cuts: [[[-120, -100], [120, -100]], [[-120, -80], [120, -80]]] }), [GOLD, GOLD2], { lw: 5, glow: 0.3, glowR: 80 });
    region('chal.stem', () => ({ out: [[-14, 0], [14, 0], [16, 90], [70, 130], [-70, 130], [-16, 90]] }), [GOLD2], { lw: 5 });
    glassSet('chal.gems', () => [arcPts(0, -60, 12, 12, 0, TAU, 12).slice(0, -1), arcPts(-44, -60, 8, 8, 0, TAU, 10).slice(0, -1), arcPts(44, -60, 8, 8, 0, TAU, 10).slice(0, -1)], ['#ff1a24', '#2a46c8', '#2a46c8'], { lw: 3, glow: 0.5, glowR: 12 });
  });
  pop();
}
SCENES.giveBlood = (lt, p) => {
  const t = E.T;
  E.light = sunLight(960, 380, 560, 0.6, 0.65);
  withCamera(camAt(lt, 3.0, { z0: 1.05, z1: 1.0 }), () => {
    warmGround('give', lt, { a: '#3a1f8a', b: '#1a1458', c: '#5a3aaa', rosCol: ['#ffcc40'] });
    mandorla('give', 700, 500, 260, 430, t, {});
    drawMalacay(mcPose({ x: 700, y: 1040, s: 0.72, nimbus: 1, brow: 0.1, smirk: 0.3, lookY: 0.5, look: 0.5, mouth: mouthAt(t), blink: blinkAt(t, 11),
      ar: { sh: 1.2, el: -0.9, wr: -0.6, hand: 'fist' }, al: { sh: 0.2, el: 0.2, hand: 'open' },
      hold: { r: (ph) => { if (ph === 'over') drawVial(0, 70, 0.9, 0.7, { rot: 2.4, glow: 0.8 }); } } }), t);
    // a ribbon of blood falling into the cup
    const fx = 1150, fy = 520;
    const pour = new Path2D(); pour.moveTo(fx, fy); pour.bezierCurveTo(fx + 30, fy + 120, fx + 20, fy + 200, 1260, 760);
    bloodLead(pour, 14, 1);
    drawChalice(1260, 860, 1.1);
    drawPerson(1100, 1060, 0.62, { kind: 'shaikan', arms: 'reach', kneel: 1, look: 0.5, glow: 0.6 });
    drawPerson(1420, 1060, 0.62, { kind: 'shaikan', arms: 'reach', kneel: 1, look: -0.5, flip: true, glow: 0.6 });
  });
  frameBorder();
};
// a straight blade amid a whirling ground
SCENES.unbending = (lt, p) => {
  const t = E.T;
  E.light = (x, y) => 0.6 + 0.6 * Math.exp(-((x - 960) ** 2) / (2 * 160 * 160)) + 0.2 * E.beat;
  push(960, 540, t * 0.35);
  const sw = tessRadial('swirl', 0, 0, 60, 1300, 6, 30, { grow: true });
  glassField(sw, (x, y, c) => ((Math.floor(c.a * 6 + c.rr / 120) % 3 === 0) ? '#3a1f6a' : (c.seed % 2 ? '#1a2a70' : '#2a1458')), { leadW: 4 });
  pop();
  withCamera(camAt(lt, 3.0, { z0: 1.0, z1: 1.1 }), () => {
    drawSword(960, 100, 1.25, {});
    for (let i = 0; i < 4; i++) {
      const k = (lt * 1.3 + i * 0.25) % 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
      const y = 300 + i * 160, g = ctx.createRadialGradient(960, y, 0, 960, y, 120 * k + 20);
      g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(1, 'rgba(255,120,60,0)'); ctx.fillStyle = g; ctx.fillRect(700, y - 200, 520, 400);
      ctx.restore();
    }
  });
  frameBorder(['#2a46c8', '#ffcc40', '#c8202c', '#ffcc40']);
};
// chains fall away; the white eagle flies
SCENES.release = (lt, p) => {
  const t = E.T, br = smooth(clamp((lt - 0.5) / 1.0)), fly = smooth(clamp((lt - 1.4) / 1.5));
  E.light = sunLight(960, 300, 600, 0.6, 0.7);
  withCamera(camAt(lt, 2.9, { z0: 1.0, z1: 1.06 }), () => {
    warmGround('rel', lt, { a: '#4a8ac8', b: '#1a3a7a', c: '#8ac8ff', rosCol: ['#ffffff'] });
    for (let i = 0; i < 3; i++) drawPerson(560 + i * 400, 1030, 0.86, { kind: 'shaikan', arms: br > 0.5 ? 'raise' : 'down', glow: 0.5, look: (1 - i) * 0.4 });
    // chains around them, bursting into links that drift up and away
    for (let i = 0; i < 3; i++) {
      const x0 = 560 + i * 400;
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU, d = br * (120 + hash(i * 9 + k) * 300);
        const x = x0 + Math.cos(a) * (70 + d), y = 800 + Math.sin(a) * 30 - d * 0.6 - fly * 200;
        ctx.save(); ctx.globalAlpha = 1 - fly; ctx.translate(x, y); ctx.rotate(a + br * 3);
        ctx.beginPath(); ctx.ellipse(0, 0, 22, 12, 0, 0, TAU); ctx.lineWidth = 12; ctx.strokeStyle = '#1a0306'; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#d82030'; ctx.stroke();
        ctx.restore();
      }
    }
    // the white eagle of the crest, rising free
    push(960, lerp(620, 160, fly), 0, 1.6 + fly * 0.4);
    drawCrestEagle(t);
    pop();
  });
  frameBorder(['#ffffff', '#2a46c8', '#ffcc40', '#2a46c8']);
};
function drawCrestEagle(t) {
  const flap = Math.sin(t * 5) * 0.12;
  const wing = (sx) => [0, 1, 2, 3].map((k) => {
    const a = -0.15 - k * 0.38 + flap * sx * (sx < 0 ? 1 : -1), L = 118 - k * 10, bx = sx * (18 + k * 4), by = -24 + k * 10;
    return tongue([bx, by - 9], [bx, by + 9], [bx + sx * Math.cos(a) * L, by + Math.sin(a) * L * 1.1], sx * 0.08, sx * 0.08);
  });
  glassSet('eagleL' + Math.round(flap * 50), () => wing(-1), ['#f4f6fa', '#dfe4ec'], { lw: 4 });
  glassSet('eagleR' + Math.round(flap * 50), () => wing(1), ['#f4f6fa', '#dfe4ec'], { lw: 4 });
  glassSet('crest.tail', () => [-1, 0, 1].map((k) => tongue([k * 8 - 8, 40], [k * 8 + 8, 40], [k * 22, 88], 0)), ['#f4f6fa'], { lw: 4 });
  region('crest.body', () => ({ out: [[0, -44], [20, -30], [24, 6], [14, 44], [0, 52], [-14, 44], [-24, 6], [-20, -30]] }), ['#f4f6fa'], { lw: 4.5 });
  region('crest.head', () => ({ out: [[-4, -48], [12, -62], [24, -60], [40, -54, 1], [26, -46], [16, -40], [2, -38]] }), ['#f4f6fa'], { lw: 4 });
  glassSet('crest.beak', () => [[[38, -56], [52, -50], [36, -46]]], [GOLD], { lw: 3 });
}
// a straight road to the capital at sunrise
SCENES.road = (lt, p) => {
  const t = E.T, u = clamp(lt / 4.0);
  E.light = sunLight(960, 330, 520, 0.7, 0.7);
  withCamera(camAt(lt, 4.0, { z0: 1.0, z1: 1.15, y0: 560, y1: 500 }), () => {
    quarries('road', 0, 0, W, H, 86, (x, y, c) => (y < 470 ? lerpRGB('#fff0a0', '#ffa040', y / 470) : (hash(c.seed) < 0.3 ? '#4a7a3a' : '#3a6a2a')), { leadW: 3.5 });
    push(960, 380); const sunT = tessRadial('roadsun', 0, 0, 30, 200, 2, 18, { rot: t * 0.05 }); glassField(sunT, (x, y, c) => (c.seed % 2 ? '#fff6c0' : '#ffe080'), { leadW: 4 }); pop();
    drawCity('road', 640, 1280, 470, { hmin: 50, hvar: 90, seed: 23 });
    region('theroad', () => ({ out: [[930, 470], [990, 470], [1400, 1080], [520, 1080]], poly: true, cuts: [[[960, 470], [960, 1080]], [[900, 600], [1020, 600]], [[840, 760], [1080, 760]], [[760, 940], [1160, 940]]] }), ['#d8c08a'], { lw: 6 });
    for (let i = 0; i < 6; i++) {
      const k = ((u * 0.25 + i / 6) % 1), y = lerp(1080, 500, k), sc = lerp(0.72, 0.1, k);
      drawPerson(960 + (i % 2 ? 1 : -1) * lerp(130, 10, k), y, sc, { kind: 'shaikan', back: true, glow: 0.5 });
    }
  });
  frameBorder(['#ffcc40', '#4a7a3a', '#ffffff', '#4a7a3a']);
};
