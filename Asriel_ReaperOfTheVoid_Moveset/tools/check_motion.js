#!/usr/bin/env node
// Frame-by-frame validation of the animation: grip contact, planted feet,
// floor and self penetration, framing, blade speed and frame data.
// Usage: node tools/check_motion.js [--verbose]
'use strict';
const A = require('../src/reaper_anim.js');
const { add, sub, mul, dot, len } = A._math;
const verbose = process.argv.includes('--verbose');

const N = A.DURATION * A.FPS;
const segDist = (p, a, b) => {
  const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)));
  return len(sub(p, add(a, mul(ab, t))));
};
const stats = {
  gripGap: 0, slideFrames: 0, maxSlide: 0, ankleGap: 0,
  footDrift: 0, pivotFlat: 0, minFloor: Infinity, minFloorAt: 0,
  bodyHits: [], bbox: [Infinity, Infinity, -Infinity, -Infinity], bboxAt: [0, 0, 0, 0],
};
let prev = null;
for (let f = 0; f <= N; f++) {
  const t = f / A.FPS, p = A.evalPose(t);
  for (const arm of p.arms) {
    stats.gripGap = Math.max(stats.gripGap, len(sub(arm.hand, arm.grip)));
    if (Math.abs(arm.slide) > 0.005) { stats.slideFrames++; stats.maxSlide = Math.max(stats.maxSlide, Math.abs(arm.slide)); }
  }
  for (const leg of p.legs) stats.ankleGap = Math.max(stats.ankleGap, len(sub(leg.ankle, leg.foot.ankle)));
  if (prev) {
    for (let i = 0; i < 2; i++) {
      const a = p.legs[i].foot, b = prev.legs[i].foot;
      if (a.planted && b.planted) {
        stats.footDrift = Math.max(stats.footDrift, len(sub(a.contact, b.contact)));
        const key = i === 0 ? 'L' : 'R';
        const dyaw = Math.abs(p.c[key + 'yaw'] - prev.c[key + 'yaw']), heel = Math.min(p.c[key + 'heel'], prev.c[key + 'heel']);
        if (dyaw > 0.05 && heel < 3) stats.pivotFlat = Math.max(stats.pivotFlat, dyaw);
      }
    }
  }
  // weapon points
  const sc = p.scythe, bl = A.bladeOutline(p, 16);
  const shaftPts = []; for (let u = 0; u <= A.RIG.shaft + 0.1; u += 0.05) shaftPts.push({ p: sc.at(u), u });
  const bladePts = bl.spine.concat(bl.edge).map(q => ({ p: q, u: A.RIG.shaft }));
  for (const q of shaftPts.concat(bladePts)) if (q.p[1] < stats.minFloor) { stats.minFloor = q.p[1]; stats.minFloorAt = t; }
  // self intersection (ignore shaft near the hands)
  const uMin = Math.min(p.arms[0].u, p.arms[1].u) - 0.12, uMax = Math.max(p.arms[0].u, p.arms[1].u) + 0.12;
  const body = [
    ['torso', p.spineBase, p.chest, 0.15], ['head', p.head, p.head, 0.15],
    ...p.legs.map(l => ['thigh' + l.side, l.hip, l.knee, 0.07]), ...p.legs.map(l => ['shin' + l.side, l.knee, l.ankle, 0.055]),
  ];
  for (const arm of p.arms) {
    const d = segDist(arm.hand, p.spineBase, p.chest) - 0.15;
    if (d < 0) stats.bodyHits.push({ f, t: +t.toFixed(3), name: 'hand' + arm.side, depth: +(-d).toFixed(3), u: +arm.u.toFixed(2) });
  }
  for (const q of shaftPts.concat(bladePts)) {
    if (q.u > uMin && q.u < uMax) continue;
    for (const [name, a, b, r] of body) {
      const d = segDist(q.p, a, b) - r;
      if (d < 0) { stats.bodyHits.push({ f, t: +t.toFixed(3), name, depth: +(-d).toFixed(3), u: +q.u.toFixed(2) }); break; }
    }
  }
  // framing: body, horns/halo envelope, weapon
  const pts = [p.head, add(p.head, [0, 0.52, 0]), ...p.legs.map(l => l.foot.toe), ...p.legs.map(l => l.foot.heel),
    ...p.arms.map(a => a.elbow), ...shaftPts.map(q => q.p), ...bladePts.map(q => q.p)];
  for (const q of pts) {
    const s = A.project(q);
    if (s[0] < stats.bbox[0]) { stats.bbox[0] = s[0]; stats.bboxAt[0] = t; }
    if (s[1] < stats.bbox[1]) { stats.bbox[1] = s[1]; stats.bboxAt[1] = t; }
    if (s[0] > stats.bbox[2]) { stats.bbox[2] = s[0]; stats.bboxAt[2] = t; }
    if (s[1] > stats.bbox[3]) { stats.bbox[3] = s[1]; stats.bboxAt[3] = t; }
  }
  prev = p;
}

const fmt = x => (typeof x === 'number' ? +x.toFixed(4) : x);
console.log('frames                 ', N + 1, `(${A.FPS} fps, ${A.DURATION}s)`);
console.log('max hand↔grip gap (m)  ', fmt(stats.gripGap));
console.log('hand slide frames      ', stats.slideFrames, ' max slide (m)', fmt(stats.maxSlide));
console.log('max ankle IK gap (m)   ', fmt(stats.ankleGap));
console.log('planted foot drift (m) ', fmt(stats.footDrift));
console.log('flat-foot pivot (deg/f)', fmt(stats.pivotFlat));
console.log('weapon min height (m)  ', fmt(stats.minFloor), '@', fmt(stats.minFloorAt));
console.log('screen bbox (px)       ', stats.bbox.map(v => Math.round(v)).join(', '), ' @t', stats.bboxAt.map(fmt).join(', '));
const hits = stats.bodyHits;
console.log('weapon/body contacts   ', hits.length);
if (hits.length) {
  const groups = {};
  for (const h of hits) { const k = h.name; (groups[k] = groups[k] || []).push(h); }
  for (const k in groups) {
    const g = groups[k], worst = g.reduce((a, b) => (b.depth > a.depth ? b : a));
    console.log(`   ${k.padEnd(8)} frames ${g[0].f}–${g[g.length - 1].f} (${g.length} pts)  worst ${worst.depth} m @ ${worst.t}s u=${worst.u}`);
  }
}
const fd = A.frameData();
console.log('\nframe data (60 fps; authored active windows, blade-belly speed measured inside them)');
for (const m of fd.moves) {
  if (m.a0 === undefined) continue;
  console.log(`  ${m.tag.padEnd(7)} ${m.name.padEnd(24)} startup ${String(m.startup).padStart(3)}  active ${String(m.active).padStart(3)}  recovery ${String(m.recovery).padStart(3)}  peak ${m.peakSpeed.toFixed(1)} m/s  min-in-active ${m.minActiveSpeed.toFixed(1)} m/s`);
}
if (verbose) {
  for (let f = 0; f <= N; f += 6) {
    const t = f / A.FPS, p = A.evalPose(t);
    console.log(t.toFixed(2), 'speed', fd.speeds[f].toFixed(1), 'pelY', p.pel[1].toFixed(3), 'slide', p.arms.map(a => a.slide.toFixed(3)).join('/'));
  }
}
