'use strict';
// INTRO (0 – 47.9): the refused throne, tomorrow dropped, his eyes opening, the rose window,
// and the cathedral igniting window by window.

// ---------- the nave: looking down the aisle toward the apse window ----------
const NAVE = { vx: 960, vy: 470, F: 1.55, wn: 640, top: -1050, floor: 360 };
function naveX(xw, z) { return NAVE.vx + (xw * NAVE.F * 600) / (z * 600); }
function naveP(xw, yw, z) { return [NAVE.vx + (xw * NAVE.F) / z, NAVE.vy + (yw * NAVE.F) / z]; }
const NAVE_PAL = [['#c8202c', '#ffcc40', '#2a46c8'], ['#ffb030', '#c8202c', '#7a2aa8'], ['#2a46c8', '#ffcc40', '#c8202c'], ['#a8101c', '#ff8a1a', '#ffd040']];
// o: dolly (0 = standing far back), lit(i) → 0..1 per side window, apse(w, h) content callback, apseLight, candles
function drawNave(lt, o = {}) {
  const t = E.T, d = o.dolly || 0, nP = 7;
  // back wall and vault
  ctx.fillStyle = '#0b0a10'; ctx.fillRect(0, 0, W, H);
  const zs = [];
  for (let k = 0; k < nP; k++) zs.push(1.15 + k * 1.05 - d);
  const zFar = zs[nP - 1] + 0.6;
  // floor
  const fl = ctx.createLinearGradient(0, NAVE.vy, 0, H);
  fl.addColorStop(0, '#0d0c12'); fl.addColorStop(1, '#17151d');
  ctx.fillStyle = fl; ctx.fillRect(0, NAVE.vy + (NAVE.floor * NAVE.F) / zFar, W, H);
  // apse window at the far end
  const aw = (900 * NAVE.F) / zFar, ah = (2000 * NAVE.F) / zFar, ab = NAVE.vy + (300 * NAVE.F) / zFar;
  const apse = archPath(NAVE.vx - aw / 2, ab, aw, ah);
  if (o.apse) {
    ctx.save(); ctx.clip(apse);
    ctx.translate(NAVE.vx - aw / 2, ab - ah);
    o.apse(aw, ah);
    ctx.restore();
  }
  tracery(apse, Math.max(8, 44 / zFar), { color: '#1c1a24' });
  // side walls: windows between the pillars, far to near
  const beams = [];
  for (let k = nP - 2; k >= 0; k--) {
    const za = zs[k] + 0.18, zb = zs[k + 1] - 0.18, zm = (za + zb) / 2;
    if (za < 0.35) continue;
    for (const sx of [-1, 1]) {
      const i = k * 2 + (sx > 0 ? 1 : 0), lit = o.lit ? clamp(o.lit(i, k, sx)) : 0.15;
      const xw = sx * NAVE.wn;
      const q = [naveP(xw, -820, za), naveP(xw, -1000, zm), naveP(xw, -820, zb), naveP(xw, -160, zb), naveP(xw, -160, za)];
      const path = polyPath(q);
      // glass: a mosaic in screen space, clipped to the window
      ctx.save(); ctx.clip(path);
      const pal = o.pal ? o.pal[i % o.pal.length] : NAVE_PAL[i % NAVE_PAL.length];
      const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      ctx.fillStyle = '#05040a'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      const sp = Math.max(10, (x1 - x0) / 3.2);
      const tt = tess(`navewin${i}_${Math.round(sp)}_${Math.round(x0)}_${Math.round(y0)}`, x0, y0, x1, y1, sp, { seed: i * 17 + 3, aniso: 0.6 });
      E.light = () => lit * (1.05 + 0.25 * E.beat * (o.beatK ?? 1));
      glassField(tt, (x, y, c) => pal[c.seed % 3], { leadW: Math.max(1.5, sp * 0.09) });
      ctx.restore();
      E.light = null;
      lead(path, Math.max(3, 30 / za));
      if (lit > 0.05) beams.push({ q, sx, lit, col: pal[0], za, zb });
    }
  }
  // pillars and vault ribs, far to near
  for (let k = nP - 1; k >= 0; k--) {
    const z = zs[k];
    if (z < 0.3) continue;
    for (const sx of [-1, 1]) {
      const xi = sx * (NAVE.wn - 10), xo = sx * (NAVE.wn + 110);
      const a = naveP(xi, -1080, z), b = naveP(xo, NAVE.floor, z);
      const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(sx < 0 ? 1 : 0, '#25222e'); g.addColorStop(sx < 0 ? 0 : 1, '#0e0d13');
      ctx.fillStyle = g; ctx.fillRect(x0, a[1], x1 - x0, b[1] - a[1]);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = Math.max(1, 6 / z);
      ctx.strokeRect(x0, a[1], x1 - x0, b[1] - a[1]);
      // capital
      const c0 = naveP(sx * (NAVE.wn - 40), -1080, z), c1 = naveP(sx * (NAVE.wn + 140), -1040, z);
      ctx.fillStyle = '#2c2936'; ctx.fillRect(Math.min(c0[0], c1[0]), c0[1], Math.abs(c1[0] - c0[0]), c1[1] - c0[1]);
    }
    // pointed rib across the vault
    const L = naveP(-NAVE.wn, -1080, z), R = naveP(NAVE.wn, -1080, z), apex = naveP(0, -1650, z);
    ctx.save();
    ctx.strokeStyle = '#1d1b25'; ctx.lineWidth = Math.max(2, 70 / z); ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.quadraticCurveTo(L[0], apex[1], apex[0], apex[1]); ctx.quadraticCurveTo(R[0], apex[1], R[0], R[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,180,0.05)'; ctx.lineWidth = Math.max(1, 12 / z); ctx.stroke();
    ctx.restore();
  }
  // candles along the aisle
  if (o.candles !== false) {
    for (let k = nP - 1; k >= 0; k--) {
      const z = zs[k] + 0.5;
      if (z < 0.5) continue;
      for (const sx of [-1, 1]) {
        const [x, y] = naveP(sx * (NAVE.wn - 150), 180, z), s = NAVE.F / z;
        ctx.fillStyle = '#1a1820'; ctx.fillRect(x - 6 * s, y, 12 * s, 180 * s);
        ctx.fillStyle = '#efe4cc'; ctx.fillRect(x - 5 * s, y - 34 * s, 10 * s, 34 * s);
        const fl = 1 + 0.12 * Math.sin(t * 13 + k * 3 + sx);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const gg = ctx.createRadialGradient(x, y - 44 * s, 0, x, y - 44 * s, 80 * s);
        gg.addColorStop(0, 'rgba(255,190,90,0.55)'); gg.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y - 44 * s, 80 * s, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,230,160,0.95)';
        ctx.beginPath(); ctx.ellipse(x, y - 46 * s, 4.5 * s, 11 * s * fl, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }
  // light: beams from lit windows and pools on the floor
  for (const b of beams) {
    const top = [(b.q[0][0] + b.q[2][0]) / 2, (b.q[0][1] + b.q[4][1]) / 2], wTop = Math.abs(b.q[0][0] - b.q[2][0]);
    const zz = (b.za + b.zb) / 2 + 0.6, floorP = naveP(-b.sx * 120, NAVE.floor, zz);
    lightBeam(top[0], top[1], wTop * 1.1, floorP[0], floorP[1], wTop * 2.4, b.col, 0.12 * b.lit);
    lightPool(floorP[0], floorP[1], wTop * 1.8, wTop * 0.35, b.col, 0.22 * b.lit);
  }
  if (o.apseLight) {
    const p = naveP(0, NAVE.floor, zFar - 0.4);
    lightBeam(NAVE.vx, ab - ah * 0.4, aw * 0.9, p[0], p[1] + 60, aw * 3, o.apseCol || '#ffb060', 0.14 * o.apseLight);
    lightPool(p[0], p[1] + 40, aw * 2.2, aw * 0.3, o.apseCol || '#ffb060', 0.3 * o.apseLight);
  }
  dust(0, 0, W, H, 70, t, '#ffe8c8', 0.35);
}

// ---------- panels used inside windows and full frame ----------
// cold moonlit throne window
function panelThrone(w, h, lt, o = {}) {
  E.light = (x, y) => (o.lightK ?? 1) * (0.5 + 0.5 * Math.exp(-((x - (o.lx ?? w / 2)) ** 2 + (y - (o.ly ?? h * 0.35)) ** 2) / (2 * (o.lr ?? 520) ** 2)));
  quarries('thr' + Math.round(w), 0, 0, w, h, 84, (x, y, c) => (hash(c.seed) < 0.15 ? '#2a3a7a' : hash(c.seed) < 0.3 ? '#203070' : '#1a2860'), { leadW: 3.5 });
  rosettes('thr' + Math.round(w), 0, 0, w, h, 84, ['#c8d8ff', '#9ab0e8']);
}
SCENES.naveDark = (lt, p) => {
  const u = clamp(lt / 4.4);
  drawNave(lt, {
    dolly: lerp(0, 0.55, smooth(u)),
    lit: () => 0.06,
    apse: (w, h) => { E.light = () => 0.25 + 0.35 * u; panelThrone(w, h, lt, { lightK: 0.35 + 0.5 * u }); push(w / 2, h * 0.78, 0, w / 900); scaled(w / 900, () => drawThrone(0, 0, 1, { circlet: true })); pop(); },
    apseLight: 0.3 + 0.5 * u, apseCol: '#9ab8ff',
  });
};
SCENES.throne = (lt, p) => {
  const cam = camAt(lt, 4.1, { z0: 1.0, z1: 1.12, y0: 560, y1: 520 });
  withCamera(cam, () => {
    panelThrone(W, H, lt, { lx: 960, ly: 380, lr: 600 });
    E.light = (x, y) => 0.45 + 0.75 * Math.exp(-((x - 960) ** 2 + (y - 420) ** 2) / (2 * 420 * 420));
    drawBanner(380, 70, 1.15, { ph: 0 });
    drawBanner(1540, 70, 1.15, { ph: 1.3 });
    drawThrone(960, 760, 0.86, { circlet: true });
    // men turning from the weight: lords walk out of the window, backs turned
    const walk = smooth(clamp(lt / 4.2));
    drawPerson(560 - walk * 160, 1060, 0.62, { kind: 'king', back: true, robe: '#2a3a8a', robe2: '#3a4ca0' });
    drawPerson(1360 + walk * 170, 1060, 0.62, { kind: 'king', back: true, flip: true, robe: '#5a2a6a', robe2: '#6e3a80' });
    drawPerson(250 - walk * 100, 1080, 0.5, { kind: 'folk', back: true });
    drawPerson(1680 + walk * 110, 1080, 0.5, { kind: 'folk', back: true, flip: true });
  });
  jewelBorder('full', 18, 18, W - 18, H - 18, 22, ['#2a46c8', '#c8d8ff', '#1a2a6a', '#c8d8ff'], { seg: 70 });
};
// the wise: robed men around an hourglass while the sun crosses to moonrise
SCENES.wise = (lt, p) => {
  const u = clamp(lt / 5.8);
  const cam = camAt(lt, 5.8, { z0: 1.06, z1: 1.0 });
  withCamera(cam, () => {
    const dusk = smooth(u);
    E.light = (x, y) => lerp(1.0, 0.6, dusk) * (0.55 + 0.6 * Math.exp(-((x - 960) ** 2 + (y - 420) ** 2) / (2 * 520 * 520)));
    quarries('wise', 0, 0, W, H, 90, (x, y, c) => {
      const k = clamp(y / H);
      const day = lerpRGB('#e8a040', '#b8601c', k), night = lerpRGB('#3a2a7a', '#1a1850', k);
      return lerpRGB(day, night, clamp(dusk * 1.3 - hash(c.seed) * 0.3));
    }, { leadW: 3.5 });
    // sun sinking, moon rising (roundels on an arc)
    const sa = lerp(-0.4, 0.9, u);
    const sx = 960 + Math.sin(sa) * 700, sy = 380 - Math.cos(sa) * 260;
    push(sx, sy); region('sun.disc', () => ({ out: arcPts(0, 0, 70, 70, 0, TAU, 24).slice(0, -1) }), ['#ffd040'], { lw: 5, glow: 1, glowR: 90 }); pop();
    if (u > 0.45) { push(960 - Math.sin(sa) * 640, 300 + (1 - u) * 300); region('moon.disc', () => ({ out: arcPts(0, 0, 54, 54, 0, TAU, 24).slice(0, -1), panels: [{ pts: arcPts(22, -10, 50, 50, 0, TAU, 24).slice(0, -1), poly: true, ci: 1 }] }), ['#e8eef8', '#2a2a6a'], { lw: 5 }); pop(); }
    drawHourglass(960, 640, 1.25, clamp(lt / 5.6));
    // cautious wise men, hands folded, leaning in
    const lean = Math.sin(lt * 1.2) * 0.03;
    drawPerson(560, 1060, 0.78, { kind: 'mage', arms: 'pray', look: 0.8, rot: lean, robe: '#3a2a6a', robe2: '#52408c' });
    drawPerson(330, 1080, 0.66, { kind: 'mage', arms: 'cover', look: 0.6, robe: '#2a3a5a', robe2: '#3a4e74' });
    drawPerson(1360, 1060, 0.78, { kind: 'mage', arms: 'pray', look: -0.8, flip: true, rot: -lean, robe: '#4a2a4a', robe2: '#643a64' });
    drawPerson(1590, 1080, 0.66, { kind: 'mage', arms: 'down', look: -0.6, flip: true, robe: '#2a4a4a', robe2: '#3a6262' });
  });
  jewelBorder('full', 18, 18, W - 18, H - 18, 22, ['#c8202c', '#ffcc40', '#3a1f8a', '#ffcc40'], { seg: 70 });
};
// Malacay's hands lower a dawn-coloured orb into a crowd of reaching hands
SCENES.offer = (lt, p) => {
  const u = smooth(clamp(lt / 3.4));
  E.light = (x, y) => 0.5 + 0.8 * Math.exp(-((x - 960) ** 2 + (y - 470) ** 2) / (2 * 460 * 460));
  quarries('offer', 0, 0, W, H, 96, (x, y, c) => (hash(c.seed) < 0.18 ? '#3a1f6a' : '#24164e'), { leadW: 3.5 });
  rosettes('offer', 0, 0, W, H, 96, ['#ffcc40']);
  const oy = lerp(330, 470, u);
  // the reaching crowd of hands, rising
  for (let i = 0; i < 8; i++) {
    const x = 250 + i * 203, rise = 30 * Math.sin(lt * 2 + i) + u * 60, sk = ['#f0d8c4', '#e0b89a', '#c89878', '#f4e0d0'][i % 4];
    smallHand(x, 1060 - rise - (i % 2) * 70, 1.35, (x - 960) * -0.0007, i % 3 ? 'reach' : 'open', sk);
  }
  drawOrb(960, oy, 160, { glow: 1, rot: lt * 0.2 });
  // his hands come down from above, cradling it
  for (const sx of [-1, 1]) {
    push(960 + sx * 250, oy - 420, sx * 0.42, sx < 0 ? 1.55 : -1.55, 1.55);
    scaled(1.55, () => { mcForearm(); push(0, MC_FA + 2, -0.5); mcHand('open'); pop(); });
    pop();
  }
  jewelBorder('full', 18, 18, W - 18, H - 18, 22, ['#c8202c', '#ffcc40', '#3a1f8a', '#ffcc40'], { seg: 70 });
};
// the orb falls through their fingers and scatters across the lands
SCENES.drop = (lt, p) => {
  const fallT = 0.9;
  E.light = (x, y) => 0.75 + 0.35 * Math.exp(-((x - 960) ** 2 + (y - 520) ** 2) / (2 * 600 * 600));
  const cam = camAt(lt, 4.1, { z0: 1.15, z1: 1.0 });
  withCamera(cam, () => {
    drawMap(lt, { bleed: null });
    if (lt < fallT) {
      const u = lt / fallT;
      drawOrb(960, lerp(-80, 520, u * u), lerp(160, 120, u), { glow: 1, rot: lt * 3 });
    } else {
      const tt = lt - fallT;
      const orbCells = tessRadial('orbshards', 0, 0, 0, 120, 3, 12, { rot: 0.2 }).cells;
      const g = mapGeo();
      orbCells.forEach((c, i) => {
        const dest = g.cells[(i * 7 + 3) % g.cells.length];
        const k = clamp(tt / 1.4), e = 1 - (1 - k) ** 3;
        const x = lerp(960 + c.cx, dest.cx, e), y = lerp(520 + c.cy, dest.cy, e) - Math.sin(k * Math.PI) * 160 * hash(i);
        push(x, y, (hash(i + 9) - 0.5) * 8 * e);
        ctx.translate(-c.cx, -c.cy);
        glassPiece(c.path, lerpRGB('#fff3c0', '#ffb84a', c.rr / 110), { cx: c.cx, cy: c.cy, r: c.r, seed: c.seed, glow: 0.8 * (1 - k * 0.5), glowR: 40, L: 1.2 });
        lead(c.path, 4);
        pop();
      });
      if (tt < 0.25) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - tt / 0.25; const gg = ctx.createRadialGradient(960, 520, 0, 960, 520, 600); gg.addColorStop(0, 'rgba(255,240,200,0.9)'); gg.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
  });
  jewelBorder('full', 18, 18, W - 18, H - 18, 22, ['#1a3a8a', '#ffcc40', '#7a2aa8', '#ffcc40'], { seg: 70 });
};
// the eyes open
SCENES.eyes = (lt, p) => {
  const cam = camAt(lt, 2.4, { z0: 1.0, z1: 1.08 });
  E.light = (x, y) => 0.8 + 0.4 * Math.exp(-((x - 960) ** 2 + (y - 300) ** 2) / (2 * 700 * 700));
  withCamera(cam, () => {
    push(960, 0, 0, 3); scaled(3, () => mandorla('eyes', 0, 380, 300, 520, E.T, { heat: 0.5 })); pop();
    const open = smooth(clamp((lt - 0.35) / 0.4));
    drawMalacay(mcPose({ x: 960, y: 8155, s: 7.4, blink: 1 - open, brow: 0.35, smirk: 0.05, eyeGlow: 0.35 * open, look: 0, lookY: 0.15, mouth: mouthAt(E.T) * 0.7 }), E.T);
  });
};
// he lifts the world
SCENES.atlas = (lt, p) => {
  const u = smooth(clamp(lt / 4.6));
  E.light = (x, y) => (0.55 + 0.35 * u) + 0.6 * Math.exp(-((x - 960) ** 2 + (y - 300) ** 2) / (2 * 480 * 480));
  quarries('atlas', 0, 0, W, H, 92, (x, y, c) => (hash(c.seed) < 0.12 ? '#3a1f8a' : '#1a2a86'), { leadW: 3.5 });
  rosettes('atlas', 0, 0, W, H, 92, ['#ffcc40', '#ff9a30']);
  const cam = camAt(lt, 4.6, { z0: 1.12, z1: 1.0, y0: 470, y1: 540 });
  withCamera(cam, () => {
    mandorla('atlas', 960, 600, 320, 520, E.T, { rays: 26 });
    const lift = lerp(0.2, 0, u);
    const P = mcPose({ x: 960, y: 1080, s: 0.66, headTilt: -0.05, lookY: -0.6, brow: 0.3, smirk: 0, mouth: mouthAt(E.T),
      al: { sh: 2.55 + lift, el: 1.1, wr: 0.3, hand: 'open' }, ar: { sh: 2.55 + lift, el: 1.1, wr: 0.3, hand: 'open' } });
    drawMalacay(P, E.T);
    drawOrb(960, 1080 - 1265 * 0.66 + lift * 120, 118, {
      key: 'world', rot: lt * 0.1, glow: 0.6,
      cols: (c, k) => (hash(c.seed) < 0.45 ? lerpRGB('#3a7a4a', '#2a5a3a', k) : lerpRGB('#3a6ac8', '#1a3a8a', k)),
    });
  });
  jewelBorder('full', 18, 18, W - 18, H - 18, 22, ['#c8202c', '#ffcc40', '#2a46c8', '#ffcc40'], { seg: 70 });
};
// a rose window turning around him
SCENES.rose = (lt, p) => {
  const u = clamp(lt / 6.9);
  const cam = camAt(lt, 6.9, { z0: 1.0, z1: 0.82 });
  E.light = (x, y) => (0.6 + 0.5 * u) + 0.5 * Math.exp(-((x - 960) ** 2 + (y - 540) ** 2) / (2 * 380 * 380)) + 0.2 * E.beat;
  ctx.fillStyle = '#07060b'; ctx.fillRect(0, 0, W, H);
  withCamera(cam, () => {
    stoneWall(-400, -400, W + 400, H + 400, { color: '#0d0b12', course: 110 });
    const R = 520;
    push(960, 540, lt * 0.12);
    const r = roseWindow('axis', 0, 0, R, 12);
    drawRose(r, { fill: ['#1a2a86', '#2a1a70'], petal: ['#c8202c', '#ffb030', '#c8202c', '#7a2aa8'], roundel: ['#ffcc40', '#2a46c8'], hub: ['#ffd040'] }, {});
    pop();
    // the hub opens into a medallion: his bust at the still centre
    const mr = R * 0.24;
    const med = new Path2D(); med.arc(960, 540, mr, 0, TAU);
    ctx.save(); ctx.clip(med);
    push(960, 540, 0, 1); ctx.translate(-960, -540);
    E.light = (x, y) => 1.1;
    ctx.fillStyle = '#ffd860'; ctx.fillRect(0, 0, W, H);
    drawMalacay(mcPose({ x: 960, y: 1467, s: 0.9, nimbus: 1, brow: 0.1, smirk: 0.3, lookY: 0.1, mouth: mouthAt(E.T) }), E.T);
    pop();
    ctx.restore();
    lead(med, 12);
    ctx.save(); ctx.lineWidth = 40; ctx.strokeStyle = '#211f29';
    ctx.beginPath(); ctx.arc(960, 540, R + 20, 0, TAU); ctx.stroke(); ctx.restore();
  });
};
// the swell: pulling back down the nave as the windows ignite, the rose blazing at the end
SCENES.ignite = (lt, p) => {
  const D = 11.9, u = clamp(lt / D);
  drawNave(lt, {
    dolly: lerp(0.9, 0.0, smooth(u)),
    lit: (i, k) => smooth(clamp((u * 1.25 - (6 - k) * 0.12 - (i % 2) * 0.05) * 3)),
    apse: (w, h) => {
      E.light = () => 0.8 + 0.6 * u + 0.25 * E.beat;
      ctx.fillStyle = '#1a1050'; ctx.fillRect(0, 0, w, h);
      const R = w * 0.42;
      push(w / 2, h * 0.36, E.T * 0.12);
      const r = roseWindow('axis', 0, 0, 520, 12);
      ctx.scale(R / 520, R / 520);
      drawRose(r, { fill: ['#1a2a86', '#2a1a70'], petal: ['#c8202c', '#ffb030', '#c8202c', '#7a2aa8'], roundel: ['#ffcc40', '#2a46c8'], hub: ['#ffd040'] }, {});
      pop();
      push(w / 2, h * 0.92, 0, w / 1500); scaled(w / 1500, () => { E.light = () => 1; drawMalacay(mcPose({ x: 0, y: 0, s: 0.95, nimbus: 1, al: { sh: 1.05, el: -0.4, hand: 'open' }, ar: { sh: 1.05, el: -0.4, hand: 'open' } }), E.T); }); pop();
    },
    apseLight: 0.4 + 0.8 * u, apseCol: '#ffb060',
  });
  // the title, inscribed on a banderole as the swell crests
  const k = smooth(clamp((lt - 6.2) / 1.2));
  if (k > 0) {
    ctx.save(); ctx.globalAlpha = k;
    E.light = () => 1;
    banderole(960, 930, 600, 92, 'COME MY CHILDREN', { font: '700 58px "Cinzel Decorative"', ls: 6, L: 1.05 });
    ctx.restore();
  }
};
