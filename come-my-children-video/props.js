'use strict';
// Glass props: throne, Hybernian banner, circlet, hourglass, orb/globe, map of kingdoms,
// vials, crown, simple hands, flames.

const GOLD = '#ffc63a', GOLD2 = '#e89a1c', GOLDDK = '#a8641a', STONE = '#5a6070', STONE2 = '#454b5a';

// ---------- the empty throne (seat front at y = 0, back rising to ≈ -720) ----------
function drawThrone(x, y, s, o = {}) {
  push(x, y, 0, s);
  scaled(s, () => {
    // dais steps
    region('thr.step2', () => ({ out: [[-300, 230], [300, 230], [300, 290], [-300, 290]], poly: true }), [STONE2], { lw: 6 });
    region('thr.step1', () => ({ out: [[-240, 180], [240, 180], [240, 232], [-240, 232]], poly: true }), [STONE], { lw: 6 });
    // back with a pointed arch; crimson upholstery panel inside
    region('thr.back', () => ({
      out: [[-140, -40, 1], [-140, -500], [-120, -600], [-70, -680], [0, -730, 1], [70, -680], [120, -600], [140, -500], [140, -40, 1]],
      panels: [{ pts: [[-100, -60, 1], [-100, -480], [-82, -560], [-44, -622], [0, -656, 1], [44, -622], [82, -560], [100, -480], [100, -60, 1]], ci: 1 }],
      cuts: [[[-100, -60], [-100, -480], [-82, -560], [-44, -622], [0, -656], [44, -622], [82, -560], [100, -480], [100, -60]]],
      mattes: [{ pts: [[-120, -60], [-120, -480]], w: 24, a: 0.3 }],
    }), [GOLD2, o.cushion || '#a8101c'], { lw: 6 });
    // a gold quatrefoil set in the upholstery
    region('thr.quat', () => {
      const pts = [];
      for (let i = 0; i < 64; i++) { const a = (i / 64) * TAU, r = 58 + 18 * Math.cos(a * 4); pts.push([Math.cos(a) * r, -360 + Math.sin(a) * r]); }
      return { out: pts, poly: true, panels: [{ pts: arcPts(0, -360, 30, 30, 0, TAU, 16).slice(0, -1), poly: true, ci: 1 }], cuts: [arcPts(0, -360, 30, 30, 0, TAU, 16)] };
    }, [GOLD, o.gem || '#2a46c8'], { lw: 5 });
    // pinnacles
    for (const sx of [-1, 1]) region('thr.pin' + sx, () => ({ out: [[sx * 130, -470, 1], [sx * 170, -470, 1], [sx * 166, -560], [sx * 150, -650, 1], [sx * 134, -560]] }), [GOLD], { lw: 5 });
    region('thr.fin', () => ({ out: [[-16, -720, 1], [16, -720, 1], [12, -780], [0, -820, 1], [-12, -780]] }), [GOLD], { lw: 5 });
    // arms and seat
    for (const sx of [-1, 1]) {
      region('thr.armpost' + sx, () => ({ out: [[sx * 150, -200, 1], [sx * 196, -200, 1], [sx * 190, 180, 1], [sx * 156, 180, 1]], poly: true, mattes: [{ pts: [[sx * 160, -190], [sx * 162, 170]], w: 14, a: 0.3 }] }), [GOLD2], { lw: 5 });
      region('thr.arm' + sx, () => ({ out: [[sx * 120, -230, 1], [sx * 200, -236], [sx * 226, -214], [sx * 214, -190], [sx * 120, -194, 1]] }), [GOLD], { lw: 5 });
    }
    region('thr.cushion', () => ({ out: [[-160, -70], [160, -70], [168, -20], [160, 0], [-160, 0], [-168, -20]], mattes: [{ pts: [[-150, -10], [150, -10]], w: 16, a: 0.3 }] }), [o.cushion || '#a8101c'], { lw: 6 });
    region('thr.front', () => ({
      out: [[-160, 0, 1], [160, 0, 1], [150, 180, 1], [-150, 180, 1]], poly: true,
      panels: [{ pts: [[-120, 30], [120, 30], [120, 150], [-120, 150]], poly: true, ci: 1 }],
      cuts: [[[-120, 30], [120, 30]], [[120, 30], [120, 150]], [[120, 150], [-120, 150]], [[-120, 150], [-120, 30]]],
    }), [GOLD2, '#3a1a4a'], { lw: 6 });
    if (o.circlet !== false) drawCirclet(o.cx ?? 30, o.cy ?? -86, 1, o.circletRot || 0);
  });
  pop();
}
function drawCirclet(x, y, s = 1, rot = 0) {
  push(x, y, rot, s);
  region('circlet.back', () => ({ out: [[-70, 0], [-60, -16], [0, -24], [60, -16], [70, 0], [56, -4], [0, -10], [-56, -4]] }), [GOLD2], { lw: 4, glow: 0.2, glowR: 40 });
  glassSet('circlet.pts', () => [-48, -16, 16, 48].map((px, i) => [[px - 10, -6], [px + 10, -6], [px, -30 - (i === 1 || i === 2 ? 8 : 0)]]), [GOLD], { lw: 3.5 });
  region('circlet.front', () => ({ out: [[-72, 0], [-58, 14], [0, 22], [58, 14], [72, 0], [56, 2], [0, 8], [-56, 2]] }), [GOLD], { lw: 4, glow: 0.3, glowR: 40 });
  glassSet('circlet.gem', () => [arcPts(0, 14, 7, 7, 0, TAU, 10).slice(0, -1)], ['#ff1a24'], { lw: 3, glow: 0.8, glowR: 10 });
  pop();
}

