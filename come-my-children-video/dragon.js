'use strict';
// Ur, the golden dragon, in glass. Side view facing right; origin mid-body; ≈ 1500 × 1150 units.
const UR = { gold: '#ffc63a', gold2: '#f0a024', gold3: '#ffd870', goldDk: '#b8701a', belly: '#ffe8a0', horn: '#f4ecd8', claw: '#f8f2e4', eye: '#ffb000', mem: ['#ffb84a', '#f09a24', '#ffcf6a', '#e8862a'] };
const UR_WING = { sh: [200, -200], el: [70, -560], wr: [-130, -700], tips: [[-560, -770], [-660, -520], [-590, -290], [-400, -150]], body: [-110, -140] };
function urWing(key, o, dim) {
  const w = UR_WING, mem = [];
  const scal = (a, b) => { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; return [lerp(m[0], w.wr[0], 0.28), lerp(m[1], w.wr[1], 0.28)]; };
  glassSet(key + '.mem', () => {
    const T = w.tips;
    mem.push([w.el, w.wr, T[0], [lerp(w.el[0], T[0][0], 0.5) + 30, lerp(w.el[1], T[0][1], 0.5) - 90]]);
    for (let i = 0; i < 3; i++) mem.push([w.wr, T[i], scal(T[i], T[i + 1]), T[i + 1]]);
    mem.push([w.wr, T[3], scal(T[3], w.body), w.body, w.sh, w.el]);
    return mem.map((p, i) => ({ pts: p, poly: false, ci: i }));
  }, (i) => (dim ? lerpRGB(UR.mem[i % 4], '#5a3010', 0.45) : UR.mem[i % 4]), { lw: 5, lk: o.lk });
  // the arm and finger bones over the membrane
  glassSet(key + '.bones', () => {
    const out = [{ pts: capsulePts([w.sh, w.el], 46, 34), poly: true }, { pts: capsulePts([w.el, w.wr], 34, 26), poly: true }];
    for (const tip of w.tips) out.push({ pts: capsulePts([w.wr, [lerp(w.wr[0], tip[0], 0.5), lerp(w.wr[1], tip[1], 0.5) - 20], tip], 20, 6), poly: true });
    return out;
  }, (i) => (dim ? lerpRGB(UR.gold2, '#5a3010', 0.4) : i < 2 ? UR.gold : UR.gold2), { lw: 4.5 });
  glassSet(key + '.claw', () => [tongue([w.wr[0] - 14, w.wr[1] - 8], [w.wr[0] + 14, w.wr[1] - 8], [w.wr[0] + 10, w.wr[1] - 70], 0.2)], [UR.claw], { lw: 4 });
}
function drawUr(x, y, s, o = {}) {
  const t = E.T, flap = Math.sin(t * (o.flapRate || 1.6)) * (o.flap ?? 0.05);
  push(x, y, o.rot || 0, s);
  scaled(s, () => {
    const prevB = E.blood; E.blood = o.blood || 0;
    // far wing, behind everything
    push(110, -40, -flap * 0.6); ctx.translate(-200, 200); ctx.translate(200, -200); urWing('ur.wingF', o, true); pop();
    // tail
    region('ur.tail', () => ({
      out: capsulePts([[-380, 10], [-600, 110], [-740, 300], [-660, 430], [-520, 400]], 130, 26),
      poly: true,
      mattes: [{ pts: [[-420, 60], [-640, 180], [-700, 330]], w: 40, a: 0.3 }],
    }), [UR.gold2], { lw: 5.5 });
    glassSet('ur.tailtip', () => [[[-540, 380], [-470, 330, 1], [-500, 420], [-420, 470, 1], [-520, 450]].map((p) => p)], [UR.gold3], { lw: 4.5 });
    // far hind leg
    region('ur.hindF', () => ({ out: capsulePts([[-200, 40], [-120, 170], [-190, 300]], 90, 48), poly: true }), [lerpRGB(UR.gold2, '#5a3010', 0.35)], { lw: 5 });
    // body and neck
    region('ur.body', () => ({
      out: [[520, -400], [470, -330], [430, -150], [360, 30], [100, 130], [-200, 140], [-330, 90], [-430, 30], [-420, -40], [-200, -130], [60, -170], [260, -240], [380, -420], [460, -530], [540, -500]],
      panels: [{ pts: [[548, -404], [494, -326], [458, -150], [388, 44], [110, 160], [-210, 172], [-210, 110], [96, 96], [326, 6], [394, -150], [432, -320], [480, -390]], poly: true, ci: 1 }],
      cuts: [[[480, -390], [432, -320], [394, -150], [326, 6], [96, 96], [-210, 110]], [[150, -190], [180, 0], [130, 110]], [[-120, -140], [-80, 20], [-120, 130]]],
      mattes: [{ pts: [[-380, -30], [-150, -110], [100, -150], [280, -220]], w: 50, a: 0.3 }, { pts: [[-300, 80], [0, 120]], w: 40, a: 0.25 }],
    }), [UR.gold, UR.belly], {
      lw: 6,
      paint: () => {
        if (!E._urScales) {
          E._urScales = new Path2D();
          for (let yy = -500; yy < 140; yy += 26) for (let xx = -440 + (((yy / 26) | 0) & 1) * 15; xx < 540; xx += 30) { E._urScales.moveTo(xx + 13, yy); E._urScales.arc(xx, yy, 13, 0, Math.PI); }
        }
        ctx.save(); ctx.strokeStyle = 'rgba(90,40,8,0.35)'; ctx.lineWidth = 2.2; ctx.stroke(E._urScales); ctx.restore();
        // belly plates
        ctx.save(); ctx.strokeStyle = 'rgba(90,40,8,0.5)'; ctx.lineWidth = 3;
        for (const [ax, ay, bx, by] of [[520, -380, 470, -390], [480, -300, 444, -310], [455, -200, 420, -205], [430, -100, 396, -110], [400, 0, 360, -10], [300, 70, 280, 40], [180, 110, 170, 80], [40, 140, 40, 105], [-100, 150, -100, 115]]) { ctx.beginPath(); ctx.moveTo(ax + 10, ay); ctx.lineTo(bx - 10, by); ctx.stroke(); }
        ctx.restore();
      },
      veins: { key: 'ur', roots: [[0, 0, 0.2, 300], [0, 0, 3.2, 300], [300, -200, -1.2, 200]], w: 4, seed: 4 },
    });
    // dorsal spikes
    glassSet('ur.spikes', () => {
      const sp = [[470, -540], [430, -480], [395, -420], [350, -350], [290, -270], [200, -215], [100, -185], [0, -165], [-100, -150], [-200, -135], [-300, -100], [-390, -60]];
      return sp.map(([px, py], i) => { const nx = px - (sp[Math.min(i + 1, sp.length - 1)][0] || px), ang = -Math.PI / 2 - 0.5; return tongue([px - 18, py + 4], [px + 18, py + 4], [px - 30 + Math.cos(ang) * 10, py - 60 - (i < 4 ? 10 : 0)], 0.1); });
    }, [UR.gold3, UR.gold2], { lw: 4 });
    // near hind leg
    region('ur.hindN', () => ({ out: capsulePts([[-260, 20], [-150, 160], [-240, 290]], 120, 60), poly: true, mattes: [{ pts: [[-290, 40], [-200, 180]], w: 30, a: 0.3 }] }), [UR.gold2], { lw: 5.5 });
    glassSet('ur.hindClaw', () => [-300, -260, -220].map((cx, i) => tongue([cx - 14, 300], [cx + 14, 300], [cx - 22 + i * 4, 362], 0.25)), [UR.claw], { lw: 4 });
    // front leg, raised, talons spread
    region('ur.fore', () => ({ out: capsulePts([[320, -40], [450, 70], [560, 40]], 100, 56), poly: true, mattes: [{ pts: [[330, -10], [440, 90]], w: 30, a: 0.3 }] }), [UR.gold2], { lw: 5.5 });
    glassSet('ur.foreClaw', () => [[600, 0], [620, 40], [600, 80]].map(([cx, cy], i) => tongue([cx - 6, cy - 14], [cx - 6, cy + 14], [cx + 64, cy + (i - 1) * 18 + 16], -0.25)), [UR.claw], { lw: 4 });
    // head: horned, spiked, the jaw a little open
    const jaw = o.jaw ?? (0.1 + 0.1 * Math.sin(t * 2));
    push(500, -470, o.headTilt || 0);
    glassSet('ur.horns', () => [tongue([-40, -70], [-10, -88], [-210, -200], -0.12), tongue([-60, -40], [-38, -66], [-200, -120], -0.1), tongue([10, -90], [30, -84], [-60, -170], -0.1)], [UR.horn, '#e0d6c0', UR.horn], { lw: 4.5 });
    push(80, 40, jaw * 0.5);
    region('ur.jaw', () => ({ out: [[-60, 30], [20, 14], [150, 28], [190, 44], [120, 62], [0, 66], [-50, 56]], brushes: [{ pts: [[20, 26], [150, 34]], w: 3 }] }), [UR.gold2], { lw: 5 });
    glassSet('ur.teethLo', () => [40, 75, 110, 140].map((tx) => [[tx - 7, 24], [tx + 7, 26], [tx, 6]]), [UR.claw], { lw: 2.5 });
    pop();
    region('ur.head', () => ({
      out: [[-70, -30], [-30, -88], [60, -80], [150, -40], [222, 0], [228, 22], [180, 32], [80, 40], [-20, 52], [-60, 30]],
      cuts: [[[60, -80], [40, -30], [90, 20]]],
      mattes: [{ pts: [[-40, -60], [60, -60], [150, -20]], w: 26, a: 0.3 }, { pts: [[40, -40], [110, -30]], w: 14, a: 0.3 }],
      brushes: [{ pts: [[200, 6], [214, 8]], w: 6 }],
    }), [UR.gold], { lw: 5.5 });
    glassSet('ur.teethHi', () => [70, 105, 140, 170].map((tx) => [[tx - 7, 34], [tx + 7, 33], [tx, 54]]), [UR.claw], { lw: 2.5 });
    // amber eye with a slit pupil
    region('ur.eye', () => ({ out: [[34, -44, 1], [56, -56], [80, -48, 1], [58, -36]] }), [o.eyeCol || UR.eye], { lw: 3.5, glow: 0.9, glowR: 30, keep: true,
      paint: () => { ctx.fillStyle = 'rgba(20,8,4,0.95)'; ctx.beginPath(); ctx.ellipse(58, -46, 2.6, 9, 0.2, 0, TAU); ctx.fill(); } });
    pop();
    // near wing, raised over the back
    push(0, 0, flap); urWing('ur.wingN', o, false); pop();
    E.blood = prevB;
    if (o.chains) urChains(o.chains);
  });
  pop();
}
// blood chains binding Ur: links along paths, glowing
function urChains(amt) {
  const paths = [
    [[620, -470], [520, -380], [380, -330], [-400, -700]],
    [[900, 300], [440, -60], [300, 120], [-900, 340]],
    [[-1000, -300], [-300, 60], [-220, 230], [-400, 900]],
    [[1000, -300], [360, -300], [320, -60], [700, 900]],
  ];
  ctx.save();
  for (const pts of paths) {
    const s = ssample(pts, false, 18);
    let L = 0;
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let k = 0; k < d; k += 30) {
        const u = k / d, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const n = Math.round((L + k) / 30);
        if ((L + k) / (amt * 2400) > 1) continue;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath(); if (n % 2) ctx.ellipse(0, 0, 20, 5, 0, 0, TAU); else ctx.ellipse(0, 0, 20, 12, 0, 0, TAU);
        ctx.lineWidth = 13; ctx.strokeStyle = '#1a0306'; ctx.stroke();
        ctx.lineWidth = 6; ctx.strokeStyle = `rgba(230,${(20 + 40 * E.pulse) | 0},30,1)`; ctx.stroke();
        ctx.restore();
      }
      L += d;
    }
  }
  ctx.restore();
}
