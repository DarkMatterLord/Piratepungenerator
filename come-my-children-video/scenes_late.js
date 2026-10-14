'use strict';
// BREAK (207.7) · INTERLUDE (211.2 – 238.2) · BRIDGE (239.1 – 280)

// the organ break: the cathedral's windows gutter out one by one
SCENES.gutter = (lt, p) => {
  drawNave(lt, {
    dolly: 0.35,
    lit: (i, k) => clamp(1 - (lt * 2.4 - (6 - k) * 0.28 - (i % 2) * 0.12)),
    apse: (w, h) => { E.light = () => 0.9 - 0.25 * lt; ctx.fillStyle = '#1a1050'; ctx.fillRect(0, 0, w, h); push(w / 2, h * 0.92, 0, w / 1500); scaled(w / 1500, () => drawMalacay(mcPose({ x: 0, y: 0, s: 0.95, blood: 0.6, eyeGlow: 1 }), E.T)); pop(); drawCracks(crackPaths(w / 2, h * 0.4, w, 3, clamp(lt / 2.5)), 2); },
    apseLight: clamp(1 - lt / 3), apseCol: '#ff4030', candles: lt < 2.6,
  });
};
// his children point and accuse
SCENES.monster = (lt, p) => {
  E.light = sunLight(960, 500, 700, 0.55, 0.45);
  withCamera(camAt(lt, 2.5, { z0: 1.12, z1: 1.0 }), () => {
    quarries('mon', 0, 0, W, H, 86, (x, y, c) => (hash(c.seed) < 0.2 ? '#2a3a5a' : '#1a2238'), { leadW: 3.5 });
    for (let i = 0; i < 7; i++) {
      const x = 140 + i * 273, near = i % 2;
      drawPerson(x, 1060 + near * 30, near ? 1.0 : 0.86, { kind: 'shaikan', arms: 'point', look: x < 960 ? 1 : -1, flip: x > 960, mouth: 'open', brow: 1, frown: 1, glow: 0.15, robe: '#4a1a24', robe2: '#5c2430' });
    }
    const k = smooth(clamp((lt - 0.05) / 0.25));
    ctx.save(); ctx.globalAlpha = k;
    E.light = () => 1.1;
    banderole(960, 230, 640, 120, 'MONSTER', { font: '700 92px "UnifrakturMaguntia"', ls: 6, col: '#e8dcc0', ink: 'rgba(120,8,16,0.95)', L: 1 });
    drawCracks(crackPaths(960, 230, 420, 66, clamp(lt / 0.8)), 4);
    ctx.restore();
  });
  frameBorder(['#2a3a5a', '#c8d8ff', '#4a1a24', '#c8d8ff']);
};
// a cold bust for the interlude's quiet lines
function coldBust(key, lt, pose, o = {}) {
  E.light = sunLight(960, 360, 520, 0.5, 0.45);
  withCamera(camAt(lt, o.dur || 4, { z0: 1.0, z1: o.z1 || 1.1, y0: 560, y1: 520 }), () => {
    bustBg(key, E.T, { heat: o.heat || 0, cold: o.cold ?? 0.85, cols: (c, v) => (v < 0.15 ? '#3a4a6a' : '#1a2238'), ros: ['#c8d8ff'] });
    singBust(lt, { pose });
  });
}
SCENES.wordChosen = (lt, p) => coldBust('chosen', lt, { brow: 0.4, smirk: 0, lookY: 0.5, look: Math.sin(E.T * 1.6) * 0.35, nimbus: 0.4 }, { dur: 4.7 });
// the light drains from their veins; they turn away
SCENES.refusal = (lt, p) => {
  E.light = sunLight(960, 420, 760, 0.8, 0.45);
  withCamera(camAt(lt, 4.2, { z0: 1.0, z1: 1.06 }), () => {
    quarries('ref', 0, 0, W, H, 86, (x, y, c) => (hash(c.seed) < 0.2 ? '#6a3a5a' : '#3a2440'), { leadW: 3.5 });
    rosettes('ref', 0, 0, W, H, 86, ['#c8a8b8']);
    for (let i = 0; i < 5; i++) {
      const turn = lt > 0.8 + i * 0.5, glow = clamp(1 - (lt - 0.2 - i * 0.35) / 0.8);
      drawPerson(250 + i * 355, 1040, 0.98, { kind: 'shaikan', back: turn, arms: turn ? 'down' : 'cover', glow, look: (2 - i) * 0.3, flip: i > 2 });
    }
  });
  frameBorder(['#4a2a3a', '#c8a8b8', '#24161e', '#c8a8b8']);
};
// the golden future, then the same window as a cage
SCENES.future = (lt, p) => {
  const cage = p.cage ? smooth(clamp((lt - 0.2) / 1.2)) : 0;
  E.light = sunLight(960, 300, 600, 0.6, 0.7 - cage * 0.3);
  withCamera(camAt(lt, 3.4, { z0: p.cage ? 1.06 : 1.0, z1: p.cage ? 1.0 : 1.08 }), () => {
    quarries('fut', 0, 0, W, H, 90, (x, y, c) => lerpRGB('#fff0a0', '#ffa030', clamp(y / 800) * (0.7 + 0.3 * hash(c.seed))), { leadW: 3.5 });
    push(960, 260); const sunT = tessRadial('parsun', 0, 0, 40, 260, 2, 20, { rot: E.T * 0.05 }); glassField(sunT, (x, y, c) => (c.seed % 2 ? '#fff6c0' : '#ffe080'), { leadW: 4 }); pop();
    drawCity('capital', 80, 1840, 900, { hmin: 160, hvar: 280, seed: 11 });
    if (cage > 0) {
      // the leading thickens into bars
      ctx.save();
      for (let i = 0; i < 13; i++) {
        const x = 90 + i * 145, gy = lerp(-1100, 0, cage);
        ctx.save(); ctx.translate(0, gy);
        ctx.fillStyle = '#121016'; ctx.fillRect(x - 13, 0, 26, 1080);
        ctx.fillStyle = 'rgba(160,160,180,0.35)'; ctx.fillRect(x - 8, 0, 5, 1080);
        ctx.restore();
      }
      for (const by of [160, 620]) { ctx.fillStyle = '#121016'; ctx.globalAlpha = cage; ctx.fillRect(0, by - 14, W, 28); ctx.globalAlpha = 1; }
      ctx.restore();
    }
    for (let i = 0; i < 5; i++) drawPerson(330 + i * 315, 1080, 0.86, { kind: 'shaikan', back: !p.cage || lt < 1.0, arms: p.cage && lt > 1.0 ? 'cower' : 'down', flip: i > 2, glow: 0, mouth: 'open', brow: 1 });
  });
  frameBorder(['#ffcc40', '#c8202c', '#ffffff', '#c8202c']);
};
// the coldest smile
SCENES.stillChildren = (lt, p) => coldBust('still', lt, { brow: 0.2, smirk: 0.7, headTilt: -0.08, lookY: 0.4, look: -0.2, nimbus: 0.2 }, { dur: 3.3, z1: 1.16 });
// children under the great hand
SCENES.shelter = (lt, p) => {
  const t = E.T, u = smooth(clamp(lt / 3));
  E.light = sunLight(960, 700, 600, 0.5, 0.5);
  withCamera(camAt(lt, 5.6, { z0: 1.0, z1: 1.1, y0: 540, y1: 600 }), () => {
    quarries('shel', 0, 0, W, H, 86, (x, y, c) => (hash(c.seed) < 0.2 ? '#3a2a5a' : '#1e1634'), { leadW: 3.5 });
    rosettes('shel', 0, 0, W, H, 86, ['#c8a8ff']);
    for (let i = 0; i < 6; i++) drawPerson(480 + i * 190, 1050 - (i % 2) * 20, 0.62, { kind: 'child', arms: i % 2 ? 'cover' : 'cower', kneel: i % 3 === 0 ? 1 : 0, look: (i - 2.5) * -0.3, flip: i > 2, robe: ['#4a6a3a', '#6a4a3a', '#3a5a6a'][i % 3] });
    // the palm hovers over them like a roof
    push(960, lerp(-500, -120, u), Math.PI / 2 * 0, 3.6);
    scaled(3.6, () => { mcForearm(); push(0, MC_FA + 2, 0); mcHand('open'); pop(); });
    pop();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(960, 900, 0, 960, 900, 600); g.addColorStop(0, 'rgba(255,60,40,0.15)'); g.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  });
  frameBorder(['#3a2a5a', '#c8a8ff', '#c8202c', '#c8a8ff']);
};