// ---------- the Hybernian banner: a white eagle over three gold towers on crimson ----------
function drawBanner(x, y, s, o = {}) {
  const sway = Math.sin((E.T + (o.ph || 0)) * 1.1) * (o.sway ?? 4);
  push(x, y, 0, s);
  scaled(s, () => {
    // pole
    region('ban.pole', () => ({ out: [[-140, -16], [140, -16], [150, 0], [140, 16], [-140, 16], [-150, 0]] }), [GOLDDK], { lw: 5 });
    push(0, 14);
    ctx.transform(1, 0, sway * 0.004, 1, 0, 0);
    const torn = o.torn || 0;
    region('ban.cloth' + (torn > 0.5 ? 't' : ''), () => ({
      out: torn > 0.5 ? [[-120, 0, 1], [120, 0, 1], [124, 300], [96, 380], [118, 470, 1], [40, 420], [0, 500, 1], [-30, 410], [-86, 470, 1], [-100, 380], [-124, 300]]
        : [[-120, 0, 1], [120, 0, 1], [124, 300], [120, 560, 1], [0, 470, 1], [-120, 560, 1], [-124, 300]],
      cuts: [[[-60, 0], [-58, 500]], [[60, 0], [58, 500]]],
      panels: [{ pts: [[-60, -10], [-58, 600], [60, 600], [58, -10]], poly: true, ci: 1 }],
      mattes: [{ pts: [[-90, 10], [-96, 400]], w: 30, a: 0.3 }, { pts: [[80, 10], [86, 400]], w: 20, a: 0.2 }],
    }), [o.col || '#9a0e1a', o.col2 || '#b8141f'], { lw: 6 });
    const em = o.emblem || 'crest';
    if (em === 'crest') drawCrest(0, 250, 0.82, o);
    else if (em === 'star') glassSet('emb.star', () => [Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + (k / 10) * TAU, r = k % 2 ? 40 : 96; return [Math.cos(a) * r, 240 + Math.sin(a) * r]; })], [GOLD], { lw: 5 });
    else if (em === 'sun') { glassSet('emb.sun', () => [arcPts(0, 240, 54, 54, 0, TAU, 20).slice(0, -1), ...Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * TAU; return [[Math.cos(a - 0.18) * 64, 240 + Math.sin(a - 0.18) * 64], [Math.cos(a) * 110, 240 + Math.sin(a) * 110], [Math.cos(a + 0.18) * 64, 240 + Math.sin(a + 0.18) * 64]]; })], [GOLD, '#ffe070'], { lw: 4.5 }); }
    else if (em === 'moon') glassSet('emb.moon', () => [[[30, 150], [-40, 180], [-70, 240], [-40, 300], [30, 330], [-10, 290], [-24, 240], [-10, 190]]], ['#f4f6fa'], { lw: 5 });
    else if (em === 'tree') glassSet('emb.tree', () => [[[-14, 340], [14, 340], [14, 260], [-14, 260]], [[0, 140], [80, 210], [50, 220], [90, 270], [-90, 270], [-50, 220], [-80, 210]]], ['#8a5a2a', '#f4f6fa'], { lw: 5 });
    pop();
  });
  pop();
}
function drawCrest(x, y, s, o = {}) {
  push(x, y, 0, s);
  // three towers
  for (const [tx, th] of [[-62, 120], [0, 160], [62, 120]]) {
    region('crest.tower' + th + (tx < 0 ? 'l' : tx > 0 ? 'r' : 'c'), () => {
      const w = 26, top = 180 - th;
      return {
        out: [[tx - w, 200, 1], [tx - w, top, 1], [tx - w - 6, top, 1], [tx - w - 6, top - 22, 1], [tx - w + 8, top - 22, 1], [tx - w + 8, top - 10, 1], [tx - 6, top - 10, 1], [tx - 6, top - 22, 1], [tx + 6, top - 22, 1], [tx + 6, top - 10, 1], [tx + w - 8, top - 10, 1], [tx + w - 8, top - 22, 1], [tx + w + 6, top - 22, 1], [tx + w + 6, top, 1], [tx + w, top, 1], [tx + w, 200, 1]],
        poly: true,
        brushes: [{ pts: [[tx, top + 30], [tx, top + 56]], w: 7, a: 1, b: 1 }, { pts: [[tx - 8, 200], [tx - 8, 176], [tx, 168], [tx + 8, 176], [tx + 8, 200]], w: 4 }],
      };
    }, [o.towerCol || GOLD], { lw: 4.5 });
  }
  // displayed eagle
  const wing = (sx) => [0, 1, 2, 3].map((k) => {
    const a = -0.15 - k * 0.38, L = 118 - k * 10;
    const bx = sx * (18 + k * 4), by = -24 + k * 10;
    const tip = [bx + sx * Math.cos(a) * L, by + Math.sin(a) * L * 1.1];
    return tongue([bx, by - 9], [bx, by + 9], tip, sx * 0.08, sx * 0.08);
  });
  glassSet('crest.wingL', () => wing(-1), [o.eagle || '#f4f6fa', '#dfe4ec'], { lw: 4 });
  glassSet('crest.wingR', () => wing(1), [o.eagle || '#f4f6fa', '#dfe4ec'], { lw: 4 });
  glassSet('crest.tail', () => [-1, 0, 1].map((k) => tongue([k * 8 - 8, 40], [k * 8 + 8, 40], [k * 22, 88], 0)), [o.eagle || '#f4f6fa'], { lw: 4 });
  region('crest.body', () => ({ out: [[0, -44], [20, -30], [24, 6], [14, 44], [0, 52], [-14, 44], [-24, 6], [-20, -30]], mattes: [{ pts: [[-10, -20], [-12, 30]], w: 10, a: 0.2 }] }), [o.eagle || '#f4f6fa'], { lw: 4.5 });
  region('crest.head', () => ({ out: [[-4, -48], [12, -62], [24, -60], [40, -54, 1], [26, -46], [16, -40], [2, -38]], brushes: [{ pts: [[16, -56], [18, -55]], w: 4, a: 1, b: 1 }] }), [o.eagle || '#f4f6fa'], { lw: 4 });
  glassSet('crest.beak', () => [[[38, -56], [52, -50], [36, -46]]], [GOLD], { lw: 3 });
  pop();
}

