'use strict';
// The shot list: every lyric line gets its window. Times in seconds.
function buildShots() {
  // ---- INTRO ----
  shot(0.0, 'naveDark', { vig: 0.6 });
  shot(4.4, 'throne', {}, { type: 'fade', d: 0.8 });
  shot(8.46, 'wise', {}, { type: 'fade', d: 0.6 });
  shot(14.3, 'offer', {}, { type: 'fade', d: 0.5 });
  shot(17.94, 'drop', {}, { type: 'cut' });
  shot(22.08, 'eyes', {}, { type: 'black', d: 0.3 });
  shot(24.48, 'atlas', {}, { type: 'fade', d: 0.4 });
  shot(29.1, 'rose', {}, { type: 'fade', d: 0.6 });
  shot(36.0, 'ignite', { vig: 0.55 }, { type: 'fade', d: 1.2 });
  // ---- VERSE 1 ----
  shot(47.9, 'noWeapon', {}, { type: 'white', d: 0.5 });
  shot(50.92, 'door', {}, { type: 'fade', d: 0.4 });
  shot(54.26, 'bridge', {}, { type: 'fade', d: 0.4 });
  shot(57.34, 'hearts', {}, { type: 'fade', d: 0.4 });
  shot(60.42, 'kings', {}, { type: 'cut' });
  shot(63.58, 'oath', {}, { type: 'fade', d: 0.3 });
  shot(66.28, 'ageless', {}, { type: 'shatter', d: 1.0 });
  shot(69.68, 'handIsMe', {}, { type: 'fade', d: 0.4 });
  // ---- PRE-CHORUS 1 ----
  shot(73.06, 'threads', {}, { type: 'fade', d: 0.4 });
  shot(76.0, 'livingDead', {}, { type: 'fade', d: 0.4 });
  shot(79.22, 'distantGods', {}, { type: 'fade', d: 0.4 });
  shot(82.28, 'inBlood', {}, { type: 'fade', d: 0.4 });
  // ---- CHORUS 1 ----
  chorus([86.24, 91.56, 97.8, 103.68, 111.04, 115.02, 117.8, 121.42], 1);
  // ---- VERSE 2 ----
  shot(126.06, 'urFracture', {}, { type: 'black', d: 0.6 });
  shot(133.64, 'circle', {}, { type: 'fade', d: 0.3 });
  shot(136.66, 'godsFade', {}, { type: 'white', d: 0.6 });
  shot(139.82, 'decay', {}, { type: 'fade', d: 0.4 });
  shot(142.82, 'pyre', {}, { type: 'fade', d: 0.4 });
  shot(145.76, 'liberty', {}, { type: 'cut' });
  shot(148.86, 'rise', {}, { type: 'fade', d: 0.4 });
  shot(151.74, 'manyHands', {}, { type: 'fade', d: 0.4 });
  // ---- PRE-CHORUS 2 ----
  shot(155.12, 'giveBlood', {}, { type: 'fade', d: 0.4 });
  shot(158.1, 'unbending', {}, { type: 'fade', d: 0.3 });
  shot(161.1, 'release', {}, { type: 'fade', d: 0.3 });
  shot(164.0, 'road', {}, { type: 'fade', d: 0.4 });
  // ---- CHORUS 2 ----
  chorus([168.0, 173.4, 179.62, 185.22, 192.38, 196.58, 199.38, 202.92], 2);
  // ---- BREAK + INTERLUDE ----
  shot(207.7, 'gutter', { vig: 0.6 }, { type: 'fade', d: 0.5 });
  shot(211.2, 'monster', {}, { type: 'shatter', d: 0.8 });
  shot(213.68, 'wordChosen', {}, { type: 'fade', d: 0.4 });
  shot(218.38, 'refusal', {}, { type: 'fade', d: 0.4 });
  shot(222.58, 'future', { cage: false }, { type: 'fade', d: 0.4 });
  shot(225.58, 'future', { cage: true }, { type: 'cut' });
  shot(229.1, 'stillChildren', {}, { type: 'fade', d: 0.5 });
  shot(232.56, 'shelter', {}, { type: 'fade', d: 0.5 });
  // ---- BRIDGE ----
  shot(238.7, 'emperorGhost', {}, { type: 'black', d: 0.9 });
  shot(241.72, 'nations', {}, { type: 'cut' });
  shot(243.32, 'godsDark', {}, { type: 'cut' });
  shot(246.12, 'trustedYou', {}, { type: 'fade', d: 0.3 });
  shot(248.16, 'graves', {}, { type: 'fade', d: 0.4 });
  shot(251.28, 'alone', {}, { type: 'fade', d: 0.5 });
  shot(255.54, 'notThese', {}, { type: 'cut' });
  shot(259.0, 'doorRuin', {}, { type: 'fade', d: 0.3 });
  shot(262.08, 'breakWork', {}, { type: 'cut' });
  shot(264.78, 'kneel', {}, { type: 'shatter', d: 0.9 });
  shot(268.82, 'heal', {}, { type: 'fade', d: 0.4 });
  shot(271.74, 'saved', {}, { type: 'fade', d: 0.4 });
  shot(274.82, 'sure', {}, { type: 'fade', d: 0.4 });
  // ---- CHORUS 3 ----
  chorus([280.0, 284.56, 290.88, 296.7, 303.86, 308.04, 311.12, 314.48], 3);
  // ---- OUTRO ----
  shot(318.36, 'necessity', {}, { type: 'shatter', d: 0.9 });
  shot(321.26, 'malar', {}, { type: 'cut' });
  shot(324.38, 'understand', {}, { type: 'fade', d: 0.3 });
  shot(327.34, 'takeHand', {}, { type: 'fade', d: 0.3 });
  shot(330.56, 'siege', {}, { type: 'cut' });
  shot(333.5, 'refuge', {}, { type: 'fade', d: 0.3 });
  shot(336.48, 'bearStorm', {}, { type: 'fade', d: 0.3 });
  shot(340.02, 'shapeWorld', {}, { type: 'fade', d: 0.5 });
  shot(346.54, 'returnHome', { vig: 0.6 }, { type: 'black', d: 1.0 });
  shot(352.32, 'notHate', {}, { type: 'fade', d: 0.6 });
  shot(355.68, 'neverLearned', {}, { type: 'fade', d: 0.25 });
  shot(360.45, 'finale', { vig: 0.55 }, { type: 'shatter', d: 1.2 });
  shot(366.4, 'ending', { vig: 0.3, bloom: 0.3 }, { type: 'fade', d: 1.2 });
}
function chorus(T, v) {
  shot(T[0], 'icon', { v }, { type: v === 1 ? 'white' : 'shatter', d: v === 1 ? 0.6 : 1.0 });
  shot(T[1], 'mosaic', { v }, { type: 'fade', d: 0.3 });
  shot(T[2], v === 2 ? 'urChained' : 'crown', { v }, { type: 'fade', d: 0.4 });
  shot(T[3], v === 1 ? 'forms' : 'bloodGod', { v }, { type: 'fade', d: 0.5 });
  shot(T[4], 'war', { v }, { type: 'shatter', d: 0.9 });
  shot(T[5], 'turnAway', { v }, { type: 'fade', d: 0.3 });
  shot(T[6], 'paradise', { v }, { type: 'white', d: 0.5 });
  shot(T[7], 'closeHand', { v }, { type: 'fade', d: 0.4 });
}
