'use strict';
// Glass world: window grounds (quarries, diapers), mandorlas and borders, people (Shaikan,
// kings, crowds), and the props the windows are made of.

// ---------- grounds ----------
// diamond quarries: the classic lattice of small lozenges behind figures
function quarries(key, x0, y0, x1, y1, size, colFn, o = {}) {
  let g = _tessCache.get('q_' + key);
  if (!g) {
    const cells = [], h = size, w = size * (o.aspect || 0.78);
    for (let j = Math.floor((2 * y0) / h) - 2; (j * h) / 2 < y1 + h; j++)
      for (let i = Math.floor(x0 / w) - 1; i * w < x1 + w; i++) {
        const cx = i * w + ((j & 1) ? w / 2 : 0), cy = j * h / 2;
        if (cy < y0 - h || cy > y1 + h) continue;
        cells.push([[cx, cy - h / 2], [cx + w / 2, cy], [cx, cy + h / 2], [cx - w / 2, cy]]);
      }
    const cs = makeCells(cells);
    cs.forEach((c, i) => { c.seed = i * 37 + 11; });
    g = { cells: cs, lead: leadPathOf(cs) };
    _tessCache.set('q_' + key, g);
  }
  glassField(g, colFn, { leadW: o.leadW || 4, tex: o.tex });
  return g;
}
// small four-lobed rosettes at quarry crossings
function rosettes(key, x0, y0, x1, y1, size, col, o = {}) {
  const w = size * (o.aspect || 0.78), r = size * 0.11;
  glassSet('ros_' + key, () => {
    const out = [];
    for (let j = Math.floor((2 * y0) / size) - 2; (j * size) / 2 < y1 + size; j++)
      for (let i = Math.floor(x0 / w) - 1; i * w < x1 + w; i++) {
        const cx = i * w + w / 2 + ((j & 1) ? w / 2 : 0), cy = j * size / 2;
        if (cy < y0 || cy > y1 || cx < x0 || cx > x1) continue;
        out.push(arcPts(cx, cy, r, r, 0, TAU, 8).slice(0, -1));
      }
    return out;
  }, (i) => (Array.isArray(col) ? col[i % col.length] : col), { lw: o.lw || 3 });
}
// vesica (mandorla) outline points
function vesicaPts(cx, cy, a, b, n = 24) {
  const pts = [];
  // two circular arcs meeting in points at top and bottom
  const R = (a * a + b * b) / (2 * a), off = R - a;
  const t0 = Math.asin(b / R);
  for (let i = 0; i <= n; i++) { const t = lerp(-t0, t0, i / n); pts.push([cx - off + Math.cos(t) * R, cy + Math.sin(t) * R]); }
  for (let i = 1; i < n; i++) { const t = lerp(Math.PI + t0, Math.PI - t0, i / n); pts.push([cx + off + Math.cos(t) * R, cy - Math.sin(t) * R]); }
  return pts.map(([x, y]) => [x, y]);
}
function mandorla(key, cx, cy, a, b, t, o = {}) {
  const vp = vesicaPts(cx, cy, a, b, 30);
  const path = polyPath(vp);
  ctx.save();
  ctx.clip(path);
  const rays = tessRadial('mand_' + key, cx, cy, a * 0.16, Math.max(a, b) * 1.15, o.rings || 3, o.rays || 26, { grow: false, rot: o.rot || 0 });
  const heat = o.heat ?? 0;
  glassField(rays, (x, y, c) => {
    const k = clamp(c.rr / (Math.max(a, b) * 0.95));
    const odd = (Math.floor(((c.a + Math.PI) / TAU) * (o.rays || 26) + 0.5) & 1);
    let col = lerpRGB(lerpRGB('#fff2b0', '#ffc23a', clamp(k * 1.6)), lerpRGB('#f07a18', '#b4141e', clamp((k - 0.45) * 2)), clamp(k * 1.4 - 0.2));
    if (heat > 0) col = lerpRGB(col, lerpRGB('#ff3020', '#5a0008', k), heat);
    if (o.cold) col = lerpRGB(col, lerpRGB('#eef4ff', '#3a4a7a', k), o.cold);
    return odd ? col : lerpRGB(col, '#ff9a2a', 0.25 + 0.1 * Math.sin(t * 2 + c.a * 3));
  }, { leadW: o.leadW || 5 });
  ctx.restore();
  // jewelled rim: coloured runs of one continuous band, lead between them
  ringJewels(vp, o.rimW || 26, o.jewels || 40, o.rimCols || (o.cold ? ['#5a6a9a', '#dfe8ff', '#2a3a6a', '#dfe8ff'] : ['#c8202c', '#ffd24a', '#2a46c8', '#ffd24a']));
  return vp;
}
function ringJewels(pts, bw, n, cols) {
  // start half a jewel along, so pointed tips fall inside a jewel instead of on a joint
  const k0 = Math.round(pts.length / (2 * n));
  pts = pts.slice(k0).concat(pts.slice(0, k0));
  const s = pts.concat([pts[0]]), L = [0];
  for (let i = 1; i < s.length; i++) L.push(L[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const tot = L[L.length - 1];
  const at = (d) => { let i = 0; while (i < s.length - 2 && L[i + 1] < d) i++; const u = (d - L[i]) / (L[i + 1] - L[i] || 1); return [lerp(s[i][0], s[i + 1][0], u), lerp(s[i][1], s[i + 1][1], u), i]; };
  const whole = polyPath(pts);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  if (E.shadows) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8 * E.shadowScale; }
  ctx.strokeStyle = '#151419'; ctx.lineWidth = (bw + 10) * (E.leadK || 1); ctx.stroke(whole);
  ctx.shadowColor = 'transparent';
  for (let k = 0; k < n; k++) {
    const d0 = (k / n) * tot, d1 = ((k + 1) / n) * tot, a = at(d0), b = at(d1), m = at((d0 + d1) / 2);
    const run = new Path2D();
    run.moveTo(a[0], a[1]);
    for (let i = a[2] + 1; i <= b[2]; i++) run.lineTo(s[i][0], s[i][1]);
    run.lineTo(b[0], b[1]);
    const [sx, sy] = screenPt(m[0], m[1]);
    const c = litRGB(_bloodCol(cols[k % cols.length], {}), lightAt(sx, sy));
    ctx.strokeStyle = rgbStr(c, 1.05); ctx.lineWidth = bw; ctx.stroke(run);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgbStr(c, 0.32); ctx.lineWidth = bw * 0.45; ctx.stroke(run);
    ctx.globalCompositeOperation = 'source-over';
  }
  // lead separators across the band
  const sep = new Path2D();
  for (let k = 0; k < n; k++) {
    const d = (k / n) * tot, p = at(d), q = at(d + 2);
    const nx = -(q[1] - p[1]), ny = q[0] - p[0], l = Math.hypot(nx, ny) || 1;
    sep.moveTo(p[0] + (nx / l) * bw * 0.6, p[1] + (ny / l) * bw * 0.6); sep.lineTo(p[0] - (nx / l) * bw * 0.6, p[1] - (ny / l) * bw * 0.6);
  }
  ctx.strokeStyle = '#151419'; ctx.lineWidth = 5 * (E.leadK || 1); ctx.stroke(sep);
  ctx.restore();
}
// border band of alternating jewels around a rectangle
function jewelBorder(key, x0, y0, x1, y1, bw, cols, o = {}) {
  glassSet('jb_' + key, () => {
    const out = [], seg = o.seg || 64;
    const run = (ax, ay, bx, by, nx, ny) => {
      const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / seg));
      for (let i = 0; i < n; i++) {
        const u0 = i / n, u1 = (i + 1) / n;
        const p = [lerp(ax, bx, u0), lerp(ay, by, u0)], q = [lerp(ax, bx, u1), lerp(ay, by, u1)];
        out.push({ pts: [p, q, [q[0] + nx * bw, q[1] + ny * bw], [p[0] + nx * bw, p[1] + ny * bw]], poly: true });
      }
    };
    run(x0, y0, x1, y0, 0, 1); run(x1, y0, x1, y1, -1, 0); run(x1, y1, x0, y1, 0, -1); run(x0, y1, x0, y0, 1, 0);
    return out;
  }, (i) => cols[i % cols.length], { lw: o.lw || 5 });
}