// ---------- hourglass ----------
function drawHourglass(x, y, s, u, o = {}) {
  // u: 0 = full top, 1 = run out
  push(x, y, o.rot || 0, s);
  scaled(s, () => {
    const bulb = (sy) => [[-70, sy * 150, 1], [70, sy * 150, 1], [62, sy * 90], [30, sy * 40], [8, sy * 8, 1], [-8, sy * 8, 1], [-30, sy * 40], [-62, sy * 90]];
    region('hg.top', () => ({ out: bulb(-1) }), ['#cfe6f2'], { lw: 5, lk: 0.9 });
    region('hg.bot', () => ({ out: bulb(1) }), ['#cfe6f2'], { lw: 5, lk: 0.9 });
    // sand
    const topH = (1 - u) * 110, botH = u * 100;
    if (topH > 2) {
      ctx.save(); ctx.clip(spath(bulb(-1)));
      glassPiece(polyPath([[-80, -10 - topH], [80, -10 - topH], [80, 0], [-80, 0]]), '#ffb030', { cx: 0, cy: -20, r: 60, seed: 7 });
      ctx.restore();
    }
    if (botH > 2) {
      ctx.save(); ctx.clip(spath(bulb(1)));
      glassPiece(polyPath([[-90, 150], [90, 150], [40, 150 - botH], [0, 150 - botH * 1.25], [-40, 150 - botH]]), '#ffb030', { cx: 0, cy: 130, r: 60, seed: 8 });
      ctx.restore();
    }
    if (u > 0 && u < 1) { ctx.fillStyle = 'rgba(255,190,70,0.9)'; ctx.fillRect(-2.5, -6, 5, 150 - botH * 1.2); }
    // frame
    for (const sy of [-1, 1]) region('hg.plate' + sy, () => ({ out: [[-96, sy * 150], [96, sy * 150], [96, sy * 176], [-96, sy * 176]], poly: true }), [GOLDDK], { lw: 5 });
    for (const sx of [-1, 1]) region('hg.post' + sx, () => ({ out: [[sx * 82, -150], [sx * 92, -150], [sx * 92, 150], [sx * 82, 150]], poly: true }), [GOLD2], { lw: 4 });
  });
  pop();
}

