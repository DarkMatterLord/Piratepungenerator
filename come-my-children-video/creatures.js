'use strict';
// The Malakar (the living storm) and the Emperor (a ghost in the glass).

// ---------- Malakar: domed segmented carapace, blood-crystal spikes, a glowing belly sac,
// jointed crab legs with ivory thorns and a red whip tail. Side view facing right; ≈ 420 wide.
function drawMalakar(x, y, s, o = {}) {
  const t = E.T + (o.ph || 0), walk = o.walk ?? 1;
  push(x, y, o.rot || 0, s * (o.flip ? -1 : 1), s);
  scaled(s, () => {
    // whip tail
    const tw = Math.sin(t * 5) * 30;
    region('mk.tail' + Math.round(tw / 6), () => ({ out: capsulePts([[-130, -60], [-230, -90 + tw * 0.5], [-330, -40 + tw], [-380, -110 + tw * 1.4]], 26, 6), poly: true }), ['#a01020'], { lw: 4 });
    // far legs (darker), then body, then near legs
    const leg = (i, near) => {
      const ph = t * 9 * walk + i * 1.9 + (near ? 0 : 1.1), lift = Math.max(0, Math.sin(ph)) * 16 * walk, sw = Math.cos(ph) * 14 * walk;
      const bx = -100 + i * 66, by = -34;
      const out = (i - 1.5) * 26;
      const knee = [bx + out + sw * 0.5, -72 - lift], foot = [bx + out * 1.9 + 22 + sw, 46 - lift * 0.5];
      const col = near ? '#5a1410' : '#360c08';
      const p1 = capsulePts([[bx, by], knee], 22, 16), p2 = capsulePts([knee, foot], 16, 5);
      const a = polyPath(p1), b = polyPath(p2);
      glassPiece(a, _bloodCol(col, {}), { cx: (bx + knee[0]) / 2, cy: (by + knee[1]) / 2, r: 24, seed: i * 7 + (near ? 1 : 2) });
      glassPiece(b, _bloodCol(col, {}), { cx: (knee[0] + foot[0]) / 2, cy: (knee[1] + foot[1]) / 2, r: 24, seed: i * 7 + (near ? 3 : 4) });
      lead(a, 3.5); lead(b, 3.5);
      // ivory thorn at the knee
      const th = polyPath([[knee[0] - 5, knee[1] + 2], [knee[0] + 5, knee[1] + 2], [knee[0] + 1, knee[1] - 20]]);
      glassPiece(th, '#f4ecd8', { cx: knee[0], cy: knee[1] - 8, r: 8, seed: i }); lead(th, 2.5);
    };
    for (let i = 0; i < 4; i++) leg(i, false);
    // glowing belly sac with white spines
    region('mk.sac', () => ({ out: [[-110, -10], [-40, 30], [60, 34], [120, 0], [80, -40], [-60, -40]] }), ['#ffe8a0'], { lw: 4.5, glow: 0.9, glowR: 90, keep: true });
    glassSet('mk.spines', () => [-70, -30, 10, 50, 90].map((sx2) => [[sx2 - 5, 24], [sx2 + 5, 24], [sx2 + 2, 52]]), ['#ffffff'], { lw: 2.5 });
    // segmented dome carapace
    region('mk.shell', () => ({
      out: [[-150, -30], [-130, -120], [-60, -170], [40, -175], [120, -130], [160, -50], [150, -20], [-140, -20]],
      cuts: [[[-90, -150], [-80, -20]], [[-20, -175], [-15, -20]], [[50, -172], [45, -20]], [[115, -134], [100, -20]]],
      panels: [{ pts: [[-90, -200], [-80, 0], [-15, 0], [-20, -200]], poly: true, ci: 1 }, { pts: [[50, -200], [45, 0], [100, 0], [115, -200]], poly: true, ci: 1 }],
      mattes: [{ pts: [[-140, -40], [-40, -60], [140, -40]], w: 30, a: 0.35 }],
    }), ['#9a2a14', '#5a140c'], { lw: 5 });
    // blood-crystal spikes along the dome
    glassSet('mk.spikes', () => [[-110, -120], [-60, -160], [0, -175], [60, -168], [110, -130]].map(([px, py], i) => tongue([px - 16, py + 6], [px + 16, py + 6], [px - 8 + i * 6, py - 70 - (i === 2 ? 30 : 0)], 0.1)), ['#ff3a3a', '#e01828'], { lw: 3.5, glow: 0.9, glowR: 50 });
    // head: mandibles, a glint of eyes
    region('mk.head', () => ({ out: [[140, -80], [200, -70], [230, -40], [200, -10], [150, -20]], brushes: [{ pts: [[196, -54], [204, -52]], w: 6 }] }), ['#5a140c'], { lw: 4 });
    glassSet('mk.jaws', () => [tongue([214, -36], [222, -24], [270, -10], 0.2), tongue([206, -20], [214, -10], [258, 12], 0.2)], ['#f4ecd8'], { lw: 3 });
    for (let i = 0; i < 4; i++) leg(i, true);
  });
  pop();
}

