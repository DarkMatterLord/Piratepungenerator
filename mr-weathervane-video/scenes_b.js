'use strict';
// Section B — Chorus 1, Verse 2, Pre-Chorus 2, Chorus 2 (48.5 – 131.3 s)

// ================= chorus building blocks (v = 0 bright, v = 1 dark reprise) =================
function confetti(T, n, o = {}) {
  const cols = o.colors || ['#e2574c', '#f2b84b', '#4fa79a', '#f6efdc', '#4f8fc0', '#e98aa0'];
  for (let i = 0; i < n; i++) {
    const x = hash2(i, 21) * W + Math.sin(T * 2 + i) * 30;
    const y = ((hash2(i, 22) * H * 1.3 + T * (160 + hash2(i, 23) * 140)) % (H * 1.3)) - 100;
    push(x, y, T * (2 + hash2(i, 24) * 3) + i, 1, Math.cos(T * 4 + i));
    paper((c) => pRect(c, -9, -5, 18, 10), cols[i % cols.length], { d: 0.6, tex: 0.3 });
    pop();
  }
}
function stamp(text, x, y, k, o = {}) {
  if (k <= 0) return;
  const s = lerp(2.4, 1, easeOutBack(clamp(k)));
  push(x, y, o.rot ?? -0.08, s);
  ctx.save(); ctx.globalAlpha = clamp(k * 3);
  const w = measure(text, o.font) + 70;
  paper((c) => pPoly(c, [[-w / 2, -86], [w / 2, -92], [w / 2 + 6, 70], [-w / 2 - 4, 76]], 3, 5), o.bg || '#f6efdc', { d: 1.8, tex: 0.8 });
  ctx.strokeStyle = o.ink || '#c8332a'; ctx.lineWidth = 9; ctx.strokeRect(-w / 2 + 16, -70, w - 32, 128);
  ptext(text, 0, 38, o.font, o.ink || '#c8332a', { d: 0, tex: 0.6 });
  ctx.restore();
  pop();
}
function chorusTitle(T, t0, v) {
  const tH = atWord('hundred', t0 - 0.1), tP = atWord('percent', t0), tC = atWord('chance', t0), tD = atWord('demise', t0);
  paperBackdrop(v ? '#0e1a2e' : '#f6efdc');
  if (!v) sunburst(960, 600, 1500, 28, T * 0.3, '#f7d77e', '#f2a65a');
  else {
    sunburst(960, 600, 1500, 28, -T * 0.4, '#15263f', '#0b1628');
    crayonStorm(960, 560, 1000, T, { alpha: 0.35, n: 46, w: 6 });
    if (hash2(Math.floor(T * 6), 3) < 0.12) { ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#dff6ff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  // umbrella chorus line
  for (let i = 0; i < 7; i++) {
    const tp = tH + i * 0.2, k = easeOutBack(seg(T, tp, tp + 0.25));
    if (k <= 0) continue;
    const flip = v ? seg(T, tD, tD + 0.35) * (i % 2 ? 1 : -1) * 0.9 : 0;
    umbrella(170 + i * 263, 1150 - beatPulse(T, 8) * 16, 1.2 * k, Math.sin(T * 4 + i) * 0.12 + flip, v ? ['#5a1f2a', '#2c3b5e', '#0e4b42', '#3b2c52'][i % 4] : ['#e2574c', '#f2b84b', '#4fa79a', '#e98aa0', '#4f8fc0', '#f2b84b', '#e2574c'][i]);
  }
  // the host rises on a stick
  const rise = easeOutBack(seg(T, t0 - 0.05, t0 + 0.45));
  const py = lerp(1750, 1060, rise);
  stick(1590, py - 40, 1590, py + 400, 10);
  const P = wvPose({ x: 1590, y: py, s: 0.6, pointer: null, al: Object.assign({ hand: 'spread' }, ARM.wide), ar: Object.assign({ hand: 'spread' }, ARM.wide), grin: v ? 0.8 : 0.2, storm: v ? 0.85 : 0, pale: v ? 0.5 : 0 });
  wvLive(T, P, { bounce: 14 });
  drawWeathervane(P, T);
  // 100%
  const k1 = easeOutBack(seg(T, tH, tH + 0.32)), k2 = easeOutBack(seg(T, tP, tP + 0.3));
  const shake = v ? Math.sin(T * 50) * 4 * beatPulse(T, 10) : 0;
  if (k1 > 0) {
    push(720 + shake, 590, -0.05, lerp(2.2, 1, k1));
    ctx.save(); ctx.globalAlpha = clamp(k1 * 2);
    ptext('100', 16, 18, '440px "Alfa Slab One"', v ? '#0b3a2c' : '#c8433a', { d: 0, tex: 0.5 });
    ptext('100', 0, 0, '440px "Alfa Slab One"', v ? '#cfd4dc' : '#fff3d6', { d: 2.2, tex: 0.6 });
    if (v) { ctx.strokeStyle = '#0e1a2e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-150, -280); ctx.lineTo(-90, -160); ctx.lineTo(-130, -60); ctx.lineTo(-60, 30); ctx.stroke(); }
    ctx.restore();
    pop();
  }
  if (k2 > 0) {
    push(1250 + shake, lerp(-200, 590, k2), 0.08);
    ptext('%', 14, 16, '400px "Alfa Slab One"', v ? '#0b3a2c' : '#c8433a', { d: 0, tex: 0.5 });
    ptext('%', 0, 0, '400px "Alfa Slab One"', v ? '#4fe0a8' : '#14855e', { d: 2.2, tex: 0.6 });
    pop();
  }
  if (T > tC) ribbon(880, 735, lerp(80, 860, easeOutBack(seg(T, tC, tC + 0.35))), 'CHANCE OF', { h: 104, font: '72px "Limelight"', color: v ? '#5a1f2a' : '#c8433a', dark: v ? '#3a121a' : '#8e2b26' });
  stamp('DEMISE!', 900, 935, seg(T, tD, tD + 0.25), { font: '140px "Bebas Neue"', ink: v ? '#ff5a4a' : '#c8332a', bg: v ? '#16233a' : '#f6efdc' });
  if (!v) confetti(T, 46); else confetti(T, 26, { colors: ['#4fe0a8', '#cfd4dc', '#1d2a44'] });
}

function eyesCloseup(T, t0, v) {
  const tS = atWord('silverlined', t0), tM = atWord('maybe', t0), tE = atWord('eyes', t0);
  const z = kf(T, [[t0, 1.0], [tE, 1.15], [t0 + 4.4, 1.35]]);
  withCam({ x: 960 + (z - 1) * 600, y: 520, z }, 1, () => {
    paperBackdrop(v ? '#1b2238' : '#f4b9a4');
    for (let i = 0; i < 14; i++) paper((c) => pStar(c, hash2(i, 1) * W, hash2(i, 2) * H, 40, 16, 4, 0), v ? '#26304c' : '#f7c9b5', { d: 0.3, tex: 0.4 });
    const skin = v ? '#c9cbbf' : '#f6dcc8';
    paper((c) => pBlob(c, 960, 380, 760, 480, 0.04, 9, 60), v ? '#2a1a14' : '#7a3b22', { d: 2, tex: 0.7 });
    paper((c) => pBlob(c, 960, 640, 640, 560, 0.02, 3, 70), skin, { d: 2.4, tex: 0.7, edge: '#fff', edgeA: 0.3 });
    paper((c) => { c.moveTo(380, 300); c.quadraticCurveTo(700, 80, 960, 170); c.quadraticCurveTo(1220, 80, 1540, 300); c.quadraticCurveTo(1300, 210, 960, 260); c.quadraticCurveTo(620, 210, 380, 300); c.closePath(); }, v ? '#2a1a14' : '#7a3b22', { d: 1.6, tex: 0.7 });
    for (const sx of [-1, 1]) {
      const ex = 960 + sx * 250, ey = 560;
      line([[ex - 130, ey - 150], [ex, ey - 175], [ex + 130, ey - 150]].map(([x, y]) => [x, y + (T > tM ? -12 : 0)]), '#4a2a1a', 14);
      const eye = (c) => c.ellipse(ex, ey, 165, 120, 0, 0, TAU);
      paper(eye, '#ffffff', { d: 0.8, tex: 0.4 });
      ctx.save(); ctx.beginPath(); eye(ctx); ctx.clip();
      const ix = ex + (v ? Math.sin(T * 1.5) * 10 : 0);
      paper((c) => c.arc(ix, ey + 10, 105, 0, TAU), v ? '#1d5a44' : '#4f8fc0', { d: 0.4, tex: 0.4 });
      paper((c) => c.arc(ix, ey + 10, 52, 0, TAU), '#141018', { d: 0, tex: 0.2 });
      // reflection: a window of sky with a silver-lined cloud
      ctx.save(); ctx.beginPath(); ctx.ellipse(ix - 22, ey - 18, 64, 44, -0.3, 0, TAU); ctx.clip();
      ctx.fillStyle = v ? '#1c2a48' : '#bfe6f5'; ctx.fillRect(ix - 100, ey - 80, 200, 140);
      cloud(ix - 22 + Math.sin(T * 1.2) * 8, ey - 14, 96, 46, { seed: 4, silver: T > tS ? 1 : 0.0, color: v ? '#4a5266' : null, shade: v ? '#2e3444' : null });
      if (v && hash2(Math.floor(T * 8), sx + 5) < 0.3) bolt(ix - 10, ey + 10, 0.22, 0.2);
      ctx.restore();
      if (T > tM) { const g = pulse(T, tM, 0.8); paper((c) => pStar(c, ix + 40, ey - 40, 30 * (0.4 + g), 5, 4, 0.3), '#ffffff', { d: 0, tex: 0 }); }
      ctx.restore();
      line([[ex - 168, ey - 6], [ex - 80, ey - 112], [ex + 80, ey - 112], [ex + 168, ey - 6]], '#2b2420', 8);
      for (let k = 0; k < 5; k++) { const a = -2.6 + k * 0.33; line([[ex + Math.cos(a) * 160, ey + Math.sin(a) * 118], [ex + Math.cos(a) * 196, ey + Math.sin(a) * 150]], '#2b2420', 6); }
    }
    paper((c) => { c.moveTo(950, 640); c.quadraticCurveTo(920, 760, 990, 790); c.quadraticCurveTo(960, 740, 950, 640); c.closePath(); }, '#e9bfa4', { d: 0.4, tex: 0.5 });
    ctx.fillStyle = 'rgba(240,120,110,0.35)';
    ctx.beginPath(); ctx.ellipse(640, 780, 80, 46, 0, 0, TAU); ctx.ellipse(1280, 780, 80, 46, 0, 0, TAU); ctx.fill();
    paper((c) => { c.moveTo(860, 900); c.quadraticCurveTo(960, 960, 1060, 900); c.quadraticCurveTo(960, 930, 860, 900); c.closePath(); }, '#c8433a', { d: 0.6, tex: 0.5 });
  });
}

function moonFace(x, y, r) {
  paper((c) => pBlob(c, x, y, r, r, 0.01, 7, 48), '#e9edd8', { d: 2, tex: 0.7, edge: '#fff', edgeA: 0.5 });
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  for (let k = 0; k < 5; k++) paper((c) => pBlob(c, x - r * 0.5 + hash2(k, 1) * r, y - r * 0.5 + hash2(k, 2) * r, r * 0.12, r * 0.1, 0.1, k), '#cfd6c0', { d: 0.2, tex: 0.5 });
  push(x, y + r * 0.95, 0, r / 230);
  scaled(r / 230, () => {
    const P = wvPose({ x: 0, y: 0, s: 1, grin: 0.7, storm: 0.6, pale: 0.6 });
    wvHead(P, E.T);
  });
  pop();
  ctx.restore();
}
function stagePass(T, t0, v) {
  const tPass = atWord('pass', t0), tStay = atWord('stay', t0), tMorn = atWord('morning', t0), tYou = atWord('you', tMorn);
  drawStage({ stars: v ? 1 : 0, mid: () => {
    const rise = easeOutBack(seg(T, tMorn - 0.1, tMorn + 0.55)) - easeIn(seg(T, tYou + 0.15, tYou + 0.55)) * (v ? 0 : 0.45);
    if (!v) sun(1430, lerp(1000, 560, rise), 95, { face: 'worried', stick: 1300, lookX: -1 });
    else { stick(1430, lerp(1000, 520, rise), 1430, 1400); moonFace(1430, lerp(1000, 520, rise), 130); }
  }, front: () => {
    const x = T < tStay ? lerp(-320, 900, easeOut(seg(T, t0, tStay))) : 900 + Math.sin((T - tStay) * 6) * 10 * Math.exp(-(T - tStay));
    const y = 400 + Math.sin(T * 3) * 10;
    cloud(x, y, 400, 170, { stick: 640, face: T > tMorn + 0.35 ? 'grin' : 'smile', seed: 3, color: v ? '#565f78' : null, shade: v ? '#3a4156' : null });
    if (v) rain(x - 170, y + 70, 340, 520, 10, T, { seed: 4, s: 0.6 });
    if (T > tPass && T < tStay + 0.1) ptext('?', x + 170, y - 120, '110px "Alfa Slab One"', v ? '#4fe0a8' : '#14855e', { d: 1, tex: 0.4 });
  } });
}

function stageConduct(T, t0, v) {
  const tHeaven = atWord('heaven', t0), tThrough = atWord('through', t0);
  const jumpAll = easeOutBack(seg(T, tHeaven, tHeaven + 0.3)) * (1 - easeIn(seg(T, tThrough + 0.1, tThrough + 0.5)));
  drawStage({ stars: v ? 1 : 0, back: () => {
    for (let i = 0; i < 5; i++) {
      const bx = 270 + i * 345, beat = beatPulse(T, 6) * ((lastBeat(T) + i) % 2 ? 50 : 10);
      const by = 330 + (i % 2) * 70 - beat - jumpAll * 140;
      cloud(bx, by, 270, 115, { stick: 1000 - by, seed: i + 2, face: v ? 'grin' : 'smile', color: v ? '#4a5266' : null, shade: v ? '#2e3444' : null });
      if (v || T > tHeaven) rain(bx - 110, by + 60, 220, 460, 6, T, { seed: i, s: 0.6 });
      if (v && hash2(Math.floor(T * 4.4), i) < 0.22) bolt(bx + 10, by + 170, 0.8, 0.1);
    }
  }, front: () => {
    const ph = beatPhase(T);
    const P = wvPose({ x: 960, y: 1030, s: 0.64, pointer: 'l', grin: v ? 0.6 : 0.1, storm: v ? 0.7 : 0 });
    const conduct = { sh: 1.9 + Math.sin(ph * TAU) * 0.35, el: -0.4 + Math.cos(ph * TAU) * 0.3, wr: 0 };
    P.al = T > tHeaven - 0.1 && T < tThrough + 0.3 ? Object.assign({ hand: 'fist' }, ARM.up) : Object.assign({ hand: 'fist' }, conduct);
    P.pointerAng = T > tHeaven - 0.1 && T < tThrough + 0.3 ? 0 : -0.6;
    P.ar = T > tHeaven - 0.1 && T < tThrough + 0.3 ? Object.assign({ hand: 'spread' }, ARM.up) : Object.assign({ hand: 'spread' }, ARM.wide, { el: 0.4 + Math.sin(ph * TAU) * 0.2 });
    P.eyes = T > tHeaven && T < tThrough + 0.2 ? 'happy' : 'open';
    P.legL = Math.sin(T * 4.6) * 0.06; P.legR = -P.legL;
    wvLive(T, P, { bounce: 16 });
    drawWeathervane(P, T);
  } });
}

function bigKnob(x, y, r, rot, v) {
  paper((c) => pBlob(c, x, y, r * 1.25, r * 1.25, 0.005, 2, 64), v ? '#2b2f3a' : '#e9dcc2', { d: 2, tex: 0.7 });
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI * 0.75 + (i / 11) * Math.PI * 1.5;
    ptext(String(i + 2), x + Math.cos(a - Math.PI / 2) * r * 1.12, y + Math.sin(a - Math.PI / 2) * r * 1.12 + 14, '44px "Bebas Neue"', v ? '#9aa1ad' : '#3a2f28', { d: 0, tex: 0.3 });
  }
  push(x, y, rot);
  paper((c) => pBlob(c, 0, 0, r, r, 0.005, 3, 64), '#3a302a', { d: 2.4, tex: 0.5 });
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; line([[Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86], [Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98]], '#57493f', 6); }
  paper((c) => pRRect(c, -r * 0.12, -r * 0.92, r * 0.24, r * 0.7, 10), '#e9dcc2', { d: 1, tex: 0.5 });
  pop();
}
function channelCard(T, n, v) {
  const cards = [
    () => { paperBackdrop('#a6d4e3'); sun(960, 500, 200, { face: 'smile' }); },
    () => { paperBackdrop('#5b6f8a'); cloud(960, 360, 900, 360, { seed: 2, face: 'worried', color: '#dfe6ee' }); rain(300, 500, 1300, 600, 40, T, { s: 1.4 }); },
    () => { paperBackdrop('#d6e6f2'); for (let i = 0; i < 26; i++) snowflake(hash2(i, 1) * W, (hash2(i, 2) * H + T * 200) % H, 36 + hash2(i, 3) * 30, T + i, '#ffffff'); ptext('BLIZZARD', 960, 600, '200px "Bebas Neue"', '#4f8fc0', { d: 1.4, tex: 0.4 }); },
    () => { paperBackdrop('#3a3f52'); tornado(960, 560, 300, 900, T, {}); },
    () => { paperBackdrop('#14855e'); ptext('?', 960, 780, '700px "Alfa Slab One"', '#ffe9a8', { d: 2, tex: 0.4 }); },
  ];
  if (v) { paperBackdrop(['#16233a', '#1b2a44', '#0e3a30', '#2a1a2e', '#101820'][n % 5]); drawStudio({ cam: { x: 1330, y: 420, z: 2.4 }, map: false, lights: false, actors: () => { const P = wvPose({ x: 1330, y: 1050, s: 0.8, grin: 0.6 + n * 0.08, storm: 0.6, pale: 0.4 }); wvLive(T, P); drawWeathervane(P, T); } }); return; }
  cards[Math.min(n, 4)]();
}
function dialScene(T, t0, v) {
  const clicks = [atWord('tuned', t0), atWord('dears', t0), atWord('for', t0 + 1), atWord('surprise', t0)];
  const n = clicks.filter((c) => T >= c).length;
  const last = n ? clicks[n - 1] : -9;
  paperBackdrop(v ? '#151b2c' : '#c98f5f');
  for (let i = 0; i < 14; i++) line([[-100, i * 90], [W + 100, i * 90 + 30]], v ? 'rgba(255,255,255,0.04)' : 'rgba(60,30,10,0.15)', 3);
  // screen
  const sx = 110, sy = 120, sw = 1020, sh = 820;
  paper((c) => pRRect(c, sx - 30, sy - 30, sw + 60, sh + 60, 70), '#e9dcc2', { d: 2.4, tex: 0.7 });
  ctx.save(); ctx.beginPath(); pRRect(ctx, sx, sy, sw, sh, 60); ctx.clip();
  ctx.translate(sx, sy);
  inScreen(sw, sh, () => channelCard(T, n, v), 1);
  ctx.restore();
  ctx.save(); ctx.beginPath(); pRRect(ctx, sx, sy, sw, sh, 60); ctx.clip();
  if (T - last < 0.14) staticNoise(sx, sy, sw, sh, 0.9);
  scanlines(0.12, 4, sx, sy, sw, sh);
  const g = ctx.createRadialGradient(sx + sw / 2, sy + sh / 2, sw * 0.3, sx + sw / 2, sy + sh / 2, sw * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
  ctx.restore();
  // knob + his hand
  const rot = n * 0.42 + (T - last < 0.15 ? -0.06 : 0);
  bigKnob(1540, 560, 230, rot, v);
  push(1540, 560, rot - 0.2, 2.6);
  scaled(2.6, () => {
    suitFill((c) => { c.moveTo(60, 40); c.lineTo(210, 160); c.lineTo(170, 220); c.lineTo(30, 100); c.closePath(); }, WVC.suit, { d: 1.2 });
    paper((c) => pRRect(c, 18, 26, 54, 40, 8), WVC.shirt, { d: 0.6, tex: 0.5 });
    push(0, 0, -2.2); wvHand('fist', WVC.skin); pop();
  });
  pop();
}

function bulbRing(x, y, w, h, T, v) {
  const n = 40;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    let px, py;
    const per = 2 * (w + h), d = u * per;
    if (d < w) { px = x + d; py = y; } else if (d < w + h) { px = x + w; py = y + d - w; } else if (d < 2 * w + h) { px = x + w - (d - w - h); py = y + h; } else { px = x; py = y + h - (d - 2 * w - h); }
    const chase = (i + Math.floor(T * 8)) % 3 === 0;
    const dead = v && hash2(i, 77) < 0.45;
    const flick = v && !dead && hash2(E.f, i) < 0.2;
    const on = !dead && !flick && (chase || !v);
    paper((c) => c.arc(px, py, 13, 0, TAU), on ? (chase ? '#fff6c8' : '#ffd96a') : '#6a5a3a', { d: 0.8, tex: 0.2 });
    if (on && chase) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,230,140,0.35)'; ctx.beginPath(); ctx.arc(px, py, 30, 0, TAU); ctx.fill(); ctx.restore(); }
  }
}
function logoScene(T, t0, v) {
  const tW = atWord('weathervane', t0), tNever = atWord('never', t0), tLies = atWord('lies', t0);
  const tear = v ? easeInOut(seg(T, tLies + 0.4, tLies + 1.6)) : 0;
  paperBackdrop(v ? '#1a1220' : '#7a2430');
  for (let k = 0; k < 9; k++) line([[k * 230 + 60, -50], [k * 230 + 20, 1150]], v ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.18)', 30);
  if (tear > 0) {
    // the backdrop rips open onto the void
    ctx.save();
    ctx.beginPath();
    const yT = lerp(-20, 1100, tear);
    ctx.moveTo(960, -20);
    for (let y = -20; y <= yT; y += 24) ctx.lineTo(960 + vnoise(y * 0.03, 4) * 60 - tear * 120, y);
    for (let y = yT; y >= -20; y -= 24) ctx.lineTo(960 + vnoise(y * 0.03, 8) * 60 + tear * 120, y);
    ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H);
    crayonStorm(960, 500, 700, T, { alpha: 0.8, n: 40 });
    ctx.restore();
  }
  // floor
  paper((c) => pRect(c, -100, 930, W + 200, 300), v ? '#1c120e' : '#7d5233', { d: 2, tex: 0.8 });
  // marquee
  const mx = 330, my = 70, mw = 1260, mh = 360, tilt = v ? 0.03 + Math.sin(T * 2) * 0.01 : 0;
  push(960, my + mh / 2, tilt);
  ctx.translate(-960, -(my + mh / 2));
  paper((c) => pRRect(c, mx - 30, my - 30, mw + 60, mh + 60, 40), v ? '#6c5a2a' : '#e0b44c', { d: 2.6, tex: 0.7 });
  paper((c) => pRRect(c, mx, my, mw, mh, 26), v ? '#0e2a22' : '#14855e', { d: 0.6, tex: 0.7 });
  bulbRing(mx - 10, my - 10, mw + 20, mh + 20, T, v);
  ptext('Mr. Weathervane', 960 + 8, my + 238, '190px "Yellowtail"', v ? '#05110c' : '#0b4d36', { d: 0, tex: 0.4 });
  const flick = v && hash2(E.f, 13) < 0.15;
  ptext('Mr. Weathervane', 960, my + 230, '190px "Yellowtail"', flick ? '#4a5a52' : '#ffe9a8', { d: 1.2, tex: 0.4 });
  ptext("CHANNEL 9 · TOMORROW'S WEATHER — TODAY", 960, my + 318, '38px "Bebas Neue"', v ? '#9aa1ad' : '#f6efdc', { d: 0, tex: 0.3, ls: 6 });
  pop();
  // spinning weathervanes on posts
  for (const sx of [170, 1750]) { line([[sx, 930], [sx, 520]], '#3a302a', 10, { d: 1 }); wvEmblem(sx, 470, 3.2, T * 3 + sx, { d: 1.4 }); }
  // spotlight
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = v ? 0.12 : 0.2; ctx.fillStyle = '#fff6d8';
  ctx.beginPath(); ctx.moveTo(900, -20); ctx.lineTo(1020, -20); ctx.lineTo(1260, 1000); ctx.lineTo(660, 1000); ctx.closePath(); ctx.fill(); ctx.restore();
  const bow = pulse(T, tW - 0.1, 0.9);
  const P = wvPose({ x: 960, y: 1050, s: 0.6, pointer: null, lean: bow * 0.35, grin: v ? 0.7 : 0.15, storm: v ? 0.7 : 0, pale: v ? 0.4 : 0 });
  P.ar = Object.assign({ hand: 'open' }, T < tNever ? ARM.chest : ARM.present);
  P.al = Object.assign({ hand: 'spread' }, T < tW + 0.8 ? ARM.rest : ARM.wide);
  P.wink = T > tLies - 0.05 && T < tLies + 0.7 ? 1 : 0;
  wvLive(T, P, { bounce: 8 });
  drawWeathervane(P, T);
  const g = pulse(T, tLies, 0.5);
  if (g > 0) paper((c) => pStar(c, 1000, 1050 - 0.6 * (470 + 340 + 1.32 * 52), 60 * g, 8, 4, 0.2), '#ffffff', { d: 0, tex: 0 });
  if (!v) confetti(T, 30);
}