// ---------- orb / globe of tomorrow ----------
function drawOrb(x, y, r, o = {}) {
  push(x, y, o.rot || 0);
  const key = 'orb' + (o.key || '');
  const t = tessRadial(key, 0, 0, r * 0.34, r, 2, 9, { rot: 0.2 });
  const core = arcPts(0, 0, r * 0.34, r * 0.34, 0, TAU, 20).slice(0, -1);
  glassField(t, (cx, cy, c) => {
    const k = c.rr / r;
    if (o.cols) return o.cols(c, k);
    return (c.seed % 3 === 0) ? lerpRGB('#ffd86a', '#ff9a3a', k) : (c.seed % 3 === 1) ? lerpRGB('#ffc04a', '#ff7a2a', k) : lerpRGB('#ffe8a0', '#ffb04a', k);
  }, { leadW: o.leadW || 5 });
  region(key + '.core', () => ({ out: core, poly: true }), [o.coreCol || '#fff6d0'], { lw: o.leadW || 5, glow: 1, glowR: r * 0.5 });
  if (o.glow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.2);
    g.addColorStop(0, `rgba(255,220,150,${0.45 * o.glow})`); g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const ring = new Path2D(); ring.arc(0, 0, r, 0, TAU); lead(ring, (o.leadW || 5) * 1.5);
  pop();
}

// ---------- the map of kingdoms ----------
// Land is a set of smooth coastlines; kingdoms are Voronoi cells clipped to the land.
const MAP_LANDS = [
  [[180, 260], [340, 170], [560, 150], [760, 200], [900, 150], [1080, 180], [1220, 260], [1260, 400], [1180, 520], [1240, 640], [1140, 780], [960, 840], [780, 800], [640, 880], [460, 860], [300, 760], [220, 620], [140, 480]],
  [[1340, 300], [1500, 240], [1680, 290], [1760, 420], [1720, 600], [1600, 720], [1440, 700], [1360, 560], [1300, 420]],
  [[1420, 820], [1560, 780], [1680, 840], [1640, 940], [1500, 960], [1400, 900]],
];
const KINGDOM_COLS = ['#c89a3a', '#6a8a3a', '#8a4a6a', '#a8642a', '#4a7a8a', '#9a8a4a', '#7a5a9a', '#b07a4a', '#5a8a5a', '#a04a3a', '#8a7a5a', '#6a6aa0'];
function mapGeo() {
  let g = _tessCache.get('mapgeo');
  if (g) return g;
  const t = tess('mapk', 0, 0, W, H, 210, { seed: 1234, jit: 0.9 });
  const land = new Path2D();
  MAP_LANDS.forEach((L) => land.addPath(spath(L, true)));
  const probe = makeCanvas(4, 4).getContext('2d');
  for (const c of t.cells) {
    let inside = 0, n = 0;
    for (const p of c.pts.concat([[c.cx, c.cy]])) { n++; if (probe.isPointInPath(land, p[0], p[1])) inside++; }
    c.land = inside / n;
  }
  g = { cells: t.cells.filter((c) => c.land > 0), lead: t.lead, land };
  _tessCache.set('mapgeo', g);
  return g;
}
// o.bleed(cell) → 0..1 blood has taken this kingdom; o.borderBlood 0..1; o.split(cell) → [dx, dy, rot]
function drawMap(t, o = {}) {
  const g = mapGeo();
  if (o.sea !== false) quarries('sea', 0, 0, W, H, 70, (x, y, c) => (hash(c.seed) < 0.2 ? '#1a3a8a' : '#14307a'), { leadW: 3 });
  const colOf = (c) => {
    let col = KINGDOM_COLS[(c.seed >> 3) % KINGDOM_COLS.length];
    const b = o.bleed ? o.bleed(c) : 0;
    if (b > 0) col = lerpRGB(col, '#a00c18', b);
    if (o.tint) col = o.tint(c, col);
    return col;
  };
  if (o.split) {
    for (const c of g.cells) {
      const [dx, dy, rot] = o.split(c);
      ctx.save();
      ctx.translate(c.cx + dx, c.cy + dy); ctx.rotate(rot); ctx.translate(-c.cx, -c.cy);
      ctx.save(); ctx.clip(c.path); ctx.clip(g.land);
      glassPiece(c.path, colOf(c), { cx: c.cx, cy: c.cy, r: c.r, seed: c.seed });
      lead(c.path, 6); lead(g.land, 9);
      ctx.restore();
      ctx.restore();
    }
    return;
  }
  ctx.save();
  ctx.clip(g.land);
  for (const c of g.cells) glassPiece(c.path, colOf(c), { cx: c.cx, cy: c.cy, r: c.r, seed: c.seed });
  lead(g.lead, 6);
  if (o.borderBlood > 0) {
    // blood runs along the borders outward from a source
    ctx.save();
    if (o.bloodFrom) { const [bx, by, br] = o.bloodFrom; const cp = new Path2D(); cp.arc(bx, by, br, 0, TAU); ctx.clip(cp); }
    bloodLead(g.lead, 7, o.borderBlood);
    ctx.restore();
  }
  ctx.restore();
  lead(g.land, 9);
}

