'use strict';
// The director: turns song time into camera, lighting, character performance and story events.
// Everything here is a pure function of t, so frames can be rendered in any order / in parallel.
const fs = require('fs');
const path = require('path');
const U = require('./util');
const BEAR = require('./bear');
const RAB = require('./rabbit');
const { POS } = require('./set');

const DATA = path.join(__dirname, '..', 'data');
const TIMING = JSON.parse(fs.readFileSync(path.join(DATA, 'timing.json')));
const AF = JSON.parse(fs.readFileSync(path.join(DATA, 'audio_features.json')));
const LINES = TIMING.lines;
LINES.forEach((l, i) => { l.idx = i; });
const SECTIONS = TIMING.sections.map((s, i) => ({
  ...s, idx: i, round: i < 2 ? 1 : 2,
  label: `ROUND ${i < 2 ? 1 : 2}`,
}));
SECTIONS.forEach((s, i) => { s.end = i + 1 < SECTIONS.length ? SECTIONS[i + 1].start : 1e9; });
for (const L of LINES) { L.sec = SECTIONS[L.section]; L.k = L.idx - L.sec.first_line; }

const LAST = LINES[LINES.length - 1];
const T_END = AF.frames / AF.fps;
const T = {
  intro: SECTIONS[0].start,
  gap2: 231.7, // instrumental gap before the rabbit's second verse
  playback: LINES.find((l) => l.text.startsWith('And see a legally')).start,
  outro: LAST.words[LAST.words.length - 1].t + 1.0,
  stop: 310.4,
  end: T_END,
};
T.ted2Last = LINES.find((l) => l.text.startsWith('I loved mine'));

// ------------------------------------------------------------------ audio helpers
function feat(arr, t) {
  const f = t * AF.fps, i = Math.floor(f);
  if (i < 0) return arr[0];
  if (i >= arr.length - 1) return arr[arr.length - 1];
  return U.lerp(arr[i], arr[i + 1], f - i);
}
const BEATS = AF.beats;
function beatInfo(t) {
  let lo = 0, hi = BEATS.length - 1;
  if (t < BEATS[0]) return { i: -1, phase: 0, pulse: 0, since: 1 };
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (BEATS[m] <= t) lo = m; else hi = m - 1; }
  const b = BEATS[lo], nb = BEATS[lo + 1] || b + 0.6;
  const since = t - b;
  return { i: lo, phase: U.clamp(since / (nb - b)), pulse: Math.exp(-since * 7), since, len: nb - b };
}
// damped ear/tuft swing driven by recent beats (stateless)
function swing(t, amp, freq = 10, decay = 3.2) {
  let v = 0;
  const bi = beatInfo(t).i;
  for (let k = Math.max(0, bi - 4); k <= bi; k++) {
    const d = t - BEATS[k];
    if (d < 0) continue;
    v += (k % 2 ? 1 : -0.7) * amp * Math.exp(-d * decay) * Math.sin(d * freq);
  }
  return v;
}
function mouthFrom(t) {
  const v = feat(AF.vocal, t + 0.02), o = feat(AF.vocalOnset, t + 0.02);
  return U.clamp(Math.pow(U.clamp((v - 0.1) / 0.75), 0.75) * 1.05 + o * 0.12, 0, 1.15);
}

function lineAt(t) {
  for (let i = LINES.length - 1; i >= 0; i--) if (LINES[i].start <= t) return LINES[i];
  return null;
}
function sectionAt(t) {
  if (t < SECTIONS[0].start) return null;
  for (let i = SECTIONS.length - 1; i >= 0; i--) if (SECTIONS[i].start <= t) return SECTIONS[i];
  return null;
}
const byPrefix = (p) => LINES.find((l) => l.text.startsWith(p));