// ---------------- Chorus 1 ----------------
shot(48.52, 'c1_100', (lt, dur, T) => chorusTitle(T, 48.52, 0), { cap: false });
shot(50.85, 'c1_silver', (lt, dur, T) => eyesCloseup(T, 50.85, 0));
shot(55.3, 'c1_pass', (lt, dur, T) => stagePass(T, 55.3, 0));
shot(58.96, 'c1_conduct', (lt, dur, T) => stageConduct(T, 58.96, 0));
shot(62.5, 'c1_dial', (lt, dur, T) => dialScene(T, 62.5, 0));
shot(65.38, 'c1_logo', (lt, dur, T) => logoScene(T, 65.38, 0));

// ---------------- Verse 2: breaking news ----------------
function newsBug(T, label = 'BULLETIN') {
  push(40, 40);
  paper((c) => pRect(c, 0, 0, 300, 74), '#c8332a', { d: 1.6, tex: 0.6 });
  paper((c) => pRect(c, 300, 0, 110, 74), '#f6efdc', { d: 1.2, tex: 0.6 });
  ptext(label, 150, 54, '52px "Bebas Neue"', '#fff6e8', { d: 0, tex: 0.3, ls: 4 });
  ptext('CH 9', 355, 54, '46px "Bebas Neue"', '#c8332a', { d: 0, tex: 0.3 });
  if (Math.floor(T * 2) % 2) paper((c) => c.arc(-14 + 14, 37, 0, 0, TAU), '#fff', { d: 0 });
  pop();
}
function breakingBanner(T, t0, t1) {
  const k = easeOutBack(seg(T, t0, t0 + 0.3)), out = easeIn(seg(T, t1 - 0.25, t1));
  if (k <= 0 || out >= 1) return;
  push(lerp(960, 960, out), lerp(540, 540, out), -0.04, k * (1 - out * 0.9));
  paper((c) => pRect(c, -820, -150, 1640, 300), '#c8332a', { d: 3, tex: 0.7 });
  paper((c) => pRect(c, -820, 90, 1640, 60), '#f6efdc', { d: 0.8, tex: 0.6 });
  ptext('BREAKING NEWS', 0, 60, '230px "Bebas Neue"', '#fff6e8', { d: 1.6, tex: 0.4, ls: 10 });
  ptext('★ STAY TUNED ★ STAY TUNED ★ STAY TUNED ★', -((T * 300) % 400), 136, '44px "Bebas Neue"', '#c8332a', { d: 0, tex: 0.3, ls: 6 });
  pop();
}
function chapel(x, y) {
  paper((c) => pPoly(c, [[x - 220, y], [x - 220, y - 300], [x + 220, y - 300], [x + 220, y]], 1, 3), '#fbf6ea', { d: 2, tex: 0.8 });
  paper((c) => pPoly(c, [[x - 250, y - 290], [x, y - 470], [x + 250, y - 290]], 1, 4), mix('#c4574d', '#3a1f2a', E.D), { d: 2, tex: 0.7 });
  paper((c) => pRect(c, x - 60, y - 640, 120, 220), '#fbf6ea', { d: 1.6, tex: 0.8 });
  paper((c) => pPoly(c, [[x - 80, y - 630], [x, y - 760], [x + 80, y - 630]], 1, 5), mix('#c4574d', '#3a1f2a', E.D), { d: 1.6, tex: 0.7 });
  paper((c) => pRRect(c, x - 70, y - 160, 140, 160, 60), '#7a4a35', { d: 1, tex: 0.6 });
  paper((c) => pBlob(c, x, y - 360, 46, 46, 0, 3), '#9ad0e6', { d: 0.8, tex: 0.4 });
  const sw = Math.sin(E.T * 9) * 0.4 * (E.T > 75.9 ? 1 : 0);
  push(x, y - 580, sw);
  paper((c) => { c.moveTo(-30, 0); c.quadraticCurveTo(-30, -50, 0, -50); c.quadraticCurveTo(30, -50, 30, 0); c.lineTo(40, 14); c.lineTo(-40, 14); c.closePath(); }, '#e0b44c', { d: 1, tex: 0.5 });
  pop();
}
shot(72.2, 'v2_bride', (lt, dur, T) => {
  paperBackdrop(mix('#b9d8e6', '#3a4458', E.D + 0.1));
  cloud(1000, 190, 640, 220, { seed: 8, color: '#9aa3b5', shade: '#7a8396', face: T > 74.9 ? 'grin' : null });
  if (T > 74.6) rain(640, 260, 760, 900, 26, T, { s: 0.7, seed: 5 });
  hills(830, mix('#a9cf8a', '#2d4a3a', E.D), 20, 3.3);
  chapel(1460, 860);
  person(840, 1000, 2.2, { style: 'man', shirt: '#2b2f3a', pants: '#2b2f3a', hair: '#3b2a20', armR: -0.2, look: 0.5, lookY: -0.5, mouth: T > 74.9 ? 'o' : 'smile' });
  person(1060, 1000, 2.2, { style: 'bride', skin: '#f6dcc8', hair: '#c9893a', holdL: 'flowers', armL: 0.5, look: -0.5, lookY: -0.4, mouth: T > 74.9 ? 'worried' : 'smile' });
  const um = [[74.92, 950, 600, '#e2574c'], [75.25, 700, 650, '#f2b84b'], [75.6, 1200, 640, '#4fa79a']];
  um.forEach(([t1, ux, uy, col], i) => { const k = easeOutBack(seg(T, t1, t1 + 0.3)); if (k > 0) umbrella(ux, uy + 200, 1.6 * k, (i - 1) * 0.25, col); });
  breakingBanner(T, 72.15, 73.65);
  if (T > 73.6) newsBug(T);
});
shot(76.62, 'v2_snow', (lt, dur, T) => {
  const pan = easeInOut(seg(T, 78.2, 78.9));
  withCam({ x: lerp(760, 1620, pan), y: 540, z: 1 }, 1, () => {
    paperBackdrop(mix('#c9dceb', '#2a3346', E.D));
    hills(820, '#f4f7fb', 20, 2.1);
    // child hoping for snow
    house(420, 840, 420, 330, { v: 2, s: 1 });
    person(760, 1000, 2.3, { style: 'child', shirt: '#4f8fc0', hat: '#e2574c', lookY: -1, look: 0.3, mouth: 'o', armL: 0.9, armR: 0.9 });
    if (T > 77.7) thoughtBubble(900, 470, 1.3 * easeOutBack(seg(T, 77.7, 78.0)), () => snowflake(0, 0, 34, E.T, '#9ad0e6'));
    // the cloud factory
    const fx = 1900;
    paper((c) => pRect(c, fx - 260, 480, 620, 420), mix('#c9b8a6', '#3a3346', E.D), { d: 2, tex: 0.8 });
    for (let k = 0; k < 3; k++) { paper((c) => pRect(c, fx - 200 + k * 200, 200, 70, 290), '#8a5a46', { d: 1.6, tex: 0.7 }); cloud(fx - 165 + k * 200 + Math.sin(T * 2 + k) * 10, 160 - ((T * 60 + k * 50) % 120), 140, 70, { seed: k + 3 }); }
    paper((c) => pRect(c, fx - 330, 740, 760, 40), '#3a3d44', { d: 1.4, tex: 0.5 });
    for (let k = 0; k < 9; k++) splitPin(fx - 310 + k * 90, 760, 12, 'silver');
    ribbon(fx + 50, 560, 440, 'CLOUD WORKS', { h: 70, font: '50px "Bebas Neue"', ls: 4 });
    // stamping press over the belt
    const stampT = [78.7, 79.22, 79.75].reduce((a, t1) => (T >= t1 ? t1 : a), -9);
    const down = T - stampT < 0.25 ? Math.sin(((T - stampT) / 0.25) * Math.PI) : 0;
    paper((c) => pRect(c, fx - 60, 300 + down * 300, 220, 140), '#5a5f68', { d: 2, tex: 0.6 });
    ptext('9', fx + 50, 410 + down * 300, '110px "Limelight"', '#ffe9a8', { d: 0, tex: 0.3 });
    for (let k = 0; k < 4; k++) {
      const cx = fx - 300 + ((T * 140 + k * 200) % 760);
      cloud(cx, 700, 150, 70, { seed: k + 1, face: 'smile' });
    }
    if (T > 79.22) for (let i = 0; i < 24; i++) snowflake(400 + hash2(i, 1) * 2000, (hash2(i, 2) * 900 + (T - 79.22) * 160) % 900, 16 + hash2(i, 3) * 14, T + i, '#ffffff');
  });
  newsBug(T);
});
shot(80.34, 'v2_markets', (lt, dur, T) => {
  const split = easeInOut(seg(T, 81.5, 81.9));
  // markets panel
  paperBackdrop(mix('#efd9b6', '#2a2a36', E.D));
  paper((c) => pRect(c, 80, 90, 1640, 560), '#1d2a24', { d: 2, tex: 0.6 });
  const rows = [['MAYBE', '▲ 7%', '#6cfa9a'], ['PERHAPS', '▼ 3%', '#ff7a6a'], ['PROBABLY', '▲ 12%', '#6cfa9a'], ['DOUBT', '▼ 9%', '#ff7a6a'], ['HOPE', '▲ 2%', '#6cfa9a']];
  rows.forEach(([a, b, col], i) => {
    const flick = Math.floor(T * 3 + i) % 4 === 0;
    ptext(a, 160, 190 + i * 100, '72px "Bebas Neue"', '#e8f0dc', { d: 0, tex: 0.2, align: 'left', ls: 4 });
    ptext(flick ? '— —' : b, 900, 190 + i * 100, '72px "Bebas Neue"', col, { d: 0, tex: 0.2, align: 'left' });
  });
  for (let i = 0; i < 4; i++) person(250 + i * 380, 1060, 2.2, { style: 'trader', shirt: ['#fbf6ea', '#e9dcc2'][i % 2], armL: 2.4 + Math.sin(T * 9 + i) * 0.4, armR: 2.2 + Math.cos(T * 8 + i) * 0.4, mouth: 'o', v: i });
  // scholars panel slides in
  if (split > 0) {
    const x0 = lerp(W, 960, split);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, W - x0 + 10, H); ctx.clip();
    ctx.fillStyle = '#121a33'; ctx.fillRect(x0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const sx = x0 + hash2(i, 3) * 960, sy = hash2(i, 4) * 600;
      paper((c) => pStar(c, sx, sy, 16 + hash2(i, 5) * 14, 7, 5, T * 0.3 + i), '#ffe9a8', { d: 0.4, tex: 0.3 });
    }
    line([[x0 + 470, 760], [x0 + 330, 520]], '#c9a24a', 26, { d: 1.4 });
    person(x0 + 250, 1060, 2.1, { style: 'scholar', shirt: '#3a2f4a', armR: 2.0, look: -0.6, mouth: 'o' });
    person(x0 + 680, 1060, 2.1, { style: 'scholar', shirt: '#2f3a4a', armL: 2.4 + Math.sin(T * 10) * 0.3, look: -1, mouth: 'worried', v: 2 });
    thoughtBubble(x0 + 470, 380, 1.0, '?!', { tail: false });
    ctx.restore();
    line([[x0, 0], [x0, H]], '#f6efdc', 12, { d: 2 });
  }
  newsBug(T);
});
function tvFace(sw, sh, T, look, o = {}) {
  ctx.fillStyle = o.bg || '#bfe0c8'; ctx.fillRect(0, 0, sw, sh);
  const s = sh / 520;
  push(sw / 2, sh * 1.18, 0, s);
  scaled(s, () => {
    const P = wvPose({ x: 0, y: 0, s: 1, eyeX: look, grin: o.grin || 0.3, storm: o.storm || 0, pale: o.pale || 0 });
    P.mouth = mouthAt(T);
    wvHead(P, T);
  });
  pop();
}
shot(83.62, 'v2_screens', (lt, dur, T) => {
  paperBackdrop(mix('#2a3346', '#121726', E.D));
  // dollhouse cross-section
  const hx = 360, hy = 120, hw = 1200, hh = 860;
  paper((c) => pPoly(c, [[hx - 60, hy + 140], [hx + hw / 2, hy - 120], [hx + hw + 60, hy + 140]], 1, 2), mix('#c4574d', '#3a1f2a', E.D), { d: 2.4, tex: 0.7 });
  paper((c) => pRect(c, hx, hy + 120, hw, hh - 120), mix('#f6c39a', '#4a3040', E.D), { d: 2.4, tex: 0.8 });
  const rooms = [[hx + 40, hy + 160], [hx + hw / 2 + 20, hy + 160], [hx + 40, hy + 560], [hx + hw / 2 + 20, hy + 560]];
  const wall = ['#f3e6c8', '#d9ecdf', '#f2d6dc', '#dfe3f2'];
  // where is the little person? walks room to room
  const u = seg(T, 83.7, 86.4);
  const ridx = Math.min(3, Math.floor(u * 4));
  const order = [2, 3, 1, 0];
  const R = rooms[order[ridx]];
  const px = R[0] + 120 + ((u * 4) % 1) * 300;
  rooms.forEach(([rx, ry], i) => {
    paper((c) => pRect(c, rx, ry, hw / 2 - 60, 360), mix(wall[i], '#2a2a3a', E.D * 0.7), { d: 0.6, tex: 0.7 });
    const look = clamp((px - (rx + 380)) / 300, -1, 1) + (ridx === order.indexOf(i) ? 0 : 0);
    tvSet(rx + 380, ry + 330, 230, { screen: (sw, sh) => tvFace(sw, sh, T, look, { grin: 0.3 + seg(T, 85.38, 86.0) * 0.6, storm: seg(T, 85.38, 86.0) }), glow: 1 });
  });
  person(px, R[1] + 350, 1.25, { style: 'man', shirt: '#4f8fc0', legA: Math.sin(T * 12) * 0.35, look: -0.6, mouth: T > 85.9 ? 'o' : 'smile' });
  if (T > 86.0) {
    const k = easeOutBack(seg(T, 86.0, 86.4));
    ctx.save(); ctx.strokeStyle = '#ff3b2e'; ctx.lineWidth = 8; ctx.globalAlpha = k;
    const cx = px, cy = R[1] + 230, r = lerp(260, 110, k);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 30), cy + Math.sin(a) * (r - 30)); ctx.lineTo(cx + Math.cos(a) * (r + 30), cy + Math.sin(a) * (r + 30)); ctx.stroke(); }
    ctx.restore();
  }
  newsBug(T);
});
shot(86.92, 'v2_warning', (lt, dur, T) => {
  const tilt = easeInOut(seg(T, 88.6, 89.6));
  withCam({ x: 960, y: lerp(540, 300, tilt), z: 1 }, 1, () => {
    paperBackdrop(mix('#a6d4e3', '#33405a', E.D));
    sun(1500, 120, 90, { face: 'smile' });
    cloud(500, 140, 300, 110, { seed: 2, face: 'sleep' });
    cloud(1100, 60, 240, 90, { seed: 5, face: 'sleep' });
    const bx = 300 + (T * 120) % 1600; line([[bx - 30, 260], [bx, 280], [bx + 30, 260]], '#2b2420', 5);
    hills(820, mix('#9fcf7b', '#2c4a3a', E.D), 24, 1.7);
    house(1380, 900, 460, 330, { v: 4 });
    paper((c) => pRect(c, 1100, 860, 560, 30), '#e9dcc2', { d: 1.2, tex: 0.6 });
    person(1240, 1000, 2.0, { style: 'woman', shirt: '#e98aa0', hair: '#c9893a', lookY: -1, look: -0.5, mouth: T > 88.6 ? 'worried' : 'smile', armL: 1.2 });
    // the warning scroll unrolls
    const k = easeOut(seg(T, 87.4, 88.3));
    if (k > 0) {
      const w = 1700 * k;
      ctx.save(); ctx.beginPath(); ctx.rect(110, 420, w, 220); ctx.clip();
      paper((c) => pRect(c, 110, 430, 1700, 200), '#fbf6ea', { d: 2, tex: 0.7 });
      for (let i = 0; i < 20; i++) paper((c) => { c.moveTo(110 + i * 90, 430); c.lineTo(150 + i * 90, 430); c.lineTo(110 + i * 90, 470); c.closePath(); c.moveTo(110 + i * 90, 630); c.lineTo(150 + i * 90, 630); c.lineTo(110 + i * 90, 590); c.closePath(); }, '#c8332a', { d: 0, tex: 0.4 });
      ptext('SPECIAL WEATHER WARNING', 960, 572, '120px "Bebas Neue"', '#c8332a', { d: 0, tex: 0.4, ls: 8 });
      ctx.restore();
      paper((c) => pRRect(c, 90 + w, 410, 50, 240, 20), '#e9dcc2', { d: 2, tex: 0.6 });
    }
  });
  newsBug(T);
});
function futureCard(i, T) {
  const icons = [
    () => { house(0, 40, 90, 70, { v: 1, chimney: false }); sun(36, -60, 18, {}); },
    () => umbrella(0, 70, 0.55, 0, '#e2574c'),
    () => { paper((c) => pRRect(c, -50, -10, 100, 40, 12), '#4f8fc0', { d: 0.8 }); paper((c) => pRRect(c, -30, -36, 60, 30, 10), '#4f8fc0', { d: 0.6 }); splitPin(-28, 32, 10); splitPin(28, 32, 10); },
    () => { paper((c) => { c.moveTo(-60, 0); c.lineTo(60, -10); c.lineTo(70, 0); c.lineTo(60, 10); c.closePath(); c.moveTo(-10, -4); c.lineTo(20, -50); c.lineTo(30, -4); c.closePath(); c.moveTo(-10, 4); c.lineTo(20, 50); c.lineTo(30, 4); c.closePath(); }, '#cfd4dc', { d: 0.8 }); },
    () => { person(-26, 70, 0.55, { style: 'man', v: 0 }); person(26, 70, 0.55, { style: 'woman', v: 3 }); },
    () => { paper((c) => { pRect(c, -40, -40, 80, 14); pRect(c, -40, -40, 12, 100); pRect(c, 28, -40, 12, 100); pRect(c, -40, 10, 80, 12); }, '#8a5a36', { d: 0.6 }); },
    () => ptext('?', 0, 50, '140px "Alfa Slab One"', '#14855e', { d: 0.8, tex: 0.3 }),
  ];
  paper((c) => pRRect(c, -95, -135, 190, 270, 16), '#fbf6ea', { d: 1.6, tex: 0.7, edge: '#e0b44c', edgeA: 0.8, edgeW: 3 });
  push(0, -10); icons[i](); pop();
}
shot(90.52, 'v2_palm', (lt, dur, T) => {
  paperBackdrop(mix('#1f6b52', '#0b2a22', E.D));
  sunburst(960, 700, 1300, 24, T * 0.15, mix('#2a8065', '#103a2e', E.D), mix('#1f6b52', '#0b2a22', E.D));
  // forearm + palm-up hand (big)
  suitFill((c) => { c.moveTo(-200, 1180); c.lineTo(180, 1180); c.lineTo(250, 900); c.lineTo(-40, 860); c.closePath(); }, WVC.suit, { d: 2 });
  paper((c) => pRRect(c, -40, 830, 330, 90, 20), WVC.shirt, { d: 1.2, tex: 0.6 });
  splitPin(200, 875, 14, 'silver');
  const curl = seg(T, 93.5, 94.1) * 0.25;
  push(960, 760, 0);
  paper((c) => { c.moveTo(-330, 140); c.quadraticCurveTo(-340, -40, -120, -60); c.lineTo(300, -50); c.quadraticCurveTo(360, 60, 300, 160); c.quadraticCurveTo(0, 230, -330, 140); c.closePath(); }, WVC.skin, { d: 2.4, tex: 0.7, edge: '#fff', edgeA: 0.3 });
  line([[-200, 60], [0, 90], [200, 60]], WVC.skinShade, 5);
  for (let k = 0; k < 4; k++) { push(-250 + k * 150, -40, -0.1 + k * 0.05 + curl); paper((c) => pRRect(c, -42, -230, 84, 240, 42), WVC.skin, { d: 1.6, tex: 0.7 }); line([[-20, -150], [20, -150]], WVC.skinShade, 3); pop(); }
  push(330, 60, 1.1 - curl); paper((c) => pRRect(c, -42, -210, 84, 220, 42), WVC.skin, { d: 1.6, tex: 0.7 }); pop();
  pop();
  // seven futures fan out of the palm
  const tSeven = atWord('seven', 90.5), tUnf = atWord('unfolding', 90.5);
  for (let i = 0; i < 7; i++) {
    const k = easeOutBack(seg(T, tSeven + i * 0.22, tSeven + i * 0.22 + 0.4));
    if (k <= 0) continue;
    const a = lerp(-1.05, 1.05, i / 6) * k;
    push(960, 760, a);
    ctx.translate(0, -360 * k);
    push(0, 0, Math.sin(T * 6 + i) * 0.02 * (T > tUnf ? 1 : 0), 1.15 * k);
    futureCard(i, T);
    pop();
    pop();
  }
  newsBug(T);
});