// ---------- simple glass hands (a reaching crowd) ----------
function smallHand(x, y, s, rot, kind = 'reach', skin = '#f0d8c4') {
  push(x, y, rot, s);
  scaled(s, () => {
    region('sh.sleeve', () => ({ out: [[-30, 60], [30, 60], [36, 260], [-36, 260]], poly: true }), ['#4a3a5a'], { lw: 5 });
    push(0, 60, Math.PI);
    unionPiece('sh.hand.' + kind, () => handDef(kind), skin, { lw: 3.6 });
    pop();
  });
  pop();
}

// ---------- vials of Shaikan blood ----------
function drawVial(x, y, s, fill = 0.8, o = {}) {
  push(x, y, o.rot || 0, s);
  scaled(s, () => {
    const body = [[-26, -60], [-26, 60], [-20, 80], [0, 86], [20, 80], [26, 60], [26, -60]];
    region('vial.glass', () => ({ out: [[-26, -70, 1], [26, -70, 1], [26, 60], [20, 80], [0, 86], [-20, 80], [-26, 60]] }), ['#d8e8f0'], { lw: 4.5, lk: 0.8 });
    const top = lerp(80, -60, fill);
    ctx.save(); ctx.clip(spath([[-26, -70, 1], [26, -70, 1], [26, 60], [20, 80], [0, 86], [-20, 80], [-26, 60]]));
    glassPiece(polyPath([[-40, top], [40, top + Math.sin(E.T * 3) * 3], [40, 100], [-40, 100]]), '#d01020', { cx: 0, cy: (top + 86) / 2, r: 40, seed: 3, glow: o.glow ?? 0.6, glowR: 50 });
    ctx.restore();
    region('vial.neck', () => ({ out: [[-14, -100, 1], [14, -100, 1], [14, -70, 1], [-14, -70, 1]], poly: true }), ['#d8e8f0'], { lw: 4 });
    region('vial.cork', () => ({ out: [[-17, -124, 1], [17, -124, 1], [15, -98, 1], [-15, -98, 1]], poly: true }), ['#7a4a2a'], { lw: 4 });
    void body;
  });
  pop();
}

// ---------- crown ----------
function drawCrown(x, y, s, o = {}) {
  push(x, y, o.rot || 0, s);
  scaled(s, () => {
    region('crown.band', () => ({ out: [[-110, 0, 1], [110, 0, 1], [104, 60, 1], [-104, 60, 1]], poly: true, panels: [{ pts: [[-120, 18], [120, 18], [120, 42], [-120, 42]], poly: true, ci: 1 }], cuts: [[[-120, 18], [120, 18]], [[-120, 42], [120, 42]]] }), [o.col || GOLD, GOLD2], { lw: 5, glow: o.glow || 0, glowR: 120 });
    glassSet('crown.pts', () => [-80, -40, 0, 40, 80].map((px, i) => [[px - 22, 2], [px + 22, 2], [px + 4, -60 - (i === 2 ? 30 : i % 2 ? 0 : 14)], [px, -76 - (i === 2 ? 30 : i % 2 ? 0 : 14)], [px - 4, -60 - (i === 2 ? 30 : i % 2 ? 0 : 14)]]), [o.col || GOLD], { lw: 4.5 });
    glassSet('crown.gems', () => [-70, 0, 70].map((px) => arcPts(px, 30, 13, 11, 0, TAU, 12).slice(0, -1)), ['#c8101c', '#2a46c8', '#c8101c'], { lw: 3.5, glow: 0.6, glowR: 14 });
  });
  pop();
}

