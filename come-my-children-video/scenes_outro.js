'use strict';
// CHORUS 3 uses chorus(…, 3). OUTRO (318.36 – 373): the storm he makes, the refuge, the return, the end.

function stormSky(key, t, o = {}) {
  quarries('storm_' + key, 0, 0, W, H, 86, (x, y, c) => {
    const v = hash(c.seed), k = clamp(y / H);
    return lerpRGB(v < 0.2 ? '#3a2a4a' : '#1c1426', o.ground ? (v < 0.3 ? '#3a1a14' : '#24100c') : '#100a14', clamp((k - (o.horizon || 0.62)) * 6));
  }, { leadW: 3.5 });
  cloudBand('st1_' + key, -80, 2000, 150, 110, 9, ['#3a3440', '#2a2430', '#4a3a48']);
  // lightning: a jagged white-violet lead, flashing on strong beats
  const fl = E.beat > 0.7 ? 1 : E.beat > 0.5 ? 0.5 : 0;
  if (fl > 0) {
    const r = rng(Math.floor(t * 1.3) * 7 + 3), p = new Path2D();
    let x = 300 + r() * 1300, y = 180;
    p.moveTo(x, y);
    while (y < (o.boltTo || 700)) { x += (r() - 0.5) * 120; y += 40 + r() * 50; p.lineTo(x, y); if (r() < 0.2) { const bx = x + (r() - 0.5) * 200; p.lineTo(bx, y + 60); p.moveTo(x, y); } }
    ctx.save(); ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(200,160,255,${0.4 * fl})`; ctx.lineWidth = 26; ctx.stroke(p);
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * fl})`; ctx.lineWidth = 7; ctx.stroke(p);
    ctx.fillStyle = `rgba(180,150,255,${0.12 * fl})`; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  cloudBand('st2_' + key, -60, 1980, 250, 90, 11, ['#2a2430', '#3a3040']);
}
function swarm(n, t, y0, y1, o = {}) {
  for (let i = 0; i < n; i++) {
    const sp = 120 + hash(i * 3) * 160, x = ((hash(i * 7 + 1) * 2600 + t * sp * (o.dir || 1)) % 2600) - 340;
    const y = lerp(y0, y1, hash(i * 11 + 5)), s = (o.s || 0.32) * (0.6 + 0.8 * (y - y0) / Math.max(1, y1 - y0));
    drawMalakar((o.dir || 1) > 0 ? x : W - x, y, s, { ph: i * 0.37, flip: (o.dir || 1) < 0 });
  }
}
// the blood-lit bust before the storm
SCENES.necessity = (lt, p) => {
  E.light = sunLight(960, 360, 520, 0.55, 0.55);
  withCamera(camAt(lt, 2.9, { z0: 1.0, z1: 1.08, y0: 560, y1: 520 }), () => {
    stormSky('nec', E.T);
    push(960, 0, 0, 2.4); scaled(2.4, () => mandorla('nec', 0, 400, 300, 520, E.T, { heat: 0.9 })); pop();
    singBust(lt, { pose: { blood: 0.6, eyeGlow: 0.8, brow: 0.45, smirk: 0.15, lookY: 0.2 } });
  });
};
// the Malakar swarm comes over the land
SCENES.malar = (lt, p) => {
  const t = E.T;
  E.light = (x, y) => 0.6 + 0.2 * clamp((y - 400) / 600) + 0.5 * (E.beat > 0.7 ? 1 : 0);
  withCamera(camAt(lt, 3.1, { z0: 1.08, z1: 1.0, x0: 1000, x1: 920 }), () => {
    stormSky('malar', t, { ground: true });
    E.light = () => 1.05 + 0.3 * E.beat;
    swarm(9, t, 640, 860, { s: 0.42 });
    // the vanguard, close and large
    for (let i = 0; i < 3; i++) drawMalakar(((t * 140 + i * 700) % 2300) - 300, 960 + i * 30, 0.95 + i * 0.12, { ph: i * 0.8 });
  });
  frameBorder(['#3a2a4a', '#ff3020', '#1c1426', '#ff3020']);
};
// calm again, a hand raised
SCENES.understand = (lt, p) => {
  E.light = sunLight(960, 360, 520, 0.6, 0.6);
  withCamera(camAt(lt, 2.9, { z0: 1.0, z1: 1.1, y0: 560, y1: 520 }), () => {
    bustBg('und', E.T, { heat: 0.6 });
    singBust(lt, { pose: { blood: 0.3, eyeGlow: 0.3, brow: -0.2, smirk: 0.1, lookY: 0.1, ar: { sh: -0.2, el: -2.6, wr: 0.5, hand: 'open' } } });
  });
};
// his open hand, offered over the world
SCENES.takeHand = (lt, p) => {
  const u = smooth(clamp(lt / 2.2));
  E.light = sunLight(960, 600, 600, 0.6, 0.6);
  quarries('take', 0, 0, W, H, 88, (x, y, c) => (hash(c.seed) < 0.2 ? '#4a0610' : '#24030a'), { leadW: 3.5 });
  rosettes('take', 0, 0, W, H, 88, ['#ffcc40']);
  withCamera(camAt(lt, 3.2, { z0: 1.0, z1: 1.08 }), () => {
    drawOrb(960, 820, 180, { key: 'world3', rot: E.T * 0.1, glow: 0.5, cols: (c, k) => (hash(c.seed) < 0.45 ? lerpRGB('#3a7a4a', '#2a5a3a', k) : lerpRGB('#3a6ac8', '#1a3a8a', k)) });
    // the hand comes down, palm open, waiting
    push(960, lerp(-700, -330, u), 0, 3.2);
    scaled(3.2, () => { mcForearm(); push(0, MC_FA + 2, 0); mcHand('reach'); pop(); });
    pop();
  });
  frameBorder(['#c8202c', '#ffcc40', '#4a0610', '#ffcc40']);
};
// the swarm at the walls
SCENES.siege = (lt, p) => {
  const t = E.T;
  E.light = (x, y) => 0.55 + 0.35 * clamp((y - 300) / 700) + 0.5 * (E.beat > 0.7 ? 1 : 0);
  withCamera(camAt(lt, 2.9, { z0: 1.0, z1: 1.08 }), () => {
    stormSky('siege', t, { boltTo: 500 });
    drawCity('siege', 60, 1860, 900, { wall: ['#8a7a6a', '#7a6a5a', '#9a8a78'], roof: ['#4a2a20', '#3a2018'], lit: (x, y, r) => r < 0.4, winCol: 'rgba(255,140,40,0.95)', hmin: 160, hvar: 260, seed: 41 });
    flames('siegef', 80, 1840, 900, 160, 16, t, { glow: 0.5 });
    E.light = () => 1.05 + 0.3 * E.beat;
    swarm(10, t, 880, 1060, { s: 0.55 });
  });
  frameBorder(['#3a2a4a', '#ff8a1a', '#1c1426', '#ff8a1a']);
};
// they run to the red-lit door where the Shaikan wait
SCENES.refuge = (lt, p) => {
  const t = E.T;
  E.light = (x, y) => 0.5 + 0.7 * Math.exp(-((x - 1420) ** 2 + (y - 640) ** 2) / (2 * 380 * 380));
  withCamera(camAt(lt, 2.9, { z0: 1.0, z1: 1.06, x0: 900, x1: 1020 }), () => {
    stormSky('ref', t, { ground: true });
    drawDoor(1420, 1000, 0.8, 1, {
      beyond: (w, h) => {
        const g = ctx.createRadialGradient(0, -h * 0.4, 20, 0, -h * 0.4, h);
        g.addColorStop(0, '#ffd8c0'); g.addColorStop(1, '#d01020'); ctx.fillStyle = g; ctx.fillRect(-w, -h, w * 2, h);
        for (let i = 0; i < 3; i++) drawPerson((i - 1) * 140, 0, 0.62, { kind: 'shaikan', arms: 'reach', glow: 1 });
      },
    });
    for (let i = 0; i < 6; i++) {
      const k = ((lt * 0.28 + i / 6) % 1), x = lerp(-80, 1180, k);
      drawPerson(x, 1050 - (i % 2) * 30, 0.66, { kind: i % 3 ? 'folk' : 'child', arms: 'reach', flip: false, look: 1, mouth: 'open', robe: ['#6a5434', '#4a5a7a', '#6a3a4a'][i % 3] });
    }
    E.light = () => 1.0; swarm(5, t, 980, 1060, { s: 0.42 });
  });
  frameBorder(['#c8202c', '#ffcc40', '#1c1426', '#ffcc40']);
};
// they drink; their veins kindle; the swarm parts
SCENES.bearStorm = (lt, p) => {
  const t = E.T, u = smooth(clamp((lt - 0.6) / 1.8));
  E.light = sunLight(960, 600, 700, 0.55, 0.45);
  withCamera(camAt(lt, 3.5, { z0: 1.06, z1: 1.0 }), () => {
    stormSky('bear', t, { ground: true });
    for (let i = 0; i < 5; i++) {
      const x = 360 + i * 300;
      drawPerson(x, 1040, 0.92, { kind: i % 2 ? 'folk' : 'hooded', arms: u < 0.4 ? 'pray' : 'raise', glow: u, look: 0, robe: ['#6a5434', '#4a5a7a', '#6a3a4a'][i % 3] });
      if (u < 0.5) drawVial(x, 1040 - 0.92 * 300, 0.7, 0.8 - u, { rot: 2.6, glow: 0.6 });
    }
    // the swarm flows around them
    for (let i = 0; i < 8; i++) {
      const x = ((t * 200 + i * 330) % 2400) - 240, y = 760 + Math.sin(i * 1.7) * 40 - 220 * Math.exp(-((x - 960) ** 2) / (2 * 500 * 500)) * u;
      const pl = E.light; E.light = () => 1.0; drawMalakar(x, y, 0.46, { ph: i * 0.5 }); E.light = pl;
    }
  });
  frameBorder(['#c8202c', '#ffcc40', '#1c1426', '#ffcc40']);
};
// the world turns to his blood
SCENES.shapeWorld = (lt, p) => {
  const u = smooth(clamp(lt / 4.5)), sig = smooth(clamp((lt - 3.6) / 1.4));
  E.light = sunLight(960, 540, 700, 0.6, 0.45);
  withCamera(camAt(lt, 6.5, { z0: 1.0, z1: 0.86 }), () => {
    drawMap(lt, { borderBlood: 1, bloodFrom: [960, 540, u * 1300], bleed: (c) => 0.85 * clamp((u * 1300 - Math.hypot(c.cx - 960, c.cy - 540)) / 300) });
    if (sig > 0) {
      ctx.save(); ctx.globalAlpha = sig * 0.9;
      const cells = tess('mosaic', 0, 0, W, H, 44).cells;
      ctx.beginPath();
      const R = 420;
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; ctx.moveTo(960, 540); ctx.lineTo(960 + Math.cos(a) * R, 540 + Math.sin(a) * R); }
      ctx.arc(960, 540, R, 0, TAU); ctx.moveTo(960 + R * 0.5, 540); ctx.arc(960, 540, R * 0.5, 0, TAU);
      ctx.lineWidth = 14; ctx.strokeStyle = '#140306'; ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 6; ctx.strokeStyle = `rgba(255,60,40,${E.pulse})`; ctx.stroke();
      ctx.restore();
      void cells;
    }
  });
  frameBorder(['#c8202c', '#ff6a30', '#4a0610', '#ff6a30']);
};
// the long walk back down the nave
SCENES.returnHome = (lt, p) => {
  const u = clamp(lt / 5.8);
  drawNave(lt, {
    dolly: lerp(0.1, 0.5, smooth(u)),
    lit: (i, k) => 0.35 + 0.15 * Math.sin(E.T + i),
    apse: (w, h) => {
      E.light = () => 0.95;
      ctx.fillStyle = '#3a0410'; ctx.fillRect(0, 0, w, h);
      push(w / 2, h * 0.92, 0, w / 1500); scaled(w / 1500, () => drawMalacay(mcPose({ x: 0, y: 0, s: 0.95, nimbus: 1, blood: 0.5, al: { sh: 1.05, el: -0.4, hand: 'open' }, ar: { sh: 1.05, el: -0.4, hand: 'open' } }), E.T)); pop();
    },
    apseLight: 0.8, apseCol: '#ff4a30', candles: true,
  });
  // small figures walking away from us toward the window, then kneeling
  for (let i = 0; i < 7; i++) {
    const k = clamp(u * 1.2 - i * 0.06), z = lerp(1.6, 4.6, smooth(k)) + (i % 3) * 0.3;
    const [x, y] = naveP((i % 2 ? 1 : -1) * (90 + (i % 3) * 70), NAVE.floor, z);
    drawPerson(x, y, (NAVE.F / z) * 0.9, { kind: i % 2 ? 'shaikan' : 'hooded', back: true, kneel: k > 0.85 ? 1 : 0, glow: 0.3 });
  }
};
// tender for a moment
SCENES.notHate = (lt, p) => coldBust('nothate', lt, { brow: -0.4, smirk: 0.05, lookY: 0.3, look: 0, nimbus: 0.6 }, { dur: 3.4, z1: 1.14 });
// the eyes ignite; the window blazes and breaks
SCENES.neverLearned = (lt, p) => {
  const ign = smooth(clamp((lt - 0.3) / 1.2));
  E.light = sunLight(960, 360, 520, 0.6 + ign * 0.5, 0.6 + ign * 0.6);
  withCamera(camAt(lt, 4.4, { z0: 1.0, z1: 1.35, y0: 520, y1: 420 }), () => {
    bustBg('never', E.T, { heat: ign, cols: (c, v) => lerpRGB(v < 0.15 ? '#3a4a6a' : '#1a2238', v < 0.5 ? '#7a0a14' : '#3a0410', ign), ros: ign > 0.5 ? ['#ff3020'] : ['#c8d8ff'] });
    singBust(lt, { pose: { blood: ign, eyeGlow: ign, brow: 0.6 * ign, smirk: 0.25, lookY: 0, snarl: 0.2 * ign } });
  });
  if (ign > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(960, 400, 0, 960, 400, 1100); g.addColorStop(0, `rgba(255,40,30,${0.3 * ign * E.pulse})`); g.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
};
// the end: darkness, the last shards falling, one ember of the rose
SCENES.ending = (lt, p) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const fade = clamp(1 - (lt - 6) / 5);
  E.light = () => 0.5 * fade;
  // a few shards still falling through the dark
  for (let i = 0; i < 24; i++) {
    const y = ((hash(i * 3) * 1400 + lt * (120 + hash(i) * 160)) % 1500) - 200, x = hash(i * 5 + 1) * W;
    push(x, y, lt * (hash(i + 2) - 0.5) * 3, 0.6 + hash(i * 7) * 0.8);
    const sh = polyPath([[0, -30], [24, 10], [-6, 34], [-26, 0]]);
    ctx.globalAlpha = 0.8 * fade;
    glassPiece(sh, ['#c8202c', '#ffcc40', '#2a46c8'][i % 3], { cx: 0, cy: 0, r: 26, seed: i, L: 0.6 * fade });
    lead(sh, 3);
    ctx.globalAlpha = 1;
    pop();
  }
  // the rose, a dying ember
  const g = ctx.createRadialGradient(960, 520, 0, 960, 520, 300);
  g.addColorStop(0, `rgba(255,40,30,${0.25 * fade * (0.7 + 0.3 * E.pulse)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const k = smooth(clamp((lt - 1.5) / 1.5)) * clamp(1 - (lt - 8.5) / 2);
  if (k > 0) {
    ctx.save(); ctx.globalAlpha = k;
    E.light = () => 0.85;
    banderole(960, 760, 560, 84, 'COME MY CHILDREN', { font: '700 52px "Cinzel Decorative"', ls: 6, L: 0.85 });
    ctx.restore();
  }
};

// the apotheosis: the whole cathedral burns red around his window
SCENES.finale = (lt, p) => {
  const u = clamp(lt / 6);
  drawNave(lt, {
    dolly: lerp(0.9, 0.2, smooth(u)),
    pal: [['#c8101c', '#ff4a20', '#5a0610'], ['#ff2a1a', '#a00818', '#ffb030'], ['#7a0a14', '#ff3020', '#c8101c']],
    lit: () => 1.1, beatK: 2,
    apse: (w, h) => {
      E.light = () => 1.1 + 0.3 * E.beat;
      ctx.fillStyle = '#5a0610'; ctx.fillRect(0, 0, w, h);
      const R = w * 0.42;
      push(w / 2, h * 0.36, E.T * 0.3);
      const r = roseWindow('axis', 0, 0, 520, 12);
      ctx.scale(R / 520, R / 520);
      drawRose(r, { fill: ['#5a0610', '#3a0410'], petal: ['#ff2a1a', '#ffb030', '#c8101c', '#ff6a30'], roundel: ['#ffcc40', '#a00818'], hub: ['#ff3020'] }, {});
      pop();
      push(w / 2, h * 0.92, 0, w / 1500); scaled(w / 1500, () => drawMalacay(mcPose({ x: 0, y: 0, s: 0.95, blood: 1, eyeGlow: 1, al: { sh: 1.5, el: -0.15, hand: 'claw' }, ar: { sh: 1.5, el: -0.15, hand: 'claw' } }), E.T)); pop();
    },
    apseLight: 1.2, apseCol: '#ff3020', candles: true,
  });
  embers(0, 0, W, H, 70, E.T);
};
