// Necromantical — map definitions and map-scene helpers (paths, camera, lantern).
'use strict';
(function () {
  const { clamp, lerp, W, H, TAU, rng } = NM;
  const T = 16;

  // ---------- movement along timed waypoints ----------
  // keys: [[t, x, y, dirOverride?], ...]  -> { x, y, dir, frame, moving }
  NM.walk = function (t, keys, stride = 7) {
    let i = 0;
    while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    let k = b[0] > a[0] ? clamp((t - a[0]) / (b[0] - a[0])) : 1;
    if (t < keys[0][0]) k = 0;
    const x = lerp(a[1], b[1], k), y = lerp(a[2], b[2], k);
    // distance travelled so far (for walk frames)
    let dist = 0;
    for (let j = 0; j < i; j++) dist += Math.hypot(keys[j + 1][1] - keys[j][1], keys[j + 1][2] - keys[j][2]);
    dist += Math.hypot(x - a[1], y - a[2]);
    const dx = b[1] - a[1], dy = b[2] - a[2];
    const moving = k > 0 && k < 1 && (dx || dy);
    let dir = a[3] || null;
    if (moving) dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    if (!dir) { // last movement direction
      for (let j = i; j >= 0; j--) {
        const p = keys[j], q = keys[j + 1] || keys[j];
        if (p[3] && j === i) { dir = p[3]; break; }
        const ddx = q[1] - p[1], ddy = q[2] - p[2];
        if (ddx || ddy) { dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : ddy > 0 ? 'down' : 'up'; break; }
      }
    }
    return { x, y, dir: dir || 'down', frame: moving ? NM.walkFrame(dist, stride) : 1, moving };
  };

  NM.follow = function (m, x, y, ox = 0, oy = 0) {
    return { x: Math.round(clamp(x - W / 2 + ox, 0, m.pw - W)), y: Math.round(clamp(y - H / 2 + oy, 0, m.ph - H)) };
  };

  // lantern held by a map character
  NM.lantern = function (g, st, t, lit = 1) {
    const off = { down: [7, -9], up: [-7, -10], left: [-8, -9], right: [8, -9] }[st.dir];
    const x = Math.round(st.x + off[0]), y = Math.round(st.y + off[1] + (st.frame !== 1 ? -1 : 0));
    g.fillStyle = '#b08850'; g.fillRect(x - 2, y - 4, 5, 1); g.fillRect(x - 2, y + 2, 5, 1); g.fillRect(x, y - 6, 1, 2);
    g.fillStyle = lit > 0.5 ? '#ffcf7a' : '#5a6287'; g.fillRect(x - 1, y - 3, 3, 5);
    if (lit > 0.5) { g.fillStyle = '#f2f0ea'; g.fillRect(x, y - 2, 1, 2); NM.glow(g, x, y, 22 * lit, '#ffb347', 0.4); }
    return { x, y };
  };

  // ---------- GRAVEYARD (40 x 28 tiles) ----------
  function graveyard() {
    const w = 40, h = 28;
    const R = rng(77);
    const G = [];
    for (let y = 0; y < h; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        let c = y < 3 ? 'G' : 'g';
        R();
        // main path from bottom centre up to the plaza
        if (y >= 12 && x >= 19 && x <= 20) c = 'd';
        if (y >= 9 && y <= 13 && x >= 16 && x <= 23) c = 'd';
        // side path
        if (y === 18 && x >= 6 && x <= 33) c = 'd';
        if (c === 'g' && R() < 0.06) c = 'b';
        if (c === 'g' && Math.hypot(x - 20, y - 10) < 6 && R() < 0.35) c = 'r';
        row += c;
      }
      G.push(row);
    }
    const objects = [];
    objects.push({ type: 'fence', x: 0, y: 3 * T + 4, len: 640, ysort: -40 });
    // dead trees behind the fence and at the edges
    [[30, 2.6, 11], [120, 2.8, 5], [250, 2.5, 21], [420, 2.7, 8], [560, 2.6, 31], [610, 2.9, 4], [20, 15, 12], [626, 17, 6], [40, 26, 17], [600, 26.5, 23]]
      .forEach(([x, ty, seed]) => objects.push({ type: 'tree', x, y: ty * T, seed, h: 64 + (seed % 3) * 10 }));
    // rows of graves
    const types = ['tomb', 'cross', 'gothicTomb', 'tomb', 'cross'];
    for (const ty of [6, 15, 21, 25]) {
      for (let tx = 2; tx < 38; tx += 3) {
        if (tx >= 17 && tx <= 22) continue;
        if (R() < 0.18) continue;
        objects.push({ type: types[Math.floor(R() * types.length)], x: tx * T + 8 + Math.round((R() - 0.5) * 4), y: ty * T + 12, moss: R() < 0.3 });
      }
    }
    for (const tx of [3, 6, 9, 12, 27, 30, 33, 36]) objects.push({ type: types[tx % 5], x: tx * T + 8, y: 11 * T + 12, moss: tx % 2 === 0 });
    objects.push({ type: 'angel', x: 15 * T, y: 10 * T + 8 });
    objects.push({ type: 'angel', x: 25 * T + 2, y: 10 * T + 8 });
    objects.push({ type: 'bush', x: 8 * T, y: 9 * T }); objects.push({ type: 'bush', x: 33 * T, y: 13 * T }); objects.push({ type: 'bush', x: 5 * T, y: 19.5 * T });
    const m = NM.makeMap(G, { objects });
    m.grave = { x: 20 * T, y: 10 * T + 6 }; // centre of the fresh grave mound
    return m;
  }

  // ---------- MANSION EXTERIOR (30 x 24 tiles) ----------
  function mansionExt() {
    const w = 30, h = 24;
    const R = rng(91);
    const G = [];
    for (let y = 0; y < h; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        let c;
        if (y < 3) c = 'R';
        else if (y < 10) c = 'K';
        else c = 'g';
        if (y >= 10 && x >= 14 && x <= 15) c = 'd';
        if (y >= 10 && c === 'g') { const r = R(); if (y >= 12 && r < 0.18) c = r < 0.09 ? 'r' : 'b'; }
        row += c;
      }
      G.push(row);
    }
    const objects = [];
    objects.push({ type: 'door', x: 15 * T, y: 10 * T });
    for (const tx of [3, 7, 11, 19, 23, 27]) { objects.push({ type: 'window', x: tx * T, y: 9 * T - 4, lit: tx === 23, wall: true, ysort: -200 }); objects.push({ type: 'window', x: tx * T, y: 5 * T - 2, lit: tx === 7, wall: true, ysort: -200 }); }
    objects.push({ type: 'tree', x: 2 * T, y: 22 * T, seed: 41, h: 80 });
    objects.push({ type: 'tree', x: 28 * T, y: 21 * T, seed: 12, h: 74 });
    objects.push({ type: 'bush', x: 9 * T, y: 12 * T }); objects.push({ type: 'bush', x: 21 * T, y: 12 * T });
    objects.push({ type: 'well', x: 6 * T, y: 17 * T });
    const m = NM.makeMap(G, { objects });
    m.door = { x: 15 * T, y: 10 * T };
    return m;
  }


  // ---------- buildings ----------
  const PROPS = NM.PROPS;
  PROPS.church = (g, x, y, o = {}, t = 0) => {
    x = Math.round(x); y = Math.round(y);
    const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
    // spire
    g.fillStyle = '#1d1a2e'; g.beginPath(); g.moveTo(x - 14, y - 120); g.lineTo(x, y - 190); g.lineTo(x + 14, y - 120); g.fill();
    r(-1, -200, 2, 12, '#8a93b8'); r(-5, -196, 10, 2, '#8a93b8');
    // tower
    r(-18, -124, 36, 30, '#2b2a45'); r(-18, -124, 36, 2, '#5a6287');
    r(-5, -118, 10, 14, '#07060b'); r(-4, -117, 8, 12, '#ffcf7a'); r(-1, -117, 2, 12, '#07060b');
    // nave front with gable
    g.fillStyle = '#2b2a45'; g.beginPath(); g.moveTo(x - 60, y - 70); g.lineTo(x, y - 100); g.lineTo(x + 60, y - 70); g.fill();
    r(-60, -70, 120, 70, '#3d3f63');
    for (let yy = -68; yy < 0; yy += 5) for (let xx = -60 + ((yy / 5) % 2 ? 4 : 0); xx < 60; xx += 9) r(xx, yy, 8, 1, '#2b2a45');
    r(-60, -70, 120, 2, '#8a93b8');
    // rose window
    NM.roseWindow(g, x, y - 76, 13, t, { frame: '#120f1c', lum: 0.9 });
    // door (pointed)
    g.fillStyle = '#120f1c'; g.beginPath(); NM.archPath(g, x, y, 22, 40); g.closePath(); g.fill();
    g.fillStyle = '#3a2a22'; g.beginPath(); NM.archPath(g, x, y, 18, 36); g.closePath(); g.fill();
    r(-1, -34, 2, 34, '#120f1c');
    // side lancets
    for (const dx of [-40, 40]) { g.fillStyle = '#120f1c'; g.beginPath(); NM.archPath(g, x + dx, y - 20, 12, 30); g.closePath(); g.fill(); g.fillStyle = '#433a63'; g.beginPath(); NM.archPath(g, x + dx, y - 22, 8, 25); g.closePath(); g.fill(); }
    r(-64, -2, 128, 4, '#5a6287');
  };
  PROPS.house = (g, x, y, o = {}, t = 0) => {
    x = Math.round(x); y = Math.round(y);
    const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
    const w = o.w || 70;
    g.fillStyle = '#2e2420'; g.beginPath(); g.moveTo(x - w / 2 - 6, y - 46); g.lineTo(x, y - 76); g.lineTo(x + w / 2 + 6, y - 46); g.fill();
    for (let k = 0; k < 6; k++) r(-w / 2 + k * 3, -48 - k * 4, w - k * 6, 1, '#4a3a2e');
    r(-w / 2, -48, w, 48, '#c8cfe6'); r(-w / 2, -48, w, 3, '#2e2420'); r(-w / 2, -3, w, 3, '#2e2420');
    for (const xx of [-w / 2, -w / 6, w / 6 - 3, w / 2 - 3]) r(xx, -48, 3, 48, '#2e2420');
    r(-w / 2, -26, w, 2, '#2e2420');
    // windows
    for (const xx of [-w / 3, w / 3 - 8]) { r(xx, -42, 8, 10, '#07060b'); r(xx + 1, -41, 6, 8, o.lit ? '#ffcf7a' : '#3d3f63'); r(xx + 3, -41, 1, 8, '#2e2420'); }
    r(-6, -22, 12, 22, '#3a2a22'); r(-6, -22, 12, 1, '#5c4130'); r(3, -11, 1, 1, '#e8c070');
  };
  PROPS.lamppost = (g, x, y, o = {}, t = 0) => {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = '#120f1c'; g.fillRect(x, y - 34, 2, 34); g.fillRect(x - 2, y - 2, 6, 2); g.fillRect(x - 3, y - 40, 8, 6);
    g.fillStyle = '#ffcf7a'; g.fillRect(x - 2, y - 39, 6, 4);
    NM.glow(g, x + 1, y - 37, 30, '#ffb347', 0.45);
  };

  // ---------- VILLAGE SQUARE (36 x 24 tiles) ----------
  function village() {
    const w = 36, h = 24, R = rng(5);
    const G = [];
    for (let y = 0; y < h; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        let c = y < 6 ? 'G' : 's';
        if (y >= 21) c = 'g';
        if (c === 's' && (x < 2 || x > 33)) c = 'd';
        row += c;
      }
      G.push(row);
    }
    const objects = [
      { type: 'church', x: 288, y: 8 * T },
      { type: 'house', x: 110, y: 9 * T, w: 80, lit: true },
      { type: 'house', x: 470, y: 9 * T, w: 76 },
      { type: 'well', x: 180, y: 13 * T },
      { type: 'lamppost', x: 380, y: 12 * T },
      { type: 'lamppost', x: 140, y: 17 * T },
      { type: 'tree', x: 30, y: 22 * T, seed: 33, h: 70 },
      { type: 'tree', x: 550, y: 22.5 * T, seed: 2, h: 66 },
    ];
    return NM.makeMap(G, { objects });
  }

  // ---------- MANSION HALL (40 x 14 tiles) ----------
  function hall() {
    const w = 40, h = 14;
    const G = [];
    for (let y = 0; y < h; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        let c = 'f';
        if (y === 0 || y === h - 1) c = '#';
        else if (y <= 2) c = 'W';
        else if (y === 3) c = 'V';
        else if (y >= 7 && y <= 9 && x >= 1 && x <= 38) c = 'c';
        if (x === 0 || x === w - 1) c = '#';
        row += c;
      }
      G.push(row);
    }
    const objects = [];
    for (let tx = 3; tx < 38; tx += 6) objects.push({ type: 'window', x: tx * T + 8, y: 3 * T + 4, ysort: -300 });
    const faces = [['#d9a59a', '#2a1d16', '#2e1a1e'], ['#f6d6c8', '#3a2a22', '#1c1a26'], ['#d9a59a', '#83603f', '#46262a']];
    [6, 12, 18, 24, 30, 36].forEach((tx, i) => {
      const f = faces[i % 3];
      objects.push({ type: 'painting', x: tx * T, y: 3 * T + 8, ysort: -300, face: f[0], hair: f[1], coat: f[2], slash: i === 4 });
    });
    for (let tx = 2; tx < 39; tx += 6) objects.push({ type: 'candelabra', x: tx * T + 8, y: 4 * T + 14 });
    objects.push({ type: 'clock', x: 21 * T, y: 4 * T + 10 });
    objects.push({ type: 'vase', x: 9 * T, y: 4 * T + 12, dead: true }); objects.push({ type: 'vase', x: 33 * T, y: 4 * T + 12, dead: true });
    objects.push({ type: 'cobweb', x: 16, y: 16, s: 22 }); objects.push({ type: 'cobweb', x: w * T - 16, y: 16, s: 22, flip: true });
    return NM.makeMap(G, { objects });
  }

  // ---------- CRYPT (30 x 18 tiles) ----------
  function crypt() {
    const w = 30, h = 18;
    const G = [];
    for (let y = 0; y < h; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        let c = 'S';
        if (y === 0 || y === h - 1 || x === 0 || x === w - 1) c = '#';
        else if (y <= 2) c = 'B';
        row += c;
      }
      G.push(row);
    }
    const objects = [];
    for (const ty of [6, 11, 15]) for (let tx = 3; tx < 28; tx += 4) { if (tx >= 13 && tx <= 17) continue; objects.push({ type: 'coffin', x: tx * T + 8, y: ty * T + 8, open: (tx + ty) % 7 === 0 }); }
    for (let tx = 2; tx < 29; tx += 5) objects.push({ type: 'skulls', x: tx * T + 8, y: 2 * T + 6, ysort: -300 });
    for (let tx = 4; tx < 28; tx += 5) objects.push({ type: 'chain', x: tx * T + 8, y: 3 * T, len: 18, ysort: -300 });
    for (const [tx, ty] of [[12, 5], [18, 5], [12, 10], [18, 10], [12, 15], [18, 15]]) objects.push({ type: 'candle', x: tx * T + 8, y: ty * T + 8 });
    objects.push({ type: 'cobweb', x: 16, y: 16, s: 26 }); objects.push({ type: 'cobweb', x: w * T - 16, y: 16, s: 26, flip: true });
    const m = NM.makeMap(G, { objects });
    m.altar = { x: 15 * T, y: 9 * T };
    return m;
  }

  // ---------- BALLROOM / THRONE HALL (30 x 22 tiles) ----------
  PROPS.throne = (g, x, y) => {
    x = Math.round(x); y = Math.round(y);
    const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
    r(-14, -46, 28, 40, '#3a1418'); r(-12, -44, 24, 36, '#6a0f1e'); r(-12, -44, 24, 2, '#a3122a');
    for (const dx of [-14, 11]) { r(dx, -56, 3, 50, '#b08850'); r(dx, -58, 3, 3, '#e8c070'); }
    r(-4, -56, 8, 6, '#b08850'); r(-2, -60, 4, 4, '#e8c070');
    r(-16, -18, 32, 12, '#3a1418'); r(-16, -18, 32, 2, '#b08850'); r(-12, -16, 24, 8, '#a3122a');
    r(-17, -6, 34, 6, '#2a2228'); r(-17, -6, 34, 1, '#7a6a70');
  };
  NM.chandelier = function (g, x, y, t, lit = 1, r0 = 30) {
    const P = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + a), Math.round(y + b), w, h); };
    g.save();
    g.strokeStyle = '#b08850'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, r0, r0 * 0.55, 0, 0, NM.TAU); g.stroke();
    g.beginPath(); g.ellipse(x, y, r0 * 0.5, r0 * 0.28, 0, 0, NM.TAU); g.stroke();
    g.lineWidth = 1;
    for (let k = 0; k < 6; k++) { const a = (k / 6) * NM.TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.55); g.stroke(); }
    g.restore();
    P(-2, -2, 5, 5, '#e8c070');
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * NM.TAU, cx = x + Math.cos(a) * r0, cy = y + Math.sin(a) * r0 * 0.55;
      P(-1, -3, 2, 3, '#f2ece6');
      if (lit > 0.05) {
        g.fillStyle = lit > 0.5 && NM.CH_RED ? '#ff3a52' : '#ffcf7a';
        g.fillRect(Math.round(cx), Math.round(cy) - 6 - (Math.floor(t * 10 + k) % 2), 1, 3);
        NM.glow(g, cx, cy - 5, 10 * lit, NM.CH_RED ? '#ff2040' : '#ffb347', 0.45 * lit);
      }
      g.fillStyle = '#f2ece6'; g.fillRect(Math.round(cx), Math.round(cy) - 3, 1, 3);
    }
    if (lit > 0.05) NM.glow(g, x, y, r0 * 3, NM.CH_RED ? '#ff2040' : '#ffb347', 0.25 * lit);
  };
  function ballroom() {
    const w = 30, h = 22;
    const G = [];
    for (let y = 0; y < h; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        let c = 'm';
        if (y === 0 || y === h - 1 || x === 0 || x === w - 1) c = '#';
        else if (y <= 3) c = 'W';
        else if (y === 4) c = 'V';
        else if ((x === 14 || x === 15) && y >= 5) c = 'c';
        else if (y >= 5 && y <= 6 && x >= 11 && x <= 18) c = 'c';
        row += c;
      }
      G.push(row);
    }
    const objects = [];
    for (const tx of [3, 7, 22, 26]) objects.push({ type: 'window', x: tx * T + 8, y: 4 * T + 6, ysort: -300 });
    objects.push({ type: 'throne', x: 15 * T, y: 6 * T + 12 });
    for (const ty of [8, 12, 16]) for (const tx of [4, 25]) objects.push({ type: 'pillar', x: tx * T + 8, y: ty * T + 8 });
    for (const tx of [9, 20]) objects.push({ type: 'candelabra', x: tx * T + 8, y: 5 * T + 14 });
    objects.push({ type: 'vase', x: 11 * T, y: 5 * T + 10 }); objects.push({ type: 'vase', x: 19 * T, y: 5 * T + 10 });
    const m = NM.makeMap(G, { objects });
    m.center = { x: 15 * T, y: 13 * T };
    m.throne = { x: 15 * T, y: 6 * T + 12 };
    return m;
  }

  NM.MAPS = {};
  NM.prepareMaps = function () {
    NM.MAPS.graveyard = graveyard();
    NM.MAPS.mansionExt = mansionExt();
    NM.MAPS.village = village();
    NM.MAPS.hall = hall();
    NM.MAPS.crypt = crypt();
    NM.MAPS.ballroom = ballroom();
    if (NM.prepareMaps2) NM.prepareMaps2();
  };
  NM.prepare = function () { NM.prepareMaps(); };
})();