// ------------------------------------------------------------------ story events
const EV = {
  camcorder: byPrefix('You did a camcorder dance'),
  crowdWild: byPrefix('I was on Johnny Carson'),
  luckyFoot: byPrefix('Ross cut off your lucky foot'),
  livingBear: byPrefix("I'm a living, talking bear"),
  legend: byPrefix('You call yourself a legend'),
  ring: byPrefix("You're an imaginary heckler"),
  encore: byPrefix('Then you dragged him off'),
  fenway: byPrefix('Donny ripped you at Fenway'),
  boston: byPrefix('But I never needed all of Boston'),
  ears: byPrefix('Your foot brought lucky breaks'),
  hostage: byPrefix("That's not friendship!"),
  crack: byPrefix('So crack another beer'),
  loved: byPrefix('I loved mine enough to leave'),
  saint: byPrefix("Aw, Saint Teddy's back!"),
  subpoena: byPrefix('A court can certify'),
  roll: byPrefix('Now roll the'),
  playbackVoice: byPrefix("My voice won't make the playback"),
  tantrum: byPrefix("They'll hear your righteous tantrum"),
  final: byPrefix('And see a legally'),
  dad: byPrefix('My kid calls me Dad'),
};
const CHEERS = [
  [EV.crowdWild.start + 1.0, EV.crowdWild.end + 0.6],
  [EV.ring.start + 2.6, EV.ring.end + 1.2],
  [EV.encore.start + 1.4, EV.encore.end + 0.8],
  [EV.boston.start + 2.8, EV.boston.end + 1.4],
  [EV.loved.start + 3.2, EV.loved.end + 2.0],
  [EV.final.start + 1.6, T.outro],
  [6.24, 7.6],
];
function cheerAt(t) {
  let c = 0;
  for (const [a, b] of CHEERS) c = Math.max(c, U.smooth((t - a) / 0.35) * (1 - U.smooth((t - b) / 0.6)));
  return c;
}
const ramp = (t, a, b, fi = 0.3, fo = 0.3) => U.smooth((t - a) / fi) * (1 - U.smooth((t - b) / fo));

// ------------------------------------------------------------------ shots
const HEADY = { ted: POS.ted.y + BEAR.HEAD.y, floppy: POS.floppy.y + RAB.HEAD.y };
const CX = { ted: POS.ted.x, floppy: POS.couch.x };
const other = (w) => (w === 'ted' ? 'floppy' : 'ted');
function shotCam(type, who) {
  const d = who === 'ted' ? 1 : -1;
  switch (type) {
    case 'WIDE': return { x: 0, y: -300, zoom: 1.0, z1: 1.045 };
    case 'MS': return { x: CX[who] + d * 95, y: HEADY[who] + 125, zoom: 1.55, z1: 1.63, dx: d * -20 };
    case 'CU': return { x: CX[who] + d * 45, y: HEADY[who] + 45, zoom: 2.2, z1: 2.32 };
    case 'ECU': return { x: CX[who] + d * 20, y: HEADY[who] + 18, zoom: 2.8, z1: 2.95 };
    case 'TWO': return { x: who === 'ted' ? -170 : 170, y: -300, zoom: 1.22, z1: 1.28, dx: d * 30 };
    case 'DUTCH': return { x: CX[who] + d * 40, y: HEADY[who] + 50, zoom: 2.1, z1: 2.2, rot: d * 0.07 };
    case 'REACT': return { x: CX[who] - d * 40, y: HEADY[who] + 50, zoom: 2.15, z1: 2.3 };
    case 'PLAYBACK': return { x: 0, y: -290, zoom: 1.06, z1: 1.06, rot: -0.018 };
    default: return { x: 0, y: -300, zoom: 1, z1: 1 };
  }
}
const PATTERN = ['MS', 'CU', 'TWO', 'REACT', 'WIDE', 'DUTCH', 'MS', 'ECU'];
const OVERRIDE = new Map([
  [EV.camcorder, 'REACT'], [EV.crowdWild, 'WIDE'], [EV.luckyFoot, 'REACT'], [EV.livingBear, 'MS'], [EV.legend, 'ECU'],
  [EV.ring, 'WIDE'], [EV.encore, 'WIDE'], [EV.fenway, 'REACT'], [EV.boston, 'WIDE'], [EV.ears, 'REACT'],
  [EV.hostage, 'ECU'], [EV.crack, 'MS'], [EV.loved, 'CU'], [EV.saint, 'CU'], [EV.subpoena, 'REACT'],
  [EV.roll, 'MS'], [EV.playbackVoice, 'CU'], [EV.tantrum, 'REACT'], [EV.final, 'PLAYBACK'], [EV.dad, 'CU'],
]);
const SHOTS = [];
(function buildShots() {
  SHOTS.push({ t0: 0, t1: 2.16, type: 'WIDE', who: 'ted', cam: { x: 0, y: -360, zoom: 1.0, z1: 1.08 } });
  SHOTS.push({ t0: 2.16, t1: 4.3, type: 'MS', who: 'ted' });
  SHOTS.push({ t0: 4.3, t1: 6.24, type: 'MS', who: 'floppy' });
  SHOTS.push({ t0: 6.24, t1: T.intro, type: 'WIDE', who: 'ted' });
  for (const L of LINES) {
    const who = L.speaker;
    let type = OVERRIDE.get(L) || (L.k === 0 ? (who === 'ted' ? 'WIDEPUSH' : 'CU') : PATTERN[L.k % PATTERN.length]);
    let subj = type === 'REACT' ? other(who) : who;
    const t0 = L.start, t1 = L.idx + 1 < LINES.length ? LINES[L.idx + 1].start : T.end;
    if (type === 'PLAYBACK') { SHOTS.push({ t0, t1: T.end, type, who: subj }); continue; }
    const dur = t1 - t0;
    if (dur > 3.9 && type !== 'WIDE' && type !== 'REACT' && L !== EV.loved) {
      // split long bars: second half becomes a reaction / two-shot for rhythm
      const mid = L.words[Math.floor(L.words.length / 2)].t;
      SHOTS.push({ t0, t1: mid, type, who: subj });
      SHOTS.push({ t0: mid, t1, type: L.k % 2 ? 'REACT' : 'TWO', who: L.k % 2 ? other(who) : who });
    } else SHOTS.push({ t0, t1, type, who: subj });
  }
  // the interstitial before the rabbit's 2nd verse is a wide
  for (const s of SHOTS) if (s.t0 <= T.gap2 && s.t1 > T.gap2) { const end = s.t1; s.t1 = T.gap2; SHOTS.push({ t0: T.gap2, t1: end, type: 'WIDE', who: 'floppy' }); break; }
  SHOTS.sort((a, b) => a.t0 - b.t0);
})();
function shotAt(t) {
  for (let i = SHOTS.length - 1; i >= 0; i--) if (SHOTS[i].t0 <= t) return SHOTS[i];
  return SHOTS[0];
}