// ---------- flame tongues (fire in glass) ----------
function flames(key, x0, x1, y, h, n, t, o = {}) {
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = lerp(x0, x1, u), ph = hash(i * 7 + 3) * TAU;
    const hh = h * (0.55 + 0.45 * hash(i * 3 + 1)) * (0.85 + 0.15 * Math.sin(t * 6 + ph));
    const w = ((x1 - x0) / n) * 1.6, lean = Math.sin(t * 3 + ph) * w * 0.3;
    const pts = tongue([x - w / 2, y], [x + w / 2, y], [x + lean, y - hh], 0.12 * Math.sin(t * 2 + ph), -0.1 * Math.sin(t * 2.3 + ph));
    const col = i % 3 === 0 ? '#ffd040' : i % 3 === 1 ? '#ff8a1a' : '#ff4a10';
    const p = spath(pts);
    glassPiece(p, col, { cx: x, cy: y - hh * 0.35, r: w * 0.6, seed: i * 13, glow: o.glow ?? 0.5, glowR: hh * 0.5 });
    lead(p, o.lw || 4);
  }
}

// ---------- a sword (point down at +y): blade, crossguard, grip, pommel ----------
function drawSword(x, y, s, o = {}) {
  push(x, y, o.rot || 0, s);
  scaled(s, () => {
    const brk = o.brk || 0, gap = brk * 60;
    // lower blade (from the break to the point)
    push(brk * 30, gap, brk * 0.5);
    region('sw.bladeLo' + (o.broken ? 'b' : ''), () => ({ out: o.broken ? [[-22, 300, 1], [-6, 290, 1], [8, 306, 1], [22, 296, 1], [22, 640], [0, 720, 1], [-22, 640]] : [[-22, 300], [22, 300], [22, 640], [0, 720, 1], [-22, 640]], cuts: [[[0, 300], [0, 712]]], panels: [{ pts: [[0, 280], [0, 740], [40, 740], [40, 280]], poly: true, ci: 1 }] }), ['#d8e0ea', '#a8b4c4'], { lw: 4.5 });
    pop();
    push(-brk * 20, -gap * 0.2, -brk * 0.25);
    region('sw.bladeHi' + (o.broken ? 'b' : ''), () => ({ out: o.broken ? [[-22, 40, 1], [22, 40, 1], [22, 296, 1], [8, 306, 1], [-6, 290, 1], [-22, 300, 1]] : [[-22, 40, 1], [22, 40, 1], [22, 300], [-22, 300]], cuts: [[[0, 40], [0, 300]]], panels: [{ pts: [[0, 20], [0, 320], [40, 320], [40, 20]], poly: true, ci: 1 }] }), ['#d8e0ea', '#a8b4c4'], { lw: 4.5 });
    region('sw.guard', () => ({ out: [[-120, 18], [-100, 0], [100, 0], [120, 18], [100, 40], [-100, 40]] }), [GOLD], { lw: 5 });
    region('sw.grip', () => ({ out: [[-14, -120, 1], [14, -120, 1], [14, 0, 1], [-14, 0, 1]], poly: true, brushes: [-100, -76, -52, -28].map((yy) => ({ pts: [[-13, yy], [13, yy - 8]], w: 3 })) }), ['#3a2418'], { lw: 4.5 });
    region('sw.pommel', () => ({ out: arcPts(0, -146, 28, 28, 0, TAU, 18).slice(0, -1) }), [GOLD], { lw: 5 });
    region('sw.pgem', () => ({ out: arcPts(0, -146, 13, 13, 0, TAU, 14).slice(0, -1) }), ['#ff1a24'], { lw: 3.5, glow: 0.7, glowR: 16 });
    pop();
  });
  pop();
}

