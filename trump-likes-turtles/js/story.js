// The narrative: scene(t) returns everything on screen at time t (seconds).
// The story is one continuous animation; the visual style changes on every
// beat on top of it, which is what keeps 80 styles coherent.
window.STORY = (() => {
  const { clamp, lerp, ramp, bump, keys, ease, hash, v3, m3 } = U;
  const SC = window.SCORE;
  const SPB = SC.secondsPerBeat;
  const PI = Math.PI;

  const SKIES = {
    dawn: { top: '#79AEE6', mid: '#F6C2B6', hor: '#FFE3B3', sun: [-0.42, 0.13, -1], sunCol: '#FFD7A1', sunSize: 1.5,
      light: [-0.35, 0.75, 0.75], lightCol: '#FFE6C8', amb: '#AFC4E8', ground: '#78B850', night: 0 },
    day: { top: '#3C8EE0', mid: '#8CC4F2', hor: '#D7EEFF', sun: [-0.62, 0.52, -1], sunCol: '#FFF7D6', sunSize: 1.1,
      light: [-0.45, 0.82, 0.6], lightCol: '#FFF4E2', amb: '#A9CBF0', ground: '#6DBB4A', night: 0 },
    night: { top: '#060A22', mid: '#1C1550', hor: '#4C2B70', sun: [0.55, 0.42, -1], sunCol: '#E8EEFF', sunSize: 0.7,
      light: [0.35, 0.8, 0.7], lightCol: '#9FB2FF', amb: '#3A3C7A', ground: '#2D5A3A', night: 1 },
    sunset: { top: '#2E4088', mid: '#E07A8C', hor: '#FFB760', sun: [0.12, 0.055, -1], sunCol: '#FF9B45', sunSize: 2.4,
      light: [0.25, 0.35, -0.9], lightCol: '#FFB070', amb: '#B07E9A', ground: '#5E9A44', night: 0.15 },
  };

  // ---------- lip-sync from the score ----------
  const LIP = SC.syllables.filter((s) => SC.lines[s.line].lipsync);
  function lipsync(b) {
    for (const s of LIP) {
      if (b >= s.beat - 0.05 && b < s.beat + s.dur) {
        const f = (b - s.beat + 0.05) / (s.dur + 0.05);
        const env = Math.min(1, f * 5) * Math.min(1, (1 - f) * 3 + 0.25);
        const txt = s.text.toLowerCase();
        const round = /o/.test(txt) ? 0.85 : /u|w/.test(txt) ? 0.45 : 0;
        const open = (0.55 + 0.45 * Math.min(1, s.dur / 1.5)) * env;
        return { open, round, word: s.text };
      }
    }
    return { open: 0, round: 0 };
  }
  // Natural blinks at deterministic moments.
  function blinkAt(b, seed) {
    const period = 3.1 + seed * 0.7;
    const ph = (b + hash(seed, 7) * period) % period;
    return ph < 0.18 ? Math.sin((ph / 0.18) * PI) : 0;
  }
  const sfxBeats = (name) => SC.sfx.filter((s) => s.sfx === name).map((s) => s.beat);

  // ---------- pose helpers (Trump, upper-body-local coordinates) ----------
  function basePose(x, z, yaw) {
    return {
      pos: [x, 0, z], yaw, lean: 0, tilt: 0, bob: 0, hipDrop: 0,
      footL: [0.13, 0.07, 0.02], footR: [-0.13, 0.07, 0.02],
      handL: [0.37, 0.93, 0.08], handR: [-0.37, 0.93, 0.08],
      headYaw: 0, headPitch: 0, smile: 0.7, mouthOpen: 0, mouthRound: 0, blink: 0, browRaise: 0,
    };
  }
  function walk(P, ph, amt = 1, arms = true) {
    const s = Math.sin(ph), c = Math.cos(ph);
    P.footL = [0.12, 0.07 + Math.max(0, c) * 0.13 * amt, 0.2 * s * amt];
    P.footR = [-0.12, 0.07 + Math.max(0, -c) * 0.13 * amt, -0.2 * s * amt];
    P.bob = -Math.abs(s) * 0.035 * amt + 0.02 * amt;
    if (arms) {
      P.handL = [0.36, 0.95, 0.06 - 0.2 * s * amt];
      P.handR = [-0.36, 0.95, 0.06 + 0.2 * s * amt];
    }
    P.tilt = 0.03 * s * amt;
  }
  function march(P, ph) {
    const s = Math.sin(ph);
    P.footL = [0.13, 0.07 + Math.max(0, s) * 0.32, 0.05 + Math.max(0, s) * 0.18];
    P.footR = [-0.13, 0.07 + Math.max(0, -s) * 0.32, 0.05 + Math.max(0, -s) * 0.18];
    P.kneeHintL = [0.1, 0.5, 1]; P.kneeHintR = [-0.1, 0.5, 1];
    P.bob = Math.abs(s) * 0.03;
  }
  function kneel(P, k) {
    P.hipDrop = 0.36 * k;
    P.footL = v3.lerp([0.13, 0.07, 0.02], [0.15, 0.07, 0.32], k);
    P.footR = v3.lerp([-0.13, 0.07, 0.02], [-0.13, 0.07, -0.38], k);
    P.kneeHintL = [0.2, 1, 1]; P.kneeHintR = [-0.1, -1, 0.4];
    P.lean = 0.12 * k;
  }
  function sit(P) {
    P.hipDrop = 0.36; P.hipZ = -0.02;
    P.footL = [0.16, 0.07, 0.42]; P.footR = [-0.16, 0.07, 0.42];
    P.kneeHintL = [0.1, 1, 0.4]; P.kneeHintR = [-0.1, 1, 0.4];
  }
  function dance(P, ph) {
    const s = Math.sin(ph);
    P.handL = [0.2 + 0.16 * s, 1.28 + 0.06 * Math.cos(2 * ph), 0.32];
    P.handR = [-0.2 + 0.16 * s, 1.28 - 0.06 * Math.cos(2 * ph), 0.32];
    P.elbowHint = [[-0.8, -0.5, -0.4], [0.8, -0.5, -0.4]];
    P.handShapeL = P.handShapeR = 'fist';
    P.tilt = -0.07 * s; P.bob = 0.03 * Math.abs(Math.cos(ph));
    P.footL = [0.15 + 0.03 * s, 0.07, 0.02]; P.footR = [-0.15 + 0.03 * s, 0.07, 0.02];
  }
  function thumbs(P, k = 1) {
    P.handL = v3.lerp(P.handL, [0.3, 1.38, 0.34], k);
    P.handR = v3.lerp(P.handR, [-0.3, 1.38, 0.34], k);
    P.elbowHint = [[-0.8, -0.6, -0.2], [0.8, -0.6, -0.2]];
    if (k > 0.5) P.handShapeL = P.handShapeR = 'thumb';
  }
  function sing(P, b, k = 1) {
    const l = lipsync(b);
    P.mouthOpen = l.open * k; P.mouthRound = l.round;
  }

  // ---------- the turtle ----------
  function baseTurtle(x, z, yaw) {
    return { pos: [x, 0, z], yaw, pitch: 0, roll: 0, head: 1, headYaw: 0, headPitch: 0, smile: 1, scale: 1.15, squash: 1, hat: false };
  }

  // Effect helpers (world-anchored unless noted).
  const heart = (pos, size, a = 1, rot = 0) => ({ type: 'heart', pos, size, a, rot });
  const sparkle = (pos, size, a = 1, rot = 0) => ({ type: 'sparkle', pos, size, a, rot });

  // ======================================================
  function scene(t) {
    const b = t / SPB;
    const S = { t, b, groups: [], fx: [], sky: SKIES.day, pond: { c: [2.65, 0, -1.45], rx: 1.85, rz: 0.95 }, night: false };
    let cam = { tx: 0, ty: 1.2, h: 4, elev: 0.25, orbit: 0, roll: 0 };
    let tp = null, tt = null; // Trump pose, hero turtle pose
    const extras = [];

    // ---------------- INTRO 0-8 ----------------
    if (b < 8) {
      S.sky = SKIES.dawn;
      tt = baseTurtle(1.35, 0.15, -1.15); tt.head = 0;
      if (b < 4) {
        cam = { tx: 0, ty: keys(b, [[0, 3.0], [4, 2.5]]), h: keys(b, [[0, 9.0], [4, 7.4]]), elev: 0.5, orbit: 0, roll: 0 };
        const a = ramp(b, 0, 0.9, ease.outBack) * (1 - ramp(b, 3.55, 4));
        S.fx.push({ type: 'title', lines: ['TRUMP LIKES', 'TURTLES'], a, scale: 0.6 + 0.4 * ramp(b, 0, 0.9, ease.outBack), y: 0.3 });
        tp = basePose(keys(b, [[0, -10], [4, -4.6]], ease.linear), 0.3, 1.0); // walking in from the left
        walk(tp, b * PI);
      } else {
        const x = keys(b, [[4, -4.6], [6, -3.35], [7.5, -3.35], [8, -3.05]], ease.linear);
        tp = basePose(x, 0.3, keys(b, [[4, 1.0], [5.6, 1.0], [6.1, 0.15], [7.4, 0.15], [7.9, 1.0]]));
        const walking = b < 6 || b > 7.5;
        if (walking) walk(tp, b * PI);
        if (b > 5.8 && b < 7.6) { // wave hello to the camera
          const w = bump(b, 5.8, 6.2, 7.2, 7.6);
          tp.handL = v3.lerp(tp.handL, [0.46 + 0.07 * Math.sin(b * PI * 4), 1.82, 0.12], w);
          tp.elbowHint = [null, [1, -0.6, 0]];
          tp.smile = 1; tp.headYaw = -0.1 * w;
        }
        cam = { tx: keys(b, [[4, -3.0], [8, -2.4]]), ty: 1.35, h: 4.1, elev: 0.5, orbit: 0, roll: 0 };
      }
    }
    // ---------------- VERSE 1: 8-24 ----------------
    else if (b < 24) {
      tt = baseTurtle(1.42, 0.42, -1.2);
      if (b < 16) {
        const x = keys(b, [[8, -3.05], [15.5, 0.5]], ease.linear);
        tp = basePose(x, 0.3, keys(b, [[8, 1.0], [15, 1.0], [15.8, 0.45]]));
        walk(tp, b * PI, 1 - ramp(b, 15.2, 15.8));
        tp.headYaw = keys(b, [[8, 0], [12, -0.5], [14, -0.2]]);
        tt.head = 0;
        cam = { tx: keys(b, [[8, -2.1], [12, -0.2], [16, 0.95]]), ty: keys(b, [[8, 1.3], [16, 1.05]]), h: keys(b, [[8, 3.9], [16, 3.1]]), elev: 0.45, orbit: 0, roll: 0 };
      } else {
        tp = basePose(0.5, 0.3, keys(b, [[16, 0.45], [19, 0.55], [20, 0.8]]));
        // notices the shell, the turtle pops out, he kneels and shakes its flipper
        const lookDown = bump(b, 16, 16.6, 18, 18.4);
        tp.lean = 0.16 * lookDown; tp.headPitch = 0.35 * lookDown; tp.browRaise = lookDown;
        if (b < 18) S.fx.push({ type: 'symbol', text: '?', pos: v3.add(tp.pos, [0.1, 2.25, 0]), size: 0.32 * ramp(b, 16, 16.4, ease.outBack), a: 1 - ramp(b, 17.7, 18) });
        const pop = ramp(b, 18, 18.45, ease.outBack);
        tt.head = b < 18 ? 0 : pop;
        tt.squash = b < 18 ? 1 : 1 + 0.25 * Math.sin(clamp((b - 18) / 0.6) * PI) * (1 - ramp(b, 18.3, 18.8));
        tt.blink = b < 18.2 ? 1 : 0;
        tt.headYaw = 0.5;
        if (b >= 18 && b < 19.4) {
          const s = ramp(b, 18, 18.25, ease.outBack) * (1 - ramp(b, 19.1, 19.4));
          S.fx.push({ type: 'symbol', text: '!', pos: v3.add(tp.pos, [0.05, 2.25, 0]), size: 0.36 * s, a: s });
          tp.eyesWide = 1; tp.mouthOpen = 0.7 * s; tp.mouthRound = 1; tp.lean = -0.08 * s; tp.browRaise = s;
        }
        const kn = ramp(b, 19, 19.8);
        kneel(tp, kn);
        tp.lean += 0.05 * kn;
        tp.hipDrop += 0.06 * kn;
        // handshake
        const shake = bump(b, 19.7, 20.2, 22.8, 23.3);
        tt.waveL = shake;
        tp.lean += 0.22 * shake;
        if (shake > 0) {
          const flip = RIG.turtlePoint(tt, [0.3, 0.24 + 0.04 * Math.sin(b * PI * 4), 0.26]);
          const loc = RIG.trumpLocal(tp, flip);
          tp.handL = v3.lerp(tp.handL, v3.add(loc, [-0.04, 0, 0]), shake);
          tp.elbowHint = [null, [0.5, -0.8, 0.2]];
        }
        tp.smile = b > 20 ? 1 : 0.7;
        tt.smile = 1;
        if (b > 22) {
          const hs = ramp(b, 22, 22.4, ease.outBack);
          const mid = v3.lerp(tp.pos, tt.pos, 0.55);
          S.fx.push(heart(v3.add(mid, [0, 1.25 + 0.15 * ramp(b, 22, 24), 0.2]), 0.42 * hs * (1 + 0.06 * Math.sin(b * PI * 4)), 1));
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * PI * 2 + b;
            S.fx.push(sparkle(v3.add(mid, [Math.cos(a) * 0.55 * hs, 1.25 + Math.sin(a) * 0.4 * hs, 0.25]), 0.08 * hs, hs, b * 2));
          }
        }
        cam = { tx: keys(b, [[16, 0.95], [19, 0.95], [20.5, 0.95]]), ty: keys(b, [[16, 1.05], [19, 0.9], [20.5, 0.75]]), h: keys(b, [[16, 3.1], [18, 2.8], [20.5, 2.2]]), elev: 0.3, orbit: 0, roll: 0 };
      }
    }
    // ---------------- CHORUS 1: 24-40 ----------------
    else if (b < 40) {
      if (b < 32) {
        // lift the turtle to the sky, then spin with it
        const spin = ramp(b, 28, 31.3, ease.inOut) * PI * 2;
        tp = basePose(0.55, 0.3, spin);
        const up = ramp(b, 23.9, 24.5, ease.out);
        tp.handL = v3.lerp([0.3, 1.2, 0.35], [0.19, 2.1, 0.1], up);
        tp.handR = v3.lerp([-0.3, 1.2, 0.35], [-0.19, 2.1, 0.1], up);
        tp.elbowHint = [[-1, 0, -0.3], [1, 0, -0.3]];
        tp.headPitch = -0.35 * up; tp.lean = -0.04;
        tp.smile = 1;
        sing(tp, b, 0.8);
        if (b > 28) walk(tp, b * PI * 2, 0.35, false);
        const mid = v3.lerp(RIG.trumpPoint(tp, tp.handL), RIG.trumpPoint(tp, tp.handR), 0.5);
        tt = baseTurtle(mid[0], mid[2], spin);
        tt.pos = v3.add(mid, [0, 0.0, 0]);
        tt.pitch = -0.15; tt.headPitch = 0.2; tt.waveL = 0.6 + 0.4 * Math.sin(b * PI * 2); tt.waveR = 0.6 + 0.4 * Math.cos(b * PI * 2);
        tt.mouthOpen = 0.5 + 0.3 * Math.sin(b * PI);
        if (b < 28.5) S.fx.push({ type: 'rays', pos: v3.add(tt.pos, [0, 0.2, -0.5]), a: ramp(b, 24, 24.5) * (1 - ramp(b, 28, 28.5)), rot: b * 0.15 });
        for (let i = 0; i < 7; i++) {
          const ph = (b * 0.6 + i / 7) % 1;
          const a = (i * 2.4) + 0.3;
          if (b > 28 || i < 4) S.fx.push(heart(v3.add(tt.pos, [Math.cos(a) * (0.3 + ph * 1.3), 0.2 + ph * 1.1, 0.3]), 0.16 * (1 - ph * 0.5), (1 - ph) * ramp(b, 24.2, 24.8), Math.sin(a) * 0.4));
        }
        cam = { tx: 0.55, ty: keys(b, [[24, 1.5], [28, 1.6], [31.5, 1.45]]), h: keys(b, [[24, 3.9], [28, 3.5], [31.5, 3.6]]), elev: -0.9, orbit: keys(b, [[24, 0], [28, 0.12], [31.5, -0.05]]), roll: 0 };
      } else {
        // set the turtle down and dance together
        tp = basePose(0.45, 0.3, 0.18);
        const down = ramp(b, 31.5, 32.2);
        dance(tp, b * PI);
        tp.smile = 1;
        sing(tp, b, 0.9);
        tt = baseTurtle(1.3, 0.25, -0.9);
        if (down < 1) {
          const from = [0.55, 2.1, 0.3];
          tt.pos = v3.lerp(from, tt.pos, ease.inOut(down));
          tt.yaw = lerp(0, -0.9, down);
        }
        const tb = Math.sin(b * PI * 2);
        tt.squash = 1 + 0.08 * tb; tt.roll = 0.14 * Math.sin(b * PI); tt.headYaw = 0.6; tt.headRoll = 0.15 * Math.sin(b * PI);
        tt.waveL = 0.5 + 0.5 * Math.sin(b * PI); tt.waveR = 0.5 - 0.5 * Math.sin(b * PI);
        tt.mouthOpen = 0.3 + 0.3 * Math.max(0, tb);
        if (b < 35) {
          const s = ramp(b, 32, 32.35, ease.outBack) * (1 - ramp(b, 34.6, 35));
          S.fx.push({ type: 'burst', text: 'TREMENDOUS!', x: 0.5, y: 0.2, scale: s, rot: -0.06 + 0.02 * Math.sin(b * PI * 2) });
        }
        if (b > 35.8 && b < 38) thumbs(tp, bump(b, 35.8, 36.1, 37.7, 38));
        if (b >= 38) {
          const pk = ramp(b, 38, 38.3);
          tp.handL = v3.lerp(tp.handL, [0.62, 1.2, 0.42], pk);
          tp.handShapeL = 'point'; tp.pointDir = [null, [1, -0.35, 0.3]];
          tp.headYaw = 0.3 * pk;
          for (let i = 0; i < 5; i++) {
            const a = i * 1.26 + b * 2;
            S.fx.push(sparkle(v3.add(tt.pos, [Math.cos(a) * 0.45, 0.55 + Math.sin(a) * 0.3, 0.3]), 0.07 * pk, pk, b * 3));
          }
        }
        cam = { tx: keys(b, [[32, 0.75], [40, 0.95]]), ty: 1.05, h: keys(b, [[32, 3.1], [40, 2.9]]), elev: 0.3, orbit: 0.06 * Math.sin(b * 0.4), roll: 0 };
      }
    }
    // ---------------- VERSE 2: 40-56 ----------------
    else if (b < 56) {
      if (b < 48) {
        // lettuce, then a tiny red hat
        tp = basePose(0.3, 0.15, 0.62);
        kneel(tp, 1);
        tt = baseTurtle(1.22, 0.5, -1.05);
        tt.headYaw = 0.35;
        const crunches = sfxBeats('crunch');
        if (b < 44) {
          const out = ramp(b, 40, 40.6, ease.outBack);
          let amount = 1;
          for (const cb of crunches) if (b >= cb) amount -= 0.25;
          const mouth = RIG.turtlePoint(tt, [0, 0.21, 0.55]);
          const target = RIG.trumpLocal(tp, v3.add(mouth, [-0.04, -0.02, 0.06]));
          tp.handL = v3.lerp([0.36, 1.0, 0.25], target, out);
          tp.elbowHint = [null, [0.5, -0.8, 0.2]];
          const hand = RIG.trumpPoint(tp, tp.handL);
          S.groups.push(RIG.lettuce(v3.add(hand, [0.05, 0.05, 0.03]), amount * out, m3.rz(-0.5)));
          let chomp = 0;
          for (const cb of crunches) chomp = Math.max(chomp, bump(b, cb - 0.12, cb, cb + 0.05, cb + 0.3));
          tt.mouthOpen = chomp; tt.headOffset = [0, 0, 0.06 * out];
          tt.blink = b > 42.7 ? 1 : 0;
          for (const cb of crunches) {
            if (b > cb && b < cb + 0.8) {
              const f = (b - cb) / 0.8;
              for (let i = 0; i < 3; i++)
                S.fx.push({ type: 'crumb', pos: v3.add(mouth, [0.05 + i * 0.05 + f * 0.1 * (i - 1), 0.05 - f * f * 0.35, 0.12]), size: 0.03, a: 1 - f });
            }
          }
          if (b > 43) S.fx.push({ type: 'note', pos: RIG.turtlePoint(tt, [0, 0.65 + 0.2 * ramp(b, 43, 44), 0.3]), size: 0.18, a: bump(b, 43, 43.2, 43.8, 44) });
        } else {
          // the hat: hand lifts it over the head, drops it on at beat 45 (ding!)
          const headTop = RIG.turtlePoint(tt, [0, 0.33, 0.43]);
          const p0 = v3.add(headTop, [-0.05, 0.25, 0.05]);
          const hatPos = b < 45 ? v3.lerp(v3.add(p0, [-0.25, -0.2, 0.1]), p0, ramp(b, 44, 44.6)) : headTop;
          tt.hat = b >= 45;
          if (b < 45) {
            const hp = v3.add(hatPos, [0, -0.03 + (b > 44.7 ? -0.25 * ramp(b, 44.7, 45, ease.in) : 0), 0]);
            S.groups.push(RIG.looseHat(hp, m3.ry(tt.yaw + 0.35)));
          }
          const reach = b < 45.6 ? 1 : 1 - ramp(b, 45.6, 46.2);
          tp.handL = v3.lerp([0.36, 1.0, 0.2], RIG.trumpLocal(tp, v3.add(b < 45 ? hatPos : headTop, [-0.02, 0.06, 0.02])), reach);
          tp.elbowHint = [null, [0.5, -0.6, 0.1]];
          if (b > 45) {
            const s = ramp(b, 45, 45.3, ease.outBack) * (1 - ramp(b, 46.6, 47.2));
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * PI * 2;
              S.fx.push(sparkle(v3.add(headTop, [Math.cos(a) * 0.32 * s, 0.12 + Math.sin(a) * 0.28 * s, 0.15]), 0.06 * s, s, a));
            }
            tt.squash = 1 + 0.12 * Math.sin(clamp((b - 45) / 0.5) * PI) * (1 - ramp(b, 45.5, 46));
          }
          if (b > 46) thumbs(tp, bump(b, 46, 46.3, 47.6, 47.9)), (tp.handShapeL = b > 46.2 && b < 47.7 ? 'thumb' : 'open');
          tt.smile = 1;
          tt.mouthOpen = b > 45 ? 0.45 * bump(b, 45, 45.2, 46.5, 47) : 0;
        }
        tp.headYaw = 0.25; tp.headPitch = 0.12; tp.smile = 1;
        cam = { tx: keys(b, [[40, 0.8], [48, 0.86]]), ty: keys(b, [[40, 0.74], [48, 0.76]]), h: keys(b, [[40, 2.4], [48, 2.5]]), elev: 0.08, orbit: 0, roll: 0 };
      } else {
        // press conference on the lawn
        S.groups.push(RIG.podium([0, 0, 0.3]));
        S.groups.push(RIG.standFlag([-1.4, 0, -0.65], b * 1.3));
        S.groups.push(RIG.standFlag([1.05, 0, -0.65], b * 1.3 + 1));
        tp = basePose(-0.05, -0.15, 0.05);
        sing(tp, b);
        tp.smile = 0.8;
        const g1 = bump(b, 48, 48.3, 49.8, 50.1), g2 = bump(b, 49.9, 50.2, 51.8, 52.1), g3 = ramp(b, 52, 52.3);
        tp.handR = [-0.28, 1.2, 0.48];
        tp.handL = [0.28, 1.2, 0.48];
        tp.handL = v3.lerp(tp.handL, [0.36, 1.42, 0.5], g1);
        tp.handL = v3.lerp(tp.handL, [0.62, 1.5, 0.4], g2);
        tp.handR = v3.lerp(tp.handR, [-0.62, 1.5, 0.4], g2);
        tp.handL = v3.lerp(tp.handL, [0.5, 1.48, 0.55], g3);
        if (g3 > 0.5) { tp.handShapeL = 'point'; tp.pointDir = [null, [1, 0.1, 0.35]]; }
        tp.elbowHint = [[-1, -0.6, -0.3], [1, -0.6, -0.3]];
        tp.headYaw = 0.25 * Math.sin(b * PI * 0.5) + 0.2 * g3; tp.browRaise = g2;
        tt = baseTurtle(0.27, 0.34, -0.55);
        tt.pos = [0.25, 1.165, 0.3];
        tt.hat = true; tt.headYaw = 0.55;
        tt.waveL = ramp(b, 52.2, 52.6) * (0.7 + 0.3 * Math.sin(b * PI * 4));
        tt.mouthOpen = 0.35 * g3;
        for (const fb of sfxBeats('camera')) {
          if (b >= fb && b < fb + 0.6) {
            const f = (b - fb) / 0.6;
            S.fx.push({ type: 'flash', strength: (1 - f) * (1 - f) * 0.6, x: hash(fb * 10, 1), y: 0.25 + 0.5 * hash(fb * 10, 2) });
          }
        }
        cam = { tx: 0.1, ty: keys(b, [[48, 1.42], [56, 1.38]]), h: keys(b, [[48, 2.3], [56, 2.15]]), elev: 0.25, orbit: 0, roll: 0 };
      }
    }
    // ---------------- CHORUS 2: 56-72 ----------------
    else if (b < 72) {
      if (b < 64) {
        // turtle parade with Trump as drum major
        const base = -3.3 + (b - 56) * 0.36;
        for (let i = 0; i < 5; i++) {
          const x = base + i * 0.82;
          const tx = baseTurtle(x, 0.45, PI / 2 - 0.25);
          tx.scale = 0.8; tx.hat = true; tx.walk = b * PI * 2 + i; tx.walkAmt = 1;
          tx.squash = 1 + 0.05 * Math.sin(b * PI * 2 + i); tx.headYaw = 0.3 * Math.sin(b * PI + i);
          tx.blink = blinkAt(b, i + 10);
          extras.push(tx);
        }
        tt = baseTurtle(base + 5 * 0.82 + 0.2, 0.45, PI / 2 - 0.35);
        tt.hat = true; tt.walk = b * PI * 2; tt.walkAmt = 1; tt.headYaw = 0.45; tt.squash = 1 + 0.06 * Math.sin(b * PI * 2);
        tp = basePose(base + 2.1, -0.4, 0.75);
        march(tp, b * PI);
        tp.handR = [-0.36, 2.02 + 0.06 * Math.sin(b * PI), 0.18];
        tp.elbowHint = [[-1, -0.3, 0], [1, -0.5, -0.5]];
        tp.handL = [0.33, 1.05, -0.08];
        sing(tp, b);
        tp.smile = 1; tp.headYaw = -0.55;
        const hand = RIG.trumpPoint(tp, tp.handR);
        S.groups.push(RIG.baton(v3.add(hand, [0, 0.12, 0.05]), b * PI * 0.75));
        for (let i = 0; i < 4; i++) {
          const ph = (b * 0.45 + i / 4) % 1;
          S.fx.push({ type: 'note', pos: [base + i * 1.4 + 0.4, 1.0 + ph * 1.7, 0.6], size: 0.2, a: Math.sin(ph * PI) });
        }
        cam = { tx: keys(b, [[56, -0.6], [64, 1.9]], ease.linear), ty: 1.05, h: 3.3, elev: 0.55, orbit: 0, roll: 0 };
      } else {
        // fireworks at night
        S.sky = SKIES.night; S.night = true;
        tp = basePose(-0.1, 0.4, 0.12);
        tt = baseTurtle(0, 0, 0);
        tt.hat = true; tt.headYaw = 0.25; tt.scale = 0.85; tt.noShadow = true;
        sing(tp, b); tp.smile = 1;
        if (b < 66.5) {
          const k = ramp(b, 64, 64.4);
          tp.handL = v3.lerp(tp.handL, [0.42, 2.0, 0.25], k); tp.handShapeL = 'point'; tp.pointDir = [null, [0.2, 1, 0.1]];
          tp.headPitch = -0.3 * k; tt.headPitch = -0.45 * k;
        } else if (b < 68) {
          tt.headPitch = -0.2;
          tp.handL = [0.25, 1.25, 0.35]; tp.handR = [-0.25, 1.25, 0.35]; // clap
          const c = Math.abs(Math.sin(b * PI * 2));
          tp.handL = [0.06 + 0.16 * c, 1.32, 0.38]; tp.handR = [-0.06 - 0.16 * c, 1.32, 0.38];
          tp.elbowHint = [[-1, -0.5, -0.3], [1, -0.5, -0.3]];
        } else if (b < 70) {
          thumbs(tp, ramp(b, 68, 68.3));
        } else {
          const k = ramp(b, 70, 70.4, ease.outBack);
          tp.handL = v3.lerp([0.37, 0.93, 0.08], [0.72, 1.7, 0.2], k); tp.handR = v3.lerp([-0.37, 0.93, 0.08], [-0.72, 1.7, 0.2], k);
          tt.waveL = tt.waveR = k;
        }
        tt.squash = 1 + 0.06 * Math.sin(b * PI * 2);
        // the turtle rides on Trump's shoulder to watch the show
        tt.pos = RIG.trumpPoint(tp, [-0.31, 1.535, -0.03]);
        tt.yaw = tp.yaw - 0.3;
        // fireworks: launch trail, then the burst on the "bang" beat
        const bangs = sfxBeats('firework_bang'), launches = sfxBeats('firework_launch');
        const cols = ['#FF4D5E', '#FFFFFF', '#5AA9FF', '#FFD24A', '#6CFF7A'];
        bangs.forEach((bb, i) => {
          const pos = [[-3.6, 4.6, -10], [3.4, 5.3, -10], [-0.8, 5.9, -11], [4.6, 4.2, -9], [0.4, 4.9, -9]][i];
          const lb = launches[i] ?? bb - 0.5;
          if (b >= lb && b < bb) S.fx.push({ type: 'trail', from: [pos[0] * 0.8, 1, pos[2]], to: pos, f: (b - lb) / (bb - lb) });
          if (b >= bb && b < bb + 2.2) {
            const f = (b - bb) / 2.2;
            S.fx.push({ type: 'firework', pos, r: (i === 4 ? 2.6 : 2.0) * ease.out(Math.min(1, f * 1.6)), col: cols[i], a: 1 - f * f, f, shape: i === 4 ? 'turtle' : 'ball', seed: i });
          }
        });
        if (b > 68) for (let i = 0; i < 26; i++) {
          const ph = ((b - 68) * 0.28 + hash(i, 3)) % 1;
          S.fx.push({ type: 'confetti', pos: [-3 + 6 * hash(i, 4) + Math.sin(b + i) * 0.2, 4.2 - ph * 4.4, 0.8], size: 0.06, a: 1, rot: b * 3 + i, col: cols[i % 5] });
        }
        cam = { tx: 0.08, ty: keys(b, [[64, 1.35], [72, 1.25]]), h: keys(b, [[64, 3.5], [72, 3.3]]), elev: -0.45, orbit: 0, roll: 0 };
      }
    }
    // ---------------- OUTRO: 72-80 ----------------
    else {
      S.sky = SKIES.sunset;
      S.groups.push(RIG.bench([2.0, 0, 0.55]));
      tp = basePose(1.62, 0.6, 0.18);
      sit(tp);
      tp.handR = [-0.3, 0.62, 0.32];
      sing(tp, b, 0.7);
      tt = baseTurtle(2.42, 0.62, -0.75);
      tt.pos = [2.42, 0.495, 0.62];
      tt.hat = true; tt.headYaw = 0.5;
      // pats on the shell
      const shell = RIG.turtlePoint(tt, [0.0, 0.36, -0.02]);
      let pat = 0;
      for (const pb of [73, 74, 75]) pat = Math.max(pat, bump(b, pb - 0.3, pb, pb + 0.05, pb + 0.35));
      const onShell = b < 76.2 ? ramp(b, 72, 72.5) : 1 - ramp(b, 76.2, 76.6);
      const tgt = RIG.trumpLocal(tp, v3.add(shell, [-0.02, 0.08 + 0.12 * (1 - pat), 0.02]));
      tp.handL = v3.lerp([0.36, 0.7, 0.25], tgt, onShell);
      tp.elbowHint = [null, [0.6, -0.5, 0.2]];
      tt.blink = Math.max(pat > 0.5 ? 1 : 0, blinkAt(b, 3));
      tt.roll = -0.12 * onShell; tt.headRoll = -0.15 * onShell;
      tp.headYaw = keys(b, [[72, 0.45], [75.5, 0.45], [76.3, 0]]);
      tp.headPitch = keys(b, [[72, 0.12], [75.5, 0.12], [76.3, 0]]);
      tt.headYaw = keys(b, [[72, 0.5], [75.6, 0.5], [76.4, 1.0]]);
      if (b > 76) {
        const k = ramp(b, 76, 76.4, ease.outBack);
        tp.handR = v3.lerp(tp.handR, [-0.36, 1.25, 0.42], k);
        tp.elbowHint = [[-0.9, -0.6, -0.2], null];
        if (k > 0.5) tp.handShapeR = 'thumb';
        tp.smile = 1;
      }
      if (b > 78.4) tt.wink = bump(b, 78.4, 78.55, 79.3, 79.5);
      const tHead = RIG.turtlePoint(tt, [0, 0.215, 0.43]);
      if (b > 78.5) S.fx.push(sparkle(v3.add(tHead, [0.06, 0.06, 0.15]), 0.07 * bump(b, 78.5, 78.7, 79.2, 79.4), 1, b * 4));
      for (let i = 0; i < 6; i++) {
        S.fx.push({ type: 'firefly', pos: [3.0 + 1.6 * hash(i, 6) + Math.sin(b * 0.7 + i) * 0.15, 0.3 + 0.9 * hash(i, 8) + Math.sin(b + i * 2) * 0.08, -0.6 - 1.4 * hash(i, 9)], size: 0.03, a: 0.4 + 0.4 * Math.sin(b * 2 + i * 3) });
      }
      const iris = ramp(b, 78.2, 79.4, ease.inOut);
      if (iris > 0) S.fx.push({ type: 'iris', pos: v3.add(tHead, [0, 0.05, 0]), r: 1 - iris });
      if (b > 79.2) S.fx.push({ type: 'theend', a: ramp(b, 79.2, 79.5) });
      if (b > 77) S.fx.push(heart(v3.lerp(RIG.trumpPoint(tp, [0, 2.15, 0]), RIG.turtlePoint(tt, [0, 0.75, 0.2]), 0.5), 0.26 * ramp(b, 77, 77.4, ease.outBack), 1 - ramp(b, 78.3, 78.6)));
      cam = { tx: keys(b, [[72, 2.02], [78, 2.08]]), ty: keys(b, [[72, 0.95], [78, 1.0]]), h: keys(b, [[72, 2.35], [78, 2.75]]), elev: 0.15, orbit: 0, roll: 0 };
    }

    // blinking for everyone unless explicitly set
    if (tp.blink === 0) tp.blink = blinkAt(b, 1);
    if (!tt.blink && !tt.wink) tt.blink = blinkAt(b, 2);
    if (tp.handShapeL === undefined) tp.handShapeL = 'open';

    // ---------------- assemble groups ----------------
    S.groups.unshift(RIG.whiteHouse(S.night));
    [[-17, -23, 1.25, 1], [16.5, -22, 1.3, 2], [-9.5, -15, 1.0, 3], [10.5, -16, 1.05, 4], [-6.8, -9.5, 0.85, 5], [7.4, -10.5, 0.8, 6]]
      .forEach(([x, z, s, seed]) => S.groups.push(RIG.tree([x, 0, z], s, seed)));
    S.groups.push(RIG.pondDecor(S.pond.c));
    const T = RIG.trump(tp);
    const TT = RIG.turtle(tt);
    S.groups.push(T, TT);
    extras.forEach((e) => S.groups.push(RIG.turtle(e)));
    S.trump = T; S.turtle = TT; S.tp = tp; S.tt = tt;
    // soft contact shadows (2D draws them on the ground; 3D casts real ones)
    S.shadows = [{ c: [tp.pos[0], tp.hipDrop > 0.3 && b >= 72 ? 0.5 : 0, tp.pos[2]], rx: 0.45, rz: 0.3, a: 1 }];
    [tt, ...extras].forEach((e) => {
      if (e.noShadow) return;
      const lifted = e === tt && b >= 24 && b < 32.2;
      const y = lifted ? 0 : e.pos[1];
      const sc = (e.scale || 1) * (lifted ? 0.6 : 1);
      S.shadows.push({ c: [e.pos[0], y + 0.003, e.pos[2]], rx: 0.33 * sc, rz: 0.4 * sc, a: lifted ? 0.4 : 1 });
    });
    S.cam = cam;
    return S;
  }

  return { scene, lipsync, SKIES, SPB };
})();