function camera(t) {
  const sh = shotAt(t);
  const u = U.clamp((t - sh.t0) / Math.max(0.1, sh.t1 - sh.t0));
  let c;
  if (sh.type === 'WIDEPUSH') {
    const a = shotCam('WIDE', sh.who), b = shotCam('MS', sh.who);
    const e = U.easeInOut(u);
    c = { x: U.lerp(a.x, b.x, e), y: U.lerp(a.y, b.y, e), zoom: U.lerp(a.zoom, b.zoom, e), rot: 0 };
  } else {
    const b = sh.cam || shotCam(sh.type, sh.who);
    c = { x: b.x + (b.dx || 0) * u, y: b.y, zoom: U.lerp(b.zoom, b.z1 || b.zoom, U.easeInOut(u)), rot: b.rot || 0 };
  }
  const playback = sh.type === 'PLAYBACK';
  if (!playback) {
    // handheld float
    const hz = 1 / Math.sqrt(c.zoom);
    c.x += U.fbm1(t * 0.55, 11) * 14 * hz;
    c.y += U.fbm1(t * 0.5, 12) * 10 * hz;
    c.rot += U.fbm1(t * 0.4, 13) * 0.008;
    // kick bump + cut punch-in
    const bi = beatInfo(t);
    const inVerse = t > T.intro && t < T.playback;
    c.zoom *= 1 + (inVerse ? 0.016 : 0.008) * bi.pulse + 0.01 * feat(AF.bassHit, t);
    const cu = (t - sh.t0) / 0.16;
    if (cu < 1 && sh.t0 > 0.1) c.zoom *= 1 + 0.045 * (1 - cu) * (1 - cu);
  }
  // impact shake on the intro "VS" slam
  const sk = U.clamp(1 - (t - 6.24) / 0.5) * (t >= 6.24 ? 1 : 0);
  c.sx = (U.hash(Math.floor(t * 60), 21) - 0.5) * 24 * sk;
  c.sy = (U.hash(Math.floor(t * 60), 22) - 0.5) * 24 * sk;
  return { cam: c, shot: sh };
}