// ---------- a great door in a pointed arch; open: 0 shut … 1 wide ----------
function drawDoor(x, y, s, open, o = {}) {
  push(x, y, 0, s);
  scaled(s, () => {
    const w = 520, h = 900, arch = archPts(-w / 2, 0, w, h, 16);
    const ap = polyPath(arch);
    // what lies beyond: light (or darkness)
    ctx.save(); ctx.clip(ap);
    const g = ctx.createRadialGradient(0, -h * 0.4, 20, 0, -h * 0.4, h);
    if (o.dark) { g.addColorStop(0, '#2a0a10'); g.addColorStop(1, '#050205'); }
    else { g.addColorStop(0, '#fffbe8'); g.addColorStop(0.5, '#ffd27a'); g.addColorStop(1, '#ff9a3a'); }
    ctx.fillStyle = g; ctx.fillRect(-w, -h - 20, w * 2, h + 40);
    if (o.beyond) o.beyond(w, h);
    // two leaves swinging open, foreshortened toward their hinges at the jambs
    for (const sx of [-1, 1]) {
      const k = 1 - open * 0.86;
      push(sx * w / 2, 0, 0, k, 1);
      region('door.leaf' + sx, () => {
        const pts = archPts(-w / 2, 0, w, h, 16).filter((p) => (sx < 0 ? p[0] <= 0.5 : p[0] >= -0.5));
        const leaf = (sx < 0 ? pts.concat([[0, 0]]) : [[0, 0]].concat(pts)).map((p) => [p[0] - sx * w / 2, p[1]]);
        return {
          out: leaf, poly: true,
          cuts: [1, 2, 3].map((q) => [[-sx * w * q / 8, 20], [-sx * w * q / 8, -h]]),
          panels: [{ pts: [[-sx * w / 8, 20], [-sx * w / 8, -h], [-sx * w / 4, -h], [-sx * w / 4, 20]], poly: true, ci: 1 }, { pts: [[-sx * w * 3 / 8, 20], [-sx * w * 3 / 8, -h], [-sx * w / 2, -h], [-sx * w / 2, 20]], poly: true, ci: 1 }],
          mattes: [{ pts: [[-sx * 30, 0], [-sx * 30, -h * 0.8]], w: 40, a: 0.3 }],
        };
      }, ['#6a3a1a', '#7e4a24'], { lw: 6, lk: o.dark ? 0.4 : 0.7 });
      for (const hy of [-180, -560]) region('door.hinge' + sx + hy, () => ({ out: [[0, hy - 12], [-sx * (w / 2 - 40), hy - 12], [-sx * (w / 2 - 24), hy], [-sx * (w / 2 - 40), hy + 12], [0, hy + 12]], poly: true }), ['#2a2a32'], { lw: 4 });
      pop();
    }
    ctx.restore();
    tracery(ap, 46, { color: '#2a2733' });
  });
  pop();
}

// ---------- a glass heart ----------
const HEART = [[0, 46, 1], [-34, 14], [-52, -16], [-46, -42], [-24, -52], [0, -34, 1], [24, -52], [46, -42], [52, -16], [34, 14]];
function drawHeart(x, y, s, beat = 0, o = {}) {
  const sc = s * (1 + beat * 0.12);
  push(x, y, o.rot || 0, sc);
  scaled(sc, () => {
    region('heart', () => ({ out: HEART, cuts: [[[0, -34], [-6, 0], [0, 44]]], panels: [{ pts: [[0, -60], [-6, 0], [0, 60], [80, 60], [80, -60]], poly: true, ci: 1 }], mattes: [{ pts: [[-40, -10], [-20, 20]], w: 14, a: 0.25 }] }),
      [o.col || '#c8101c', o.col2 || '#e0202c'], { lw: 5, glow: 0.4 + beat * 0.6, glowR: 50, keep: true });
    if (o.crack) drawCracks(crackPaths(0, 0, 60, 7, o.crack), 2.5);
  });
  pop();
}

// ---------- an oath on a scroll, sealed in red wax ----------
function drawScroll(x, y, s, o = {}) {
  push(x, y, o.rot || 0, s);
  scaled(s, () => {
    const crack = o.crack || 0, split = o.split || 0;
    for (const side of [-1, 1]) {
      push(side * split * 120, split * split * 400, side * split * 0.4);
      ctx.save();
      const half = new Path2D(); half.rect(side < 0 ? -400 : 0, -400, 400, 800);
      if (split > 0) ctx.clip(half);
      region('scroll.sheet', () => ({ out: [[-260, -300], [260, -300], [270, 300], [-270, 300]], poly: true }), ['#efe2c0'], { lw: 6 });
      ctx.save();
      for (let i = 0; i < 9; i++) brush([[-200, -230 + i * 50], [-40 + hash(i) * 120, -232 + i * 50], [200 - hash(i + 3) * 60, -228 + i * 50]], 4, { c: 'rgba(60,34,20,0.55)', a: 0.3, b: 0.2 });
      ctx.restore();
      for (const ry of [-300, 300]) region('scroll.roll' + ry, () => ({ out: [[-290, ry - 26], [290, ry - 26], [306, ry], [290, ry + 26], [-290, ry + 26], [-306, ry]], mattes: [{ pts: [[-280, ry + 12], [280, ry + 12]], w: 14, a: 0.3 }] }), ['#d8c49a'], { lw: 6 });
      region('scroll.seal', () => ({ out: [[0, 190], [36, 202], [50, 236], [36, 270], [0, 282], [-36, 270], [-50, 236], [-36, 202]], brushes: [{ pts: [[-16, 236], [0, 220], [16, 236], [0, 252], [-16, 236]], w: 4 }] }), ['#a80c18'], { lw: 5 });
      ctx.restore();
      pop();
    }
    if (crack > 0 && split === 0) drawCracks(crackPaths(0, -20, 300, 21, crack), 4);
  });
  pop();
}

