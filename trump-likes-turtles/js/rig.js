// Character + prop puppets built from simple 3D primitives.
// Both renderers consume the same primitives: the 2D renderer projects them to
// flat shapes, the 3D renderer ray-marches them as signed distance fields.
//
// Primitive kinds:
//   sph {c, r}                 sphere
//   ell {c, rad:[x,y,z], R}    ellipsoid (R = 3x3 local->world rotation)
//   cap {a, b, ra, rb}         capsule / rounded cone
//   box {c, h:[x,y,z], R, rr}  rounded box
//   cyl {c, r, hh, R}          cylinder along local Y
// Common fields: mat (material key), k (smooth-blend radius for 3D),
// bias (2D draw-order nudge toward the camera), chain (2D limb merging),
// only2d / only3d, deco (thin 2D outline).
window.RIG = (() => {
  const { v3, m3, ik, lerp, clamp } = U;

  const MATS = {
    skin: '#F2A766', skinLight: '#F8CC9C', hair: '#F7CF4F', suit: '#22305A', suitDark: '#18213F', shirt: '#F7F7F2',
    tie: '#D9262E', shoe: '#1B1B1E', eyeDark: '#2A1B12', brow: '#F4E2A6', mouth: '#7A1E22',
    white: '#FFFFFF', black: '#141414',
    shell: '#3E9442', shellDark: '#2A6B30', shellRim: '#A5C95A', tSkin: '#86C96E',
    belly: '#F1E2A2', blush: '#F59AA8', hat: '#E2363C',
    lettuce: '#A2D95C', lettuceVein: '#E9F8CC',
    wood: '#8A5A2E', woodDark: '#5E3B1C', podium: '#5A3A1E', seal: '#E2B94A',
    metal: '#B9BEC6', metalDark: '#6B7078',
    flag: '#B22234', wh: '#F3F0E8', whShade: '#D8D2C4', whWindow: '#55667F', whLit: '#FFD36E',
    trunk: '#6E4B2D', leaf: '#3F8A3C', leafDark: '#2F6B2E', reed: '#5C8C3A', cattail: '#6B4226',
    lily: '#4FA34A', lilyFlower: '#F7B6D2',
  };
  const MAT_KEYS = Object.keys(MATS);
  const MAT_INDEX = Object.fromEntries(MAT_KEYS.map((k, i) => [k, i]));

  // ---------- primitive constructors ----------
  const sph = (c, r, mat, o = {}) => ({ t: 'sph', c, r, mat, ...o });
  const ell = (c, rad, R, mat, o = {}) => ({ t: 'ell', c, rad, R, mat, ...o });
  const cap = (a, b, ra, rb, mat, o = {}) => ({ t: 'cap', a, b, ra, rb: rb ?? ra, mat, ...o });
  const box = (c, h, R, rr, mat, o = {}) => ({ t: 'box', c, h, R, rr, mat, ...o });
  const cyl = (c, r, hh, R, mat, o = {}) => ({ t: 'cyl', c, r, hh, R, mat, ...o });

  // A frame maps local points/rotations into world space.
  function frame(pos, R, s = 1) {
    return {
      p: (l) => v3.add(pos, m3.ap(R, v3.mul(l, s))),
      R,
      s,
    };
  }
  const rotYXZ = (yaw = 0, pitch = 0, roll = 0) => m3.mul(m3.ry(yaw), m3.mul(m3.rx(pitch), m3.rz(roll)));

  // ======================= TRUMP =======================
  // Local space: feet on y=0, facing +z, +x is his left (screen right when facing camera).
  function trump(P) {
    const prims = [];
    const s = P.scale || 1;
    const Rb = rotYXZ(P.yaw || 0, P.pitch || 0, P.roll || 0);
    const F = frame(P.pos, Rb, s);
    let part = 'legs';
    const add = (q) => ((q.part = part), prims.push(q), q);

    const pelvis = [0, 0.88 - (P.hipDrop || 0) + (P.bob || 0), (P.hipZ || 0)];
    const Rup = m3.mul(m3.rx(P.lean || 0), m3.rz(P.tilt || 0));
    // Upper body is designed around a standard pelvis at (0, 0.88, 0).
    const UB = (p) => v3.add(pelvis, m3.ap(Rup, v3.sub(p, [0, 0.88, 0])));
    const RupW = m3.mul(Rb, Rup);
    const W = (p) => F.p(p);
    const WU = (p) => F.p(UB(p));

    // ---- legs (IK to foot targets in local space) ----
    const footT = [P.footR || [-0.13, 0.07, 0.02], P.footL || [0.13, 0.07, 0.02]];
    const kneeHint = [P.kneeHintR || [-0.15, 0, 1], P.kneeHintL || [0.15, 0, 1]];
    [-1, 1].forEach((side, i) => {
      const hip = v3.add(pelvis, [0.12 * side, -0.03, 0]);
      const { mid: knee, end: ankle } = ik(hip, footT[i], 0.43, 0.43, kneeHint[i]);
      const ch = 'leg' + i;
      add(cap(W(hip), W(knee), 0.095 * s, 0.085 * s, 'suit', { chain: ch, bias: -0.06, k: 0.04 }));
      add(cap(W(knee), W(ankle), 0.085 * s, 0.075 * s, 'suit', { chain: ch, bias: -0.06, k: 0.04 }));
      const fwd = P.footDir ? P.footDir[i] : [0, 0, 1];
      const toe = v3.add(ankle, v3.mul(fwd, 0.07));
      add(ell(W([toe[0], Math.max(0.045, toe[1] - 0.025), toe[2]]), [0.075 * s, 0.05 * s, 0.14 * s],
        m3.mul(Rb, m3.ry(Math.atan2(fwd[0], fwd[2]))), 'shoe', { bias: -0.03, k: 0.02 }));
    });

    // ---- torso ----
    part = 'body';
    add(ell(WU([0, 1.17, 0]), [0.32 * s, 0.43 * s, 0.24 * s], RupW, 'suit', { k: 0.06 }));
    add(box(WU([0, 1.45, -0.01]), [0.27 * s, 0.07 * s, 0.13 * s], RupW, 0.08 * s, 'suit', { k: 0.06, bias: 0.01 }));
    // shirt V, tie, lapels
    add(ell(WU([0, 1.47, 0.17]), [0.085 * s, 0.1 * s, 0.035 * s], RupW, 'shirt', { bias: 0.03, k: 0.01 }));
    add(ell(WU([0, 1.5, 0.205]), [0.036 * s, 0.03 * s, 0.022 * s], RupW, 'tie', { bias: 0.06, k: 0.005 }));
    add(box(WU([0, 1.21, 0.235]), [0.045 * s, 0.27 * s, 0.014 * s],
      m3.mul(RupW, m3.rx(-0.08)), 0.012 * s, 'tie', { bias: 0.05, k: 0.005 }));
    add(cap(WU([0.1, 1.53, 0.16]), WU([0.035, 1.24, 0.22]), 0.028 * s, 0.022 * s, 'suitDark', { bias: 0.055, k: 0.005 }));
    add(cap(WU([-0.1, 1.53, 0.16]), WU([-0.035, 1.24, 0.22]), 0.028 * s, 0.022 * s, 'suitDark', { bias: 0.055, k: 0.005 }));

    // ---- arms (IK to hand targets in upper-body local space) ----
    const handT = [P.handR || [-0.36, 0.95, 0.06], P.handL || [0.36, 0.95, 0.06]];
    const shapes = [P.handShapeR || 'open', P.handShapeL || 'open'];
    const hands = [];
    [-1, 1].forEach((side, i) => {
      const sh = [0.34 * side, 1.45, 0];
      const hint = (P.elbowHint && P.elbowHint[i]) || [0.6 * side, -0.4, -0.7];
      const { mid: el, end: wr } = ik(sh, handT[i], 0.31, 0.31, hint);
      const ch = 'arm' + i;
      part = ch;
      const armBias = P.armsBehind && P.armsBehind[i] ? -0.12 : 0.06;
      add(cap(WU(sh), WU(el), 0.083 * s, 0.075 * s, 'suit', { chain: ch, bias: armBias, k: 0.04 }));
      add(cap(WU(el), WU(wr), 0.075 * s, 0.066 * s, 'suit', { chain: ch, bias: armBias, k: 0.04 }));
      const dir = v3.norm(v3.sub(wr, el));
      const hc = v3.add(wr, v3.mul(dir, 0.055));
      const hp = { bias: armBias + 0.01, k: 0.02, hand: i };
      add(sph(WU(hc), 0.072 * s, 'skin', hp));
      add(cap(WU(v3.add(wr, v3.mul(dir, -0.02))), WU(v3.add(wr, v3.mul(dir, -0.04))), 0.07 * s, 0.07 * s, 'shirt', { ...hp, bias: armBias + 0.005 }));
      if (shapes[i] === 'thumb') {
        const up = (P.thumbDir && P.thumbDir[i]) || [0, 1, 0.15];
        add(cap(WU(hc), WU(v3.add(hc, v3.mul(v3.norm(up), 0.1))), 0.028 * s, 0.024 * s, 'skin', { ...hp, bias: armBias + 0.02 }));
      } else if (shapes[i] === 'point') {
        const pd = (P.pointDir && P.pointDir[i]) || dir;
        add(cap(WU(hc), WU(v3.add(hc, v3.mul(v3.norm(pd), 0.12))), 0.024 * s, 0.02 * s, 'skin', { ...hp, bias: armBias + 0.02 }));
      }
      hands.push({ wrist: WU(wr), center: WU(hc), dir: m3.ap(RupW, dir) });
    });

    // ---- head ----
    part = 'head';
    add(cap(WU([0, 1.5, 0.0]), WU([0, 1.63, 0.01]), 0.085 * s, 0.08 * s, 'skin', { bias: -0.04, k: 0.03 }));
    const headC = [0, 1.77, 0.02];
    const Rh = m3.mul(m3.ry(P.headYaw || 0), m3.mul(m3.rx(P.headPitch || 0), m3.rz(P.headRoll || 0)));
    const RhW = m3.mul(RupW, Rh);
    const H = (v) => WU(v3.add(headC, m3.ap(Rh, v)));
    const HR = (R) => m3.mul(RhW, R || m3.id());
    add(ell(H([0, 0, 0]), [0.158 * s, 0.188 * s, 0.165 * s], HR(), 'skin', { k: 0.03 }));
    // full jowls peeking out under the face
    add(ell(H([0, -0.122, 0.035]), [0.122 * s, 0.074 * s, 0.12 * s], HR(), 'skin', { k: 0.04, bias: -0.012, soft: 1 }));
    // ears
    add(ell(H([0.158, -0.01, -0.01]), [0.028 * s, 0.05 * s, 0.032 * s], HR(), 'skin', { k: 0.015, bias: -0.01 }));
    add(ell(H([-0.158, -0.01, -0.01]), [0.028 * s, 0.05 * s, 0.032 * s], HR(), 'skin', { k: 0.015, bias: -0.01 }));
    // nose
    add(ell(H([0, -0.015, 0.16]), [0.03 * s, 0.042 * s, 0.035 * s], HR(m3.rx(-0.2)), 'skin', { k: 0.015, bias: 0.04, deco: 1 }));
    // eyes: small and squinty, white brows
    const blink = clamp(P.blink || 0);
    const eyeH = lerp(0.014, 0.003, blink) * (1 + 0.6 * (P.eyesWide || 0));
    [-1, 1].forEach((sd) => {
      add(ell(H([0.058 * sd, 0.028, 0.142]), [0.042 * s, 0.026 * s, 0.014 * s], HR(m3.ry(0.35 * sd)), 'skinLight', { k: 0, bias: 0.035, soft: 1 }));
      add(ell(H([0.058 * sd, 0.03, 0.148]), [0.024 * s, eyeH * s, 0.012 * s], HR(m3.ry(0.35 * sd)), 'eyeDark', { k: 0, bias: 0.05, deco: 1 }));
      const br = (P.browRaise || 0) * 0.025;
      add(cap(H([0.025 * sd, 0.068 + br, 0.158]), H([0.095 * sd, 0.062 + br * 1.3, 0.135]), 0.014 * s, 0.012 * s, 'brow', { k: 0, bias: 0.06, deco: 1 }));
    });
    // mouth: open "O" (singing), smile, or flat
    const mo = clamp(P.mouthOpen || 0), round = clamp(P.mouthRound || 0);
    if (mo > 0.05) {
      const w = lerp(0.05, 0.03, round), h = lerp(0.012, 0.04, mo) * lerp(1, 1.15, round);
      add(ell(H([0, -0.095, 0.15]), [w * s, h * s, 0.03 * s], HR(m3.rx(-0.25)), 'mouth', { k: 0, bias: 0.05, deco: 1 }));
    } else {
      const sm = P.smile ?? 0.6;
      const arc = [];
      for (let i = 0; i <= 4; i++) {
        const a = -0.75 + (1.5 * i) / 4;
        arc.push(H([Math.sin(a) * 0.05, -0.1 + (1 - Math.cos(a)) * 0.05 * sm, 0.135 + Math.cos(a) * 0.024]));
      }
      for (let i = 0; i < 4; i++) add(cap(arc[i], arc[i + 1], 0.0105 * s, 0.0105 * s, 'mouth', { k: 0, bias: 0.05, deco: 1, chain: 'mouth' }));
    }
    // hair: back/top volume, side wings, and the famous forward swoop
    add(ell(H([0, 0.1, -0.045]), [0.192 * s, 0.14 * s, 0.182 * s], HR(m3.rx(0.25)), 'hair', { k: 0.03, bias: -0.005 }));
    add(ell(H([0.15, 0.035, -0.025]), [0.055 * s, 0.09 * s, 0.13 * s], HR(m3.rz(0.15)), 'hair', { k: 0.03, bias: -0.002 }));
    add(ell(H([-0.15, 0.035, -0.025]), [0.055 * s, 0.09 * s, 0.13 * s], HR(m3.rz(-0.15)), 'hair', { k: 0.03, bias: -0.002 }));
    add(ell(H([-0.03, 0.2, 0.0]), [0.15 * s, 0.065 * s, 0.14 * s], HR(m3.rz(0.08)), 'hair', { k: 0.03, bias: 0.0 }));
    add(ell(H([0.02, 0.145, 0.09]), [0.19 * s, 0.075 * s, 0.115 * s], HR(m3.mul(m3.rx(-0.32), m3.rz(-0.12))), 'hair', { k: 0.03, bias: 0.07 }));
    add(ell(H([0.115, 0.125, 0.14]), [0.09 * s, 0.055 * s, 0.065 * s], HR(m3.mul(m3.rx(-0.5), m3.rz(-0.45))), 'hair', { k: 0.02, bias: 0.075 }));

    return { name: 'trump', prims, hands, head: H([0, 0, 0]), top: H([0, 0.3, 0]) };
  }

  // ======================= TURTLE =======================
  // Local space: belly near y=0.04, facing +z.
  function turtle(P) {
    const prims = [];
    const s = P.scale || 1;
    const sq = P.squash || 1; // >1 stretch tall, <1 squash
    const Rb = rotYXZ(P.yaw || 0, P.pitch || 0, P.roll || 0);
    const Sq = (l) => [l[0] / Math.sqrt(sq), l[1] * sq, l[2] / Math.sqrt(sq)];
    const F = frame(P.pos, Rb, s);
    const W = (l) => F.p(Sq(l));
    const Rr = (R) => m3.mul(Rb, R || m3.id());
    let part = 'shell';
    const add = (q) => ((q.part = part), prims.push(q), q);
    const S = (r) => r * s;

    // shell
    add(ell(W([0, 0.12, 0]), [S(0.255), S(0.055), S(0.315)], Rr(), 'shellRim', { k: 0.02 }));
    add(ell(W([0, 0.155, -0.005]), [S(0.225), S(0.175), S(0.285)], Rr(), 'shell', { k: 0.02, bias: 0.005 }));
    add(ell(W([0, 0.085, 0]), [S(0.2), S(0.055), S(0.26)], Rr(), 'belly', { k: 0.02, bias: -0.01 }));
    // scutes (raised plates)
    const scutes = [[0, 0.325, -0.01, 0.085, 0.1], [0, 0.29, 0.155, 0.07, 0.06], [0, 0.29, -0.17, 0.07, 0.06],
      [0.13, 0.27, 0.06, 0.055, 0.075], [-0.13, 0.27, 0.06, 0.055, 0.075], [0.13, 0.27, -0.09, 0.055, 0.075], [-0.13, 0.27, -0.09, 0.055, 0.075]];
    for (const [x, y, z, rx, rz] of scutes) {
      const n = v3.norm([x / 0.225, (y - 0.155) / 0.175, z / 0.285]);
      const R = m3.alignY(n);
      add(ell(W([x, y - 0.012, z]), [S(rx), S(0.025), S(rz)], Rr(R), 'shellDark', { k: 0.004, bias: 0.03, deco: 1 }));
    }
    // legs
    const walk = P.walk || 0;
    const legs = [[0.19, 0.17, 0], [-0.19, 0.17, Math.PI], [0.18, -0.17, Math.PI], [-0.18, -0.17, 0]];
    legs.forEach(([x, z, ph], i) => {
      let lift = P.walkAmt ? Math.max(0, Math.sin(walk + ph)) * 0.05 * P.walkAmt : 0;
      let fwd = P.walkAmt ? Math.cos(walk + ph) * 0.05 * P.walkAmt : 0;
      let c = [x * 1.02, 0.06 + lift, z + fwd];
      let R = m3.rz(0.4 * Math.sign(x));
      if (i === 0 && P.waveL) { // front-left flipper raised (wave / handshake)
        c = v3.lerp(c, [0.27, 0.2 + 0.05 * Math.sin(P.waveL * 6), 0.24], clamp(P.waveL));
        R = m3.mul(m3.rz(1.0), m3.rx(-0.6));
      }
      if (i === 1 && P.waveR) {
        c = v3.lerp(c, [-0.27, 0.2 + 0.05 * Math.sin(P.waveR * 6), 0.24], clamp(P.waveR));
        R = m3.mul(m3.rz(-1.0), m3.rx(-0.6));
      }
      add(ell(W(c), [S(0.065), S(0.06), S(0.08)], Rr(R), 'tSkin', { k: 0.03, bias: -0.02 }));
    });
    add(ell(W([0, 0.085, -0.33]), [S(0.03), S(0.03), S(0.06)], Rr(m3.rx(0.4)), 'tSkin', { k: 0.02, bias: -0.03 }));

    // neck + head (extends out of the shell)
    part = 'head';
    const ext = clamp(P.head ?? 1, 0, 1.3);
    const neckBase = [0, 0.13, 0.21];
    const hc = v3.add([0, lerp(0.13, 0.215, Math.min(ext, 1)), lerp(0.2, 0.43, ext)], P.headOffset || [0, 0, 0]);
    add(cap(W(neckBase), W(hc), S(0.065), S(0.06), 'tSkin', { k: 0.04, bias: 0.01 }));
    const Rh = m3.mul(m3.ry(P.headYaw || 0), m3.mul(m3.rx(P.headPitch || 0), m3.rz(P.headRoll || 0)));
    const H = (v) => W(v3.add(hc, m3.ap(Rh, v)));
    const HR = (R) => Rr(m3.mul(Rh, R || m3.id()));
    add(ell(H([0, 0, 0]), [S(0.105), S(0.095), S(0.11)], HR(), 'tSkin', { k: 0.03, bias: 0.02 }));
    // eyes
    [-1, 1].forEach((sd) => {
      const closed = sd > 0 ? Math.max(P.blink || 0, P.wink || 0) : P.blink || 0;
      if (closed > 0.6) {
        add(cap(H([0.03 * sd, 0.045, 0.095]), H([0.075 * sd, 0.04, 0.075]), S(0.009), S(0.009), 'black', { k: 0, bias: 0.05, deco: 1 }));
        return;
      }
      add(sph(H([0.048 * sd, 0.04, 0.072]), S(0.042), 'white', { k: 0.005, bias: 0.04, deco: 1 }));
      add(sph(H([0.052 * sd, 0.04, 0.102]), S(0.024), 'black', { k: 0, bias: 0.05, deco: 1 }));
      add(sph(H([0.058 * sd, 0.052, 0.12]), S(0.008), 'white', { k: 0, bias: 0.06, deco: 1, only2d: 1 }));
    });
    // cheeks
    [-1, 1].forEach((sd) => add(ell(H([0.07 * sd, -0.018, 0.075]), [S(0.022), S(0.014), S(0.01)],
      HR(m3.ry(0.7 * sd)), 'blush', { k: 0, bias: 0.035, soft: 1 })));
    // mouth
    const mo = clamp(P.mouthOpen || 0);
    if (mo > 0.05) {
      add(ell(H([0, -0.04, 0.09]), [S(0.04), S(0.012 + 0.025 * mo), S(0.02)], HR(m3.rx(-0.3)), 'mouth', { k: 0, bias: 0.05, deco: 1 }));
    } else {
      const sm = P.smile ?? 1;
      const arc = [];
      for (let i = 0; i <= 4; i++) {
        const a = -0.8 + (1.6 * i) / 4;
        arc.push(H([Math.sin(a) * 0.05, -0.03 - Math.cos(a) * 0.016 * sm - 0.004, 0.085 + Math.cos(a) * 0.02]));
      }
      for (let i = 0; i < 4; i++) add(cap(arc[i], arc[i + 1], S(0.0075), S(0.0075), 'black', { k: 0, bias: 0.05, deco: 1, chain: 'tm' }));
    }
    // tiny red hat
    if (P.hat) {
      add(ell(H([0, 0.09, -0.02]), [S(0.085), S(0.06), S(0.085)], HR(m3.rx(-0.15)), 'hat', { k: 0.008, bias: 0.06 }));
      add(ell(H([0, 0.088, 0.07]), [S(0.07), S(0.012), S(0.058)], HR(m3.rx(-0.38)), 'hat', { k: 0.008, bias: 0.065 }));
      add(sph(H([0, 0.152, -0.025]), S(0.014), 'hat', { k: 0.004, bias: 0.07 }));
    }
    return { name: 'turtle', prims, head: H([0, 0, 0]), top: W([0, 0.4, 0]), shellTop: W([0, 0.33, 0]) };
  }

  // ======================= PROPS =======================
  function whiteHouse(night) {
    const prims = [];
    const I = m3.id(), z0 = -28, front = -25;
    const win = night ? 'whLit' : 'whWindow';
    prims.push(box([0, 4, z0], [12, 4, 3], I, 0.05, 'wh', { k: 0.05 }));
    prims.push(box([0, 8.15, z0], [12.3, 0.2, 3.25], I, 0.05, 'whShade', { k: 0.02, bias: 0.1 }));
    prims.push(box([0, 8.62, z0], [11.8, 0.28, 2.9], I, 0.05, 'wh', { k: 0.02 }));
    prims.push(box([0, 1.05, front + 0.06], [12, 1.05, 0.08], I, 0.02, 'whShade', { k: 0.02, bias: 0.05 }));
    // curved south portico
    const n0 = prims.length;
    prims.push(cyl([0, 4.2, front], 2.3, 4.2, I, 'whShade', { k: 0.02, bias: 0.2 }));
    prims.push(cyl([0, 2.15, front], 3.5, 0.14, I, 'wh', { k: 0.02, bias: 0.4 }));
    prims.push(cyl([0, 7.95, front], 3.65, 0.26, I, 'wh', { k: 0.02, bias: 0.5 }));
    prims.push(cyl([0, 8.5, front], 3.45, 0.3, I, 'whShade', { k: 0.02, bias: 0.45 }));
    for (let i = 0; i < 6; i++) {
      const a = -1.25 + (2.5 * i) / 5;
      prims.push(cyl([3.15 * Math.sin(a), 5.05, front + 3.15 * Math.cos(a)], 0.24, 2.75, I, 'wh', { k: 0.0, bias: 0.6 }));
    }
    for (let i = n0; i < prims.length; i++) prims[i].part = 'portico';
    // portico doorway + windows
    const n1 = prims.length;
    prims.push(box([0, 3.45, front + 2.3], [0.55, 0.95, 0.05], I, 0.02, win, { k: 0, bias: 0.3, deco: 1 }));
    prims.push(box([0, 0.95, front + 2.3], [0.55, 0.8, 0.05], I, 0.02, win, { k: 0, bias: 0.3, deco: 1 }));
    for (const x of [4.6, 6.6, 8.6, 10.6]) {
      for (const sd of [-1, 1]) {
        prims.push(box([x * sd, 5.3, front + 0.05], [0.42, 0.85, 0.06], I, 0.02, win, { k: 0, bias: 0.1, deco: 1 }));
        prims.push(box([x * sd, 1.0, front + 0.15], [0.38, 0.6, 0.06], I, 0.02, win, { k: 0, bias: 0.1, deco: 1 }));
      }
    }
    for (let i = n1; i < prims.length; i++) prims[i].part = prims[i].c[0] < 0 ? 'winL' : 'winR';
    for (const sd of [-1, 1]) prims.push(box([7.2 * sd, 9.4, z0], [0.35, 0.55, 0.35], I, 0.04, 'whShade', { k: 0.02 }));
    // flag on the roof
    prims.push(cyl([0, 10.6, z0 + 1.5], 0.06, 1.8, I, 'metal', { k: 0 }));
    prims.push(box([0.85, 11.85, z0 + 1.5], [0.8, 0.45, 0.03], I, 0.01, 'flag', { k: 0, flag: 1 }));
    // shrink about the base center and push back: center moves from z=-28 to z=-32
    const k = 0.8, zc = -32;
    const T = (p) => [p[0] * k, p[1] * k, zc + (p[2] - z0) * k];
    for (const q of prims) {
      if (q.c) q.c = T(q.c);
      if (q.a) { q.a = T(q.a); q.b = T(q.b); q.ra *= k; q.rb *= k; }
      if (q.r) q.r *= k;
      if (q.h) q.h = q.h.map((x) => x * k);
      if (q.hh) q.hh *= k;
      if (q.rr) q.rr *= k;
      if (q.rad) q.rad = q.rad.map((x) => x * k);
    }
    return { name: 'whitehouse', prims, bg: 1 };
  }

  function tree(pos, sc = 1, seed = 0) {
    const prims = [];
    const I = m3.id();
    const [x, , z] = pos;
    prims.push(cap([x, 0, z], [x, 2.4 * sc, z], 0.32 * sc, 0.22 * sc, 'trunk', { k: 0.1 }));
    const blobs = [[0, 3.6, 0, 1.6], [-1.0, 3.0, 0.2, 1.15], [1.05, 3.1, 0.1, 1.2], [0.2, 4.6, -0.1, 1.15]];
    blobs.forEach(([bx, by, bz, r], i) =>
      prims.push(sph([x + bx * sc, by * sc, z + bz * sc], r * sc * (0.95 + 0.1 * U.hash(seed, i)), i % 2 ? 'leafDark' : 'leaf', { k: 0.3 })));
    return { name: 'tree', prims, bg: 1 };
  }

  function pondDecor(c) {
    const prims = [];
    const I = m3.id();
    const pads = [[-0.9, 0.25, 0.2], [0.4, -0.35, 0.17], [0.95, 0.3, 0.15], [-0.25, 0.55, 0.13], [1.25, -0.2, 0.12]];
    pads.forEach(([x, z, r], i) => {
      prims.push(cyl([c[0] + x, 0.012, c[2] + z], r, 0.012, m3.ry(i), 'lily', { k: 0, bias: 0.02, flat: 1 }));
      if (i === 1) prims.push(sph([c[0] + x + 0.03, 0.06, c[2] + z], 0.055, 'lilyFlower', { k: 0, bias: 0.05 }));
    });
    // reeds + cattails at the back edge
    for (let i = 0; i < 7; i++) {
      const x = c[0] + 0.9 + i * 0.13, z = c[2] - 0.75 + (i % 3) * 0.08;
      const h = 0.7 + 0.25 * U.hash(i, 9);
      const lean = (i - 3) * 0.04;
      prims.push(cap([x, 0, z], [x + lean, h, z], 0.014, 0.01, 'reed', { k: 0 }));
      if (i % 2 === 0) prims.push(cap([x + lean * 0.8, h - 0.2, z], [x + lean * 0.95, h - 0.04, z], 0.03, 0.03, 'cattail', { k: 0, bias: 0.01 }));
    }
    return { name: 'pond', prims };
  }

  function podium(pos) {
    const prims = [];
    const I = m3.id();
    const [x, , z] = pos;
    prims.push(box([x, 0.55, z], [0.33, 0.55, 0.2], I, 0.03, 'podium', { k: 0.01 }));
    prims.push(box([x, 1.12, z - 0.01], [0.38, 0.035, 0.25], m3.rx(0.12), 0.015, 'woodDark', { k: 0.01, bias: 0.02 }));
    prims.push(cyl([x, 0.72, z + 0.205], 0.17, 0.012, m3.rx(Math.PI / 2), 'seal', { k: 0, bias: 0.03, seal: 1 }));
    for (const sd of [-1, 1]) {
      prims.push(cap([x + 0.04 * sd, 1.13, z + 0.1], [x + 0.09 * sd, 1.36, z + 0.2], 0.011, 0.009, 'metalDark', { k: 0, bias: 0.04 }));
      prims.push(sph([x + 0.095 * sd, 1.38, z + 0.21], 0.032, 'black', { k: 0, bias: 0.045 }));
    }
    return { name: 'podium', prims };
  }

  function standFlag(pos, sway) {
    const prims = [];
    const [x, , z] = pos;
    prims.push(cyl([x, 1.25, z], 0.025, 1.25, m3.id(), 'metal', { k: 0 }));
    prims.push(sph([x, 2.53, z], 0.05, 'seal', { k: 0 }));
    prims.push(box([x + 0.33, 2.05, z], [0.32, 0.42, 0.02], m3.rz(0.05 * Math.sin(sway)), 0.01, 'flag', { k: 0, flag: 1, bias: 0.01 }));
    return { name: 'flag', prims };
  }

  function bench(pos) {
    const prims = [];
    const I = m3.id();
    const [x, , z] = pos;
    prims.push(box([x, 0.46, z], [0.85, 0.035, 0.2], I, 0.015, 'wood', { k: 0.0 }));
    prims.push(box([x, 0.78, z - 0.2], [0.85, 0.12, 0.025], m3.rx(-0.15), 0.015, 'wood', { k: 0.0, bias: -0.05 }));
    for (const sx of [-0.72, 0.72])
      for (const sz of [-0.15, 0.15])
        prims.push(box([x + sx, 0.22, z + sz], [0.03, 0.22, 0.03], I, 0.01, 'metalDark', { k: 0, bias: -0.02 }));
    return { name: 'bench', prims };
  }

  function lettuce(c, amount, R) {
    const prims = [];
    if (amount <= 0.02) return { name: 'lettuce', prims };
    const sc = 0.55 + 0.45 * amount;
    const leaves = [[0, 0, 0, 0], [-0.05, 0.02, 0.02, 0.6], [0.05, 0.02, -0.02, -0.6]];
    leaves.forEach(([x, y, z, a], i) => {
      if (i / leaves.length > amount + 0.15) return;
      const Rl = m3.mul(R || m3.id(), m3.rz(a));
      prims.push(ell(v3.add(c, m3.ap(R || m3.id(), [x * sc, y * sc, z])), [0.07 * sc, 0.11 * sc, 0.02], Rl, 'lettuce', { k: 0.01, bias: 0.08 + i * 0.002 }));
      prims.push(cap(v3.add(c, m3.ap(Rl, [0, -0.08 * sc, 0.021])), v3.add(c, m3.ap(Rl, [0, 0.08 * sc, 0.021])), 0.008, 0.005, 'lettuceVein', { k: 0, bias: 0.09 + i * 0.002, deco: 1 }));
    });
    return { name: 'lettuce', prims };
  }

  function baton(hand, angle) {
    const d = [Math.cos(angle) * 0.32, Math.sin(angle) * 0.32, 0.05];
    const a = v3.sub(hand, d), b = v3.add(hand, d);
    return {
      name: 'baton',
      prims: [cap(a, b, 0.016, 0.016, 'metal', { k: 0, bias: 0.1 }), sph(b, 0.045, 'white', { k: 0, bias: 0.11 }), sph(a, 0.03, 'metal', { k: 0, bias: 0.11 })],
    };
  }

  function looseHat(c, R) {
    const H = (v) => v3.add(c, m3.ap(R, v));
    return {
      name: 'hat',
      prims: [
        ell(H([0, 0, 0]), [0.088, 0.062, 0.088], R, 'hat', { k: 0.008, bias: 0.1 }),
        ell(H([0, -0.012, 0.088]), [0.075, 0.013, 0.065], m3.mul(R, m3.rx(-0.12)), 'hat', { k: 0.008, bias: 0.105 }),
        sph(H([0, 0.061, 0]), 0.014, 'hat', { k: 0.004, bias: 0.11 }),
      ],
    };
  }

  // Upper-body-local point of a Trump pose -> world (matches trump()'s WU mapping).
  function trumpPoint(P, l) {
    const s = P.scale || 1;
    const Rb = rotYXZ(P.yaw || 0, P.pitch || 0, P.roll || 0);
    const pelvis = [0, 0.88 - (P.hipDrop || 0) + (P.bob || 0), (P.hipZ || 0)];
    const Rup = m3.mul(m3.rx(P.lean || 0), m3.rz(P.tilt || 0));
    const ub = v3.add(pelvis, m3.ap(Rup, v3.sub(l, [0, 0.88, 0])));
    return v3.add(P.pos, m3.ap(Rb, v3.mul(ub, s)));
  }
  // World point -> Trump upper-body-local coordinates (inverse of trumpPoint).
  function trumpLocal(P, w) {
    const s = P.scale || 1;
    const Rb = rotYXZ(P.yaw || 0, P.pitch || 0, P.roll || 0);
    const RbT = [Rb[0], Rb[3], Rb[6], Rb[1], Rb[4], Rb[7], Rb[2], Rb[5], Rb[8]];
    const l = v3.mul(m3.ap(RbT, v3.sub(w, P.pos)), 1 / s);
    const pelvis = [0, 0.88 - (P.hipDrop || 0) + (P.bob || 0), (P.hipZ || 0)];
    const Rup = m3.mul(m3.rx(P.lean || 0), m3.rz(P.tilt || 0));
    const RupT = [Rup[0], Rup[3], Rup[6], Rup[1], Rup[4], Rup[7], Rup[2], Rup[5], Rup[8]];
    return v3.add(m3.ap(RupT, v3.sub(l, pelvis)), [0, 0.88, 0]);
  }
  // Turtle-local point -> world (matches turtle()'s W mapping).
  function turtlePoint(P, l) {
    const s = P.scale || 1, sq = P.squash || 1;
    const Rb = rotYXZ(P.yaw || 0, P.pitch || 0, P.roll || 0);
    return v3.add(P.pos, m3.ap(Rb, v3.mul([l[0] / Math.sqrt(sq), l[1] * sq, l[2] / Math.sqrt(sq)], s)));
  }

  return { MATS, MAT_KEYS, MAT_INDEX, trump, turtle, trumpPoint, trumpLocal, turtlePoint, whiteHouse, tree, pondDecor, podium, standFlag, bench, lettuce, baton, looseHat, rotYXZ };
})();