// ------------------------------------------------------------------ performance
const TED_GEST = [
  (t, b) => ({ armR: -1.55 + 0.12 * b.pulse, bottleAng: -0.35 }),                         // point
  (t, b) => ({ armR: U.lerp(-0.75, -1.95, Math.pow(1 - b.phase, 2)), bottleAng: -0.2 }),     // pump on the beat
  (t, b) => ({ armR: -1.15 + 0.45 * Math.sin(t * 4.2), bottleAng: 0.1 * Math.sin(t * 4.2) }), // wave
  (t, b) => ({ armR: -2.45 + 0.18 * b.pulse, bottleAng: 0.2 }),                              // raise
];
const FLOP_GEST = [
  (t, b) => ({ armL: 1.5 - 0.12 * b.pulse, canAng: 0.3 }),
  (t, b) => ({ armL: U.lerp(0.7, 1.95, Math.pow(1 - b.phase, 2)), canAng: 0.2 }),
  (t, b) => ({ armL: 1.15 + 0.45 * Math.sin(t * 4.0), canAng: -0.1 * Math.sin(t * 4) }),
  (t, b) => ({ armL: 2.45 - 0.18 * b.pulse, canAng: -0.2 }),
];
const TED_SIP = { armR: -2.55, armRLen: 0.8, bottleAng: -1.33 };
const TED_REST = { armR: 0.28, armRLen: 1, bottleAng: 0.12 };
const TED_MIC_DOWN = { armL: -0.3, armLLen: 1, micAng: -0.15 };
const FLOP_SIP = { armL: 2.6, armLLen: 0.8, canAng: 1.43 };
const FLOP_REST = { armL: 0.25, armLLen: 1, canAng: -0.05 };
const FLOP_MIC_DOWN = { armR: 0.25, armRLen: 1, micAng: 0.1 };
const TED_CHEST = { armR: 1.3, armRLen: 0.7, bottleAng: 0.3 };

function mixPose(a, b, k) {
  const o = Object.assign({}, a);
  for (const key of Object.keys(b)) o[key] = a[key] == null ? b[key] : U.lerp(a[key], b[key], k);
  return o;
}
function gestureFor(list, L, t, b) {
  const g = list[(L.k + (L.idx % 3)) % list.length](t, b);
  const prevL = LINES[L.idx - 1];
  if (prevL && prevL.speaker === L.speaker) {
    const k = U.smooth((t - L.start) / 0.3);
    if (k < 1) return mixPose(list[(prevL.k + (prevL.idx % 3)) % list.length](t, b), g, k);
  }
  return g;
}
function sipAmount(t, L, every) {
  if (!L || L.idx % every !== 1) return 0;
  const a = L.start + 0.4, d = L.end - L.start;
  return ramp(t, a, a + Math.min(1.6, d * 0.6), 0.35, 0.35);
}

function tedState(t, ctx) {
  const { active, L, shot, b } = ctx;
  const st = { blink: ((t + 1.3) % 4.4) < 0.11 };
  const facingCam = shot.who === 'ted' && /CU|ECU|DUTCH|REACT/.test(shot.type);
  st.turn = facingCam ? 0.14 : 0.34;
  if (active === 'ted') {
    st.mouth = mouthFrom(t);
    Object.assign(st, BEAR.MIC_POSE);
    st.armL += 0.04 * Math.sin(t * 2.1); st.micAng += 0.05 * Math.sin(t * 1.7);
    Object.assign(st, gestureFor(TED_GEST, L, t, b));
    st.bob = Math.pow(1 - b.phase, 3);
    st.tilt = (b.i % 2 ? 1 : -1) * 0.035 * Math.pow(1 - b.phase, 2) + 0.02 * Math.sin(t * 0.9);
    st.lean = 0.03 + 0.015 * Math.sin(t * 1.1);
    st.squash = st.bob * 0.6;
    st.anger = 0.55 + (/!/.test(L.text) ? 0.35 : 0.15) + 0.1 * Math.sin(t * 3);
    if (L === EV.livingBear) Object.assign(st, mixPose(st, TED_CHEST, ramp(t, L.start, L.end, 0.2, 0.2)), { anger: 0.3, smile: 1 });
    if (L === EV.loved) { st.anger = 0.1; st.smile = 0.6; st.tilt = 0.06 * Math.sin(t * 0.8); }
    if (L.text.startsWith('Yeah, I fooled around')) { st.smile = 1; st.anger = 0.2; }
    if (L === EV.dad) { st.smile = 1; st.anger = 0; }
  } else {
    st.mouth = 0;
    Object.assign(st, TED_MIC_DOWN, TED_REST);
    const sip = active === 'floppy' ? sipAmount(t, L, 4) : 0;
    if (sip > 0) Object.assign(st, mixPose(st, TED_SIP, sip));
    st.bob = 0.3 * Math.pow(1 - b.phase, 3);
    st.tilt = 0.02 * Math.sin(t * 0.7);
    st.anger = 0.35; st.frown = 0.5;
    if (active === 'floppy' && L) {
      // punchline reactions
      const punch = L.k % 4 === 3 && t > (L.start + L.end) / 2;
      if (punch) { st.anger = 1; st.frown = 1; st.mouth = 0.08; }
      if (L === EV.fenway || L === EV.subpoena) { st.surprise = ramp(t, L.start + 0.3, L.end, 0.15, 0.3); st.anger = 0.2; st.mouth = 0.35 * st.surprise; }
      if (L === EV.tantrum || (t >= T.playback)) {
        // losing it: silent yelling, fists flying
        st.anger = 1.25; st.mouth = 0.25 + 0.75 * Math.abs(Math.sin(t * 9.5)) * mouthFrom(t) * 1.3;
        Object.assign(st, { armR: -2.3 + 0.5 * Math.sin(t * 11), armL: 1.9 + 0.5 * Math.sin(t * 9 + 1), armLLen: 0.9, micAng: 0.6, bottleAng: 0.2 });
        st.bob = Math.abs(Math.sin(t * 6)); st.tilt = 0.06 * Math.sin(t * 7); st.lean = 0.05 * Math.sin(t * 5);
      }
    }
  }
  // tantrum line itself is the rabbit's, but the bear is the subject: handled above
  return st;
}