// ---------- the Emperor, remembered: bearded, gold circlet, crimson tunic with the crest,
// white fur mantle, gold belt, sword point-down. Figure space like Malacay's (feet at 0).
function drawEmperor(x, y, s, o = {}) {
  const ghost = o.ghost ?? 1;
  const G = (c) => lerpRGB(c, '#8a9ab8', ghost * 0.55);
  push(x, y, 0, s);
  scaled(s, () => {
    // legs and boots
    for (const sx of [-1, 1]) region('emp.leg' + sx, () => ({ out: _M(sx, [[-14, -560, 1], [-92, -560, 1], [-96, -60], [-110, 0, 1], [-20, 0, 1], [-18, -60]]), poly: true }), [G('#3a2a20')], { lw: 5 });
    // tunic (long, crimson) with the crest
    region('emp.tunic', () => ({
      out: [[-150, -880, 1], [150, -880, 1], [180, -560], [200, -240], [210, -150, 1], [-210, -150, 1], [-200, -240], [-180, -560]],
      cuts: [[[-60, -620], [-80, -150]], [[60, -620], [80, -150]]],
      panels: [{ pts: [[-60, -640], [-80, -140], [80, -140], [60, -640]], poly: true, ci: 1 }],
      mattes: [{ pts: [[-160, -820], [-180, -300]], w: 40, a: 0.3 }, { pts: [[160, -820], [180, -300]], w: 40, a: 0.3 }],
    }), [G('#9a0e1a'), G('#b01624')], { lw: 6 });
    push(0, -780); drawCrest(0, 0, 0.7, { eagle: G('#f4f6fa'), towerCol: G(GOLD) }); pop();
    // gold belt hung with the pennants of his vassals
    region('emp.belt', () => ({ out: [[-180, -600], [180, -600], [182, -566], [-182, -566]], poly: true }), [G(GOLD)], { lw: 5 });
    glassSet('emp.pennants', () => [-140, -84, 84, 140].map((px) => [[px - 16, -566], [px + 16, -566], [px + 16, -500], [px, -480], [px - 16, -500]]), (i) => G(['#2a46c8', '#1a7a3a', '#7a2aa8', '#c89a1a'][i]), { lw: 3.5 });
    // white fur mantle over the shoulders
    region('emp.mantle', () => ({
      out: [[-80, -960], [80, -960], [200, -900], [236, -800], [210, -700], [150, -760], [90, -820], [0, -840], [-90, -820], [-150, -760], [-210, -700], [-236, -800], [-200, -900]],
      mattes: [{ pts: [[-200, -820], [-100, -880], [0, -900], [100, -880], [200, -820]], w: 30, a: 0.2 }],
    }), [G('#f2efe8')], {
      lw: 6,
      paint: () => { ctx.save(); ctx.fillStyle = 'rgba(30,30,40,0.6)'; for (const [mx, my] of [[-170, -820], [-110, -860], [-40, -880], [40, -880], [110, -860], [170, -820], [-200, -760], [200, -760]]) { ctx.beginPath(); ctx.ellipse(mx, my, 6, 10, 0, 0, TAU); ctx.fill(); } ctx.restore(); },
    });
    // the sword, point down, both hands on the pommel
    region('emp.blade', () => ({ out: [[-16, -560], [16, -560], [16, -110], [0, -60, 1], [-16, -110]], cuts: [[[0, -560], [0, -80]]] }), [G('#d8e0ea')], { lw: 4.5 });
    region('emp.guard', () => ({ out: [[-90, -600], [90, -600], [96, -578], [-96, -578]], poly: true }), [G(GOLD)], { lw: 4.5 });
    region('emp.grip', () => ({ out: [[-12, -690], [12, -690], [12, -600], [-12, -600]], poly: true }), [G('#3a2418')], { lw: 4 });
    for (const sx of [-1, 1]) region('emp.hand' + sx, () => ({ out: _M(sx, [[-44, -700], [-6, -704], [-4, -640], [-40, -636]]) }), [G('#e8c8b0')], { lw: 4.5, keep: true });
    for (const sx of [-1, 1]) region('emp.arm' + sx, () => ({ out: _M(sx, [[-150, -880, 1], [-200, -820], [-120, -700], [-40, -700], [-50, -660], [-130, -660], [-236, -780]]) }), [G('#9a0e1a')], { lw: 5.5 });
    // head: weathered face, grey-brown beard, gold circlet
    push(0, -960);
    region('emp.face', () => ({ out: [[0, 10], [36, -10], [50, -60], [48, -110], [30, -150], [0, -160], [-30, -150], [-48, -110], [-50, -60], [-36, -10]] }), [G('#e8c8b0')], {
      lw: 5, keep: true,
      paint: () => {
        for (const sx of [-1, 1]) {
          brush([[sx * 8, -104], [sx * 22, -110], [sx * 38, -104]], 5, { a: 0.6, b: 0.2 });
          ctx.fillStyle = 'rgba(40,30,30,0.85)'; ctx.beginPath(); ctx.ellipse(sx * 22, -92, 4.5, 3, 0, 0, TAU); ctx.fill();
          brush([[sx * 10, -86], [sx * 22, -82], [sx * 34, -86]], 1.5, { c: 'rgba(42,20,12,0.5)' });
          brush([[sx * 14, -122], [sx * 30, -126]], 1.4, { c: 'rgba(42,20,12,0.35)' });
        }
        brush([[-4, -98], [-6, -70], [4, -66]], 2.4);
      },
    });
    region('emp.beard', () => ({ out: [[-50, -70], [-30, -54], [0, -50], [30, -54], [50, -70], [46, -20], [24, 30], [0, 44], [-24, 30], [-46, -20]], strands: [[[-30, -40], [-20, 20]], [[0, -40], [0, 36]], [[30, -40], [20, 20]], [[-14, -40], [-8, 30]], [[14, -40], [8, 30]]] }), [G('#8a7a68')], { lw: 5, keep: true, strandCol: 'rgba(40,30,20,0.45)' });
    region('emp.hair', () => ({ out: [[-50, -100], [-56, -140], [-34, -170], [0, -178], [34, -170], [56, -140], [50, -100], [40, -136], [0, -150], [-40, -136]] }), [G('#7a6a5a')], { lw: 5, keep: true });
    region('emp.circlet', () => ({ out: [[-50, -140], [-20, -150], [0, -170, 1], [20, -150], [50, -140], [50, -126], [0, -136], [-50, -126]] }), [G(GOLD)], { lw: 4.5, glow: 0.3, glowR: 40 });
    pop();
  });
  pop();
}