// ---------- clouds (for heavens and storms) ----------
function cloudBand(key, x0, x1, y, h, n, cols, o = {}) {
  glassSet('cloud_' + key, () => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const cx = lerp(x0, x1, (i + 0.5) / n) + (hash(i * 3 + 1) - 0.5) * 60, r = h * (0.5 + hash(i * 5 + 2) * 0.5), cy = y + (hash(i * 7) - 0.5) * h * 0.4;
      const pts = [];
      for (let k = 0; k < 18; k++) { const a = (k / 18) * TAU, rr = r * (1 + 0.18 * Math.sin(a * 5 + i)); pts.push([cx + Math.cos(a) * rr * 1.35, cy + Math.sin(a) * rr * 0.7]); }
      out.push({ pts, ci: i });
    }
    return out;
  }, (i) => cols[i % cols.length], { lw: o.lw || 5 });
}

// ---------- the golden capital: a skyline of spires ----------
function cityGeo(key, x0, x1, yb, o = {}) {
  let g = _tessCache.get('city_' + key);
  if (g) return g;
  const r = rng(o.seed || 17), walls = [], roofs = [], wins = [];
  let x = x0;
  while (x < x1) {
    const w = 60 + r() * 90, h = (o.hmin || 140) + r() * (o.hvar || 300), type = r();
    const center = Math.abs(x + w / 2 - (x0 + x1) / 2) < 120;
    const hh = center ? h * 1.6 : h, ww = center ? w * 1.4 : w;
    walls.push([[x, yb], [x + ww, yb], [x + ww, yb - hh], [x, yb - hh]]);
    if (type < 0.55 || center) roofs.push([[x - 6, yb - hh], [x + ww + 6, yb - hh], [x + ww / 2, yb - hh - ww * (center ? 2.2 : 1.3)]]);
    else if (type < 0.8) roofs.push([[x - 4, yb - hh], [x + ww + 4, yb - hh], [x + ww * 0.75, yb - hh - ww * 0.45], [x + ww * 0.25, yb - hh - ww * 0.45]]);
    else roofs.push([[x - 4, yb - hh], [x + ww + 4, yb - hh], [x + ww + 4, yb - hh - 20], [x - 4, yb - hh - 20]]);
    for (let wy = yb - hh + 30; wy < yb - 40; wy += 46) for (let wx = x + 14; wx < x + ww - 18; wx += 28) if (r() < 0.55) wins.push([wx, wy, r()]);
    x += ww + 4 + r() * 10;
  }
  const mk = (polys) => makeCells(polys);
  g = { walls: mk(walls), roofs: mk(roofs), wins };
  g.wallLead = leadPathOf(g.walls); g.roofLead = leadPathOf(g.roofs);
  _tessCache.set('city_' + key, g);
  return g;
}
function drawCity(key, x0, x1, yb, o = {}) {
  const g = cityGeo(key, x0, x1, yb, o);
  const wc = o.wall || ['#ffcc50', '#f0b040', '#ffd870'], rc = o.roof || ['#c8501c', '#e08a2a', '#a83a18'];
  g.walls.forEach((c, i) => glassPiece(c.path, _bloodCol(wc[i % wc.length], {}), { cx: c.cx, cy: c.cy, r: c.r, seed: c.seed, lk: o.lk }));
  g.roofs.forEach((c, i) => glassPiece(c.path, _bloodCol(rc[i % rc.length], {}), { cx: c.cx, cy: c.cy, r: c.r, seed: c.seed + 5, lk: o.lk }));
  ctx.save();
  for (const [wx, wy, v] of g.wins) {
    const lit = o.lit != null ? o.lit(wx, wy, v) : v < 0.5;
    ctx.fillStyle = lit ? (o.winCol || 'rgba(255,250,210,0.95)') : 'rgba(30,16,10,0.85)';
    ctx.beginPath(); ctx.moveTo(wx, wy + 22); ctx.lineTo(wx, wy + 6); ctx.quadraticCurveTo(wx + 6, wy - 4, wx + 12, wy + 6); ctx.lineTo(wx + 12, wy + 22); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  lead(g.wallLead, o.lw || 5); lead(g.roofLead, o.lw || 5);
}

// ---------- a giant hand reaching down from above ----------
// elbow at (x, y); the forearm hangs down and the hand points down, palm out
function bigHand(x, y, s, kind, rot = 0, o = {}) {
  push(x, y, rot, s);
  scaled(s, () => {
    if (o.blood) { const pb = E.blood; E.blood = o.blood; mcForearm(); push(0, MC_FA + 2, o.wr || 0); mcHand(kind); pop(); E.blood = pb; }
    else { mcForearm(); push(0, MC_FA + 2, o.wr || 0); mcHand(kind); pop(); }
  });
  pop();
}