function floppyState(t, ctx) {
  const { active, L, shot, b } = ctx;
  const st = { blink: ((t + 0.4) % 3.6) < 0.13 };
  const facingCam = shot.who === 'floppy' && /CU|ECU|DUTCH|REACT/.test(shot.type);
  st.turn = facingCam ? -0.12 : -0.3;
  st.lookX = facingCam ? -0.15 : -0.65;
  const sw = swing(t, active === 'floppy' ? 0.2 : 0.09);
  st.earL = 0.33 + sw + 0.04 * Math.sin(t * 1.3);
  st.earR = -0.33 - sw * 0.85 - 0.04 * Math.sin(t * 1.1 + 1);
  st.tongueWag = Math.sin(t * 5.3);
  if (active === 'floppy') {
    st.mouth = mouthFrom(t) * 1.0 + 0.12;
    Object.assign(st, RAB.MIC_POSE);
    st.armR += 0.04 * Math.sin(t * 2.3);
    Object.assign(st, gestureFor(FLOP_GEST, L, t, b));
    st.bob = Math.pow(1 - b.phase, 3);
    st.tilt = (b.i % 2 ? -1 : 1) * 0.04 * Math.pow(1 - b.phase, 2) + 0.025 * Math.sin(t * 0.8);
    st.lean = -0.025;
    st.squash = st.bob * 0.6;
    st.lid = 0.3 - 0.08 * b.pulse; st.anger = 0.35 + (/!/.test(L.text) ? 0.3 : 0);
    if (L === EV.playbackVoice) st.winkR = t > L.start + 0.9 && t < L.start + 1.7;
  } else {
    st.mouth = 0.28;
    Object.assign(st, FLOP_MIC_DOWN, FLOP_REST);
    const sip = active === 'ted' ? sipAmount(t, L, 5) : 0;
    if (sip > 0) { Object.assign(st, mixPose(st, FLOP_SIP, sip)); st.mouth = 0.28 + 0.2 * sip; }
    st.bob = 0.35 * Math.pow(1 - b.phase, 3);
    st.tilt = 0.05 + 0.02 * Math.sin(t * 0.6);
    st.lid = 0.52;
    if (active === 'ted' && L) {
      if (L.k % 4 === 3 && t > (L.start + L.end) / 2) { st.lid = 0.15; st.surprise = 0.7; st.mouth = 0.5; }
      if (L.k % 8 === 5) { st.lookY = -1; st.lookX = 0.3; st.lid = 0.25; } // eye roll
      if (L === EV.luckyFoot) { st.lookY = 1; st.lookX = 0; st.lid = 0.2; st.surprise = 0.6; st.tilt = 0.12; }
      if (L === EV.camcorder) { // frozen grin
        Object.assign(st, { bob: 0, tilt: 0, earL: 0.33, earR: -0.33, tongueWag: 0, mouth: 0.55, lid: 0.3, lookX: 0, lookY: 0, blink: false, turn: 0 });
      }
      if (L === EV.ears) {
        const k = U.clamp((t - (L.words.find((w) => /viagra/i.test(w.w)) || L.words[4]).t - 0.25) / 0.6);
        const fall = U.smooth((t - L.end - 0.6) / 0.6);
        const up = U.easeOutElastic(k) * (1 - fall);
        st.earL = U.lerp(st.earL, Math.PI - 0.22, up); st.earR = U.lerp(st.earR, -(Math.PI - 0.22), up);
        st.surprise = up; st.lid = U.lerp(st.lid, 0.05, up); st.mouth = U.lerp(st.mouth, 0.7, up);
      }
    }
  }
  // the playback: on tape the rabbit is just a limp toy
  if (t >= T.playback) {
    Object.assign(st, { mouth: 0.3, bob: 0, tilt: 0.14, lean: 0.06, lid: 0.4, lookX: 0.1, lookY: 0.2, blink: false, winkR: false, earL: 0.25, earR: -0.25, tongueWag: 0, armL: 0.12, armR: -0.1, canAng: 0.4, micAng: -0.3, surprise: 0, anger: 0, squash: 0 });
  }
  return st;
}