// ---------------- Pre-Chorus 2 ----------------
function frameBorder(T, k = 1, extra = 0) {
  const m = 60 + extra;
  ctx.save();
  ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20); ctx.rect(m, m, W - 2 * m, H - 2 * m);
  ctx.fillStyle = '#f6efdc'; if (E.shadows) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; } ctx.fill('evenodd');
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; E.texPat.setTransform(new DOMMatrix()); ctx.fillStyle = E.texPat;
  ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20); ctx.rect(m, m, W - 2 * m, H - 2 * m); ctx.fill('evenodd'); ctx.restore();
}
shot(94.16, 'p2_run', (lt, dur, T) => {
  const tHide = atWord('hide', 94), tClimb = atWord('climb', 94), tFrame = atWord('frame', 94);
  const D = E.D;
  const runX = T < tHide - 0.1 ? lerp(300, 900, seg(T, 94.16, tHide)) : T < tClimb ? 900 : lerp(900, 1720, easeInOut(seg(T, tClimb, tClimb + 0.5)));
  const scroll = T * 600;
  paperBackdrop(mix('#a6c4d6', '#232c44', D));
  cloud(500 - (scroll * 0.2) % 2400 + 1200, 200, 380, 150, { seed: 2, face: 'stare', lookX: 1, color: '#c9d0dc' });
  for (let i = 0; i < 9; i++) house(((i * 330 - scroll * 0.5) % 2970 + 2970) % 2970 - 300, 800, 220, 170, { v: i });
  hills(850, mix('#8cc070', '#163026', D), 18, 5.1);
  const hiding = T > tHide - 0.05 && T < tClimb;
  if (T > tHide - 0.6) { const tx = 1020; tree(tx, 1000, 2.2, { v: 2 }); }
  if (T < tClimb) {
    if (!hiding) person(runX, 1010, 2.0, { style: 'man', shirt: '#e2574c', legA: Math.sin(T * 18) * 0.6, armL: 0.6 + Math.sin(T * 18) * 0.5, armR: 0.6 - Math.sin(T * 18) * 0.5, look: 1, mouth: 'o' });
    else { person(900, 1010, 2.0, { style: 'man', shirt: '#e2574c', look: 1, mouth: 'worried', eyes: null }); tree(1020, 1000, 2.2, { v: 2 }); }
  }
  const climbing = T >= tClimb;
  frameBorder(T, 1, climbing ? easeOutBack(seg(T, tFrame, tFrame + 0.35)) * 40 : 0);
  if (climbing) {
    const up = easeOut(seg(T, tClimb + 0.3, tFrame + 0.2));
    const pushBack = easeInOut(seg(T, tFrame + 0.15, tFrame + 0.55));
    const px = 1790 - pushBack * 260, py = lerp(1000, 300, up) + pushBack * 500;
    person(px, py, 2.0, { style: 'man', shirt: '#e2574c', armL: 3.0, armR: 2.8 + Math.sin(T * 14) * 0.2, legA: Math.sin(T * 10) * 0.3, look: 1, lookY: -1, mouth: 'o', rot: -0.15 });
    // a pinstriped hand slides down to stop the escape
    const hk = easeOutBack(seg(T, tFrame - 0.1, tFrame + 0.25));
    if (hk > 0) {
      push(1830, lerp(-500, 150, hk), 0.3, 2.4);
      scaled(2.4, () => {
        suitFill((c) => { c.moveTo(-30, -400); c.lineTo(30, -400); c.lineTo(22, 0); c.lineTo(-22, 0); c.closePath(); }, WVC.suit, { d: 1.4 });
        paper((c) => pRRect(c, -20, -6, 40, 18, 4), WVC.shirt, { d: 0.6 });
        push(0, 12, 0); wvHand('open', WVC.skin); pop();
      });
      pop();
    }
  }
});
function saltShaker(x, y, rot, s) {
  push(x, y, rot, s);
  paper((c) => { c.moveTo(-70, -120); c.lineTo(70, -120); c.lineTo(90, 140); c.quadraticCurveTo(0, 160, -90, 140); c.closePath(); }, '#e9f2f6', { d: 2, tex: 0.6, edge: '#fff', edgeA: 0.8 });
  paper((c) => pRRect(c, -78, -190, 156, 80, 30), '#cfd4dc', { d: 1.6, tex: 0.3 });
  for (let k = 0; k < 5; k++) ctx.fillStyle = '#5a5f68', ctx.beginPath(), ctx.arc(-40 + k * 20, -170, 5, 0, TAU), ctx.fill();
  push(0, 20, Math.PI); ptext('9', 0, 40, '120px "Limelight"', '#14855e', { d: 0.6, tex: 0.3 }); pop();
  pop();
}
shot(97.72, 'p2_season', (lt, dur, T) => {
  const tEsc = atWord('escape', 97.7), tDare = atWord('dare', 97.7), tImg = atWord('imagine', 97.7), tSea = atWord('seasons', 97.7), tName = atWord('name', 97.7);
  paperBackdrop(mix('#f2d6b3', '#2a2433', E.D));
  for (let i = 0; i < 18; i++) paper((c) => pRect(c, i * 120 - 60, -20, 60, 1200), mix('#ecc9a0', '#241f2c', E.D), { d: 0, tex: 0.3 });
  // the would-be escapee, plated
  paper((c) => pBlob(c, 760, 960, 520, 90, 0.01, 2, 60), '#e9ecf1', { d: 2, tex: 0.3 });
  paper((c) => pBlob(c, 760, 955, 420, 64, 0.01, 3, 60), '#ffffff', { d: 0.4, tex: 0.3 });
  person(760, 960, 2.3, { style: 'man', shirt: '#e2574c', look: T < tSea ? 0.5 : -0.3, lookY: -1, mouth: T > tSea ? 'o' : 'smile', armL: 0.4, armR: 0.4 });
  const ideas = [[tEsc, 480, 420, () => { paper((c) => pRRect(c, -60, -20, 120, 44, 14), '#4f8fc0', { d: 0.8 }); paper((c) => pRRect(c, -36, -50, 72, 34, 10), '#4f8fc0', { d: 0.6 }); splitPin(-34, 26, 12); splitPin(34, 26, 12); }],
    [tDare, 780, 330, () => boat(0, 20, 0, 0.6)],
    [tImg, 1080, 420, () => paper((c) => { c.moveTo(-70, 0); c.lineTo(70, -10); c.lineTo(80, 0); c.lineTo(70, 10); c.closePath(); c.moveTo(-10, -4); c.lineTo(20, -55); c.lineTo(32, -4); c.closePath(); c.moveTo(-10, 4); c.lineTo(20, 55); c.lineTo(32, 4); c.closePath(); }, '#cfd4dc', { d: 0.8 })]];
  ideas.forEach(([t1, bx, by, icon]) => { const k = easeOutBack(seg(T, t1, t1 + 0.3)); if (k > 0 && T < tSea + 0.3) thoughtBubble(bx, by, 1.2 * k, icon, { tail: false }); });
  // salt shaker
  const sk = easeOutBack(seg(T, tSea - 0.4, tSea));
  if (sk > 0) {
    const shake = T > tSea ? Math.sin(T * 30) * 0.15 : 0;
    saltShaker(760, lerp(-300, 200, sk), Math.PI + 0.3 + shake, 1.2);
    if (T > tSea) for (let i = 0; i < 40; i++) { const g = hash2(i, 3), yy = 360 + ((T - tSea) * 700 + g * 500) % 560; ctx.fillStyle = '#ffffff'; ctx.fillRect(700 + hash2(i, 4) * 120 + (yy - 360) * 0.2, yy, 6, 6); }
  }
  // the menu card
  const mk = easeOutBack(seg(T, tName - 0.25, tName + 0.15));
  if (mk > 0) {
    push(1500, 560, 0.06, mk);
    paper((c) => pRRect(c, -260, -360, 520, 720, 20), '#fbf6ea', { d: 2.6, tex: 0.8, edge: '#e0b44c', edgeA: 1, edgeW: 6 });
    ptext('Tonight’s', 0, -220, '84px "Yellowtail"', '#14855e', { d: 0, tex: 0.4 });
    ptext('SPECIAL', 0, -120, '96px "Bebas Neue"', '#2b2420', { d: 0, tex: 0.4, ls: 8 });
    line([[-180, -80], [180, -80]], '#e0b44c', 4);
    ptext('YOU', 0, 120, '230px "Alfa Slab One"', '#c8332a', { d: 1, tex: 0.5 });
    ptext('lightly seasoned with', 0, 210, '34px "Special Elite"', '#2b2420', { d: 0, tex: 0.4 });
    ptext('what-ifs', 0, 260, '44px "Special Elite"', '#2b2420', { d: 0, tex: 0.4 });
    pop();
  }
});
shot(101.2, 'p2_ratings', (lt, dur, T) => {
  const tR = atWord('ratings', 101), tAgain = atWord('again', 101);
  const D = E.D;
  const pan = easeInOut(seg(T, tR - 0.6, tR - 0.1));
  withCam({ x: lerp(700, 1500, pan), y: 540, z: 1 }, 1, () => {
    paperBackdrop(mix('#2a3a5a', '#121a2c', D));
    for (let i = 0; i < 40; i++) ctx.fillStyle = `rgba(255,250,220,${0.4 + 0.4 * Math.sin(T * 3 + i)})`, ctx.beginPath(), ctx.arc(hash2(i, 1) * 2600, hash2(i, 2) * 600, 2.5, 0, TAU), ctx.fill();
    // rooftop antenna radiating warmer and warmer signal
    house(560, 1100, 700, 380, { v: 1, lit: true });
    line([[600, 520], [600, 230]], '#9aa1ad', 10, { d: 1 });
    for (let k = 0; k < 5; k++) line([[480 + k * 10, 260 + k * 50], [720 - k * 10, 260 + k * 50]], '#9aa1ad', 7, { d: 0.8 });
    const warm = seg(T, 101.2, 103);
    for (let k = 0; k < 6; k++) {
      const r = 80 + ((T * 260 + k * 90) % 540);
      ctx.save(); ctx.strokeStyle = mixA('#6ac8ff', '#ff5a2a', warm, Math.max(0, 1 - r / 620)); ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(600, 230, r, -2.4, -0.7); ctx.stroke(); ctx.restore();
    }
    // thermometer
    paper((c) => pRRect(c, 980, 180, 90, 640, 45), '#fbf6ea', { d: 2, tex: 0.6 });
    paper((c) => pRRect(c, 1005, 820 - lerp(80, 560, warm), 40, lerp(80, 560, warm), 20), '#e2574c', { d: 0, tex: 0.3 });
    paper((c) => c.arc(1025, 830, 60, 0, TAU), '#e2574c', { d: 1.2, tex: 0.4 });
    // ratings bar chart
    const bx = 1300;
    ptext('RATINGS', bx + 400, 160, '110px "Bebas Neue"', '#ffe9a8', { d: 1, tex: 0.3, ls: 8 });
    for (let i = 0; i < 6; i++) {
      const bt = tR + i * 0.18;
      const grow = easeOutBack(seg(T, bt, bt + 0.35)) * (0.35 + i * 0.13) + easeIn(seg(T, tAgain + 0.4, 107.8)) * 2.4;
      const h = 760 * grow;
      paper((c) => pRect(c, bx + i * 135, 960 - h, 105, h), ['#e2574c', '#f2b84b', '#4fa79a', '#4f8fc0', '#e98aa0', '#14855e'][i], { d: 1.6, tex: 0.6 });
    }
    paper((c) => pRect(c, bx - 30, 955, 900, 14), '#f6efdc', { d: 1, tex: 0.5 });
  });
  if (T > 107.5) { ctx.save(); ctx.globalAlpha = seg(T, 107.5, 108.2); ctx.fillStyle = '#fffbe9'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
});

// ---------------- Chorus 2 (darker reprise) ----------------
const C2FX = (lt) => 0.7;
shot(108.2, 'c2_100', (lt, dur, T) => chorusTitle(T, 108.2, 1), { cap: false, tvFx: C2FX, trans: { type: 'flash', dur: 0.35 } });
shot(111.42, 'c2_silver', (lt, dur, T) => eyesCloseup(T, 111.42, 1), { tvFx: C2FX });
shot(115.32, 'c2_pass', (lt, dur, T) => stagePass(T, 115.32, 1), { tvFx: C2FX });
shot(119.04, 'c2_conduct', (lt, dur, T) => stageConduct(T, 119.04, 1), { tvFx: C2FX });
shot(122.58, 'c2_dial', (lt, dur, T) => dialScene(T, 122.58, 1), { tvFx: C2FX });
shot(125.46, 'c2_logo', (lt, dur, T) => logoScene(T, 125.46, 1), { tvFx: C2FX });