// ---- BRIDGE ----
// the Emperor, a ghost in the glass
SCENES.emperorGhost = (lt, p) => {
  const crack = clamp((lt - 1.2) / 1.2);
  E.light = (x, y) => 0.4 + 0.35 * Math.exp(-((x - 960) ** 2 + (y - 400) ** 2) / (2 * 500 * 500)) + 0.06 * Math.sin(E.T * 9);
  withCamera(camAt(lt, 2.6, { z0: 1.0, z1: 1.08 }), () => {
    quarries('emp', 0, 0, W, H, 90, (x, y, c) => (hash(c.seed) < 0.2 ? '#4a5a7a' : '#2a3448'), { leadW: 3.5 });
    ctx.save(); ctx.globalAlpha = 0.85 + 0.15 * Math.sin(E.T * 7);
    drawEmperor(960, 1100, 0.98, { ghost: 1 });
    ctx.restore();
    drawCracks(crackPaths(960, 420, 700, 41, crack), 4);
  });
  frameBorder(['#4a5a7a', '#c8d8ff', '#2a3448', '#c8d8ff']);
};
// the nations' banners tear
SCENES.nations = (lt, p) => {
  E.light = sunLight(960, 400, 700, 0.55, 0.45);
  withCamera(camAt(lt, 1.6, { z0: 1.04, z1: 1.0 }), () => {
    quarries('nat', 0, 0, W, H, 86, (x, y, c) => (hash(c.seed) < 0.2 ? '#3a3a4a' : '#1e1e2a'), { leadW: 3.5 });
    const cols = [['#2a46c8', '#3a5ad8'], ['#1a7a3a', '#2a9a4a'], ['#c89a1a', '#e0b42a'], ['#7a2aa8', '#9a3ac8'], ['#9a0e1a', '#b8141f']];
    cols.forEach(([a, b], i) => drawBanner(240 + i * 360, 90, 0.95, { col: a, col2: b, torn: lt > 0.3 + i * 0.18 ? 1 : 0, ph: i, sway: 8, emblem: ['star', 'tree', 'sun', 'moon', 'crest'][i] }));
  });
  frameBorder(['#3a3a4a', '#c8c8d8', '#1e1e2a', '#c8c8d8']);
};
// the gods, dark in their niches
SCENES.godsDark = (lt, p) => SCENES.godsFade(lt + 3, p);
// the eyes, close
SCENES.trustedYou = (lt, p) => {
  const cam = camAt(lt, 2.0, { z0: 1.0, z1: 1.06 });
  E.light = (x, y) => 0.65 + 0.3 * Math.exp(-((x - 960) ** 2 + (y - 300) ** 2) / (2 * 700 * 700));
  withCamera(cam, () => {
    push(960, 0, 0, 3); scaled(3, () => mandorla('eyes2', 0, 380, 300, 520, E.T, { heat: 0 })); pop();
    drawMalacay(mcPose({ x: 960, y: 8155, s: 7.4, brow: -0.3, smirk: 0, look: 0, lookY: 0.1, mouth: mouthAt(E.T) * 0.6, blink: blinkAt(E.T, 21) }), E.T);
  });
};
// graves rise, one by one
SCENES.graves = (lt, p) => {
  E.light = sunLight(960, 260, 700, 0.4, 0.4);
  withCamera(camAt(lt, 3.1, { z0: 1.0, z1: 1.08, y0: 520, y1: 560 }), () => {
    quarries('grav', 0, 0, W, H, 86, (x, y, c) => (y < 640 ? (hash(c.seed) < 0.2 ? '#2a3058' : '#141836') : (hash(c.seed) < 0.3 ? '#2a3a2a' : '#1a261a')), { leadW: 3.5 });
    push(1500, 200); region('moon2', () => ({ out: arcPts(0, 0, 80, 80, 0, TAU, 24).slice(0, -1) }), ['#e8eef8'], { lw: 5, glow: 0.5, glowR: 100 }); pop();
    const n = 12;
    for (let i = 0; i < n; i++) {
      const row = i % 3, x = 180 + (i * 137) % 1560 + row * 40, y = 720 + row * 120;
      const rise = smooth(clamp((lt - i * 0.22) / 0.4));
      if (rise <= 0) continue;
      const sc = 0.7 + row * 0.25;
      push(x, y + (1 - rise) * 120, 0, sc);
      ctx.save(); ctx.beginPath(); ctx.rect(-200, -400, 400, 400); ctx.clip();
      region(i % 2 ? 'grave.cross' : 'grave.stone', () => (i % 2
        ? { out: [[-14, 0], [-14, -120], [-56, -120], [-56, -150], [-14, -150], [-14, -200], [14, -200], [14, -150], [56, -150], [56, -120], [14, -120], [14, 0]], poly: true }
        : { out: [[-60, 0], [-60, -110], [-40, -150], [0, -164], [40, -150], [60, -110], [60, 0]], brushes: [{ pts: [[-30, -100], [30, -100]], w: 3 }, { pts: [[-24, -76], [24, -76]], w: 3 }] }), ['#8a92a8'], { lw: 5 });
      ctx.restore();
      pop();
    }
  });
  frameBorder(['#2a3058', '#c8d8ff', '#1a261a', '#c8d8ff']);
};
// alone in a cold window
SCENES.alone = (lt, p) => {
  const t = E.T, u = smooth(clamp(lt / 4));
  E.light = sunLight(960, 380, 520, 0.45 + 0.25 * u, 0.5);
  withCamera(camAt(lt, 4.3, { z0: 0.92, z1: 1.08, y0: 560, y1: 470 }), () => {
    quarries('alone', 0, 0, W, H, 90, (x, y, c) => (hash(c.seed) < 0.15 ? '#3a4a7a' : '#1a2240'), { leadW: 3.5 });
    rosettes('alone', 0, 0, W, H, 90, ['#c8d8ff']);
    mandorla('alone', 960, 575, 300, 490, t, { rimCols: ['#5a6a9a', '#c8d8ff', '#2a3058', '#c8d8ff'] });
    drawMalacay(mcPose({ x: 960, y: 1015, s: 0.74, brow: 0.3, smirk: 0, lookY: 0.2, look: Math.sin(t * 0.5) * 0.3, mouth: mouthAt(t), blink: blinkAt(t, 23),
      al: { sh: 0.12, el: 0.1, hand: 'fist' }, ar: { sh: 0.12, el: 0.1, hand: 'fist' } }), t);
  });
  frameBorder(['#3a4a7a', '#c8d8ff', '#1a2240', '#c8d8ff']);
};
// four roundels (blood, throne, crown, thorns) struck out in turn
SCENES.notThese = (lt, p) => {
  const t = E.T, words = [0.0, 0.85, 1.75, 2.55];
  E.light = sunLight(960, 540, 900, 0.6, 0.4);
  quarries('nott', 0, 0, W, H, 86, (x, y, c) => (hash(c.seed) < 0.2 ? '#2a1a3a' : '#160e22'), { leadW: 3.5 });
  for (let i = 0; i < 4; i++) {
    const cx = 300 + i * 440, cy = 540, R = 180, on = lt > words[i] - 0.1, strike = clamp((lt - words[i] - 0.35) / 0.3);
    const clip = new Path2D(); clip.arc(cx, cy, R, 0, TAU);
    ctx.save(); ctx.clip(clip);
    E.light = () => (on ? 1.0 : 0.25);
    const bg = tessRadial('round' + i, cx, cy, 0, R, 2, 10, {});
    glassField(bg, (x, y, c) => (c.seed % 2 ? '#2a46c8' : '#1a2a86'), { leadW: 4 });
    if (i === 0) { push(cx, cy - 10, 0, 2.6); region('bdrop', () => ({ out: [[0, -26, 1], [12, 0], [10, 14], [0, 19], [-10, 14], [-12, 0]] }), ['#d01020'], { lw: 3, glow: 0.6, glowR: 20, keep: true }); pop(); }
    if (i === 1) drawThrone(cx, cy + 90, 0.22, { circlet: false });
    if (i === 2) drawCrown(cx, cy + 20, 0.9, {});
    if (i === 3) {
      // a crown of thorns: two twisted strands with thorns
      ctx.save(); ctx.translate(cx, cy + 10);
      for (const [rx, ry, ph] of [[120, 46, 0], [112, 40, 1.6]]) {
        const st = new Path2D();
        for (let k = 0; k <= 48; k++) { const a = (k / 48) * TAU; const x = Math.cos(a) * rx, y = Math.sin(a) * ry + Math.sin(a * 6 + ph) * 8; k ? st.lineTo(x, y) : st.moveTo(x, y); }
        lead(st, 16); ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 8; ctx.stroke(st);
      }
      ctx.fillStyle = '#e8dcc0'; ctx.strokeStyle = '#151419'; ctx.lineWidth = 2.5;
      for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU, x = Math.cos(a) * 118, y = Math.sin(a) * 44, d = k % 2 ? -1 : 1; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.lineTo(x + d * 4, y - 24 * (Math.sin(a) < 0 ? 1 : -1)); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
    lead(clip, 14);
    E.light = null;
    if (strike > 0) {
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = '#140608'; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(cx - R * 0.8, cy - R * 0.8); ctx.lineTo(cx - R * 0.8 + R * 1.6 * strike, cy - R * 0.8 + R * 1.6 * strike); ctx.stroke();
      ctx.strokeStyle = '#c81020'; ctx.lineWidth = 16; ctx.stroke();
      ctx.restore();
      drawCracks(crackPaths(cx, cy, R, 50 + i, strike), 3);
    }
  }
  frameBorder(['#2a1a3a', '#c8a8ff', '#c8202c', '#c8a8ff']);
};
// the door opens onto ruin
SCENES.doorRuin = (lt, p) => {
  const open = smooth(clamp((lt - 0.3) / 1.6));
  E.light = sunLight(960, 520, 480, 0.4, 0.4);
  withCamera(camAt(lt, 3.1, { z0: 1.0, z1: 1.15, y0: 540, y1: 500 }), () => {
    quarries('door2', 0, 0, W, H, 90, (x, y, c) => (hash(c.seed) < 0.15 ? '#2a1a2a' : '#140c16'), { leadW: 3.5 });
    drawDoor(960, 1010, 1.0, open, {
      dark: true,
      beyond: (w, h) => {
        E.light = () => 0.7;
        drawCity('ruin', -w / 2, w / 2, -60, { wall: ['#3a2a2a', '#2a2020'], roof: ['#1a1414'], lit: (x, y, r) => r < 0.2, winCol: 'rgba(255,90,40,0.9)', hmin: 120, hvar: 260, seed: 31 });
        flames('ruinf', -w / 2, w / 2, 0, 120, 8, E.T, { glow: 0.5 });
      },
    });
  });
  frameBorder(['#2a1a2a', '#c8202c', '#140c16', '#c8202c']);
};
// small hands smash the rose his hands are building
SCENES.breakWork = (lt, p) => {
  const t = E.T;
  E.light = sunLight(960, 540, 600, 0.6, 0.5);
  quarries('bw', 0, 0, W, H, 86, (x, y, c) => (hash(c.seed) < 0.2 ? '#2a1f5a' : '#161036'), { leadW: 3.5 });
  const r = roseWindow('wise', 960, 540, 330, 12);
  drawRose(r, { fill: ['#1a2a86', '#2a1a70'], petal: ['#c8202c', '#ffb030'], roundel: ['#ffcc40', '#2a46c8'], hub: ['#ffd040'] }, {});
  const hit = clamp((lt - 0.8) / 0.4);
  if (hit > 0) {
    drawCracks(crackPaths(1140, 420, 300, 61, hit), 4);
    shatter(lt - 0.8, r.petals.slice(0, 6).map((c) => c), () => '#ffb030', { x: 1140, y: 420, force: 500 });
  }
  bigHand(960 - 520, -300, 2.2, 'open', -0.5);
  bigHand(960 + 520, -300, 2.2, 'open', 0.5);
  for (let i = 0; i < 3; i++) {
    const k = clamp((lt - 0.4 - i * 0.15) / 0.5);
    push(1300 + i * 120, lerp(1200, 560 - i * 40, smooth(k)), -0.6 + i * 0.2, 1.1);
    scaled(1.1, () => { region('sh.sleeve2', () => ({ out: [[-30, 60], [30, 60], [36, 300], [-36, 300]], poly: true }), ['#3a3a4a'], { lw: 5 }); push(0, 60, Math.PI); unionPiece('sh.hand.fist', () => handDef('fist'), '#e0b89a', { lw: 3.6 }); pop(); });
    pop();
  }
  frameBorder(['#2a1f5a', '#ffcc40', '#c8202c', '#ffcc40']);
};
// he towers; they kneel
SCENES.kneel = (lt, p) => {
  const t = E.T;
  E.light = sunLight(960, 260, 560, 0.5, 0.7);
  withCamera(camAt(lt, 4.0, { z0: 1.0, z1: 1.1, y0: 560, y1: 500 }), () => {
    quarries('kneel', 0, 0, W, H, 88, (x, y, c) => (hash(c.seed) < 0.2 ? '#4a0610' : '#24030a'), { leadW: 3.5 });
    rosettes('kneel', 0, 0, W, H, 88, ['#ff3020']);
    mandorla('kneel', 960, 470, 340, 560, t, { heat: 0.7 });
    drawMalacay(mcPose({ x: 960, y: 1180, s: 1.0, nimbus: 1, blood: 0.3, eyeGlow: 0.6, brow: 0.6, smirk: 0.2, lookY: 0.8, mouth: mouthAt(t), blink: blinkAt(t, 25),
      al: { sh: 0.7, el: -0.3, hand: 'open' }, ar: { sh: 0.7, el: -0.3, hand: 'open' } }), t);
    for (let i = 0; i < 8; i++) {
      const x = i < 4 ? 120 + i * 130 : 1380 + (i - 4) * 130, kn = smooth(clamp((lt - 0.4 - (i % 4) * 0.3) / 0.6));
      drawPerson(x, 1060, 0.62, { kind: 'shaikan', arms: kn > 0.5 ? 'pray' : 'point', kneel: kn, look: x < 960 ? 0.7 : -0.7, flip: x > 960, glow: 0.4, frown: 1, brow: 1 });
    }
  });
  frameBorder(['#c8202c', '#ff6a30', '#4a0610', '#ff6a30']);
};
// blood seals a cracked heart
SCENES.heal = (lt, p) => {
  const t = E.T, seal = smooth(clamp((lt - 0.8) / 1.6));
  E.light = sunLight(960, 520, 560, 0.55, 0.6);
  quarries('heal', 0, 0, W, H, 86, (x, y, c) => (hash(c.seed) < 0.2 ? '#2a1a4a' : '#160e2a'), { leadW: 3.5 });
  rosettes('heal', 0, 0, W, H, 86, ['#ffcc40']);
  withCamera(camAt(lt, 2.9, { z0: 1.0, z1: 1.1 }), () => {
    drawHeart(960, 600, 4.2, E.beat * 0.5, {});
    const cr = crackPaths(960, 600, 260, 71, 1);
    drawCracks(cr, 6 * (1 - seal) + 0.01);
    if (seal > 0) { ctx.save(); ctx.globalAlpha = seal; bloodLead(cr, 12, 1); ctx.restore(); }
    // his hand above, a drop falling from the fingertips
    bigHand(1120, -380, 2.4, 'open', 0.35);
    const ph = (lt * 1.2) % 1;
    push(lerp(1000, 980, ph), lerp(330, 560, ph)); region('bdrop', () => ({ out: [[0, -26, 1], [12, 0], [10, 14], [0, 19], [-10, 14], [-12, 0]] }), ['#d01020'], { lw: 3.5, glow: 0.6, glowR: 20, keep: true }); pop();
  });
  frameBorder(['#2a1a4a', '#ffcc40', '#c8202c', '#ffcc40']);
};
// the red light finds them anyway
SCENES.saved = (lt, p) => {
  const u = smooth(clamp(lt / 2.6));
  E.light = sunLight(960, 300, 800, 0.78, 0.5);
  withCamera(camAt(lt, 3.1, { z0: 1.0, z1: 1.06 }), () => {
    quarries('saved', 0, 0, W, H, 86, (x, y, c) => lerpRGB(hash(c.seed) < 0.2 ? '#3a4a7a' : '#24305a', hash(c.seed) < 0.5 ? '#a00c18' : '#5a0610', clamp(u * 1.4 - y / H * 0.8)), { leadW: 3.5 });
    for (let i = 0; i < 7; i++) drawPerson(150 + i * 270, 1050 - (i % 2) * 30, 0.9, { kind: 'shaikan', arms: u < 0.6 ? 'point' : 'cover', mouth: 'open', brow: 1, frown: 1, glow: u, flip: i > 3, look: (3 - i) * 0.25 });
    lightBeam(960, -40, 400, 960, 1200, 2400, '#ff3020', 0.25 * u);
  });
  frameBorder(['#c8202c', '#ff6a30', '#1a2238', '#ff6a30']);
};
// the eyes kindle; the blood rises in him
SCENES.sure = (lt, p) => {
  const u = smooth(clamp((lt - 0.8) / 3.2));
  E.light = sunLight(960, 360, 520, 0.6, 0.6);
  withCamera(camAt(lt, 5.2, { z0: 1.0, z1: 1.2, y0: 560, y1: 470 }), () => {
    bustBg('sure', E.T, { heat: u, cols: (c, v) => lerpRGB(v < 0.15 ? '#3a4a6a' : '#1a2238', v < 0.5 ? '#5a0610' : '#3a0410', u), ros: u > 0.5 ? ['#ff3020'] : ['#c8d8ff'] });
    singBust(lt, { pose: { blood: u, eyeGlow: u, brow: 0.4, smirk: 0.2, lookY: 0.05 } });
  });
};