// ------------------------------------------------------------------ lighting & mode
function lighting(t, active) {
  const tedOn = t < T.intro ? ramp(t, 2.16, 99, 0.08) * 0.9 + 0.08 : active === 'ted' ? 1 : 0.32;
  const flopOn = t < T.intro ? ramp(t, 4.3, 99, 0.08) * 0.9 + 0.08 : active === 'floppy' ? 1 : 0.32;
  // smooth handover at section boundaries
  const sec = sectionAt(t);
  let k = 1;
  if (sec && t - sec.start < 0.5) k = U.smooth((t - sec.start) / 0.5);
  const prev = sec && sec.idx > 0 ? SECTIONS[sec.idx - 1].speaker : null;
  const mixL = (cur, was) => (prev ? U.lerp(was, cur, k) : cur);
  const neonOn = t < 0.8 ? 0 : t < 1.5 ? (U.hash(Math.floor(t * 20), 4) < (t - 0.8) / 0.7 ? 1 : 0.1) : 1;
  return {
    tedLight: sec ? mixL(tedOn, prev === 'ted' ? 1 : 0.32) : tedOn,
    flopLight: sec ? mixL(flopOn, prev === 'floppy' ? 1 : 0.32) : flopOn,
    neon: neonOn,
    houseLight: t < 1.4 ? 0.2 : 1,
  };
}

function mode(t) {
  if (t >= T.playback) return 'playback';
  const s = sectionAt(t);
  if (!s) return t < 2.16 ? 'vhs' : t < 4.3 ? 'film' : t < 6.24 ? 'vhs' : 'film';
  if (t >= T.gap2 && t < SECTIONS[3].start) return 'vhs';
  return s.speaker === 'ted' ? 'film' : 'vhs';
}

function frameState(t) {
  const sec = sectionAt(t);
  const L = lineAt(t);
  const active = t >= T.playback ? 'floppy' : sec ? sec.speaker : null;
  const b = beatInfo(t);
  const { cam, shot } = camera(t);
  const lightsMain = lighting(t, active);
  const ctx = { active, L, shot, b };
  const bear = tedState(t, ctx);
  const rabbit = floppyState(t, ctx);
  const focus = /WIDE|TWO|PLAYBACK/.test(shot.type) ? 'both' : shot.who;
  const inSoft = t > LINES[T.ted2Last.idx - 1].start && t < T.gap2;
  return {
    t, cam, shot, sec, line: L, active, beat: b.pulse, beatPhase: b.i + b.phase, bi: b,
    ...lightsMain, focus,
    dim: focus === 'both' ? 0.45 : 0.62,
    cheer: cheerAt(t),
    rimWarm: active === 'floppy' ? 0.1 : 1,
    lighters: inSoft ? ramp(t, LINES[T.ted2Last.idx - 1].start + 0.5, T.gap2 - 0.2, 1.2, 0.5) : 0,
    energy: U.clamp(feat(AF.level, t)),
    bass: feat(AF.bass, t),
    bear, rabbit, mode: mode(t),
  };
}

module.exports = { frameState, LINES, SECTIONS, T, EV, SHOTS, feat, AF, beatInfo };
