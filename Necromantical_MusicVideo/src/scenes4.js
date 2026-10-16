// Necromantical (painted) — scenes 2:06–3:08  (Chorus 3, time-skip, Outro, Ending)
'use strict';
(function () {
  const { clamp, lerp, range, ease, TAU, W, H, glow, hash1, noise1, rgba } = NM;
  const softShade = (...a) => NM.softShade(...a);
  const INK = '#3a2414';

  // ===================== helpers =====================
  function padlock(g, x, y, s, t, o = {}) {
    g.save(); g.translate(x, y); g.scale(s / 100, s / 100);
    g.strokeStyle = '#3a3a44'; g.lineWidth = 16; g.beginPath(); g.arc(0, -10, 34, Math.PI, 0); g.lineTo(34, 10); g.moveTo(-34, -10); g.lineTo(-34, 10); g.stroke();
    g.strokeStyle = 'rgba(200,200,215,0.6)'; g.lineWidth = 4; g.beginPath(); g.arc(-3, -12, 32, Math.PI * 1.05, Math.PI * 1.5); g.stroke();
    const bg = g.createLinearGradient(-52, 0, 52, 0); bg.addColorStop(0, '#16161c'); bg.addColorStop(0.35, '#5a5a66'); bg.addColorStop(0.6, '#2a2a32'); bg.addColorStop(1, '#0c0c10');
    g.fillStyle = bg; g.beginPath(); g.roundRect(-52, 0, 104, 86, 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-46, 6, 92, 6);
    g.fillStyle = '#050407'; g.beginPath(); g.arc(0, 34, 10, 0, TAU); g.fill(); g.fillRect(-4, 34, 8, 26);
    if (o.glow) NM.glow(g, 0, 40, 120, '#ff3a52', o.glow);
    g.restore();
  }
  // one of her dead: ragged silhouette (returns the eye point)
  function deadOne(g, x, y, s, i, t) {
    const u = s / 100, R = hash1(i * 7.3), sw = Math.sin(t * 2 + i) * 2 * u;
    const bw = (8 + R * 5) * u, hunch = (hash1(i * 3.1) - 0.3) * 8 * u, hx = x + sw + hunch * 1.3, hy = y - 86 * u + Math.abs(hunch) * 0.6;
    g.fillRect(x - bw * 0.75, y - 46 * u, bw * 0.55, 46 * u); g.fillRect(x + bw * 0.2, y - 46 * u, bw * 0.55, 46 * u);
    g.beginPath(); g.moveTo(x - bw, y - 40 * u); g.lineTo(x - bw * 1.1 + sw + hunch, y - 74 * u); g.quadraticCurveTo(x + sw + hunch, y - 82 * u, x + bw * 1.1 + sw + hunch, y - 74 * u); g.lineTo(x + bw, y - 40 * u);
    for (let k = 0; k <= 6; k++) g.lineTo(x + bw - k * bw / 3, y - (k % 2 ? 30 : 38) * u);
    g.closePath(); g.fill();
    g.beginPath(); g.ellipse(hx, hy, 6.8 * u, 8.2 * u, 0, 0, TAU); g.fill();
    g.save(); g.lineCap = 'round'; g.strokeStyle = g.fillStyle;
    const k = i % 4;
    if (k === 0 || k === 2) { const sd = k ? 1 : -1; g.lineWidth = 4.5 * u; g.beginPath(); g.moveTo(x + sd * bw + sw, y - 70 * u); g.lineTo(x + sd * (bw + 8 * u) + sw, y - (100 + R * 20) * u); g.stroke(); g.lineWidth = 2.2 * u; g.beginPath(); g.moveTo(x + sd * (bw + 8 * u) + sw, y - (60 + R * 10) * u); g.lineTo(x + sd * (bw + 9 * u) + sw, y - (150 + R * 20) * u); g.stroke(); }
    else { g.lineWidth = 4 * u; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x + sd * bw + sw, y - 70 * u); g.quadraticCurveTo(x + sd * (bw + 10 * u) + sw, y - 66 * u, x + sd * (bw + 14 * u) + sw * 2, y - (52 + R * 10) * u); g.stroke(); } }
    g.restore();
    return [hx, hy];
  }
  // a large layered rose (front view)
  function bigRose(g, x, y, r, t, wither) {
    g.save(); g.translate(x, y);
    const C = { deep: '#2a0208', mid: '#9a0e22', light: '#e0405a', hi: '#ffa0b0' };
    const petal = (ang, w, len, lit) => {
      g.save(); g.rotate(ang);
      const L = len * (1 - wither * 0.18);
      const pg = g.createLinearGradient(0, 0, 0, -L);
      pg.addColorStop(0, C.deep); pg.addColorStop(0.5, C.mid); pg.addColorStop(1, lit > 0.5 ? C.light : C.mid);
      g.fillStyle = pg;
      g.beginPath(); g.moveTo(-w * 0.25, 0); g.bezierCurveTo(-w, -L * 0.3, -w * 0.95, -L * 0.95, 0, -L + wither * L * 0.12); g.bezierCurveTo(w * 0.95, -L * 0.95, w, -L * 0.3, w * 0.25, 0); g.closePath(); g.fill();
      g.strokeStyle = rgba(C.hi, 0.45 * lit); g.lineWidth = Math.max(1.5, w * 0.07);
      g.beginPath(); g.moveTo(-w * 0.8, -L * 0.72); g.quadraticCurveTo(0, -L * 1.04, w * 0.8, -L * 0.72); g.stroke();
      g.strokeStyle = 'rgba(30,0,6,0.35)'; g.lineWidth = Math.max(1, w * 0.04);
      g.beginPath(); g.moveTo(0, -L * 0.1); g.lineTo(0, -L * 0.6); g.stroke();
      g.restore();
    };
    softShade(g, 0, 0, r * 1.5, r * 1.3, '#000000', 0.55);
    for (let i = 0; i < 7; i++) petal(i / 7 * TAU + 0.2, r * 0.62, r * 1.02, 0.4 + 0.6 * Math.max(0, -Math.sin(i / 7 * TAU + 0.2)));
    for (let i = 0; i < 5; i++) petal(i / 5 * TAU + 0.7, r * 0.52, r * 0.8, 0.5 + 0.5 * Math.max(0, -Math.sin(i / 5 * TAU + 0.7)));
    for (let i = 0; i < 4; i++) petal(i / 4 * TAU + 1.3, r * 0.4, r * 0.56, 0.7);
    const cg = g.createRadialGradient(-r * 0.08, -r * 0.1, r * 0.02, 0, 0, r * 0.42); cg.addColorStop(0, '#5a0410'); cg.addColorStop(0.7, '#8a0c1e'); cg.addColorStop(1, '#3a0208');
    g.fillStyle = cg; g.beginPath(); g.ellipse(0, 0, r * 0.4, r * 0.36, 0, 0, TAU); g.fill();
    for (let i = 0; i < 6; i++) {
      const rr = r * (0.36 - i * 0.055);
      g.save(); g.rotate(i * 2.2 + 0.4);
      g.strokeStyle = '#2a0208'; g.lineWidth = Math.max(1.5, r * 0.06); g.beginPath(); g.arc(0, 0, rr, Math.PI * 1.0, Math.PI * 1.8); g.stroke();
      g.strokeStyle = rgba(C.light, 0.75); g.lineWidth = Math.max(1, r * 0.025); g.beginPath(); g.arc(0, -r * 0.012, rr * 0.97, Math.PI * 1.08, Math.PI * 1.65); g.stroke();
      g.restore();
    }
    softShade(g, -r * 0.3, -r * 0.4, r * 0.4, r * 0.25, '#ffd0d8', 0.35, 'screen');
    if (wither > 0) softShade(g, 0, 0, r * 1.3, r * 1.3, '#2a1a10', wither * 0.75);
    g.restore();
  }

  // painted leaf
  function leaf(g, x, y, s, a, col = '#1a2a14') {
    g.save(); g.translate(x, y); g.rotate(a);
    const lg = g.createLinearGradient(0, -s * 0.3, 0, s * 0.3); lg.addColorStop(0, '#3a5a2a'); lg.addColorStop(1, col);
    g.fillStyle = lg; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.5, -s * 0.4, s, 0); g.quadraticCurveTo(s * 0.5, s * 0.4, 0, 0); g.fill();
    g.strokeStyle = 'rgba(10,20,8,0.7)'; g.lineWidth = Math.max(1, s * 0.03); g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 0.95, 0); g.stroke();
    g.restore();
  }
  // ---- couple silhouettes for the backlit shots (pure shapes; fill colour comes from NM.silhouette) ----
  function tousle(q, x, y, rx, ry, n, seed, t) {
    q.beginPath(); q.ellipse(x, y, rx, ry, 0, 0, TAU); q.fill();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.05 + 0.9 * i / (n - 1)), r1 = Math.max(rx, ry) * (1.06 + 0.12 * hash1(i + seed)), sw = Math.sin(t * 2 + i) * 0.04;
      q.beginPath(); q.moveTo(x + Math.cos(a - 0.35) * rx * 0.9, y + Math.sin(a - 0.35) * ry * 0.9);
      q.quadraticCurveTo(x + Math.cos(a + sw) * r1 * 0.95, y + Math.sin(a + sw) * r1 * 0.95, x + Math.cos(a + 0.2 + sw) * r1, y + Math.sin(a + 0.2 + sw) * r1);
      q.lineTo(x + Math.cos(a + 0.35) * rx * 0.9, y + Math.sin(a + 0.35) * ry * 0.9); q.closePath(); q.fill();
    }
  }
  function gownSil(q, x, gy, u, t, o = {}) {
    const sw = Math.sin(t * 1.4) * 1.2 * u, train = (o.train ?? 10) * u;
    q.beginPath(); q.moveTo(x - 6.5 * u, -55 * u + gy);
    q.bezierCurveTo(x - 16 * u, -40 * u + gy, x - 25 * u - sw, -14 * u + gy, x - 27 * u - train - sw, gy);
    q.lineTo(x + 25 * u - sw * 0.5, gy);
    q.bezierCurveTo(x + 23 * u, -14 * u + gy, x + 15 * u, -40 * u + gy, x + 6.5 * u, -55 * u + gy); q.closePath(); q.fill();
    q.beginPath(); q.moveTo(x - 6 * u, -55 * u + gy); q.bezierCurveTo(x - 8 * u, -66 * u + gy, x - 10 * u, -74 * u + gy, x - 9.5 * u, -78 * u + gy); q.quadraticCurveTo(x, -81 * u + gy, x + 9.5 * u, -78 * u + gy); q.bezierCurveTo(x + 10 * u, -74 * u + gy, x + 8 * u, -66 * u + gy, x + 6 * u, -55 * u + gy); q.closePath(); q.fill();
    for (const sx of [-1, 1]) { q.beginPath(); q.ellipse(x + sx * 10 * u, -76 * u + gy, 4.6 * u, 4.2 * u, 0, 0, TAU); q.fill(); }
  }
  // embrace: Lucien (right, facing left) holds Isolde (left, facing right), her head on his chest
  function embraceSil(q, cx, gy, s, t) {
    const u = s / 100, xl = cx + 8 * u, xi = cx - 10 * u, iu = u * 0.93;
    // veil streaming behind her
    q.save(); q.globalAlpha = 0.55;
    q.beginPath(); q.moveTo(xi - 2 * iu, gy - 92 * iu); q.bezierCurveTo(xi - 30 * iu, gy - 70 * iu, xi - 46 * iu + Math.sin(t * 1.3) * 4 * u, gy - 30 * iu, xi - 52 * iu + Math.sin(t * 1.3) * 6 * u, gy); q.lineTo(xi - 22 * iu, gy); q.bezierCurveTo(xi - 20 * iu, gy - 40 * iu, xi - 12 * iu, gy - 70 * iu, xi + 4 * iu, gy - 90 * iu); q.closePath(); q.fill();
    q.restore();
    // his legs and coat
    for (const [a, b] of [[-6, -1], [1.5, 6.5]]) { q.beginPath(); q.moveTo(xl + a * u, gy - 52 * u); q.lineTo(xl + b * u, gy - 52 * u); q.lineTo(xl + b * u + 0.5 * u, gy); q.lineTo(xl + a * u - 0.5 * u, gy); q.closePath(); q.fill(); }
    q.beginPath(); q.moveTo(xl - 14 * u, gy - 79 * u); q.quadraticCurveTo(xl - 13 * u, gy - 62 * u, xl - 9 * u, gy - 50 * u); q.lineTo(xl - 7 * u, gy - 44 * u); q.lineTo(xl + 13 * u, gy - 26 * u); q.lineTo(xl + 12 * u, gy - 52 * u); q.quadraticCurveTo(xl + 14 * u, gy - 66 * u, xl + 11 * u, gy - 80 * u); q.quadraticCurveTo(xl - 2 * u, gy - 85 * u, xl - 14 * u, gy - 79 * u); q.closePath(); q.fill();
    q.beginPath(); q.ellipse(xl + 10 * u, gy - 77 * u, 5 * u, 4 * u, 0, 0, TAU); q.fill();
    // neck + head bowed toward her
    q.beginPath(); q.moveTo(xl - 5 * u, gy - 80 * u); q.lineTo(xl - 7.5 * u, gy - 88 * u); q.lineTo(xl - 1.5 * u, gy - 90 * u); q.lineTo(xl + 1 * u, gy - 81 * u); q.closePath(); q.fill();
    q.save(); q.translate(xl - 6 * u, gy - 94 * u); q.rotate(-0.35); tousle(q, 0, 0, 7.4 * u, 8.6 * u, 9, 3, t); q.beginPath(); q.moveTo(-6 * u, 2 * u); q.lineTo(-9.6 * u, 4.5 * u); q.lineTo(-6.5 * u, 6 * u); q.fill(); q.restore();
    // her gown, hair and head against his chest
    gownSil(q, xi, gy, iu, t, { train: 12 });
    q.beginPath(); q.moveTo(xi - 6 * iu, gy - 90 * iu); q.bezierCurveTo(xi - 14 * iu, gy - 76 * iu, xi - 14 * iu, gy - 62 * iu, xi - 12 * iu + Math.sin(t * 1.5) * iu, gy - 50 * iu); q.lineTo(xi - 4 * iu, gy - 56 * iu); q.lineTo(xi + 2 * iu, gy - 88 * iu); q.closePath(); q.fill();
    q.save(); q.translate(xi + 5 * iu, gy - 88 * iu); q.rotate(0.28);
    q.beginPath(); q.ellipse(0, 0, 7.2 * iu, 8.4 * iu, 0, 0, TAU); q.fill();
    q.fillRect(-4 * iu, 4 * iu, 6 * iu, 7 * iu);
    q.beginPath(); q.ellipse(-2 * iu, -8 * iu, 6 * iu, 2.4 * iu, -0.3, 0, TAU); q.fill(); q.beginPath(); q.ellipse(0, -10 * iu, 3.2 * iu, 3.6 * iu, 0, 0, TAU); q.fill();
    q.restore();
    // his arm around her back, her hand on his shoulder blade
    q.lineCap = 'round'; q.strokeStyle = q.fillStyle;
    q.lineWidth = 6.5 * u; q.beginPath(); q.moveTo(xl - 9 * u, gy - 76 * u); q.quadraticCurveTo(xl - 16 * u, gy - 62 * u, xi - 7 * iu, gy - 62 * iu); q.stroke();
    q.lineWidth = 4 * u; q.beginPath(); q.moveTo(xi - 7 * iu, gy - 62 * iu); q.lineTo(xi - 11 * iu, gy - 66 * iu); q.stroke();
    q.lineWidth = 4.6 * u; q.beginPath(); q.moveTo(xi + 9 * iu, gy - 76 * iu); q.quadraticCurveTo(xl - 2 * u, gy - 70 * u, xl + 12 * u, gy - 74 * u); q.stroke();
  }
  // from behind, hand in hand
  function backCoupleSil(q, cx, gy, s, t) {
    const u = s / 100, xl = cx + 15 * u, xi = cx - 15 * u, iu = u * 0.92;
    const w = Math.sin(t * 1.1);
    q.save(); q.globalAlpha = 0.55;
    q.beginPath(); q.moveTo(xi - 6 * iu, gy - 92 * iu); q.bezierCurveTo(xi - 22 * iu, gy - 60 * iu, xi - 30 * iu - w * 4 * u, gy - 20 * iu, xi - 36 * iu - w * 6 * u, gy); q.lineTo(xi + 30 * iu, gy); q.bezierCurveTo(xi + 24 * iu, gy - 20 * iu, xi + 18 * iu, gy - 60 * iu, xi + 6 * iu, gy - 92 * iu); q.closePath(); q.fill();
    q.restore();
    gownSil(q, xi, gy, iu, t, { train: 4 });
    // her long hair down her back + hat
    q.beginPath(); q.moveTo(xi - 7.5 * iu, gy - 90 * iu); q.bezierCurveTo(xi - 11 * iu, gy - 72 * iu, xi - 11 * iu, gy - 60 * iu, xi - 9 * iu + w * iu, gy - 50 * iu); q.lineTo(xi + 9 * iu + w * iu, gy - 50 * iu); q.bezierCurveTo(xi + 11 * iu, gy - 60 * iu, xi + 11 * iu, gy - 72 * iu, xi + 7.5 * iu, gy - 90 * iu); q.closePath(); q.fill();
    q.beginPath(); q.ellipse(xi, gy - 89 * iu, 7.6 * iu, 8.6 * iu, 0, 0, TAU); q.fill();
    q.save(); q.translate(xi + 3 * iu, gy - 98 * iu); q.rotate(0.3); q.beginPath(); q.ellipse(0, 0, 7 * iu, 2.4 * iu, 0, 0, TAU); q.fill(); q.fillRect(-3.5 * iu, -6 * iu, 7 * iu, 6 * iu); q.restore();
    q.fillRect(xi - 3 * iu, gy - 82 * iu, 6 * iu, 5 * iu);
    // him
    for (const [a, b] of [[-6, -1], [1, 6]]) { q.beginPath(); q.moveTo(xl + a * u, gy - 52 * u); q.lineTo(xl + b * u, gy - 52 * u); q.lineTo(xl + b * u + 0.3 * u, gy); q.lineTo(xl + a * u - 0.3 * u, gy); q.closePath(); q.fill(); }
    q.beginPath(); q.moveTo(xl - 12 * u, gy - 80 * u); q.quadraticCurveTo(xl - 13.5 * u, gy - 64 * u, xl - 10 * u, gy - 52 * u); q.lineTo(xl - 9 * u, gy - 28 * u); q.lineTo(xl - 1 * u, gy - 30 * u); q.lineTo(xl, gy - 46 * u); q.lineTo(xl + 1 * u, gy - 30 * u); q.lineTo(xl + 9 * u, gy - 28 * u); q.lineTo(xl + 10 * u, gy - 52 * u); q.quadraticCurveTo(xl + 13.5 * u, gy - 64 * u, xl + 12 * u, gy - 80 * u); q.quadraticCurveTo(xl, gy - 85 * u, xl - 12 * u, gy - 80 * u); q.closePath(); q.fill();
    for (const sx of [-1, 1]) { q.beginPath(); q.ellipse(xl + sx * 11 * u, gy - 78 * u, 4.6 * u, 3.8 * u, 0, 0, TAU); q.fill(); }
    q.fillRect(xl - 3 * u, gy - 87 * u, 6 * u, 8 * u);
    tousle(q, xl, gy - 93 * u, 7.4 * u, 8.4 * u, 9, 7, t);
    // arms: outer ones hang, inner ones meet in clasped hands
    q.lineCap = 'round'; q.strokeStyle = q.fillStyle;
    q.lineWidth = 5.2 * u; q.beginPath(); q.moveTo(xl + 12 * u, gy - 77 * u); q.lineTo(xl + 14.5 * u, gy - 50 * u); q.stroke();
    q.lineWidth = 4.4 * iu; q.beginPath(); q.moveTo(xi - 11 * iu, gy - 75 * iu); q.lineTo(xi - 14 * iu, gy - 50 * iu); q.stroke();
    const hx = cx, hy = gy - 48 * u;
    q.lineWidth = 4.4 * iu; q.beginPath(); q.moveTo(xi + 11 * iu, gy - 75 * iu); q.quadraticCurveTo(xi + 15 * iu, gy - 58 * iu, hx - 1.5 * u, hy); q.stroke();
    q.lineWidth = 5.2 * u; q.beginPath(); q.moveTo(xl - 12 * u, gy - 77 * u); q.quadraticCurveTo(xl - 15 * u, gy - 58 * u, hx + 1.5 * u, hy); q.stroke();
    q.beginPath(); q.ellipse(hx, hy + 1 * u, 3.8 * u, 3.2 * u, 0, 0, TAU); q.fill();
    return [hx, hy];
  }

  // the old map of the valley; dead = the blighted version
  function valleyMap(g, t, dead) {
    const ink = dead ? '#4a0408' : INK;
    const pg = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1200);
    if (dead) { pg.addColorStop(0, '#8a3a2a'); pg.addColorStop(0.6, '#5a1a14'); pg.addColorStop(1, '#2a0606'); }
    else { pg.addColorStop(0, '#ecdcb8'); pg.addColorStop(0.6, '#d4b888'); pg.addColorStop(1, '#8a6438'); }
    g.fillStyle = pg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) softShade(g, hash1(i) * W, hash1(i * 3) * H, 80 + hash1(i * 5) * 160, 60 + hash1(i * 7) * 120, dead ? '#2a0204' : '#8a6a40', 0.3);
    g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
    // border
    g.lineWidth = 6; g.strokeRect(70, 60, W - 140, H - 120); g.lineWidth = 2; g.strokeRect(86, 76, W - 172, H - 152);
    // river
    g.strokeStyle = dead ? '#6a0a12' : '#4a5a6a'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(100, 260); g.bezierCurveTo(500, 330, 700, 560, 980, 640); g.bezierCurveTo(1260, 720, 1400, 900, 1820, 960); g.stroke();
    g.strokeStyle = ink; g.lineWidth = 2;
    // mountains
    for (let i = 0; i < 9; i++) {
      const x = 1150 + i * 70 + (i % 2) * 20, y = 330 - (i % 3) * 30, s = 80 + (i % 3) * 20;
      g.beginPath(); g.moveTo(x - s * 0.7, y); g.lineTo(x, y - s); g.lineTo(x + s * 0.7, y); g.stroke();
      for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + k * 6, y - s + k * 18); g.lineTo(x + k * 12, y); g.stroke(); }
    }
    // forests
    for (const [cx, cy, n] of [[420, 470, 26], [1400, 780, 22], [300, 860, 14]]) {
      for (let i = 0; i < n; i++) {
        const x = cx + (hash1(i * 3 + cx) - 0.5) * 360, y = cy + (hash1(i * 7 + cx) - 0.5) * 180, s = 26 + hash1(i + cx) * 12;
        if (dead) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s); g.moveTo(x, y - s * 0.6); g.lineTo(x - s * 0.3, y - s * 0.9); g.moveTo(x, y - s * 0.5); g.lineTo(x + s * 0.3, y - s * 0.8); g.stroke(); }
        else { g.beginPath(); g.moveTo(x - s * 0.35, y - s * 0.2); g.lineTo(x, y - s); g.lineTo(x + s * 0.35, y - s * 0.2); g.closePath(); g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1; g.stroke(); g.beginPath(); g.moveTo(x, y - s * 0.2); g.lineTo(x, y); g.stroke(); }
      }
    }
    // village + church
    for (let i = 0; i < 9; i++) { const x = 560 + (i % 3) * 46 + (i > 5 ? 20 : 0), y = 760 + Math.floor(i / 3) * 34; g.strokeRect(x - 14, y - 14, 28, 18); g.beginPath(); g.moveTo(x - 18, y - 14); g.lineTo(x, y - 30); g.lineTo(x + 18, y - 14); g.stroke(); }
    g.strokeRect(700, 690, 34, 50); g.beginPath(); g.moveTo(700, 690); g.lineTo(717, 630); g.lineTo(734, 690); g.moveTo(717, 610); g.lineTo(717, 640); g.moveTo(707, 620); g.lineTo(727, 620); g.stroke();
    // roads
    g.setLineDash([10, 10]); g.lineWidth = 3;
    g.beginPath(); g.moveTo(640, 760); g.bezierCurveTo(800, 700, 950, 640, 1120, 560); g.moveTo(560, 800); g.lineTo(200, 980); g.stroke();
    g.setLineDash([]); g.lineWidth = 2;
    // the manor + its graveyard
    g.save(); g.translate(1150, 540);
    g.lineWidth = 3; g.strokeRect(-60, -50, 120, 60);
    for (const [x, h] of [[-60, 110], [60, 110], [0, 150]]) { g.beginPath(); g.moveTo(x - 14, 10); g.lineTo(x - 14, -h + 30); g.lineTo(x, -h); g.lineTo(x + 14, -h + 30); g.lineTo(x + 14, 10); g.stroke(); }
    g.restore();
    for (let i = 0; i < 7; i++) { const x = 1010 + (i % 4) * 26, y = 610 + Math.floor(i / 4) * 30; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 18); g.moveTo(x - 7, y - 12); g.lineTo(x + 7, y - 12); g.stroke(); }
    // compass rose
    g.save(); g.translate(1650, 860);
    for (let k = 0; k < 8; k++) { g.rotate(TAU / 8); g.beginPath(); g.moveTo(0, 0); g.lineTo(k % 2 ? 10 : 14, k % 2 ? -40 : -80); g.lineTo(0, k % 2 ? -50 : -100); g.lineTo(k % 2 ? -10 : -14, k % 2 ? -40 : -80); g.closePath(); g.globalAlpha = k % 2 ? 0.4 : 0.8; g.fill(); g.globalAlpha = 1; }
    g.beginPath(); g.arc(0, 0, 60, 0, TAU); g.stroke();
    g.restore();
    g.font = 'italic 40px "IM Fell English"'; g.textAlign = 'center';
    g.fillText('Blackthorn Wood', 420, 600); g.fillText('Ashgrove', 640, 880); g.fillText(dead ? 'the Domain' : 'the Manor', 1150, 640); g.fillText('the Grey Fells', 1460, 400);
    g.font = '64px "UnifrakturMaguntia"'; g.fillText('Ashgrove Vale', W / 2, 170);
    if (dead) for (let i = 0; i < 14; i++) { const x = 200 + hash1(i * 11) * 1500, y = 220 + hash1(i * 13) * 700; NM.paintSkull(g, x, y, 14, '#c8a090'); }
  }

  // ======================================================================
  // CHORUS 3  126.05 – 138.30
  // ======================================================================
  // 126.05 – 129.36 the blood moon over her army — the camera cranes up to the tower
  NM.shot(126.05, 129.36, (g, S) => {
    const t = S.t, lt = S.lt;
    const pan = ease.inOutCubic(clamp(lt / 2.6));
    g.save(); g.translate(0, lerp(-340, 0, pan));
    NM.paintSky(g, t, { top: '#14060a', mid: '#4a1018', low: '#8a2a30', moon: { x: 1280, y: 330, r: 270, blood: 1 }, stars: 0, clouds: 0.8, cloudDark: '#1a0608', cloudLight: '#ff7a7a', speed: 16 });
    const st = NM.strikeAt(t, [126.1, 127.4, 128.6], 0.4);
    if (st.v > 0.3) NM.bolt(g, 300 + st.seed * 300, -20, 360 + st.seed * 200, 560, st.seed * 13, st.v, { color: '#ff8a9a', w: 1.2 });
    g.fillStyle = '#100406'; NM.paintRidge(g, 9, 820, 40, 0.003, '#1a060a', '#ff6a6a');
    // the tower
    NM.withRim(g, (q) => {
      const tg = q.createLinearGradient(520, 0, 820, 0); tg.addColorStop(0, '#0a0406'); tg.addColorStop(0.7, '#1e0c10'); tg.addColorStop(1, '#2e1418');
      q.fillStyle = tg;
      q.beginPath(); q.moveTo(540, 1500); q.lineTo(570, 470); q.lineTo(520, 470); q.lineTo(520, 430); q.lineTo(820, 430); q.lineTo(820, 470); q.lineTo(770, 470); q.lineTo(800, 1500); q.closePath(); q.fill();
      for (let x = 524; x < 820; x += 40) q.fillRect(x, 400, 24, 32);
      q.fillStyle = '#ff9a50'; q.fillRect(655, 620, 30, 60); q.fillRect(640, 820, 26, 54);
      NM.figIsolde(q, 640, 432, 250, { dir: 1, wind: 1.3, armF: [2.7, 0.15], armB: [2.5, 0.1], glow: 0.8 + NM.beat(t, 5) * 0.4, expr: 'crazed', yaw: 0.3 }, t);
      NM.figLucien(q, 720, 432, 262, { dir: -1, armF: [0.2, 0.2], expr: 'hollow', yaw: 0.3 }, t);
    }, '#ff6a6a', 1, -0.6, 4, 0.9);
    glow(g, 650, 290, 180, '#ff2040', 0.5 + NM.beat(t, 5) * 0.4);
    // the army of the dead
    for (let row = 0; row < 6; row++) {
      const y = 880 + row * 92, s = 120 + row * 46, n = 18 - row * 2;
      const fg = g.createLinearGradient(0, y - s * 0.9, 0, y); fg.addColorStop(0, 'rgba(120,20,30,0)'); fg.addColorStop(1, 'rgba(120,20,30,0.35)');
      g.fillStyle = fg; g.fillRect(0, y - s * 0.9, W, s * 0.9);
      g.fillStyle = NM.mixHex('#060203', '#5a1418', 0.55 - row * 0.1);
      const eyes = [];
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5 + (row % 2) * 0.5 + (hash1(i * 5 + row) - 0.5) * 0.5) * (W / n);
        if (row < 3 && x > 500 && x < 860) continue;
        eyes.push([deadOne(g, x, y, s, i + row * 7, t), s / 100]);
      }
      for (const [[ex, ey], u] of eyes) { glow(g, ex - 2.6 * u, ey, 5 * u, '#ff2a44', 0.9); glow(g, ex + 2.6 * u, ey, 5 * u, '#ff2a44', 0.9); }
    }
    g.restore();
    NM.particles(g, t, { n: 70, seed: 81, kind: 'dot', vx: 10, vy: -50, drift: 20, size: [1.5, 3.5], color: '#ff8a9a', alpha: 0.7, twinkle: 3 });
    S.post.extraUI = lt < 1.0 ? [(u) => NM.titleSlamUI(u, lt, 180)] : null;
    S.post.flash = st.v * 0.45; S.post.flashColor = '#ff2040';
    S.post.shake = lt < 0.3 ? 1.6 : 0;
    S.post.grade = { shadow: '#14040a', light: '#ffa0a0', amount: 0.35 };
  }, { name: 'c3-moon', in: { type: 'red', dur: 0.35 } });

  // 129.36 – 132.30 the old map: her cruel domain spreads
  NM.shot(129.36, 132.3, (g, S) => {
    const t = S.t, lt = S.lt;
    const z = 1 + lt * 0.04;
    g.save(); g.translate(1150, 540); g.scale(z, z); g.translate(-1150, -540);
    valleyMap(g, t, false);
    const R = lerp(0, 1500, ease.inOutSine(clamp((lt - 0.3) / 2.4)));
    if (R > 1) {
      const blob = new Path2D();
      for (let i = 0; i <= 72; i++) { const a = i / 72 * TAU, r = R * (1 + 0.18 * NM.fbm1(a * 2.3 + 7, 3) + 0.06 * Math.sin(a * 9 + t * 3)); i ? blob.lineTo(1150 + Math.cos(a) * r, 540 + Math.sin(a) * r * 0.8) : blob.moveTo(1150 + Math.cos(a) * r, 540 + Math.sin(a) * r * 0.8); }
      blob.closePath();
      g.save(); g.clip(blob); valleyMap(g, t, true); g.restore();
      g.strokeStyle = 'rgba(120,0,16,0.85)'; g.lineWidth = 18; g.stroke(blob);
      g.strokeStyle = 'rgba(255,60,80,0.4)'; g.lineWidth = 5; g.stroke(blob);
    }
    g.restore();
    glow(g, 1150, 520, 220, '#ff2040', 0.4 + NM.beat(t, 5) * 0.3);
    S.post.extraUI = [(u) => {
      const ev = lt > 1.7;
      NM.ornateBox(u, 90, 70, 560, 110, 1);
      NM.uiText(u, ev ? 'Isolde\'s Domain' : 'Ashgrove Vale', 130, 143, { font: '50px "UnifrakturMaguntia"', color: ev ? '#ff5a6e' : '#ecdcc0', shadow: ev ? 'rgba(255,40,70,0.7)' : 'rgba(0,0,0,0.9)', blur: ev ? 16 : 8 });
    }];
    S.post.grade = { shadow: '#1a0a06', light: '#ffd8a8', amount: 0.25 };
  }, { name: 'c3-map', paint: { r: 4 }, in: { type: 'black', dur: 0.2 } });

  // 132.30 – 135.40 "In life you fled, in death you stay" — he runs; the chain drags him back
  NM.shot(132.3, 135.4, (g, S) => {
    const t = S.t, lt = S.lt;
    const c = NM.cam3({ x: 0, y: 150, z: 600, f: 1000, vy: H * 0.42 });
    const yank = ease.inCubic(clamp((lt - 1.9) / 0.35));
    const land = clamp((lt - 2.25) / 0.5);
    const runX = lerp(-160, 420, Math.sin(clamp(lt / 1.95) * Math.PI / 2));
    const lucX = yank > 0 ? lerp(420, -120, yank) : runX;
    let iso, luc;
    NM.gyNight(g, t, c, { open: 1, rose: true, gyOpts: { hooks: { 1120: (q) => {
      const pi = NM.P3(c, -290, 0, 1100), pl = NM.P3(c, lucX, 0, 1100);
      NM.withRim(q, (r) => {
        iso = NM.figIsolde(r, pi.x, pi.y, 172 * pi.k, { dir: 1, armF: lt > 1.7 ? [1.75, -0.1] : [1.2, 0.4], armB: [0.2, 0.3], expr: lt > 1.7 ? 'crazed' : 'cold', glow: lt > 1.7 ? 1 : 0.3, wind: 0.6, yaw: 0.45 }, t);
        const ph = t * 9;
        const pose = yank > 0 && land < 1
          ? { dir: 1, lean: -0.5, armF: [2.2, 0.4], armB: [1.8, 0.6], legF: [0.8, -0.4], legB: [0.5, -0.2], expr: 'shock', yaw: 0.2, headTilt: -0.3 }
          : land >= 1 ? { dir: 1, kneel: 1, lean: 0.3, armF: [0.6, 0.4], armB: [0.4, 0.4], expr: 'plead', yaw: 0.2, headTilt: 0.2 }
          : { dir: 1, lean: 0.35, armF: [0.9 * Math.sin(ph), 0.9], armB: [-0.9 * Math.sin(ph), 0.9], legF: [0.8 * Math.sin(ph), -0.6], legB: [-0.8 * Math.sin(ph), -0.6], expr: 'pain', yaw: 0.2 };
        const hop = yank > 0 && land < 1 ? -Math.sin(yank * Math.PI) * 60 * pl.k : Math.abs(Math.sin(ph)) * -6 * pl.k;
        luc = NM.figLucien(r, pl.x, pl.y + hop, 185 * pl.k, pose, t);
      }, '#bfe9ff', 1, -0.5, 3, 0.6);
    } } } });
    if (iso && luc) {
      const taut = yank > 0 || lt > 1.7;
      const sag = taut ? 4 : clamp(1 - lt / 1.7) * 160 + 20;
      NM.chain(g, [iso.hand[0], iso.hand[1], (iso.hand[0] + luc.chest[0]) / 2, (iso.hand[1] + luc.chest[1]) / 2 + sag, luc.chest[0], luc.chest[1]], 18, { color: '#ff3a52', thick: 3.5, glow: taut ? 1 : 0.4 });
    }
    S.post.shake = yank > 0 && yank < 1 ? 1.6 : land > 0 && land < 0.3 ? 1 : 0;
    if (lt > 1.9 && lt < 2.1) { S.post.flash = 0.35; S.post.flashColor = '#ff2040'; }
    S.post.grade = { shadow: '#0c0818', light: '#c8d8ff', amount: 0.35 };
  }, { name: 'c3-flee', in: { type: 'black', dur: 0.15 } });

  // 135.40 – 138.30 "Forever locked in my decay" — the rose in chains (cover homage), the lock clicks
  NM.shot(135.4, 138.3, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#4a4a54'], [0.5, '#5e5e68'], [1, '#2e2e36']]);
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.8; g.fillStyle = g.createPattern(NM.A.stone, 'repeat'); g.fillRect(0, 0, W, H); g.restore();
    g.strokeStyle = 'rgba(20,20,26,0.45)'; g.lineWidth = 4;
    for (let r = 0; r < 9; r++) { const y = r * 130 + 40; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (r % 2) * 130; x < W; x += 260) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 130); g.stroke(); } }
    glow(g, 960, 440, 700, '#e8e4ec', 0.25);
    for (const x of [300, 1620]) { const bg = g.createLinearGradient(x - 24, 0, x + 24, 0); bg.addColorStop(0, '#08080a'); bg.addColorStop(0.4, '#4a4a54'); bg.addColorStop(1, '#0a0a0c'); g.fillStyle = bg; g.fillRect(x - 24, 0, 48, H); }
    g.fillStyle = '#121216'; g.fillRect(0, 470, W, 30);
    const sw = Math.sin(t * 1.2) * 14;
    const CH = { color: '#141418', thick: 9, highlight: '#9a9aa2' };
    NM.chain(g, [480, -40, 450 + sw, 360, 560, 820], 44, CH);
    NM.chain(g, [1440, -40, 1470 - sw, 360, 1360, 820], 44, CH);
    NM.chain(g, [-40, 160, 960, 460 + sw, 1960, 180], 44, CH);
    const wither = range(1.1, 2.8, lt);
    // stem, thorns, leaves
    g.lineCap = 'round';
    g.strokeStyle = '#0e1a0c'; g.lineWidth = 22; g.beginPath(); g.moveTo(960, 470); g.bezierCurveTo(990, 640, 930, 800, 970, H + 20); g.stroke();
    g.strokeStyle = '#2a4022'; g.lineWidth = 7; g.beginPath(); g.moveTo(954, 480); g.bezierCurveTo(982, 640, 922, 800, 962, H + 20); g.stroke();
    g.fillStyle = '#0e1a0c'; for (const [y, sx] of [[600, 1], [700, -1], [820, 1], [930, -1]]) { const x = 960 + (y - 470) * 0.02 * sx; g.beginPath(); g.moveTo(x + sx * 8, y); g.lineTo(x + sx * 40, y - 22); g.lineTo(x + sx * 8, y - 14); g.fill(); }
    leaf(g, 975, 700, 230, -0.5 + wither * 0.6, '#14200e'); leaf(g, 950, 840, 210, Math.PI + 0.5 - wither * 0.6, '#14200e');
    bigRose(g, 960, 410, 200, t, wither);
    // chains wrapping the stem, and the padlock
    NM.chain(g, [760, 560, 960, 660, 1160, 590], 36, CH);
    NM.chain(g, [1160, 700, 960, 610, 770, 720], 36, CH);
    const lockK = ease.outBounce ? ease.outBounce(clamp((lt - 0.35) / 0.5)) : ease.outBack(clamp((lt - 0.35) / 0.5));
    const click = lt > 0.85 && lt < 1.15 ? 1 - (lt - 0.85) / 0.3 : 0;
    padlock(g, 960, lerp(380, 630, lockK), 170, t, { glow: click * 0.9 });
    if (click > 0) S.post.shake = 1;
    if (wither > 0) NM.particles(g, lt, { n: 22, seed: 91, kind: 'petal', x: 760, y: 300, w: 400, h: 700, vy: 120, drift: 40, size: [9, 15], alpha: wither });
    S.post.grade = { shadow: '#18181e', light: '#e8e4f0', amount: 0.3 };
  }, { name: 'c3-rose', in: { type: 'fade', dur: 0.25 } });

  // ======================================================================
  // INSTRUMENTAL — TIME PASSES  138.30 – 149.50
  // ======================================================================
  NM.shot(138.3, 140.3, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#06040a'], [1, '#120a10']]);
    const a = range(0.15, 0.7, lt) * (1 - range(1.6, 2.0, lt));
    g.save(); g.globalAlpha = 0.3 * a; g.translate(960, 520);
    g.strokeStyle = '#c8a878'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 330, 0, TAU); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 300, 0, TAU); g.stroke();
    for (let k = 0; k < 12; k++) { const an = k / 12 * TAU; g.beginPath(); g.moveTo(Math.cos(an) * 270, Math.sin(an) * 270); g.lineTo(Math.cos(an) * 300, Math.sin(an) * 300); g.stroke(); }
    g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(lt * 9 - 1.57) * 220, Math.sin(lt * 9 - 1.57) * 220); g.stroke();
    g.lineWidth = 12; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(lt * 0.9 - 1.57) * 150, Math.sin(lt * 0.9 - 1.57) * 150); g.stroke();
    g.restore();
    NM.particles(g, t, { n: 70, seed: 33, kind: 'dot', vx: 6, vy: -8, drift: 30, size: [1, 2.6], color: '#e8d8c0', alpha: 0.4 * a, twinkle: 2 });
    S.post.ui = 'none';
    S.post.extraUI = [(u) => NM.uiText(u, '—  Many years later  —', W / 2, 545, { font: 'italic 72px "IM Fell English"', align: 'center', color: '#ece0d0', alpha: a })];
  }, { name: 'tp-card', in: { type: 'black', dur: 0.3 } });

  // 140.30 – 145.00 the manor through the seasons
  NM.shot(140.3, 145.0, (g, S) => {
    const t = S.t, lt = S.lt;
    const decay = clamp(lt / 4.7);
    NM.manorScene(g, t, { x: W / 2, y: 760, scale: 1.0, lit: decay < 0.85 ? [4, 10] : [10] });
    NM.band(g, NM.tinted(NM.A.clouds, '#2a2438'), 0, 420, 2200, t * 900, 0.5);
    // day / night sweeps
    const ph = lt * 1.3, day = Math.max(0, Math.sin(ph * TAU));
    const f = (ph % 1), sx = lerp(-150, W + 150, f), sy = 420 - Math.sin(f * Math.PI) * 330;
    if (Math.sin(ph * TAU) > 0) glow(g, sx, sy, 160, '#fff0c0', 0.7 * day); else glow(g, sx, sy, 90, '#d8e0ff', 0.6);
    g.fillStyle = rgba('#a8a090', 0.28 * day); g.fillRect(0, 0, W, H);
    // dead vines creeping up the walls
    g.strokeStyle = '#0a0c08'; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x0 = W / 2 + (i - 4) * 120, len = decay * (260 + hash1(i) * 280);
      g.lineWidth = 7; g.beginPath(); g.moveTo(x0, 760);
      for (let k = 1; k <= 12; k++) { const yy = 760 - (k / 12) * len; g.lineTo(x0 + Math.sin(k * 1.3 + i) * 26, yy); }
      g.stroke();
      for (let k = 2; k <= 12; k += 2) { const yy = 760 - (k / 12) * len; g.fillStyle = '#0e140c'; g.beginPath(); g.ellipse(x0 + Math.sin(k * 1.3 + i) * 26 + 10, yy, 9, 5, 0.6, 0, TAU); g.fill(); }
    }
    // graves appear one by one
    const n = Math.floor(decay * 12);
    for (let i = 0; i < n; i++) { const x = 140 + i * 150 + (i % 2) * 40, y = 960 + (i % 3) * 40; NM.paintGrave(g, x, y, 70 + (i % 3) * 14, 120 + (i % 4) * 16, i % 5, { moss: decay > 0.5, light: 0.6, seed: i, tilt: (hash1(i) - 0.5) * 0.15 }); }
    NM.paintCat(g, 1740, 1000, 110, t, { dir: -1 });
    // shadows still dancing behind the lit window
    const w4 = NM.manorWin(4), wx = W / 2 + w4.x, wy = 760 + w4.y;
    g.save(); g.beginPath(); g.rect(wx - w4.w / 2, wy - w4.h / 2, w4.w, w4.h); g.clip();
    g.fillStyle = '#120f1c'; const sp = Math.sin(t * 5);
    g.beginPath(); g.ellipse(wx - 5 + sp * 3, wy + 12, 6, 30, 0, 0, TAU); g.ellipse(wx + 6 - sp * 3, wy + 10, 6, 32, 0, 0, TAU); g.fill();
    g.restore();
    S.post.extraUI = [(u) => {
      NM.ornateBox(u, W - 420, 60, 340, 100, 1);
      NM.uiText(u, `Year  ${1878 + Math.floor(decay * 120)}`, W - 250, 128, { font: '50px "Cinzel"', align: 'center', color: '#ffd0d6' });
    }];
    S.post.grade = { shadow: '#0a0812', light: '#d8d0e8', amount: 0.3 };
  }, { name: 'tp-lapse', in: { type: 'black', dur: 0.3 } });

  // 145.00 – 149.50 their wedding portrait ages on the wall; the candle burns down
  NM.shot(145.0, 149.5, (g, S) => {
    const t = S.t, lt = S.lt;
    const age = clamp(lt / 4.2);
    const z = 1 + lt * 0.03;
    g.save(); g.translate(W / 2, 470); g.scale(z, z); g.translate(-W / 2, -470);
    NM.skyGrad(g, [[0, '#1a1014'], [1, '#0e080a']]);
    g.fillStyle = 'rgba(60,30,40,0.35)';
    for (let r = 0; r < 9; r++) for (let c2 = 0; c2 < 14; c2++) { const x = c2 * 150 + (r % 2) * 75, y = r * 130; g.beginPath(); g.moveTo(x, y - 30); g.quadraticCurveTo(x + 24, y, x, y + 30); g.quadraticCurveTo(x - 24, y, x, y - 30); g.fill(); }
    glow(g, W / 2, 900, 700, '#ffb060', 0.35 * (1 - age * 0.5));
    // gilded frame
    const fx = W / 2, fy = 470, fw = 900, fh = 640;
    const gg = g.createLinearGradient(fx - fw / 2, fy - fh / 2, fx + fw / 2, fy + fh / 2); gg.addColorStop(0, '#f0d080'); gg.addColorStop(0.5, '#8a6a30'); gg.addColorStop(1, '#3a2a10');
    g.fillStyle = gg; g.fillRect(fx - fw / 2 - 50, fy - fh / 2 - 50, fw + 100, fh + 100);
    g.strokeStyle = 'rgba(40,24,8,0.7)'; g.lineWidth = 6; g.strokeRect(fx - fw / 2 - 26, fy - fh / 2 - 26, fw + 52, fh + 52);
    for (let i = 0; i < 4; i++) { const cx = fx + (i % 2 ? 1 : -1) * (fw / 2 + 25), cy = fy + (i > 1 ? 1 : -1) * (fh / 2 + 25); g.fillStyle = '#f8e0a0'; g.beginPath(); g.arc(cx, cy, 22, 0, TAU); g.fill(); g.fillStyle = '#6a4a18'; g.beginPath(); g.arc(cx, cy, 10, 0, TAU); g.fill(); }
    g.save(); g.beginPath(); g.rect(fx - fw / 2, fy - fh / 2, fw, fh); g.clip();
    const pg = g.createRadialGradient(fx, fy - 60, 50, fx, fy, 600); pg.addColorStop(0, '#4a3a2a'); pg.addColorStop(1, '#14100c');
    g.fillStyle = pg; g.fillRect(fx - fw / 2, fy - fh / 2, fw, fh);
    NM.paintLucien(g, fx + 150, fy - 40, 330, 'alive', 0, { alive: true, yaw: -0.3, noBlink: true, light: -0.4 });
    if (age > 0.55) { g.save(); g.globalAlpha = range(0.55, 0.9, age); NM.paintLucien(g, fx + 150, fy - 40, 330, 'hollow', 0, { yaw: -0.3, noBlink: true, light: -0.4 }); g.restore(); }
    NM.paintIsolde(g, fx - 150, fy - 30, 320, 'tender', 0, { yaw: 0.3, noBlink: true, light: -0.4 });
    // varnish yellowing, fading and craquelure
    g.fillStyle = rgba('#6a4a20', 0.45 * age); g.globalCompositeOperation = 'multiply'; g.fillRect(fx - fw / 2, fy - fh / 2, fw, fh); g.globalCompositeOperation = 'source-over';
    g.strokeStyle = rgba('#0a0604', 0.5 * age); g.lineWidth = 1.4;
    const R0 = NM.rng(5);
    for (let i = 0; i < 70 * age; i++) { let x = fx + (R0() - 0.5) * fw, y = fy + (R0() - 0.5) * fh; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R0() - 0.5) * 60; y += (R0() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
    if (age > 0.7) { g.strokeStyle = '#050302'; g.lineWidth = 4; g.beginPath(); g.moveTo(fx + 40, fy - fh / 2); g.lineTo(fx + 10, fy - 120); g.lineTo(fx + 60, fy + 40); g.lineTo(fx + 20, fy + 200 * range(0.7, 1, age)); g.stroke(); }
    g.restore();
    // a cobweb spreads from the corner
    const cw = range(0.2, 1, age);
    if (cw > 0) {
      const ox = fx - fw / 2 - 50, oy = fy - fh / 2 - 50, L = 340 * cw;
      g.strokeStyle = 'rgba(220,220,230,0.4)'; g.lineWidth = 1.5;
      for (let k = 0; k <= 6; k++) { const an = k / 6 * Math.PI / 2; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(an) * L, oy + Math.sin(an) * L); g.stroke(); }
      for (let r = 1; r <= 7; r++) { g.beginPath(); for (let k = 0; k <= 6; k++) { const an = k / 6 * Math.PI / 2, rr = L * r / 8 * (k % 2 ? 0.92 : 1); k ? g.lineTo(ox + Math.cos(an) * rr, oy + Math.sin(an) * rr) : g.moveTo(ox + Math.cos(an) * rr, oy + Math.sin(an) * rr); } g.stroke(); }
    }
    // the candle burns down
    const ch = lerp(260, 40, age);
    const cg = g.createLinearGradient(fx - 30, 0, fx + 30, 0); cg.addColorStop(0, '#b8a890'); cg.addColorStop(0.5, '#f4ece0'); cg.addColorStop(1, '#a89880');
    g.fillStyle = cg; g.fillRect(fx - 26, 1060 - ch, 52, ch);
    g.fillStyle = '#e8dcc8'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(fx - 20 + i * 13, 1060 - ch + 30 + i * 20 * age, 6, 26 * age + 8, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#3a2a1a'; g.fillRect(fx - 80, 1050, 160, 30);
    NM.flame(g, fx, 1060 - ch, 46, t, 3, { color: '#ffcf7a', glowR: 9, glowA: 0.55 });
    g.restore();
    S.post.grade = { shadow: '#140a06', light: '#ffd8a8', amount: 0.3 };
  }, { name: 'tp-portrait', paint: { r: 4 }, in: { type: 'fade', dur: 0.4 } });

  // ======================================================================
  // OUTRO A  149.50 – 161.90
  // ======================================================================
  // 149.50 – 152.85 "So whisper low, confess your fear"
  NM.shot(149.5, 152.85, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0c0610'], [1, '#2a1020']]);
    for (let i = 0; i < 22; i++) { const x = hash1(i * 3 + 5) * W, y = hash1(i * 5 + 5) * H * 0.8; glow(g, x + Math.sin(t * 0.3 + i) * 16, y, 30 + hash1(i * 7) * 60, i % 3 ? '#a080c0' : '#ff6080', 0.18 + 0.15 * hash1(i * 9)); }
    const drift = lt * 10;
    NM.paintLucien(g, 760 + drift, 480, 660, lt < 1.7 ? 'plead' : 'sleep', t, { yaw: 0.12, noBlink: true, light: 0.6 });
    NM.paintIsolde(g, 1290 - drift * 1.4, 420, 620, 'smirk', t, { yaw: -0.55, noBlink: true, light: -0.6, tilt: -0.08 });
    const ax = 1290 - drift * 1.4 - 0.12 * 620, ay = 420 + 0.3 * 620, bx = 760 + drift + 0.34 * 660, by = 480 + 0.06 * 660;
    g.save(); g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 10; i++) { const k = (lt * 0.8 + i / 10) % 1; glow(g, lerp(ax, bx, k) + Math.sin(t * 5 + i) * 8, lerp(ay, by, k) - Math.sin(k * Math.PI) * 40, 18 + 16 * Math.sin(k * Math.PI), '#ffd0e0', 0.45 * Math.sin(k * Math.PI)); }
    g.restore();
    S.post.grade = { shadow: '#100614', light: '#ffc8d8', amount: 0.3 };
  }, { name: 'oa-whisper', paint: { r: 4 }, in: { type: 'black', dur: 0.3 } });

  // 152.85 – 155.70 "In death's embrace, you're chained right here" — silhouettes before the blood moon
  NM.shot(152.85, 155.7, (g, S) => {
    const t = S.t, lt = S.lt;
    const z = 1 + lt * 0.03;
    g.save(); g.translate(W / 2, 640); g.scale(z, z); g.translate(-W / 2, -640);
    NM.paintSky(g, t, { top: '#0e0408', mid: '#3a0c16', low: '#7a1e2a', moon: { x: 960, y: 440, r: 340, blood: 0.9 }, stars: 0, clouds: 0.6, cloudDark: '#1a0608', cloudLight: '#ff8a8a', speed: 8 });
    NM.paintRidge(g, 6, 900, 22, 0.002, '#12060a', '#ff7a7a');
    NM.silhouette(g, '#0e0508', (q) => { for (const [x, ty] of [[300, 1], [470, 0], [1440, 2], [1620, 1]]) { q.save(); q.translate(x, 905); q.fillRect(-26, -110, 52, 110); if (ty === 1) { q.fillRect(-60, -86, 120, 22); q.fillRect(-12, -150, 24, 150); } q.restore(); } });
    NM.paintTree(g, 120, 960, 900, 11, t, { rim: 'rgba(255,120,120,0.35)', lean: 0.2 });
    const reveal = clamp(lt / 2.2), N = 90, cx = 960;
    const pts = [];
    for (let k = 0; k <= Math.floor(N * reveal); k++) { const f = k / N, a = f * TAU * 3.5 + t * 0.6; pts.push([cx + Math.cos(a) * 250, 900 - f * 560 + Math.sin(a) * 46, Math.sin(a)]); }
    const runs = (front) => { const out = []; let cur = []; for (const p of pts) { if ((p[2] > 0) === front) cur.push(p[0], p[1]); else if (cur.length) { out.push(cur); cur = []; } } if (cur.length) out.push(cur); return out.filter((r) => r.length >= 4); };
    const asPts = (r) => (r.length === 4 ? [r[0], r[1], (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, r[2], r[3]] : r);
    for (const r of runs(false)) NM.chain(g, asPts(r), 30, { color: '#6a0a18', thick: 5 });
    NM.withRim(g, (q) => NM.silhouette(q, '#0a0406', (r) => embraceSil(r, 960, 905, 780, t)), '#ffb0a0', 0.3, -1, 5, 0.9);
    for (const r of runs(true)) NM.chain(g, asPts(r), 30, { color: '#ff3a52', thick: 6, glow: 0.8 });
    NM.particles(g, t, { n: 50, seed: 45, kind: 'petal', vx: -30, vy: 60, drift: 40, size: [7, 12], alpha: 0.9 });
    g.restore();
    S.post.grade = { shadow: '#14040a', light: '#ffb0a0', amount: 0.3 };
  }, { name: 'oa-embrace', in: { type: 'fade', dur: 0.3 } });

  // 155.70 – 158.65 "They'll say it's wrong, a tale profaned" — the storybook
  NM.shot(155.7, 158.65, (g, S) => {
    const t = S.t, lt = S.lt;
    const z = 1 + lt * 0.025;
    g.save(); g.translate(W / 2, 520); g.scale(z, z); g.translate(-W / 2, -520);
    NM.skyGrad(g, [[0, '#120a0c'], [1, '#2a1812']]);
    glow(g, 960, 480, 900, '#ffb060', 0.3);
    // lectern + cover
    g.fillStyle = '#2a1a12'; g.beginPath(); g.moveTo(300, 960); g.lineTo(1620, 960); g.lineTo(1540, H); g.lineTo(380, H); g.fill();
    g.fillStyle = '#3a1418'; g.beginPath(); g.roundRect(250, 120, 1420, 860, 20); g.fill();
    const page = (x0, x1, dark) => { const pg = g.createLinearGradient(x0, 0, x1, 0); pg.addColorStop(0, dark ? '#b89868' : '#e8d4a8'); pg.addColorStop(1, dark ? '#e8d4a8' : '#b89868'); g.fillStyle = pg; g.beginPath(); g.moveTo(x0, 150); g.quadraticCurveTo((x0 + x1) / 2, 130, x1, 150); g.lineTo(x1, 950); g.quadraticCurveTo((x0 + x1) / 2, 930, x0, 950); g.closePath(); g.fill(); };
    page(290, 960, false); page(960, 1630, true);
    softShade(g, 960, 550, 60, 420, '#3a2010', 0.6);
    // left page: the illustration in an oval vignette
    g.save(); g.beginPath(); g.ellipse(625, 530, 250, 330, 0, 0, TAU); g.clip();
    g.fillStyle = '#c8a878'; g.fillRect(360, 180, 540, 720);
    glow(g, 700, 330, 160, '#f8ecd0', 0.6);
    NM.silhouette(g, INK, (q) => {
      NM.figLucien(q, 670, 860, 560, { dir: -1, lean: 0.1, armF: [1.5, 0.95], armB: [1.3, 1.0], yaw: 0.3 }, t);
      NM.figIsolde(q, 580, 860, 520, { dir: 1, lean: 0.1, armF: [1.55, 0.95], armB: [1.35, 1.0], wind: 0.8, yaw: 0.4 }, t);
      q.fillRect(360, 850, 540, 60);
      for (const x of [420, 830]) { q.fillRect(x - 14, 760, 28, 100); q.fillRect(x - 40, 784, 80, 18); }
    });
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.ellipse(625, 530, 250, 330, 0, 0, TAU); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.ellipse(625, 530, 266, 346, 0, 0, TAU); g.stroke();
    // a page turning right to left
    const k = clamp((lt - 1.4) / 0.7);
    if (k > 0 && k < 1) {
      const w = 670 * Math.cos(k * Math.PI);
      const tg = g.createLinearGradient(960, 0, 960 + w, 0); tg.addColorStop(0, '#c8b088'); tg.addColorStop(1, '#f4e6c4');
      g.fillStyle = tg; g.beginPath(); g.moveTo(960, 150); g.quadraticCurveTo(960 + w / 2, 120 - Math.sin(k * Math.PI) * 40, 960 + w, 150 - Math.sin(k * Math.PI) * 30); g.lineTo(960 + w, 950 - Math.sin(k * Math.PI) * 30); g.quadraticCurveTo(960 + w / 2, 930, 960, 950); g.closePath(); g.fill();
      softShade(g, 960 + w, 550, 30, 420, '#000000', 0.3);
    }
    NM.paintCandle(g, 1760, 980, 2.2, t, 4);
    g.restore();
    S.post.extraUI = [(u) => {
      const o = { color: INK, shadow: 'rgba(0,0,0,0)', blur: 0, align: 'center' };
      if (k < 0.5) {
        NM.uiText(u, 'The Bride of the Grave', 1295, 300, Object.assign({}, o, { font: '62px "UnifrakturMaguntia"', color: '#5a0a10' }));
        ['She would not let him sleep.', 'They say it was a sin.', 'She says', 'it was love.'].forEach((l, i) => NM.uiText(u, l, 1295, 440 + i * 80, Object.assign({}, o, { font: 'italic 48px "IM Fell English"' })));
      } else if (k >= 1) {
        ['Some loves end', 'in a grave.', '', 'Hers began there.'].forEach((l, i) => NM.uiText(u, l, 1295, 380 + i * 90, Object.assign({}, o, { font: 'italic 54px "IM Fell English"', color: i === 3 ? '#7a0a14' : INK })));
      }
    }];
    S.post.grade = { shadow: '#1a0c06', light: '#ffe0b0', amount: 0.3 };
  }, { name: 'oa-book', paint: { r: 4 }, in: { type: 'black', dur: 0.2 } });

  // 158.65 – 161.50 "But darling, we are death's ordained" — hand in hand before the moon
  NM.shot(158.65, 161.5, (g, S) => {
    const t = S.t, lt = S.lt;
    const z = 1 + lt * 0.03;
    g.save(); g.translate(W / 2, 600); g.scale(z, z); g.translate(-W / 2, -600);
    NM.paintSky(g, t, { top: '#0a0a16', mid: '#2a2a4a', low: '#5a4a6a', moon: { x: 960, y: 470, r: 360 }, clouds: 0.5, speed: 6 });
    NM.paintRidge(g, 4, 870, 26, 0.002, '#0c0a14', '#c8c0f0');
    for (const [x, ty] of [[420, 1], [560, 2], [1380, 0], [1560, 3]]) NM.paintGrave(g, x, 880, 70, 130, ty, { light: x < 960 ? 0.6 : -0.6, fog: 0.3, seed: x });
    NM.paintTree(g, 1820, 900, 800, 6, t, { rim: 'rgba(200,200,255,0.3)', lean: -0.2 });
    let hand = [960, 600];
    NM.withRim(g, (q) => NM.silhouette(q, '#0a0810', (r) => { hand = backCoupleSil(r, 960, 905, 640, t); }), '#ecebff', 0, -1, 5, 0.85);
    glow(g, hand[0], hand[1], 70, '#ff3a52', 0.6 + 0.2 * Math.sin(t * 3));
    NM.chain(g, [hand[0], hand[1] + 10, hand[0] - 14, hand[1] + 140, hand[0] + 8, 900], 14, { color: '#ff3a52', thick: 3, glow: 0.6 });
    NM.particles(g, t, { n: 50, seed: 47, kind: 'petal', vx: -40, vy: 50, drift: 30, size: [6, 11], alpha: 0.85 });
    g.restore();
    S.post.grade = { shadow: '#0a0814', light: '#e0dcff', amount: 0.3 };
  }, { name: 'oa-hands', in: { type: 'fade', dur: 0.3 } });

  NM.shot(161.5, 161.9, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }, { name: 'oa-drop', ui: 'none' });

  // ======================================================================
  // OUTRO B  161.90 – 173.60
  // ======================================================================
  // 161.90 – 164.75 the title again, now with him beside her
  NM.shot(161.9, 164.75, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.titleArt(g, t, lt, true);
    S.post.ui = 'none';
    S.post.extraUI = [(u) => {
      const a = range(0.1, 0.9, lt);
      NM.titleLogo(u, a);
      NM.uiText(u, '~ a love that will not die ~', W / 2, 440, { font: 'italic 46px "IM Fell English"', align: 'center', color: '#f0c8c0', alpha: a });
      NM.titleMenu(u, t, 1, range(0.8, 1.2, lt), lt > 2.2);
      if (NM.SHOW_LYRICS !== false) NM.drawSubtitle(u, t, { y: 1020, color: '#f6dcd2' });
    }];
    S.post.grade = { shadow: '#1a0610', light: '#ff9a8a', amount: 0.3 };
  }, { name: 'ob-title', in: { type: 'red', dur: 0.3 } });

  // 164.75 – 167.65 "This love of dark, the final price" — her own hand turns to bone
  NM.shot(164.75, 167.65, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#120a0c'], [1, '#2e1812']]);
    glow(g, 300, 400, 700, '#ffb060', 0.3);
    glow(g, 1000, 460, 650, '#c87040', 0.3);
    NM.paintCandle(g, 300, 900, 2.6, t, 2);
    const hx = 720, hy = 1000, s = 640, a = -0.92, u = s / 100;
    const decay = ease.inOutSine(range(0.3, 2.5, lt));
    const thr = lerp(115, -12, decay);
    const hp = { curls: [0.12 + decay * 0.25, 0.1 + decay * 0.2, 0.14 + decay * 0.25, 0.2 + decay * 0.25, 0.1], spread: 0.6, arm: 150, armW: 26, sleeve: '#0e0b14', sleeveHi: '#4a3a5e', cuff: 'lace', light: 1 };
    NM.paintHand(g, hx, hy, s, a, Object.assign({ kind: 'bone' }, hp));
    const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    const bx = hx + dx * thr * u, by = hy + dy * thr * u;
    NM.withRim(g, (q) => {
      q.beginPath();
      q.moveTo(bx + nx * 3000, by + ny * 3000); q.lineTo(bx - nx * 3000, by - ny * 3000); q.lineTo(bx - nx * 3000 - dx * 5000, by - ny * 3000 - dy * 5000); q.lineTo(bx + nx * 3000 - dx * 5000, by + ny * 3000 - dy * 5000); q.closePath(); q.clip();
      NM.paintHand(q, hx, hy, s, a, Object.assign({ kind: 'glove', ring: '#ff3a52' }, hp));
    }, '#ffc090', 1, -0.6, 4, 0.8);
    // the dissolving edge: embers and ash
    if (decay > 0.01 && decay < 0.99) {
      for (let i = 0; i < 26; i++) { const f = (hash1(i * 3) - 0.5) * 50 * u, rise = ((t * 0.8 + hash1(i * 7)) % 1); const px = bx + nx * f + rise * 40 * u * (hash1(i) - 0.3), py = by + ny * f - rise * 60 * u; glow(g, px, py, 6 + hash1(i * 5) * 10, i % 3 ? '#ff7a3a' : '#ffd0a0', 0.7 * (1 - rise)); }
      g.strokeStyle = 'rgba(255,110,60,0.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx + nx * 22 * u, by + ny * 22 * u); g.lineTo(bx - nx * 22 * u, by - ny * 22 * u); g.stroke();
    }
    NM.particles(g, t, { n: 40, seed: 66, kind: 'dot', x: 600, y: 0, w: 900, h: 700, vx: 10, vy: -40, drift: 30, size: [1.5, 3.5], color: '#8a8078', alpha: 0.5 * decay });
    S.post.grade = { shadow: '#140808', light: '#ffd0a8', amount: 0.3 };
  }, { name: 'ob-hand', paint: { r: 4 }, in: { type: 'black', dur: 0.2 } });

  // 167.65 – 170.45 "I wear your soul, a triumph cold" — the locket glows on her breast
  NM.shot(167.65, 170.45, (g, S) => {
    const t = S.t, lt = S.lt;
    const z = 1 + lt * 0.035;
    g.save(); g.translate(960, 700); g.scale(z, z); g.translate(-960, -700);
    NM.skyGrad(g, [[0, '#0a0810'], [1, '#1a1428']]);
    glow(g, 960, 820, 500, '#7ab8ff', 0.25 + 0.1 * Math.sin(t * 3));
    const pulse = 0.6 + 0.4 * Math.sin(t * 3);
    NM.paintIsolde(g, 960, 380, 620, lt < 1.5 ? 'cold' : 'smirk', t, { yaw: 0.1, noBlink: false, light: -0.3, locket: pulse });
    const lx = 960, ly = 380 + 128 * 620 / 185 + 30, s = 54;
    NM.chain(g, [lx - 120, ly - 140, lx - 40, ly - 40, lx, ly - s * 0.6], 10, { color: '#b08850', thick: 2, highlight: '#f8e0a0' });
    NM.chain(g, [lx + 120, ly - 140, lx + 40, ly - 40, lx, ly - s * 0.6], 10, { color: '#b08850', thick: 2, highlight: '#f8e0a0' });
    g.save(); g.translate(lx, ly);
    g.beginPath(); g.moveTo(0, s * 0.62); g.bezierCurveTo(-s, -s * 0.05, -s * 0.6, -s * 0.85, 0, -s * 0.36); g.bezierCurveTo(s * 0.6, -s * 0.85, s, -s * 0.05, 0, s * 0.62); g.closePath();
    const lg = g.createLinearGradient(-s, -s, s, s); lg.addColorStop(0, '#fbe6a0'); lg.addColorStop(0.5, '#c89040'); lg.addColorStop(1, '#5a3a14');
    g.fillStyle = lg; g.fill();
    g.restore();
    glow(g, lx, ly, 90, '#b9e6ff', 0.7 * pulse);
    g.save(); g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 8; i++) { const a = t * 1.2 + i / 8 * TAU, r = 220 + Math.sin(t + i) * 40; glow(g, lx + Math.cos(a) * r, ly - 200 + Math.sin(a) * r * 0.4 - 100, 22, '#b9e6ff', 0.5); }
    g.restore();
    g.restore();
    S.post.grade = { shadow: '#080a14', light: '#d0e8ff', amount: 0.3 };
  }, { name: 'ob-locket', paint: { r: 4 }, in: { type: 'fade', dur: 0.3 } });

  // 170.45 – 173.60 "The lifeless heart, in death's firm hold"
  NM.shot(170.45, 173.6, (g, S) => {
    const t = S.t, lt = S.lt;
    NM.skyGrad(g, [[0, '#0e0408'], [1, '#2a0810']]);
    const life = 1 - clamp(lt / 2.6);
    const b = NM.beat(t, 7) * life;
    glow(g, 900, 560, 700, '#ff2040', 0.15 + b * 0.3);
    const hx = 470, hy = 800, s = 600, a = -0.1, u = s / 100;
    const hp = { kind: 'glove', flip: true, curl: 0.42, spread: 0.15, arm: 120, armW: 28, sleeve: '#0e0b14', sleeveHi: '#4a3a5e', cuff: 'lace', ring: '#ff3a52', light: 1 };
    NM.paintHand(g, hx, hy, s, a, hp);
    const cx = hx + 32 * u, cy = hy - 14 * u - 205;
    glow(g, cx, cy, 380, '#ff2040', 0.12 + b * 0.25);
    g.save(); g.translate(cx, cy); paintHeartRef(g, 1.75 * (1 + b * 0.08), t); g.restore();
    // fingers over the front of the heart
    const dx = Math.cos(a), dy = Math.sin(a), kx = hx + dx * 38 * u, ky = hy + dy * 38 * u;
    g.save(); g.beginPath(); g.moveTo(kx - dy * 3000, ky + dx * 3000); g.lineTo(kx + dy * 3000, ky - dx * 3000); g.lineTo(kx + dy * 3000 + dx * 4000, ky - dx * 3000 + dy * 4000); g.lineTo(kx - dy * 3000 + dx * 4000, ky + dx * 3000 + dy * 4000); g.closePath(); g.clip();
    NM.paintHand(g, hx, hy, s, a, hp);
    g.restore();
    for (let i = 0; i < 4; i++) { const k = (t * 0.6 + i * 0.27) % 1; g.fillStyle = '#7a0a1a'; g.beginPath(); g.ellipse(cx + 30 + i * 46, hy + 40 + k * 300, 6, 12, 0, 0, TAU); g.fill(); }
    S.post.extraUI = [(u2) => {
      const a2 = range(1.6, 2.2, lt);
      if (a2 <= 0) return;
      u2.save(); u2.globalAlpha = a2; u2.strokeStyle = '#ff3a52'; u2.lineWidth = 3; u2.shadowColor = 'rgba(255,40,70,0.8)'; u2.shadowBlur = 12;
      u2.beginPath(); u2.moveTo(1240, 300); u2.lineTo(1420, 300); u2.lineTo(1440, 260); u2.lineTo(1460, 330); u2.lineTo(1480, 300); u2.lineTo(1780, 300); u2.stroke(); u2.restore();
    }];
    S.post.grade = { shadow: '#14040a', light: '#ffb0a0', amount: 0.3 };
  }, { name: 'ob-heart', in: { type: 'fade', dur: 0.3 } });
  function paintHeartRef(g, s, t) { NM.paintHeart(g, s, t); }

  // ======================================================================
  // ENDING  173.60 – 188.76
  // ======================================================================
  NM.shot(173.6, 178.4, (g, S) => {
    const t = S.t, lt = S.lt;
    const w4 = NM.manorWin(4), sc = 1.1, mx = W / 2, my = 780;
    const fx = mx + w4.x * sc, fy = my + w4.y * sc;
    const z = lerp(1, 2.4, ease.inOutSine(clamp(lt / 4.8)));
    g.save(); g.translate(fx, fy); g.scale(z, z); g.translate(-fx, -fy);
    NM.manorScene(g, t, { x: mx, y: my, scale: sc, lit: [4, 10] });
    g.save(); g.beginPath(); g.rect(fx - w4.w * sc / 2, fy - w4.h * sc / 2, w4.w * sc, w4.h * sc); g.clip();
    g.fillStyle = '#ffcf8a'; g.fillRect(fx - 40, fy - 60, 80, 120);
    NM.silhouette(g, '#120a10', (q) => NM.waltz(q, fx, fy + w4.h * sc / 2, w4.h * sc * 0.8, t, t * 2));
    g.restore();
    for (let i = 0; i < 7; i++) NM.paintGrave(g, 200 + i * 260, 1000 + (i % 2) * 30, 90, 150, i % 5, { moss: true, light: 0.5, seed: i });
    g.restore();
    NM.ironGate(g, W / 2, H + 60, 1300, 640, 0);
    NM.paintCat(g, W / 2 - 700, H + 60 - 640 - 80, 120, t, { dir: 1 });
    NM.paintFog(g, t, 820, 300, 0.3, '#6a6090', 12);
    S.post.ui = 'none';
    S.post.grade = { shadow: '#0a0812', light: '#ffd0a0', amount: 0.3 };
  }, { name: 'end-mansion', in: { type: 'fade', dur: 0.5 }, out: { dur: 0.6 } });

  // 178.40 – 184.40 ending card + credits
  NM.shot(178.4, 184.4, (g, S) => {
    const t = S.t, lt = S.lt;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const a = range(0.1, 0.6, lt) * (1 - range(5.3, 5.9, lt));
    if (a > 0.02) {
      g.save(); g.globalAlpha = a;
      glow(g, 960, 880, 260, '#a3122a', 0.5);
      NM.paintRose(g, 960, 880, 80, t * 0.05, t, {});
      g.restore();
      NM.particles(g, t, { n: 30, seed: 93, kind: 'petal', vx: -20, vy: 40, drift: 30, size: [5, 9], alpha: 0.7 * a });
    }
    S.post.ui = 'none';
    S.post.extraUI = [(u) => {
      NM.titleLogo(u, a, 300);
      const lines = [[0.8, 'ENDING  —  Death\'s Ordained', '#ff5a6e', '48px "Cinzel"'], [1.6, 'Music   darkmatter96', '#ece6da', 'italic 46px "IM Fell English"'], [2.3, 'Isolde  &  Lucien', '#b8b0d8', 'italic 46px "IM Fell English"'], [3.0, 'Thank you for playing.', '#ece6da', 'italic 46px "IM Fell English"']];
      lines.forEach(([t0, s, col, font], i) => {
        const k = clamp((lt - t0) / 0.6);
        if (k <= 0 || a < 0.3) return;
        NM.uiText(u, s.slice(0, Math.ceil(s.length * k)), W / 2, 450 + i * 80, { font, align: 'center', color: col, alpha: a });
      });
    }];
  }, { name: 'end-card', in: { type: 'black', dur: 0.4 } });

  // 184.40 – 185.80 "...?" — one last look
  NM.shot(184.4, 185.8, (g, S) => {
    const lt = S.lt;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    S.post.ui = 'none';
    if (lt < 0.75) S.post.extraUI = [(u) => NM.uiText(u, '...?', W / 2, 560, { font: 'italic 72px "IM Fell English"', align: 'center', color: '#9a92b8' })];
    else if (lt < 1.15) { NM.scareFaceP(g, S.t, lt, { bg: '#000' }); S.post.glitch = 0.7; S.post.chroma = 1; S.post.shake = 2; }
  }, { name: 'end-sting', paint: { r: 4 } });

  NM.shot(185.8, 189.0, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }, { name: 'end-black', ui: 'none' });
})();
