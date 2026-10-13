'use strict';
// Recurring sets: studio + weather map, living room, toy-theatre stage, TV-screen helper.

// Draw a full 1920x1080 scene inside a screen rect (fit height, centred, cropped sides).
function inScreen(sw, sh, fn, zoom = 1) {
  const sc = (sh / H) * zoom;
  ctx.save();
  ctx.translate(sw / 2, sh / 2);
  ctx.scale(sc, sc);
  ctx.translate(-W / 2, -H / 2);
  scaled(sc, fn);
  ctx.restore();
}

// ---------- weather map ----------
const LAND = [[0.08, 0.42], [0.16, 0.26], [0.3, 0.2], [0.4, 0.27], [0.52, 0.18], [0.66, 0.22], [0.78, 0.3], [0.9, 0.36],
  [0.88, 0.55], [0.8, 0.68], [0.7, 0.66], [0.62, 0.82], [0.48, 0.86], [0.38, 0.74], [0.26, 0.8], [0.14, 0.7], [0.07, 0.56]];
function landPath(c, x, y, w, h) {
  const pts = LAND.map(([u, v]) => [x + u * w, y + v * h]);
  const n = pts.length;
  c.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  c.closePath();
}
function mapIcon(k, x, y, s, o = {}) {
  if (k === 'sun') sun(x, y, 34 * s, { face: o.face || 'smile', rot: E.T * 0.4 });
  else if (k === 'cloud') cloud(x, y, 130 * s, 70 * s, { face: o.face || 'smile', seed: o.seed || 3 });
  else if (k === 'storm') {
    cloud(x, y, 150 * s, 82 * s, { face: o.face || 'grin', seed: 5, color: mix('#8b93a6', '#3a4256', E.D), shade: mix('#6e7689', '#262c3c', E.D) });
    bolt(x + 20 * s, y + 60 * s, 0.55 * s, 0.15, '#ffe46b');
  } else if (k === 'rain') {
    cloud(x, y, 130 * s, 70 * s, { face: o.face || 'worried', seed: 6, color: mix('#dfe6ee', '#59627a', E.D) });
    for (let i = 0; i < 4; i++) raindrop(x - 40 * s + i * 27 * s, y + 52 * s + ((E.T * 60 + i * 13) % 24) * s, 0.7 * s);
  } else if (k === 'snow') {
    cloud(x, y, 130 * s, 70 * s, { face: o.face || 'smile', seed: 7 });
    for (let i = 0; i < 3; i++) snowflake(x - 34 * s + i * 34 * s, y + 60 * s, 10 * s, E.T + i);
  } else if (k === 'tornado') tornado(x, y, 70 * s, 150 * s, E.T, o);
  else if (k === 'pin') pinTop(x, y, 26 * s);
}
function tornado(x, y, w, h, t, o = {}) {
  ctx.save();
  ctx.lineCap = 'round';
  const cols = o.colors || ['#2b2b33', '#4a5568', '#d23a2f', '#2f5fd0'];
  for (let i = 0; i < 22; i++) {
    const u = i / 21, yy = y - h / 2 + u * h, rw = lerp(w, w * 0.12, u);
    const sw = Math.sin(t * 5 + u * 6) * w * 0.12 * (1 - u * 0.4);
    ctx.strokeStyle = crayon(cols[i % cols.length]);
    ctx.lineWidth = 4 + (1 - u) * 3;
    ctx.beginPath();
    ctx.ellipse(x + sw + Math.sin(u * 3 + t) * w * 0.15 * u, yy, rw, rw * 0.22, 0, (t * 4 + i) % TAU, ((t * 4 + i) % TAU) + Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.restore();
}
// icons: [{k, u, v, s, t0, face}] in board-local 0..1; T = global time for pop-in
function weatherMap(x, y, w, h, o = {}) {
  const D = E.D;
  paper((c) => pRRect(c, x - 22, y - 22, w + 44, h + 44, 18), pc('wood'), { d: 2.4, tex: 0.9, edge: '#fff', edgeA: 0.2 });
  paper((c) => pRRect(c, x, y, w, h, 10), mix('#86bcdc', '#122544', D), { d: 0.6, tex: 0.8 });
  ctx.save(); ctx.beginPath(); pRRect(ctx, x, y, w, h, 10); ctx.clip();
  // gentle wave lines on the sea
  ctx.strokeStyle = mix('#b7dcf0', '#1d3a64', D); ctx.lineWidth = 2.5;
  for (let r = 0; r < 9; r++) for (let q = 0; q < 7; q++) {
    const wx = x + 30 + q * (w / 6.3) + (r % 2) * 40, wy = y + 70 + r * (h / 9);
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 12, wy - 8, wx + 24, wy); ctx.quadraticCurveTo(wx + 36, wy + 8, wx + 48, wy); ctx.stroke();
  }
  ctx.restore();
  // land
  paper((c) => landPath(c, x, y + h * 0.04, w, h), mix('#7fb48f', '#103a30', D), { d: 0.8, tex: 0.5 });
  paper((c) => landPath(c, x + 6, y + h * 0.04 - 6, w - 12, h - 8), pc('mint'), { d: 0.9, tex: 0.8, edge: '#fff', edgeA: 0.4 });
  // county lines + towns
  line([[x + w * 0.38, y + h * 0.24], [x + w * 0.42, y + h * 0.5], [x + w * 0.4, y + h * 0.78]], rgba('#ffffff', 0.75), 3, { dash: [10, 9] });
  line([[x + w * 0.6, y + h * 0.2], [x + w * 0.62, y + h * 0.48], [x + w * 0.7, y + h * 0.66]], rgba('#ffffff', 0.75), 3, { dash: [10, 9] });
  line([[x + w * 0.16, y + h * 0.5], [x + w * 0.42, y + h * 0.5], [x + w * 0.86, y + h * 0.46]], rgba('#ffffff', 0.6), 3, { dash: [10, 9] });
  const towns = o.towns ?? [[0.27, 0.38, 'MAPLE'], [0.52, 0.34, 'NINE'], [0.74, 0.44, 'HOLLOW'], [0.5, 0.68, 'BRIGHTON']];
  for (const [u, v, name] of towns) {
    paper((c) => pBlob(c, x + u * w, y + v * h, 7, 7, 0, 3), mix('#c8433a', '#e0b84a', D), { d: 0.5, tex: 0.3 });
    ptext(name, x + u * w, y + v * h + 28, `${Math.round(h * 0.034)}px "Josefin Sans"`, mix('#2b4a3c', '#bfe6d4', D), { d: 0, tex: 0, ls: 2 });
  }
  // compass
  push(x + w - 60, y + h - 64);
  paper((c) => pStar(c, 0, 0, 34, 8, 4, 0), mix('#fffaf0', '#cfd4dc', D), { d: 0.8, tex: 0.4 });
  ptext('N', 0, -40, '20px "Bebas Neue"', mix('#2b2420', '#e8edf5', D), { d: 0, tex: 0 });
  pop();
  // header
  paper((c) => pRect(c, x + w * 0.2, y - 46, w * 0.6, 58), mix('#f6efdc', '#1d2a44', D), { d: 1.4, tex: 0.8 });
  ptext(o.title || "TOMORROW'S FORECAST", x + w / 2, y + 0, '40px "Bebas Neue"', mix('#14855e', '#4fe0a8', D), { d: 0, tex: 0.3, ls: 4 });
  // icons
  for (const ic of o.icons || []) {
    const age = (o.T ?? E.T) - (ic.t0 ?? -99);
    if (age < 0) continue;
    const sc = (ic.s || 1) * (age < 0.5 ? easeOutBack(clamp(age / 0.35)) : 1) * (o.iconScale || 1);
    const shake = ic.shake && age < 0.6 ? Math.sin(age * 60) * 6 * (1 - age / 0.6) : 0;
    mapIcon(ic.k, x + ic.u * w + shake, y + ic.v * h, sc, ic);
  }
}

// ---------- studio ----------
function drawStudio(o = {}) {
  const cam = o.cam || { x: W / 2, y: H / 2, z: 1 };
  const D = E.D;
  withCam(cam, 0.6, () => {
    paperBackdrop(mix('#efd9b6', '#1a1f2c', D), { tex: 0.8 });
    // fluted deco panels
    for (let i = -4; i < 12; i++) {
      const px = i * 200 + 40;
      paper((c) => pRect(c, px, -200, 120, 1300), i % 2 ? mix('#f6e7cc', '#232a3a', D) : mix('#bfe0c8', '#173c35', D), { d: 0.9, tex: 0.7 });
      line([[px + 60, -200], [px + 60, 1100]], rgba('#ffffff', 0.25), 2);
      line([[px - 6, -200], [px - 6, 1100]], mix('#d6aa52', '#8a7032', D), 4);
    }
    // sunburst arch
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, -400, W + 800, 870 + 400); ctx.clip();
    sunburst(720, 860, 760, 28, -Math.PI + (o.burstRot || 0), mix('#f7d77e', '#2a3150', D), mix('#f3b56a', '#1a2038', D));
    ctx.restore();
    paper((c) => { c.moveTo(-40, 860); c.arc(720, 860, 770, Math.PI, TAU); c.arc(720, 860, 735, TAU, Math.PI, true); c.closePath(); }, mix('#d6aa52', '#8a7032', D), { d: 1, tex: 0.5 });
    // crown molding
    paper((c) => pRect(c, -400, -40, W + 800, 70), mix('#d6aa52', '#6c5a2a', D), { d: 1.6, tex: 0.7 });
    // station plaque
    push(1560, 150);
    paper((c) => pBlob(c, 0, 0, 105, 105, 0.01, 4, 48), mix('#14855e', '#0c3f30', D), { d: 2, tex: 0.7, edge: '#ffe9a8', edgeA: 0.8, edgeW: 4 });
    ptext('9', 0, 52, '150px "Limelight"', mix('#ffe9a8', '#e0c070', D), { d: 1, tex: 0.3 });
    ribbon(0, 112, 250, 'WEATHER WATCH', { h: 54, color: mix('#c8433a', '#5a1f2a', D), dark: mix('#8e2b26', '#3a121a', D), font: '30px "Bebas Neue"', ls: 3 });
    pop();
    // on-air light
    const lit = o.onAir ?? 1;
    paper((c) => pRRect(c, 120, 70, 190, 70, 12), lit ? '#d9362c' : '#5a2a28', { d: 1.4, tex: 0.6 });
    if (lit) { ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(E.T * 6); ctx.fillStyle = '#ff6a50'; ctx.beginPath(); ctx.ellipse(215, 105, 140, 70, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ptext('ON AIR', 215, 122, '46px "Bebas Neue"', lit ? '#fff4e0' : '#9a6a60', { d: 0, tex: 0.2, ls: 4 });
  });
  withCam(cam, 1, () => {
    // floor
    paper((c) => pRect(c, -600, 900, W + 1200, 600), mix('#c7915f', '#22191c', D), { d: 1.2, tex: 0.9 });
    for (let i = 0; i < 6; i++) line([[-600, 930 + i * 34], [W + 600, 930 + i * 34]], 'rgba(60,30,10,0.18)', 2);
    paper((c) => pRect(c, -600, 896, W + 1200, 12), mix('#e0b070', '#3a2a22', D), { d: 0.8, tex: 0.6 });
    if (o.map !== false) weatherMap(o.mapX ?? 150, o.mapY ?? 250, o.mapW ?? 980, o.mapH ?? 560, o.map || {});
    if (o.lights !== false) {
      for (const [lx, flip] of [[-60, 1], [W + 60, -1]]) {
        push(lx, 1080, 0, flip, 1);
        line([[0, 0], [60, -560]], '#2b2b30', 10, { d: 1.2 });
        line([[60, -560], [40, 0]], '#2b2b30', 6, { d: 1 });
        push(60, -600, 0.5);
        paper((c) => { c.moveTo(-40, -50); c.lineTo(40, -50); c.lineTo(70, 50); c.lineTo(-70, 50); c.closePath(); }, '#3a3d44', { d: 1.6, tex: 0.4 });
        paper((c) => pBlob(c, 0, 50, 70, 14, 0, 2), '#fff6d8', { d: 0.3, tex: 0 });
        pop();
        pop();
      }
    }
    if (o.actors) o.actors();
    if (o.desk) studioDesk(o.desk.x ?? 1300, o.desk.y ?? 1080, o.desk.w ?? 900);
  });
}
function studioDesk(x, y, w) {
  const D = E.D, h = 300;
  paper((c) => pRect(c, x - w / 2 - 20, y - h - 24, w + 40, 30), mix('#d6aa52', '#6c5a2a', D), { d: 2, tex: 0.6 });
  paper((c) => pRRect(c, x - w / 2, y - h, w, h + 40, 14), mix('#14855e', '#0e3a30', D), { d: 2, tex: 0.8, edge: '#fff', edgeA: 0.2 });
  for (let i = 1; i < 6; i++) line([[x - w / 2 + (i * w) / 6, y - h + 20], [x - w / 2 + (i * w) / 6, y + 40]], 'rgba(255,255,255,0.12)', 4);
  paper((c) => pBlob(c, x, y - h / 2 + 10, 78, 78, 0.01, 4, 40), mix('#f6efdc', '#1d2a44', D), { d: 1.4, tex: 0.6 });
  ptext('9', x, y - h / 2 + 58, '120px "Limelight"', mix('#c8433a', '#e0c070', D), { d: 0.8, tex: 0.3 });
}

// ---------- living room ----------
function windowSkyDay(x, y, w, h, o = {}) {
  ctx.fillStyle = mix('#a6d4e3', '#1c2340', o.dark || 0);
  ctx.fillRect(x, y, w, h);
  const st = o.storm || 0;
  if (st < 0.95) sun(x + w * 0.72, y + h * 0.3, 40, { face: 'smile', rot: E.T * 0.3 });
  cloud(x + w * 0.3, y + h * 0.35, 150, 70, { face: st > 0.5 ? 'stare' : null, seed: 2 });
  hills(y + h * 0.82, mix('#9fcf7b', '#1c3a30', o.dark || 0), 14, 2, { d: 0.8 });
  if (o.speck) {
    // the storm that "isn't even here" — a speck on the horizon that grows
    const s = o.speck;
    cloud(x + w * 0.1, y + h * 0.66, 70 * s, 40 * s, { color: '#4a5266', shade: '#2e3444', seed: 9 });
  }
  if (st > 0) {
    ctx.save(); ctx.globalAlpha = st * 0.85; ctx.fillStyle = '#2a3046'; ctx.fillRect(x, y, w, h); ctx.restore();
    if (st > 0.3) {
      cloud(x + w * 0.5, y + h * 0.2, 260, 110, { color: '#4a5266', shade: '#2e3444', seed: 11 });
      if (hash2(E.f, 5) < 0.2 * st) bolt(x + w * 0.62, y + h * 0.55, 0.6, 0.2);
      rain(x, y, w, h, 18 * st, E.T, { s: 0.45, seed: 2, color: '#7f9bc4' });
    }
  }
}
function dog(x, y, s = 1, o = {}) {
  push(x, y, 0, s);
  const col = o.color || '#c98a52';
  paper((c) => { c.moveTo(48, -40); c.quadraticCurveTo(80 + Math.sin(E.T * (o.wag ?? 10)) * 18, -80, 74, -86); c.lineTo(66, -80); c.quadraticCurveTo(68, -60, 42, -44); c.closePath(); }, col, { d: 0.8, tex: 0.6 });
  paper((c) => pBlob(c, 0, -40, 58, 30, 0.04, 3, 28), col, { d: 1.2, tex: 0.7 });
  for (const lx of [-40, -20, 24, 44]) paper((c) => pRRect(c, lx - 6, -20, 12, 22, 5), col, { d: 0.7, tex: 0.5 });
  paper((c) => pBlob(c, -58, -74, 30, 26, 0.04, 6, 26), col, { d: 1.2, tex: 0.7 });
  paper((c) => pBlob(c, -82, -66, 14, 10, 0.04, 7, 16), '#f0d2b0', { d: 0.4, tex: 0.5 });
  ctx.fillStyle = '#2b2420'; ctx.beginPath(); ctx.arc(-94, -70, 4.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(-62, -80, 3.6, 0, TAU); ctx.fill();
  paper((c) => { c.moveTo(-50, -96); c.quadraticCurveTo(-30, -96, -34, -60); c.quadraticCurveTo(-44, -70, -50, -96); c.closePath(); }, mix(col, '#2b2420', 0.4), { d: 0.8, tex: 0.5 });
  pop();
}
// family: [{x, ...person opts}], screen: fn(sw, sh), sky: fn(x, y, w, h)
function drawLiving(o = {}) {
  const cam = o.cam || { x: W / 2, y: H / 2, z: 1 };
  const D = E.D, night = o.night || 0;
  withCam(cam, 1, () => {
    // wallpaper
    paperBackdrop(mix('#f3dcbd', '#202435', D));
    for (let i = -6; i < 24; i++) paper((c) => pRect(c, i * 110, -400, 46, 1260), mix('#ecd0ad', '#1a1d2c', D), { d: 0, tex: 0.4 });
    for (let i = -6; i < 24; i++) for (let j = 0; j < 8; j++) paper((c) => pStar(c, i * 110 + 78, j * 110 + 40, 9, 4, 4, 0), mix('#e5a691', '#3a3350', D), { d: 0.2, tex: 0.3 });
    // window
    const wx = 840, wy = 150, ww = 420, wh = 360;
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    (o.sky || windowSkyDay)(wx, wy, ww, wh, o.skyOpts || {});
    ctx.restore();
    paper((c) => { pRect(c, wx - 18, wy - 18, ww + 36, wh + 36); c.rect(wx, wy, ww, wh); }, mix('#fbf6ea', '#3a3f52', D), { d: 1.4, tex: 0.6, rule: 'evenodd' });
    paper((c) => { pRect(c, wx + ww / 2 - 7, wy, 14, wh); pRect(c, wx, wy + wh / 2 - 7, ww, 14); }, mix('#fbf6ea', '#3a3f52', D), { d: 0.8, tex: 0.6 });
    paper((c) => pRect(c, wx - 40, wy + wh + 10, ww + 80, 22), mix('#fbf6ea', '#3a3f52', D), { d: 1.2, tex: 0.6 });
    for (const sd of [-1, 1]) {
      const cx = sd < 0 ? wx - 40 : wx + ww + 40;
      paper((c) => { c.moveTo(cx, wy - 40); c.lineTo(cx - sd * 120, wy - 40); c.quadraticCurveTo(cx - sd * 50, wy + 160, cx - sd * 90, wy + wh + 60); c.lineTo(cx + sd * 30, wy + wh + 60); c.closePath(); }, mix('#e9897a', '#4a2134', D), { d: 1.6, tex: 0.7 });
    }
    paper((c) => pRect(c, wx - 200, wy - 52, ww + 400, 16), mix('#b47c4f', '#2e1d16', D), { d: 1.2, tex: 0.6 });
    // portrait of the host on the wall
    push(330, 300, -0.03);
    paper((c) => pRect(c, -110, -140, 220, 270), mix('#d6aa52', '#6c5a2a', D), { d: 1.8, tex: 0.6 });
    paper((c) => pRect(c, -88, -118, 176, 226), mix('#bfe0c8', '#173c35', D), { d: 0.5, tex: 0.6 });
    ctx.save(); ctx.beginPath(); ctx.rect(-88, -118, 176, 226); ctx.clip();
    const pp = wvPose({ x: 0, y: 1010 * 0.36 - 20, s: 0.36, eyeX: o.portraitLook ?? 0.6, grin: o.portraitGrin || 0, storm: o.portraitStorm || 0 });
    drawWeathervane(pp, E.T);
    ctx.restore();
    pop();
    // floor + rug
    paper((c) => pRect(c, -600, 820, W + 1200, 500), mix('#c98f5f', '#1d1619', D), { d: 1.4, tex: 0.9 });
    for (let i = 0; i < 7; i++) line([[-600, 850 + i * 34], [W + 600, 850 + i * 34]], 'rgba(60,30,10,0.18)', 2);
    paper((c) => pBlob(c, 1180, 975, 520, 70, 0.02, 3, 48), mix('#e2574c', '#4a1f2c', D), { d: 0.8, tex: 0.8 });
    paper((c) => pBlob(c, 1180, 975, 440, 52, 0.02, 4, 48), mix('#f2b84b', '#5a4524', D), { d: 0.5, tex: 0.8 });
    // floor lamp
    line([[1820, 840], [1820, 420]], '#2b2420', 8, { d: 1 });
    paper((c) => { c.moveTo(1760, 420); c.lineTo(1880, 420); c.lineTo(1850, 330); c.lineTo(1790, 330); c.closePath(); }, mix('#f7d46a', '#5a4a2a', D), { d: 1.4, tex: 0.7 });
    if (D > 0.4) { ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffe39a'; ctx.beginPath(); ctx.moveTo(1760, 420); ctx.lineTo(1880, 420); ctx.lineTo(1960, 840); ctx.lineTo(1680, 840); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // couch back
    const cc = mix('#4fa79a', '#123a38', D), cd = mix('#3b8a7e', '#0c2a28', D);
    paper((c) => pRRect(c, 960, 560, 780, 210, 40), cc, { d: 2, tex: 0.8, edge: '#fff', edgeA: 0.2 });
    for (let i = 0; i < 3; i++) paper((c) => pRRect(c, 990 + i * 245, 585, 230, 150, 30), cd, { d: 0.6, tex: 0.6 });
    // family (feet hidden behind the seat front)
    for (const p of o.family || []) {
      if (p.cutout) {
        // consumed: a white person-shaped hole in the paper
        push(p.x, p.y ?? 785, 0, p.s || 1.7);
        ctx.save(); ctx.globalAlpha = p.cutout;
        paper((c) => { pBlob(c, 0, -132, 25, 26, 0.03, 2); pRRect(c, -24, -114, 48, 70, 14); }, '#fbf7ec', { d: -0, tex: 0.3 });
        line([[-26, -158], [26, -158]], 'rgba(0,0,0,0)', 1);
        ctx.restore();
        pop();
        continue;
      }
      person(p.x, p.y ?? 785, p.s || 1.7, p);
    }
    paper((c) => pRRect(c, 940, 720, 820, 110, 30), cc, { d: 2, tex: 0.8, edge: '#fff', edgeA: 0.25 });
    for (const ax of [920, 1700]) paper((c) => pRRect(c, ax, 640, 80, 200, 30), cd, { d: 2, tex: 0.8 });
    for (const lx of [990, 1700]) line([[lx, 830], [lx + (lx > 1300 ? 12 : -12), 880]], '#2b2420', 8, { d: 0.8 });
    if (o.dog !== false) dog(o.dogX ?? 760, 960, 1.15, { wag: o.dogWag ?? 10 });
    if (o.bubbles) o.bubbles();
    // TV (left, facing us)
    const tv = tvSet(o.tvX ?? 420, 900, o.tvW ?? 560, { screen: o.screen, on: o.tvOn ?? 1, glow: o.tvGlow || 0, static: o.tvStatic || 0, knob: o.knob || 0 });
    if (o.tvLight && (o.tvOn ?? 1) > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = o.tvLight;
      const g = ctx.createRadialGradient(420, 640, 50, 420, 640, 1100);
      g.addColorStop(0, 'rgba(150,255,210,0.55)'); g.addColorStop(1, 'rgba(150,255,210,0)');
      ctx.fillStyle = g; ctx.fillRect(-600, -400, W + 1200, H + 800); ctx.restore();
    }
    if (o.front) o.front();
  });
}
// Host on a TV screen: the studio, framed on his upper body.
function tvHost(sw, sh, T, o = {}) {
  inScreen(sw, sh, () => {
    drawStudio({ cam: o.cam || { x: 1330, y: 520, z: 1.6 }, map: o.map || {}, lights: false, actors: () => {
      const P = wvPose(Object.assign({ x: 1330, y: 1050, s: 0.8 }, o.pose || {}));
      wvLive(T, P, o.live || {});
      drawWeathervane(P, T);
    } });
  });
}

// centre of the living-room TV screen (for push-ins)
const TV_SCREEN = { x: 364, y: 668, h: 306 };

// ---------- toy-theatre stage ----------
function drawStage(o = {}) {
  const D = E.D;
  paperBackdrop(mix(o.skyCol || '#a6d4e3', '#0f1a33', D));
  if (o.stars) for (let i = 0; i < 90; i++) {
    const tw = 0.5 + 0.5 * Math.sin(E.T * 3 + i);
    ctx.fillStyle = `rgba(255,250,220,${0.3 + 0.6 * tw * o.stars})`;
    ctx.beginPath(); ctx.arc(hash2(i, 1) * W, hash2(i, 2) * H * 0.7, 1.5 + hash2(i, 3) * 2.5, 0, TAU); ctx.fill();
  }
  if (o.back) o.back();
  hills(760, mix('#9fcf7b', '#1d3b31', D), 40, 1.3);
  if (o.mid) o.mid();
  hills(860, mix('#78b35e', '#142c24', D), 30, 4.2);
  if (o.front) o.front();
  // stage floor slot (sticks come up from below)
  paper((c) => pRect(c, -100, 930, W + 200, 200), mix('#7d5233', '#1c120e', D), { d: 2, tex: 0.9 });
  line([[-100, 940], [W + 100, 940]], 'rgba(0,0,0,0.35)', 6);
  // proscenium
  const red = mix('#b8342e', '#3a0f1a', D), redDk = mix('#8a2420', '#240910', D), gold = mix('#e0b44c', '#7a6430', D);
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 0 : W;
    paper((c) => { c.moveTo(x0, -20); c.lineTo(x0 - sd * 230, -20); c.quadraticCurveTo(x0 - sd * 150, 500, x0 - sd * 200, 1100); c.lineTo(x0, 1100); c.closePath(); }, red, { d: 2.4, tex: 0.8 });
    for (let k = 1; k < 4; k++) line([[x0 - sd * (40 + k * 45), -20], [x0 - sd * (30 + k * 40), 1100]], redDk, 5);
  }
  paper((c) => { c.moveTo(-20, -20); c.lineTo(W + 20, -20); c.lineTo(W + 20, 110); for (let k = 12; k >= 0; k--) c.quadraticCurveTo(((k + 0.5) / 12) * W, 190, (k / 12) * W, 110); c.closePath(); }, red, { d: 2.6, tex: 0.8 });
  paper((c) => pRect(c, -20, -20, W + 40, 34), gold, { d: 1.4, tex: 0.6 });
  for (let k = 0; k < 12; k++) splitPin(((k + 0.5) / 12) * W, 150, 8);
}