// ---------- people ----------
// A small glass figure: Shaikan (hooded), king (crowned), mage, commoner, child.
// Person space: feet at y = 0, head top ≈ -400. o: {kind, robe, robe2, arms, kneel, back, glow, look, s}
const PPL = {
  shaikan: { robe: '#5a1a2a', robe2: '#7a2232', hood: true },
  hooded: { robe: '#3a3550', robe2: '#4c4668', hood: true },
  king: { robe: '#2340a8', robe2: '#3a5cd0', crown: true },
  mage: { robe: '#3a2a6a', robe2: '#52408c', hood: true, staff: true },
  folk: { robe: '#6a5434', robe2: '#86703e' },
  child: { robe: '#4a6a3a', robe2: '#5e8448' },
  god: { robe: '#e8e4d8', robe2: '#f6f2e6', hood: false, halo: true },
  dead: { robe: '#5a6478', robe2: '#6c7690', hood: true, pale: true },
};
function drawPerson(x, y, s, o = {}) {
  const k = PPL[o.kind || 'shaikan'] || PPL.shaikan;
  const robe = o.robe || k.robe, robe2 = o.robe2 || k.robe2, kn = clamp(o.kneel || 0), back = !!o.back;
  const id = (o.kind || 'shaikan') + (back ? 'b' : 'f');
  push(x, y, o.rot || 0, s * (o.flip ? -1 : 1), s);
  scaled(s, () => {
    const dy = kn * 110;
    ctx.translate(0, dy);
    // robe: a long bell with two fold strips
    const robeG = region('pp.robe.' + id + (kn > 0.5 ? 'k' : ''), () => ({
      out: kn > 0.5 ? [[-44, -300, 1], [44, -300, 1], [62, -200], [92, -114], [96, -96, 1], [-96, -96, 1], [-92, -114], [-62, -200]]
        : [[-44, -300, 1], [44, -300, 1], [56, -200], [70, -60], [74, 0, 1], [-74, 0, 1], [-70, -60], [-56, -200]],
      cuts: [[[-12, -296], [-18, -150], [-26, 10]], [[16, -296], [22, -150], [30, 10]]],
      panels: [{ pts: [[-12, -320], [-18, -150], [-26, 20], [16, 20], [22, -150], [16, -320]], poly: true, ci: 1 }],
      mattes: [{ pts: [[-40, -280], [-56, -120], [-64, -10]], w: 22, a: 0.3 }],
    }), [robe, robe2], { lw: 5 });
    if ((o.glow || 0) > 0.05) {
      ctx.save(); ctx.clip(robeG.path);
      drawVeins(veinGeo('ppv' + (kn > 0.5 ? 'k' : ''), [[0, -300, 1.6, 160], [-30, -240, 2.0, 150], [30, -240, 1.2, 150]], { seed: 3 }), 3, o.glow, E.pulse ?? 1);
      ctx.restore();
    }
    // arms (sleeves are tongues; hands are small pale lozenges)
    const arms = o.arms || 'down';
    const sleeve = (sx, ang, len) => {
      push(sx * 40, -280, -sx * ang);
      region('pp.sleeve', () => ({ out: [[-16, -8, 1], [16, -8, 1], [24, 140], [-20, 146]], mattes: [{ pts: [[-12, 0], [-14, 140]], w: 12, a: 0.25 }] }), [robe2], { lw: 4.5 });
      push(2, 150); region('pp.hand', () => ({ out: arcPts(0, 0, 12, 15, 0, TAU, 12).slice(0, -1) }), [o.skin || '#f0d8c4'], { lw: 3.5, keep: true }); pop();
      pop();
    };
    if (arms === 'raise') { sleeve(-1, 2.7, 1); sleeve(1, 2.7, 1); }
    else if (arms === 'reach') { sleeve(-1, 2.2, 1); sleeve(1, 2.2, 1); }
    else if (arms === 'pray') { sleeve(-1, -0.42, 1); sleeve(1, -0.42, 1); }
    else if (arms === 'point') { sleeve(-1, 0.12, 1); sleeve(1, 1.65, 1); }
    else if (arms === 'cover') { sleeve(-1, -2.7, 1); sleeve(1, -2.7, 1); }
    else if (arms === 'cower') { sleeve(-1, 2.9, 1); sleeve(1, -2.6, 1); }
    else { sleeve(-1, 0.14, 1); sleeve(1, 0.14, 1); }
    // head: face (or the back of the hood), hood or hair, crown
    push(o.headX || 0, -350, o.tilt || 0);
    if (k.halo || o.halo) {
      const hg = tessRadial('pp.halo', 0, -10, 0, 74, 1, 12, {});
      glassField(hg, (x, y, c) => (c.seed % 2 ? '#ffe070' : '#ffc840'), { leadW: 4 });
      const hr = new Path2D(); hr.arc(0, -10, 74, 0, TAU); lead(hr, 6);
    }
    if (k.hood) {
      region('pp.hood.' + (back ? 'b' : 'f'), () => ({ out: [[0, -86, 1], [30, -64], [44, -20], [50, 40, 1], [-50, 40, 1], [-44, -20], [-30, -64]], mattes: [{ pts: [[-30, -40], [0, -54], [30, -40]], w: 26, a: 0.35 }] }), [o.hoodCol || robe], { lw: 5 });
    } else if (!back) {
      region('pp.hair', () => ({ out: [[-34, 10], [-38, -30], [-26, -56], [0, -64], [26, -56], [38, -30], [34, 10], [24, -24], [-24, -24]] }), [o.hair || '#4a3424'], { lw: 4.5, keep: true });
    } else {
      region('pp.hairback', () => ({ out: [[0, 40], [26, 26], [34, -6], [30, -40], [0, -60], [-30, -40], [-34, -6], [-26, 26]], strands: [[[-14, -50], [-20, 0], [-16, 36]], [[0, -56], [0, 0], [0, 38]], [[14, -50], [20, 0], [16, 36]]] }), [o.hair || '#4a3424'], { lw: 4.5, keep: true, strandCol: 'rgba(20,10,6,0.4)' });
    }
    if (!back) {
      region('pp.face', () => ({ out: [[0, 34], [20, 22], [27, -2], [24, -30], [0, -40], [-24, -30], [-27, -2], [-20, 22]] }), [o.skin || (k.pale ? '#c8d0dc' : '#f0d8c4')], {
        lw: 4.2, keep: true,
        paint: () => {
          const lk = (o.look || 0) * 3, glow = o.glow || 0;
          if (k.hood) matteEll(0, -26, 30, 16, 0.55);
          for (const sx of [-1, 1]) {
            if (glow > 0.05) {
              ctx.save(); ctx.globalCompositeOperation = 'lighter';
              const gg = ctx.createRadialGradient(sx * 10 + lk, -4, 0, sx * 10 + lk, -4, 9);
              gg.addColorStop(0, `rgba(255,60,40,${glow})`); gg.addColorStop(1, 'rgba(255,0,0,0)');
              ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(sx * 10 + lk, -4, 9, 0, TAU); ctx.fill(); ctx.restore();
            }
            ctx.fillStyle = glow > 0.4 ? '#ff5038' : 'rgba(42,20,12,0.9)';
            ctx.beginPath(); ctx.ellipse(sx * 10 + lk, -4, 3.6, 2.4, 0, 0, TAU); ctx.fill();
            brush([[sx * 4, -13], [sx * 16, -15 - (o.brow || 0) * 2]], 2.6, { a: 0.4, b: 0.1 });
          }
          brush([[-2, -2], [-3, 8], [1, 10]], 1.8);
          if (o.mouth === 'open') { ctx.fillStyle = 'rgba(52,8,12,0.9)'; ctx.beginPath(); ctx.ellipse(0, 20, 6, 5, 0, 0, TAU); ctx.fill(); }
          else brush([[-7, 19], [0, 18 + (o.frown || 0) * 2.5], [7, 19]], 2.2);
        },
      });
      if (k.hood) region('pp.hoodrim', () => ({ out: [[0, -62, 1], [26, -46], [36, -10], [40, 38, 1], [30, 40, 1], [26, -10], [18, -38], [0, -48, 1], [-18, -38], [-26, -10], [-30, 40, 1], [-40, 38, 1], [-36, -10], [-26, -46]] }), [robe2], { lw: 4 });
    }
    if (k.crown || o.crown) glassSet('pp.crown', () => [[[-30, -52, 1], [-30, -88, 1], [-18, -70, 1], [0, -96, 1], [18, -70, 1], [30, -88, 1], [30, -52, 1]].map((p) => [p[0], p[1]])], ['#ffcc3a'], { lw: 4, keep: true, glow: 0.3, glowR: 30 });
    pop();
  });
  pop();
}
