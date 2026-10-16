// Necromantical — RPG Maker style tile maps: procedural 16x16 tiles, map rendering,
// y-sorted props, and darkness/light-radius lighting.
'use strict';
(function () {
  const { canvas, hash2, clamp, TAU, W, H } = NM;
  const T = 16;
  NM.TILE = T;
  const K = '#07060b';

  function pix(g) {
    return {
      p(x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); },
      r(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); },
    };
  }
  const h3 = (a, b, c) => hash2(a * 7919 + c * 104729, b * 15485863 + c);

  // ---------- tile painters (16x16, variant v) ----------
  const TILES = {
    // grass
    g(P, v) {
      P.r(0, 0, T, T, '#2c4235');
      for (let i = 0; i < 26; i++) { const x = Math.floor(h3(v, i, 1) * T), y = Math.floor(h3(v, i, 2) * T); P.p(x, y, h3(v, i, 3) < 0.5 ? '#1c2a24' : '#456148'); }
      for (let i = 0; i < 4; i++) { const x = Math.floor(h3(v, i, 4) * 14) + 1, y = Math.floor(h3(v, i, 5) * 12) + 2; P.p(x, y, '#456148'); P.p(x, y - 1, '#456148'); P.p(x + 1, y + 1, '#1c2a24'); }
    },
    // dark overgrown grass
    G(P, v) {
      P.r(0, 0, T, T, '#1c2a24');
      for (let i = 0; i < 30; i++) { const x = Math.floor(h3(v, i, 1) * T), y = Math.floor(h3(v, i, 2) * T); P.p(x, y, h3(v, i, 3) < 0.6 ? '#14201b' : '#2c4235'); }
      for (let i = 0; i < 5; i++) { const x = Math.floor(h3(v, i, 4) * 14) + 1, y = Math.floor(h3(v, i, 5) * 12) + 3; P.r(x, y - 2, 1, 3, '#2c4235'); P.p(x + 1, y - 3, '#456148'); }
    },
    // dirt path
    d(P, v) {
      P.r(0, 0, T, T, '#4a3a2e');
      for (let i = 0; i < 22; i++) { const x = Math.floor(h3(v, i, 1) * T), y = Math.floor(h3(v, i, 2) * T); P.p(x, y, h3(v, i, 3) < 0.5 ? '#2e2420' : '#6e5640'); }
      for (let i = 0; i < 2; i++) { const x = Math.floor(h3(v, i, 6) * 13) + 1, y = Math.floor(h3(v, i, 7) * 13) + 1; P.r(x, y, 2, 2, '#5a6287'); P.p(x, y + 1, '#3d3f63'); P.p(x + 1, y + 1, '#2b2a45'); }
    },
    // cobblestone
    s(P, v) {
      P.r(0, 0, T, T, '#2b2a45');
      const st = [[0, 0, 7, 5], [8, 0, 8, 6], [0, 6, 5, 5], [6, 7, 6, 4], [13, 7, 3, 5], [0, 12, 8, 4], [9, 12, 7, 4]];
      st.forEach(([x, y, w, h], i) => { P.r(x + 1, y + 1, w - 1, h - 1, h3(v, i, 1) < 0.5 ? '#3d3f63' : '#5a6287'); P.r(x + 1, y + 1, w - 1, 1, '#8a93b8'); });
    },
    // wood floor (horizontal planks)
    f(P, v) {
      for (let k = 0; k < 4; k++) {
        const y = k * 4;
        P.r(0, y, T, 4, h3(v, k, 1) < 0.5 ? '#5c4130' : '#83603f');
        P.r(0, y + 3, T, 1, '#3a2a22');
        const seam = Math.floor(h3(v, k, 2) * 12) + 2; P.r(seam, y, 1, 3, '#3a2a22');
        P.r(Math.floor(h3(v, k, 3) * 14), y + 1, 3, 1, h3(v, k, 4) < 0.5 ? '#3a2a22' : '#b08850');
      }
    },
    // crypt flagstones
    S(P, v) {
      P.r(0, 0, T, T, '#1b1b33');
      P.r(1, 1, 14, 6, '#2a2a4d'); P.r(1, 9, 6, 6, '#2a2a4d'); P.r(9, 9, 6, 6, '#2a2a4d');
      P.r(1, 1, 14, 1, '#3c3a6b'); P.r(1, 9, 6, 1, '#3c3a6b'); P.r(9, 9, 6, 1, '#3c3a6b');
      for (let i = 0; i < 6; i++) P.p(Math.floor(h3(v, i, 1) * T), Math.floor(h3(v, i, 2) * T), '#0f0f1e');
      if (h3(v, 9, 9) < 0.2) { P.r(3, 4, 4, 1, '#0f0f1e'); P.p(7, 5, '#0f0f1e'); }
    },
    // marble checker (ballroom)
    m(P, v, tx, ty) {
      const light = (tx + ty) % 2 === 0;
      P.r(0, 0, T, T, light ? '#7a6a70' : '#1e0f12');
      P.r(0, 0, T, 1, light ? '#c9bcc0' : '#2a2228');
      for (let i = 0; i < 3; i++) { const x = Math.floor(h3(v, i, 1) * 12), y = Math.floor(h3(v, i, 2) * 14); P.r(x, y, 4, 1, light ? '#4a3e44' : '#2a2228'); }
    },
    // red carpet
    c(P, v) {
      P.r(0, 0, T, T, '#7a0e22');
      for (let y = 0; y < T; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < T; x += 4) P.p(x, y, '#c4122f');
    },
    // interior wallpaper (upper wall face)
    W(P, v, tx, ty) {
      P.r(0, 0, T, T, '#2a2440');
      for (let x = 2; x < T; x += 8) { P.r(x, 0, 1, T, '#433a63'); }
      P.p(6, 4, '#6a5d8a'); P.r(5, 5, 3, 1, '#6a5d8a'); P.p(6, 6, '#6a5d8a'); P.p(14, 12, '#433a63'); P.r(13, 13, 3, 1, '#433a63');
    },
    // wainscot (lower wall face)
    V(P, v) {
      P.r(0, 0, T, T, '#3a2a22');
      P.r(0, 0, T, 2, '#83603f'); P.r(0, 2, T, 1, '#2a1d16');
      P.r(2, 5, 12, 8, '#2a1d16'); P.r(3, 6, 10, 6, '#46262a'); P.r(3, 6, 10, 1, '#5c4130');
      P.r(0, 15, T, 1, '#1c1114');
    },
    // crypt stone wall face
    B(P, v, tx, ty) {
      P.r(0, 0, T, T, '#0f0f1e');
      const off = ty % 2 ? 4 : 0;
      for (let y = 0; y < T; y += 5) for (let x = -8 + ((y / 5) % 2 ? 4 : 0) + off; x < T; x += 8) {
        P.r(x + 1, y + 1, 6, 3, h3(v, x + 9, y) < 0.5 ? '#2a2a4d' : '#3c3a6b');
        P.r(x + 1, y + 1, 6, 1, '#57528f');
      }
    },
    // mansion exterior brick
    K(P, v, tx, ty) {
      P.r(0, 0, T, T, '#2b2a45');
      for (let y = 0; y < T; y += 4) for (let x = ((y / 4) % 2 ? -4 : 0); x < T; x += 8) {
        P.r(x + 1, y, 7, 3, h3(v, x + 5, y) < 0.5 ? '#3d3f63' : '#5a6287');
        P.r(x + 1, y, 7, 1, '#8a93b8');
      }
      if (h3(v, 3, 3) < 0.35) { P.r(2, 6, 1, 6, '#2c4235'); P.p(3, 8, '#456148'); P.p(1, 10, '#456148'); } // ivy
    },
    // slate roof
    R(P, v, tx, ty) {
      P.r(0, 0, T, T, '#1d1a2e');
      for (let y = 0; y < T; y += 4) for (let x = ((y / 4) % 2 ? -3 : 0); x < T; x += 6) { P.r(x, y, 5, 3, '#2b2a45'); P.r(x, y + 2, 5, 1, '#120f1c'); }
    },
    // wall top / void
    '#'(P) { P.r(0, 0, T, T, '#0b0709'); },
    ' '(P) { P.r(0, 0, T, T, '#000000'); },
    // grave soil
    o(P, v) {
      P.r(0, 0, T, T, '#2e2420');
      for (let i = 0; i < 16; i++) P.p(Math.floor(h3(v, i, 1) * T), Math.floor(h3(v, i, 2) * T), h3(v, i, 3) < 0.5 ? '#4a3a2e' : '#1d1a2e');
    },
  };
  NM.TILES = TILES;
  // flower decorations painted over grass for these chars
  const DECOR = {
    r: 'g', // red spider lilies on grass
    b: 'g', // blue flowers on grass
    y: 'g', // pale flowers
  };

  const tileCache = new Map();
  function tileImg(ch, tx, ty) {
    const base = DECOR[ch] || ch;
    const painter = TILES[base];
    if (!painter) return null;
    const vMax = base === 'm' ? 4 : 6;
    const v = Math.floor(hash2(tx * 3 + 1, ty * 5 + 7) * vMax);
    const par = base === 'm' ? (tx + ty) % 2 : (base === 'K' || base === 'B' ? ty % 2 : 0);
    const key = ch + '|' + v + '|' + par;
    if (tileCache.has(key)) return tileCache.get(key);
    const c = canvas(T, T), g = c.getContext('2d');
    const P = pix(g);
    painter(P, v, base === 'm' ? par : 0, base === 'm' ? 0 : par);
    if (ch === 'r') redLily(P, v); else if (ch === 'b') blueFlower(P, v); else if (ch === 'y') paleFlower(P, v);
    tileCache.set(key, c);
    return c;
  }
  function redLily(P, v) {
    for (let k = 0; k < 2; k++) {
      const x = 3 + Math.floor(h3(v, k, 11) * 9), y = 4 + Math.floor(h3(v, k, 12) * 8);
      P.r(x, y + 2, 1, 3, '#2c4235');
      P.p(x - 2, y - 1, '#c4122f'); P.p(x + 2, y - 1, '#c4122f'); P.p(x - 1, y, '#c4122f'); P.p(x + 1, y, '#c4122f'); P.p(x, y + 1, '#7a0e22');
      P.p(x - 2, y - 2, '#ff3a52'); P.p(x + 2, y - 2, '#ff3a52'); P.p(x, y - 1, '#ff3a52'); P.p(x - 3, y - 3, '#c4122f'); P.p(x + 3, y - 3, '#c4122f');
    }
  }
  function blueFlower(P, v) {
    for (let k = 0; k < 3; k++) {
      const x = 2 + Math.floor(h3(v, k, 21) * 12), y = 2 + Math.floor(h3(v, k, 22) * 11);
      P.p(x, y, '#5a6287'); P.p(x - 1, y, '#3d3f63'); P.p(x + 1, y, '#3d3f63'); P.p(x, y - 1, '#8a93b8'); P.p(x, y + 1, '#3d3f63');
    }
  }
  function paleFlower(P, v) {
    for (let k = 0; k < 3; k++) {
      const x = 2 + Math.floor(h3(v, k, 31) * 12), y = 2 + Math.floor(h3(v, k, 32) * 11);
      P.p(x, y, '#f2f0ea'); P.p(x - 1, y, '#c8cfe6'); P.p(x + 1, y, '#c8cfe6'); P.p(x, y - 1, '#c8cfe6'); P.p(x, y, '#ffcf7a');
    }
  }

  // ---------- map ----------
  // rows: array of strings; each char a tile. Returns a map object with a cached ground canvas.
  NM.makeMap = function (rows, opt = {}) {
    const h = rows.length, w = Math.max(...rows.map((r) => r.length));
    const m = { rows, w, h, pw: w * T, ph: h * T, objects: opt.objects || [] };
    const c = canvas(m.pw, m.ph), g = c.getContext('2d');
    for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
      const ch = rows[ty][tx] || ' ';
      const img = tileImg(ch, tx, ty);
      if (img) g.drawImage(img, tx * T, ty * T);
    }
    // carpet borders (gold edge where carpet meets non-carpet)
    for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
      if (rows[ty][tx] !== 'c') continue;
      const is = (x, y) => rows[y] && rows[y][x] === 'c';
      g.fillStyle = '#b08850';
      if (!is(tx - 1, ty)) g.fillRect(tx * T, ty * T, 2, T);
      if (!is(tx + 1, ty)) g.fillRect(tx * T + T - 2, ty * T, 2, T);
      if (!is(tx, ty - 1)) g.fillRect(tx * T, ty * T, T, 2);
      if (!is(tx, ty + 1)) g.fillRect(tx * T, ty * T + T - 2, T, 2);
    }
    // wall top edge shading: bottom edge of '#' above a wall face
    for (let ty = 0; ty < h - 1; ty++) for (let tx = 0; tx < w; tx++) {
      if (rows[ty][tx] === '#' && 'WKBV'.includes(rows[ty + 1][tx])) { g.fillStyle = '#433a63'; g.fillRect(tx * T, ty * T + T - 2, T, 2); }
      if ('WVKB'.includes(rows[ty][tx]) && 'fmcSdgs'.includes(rows[ty + 1]?.[tx] || '')) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(tx * T, (ty + 1) * T, T, 4); }
    }
    if (opt.paint) opt.paint(g, m);
    m.ground = c;
    return m;
  };

  // draw ground (cam = top-left of view in world px)
  NM.drawGround = function (g, m, cam) {
    const cx = Math.round(cam.x), cy = Math.round(cam.y);
    g.drawImage(m.ground, cx, cy, W, H, 0, 0, W, H);
  };

  // y-sorted drawing of props + characters; each item {y, draw(g)} in world coords
  NM.drawSorted = function (g, items) {
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw(g);
  };

  // ---------- lighting ----------
  let darkC = null;
  NM.darkness = function (g, lights, amount = 0.85, color = '#05040c', t = 0) {
    if (!darkC) darkC = canvas(W, H);
    const d = darkC.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'copy';
    d.globalAlpha = amount; d.fillStyle = color; d.fillRect(0, 0, W, H);
    d.globalAlpha = 1;
    d.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const fl = L.flicker ? 1 + 0.06 * NM.noise1(t * 7 + L.x * 0.1) : 1;
      const r = L.r * fl;
      const gr = d.createRadialGradient(L.x, L.y, 0, L.x, L.y, r);
      gr.addColorStop(0, `rgba(0,0,0,${L.a ?? 1})`); gr.addColorStop(0.55, `rgba(0,0,0,${(L.a ?? 1) * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr; d.fillRect(L.x - r, L.y - r, r * 2, r * 2);
    }
    g.drawImage(darkC, 0, 0);
    for (const L of lights) if (L.color) NM.glow(g, L.x, L.y, L.r * 0.9, L.color, L.ca ?? 0.25);
  };

  // ---------- props (world coords, anchored bottom-centre) ----------
  const PROPS = {};
  NM.PROPS = PROPS;
  function stoneFace(P, x, y, w, h) { // filled stone with light left edge
    P.r(x, y, w, h, '#5a6287'); P.r(x, y, 1, h, '#8a93b8'); P.r(x, y, w, 1, '#8a93b8'); P.r(x + w - 1, y + 1, 1, h - 1, '#3d3f63');
  }
  PROPS.tomb = (g, x, y, o = {}) => {
    const P = pix(g); x = Math.round(x) - 7; y = Math.round(y) - 20;
    P.r(x - 1, y + 16, 16, 5, '#2b2a45'); P.r(x - 1, y + 16, 16, 1, '#3d3f63');
    P.r(x + 2, y - 1, 10, 1, K); P.r(x, y + 1, 1, 16, K); P.r(x + 13, y + 1, 1, 16, K); P.p(x + 1, y, K); P.p(x + 12, y, K);
    stoneFace(P, x + 1, y, 12, 17); P.r(x + 1, y, 1, 1, K); P.r(x + 12, y, 1, 1, K);
    P.r(x + 6, y + 4, 2, 7, '#3d3f63'); P.r(x + 4, y + 6, 6, 2, '#3d3f63');
    if (o.moss) { P.r(x + 1, y + 12, 3, 4, '#2c4235'); P.p(x + 2, y + 11, '#456148'); }
    if (o.blood) { P.r(x + 8, y + 2, 1, 6, '#c4122f'); P.p(x + 8, y + 8, '#7a0e22'); }
  };
  PROPS.cross = (g, x, y) => {
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    P.r(x - 6, y - 4, 12, 5, '#2b2a45');
    P.r(x - 2, y - 24, 4, 21, K); P.r(x - 7, y - 19, 14, 4, K);
    P.r(x - 1, y - 23, 2, 19, '#8a93b8'); P.r(x - 6, y - 18, 12, 2, '#8a93b8'); P.r(x, y - 23, 1, 19, '#5a6287');
  };
  PROPS.gothicTomb = (g, x, y) => {
    const P = pix(g); x = Math.round(x) - 8; y = Math.round(y) - 26;
    P.r(x - 1, y + 21, 18, 5, '#2b2a45');
    for (let k = 0; k < 7; k++) P.r(x + 7 - k, y + k, 2 + k * 2, 1, k === 0 ? K : '#5a6287');
    P.r(x, y + 7, 16, 15, '#5a6287'); P.r(x, y + 7, 1, 15, '#8a93b8'); P.r(x + 15, y + 7, 1, 15, '#3d3f63');
    P.r(x - 1, y + 6, 1, 16, K); P.r(x + 16, y + 6, 1, 16, K);
    for (let k = 0; k < 7; k++) { P.p(x + 7 - k - 1, y + k, K); P.p(x + 8 + k + 1, y + k, K); }
    P.r(x + 6, y + 9, 4, 8, '#2b2a45'); P.r(x + 7, y + 8, 2, 1, '#2b2a45');
  };
  PROPS.angel = (g, x, y) => {
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    P.r(x - 8, y - 6, 16, 6, '#2b2a45'); P.r(x - 8, y - 6, 16, 1, '#5a6287');
    // robe
    P.r(x - 4, y - 22, 8, 16, '#8a93b8'); P.r(x - 5, y - 12, 10, 6, '#8a93b8'); P.r(x + 2, y - 22, 2, 16, '#5a6287');
    // wings
    P.r(x - 10, y - 30, 6, 14, '#5a6287'); P.r(x + 4, y - 30, 6, 14, '#5a6287'); P.r(x - 9, y - 29, 1, 12, '#c8cfe6'); P.r(x + 5, y - 29, 1, 12, '#c8cfe6');
    // head bowed
    P.r(x - 3, y - 28, 6, 6, '#c8cfe6'); P.r(x - 3, y - 28, 6, 2, '#8a93b8');
    P.r(x - 2, y - 20, 4, 2, '#c8cfe6'); // hands in prayer
    if (g.__weep) { P.r(x - 1, y - 24, 1, 6, '#c4122f'); }
  };
  PROPS.freshGrave = (g, x, y, o = {}) => {
    // dirt mound + wooden-cross or new headstone at the head end; o.open: 0..1 hole opening
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    const open = o.open || 0;
    if (open > 0) {
      P.r(x - 9, y - 14, 18, 26, '#2e2420');
      P.r(x - 7, y - 12, 14, 22, '#07060b');
      P.r(x - 7, y - 12, 14, 2, '#1d1a2e');
      P.r(x - 12, y + 6, 5, 4, '#4a3a2e'); P.r(x + 8, y - 6, 6, 5, '#4a3a2e');
    } else {
      P.r(x - 8, y - 12, 16, 24, '#2e2420'); P.r(x - 7, y - 13, 14, 1, '#2e2420'); P.r(x - 7, y + 12, 14, 1, '#2e2420');
      P.r(x - 6, y - 11, 12, 6, '#4a3a2e'); P.r(x - 6, y - 4, 10, 3, '#4a3a2e');
      for (let i = 0; i < 10; i++) P.p(x - 7 + Math.floor(hash2(i, 3) * 14), y - 11 + Math.floor(hash2(i, 4) * 22), '#6e5640');
    }
    if (o.rose) { NM.miniRose(g, x + 2, y + 2, 2.6); P.r(x + 2, y + 4, 1, 6, '#2c4235'); }
  };
  PROPS.headstoneNew = (g, x, y) => {
    const P = pix(g); x = Math.round(x) - 8; y = Math.round(y) - 22;
    P.r(x - 1, y + 18, 18, 4, '#2b2a45');
    P.r(x + 2, y - 1, 12, 1, K); P.r(x, y + 1, 1, 18, K); P.r(x + 15, y + 1, 1, 18, K); P.p(x + 1, y, K); P.p(x + 14, y, K);
    P.r(x + 1, y, 14, 19, '#c8cfe6'); P.r(x + 1, y, 1, 19, '#f2f0ea'); P.r(x + 14, y + 1, 1, 18, '#8a93b8');
    P.r(x + 4, y + 4, 8, 1, '#5a6287'); P.r(x + 3, y + 7, 10, 1, '#5a6287'); P.r(x + 5, y + 10, 6, 1, '#5a6287'); P.r(x + 4, y + 13, 8, 1, '#8a93b8');
  };
  PROPS.fence = (g, x, y, o = {}) => {
    // horizontal run of iron fence from x to x+len
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    const len = o.len || 64;
    P.r(x, y - 14, len, 1, '#1d1a2e'); P.r(x, y - 4, len, 1, '#1d1a2e');
    for (let i = 0; i < len; i += 4) {
      P.r(x + i, y - 18, 1, 18, '#1d1a2e'); P.p(x + i, y - 19, '#3d3f63'); P.p(x + i - 1, y - 18, '#1d1a2e'); P.p(x + i + 1, y - 18, '#1d1a2e');
    }
    P.r(x, y - 15, len, 1, '#3d3f63');
  };
  PROPS.tree = (g, x, y, o = {}) => {
    const s = NM.treeSprite(o.seed || 3, o.h || 70, o.color || '#120f1c', o.depth || 6);
    g.drawImage(s.c, Math.round(x - s.ox), Math.round(y - s.oy));
  };
  PROPS.bush = (g, x, y) => {
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    P.r(x - 7, y - 9, 14, 9, '#1c2a24'); P.r(x - 5, y - 11, 10, 2, '#1c2a24'); P.r(x - 4, y - 10, 5, 3, '#2c4235'); P.r(x + 2, y - 7, 3, 2, '#2c4235'); P.p(x - 3, y - 10, '#456148');
  };
  PROPS.candle = (g, x, y, o = {}, t = 0) => {
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    const lit = o.lit ?? 1;
    P.r(x - 1, y - 6, 3, 6, '#f2f0ea'); P.r(x + 1, y - 6, 1, 6, '#c8cfe6'); P.r(x - 2, y - 1, 5, 1, '#5a6287');
    if (lit > 0.05) {
      const red = o.red || 0;
      const fl = Math.floor(t * 12 + x) % 3;
      P.r(x, y - 9 - (fl === 0 ? 1 : 0), 1, 3, red > 0.5 ? '#ff3a52' : '#ffcf7a');
      P.p(x, y - 7, red > 0.5 ? '#ff8a9a' : '#f2f0ea');
      NM.glow(g, x, y - 8, 14 * lit, red > 0.5 ? '#ff2040' : '#ffb347', 0.5 * lit);
    }
  };
  PROPS.candelabra = (g, x, y, o = {}, t = 0) => {
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    P.r(x - 4, y - 2, 9, 2, '#b08850'); P.r(x, y - 22, 1, 20, '#b08850'); P.r(x - 5, y - 20, 11, 1, '#b08850');
    P.r(x - 5, y - 23, 1, 3, '#b08850'); P.r(x + 5, y - 23, 1, 3, '#b08850');
    for (const dx of [-5, 0, 5]) PROPS.candle(g, x + dx, y - 22 - (dx === 0 ? 3 : 0), { lit: o.lit ?? 1, red: o.red }, t);
  };
  PROPS.coffin = (g, x, y, o = {}) => {
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    // top-down coffin, 14 wide x 30 long, head at top
    const rows = [[-5, 5], [-6, 6], [-7, 7], [-7, 7], [-7, 7], [-6, 6], [-6, 6], [-5, 5], [-5, 5], [-5, 5], [-4, 4]];
    for (let i = 0; i < 30; i++) {
      const k = Math.min(10, Math.floor(i < 6 ? i : 5 + (i - 6) / 4.8));
      const [a, b] = rows[k];
      P.r(x + a, y - 30 + i, b - a, 1, o.open ? '#07060b' : '#3a2a22');
      P.p(x + a, y - 30 + i, K); P.p(x + b - 1, y - 30 + i, K);
      if (!o.open) P.p(x + a + 1, y - 30 + i, '#5c4130');
    }
    P.r(x - 4, y - 30, 8, 1, K); P.r(x - 3, y - 1, 6, 1, K);
    if (!o.open) { P.r(x - 1, y - 25, 2, 10, '#b08850'); P.r(x - 3, y - 22, 6, 2, '#b08850'); }
    else { P.r(x - 4, y - 26, 8, 2, '#7a0e22'); }
  };
  PROPS.window = (g, x, y, o = {}, t = 0) => {
    // tall arched window on a wall face: 16 wide, 28 tall; o.lit: warm glow; moon: blue
    const P = pix(g); x = Math.round(x) - 8; y = Math.round(y) - 28;
    P.r(x, y + 3, 16, 25, '#120f1c'); P.r(x + 3, y, 10, 3, '#120f1c'); P.r(x + 1, y + 1, 14, 2, '#120f1c');
    const glass = o.lit ? '#ffcf7a' : o.red ? '#c4122f' : '#3d3f63';
    const glass2 = o.lit ? '#ff9a3a' : o.red ? '#7a0e22' : '#5a6287';
    P.r(x + 2, y + 4, 12, 22, glass); P.r(x + 4, y + 2, 8, 2, glass);
    P.r(x + 2, y + 15, 12, 11, glass2);
    P.r(x + 7, y + 2, 2, 24, '#120f1c'); P.r(x + 2, y + 13, 12, 2, '#120f1c');
    if (!o.lit && !o.red) { P.r(x + 3, y + 5, 2, 4, '#8a93b8'); P.p(x + 10, y + 6, '#c8cfe6'); }
    P.r(x - 1, y + 26, 18, 2, '#5a6287');
  };
  PROPS.door = (g, x, y, o = {}) => {
    const P = pix(g); x = Math.round(x) - 12; y = Math.round(y) - 32;
    P.r(x - 2, y - 2, 28, 34, '#1d1a2e'); P.r(x, y, 24, 32, o.open ? '#07060b' : '#3a2a22');
    if (!o.open) {
      P.r(x + 11, y, 2, 32, '#2a1d16');
      for (const dx of [2, 14]) { P.r(x + dx, y + 3, 8, 11, '#5c4130'); P.r(x + dx, y + 17, 8, 12, '#5c4130'); P.r(x + dx, y + 3, 8, 1, '#83603f'); P.r(x + dx, y + 17, 8, 1, '#83603f'); }
      P.r(x + 9, y + 16, 2, 2, '#e8c070'); P.r(x + 13, y + 16, 2, 2, '#e8c070');
    } else {
      P.r(x, y, 3, 32, '#3a2a22'); P.r(x + 21, y, 3, 32, '#3a2a22');
    }
    P.r(x - 4, y + 32, 32, 3, '#5a6287'); P.r(x - 4, y + 32, 32, 1, '#8a93b8');
  };
  PROPS.painting = (g, x, y, o = {}) => {
    const P = pix(g); x = Math.round(x) - 8; y = Math.round(y) - 20;
    P.r(x, y, 16, 20, '#b08850'); P.r(x + 1, y + 1, 14, 18, '#83603f'); P.r(x + 2, y + 2, 12, 16, o.bg || '#1c1114');
    // tiny portrait silhouette
    P.r(x + 6, y + 5, 4, 4, o.face || '#d9a59a'); P.r(x + 5, y + 4, 6, 2, o.hair || '#2a1d16'); P.r(x + 4, y + 10, 8, 8, o.coat || '#2e1a1e');
    if (o.slash) { P.r(x + 3, y + 6, 10, 1, '#c4122f'); P.r(x + 4, y + 7, 8, 1, '#7a0e22'); }
  };
  PROPS.pillar = (g, x, y) => {
    const P = pix(g); x = Math.round(x) - 7; y = Math.round(y);
    P.r(x - 1, y - 6, 16, 6, '#7a6a70'); P.r(x - 1, y - 6, 16, 1, '#c9bcc0');
    P.r(x + 1, y - 52, 12, 46, '#c9bcc0'); P.r(x + 1, y - 52, 2, 46, '#f2ece6'); P.r(x + 10, y - 52, 3, 46, '#7a6a70');
    for (const dx of [5, 8]) P.r(x + dx, y - 50, 1, 42, '#7a6a70');
    P.r(x - 1, y - 58, 16, 6, '#7a6a70'); P.r(x - 1, y - 58, 16, 1, '#f2ece6');
  };
  PROPS.clock = (g, x, y, o = {}, t = 0) => {
    const P = pix(g); x = Math.round(x) - 6; y = Math.round(y) - 40;
    P.r(x, y, 12, 40, '#3a2a22'); P.r(x, y, 12, 1, '#5c4130'); P.r(x + 1, y + 2, 10, 10, '#e8e2d8'); P.r(x + 1, y + 2, 10, 1, '#b08850');
    P.r(x + 5, y + 4, 1, 4, K); P.r(x + 5, y + 7, 3, 1, K);
    P.r(x + 3, y + 16, 6, 16, '#1c1114');
    const sw = Math.round(Math.sin(t * 3.4) * 2);
    P.r(x + 5 + sw, y + 16, 1, 10, '#b08850'); P.r(x + 4 + sw, y + 26, 3, 3, '#e8c070');
  };
  PROPS.chain = (g, x, y, o = {}) => {
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    const len = o.len || 16;
    for (let i = 0; i < len; i += 3) { P.r(x - (i % 6 ? 1 : 0), y - len + i, i % 6 ? 3 : 1, 2, '#5a6287'); }
  };
  PROPS.skulls = (g, x, y) => {
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    for (const [dx, dy] of [[-6, 0], [0, -1], [6, 0], [-3, -6], [3, -6]]) {
      P.r(x + dx - 2, y + dy - 4, 5, 4, '#d6cdf0'); P.r(x + dx - 1, y + dy, 3, 1, '#d6cdf0');
      P.p(x + dx - 1, y + dy - 3, K); P.p(x + dx + 1, y + dy - 3, K);
    }
  };
  PROPS.cobweb = (g, x, y, o = {}) => {
    g.save(); g.strokeStyle = 'rgba(200,205,230,0.5)'; g.lineWidth = 1;
    const s = o.s || 20, fx = o.flip ? -1 : 1;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + fx * s * Math.cos(k * 0.5), y + s * Math.sin(k * 0.5)); g.stroke(); }
    for (let r = 6; r < s; r += 5) { g.beginPath(); g.arc(x, y, r, o.flip ? Math.PI / 2 : 0, o.flip ? Math.PI : Math.PI / 2); g.stroke(); }
    g.restore();
  };
  PROPS.vase = (g, x, y, o = {}) => {
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    P.r(x - 3, y - 8, 6, 8, '#2a2440'); P.r(x - 2, y - 10, 4, 2, '#2a2440'); P.r(x - 3, y - 8, 1, 8, '#433a63');
    // dead / living roses
    const c = o.dead ? '#3a0a14' : '#c4122f';
    P.r(x - 1, y - 16, 1, 6, '#14201b'); P.r(x + 2, y - 15, 1, 5, '#14201b'); P.r(x - 4, y - 14, 1, 4, '#14201b');
    P.r(x - 2, y - 18, 3, 2, c); P.r(x + 1, y - 17, 3, 2, c); P.r(x - 5, y - 16, 3, 2, c);
  };
  PROPS.torch = (g, x, y, o = {}, t = 0) => { // hand torch flame at (x,y) top
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    P.r(x, y, 1, 7, '#4a3a2e');
    const f = Math.floor(t * 14 + x * 3) % 3;
    P.r(x - 1, y - 4, 3, 4, '#ff9a3a'); P.r(x, y - 6 - (f === 1 ? 1 : 0), 1, 3, '#ffcf7a'); P.p(x, y - 2, '#f2f0ea');
    NM.glow(g, x, y - 3, 26, '#ff9a3a', 0.45);
  };
  PROPS.well = (g, x, y) => {
    const P = pix(g); x = Math.round(x); y = Math.round(y);
    P.r(x - 10, y - 12, 20, 12, '#3d3f63'); P.r(x - 10, y - 12, 20, 1, '#8a93b8'); P.r(x - 8, y - 11, 16, 4, '#07060b');
    P.r(x - 10, y - 30, 2, 18, '#3a2a22'); P.r(x + 8, y - 30, 2, 18, '#3a2a22'); P.r(x - 12, y - 32, 24, 3, '#2a1d16');
  };

  NM.prop = function (g, o, t) {
    const f = PROPS[o.type];
    if (f) f(g, o.x, o.y, o, t);
  };
  NM.propItems = function (g, m, t, filter) {
    return m.objects.filter((o) => !filter || filter(o)).map((o) => ({ y: o.y + (o.ysort || 0), draw: () => NM.prop(g, o, t) }));
  };
})();
