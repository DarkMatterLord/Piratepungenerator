// 2D renderer: projects the 3D puppet scene into flat shapes and paints them
// with a configurable "look". Styles (styles.js) are built on top of this.
window.R2D = (() => {
  const { v3, clamp, lerp, hex, rgb, mix, hash, rng, TAU, scale, lum, noise2 } = U;
  const MATC = {};
  for (const k in RIG.MATS) MATC[k] = hex(RIG.MATS[k]);

  // ---------------- scratch canvases ----------------
  const pool = {};
  function scratch(name, w, h) {
    let c = pool[name];
    if (!c) {
      c = pool[name] = document.createElement('canvas');
      c.getContext('2d', { willReadFrequently: true });
    }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
    x.imageSmoothingEnabled = true; x.shadowBlur = 0; x.shadowColor = 'transparent';
    return [c, x];
  }

  // ---------------- camera ----------------
  function camera(cam, W, H) {
    const dist = cam.h * 1.7;
    const tgt = [cam.tx, cam.ty, 0];
    const o = cam.orbit || 0;
    const pos = [tgt[0] + Math.sin(o) * dist, tgt[1] + (cam.elev || 0), Math.cos(o) * dist];
    const f = v3.norm(v3.sub(tgt, pos));
    let r = v3.norm(v3.cross(f, [0, 1, 0]));
    let u = v3.cross(r, f);
    if (cam.roll) {
      const c = Math.cos(cam.roll), s = Math.sin(cam.roll);
      const r2 = v3.add(v3.mul(r, c), v3.mul(u, s));
      u = v3.add(v3.mul(u, c), v3.mul(r, -s)); r = r2;
    }
    const F = (H * dist) / cam.h;
    const fovY = 2 * Math.atan(cam.h / 2 / dist);
    function proj(p) {
      const vx = p[0] - pos[0], vy = p[1] - pos[1], vz = p[2] - pos[2];
      const z = vx * f[0] + vy * f[1] + vz * f[2];
      const x = vx * r[0] + vy * r[1] + vz * r[2];
      const y = vx * u[0] + vy * u[1] + vz * u[2];
      const zz = Math.max(z, 0.02);
      return [W / 2 + (x / zz) * F, H / 2 - (y / zz) * F, z];
    }
    // Jacobian rows of the projection at camera-space point q.
    function jac(p) {
      const v = v3.sub(p, pos);
      const z = Math.max(v3.dot(v, f), 0.02), x = v3.dot(v, r), y = v3.dot(v, u);
      const k = F / z;
      return [v3.mul(v3.sub(r, v3.mul(f, x / z)), k), v3.mul(v3.sub(u, v3.mul(f, y / z)), -k)];
    }
    return { pos, f, r, u, F, W, H, fovY, dist, tgt, proj, jac, cam };
  }

  // ---------------- primitive -> 2D shape ----------------
  function ellPts(cx, cy, rx, ry, rot, n) {
    const pts = new Array(n), c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      pts[i] = [cx + x * c - y * s, cy + x * s + y * c];
    }
    return pts;
  }
  const nPts = (r) => clamp(Math.round(r / 2.2), 10, 44);
  function capPoly(a, b, ra, rb) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d + Math.min(ra, rb) <= Math.max(ra, rb)) {
      const [c, r] = ra > rb ? [a, ra] : [b, rb];
      return ellPts(c[0], c[1], r, r, 0, nPts(r));
    }
    const pts = [];
    const n = clamp(Math.round(Math.max(ra, rb) / 2), 8, 24);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU;
      pts.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra], [b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]);
    }
    return U.hull(pts);
  }
  function projPrim(p, C) {
    let sh;
    if (p.t === 'sph' || p.t === 'ell') {
      const q = C.proj(p.c);
      if (q[2] < 0.15) return null;
      if (p.t === 'sph') {
        const r = (p.r * C.F) / q[2];
        sh = { kind: 'ell', cx: q[0], cy: q[1], rx: r, ry: r, rot: 0 };
      } else {
        const [J0, J1] = C.jac(p.c);
        let a = 0, bb = 0, d = 0;
        for (let i = 0; i < 3; i++) {
          const ax = [p.R[i] * p.rad[i], p.R[3 + i] * p.rad[i], p.R[6 + i] * p.rad[i]];
          const m0 = v3.dot(J0, ax), m1 = v3.dot(J1, ax);
          a += m0 * m0; bb += m0 * m1; d += m1 * m1;
        }
        const tr = (a + d) / 2, df = Math.sqrt(((a - d) / 2) ** 2 + bb * bb);
        const rot = 0.5 * Math.atan2(2 * bb, a - d);
        sh = { kind: 'ell', cx: q[0], cy: q[1], rx: Math.sqrt(tr + df), ry: Math.sqrt(Math.max(1e-6, tr - df)), rot };
      }
      sh.depth = q[2];
      sh.poly = ellPts(sh.cx, sh.cy, sh.rx, sh.ry, sh.rot, nPts(Math.max(sh.rx, sh.ry)));
    } else if (p.t === 'cap') {
      const qa = C.proj(p.a), qb = C.proj(p.b);
      if (qa[2] < 0.15 || qb[2] < 0.15) return null;
      const ra = (p.ra * C.F) / qa[2], rb = (p.rb * C.F) / qb[2];
      sh = { kind: 'cap', a: qa, b: qb, ra, rb, depth: (qa[2] + qb[2]) / 2 };
      sh.poly = capPoly(qa, qb, ra, rb);
    } else if (p.t === 'box' || p.t === 'cyl') {
      const pts = [];
      const qc = C.proj(p.c);
      if (qc[2] < 0.15) return null;
      if (p.t === 'box') {
        const hi = p.h.map((x) => Math.max(0, x - p.rr));
        const rpx = (p.rr * C.F) / qc[2];
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
          const l = [sx * hi[0], sy * hi[1], sz * hi[2]];
          const w = v3.add(p.c, [p.R[0] * l[0] + p.R[1] * l[1] + p.R[2] * l[2], p.R[3] * l[0] + p.R[4] * l[1] + p.R[5] * l[2], p.R[6] * l[0] + p.R[7] * l[1] + p.R[8] * l[2]]);
          const q = C.proj(w);
          if (rpx > 0.6) for (let i = 0; i < 6; i++) pts.push([q[0] + Math.cos((i / 6) * TAU) * rpx, q[1] + Math.sin((i / 6) * TAU) * rpx]);
          else pts.push([q[0], q[1]]);
        }
      } else {
        const n = 22;
        for (const sy of [-1, 1]) for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          const l = [Math.cos(a) * p.r, sy * p.hh, Math.sin(a) * p.r];
          const w = v3.add(p.c, [p.R[0] * l[0] + p.R[1] * l[1] + p.R[2] * l[2], p.R[3] * l[0] + p.R[4] * l[1] + p.R[5] * l[2], p.R[6] * l[0] + p.R[7] * l[1] + p.R[8] * l[2]]);
          const q = C.proj(w);
          pts.push([q[0], q[1]]);
        }
      }
      sh = { kind: 'poly', depth: qc[2], cx: qc[0], cy: qc[1] };
      sh.poly = U.hull(pts);
    } else return null;
    sh.prim = p; sh.mat = p.mat; sh.bias = p.bias || 0; sh.deco = p.deco || 0; sh.chain = p.chain; sh.flat = p.flat; sh.soft = p.soft;
    return sh;
  }
  function bounds(poly) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return [x0, y0, x1, y1];
  }

  // Build depth-sorted groups of shapes for the current frame.
  function buildGroups(S, C) {
    const groups = [];
    for (const g of S.groups) {
      const shapes = [];
      const chains = {};
      for (const p of g.prims) {
        if (p.only3d) continue;
        const sh = projPrim(p, C);
        if (!sh) continue;
        if (sh.chain && sh.kind === 'cap') {
          const ch = chains[sh.chain];
          if (ch) {
            ch.pts.push([sh.b[0], sh.b[1]]); ch.rads.push(sh.rb); ch.polys.push(sh.poly);
            ch.depth = (ch.depth * (ch.pts.length - 2) + sh.depth) / (ch.pts.length - 1);
            continue;
          }
          const limb = { ...sh, kind: 'limb', pts: [[sh.a[0], sh.a[1]], [sh.b[0], sh.b[1]]], rads: [sh.ra, sh.rb], polys: [sh.poly] };
          chains[sh.chain] = limb;
          shapes.push(limb);
          continue;
        }
        shapes.push(sh);
      }
      if (!shapes.length) continue;
      for (const s of shapes) {
        s.bb = bounds(s.polys ? s.polys.flat() : s.poly);
        s.key = s.depth - s.bias;
      }
      shapes.sort((a, b) => b.key - a.key);
      let depth = 0;
      for (const s of shapes) depth += s.depth;
      depth /= shapes.length;
      if (g.name === 'podium' || g.name === 'bench') depth += 0.15;
      if (g.name === 'pond') depth += 50;
      groups.push({ name: g.name, bg: g.bg, depth, shapes });
    }
    groups.sort((a, b) => b.depth - a.depth);
    return groups;
  }

  // ---------------- paths ----------------
  function polyPath(poly, wob, seed, F) {
    const p = new Path2D();
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      let [x, y] = poly[i];
      if (wob) {
        x += noise2(x * 0.03, y * 0.03 + seed * 7.1, seed) * wob;
        y += noise2(x * 0.03 + 19.3, y * 0.03, seed + 3) * wob;
      }
      i ? p.lineTo(x, y) : p.moveTo(x, y);
    }
    p.closePath();
    return p;
  }
  function limbPath(sh) {
    const p = new Path2D();
    sh.pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    return p;
  }
  function shapePolys(sh) {
    return sh.kind === 'limb' ? sh.polys : [sh.poly];
  }

  // ---------------- colors ----------------
  function baseCol(sh, S) {
    let c = MATC[sh.mat] || [255, 0, 255];
    return c;
  }

  // ---------------- textures ----------------
  const tex = {};
  function noiseTex(name, w, h, fn) {
    if (tex[name]) return tex[name];
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const id = x.createImageData(w, h);
    const R = rng(name.length * 977 + w);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const [r, g, b, a] = fn(i, j, R);
      const o = (j * w + i) * 4;
      id.data[o] = r; id.data[o + 1] = g; id.data[o + 2] = b; id.data[o + 3] = a;
    }
    x.putImageData(id, 0, 0);
    tex[name] = c;
    return c;
  }
  const paperTex = () => noiseTex('paper', 256, 256, (i, j, R) => {
    const n = 0.5 * noise2(i * 0.05, j * 0.05, 1) + 0.3 * noise2(i * 0.2, j * 0.2, 2) + 0.2 * (R() * 2 - 1);
    const v = 128 + n * 40;
    return [v, v, v, 255];
  });
  const grainTex = (k) => noiseTex('grain' + k, 256, 256, (i, j, R) => {
    const v = R() * 255;
    return [v, v, v, 255];
  });
  const canvasTex = () => noiseTex('canvasweave', 128, 128, (i, j, R) => {
    const v = 128 + 30 * Math.sin(i * 1.6) * Math.sin(j * 1.6) + 18 * (R() - 0.5);
    return [v, v, v, 255];
  });
  function overlayTex(ctx, t, op, alpha, scl = 1, off = [0, 0]) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.save();
    ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha;
    const pat = ctx.createPattern(t, 'repeat');
    const m = new DOMMatrix().translateSelf(off[0], off[1]).scaleSelf(scl, scl);
    pat.setTransform(m);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ---------------- background ----------------
  function horizonY(C) {
    const fh = v3.norm([C.f[0], 0, C.f[2]]);
    return C.proj([C.pos[0] + fh[0] * 5000, 0, C.pos[2] + fh[2] * 5000])[1];
  }
  function skyCols(S, L) {
    const sky = S.sky;
    const p = (c, role) => (L.pal ? L.pal(hex(c), role) : hex(c));
    return { top: p(sky.top, 'sky'), mid: p(sky.mid, 'sky'), hor: p(sky.hor, 'sky'), sun: p(sky.sunCol, 'sun'), ground: p(sky.ground, 'ground') };
  }
  function drawSky(ctx, F, L) {
    const { W, H, S, C } = F;
    const hy = horizonY(C);
    const k = skyCols(S, L);
    if (L.sky === 'flat') {
      ctx.fillStyle = rgb(mix(k.mid, k.top, 0.4));
      ctx.fillRect(0, 0, W, H);
    } else {
      const g = ctx.createLinearGradient(0, Math.min(0, hy - H), 0, hy);
      g.addColorStop(0, rgb(k.top)); g.addColorStop(0.62, rgb(k.mid)); g.addColorStop(1, rgb(k.hor));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    // stars
    if (S.sky.night && L.stars !== false) {
      const R = rng(42);
      ctx.fillStyle = rgb(L.pal ? L.pal([255, 255, 240], 'fx') : [255, 255, 240]);
      for (let i = 0; i < 90; i++) {
        const x = R() * W, y = R() * hy * 0.95, tw = 0.5 + 0.5 * Math.sin(F.t * 3 + i);
        ctx.globalAlpha = 0.4 + 0.6 * tw;
        ctx.fillRect(x, y, 1.5 * F.u, 1.5 * F.u);
      }
      ctx.globalAlpha = 1;
    }
    // sun / moon
    const sd = S.sky.sun;
    const sp = C.proj(v3.add(C.pos, v3.mul(v3.norm(sd), 900)));
    if (sp[2] > 0 && L.sun !== false) {
      const rr = S.sky.sunSize * H * 0.045;
      if (L.sunGlow !== false) {
        const g = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], rr * 5);
        g.addColorStop(0, rgb(k.sun, 0.55)); g.addColorStop(1, rgb(k.sun, 0));
        ctx.fillStyle = g;
        ctx.fillRect(sp[0] - rr * 5, sp[1] - rr * 5, rr * 10, rr * 10);
      }
      ctx.fillStyle = rgb(k.sun);
      ctx.beginPath(); ctx.arc(sp[0], sp[1], rr, 0, TAU); ctx.fill();
      if (L.lw && L.sunLine) { ctx.lineWidth = L.lw * F.u; ctx.strokeStyle = rgb(L.lc || [20, 20, 20]); ctx.stroke(); }
    }
    // clouds (far away, world anchored)
    if (L.clouds !== false) {
      const cc = L.pal ? L.pal(S.sky.night ? [70, 66, 120] : [255, 255, 255], 'cloud') : (S.sky.night ? [70, 66, 120] : [255, 255, 255]);
      const clouds = [[-22, 17, -70], [6, 21, -80], [30, 15, -75], [-48, 22, -90], [55, 19, -95]];
      clouds.forEach(([x, y, z], i) => {
        x += F.t * 0.35;
        const blobs = [[0, 0, 3.2], [3, -0.5, 2.6], [-3, -0.6, 2.4], [1.4, 1.4, 2.4], [-1.5, 1.0, 2.2]];
        ctx.fillStyle = rgb(cc, S.sky.night ? 0.6 : 0.92);
        ctx.beginPath();
        for (const [bx, by, br] of blobs) {
          const q = C.proj([x + bx, y + by, z]);
          if (q[2] <= 0) continue;
          const r = (br * C.F) / q[2];
          ctx.moveTo(q[0] + r, q[1]);
          ctx.arc(q[0], q[1], r, 0, TAU);
        }
        ctx.fill();
        if (L.lw && L.cloudLine) { ctx.lineWidth = L.lw * 0.6 * F.u; ctx.strokeStyle = rgb(L.lc || [30, 30, 30], 0.5); ctx.stroke(); }
      });
    }
    return hy;
  }
  function groundPoly(C, x0, x1, z0, z1) {
    return [C.proj([x0, 0, z0]), C.proj([x1, 0, z0]), C.proj([x1, 0, z1]), C.proj([x0, 0, z1])].map((q) => [q[0], q[1]]);
  }
  function drawGround(ctx, F, L) {
    const { W, H, S, C } = F;
    const hy = horizonY(C);
    const k = skyCols(S, L);
    const near = C.pos[2] - 0.6;
    ctx.fillStyle = rgb(k.ground);
    ctx.fillRect(0, hy - 1, W, H - hy + 1);
    if (L.stripes !== false) {
      const dark = scale(k.ground, 0.9);
      ctx.fillStyle = rgb(dark);
      for (let i = -40; i < 40; i++) {
        const x0 = i * 1.6;
        const poly = groundPoly(C, x0, x0 + 0.8, near, -400);
        ctx.beginPath(); poly.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.fill();
      }
    }
    // horizon haze
    if (L.haze !== false) {
      const g = ctx.createLinearGradient(0, hy - H * 0.02, 0, hy + H * 0.06);
      g.addColorStop(0, rgb(k.hor, 0.0)); g.addColorStop(0.3, rgb(k.hor, 0.55)); g.addColorStop(1, rgb(k.hor, 0));
      ctx.fillStyle = g; ctx.fillRect(0, hy - H * 0.02, W, H * 0.08);
    }
    // pond
    const P = S.pond;
    const pts = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU;
      const q = C.proj([P.c[0] + Math.cos(a) * P.rx * (1 + 0.05 * Math.sin(a * 3)), 0.002, P.c[2] + Math.sin(a) * P.rz]);
      pts.push([q[0], q[1]]);
    }
    const water = L.pal ? L.pal(S.sky.night ? [40, 60, 120] : [92, 160, 214], 'water') : (S.sky.night ? [40, 60, 120] : [92, 160, 214]);
    const bank = L.pal ? L.pal([120, 96, 60], 'shape') : [120, 96, 60];
    ctx.lineJoin = 'round';
    ctx.fillStyle = rgb(bank);
    ctx.beginPath(); pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.save(); ctx.translate(0, 2 * F.u); ctx.fill(); ctx.restore();
    ctx.fillStyle = rgb(water);
    ctx.fill();
    if (L.lw) { ctx.lineWidth = L.lw * 0.7 * F.u; ctx.strokeStyle = rgb(L.lc || scale(water, 0.5)); ctx.stroke(); }
    // reflections
    ctx.save(); ctx.clip();
    const sky = skyCols(S, L);
    ctx.strokeStyle = rgb(mix(water, [255, 255, 255], 0.45), 0.7); ctx.lineWidth = 2 * F.u;
    for (let i = 0; i < 6; i++) {
      const q = C.proj([P.c[0] - 1 + i * 0.45, 0.003, P.c[2] - 0.4 + (i % 3) * 0.3]);
      const w = (0.25 * C.F) / q[2];
      ctx.beginPath(); ctx.ellipse(q[0], q[1], w * (0.8 + 0.2 * Math.sin(F.t * 2 + i)), w * 0.18, 0, 0, TAU); ctx.stroke();
    }
    if (S.sky === STORY.SKIES.sunset) {
      const sp = C.proj(v3.add(C.pos, v3.mul(v3.norm(S.sky.sun), 900)));
      const g = ctx.createLinearGradient(0, hy, 0, H);
      g.addColorStop(0, rgb(sky.sun, 0.8)); g.addColorStop(1, rgb(sky.sun, 0));
      ctx.fillStyle = g;
      for (let i = 0; i < 7; i++) {
        const w = H * 0.05 * (1 - i / 9);
        ctx.fillRect(sp[0] - w / 2 + Math.sin(F.t * 3 + i) * 4, hy + i * H * 0.025, w, H * 0.012);
      }
    }
    ctx.restore();
  }
  function drawShadows(ctx, F, L) {
    if (L.groundShadows === false) return;
    const { S, C } = F;
    for (const sh of S.shadows) {
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        const q = C.proj([sh.c[0] + Math.cos(a) * sh.rx, sh.c[1] + 0.004, sh.c[2] + Math.sin(a) * sh.rz]);
        i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      }
      ctx.fillStyle = L.shadowCol || `rgba(0,0,0,${0.22 * sh.a})`;
      ctx.fill();
    }
  }

  // ---------------- shape painting ----------------
  function lineCol(L, col) {
    if (L.lc === 'darker') return scale(col, 0.45);
    return L.lc || [24, 20, 28];
  }
  // Default shape painter: fill + outline, with optional wobble/jitter.
  function paintShape(ctx, sh, col, F, L, gi, si) {
    const u = F.u;
    const lw = sh.soft ? 0 : (sh.deco ? (L.decoLw ?? 0.45) : 1) * (L.lw || 0) * u;
    const wob = (L.wobble || 0) * u;
    const seed = (L.wobbleFixed ? 0 : F.hold * 13) + gi * 7 + si;
    const fillMode = L.fill || 'flat';
    if (sh.kind === 'limb' && !wob && (fillMode === 'flat' || fillMode === 'shade' || fillMode === 'cel')) {
      const path = limbPath(sh);
      const w = (sh.rads.reduce((a, b) => a + b, 0) / sh.rads.length) * 2;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (lw > 0) { ctx.strokeStyle = rgb(lineCol(L, col)); ctx.lineWidth = w + lw * 2; ctx.stroke(path); }
      ctx.strokeStyle = rgb(col); ctx.lineWidth = w; ctx.stroke(path);
      if (fillMode !== 'flat') {
        ctx.save(); ctx.translate(-w * 0.18, -w * 0.18);
        ctx.strokeStyle = rgb(mix(col, [255, 255, 255], 0.25), 0.6); ctx.lineWidth = w * 0.3; ctx.stroke(path);
        ctx.restore();
      }
      return;
    }
    for (const poly of shapePolys(sh)) {
      const path = polyPath(poly, wob, seed, F);
      if (fillMode !== 'none') {
        if (fillMode === 'shade' && sh.bb) {
          const [x0, y0, x1, y1] = sh.bb;
          const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.max(x1 - x0, y1 - y0) * 0.62;
          const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r);
          g.addColorStop(0, rgb(mix(col, [255, 255, 255], 0.35)));
          g.addColorStop(0.55, rgb(col));
          g.addColorStop(1, rgb(scale(col, 0.62)));
          ctx.fillStyle = g;
        } else ctx.fillStyle = rgb(col);
        ctx.fill(path);
        if (fillMode === 'cel' && !sh.deco) {
          ctx.save(); ctx.clip(path);
          const [x0, y0, x1, y1] = sh.bb;
          const d = Math.max(3, (x1 - x0) * 0.16);
          ctx.translate(-d, -d);
          ctx.fillStyle = rgb(scale(col, 0.72));
          ctx.fillRect(x0 - d, y0 - d, x1 - x0 + 4 * d, y1 - y0 + 4 * d);
          ctx.translate(-0, -0);
          ctx.fillStyle = rgb(col);
          ctx.fill(path);
          ctx.restore();
        }
      }
      if (lw > 0) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = lw;
        ctx.strokeStyle = rgb(lineCol(L, col), L.la ?? 1);
        ctx.stroke(path);
      }
    }
    // material details
    if (L.details !== false && !wob) detail(ctx, sh, col, F, L);
  }
  // Extra 2D detail for special materials: flags and the turtle seal.
  function detail(ctx, sh, col, F, L) {
    const p = sh.prim;
    if (p.flag) {
      const path = polyPath(sh.poly);
      ctx.save(); ctx.clip(path);
      const [x0, y0, x1, y1] = sh.bb;
      const w = x1 - x0, h = y1 - y0;
      const pal = (c) => (L.pal ? L.pal(c, 'shape') : c);
      ctx.fillStyle = rgb(pal([245, 245, 245]));
      ctx.fillRect(x0, y0, w, h);
      ctx.fillStyle = rgb(pal([178, 34, 52]));
      for (let i = 0; i < 7; i++) ctx.fillRect(x0, y0 + (i * 2 * h) / 13, w, h / 13);
      ctx.fillStyle = rgb(pal([60, 59, 110]));
      ctx.fillRect(x0, y0, w * 0.42, h * (7 / 13));
      ctx.restore();
    }
    if (p.seal) {
      const [x0, y0, x1, y1] = sh.bb;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = (x1 - x0) / 2;
      const pal = (c) => (L.pal ? L.pal(c, 'shape') : c);
      ctx.fillStyle = rgb(pal([30, 50, 110]));
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, TAU); ctx.fill();
      // little turtle emblem
      ctx.fillStyle = rgb(pal([226, 185, 74]));
      ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.05, r * 0.42, r * 0.3, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.02, r * 0.13, 0, TAU); ctx.fill();
      for (const lx of [-0.3, 0.25]) { ctx.beginPath(); ctx.arc(cx + lx * r, cy + r * 0.12, r * 0.09, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = rgb(pal([226, 185, 74])); ctx.lineWidth = r * 0.06;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.88, 0, TAU); ctx.stroke();
    }
  }

  // Draw all groups with a look. painter(ctx, sh, col, F, L, gi, si) can be overridden.
  function drawGroups(ctx, F, L, painter = L.painter || paintShape) {
    const { S } = F;
    F.groups.forEach((g, gi) => {
      const gj = L.jitter ? [(hash(gi, F.hold, 1) - 0.5) * 2 * L.jitter * F.u, (hash(gi, F.hold, 2) - 0.5) * 2 * L.jitter * F.u] : null;
      if (gj) { ctx.save(); ctx.translate(gj[0], gj[1]); }
      if (L.dropShadow && !g.bg) {
        ctx.save();
        ctx.shadowColor = L.dropShadow.col || 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = L.dropShadow.blur * F.u; ctx.shadowOffsetX = L.dropShadow.dx * F.u; ctx.shadowOffsetY = L.dropShadow.dy * F.u;
      }
      g.shapes.forEach((sh, si) => {
        let col = baseCol(sh, S);
        if (L.pal) col = L.pal(col, 'shape', sh.mat);
        const fade = L.bgFade ?? 0.2;
        if (g.bg && fade) col = mix(col, skyCols(S, L).hor, fade);
        painter(ctx, sh, col, F, L, gi, si, g);
      });
      if (L.dropShadow && !g.bg) ctx.restore();
      if (gj) ctx.restore();
    });
  }

  // ---------------- overlays / effects ----------------
  function heartPath(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, 0.35);
    ctx.bezierCurveTo(-0.1, 0.25, -0.55, 0.05, -0.5, -0.25);
    ctx.bezierCurveTo(-0.45, -0.55, -0.08, -0.55, 0, -0.25);
    ctx.bezierCurveTo(0.08, -0.55, 0.45, -0.55, 0.5, -0.25);
    ctx.bezierCurveTo(0.55, 0.05, 0.1, 0.25, 0, 0.35);
    ctx.closePath();
    ctx.restore();
  }
  function starPath(ctx, x, y, r, rot, n = 4, inner = 0.32) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * TAU, rr = i % 2 ? r * inner : r;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  function burstPath(ctx, x, y, rx, ry, n, seed) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU;
      const k = i % 2 ? 0.72 : 1 + 0.12 * hash(i, seed);
      const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  // Fonts per look: title / ui.
  function font(L, px, kind = 'title') {
    const fam = (kind === 'title' ? L.titleFont : L.uiFont) || "'Luckiest Guy', 'Inter', sans-serif";
    return `${px}px ${fam}`;
  }
  function fxCol(L, c) { return L.pal ? L.pal(c, 'fx') : c; }
  function drawFx(ctx, F, L) {
    const { S, C, W, H, u } = F;
    const lw = Math.max(1.5, (L.fxLw ?? L.lw ?? 3) * u);
    const lc = rgb(L.fxLc || lineCol(L, [0, 0, 0]));
    const stroke = L.fxLine !== false && (L.fxLw ?? L.lw ?? 3) > 0;
    for (const e of S.fx) {
      ctx.save();
      ctx.globalAlpha = clamp(e.a ?? 1);
      ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = lc;
      if (e.type === 'heart') {
        const q = C.proj(e.pos); if (q[2] <= 0) { ctx.restore(); continue; }
        const s = (e.size * C.F) / q[2];
        heartPath(ctx, q[0], q[1], s, e.rot);
        ctx.fillStyle = rgb(fxCol(L, [236, 46, 78])); ctx.fill();
        if (stroke) ctx.stroke();
        if (L.fxShine !== false) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(q[0] - s * 0.22, q[1] - s * 0.22, s * 0.09, s * 0.06, -0.6, 0, TAU); ctx.fill(); }
      } else if (e.type === 'sparkle' || e.type === 'firefly') {
        const q = C.proj(e.pos); if (q[2] <= 0) { ctx.restore(); continue; }
        const s = (e.size * C.F) / q[2];
        if (e.type === 'firefly') {
          const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], s * 3);
          const c = fxCol(L, [255, 240, 140]);
          g.addColorStop(0, rgb(c, 1)); g.addColorStop(1, rgb(c, 0));
          ctx.fillStyle = g; ctx.fillRect(q[0] - s * 3, q[1] - s * 3, s * 6, s * 6);
        } else {
          starPath(ctx, q[0], q[1], s, e.rot || 0);
          ctx.fillStyle = rgb(fxCol(L, [255, 236, 120])); ctx.fill();
          if (stroke) { ctx.lineWidth = lw * 0.6; ctx.stroke(); }
        }
      } else if (e.type === 'symbol' || e.type === 'note') {
        const q = C.proj(e.pos); if (q[2] <= 0) { ctx.restore(); continue; }
        const s = (e.size * C.F) / q[2];
        if (s < 1) { ctx.restore(); continue; }
        ctx.font = font(L, s | 0);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const txt = e.type === 'note' ? '♫' : e.text;
        if (e.type === 'note') ctx.font = `${s | 0}px 'DejaVu Sans', sans-serif`;
        ctx.fillStyle = rgb(fxCol(L, e.type === 'note' ? [60, 60, 160] : e.text === '!' ? [235, 50, 50] : [255, 255, 255]));
        if (stroke) { ctx.lineWidth = lw * 1.2; ctx.strokeText(txt, q[0], q[1]); }
        ctx.fillText(txt, q[0], q[1]);
      } else if (e.type === 'rays') {
        const q = C.proj(e.pos);
        const R = Math.hypot(W, H);
        ctx.globalAlpha *= L.raysA ?? 0.3;
        ctx.fillStyle = rgb(fxCol(L, [255, 236, 150]));
        for (let i = 0; i < 16; i++) {
          const a = e.rot + (i / 16) * TAU;
          ctx.beginPath(); ctx.moveTo(q[0], q[1]);
          ctx.lineTo(q[0] + Math.cos(a) * R, q[1] + Math.sin(a) * R);
          ctx.lineTo(q[0] + Math.cos(a + TAU / 40) * R, q[1] + Math.sin(a + TAU / 40) * R);
          ctx.fill();
        }
      } else if (e.type === 'crumb') {
        const q = C.proj(e.pos); const s = (e.size * C.F) / q[2];
        ctx.fillStyle = rgb(fxCol(L, [150, 210, 90]));
        ctx.beginPath(); ctx.arc(q[0], q[1], s, 0, TAU); ctx.fill();
      } else if (e.type === 'confetti') {
        const q = C.proj(e.pos); const s = (e.size * C.F) / q[2];
        ctx.translate(q[0], q[1]); ctx.rotate(e.rot); ctx.scale(1, Math.cos(e.rot * 1.7));
        ctx.fillStyle = rgb(fxCol(L, hex(e.col)));
        ctx.fillRect(-s, -s * 0.5, s * 2, s);
      } else if (e.type === 'trail') {
        const a = C.proj(e.from), b = C.proj(v3.lerp(e.from, e.to, e.f));
        const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
        const c = fxCol(L, [255, 220, 150]);
        g.addColorStop(0, rgb(c, 0)); g.addColorStop(1, rgb(c, 1));
        ctx.strokeStyle = g; ctx.lineWidth = 3 * u;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        ctx.fillStyle = rgb(c); ctx.beginPath(); ctx.arc(b[0], b[1], 4 * u, 0, TAU); ctx.fill();
      } else if (e.type === 'firework') {
        const c = fxCol(L, hex(e.col));
        const pts = fireworkPoints(e);
        ctx.globalCompositeOperation = L.fxAdd === false ? 'source-over' : 'lighter';
        const cq = C.proj(e.pos);
        for (const p of pts) {
          const q = C.proj(p);
          const r = Math.max(1.2, (0.07 * C.F) / q[2]) * (1 - e.f * 0.5);
          ctx.strokeStyle = rgb(c, 0.5); ctx.lineWidth = r * 0.7;
          ctx.beginPath(); ctx.moveTo(lerp(cq[0], q[0], 0.82), lerp(cq[1], q[1], 0.82) - e.f * 6 * u); ctx.lineTo(q[0], q[1]); ctx.stroke();
          ctx.fillStyle = rgb(mix(c, [255, 255, 255], 0.4));
          ctx.beginPath(); ctx.arc(q[0], q[1] + e.f * e.f * 30 * u, r, 0, TAU); ctx.fill();
        }
      } else if (e.type === 'flash') {
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(255,255,255,${e.strength * 0.55})`;
        ctx.fillRect(0, 0, W, H);
        const x = e.x * W, y = e.y * H;
        const g = ctx.createRadialGradient(x, y, 0, x, y, H * 0.35);
        g.addColorStop(0, `rgba(255,255,255,${e.strength})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        starPath(ctx, x, y, H * 0.12 * e.strength, 0.3, 4, 0.12);
        ctx.fillStyle = `rgba(255,255,255,${e.strength})`; ctx.fill();
      } else if (e.type === 'title') {
        const s = H * 0.13 * e.scale;
        ctx.font = font(L, s | 0);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        e.lines.forEach((ln, i) => {
          const y = H * e.y + (i - (e.lines.length - 1) / 2) * s * 1.05;
          ctx.lineWidth = s * 0.16; ctx.strokeStyle = rgb(fxCol(L, [40, 30, 80]));
          if (L.titleStroke !== false) ctx.strokeText(ln, W / 2, y + s * 0.06);
          ctx.fillStyle = rgb(fxCol(L, i ? [80, 200, 90] : [255, 214, 70]));
          ctx.fillText(ln, W / 2, y);
        });
      } else if (e.type === 'burst') {
        const s = H * 0.11 * e.scale;
        if (s < 2) { ctx.restore(); continue; }
        ctx.translate(W * e.x, H * e.y); ctx.rotate(e.rot);
        burstPath(ctx, 0, 0, s * 3.6, s * 1.5, 14, 3);
        ctx.fillStyle = rgb(fxCol(L, [255, 222, 60])); ctx.fill();
        if (stroke) { ctx.lineWidth = lw * 1.3; ctx.stroke(); }
        ctx.font = font(L, (s * 0.95) | 0);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgb(fxCol(L, [225, 40, 50]));
        ctx.lineWidth = s * 0.14; ctx.strokeStyle = rgb(fxCol(L, [255, 255, 255]));
        ctx.strokeText(e.text, 0, s * 0.05); ctx.fillText(e.text, 0, s * 0.05);
      } else if (e.type === 'iris') {
        const q = C.proj(e.pos);
        const r = e.r * Math.hypot(W, H) * 0.75;
        ctx.globalAlpha = 1;
        ctx.fillStyle = rgb(fxCol(L, [8, 8, 10]));
        ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(q[0], q[1], Math.max(0, r), 0, TAU, true); ctx.fill('evenodd');
      } else if (e.type === 'theend' && L.theEnd !== false) {
        const s = H * 0.12;
        ctx.font = font(L, s | 0);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgb(fxCol(L, [255, 214, 70]));
        ctx.fillText('THE END', W / 2, H * 0.42);
      }
      ctx.restore();
    }
  }
  // Particle layout of a firework burst (world points). Shape 'turtle' draws a turtle in sparks.
  function fireworkPoints(e) {
    const pts = [];
    const R = rng(e.seed * 31 + 7);
    if (e.shape === 'turtle') {
      const add = (x, y) => pts.push([e.pos[0] + x * e.r, e.pos[1] + y * e.r, e.pos[2]]);
      for (let i = 0; i <= 22; i++) { const a = Math.PI + (i / 22) * Math.PI; add(Math.cos(a) * 0.6, -Math.sin(a) * 0.45 - 0.05); }
      for (let i = 0; i <= 12; i++) add(-0.6 + (i / 12) * 1.2, -0.05);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; add(0.78 + Math.cos(a) * 0.14, 0.1 + Math.sin(a) * 0.13); }
      for (const lx of [-0.4, 0.35]) for (let i = 0; i < 4; i++) add(lx + (i - 1.5) * 0.04, -0.12 - i * 0.05);
      add(0.82, 0.13);
      return pts;
    }
    for (let i = 0; i < 46; i++) {
      const a = R() * TAU, z = R() * 2 - 1, rr = Math.sqrt(1 - z * z);
      pts.push([e.pos[0] + Math.cos(a) * rr * e.r, e.pos[1] + Math.sin(a) * rr * e.r, e.pos[2] + z * e.r * 0.3]);
    }
    return pts;
  }

  // ---------------- full base render ----------------
  // Renders background + puppets + effects with look L into ctx.
  function render(ctx, F, L) {
    const { W, H } = F;
    ctx.save();
    if (L.bg) L.bg(ctx, F, L);
    else {
      drawSky(ctx, F, L);
      if (L.ground !== false) drawGround(ctx, F, L);
    }
    if (L.afterBg) L.afterBg(ctx, F, L);
    drawShadows(ctx, F, L);
    drawGroups(ctx, F, L, L.painter || paintShape);
    if (L.fx !== false) drawFx(ctx, F, L);
    ctx.restore();
  }

  // ---------------- post effects ----------------
  const POST = {
    grain(ctx, F, amt = 0.12, op = 'overlay') {
      overlayTex(ctx, grainTex(F.hold % 4), op, amt, 1, [hash(F.hold, 1) * 256, hash(F.hold, 2) * 256]);
    },
    paper(ctx, F, amt = 0.35, op = 'multiply') { overlayTex(ctx, paperTex(), op, amt, 2 * F.u); },
    weave(ctx, F, amt = 0.3) { overlayTex(ctx, canvasTex(), 'overlay', amt, 1.2 * F.u); },
    vignette(ctx, F, amt = 0.5, col = '0,0,0') {
      const { W, H } = F;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${amt})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    scanlines(ctx, F, amt = 0.25, gap = 3) {
      const { W, H } = F;
      ctx.fillStyle = `rgba(0,0,0,${amt})`;
      const g = gap * F.u;
      for (let y = 0; y < H; y += g) ctx.fillRect(0, y, W, g * 0.45);
    },
    filter(ctx, F, f) {
      const [c, x] = scratch('pf', F.W, F.H);
      x.drawImage(ctx.canvas, 0, 0);
      ctx.save(); ctx.filter = f; ctx.globalCompositeOperation = 'copy'; ctx.drawImage(c, 0, 0); ctx.restore();
    },
    glow(ctx, F, blur = 12, amt = 0.6) {
      const [c, x] = scratch('pg', F.W, F.H);
      x.filter = `blur(${blur * F.u}px)`; x.drawImage(ctx.canvas, 0, 0); x.filter = 'none';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = amt; ctx.drawImage(c, 0, 0); ctx.restore();
    },
    chroma(ctx, F, dx = 3) {
      const [c, x] = scratch('pc', F.W, F.H);
      x.drawImage(ctx.canvas, 0, 0);
      const d = dx * F.u;
      ctx.save();
      ctx.globalCompositeOperation = 'copy'; ctx.drawImage(c, 0, 0);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(0,255,255)'; ctx.fillRect(0, 0, F.W, F.H);
      ctx.globalCompositeOperation = 'lighter';
      const [c2, x2] = scratch('pc2', F.W, F.H);
      x2.drawImage(c, 0, 0); x2.globalCompositeOperation = 'multiply'; x2.fillStyle = 'rgb(255,0,0)'; x2.fillRect(0, 0, F.W, F.H);
      ctx.drawImage(c2, d, 0);
      ctx.restore();
    },
    // Downscale -> process pixels -> upscale (nearest). fn(data, w, h) mutates RGBA.
    pixels(ctx, F, w, h, fn, smoothUp = false) {
      const [c, x] = scratch('pp', w, h);
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(ctx.canvas, 0, 0, w, h);
      if (fn) {
        const id = x.getImageData(0, 0, w, h);
        fn(id.data, w, h);
        x.putImageData(id, 0, 0);
      }
      ctx.save(); ctx.imageSmoothingEnabled = smoothUp; ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(c, 0, 0, F.W, F.H); ctx.restore();
    },
    // Sample the current canvas at low resolution, returns {data,w,h}.
    sample(ctx, F, w, h) {
      const [c, x] = scratch('ps', w, h);
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(ctx.canvas, 0, 0, w, h);
      return { data: x.getImageData(0, 0, w, h).data, w, h };
    },
  };
  // Ordered dithering matrix 4x4.
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);

  return {
    scratch, camera, buildGroups, render, drawSky, drawGround, drawShadows, drawGroups, drawFx, paintShape,
    polyPath, limbPath, shapePolys, POST, BAYER, MATC, skyCols, horizonY, heartPath, starPath, burstPath,
    paperTex, grainTex, canvasTex, overlayTex, font, lineCol, fireworkPoints, noiseTex,
  };
})();
