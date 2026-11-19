'use strict';
// The arena: a basement converted into a toy-sized boxing ring.
// Layers use parallax factors: wall 0.55, back ropes 0.85, ring/characters 1.0, crowd 1.25.
const { createCanvas } = require('@napi-rs/canvas');
const { Sprite, spriteFor, paintFur } = require('./fur');
const U = require('./util');

const PAR = { wall: 0.55, ropes: 0.85, ring: 1, crowd: 1.25 };
const POS = { ted: { x: -440, y: 40 }, floppy: { x: 450, y: -78 }, couch: { x: 450, y: 42 } };

function applyLayer(ctx, cam, p) {
  const z = 1 + (cam.zoom - 1) * p;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(960 + (cam.sx || 0), 540 + (cam.sy || 0));
  ctx.rotate(cam.rot || 0);
  ctx.scale(z, z);
  ctx.translate(-cam.x * p, -cam.y * p);
}

// ---------------------------------------------------------------- wall
function paintWall() {
  const X0 = -1400, Y0 = -980, W = 2800, H = 1500;
  const s = new Sprite(X0, Y0, W, H, 1);
  const c = s.ctx;
  const R = U.rng(7);
  let g = c.createLinearGradient(0, Y0, 0, 0);
  g.addColorStop(0, '#15161d'); g.addColorStop(1, '#2a2c36');
  c.fillStyle = g; c.fillRect(X0, Y0, W, H);
  // cinder blocks
  const bw = 150, bh = 72;
  for (let row = 0; Y0 + row * bh < 0; row++) {
    const y = -bh * (row + 1);
    const off = row % 2 ? bw / 2 : 0;
    for (let x = X0 - bw + off; x < X0 + W; x += bw) {
      const v = (R() - 0.5) * 0.18;
      c.fillStyle = U.shade('#343744', v);
      c.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      g = c.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
      c.fillStyle = g; c.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      for (let k = 0; k < 40; k++) {
        c.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)';
        c.fillRect(x + 3 + R() * (bw - 8), y + 3 + R() * (bh - 8), 2, 2);
      }
    }
  }
  // water stains / grime
  for (let i = 0; i < 9; i++) {
    const x = X0 + R() * W, y = -700 + R() * 500, r = 80 + R() * 160;
    g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(10,8,5,0.28)'); g.addColorStop(1, 'rgba(10,8,5,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // old paint band
  c.fillStyle = 'rgba(120,40,40,0.18)'; c.fillRect(X0, -190, W, 26);
  // floor
  g = c.createLinearGradient(0, 0, 0, 520);
  g.addColorStop(0, '#1d1e24'); g.addColorStop(1, '#0d0d10');
  c.fillStyle = g; c.fillRect(X0, 0, W, 520);
  c.fillStyle = '#0c0c0f'; c.fillRect(X0, -6, W, 10);
  // pipes
  const pipe = (y, r, col) => {
    g = c.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, U.shade(col, 0.35)); g.addColorStop(0.4, col); g.addColorStop(1, U.shade(col, -0.6));
    c.fillStyle = g; c.fillRect(X0, y - r, W, r * 2);
    for (let x = X0 + 100; x < X0 + W; x += 420) { c.fillStyle = '#1a1a1e'; c.fillRect(x, y - r - 4, 18, r * 2 + 8); }
  };
  pipe(-900, 16, '#6e4a33');
  pipe(-855, 10, '#7d8088');
  g = c.createLinearGradient(-1230, 0, -1190, 0);
  g.addColorStop(0, '#2a2b30'); g.addColorStop(0.4, '#8a8d96'); g.addColorStop(1, '#202125');
  c.fillStyle = g; c.fillRect(-1230, -900, 40, 900);
  // ---- Bear's side: shelf with bottles, pennant, framed star
  c.fillStyle = '#3a2618'; c.fillRect(-1330, -430, 330, 16);
  c.fillStyle = '#24170e'; c.fillRect(-1320, -414, 12, 40); c.fillRect(-1022, -414, 12, 40);
  for (let i = 0; i < 7; i++) {
    const x = -1310 + i * 44 + R() * 8, h = 70 + R() * 30;
    c.fillStyle = ['#4a2510', '#1f4a24', '#5a3a12', '#3b1a0c'][i % 4];
    U.roundRect(c, x, -430 - h, 22, h, 6); c.fill();
    c.fillRect(x + 7, -430 - h - 22, 8, 26);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x + 4, -430 - h + 8, 3, h - 16);
  }
  // pennant
  c.save(); c.translate(-940, -440);
  c.fillStyle = '#7a1414'; c.beginPath(); c.moveTo(0, 0); c.lineTo(300, 46); c.lineTo(0, 92); c.closePath(); c.fill();
  c.fillStyle = '#e8dcc2'; c.fillRect(0, 0, 16, 92);
  c.fillStyle = '#efe4cc'; c.font = '34px Bungee'; c.textBaseline = 'middle'; c.fillText('BOSTON', 26, 47);
  c.restore();
  // framed picture: shooting star
  c.save(); c.translate(-1180, -720);
  c.fillStyle = '#5a3a1e'; c.fillRect(-8, -8, 196, 156);
  c.fillStyle = '#0f1430'; c.fillRect(0, 0, 180, 140);
  c.strokeStyle = 'rgba(255,220,140,0.85)'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 115); c.lineTo(120, 45); c.stroke();
  drawStar(c, 128, 40, 22, 9, '#ffd86b');
  c.restore();
  // ---- Rabbit's side: corkboard of unanswered letters, stairs, door light
  c.save(); c.translate(690, -470);
  c.fillStyle = '#5b3d22'; c.fillRect(-10, -10, 340, 230);
  c.fillStyle = '#a5784a'; c.fillRect(0, 0, 320, 210);
  for (let i = 0; i < 9; i++) {
    const x = 18 + (i % 3) * 100 + R() * 14, y = 14 + Math.floor(i / 3) * 64 + R() * 8;
    c.save(); c.translate(x + 40, y + 24); c.rotate((R() - 0.5) * 0.3);
    c.fillStyle = '#ece4d2'; c.fillRect(-40, -24, 80, 48);
    c.strokeStyle = 'rgba(120,100,80,0.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-40, -24); c.lineTo(0, 4); c.lineTo(40, -24); c.stroke();
    drawHeart(c, 22, 10, 7, '#c4344a');
    c.fillStyle = '#d11'; c.beginPath(); c.arc(0, -26, 4, 0, U.TAU); c.fill();
    c.restore();
  }
  c.restore();
  // stairs
  c.save();
  for (let i = 0; i < 12; i++) {
    const x = 1060 + i * 50, y = -i * 58;
    c.fillStyle = U.shade('#4a3524', -0.1 + (i % 2) * 0.05); c.fillRect(x, y - 58, 600, 14);
    c.fillStyle = '#21170f'; c.fillRect(x, y - 44, 600, 44);
  }
  c.strokeStyle = '#2d1f14'; c.lineWidth = 10; c.beginPath(); c.moveTo(1070, -170); c.lineTo(1660, -850); c.stroke();
  for (let i = 0; i < 11; i++) { const x = 1090 + i * 50; c.lineWidth = 5; c.beginPath(); c.moveTo(x, -i * 58 - 60); c.lineTo(x, -i * 58 - 196); c.stroke(); }
  c.restore();
  // door at the top of the stairs, warm light leaking under it
  c.fillStyle = '#120c08'; c.fillRect(1250, -980, 140, 290);
  c.fillStyle = 'rgba(255,200,120,0.9)'; c.fillRect(1250, -694, 140, 4);
  // shadow at floor line + corners
  g = c.createLinearGradient(0, -160, 0, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = g; c.fillRect(X0, -160, W, 160);
  g = c.createRadialGradient(0, -420, 300, 0, -420, 1500);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.7)');
  c.fillStyle = g; c.fillRect(X0, Y0, W, H);
  return s;
}

function drawStar(c, x, y, R, r, fill, stroke) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.stroke(); }
}
function drawHeart(c, x, y, s, fill) {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.4, x, y - s * 0.5);
  c.bezierCurveTo(x + s * 0.7, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
}

// ---------------------------------------------------------------- neon sign (wall layer coords)
function paintNeon(on) {
  const s = new Sprite(-760, -700, 1520, 330, 1);
  const c = s.ctx;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  // backing board
  if (!on) {
    c.fillStyle = 'rgba(10,10,14,0.55)'; U.roundRect(c, -640, -650, 1280, 200, 30); c.fill();
    c.strokeStyle = 'rgba(80,80,90,0.5)'; c.lineWidth = 4; c.stroke();
  }
  const word = (txt, x, size, col, font) => {
    c.font = `${size}px ${font}`;
    if (on) {
      c.shadowColor = col; c.shadowBlur = 40; c.lineWidth = 9; c.strokeStyle = U.rgba(col, 0.8); c.strokeText(txt, x, -550);
      c.shadowBlur = 18; c.lineWidth = 5; c.strokeStyle = col; c.strokeText(txt, x, -550);
      c.shadowBlur = 0; c.lineWidth = 2; c.strokeStyle = '#fff8f0'; c.strokeText(txt, x, -550);
    } else {
      c.lineWidth = 5; c.strokeStyle = U.shade(col, -0.65); c.strokeText(txt, x, -550);
    }
  };
  word('BEAR', -350, 124, '#ffad3b', 'Bungee');
  word('VS', 0, 104, '#ff3355', 'Anton');
  word('RABBIT', 365, 118, '#45e6ff', 'Bungee');
  return s;
}

// ---------------------------------------------------------------- ropes / posts (layer 0.85)
function paintRopes() {
  const s = new Sprite(-1500, -470, 3000, 400, 1);
  const c = s.ctx;
  const posts = [-1180, 1180];
  for (const [i, y] of [-370, -285, -200].entries()) {
    const col = ['#c4262e', '#e9e4dc', '#2346b8'][i];
    for (const sag of [0]) {
      c.lineCap = 'round';
      c.strokeStyle = U.shade(col, -0.55); c.lineWidth = 15;
      c.beginPath(); c.moveTo(posts[0], y); c.quadraticCurveTo(0, y + 26 + sag, posts[1], y); c.stroke();
      c.strokeStyle = col; c.lineWidth = 11;
      c.beginPath(); c.moveTo(posts[0], y - 1); c.quadraticCurveTo(0, y + 25 + sag, posts[1], y - 1); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(posts[0], y - 4); c.quadraticCurveTo(0, y + 21 + sag, posts[1], y - 4); c.stroke();
    }
  }
  for (const [k, x] of posts.entries()) {
    const g = c.createLinearGradient(x - 22, 0, x + 22, 0);
    g.addColorStop(0, '#2a2a2e'); g.addColorStop(0.45, '#9a9ca5'); g.addColorStop(1, '#1d1d21');
    c.fillStyle = g; c.fillRect(x - 20, -440, 40, 345);
    const pad = k === 0 ? '#b0262e' : '#2347c4';
    for (const y of [-370, -285, -200]) {
      const pg = c.createLinearGradient(x - 30, 0, x + 30, 0);
      pg.addColorStop(0, U.shade(pad, -0.5)); pg.addColorStop(0.4, U.shade(pad, 0.2)); pg.addColorStop(1, U.shade(pad, -0.6));
      c.fillStyle = pg; U.roundRect(c, x - 30, y - 30, 60, 60, 14); c.fill();
    }
  }
  return s;
}

// ---------------------------------------------------------------- ring mat (layer 1)
function paintMat() {
  const s = new Sprite(-2000, -150, 4000, 900, 1);
  const c = s.ctx;
  const R = U.rng(19);
  const path = () => { c.beginPath(); c.moveTo(-1200, -140); c.lineTo(1200, -140); c.lineTo(2000, 750); c.lineTo(-2000, 750); c.closePath(); };
  path();
  let g = c.createLinearGradient(0, -140, 0, 750);
  g.addColorStop(0, '#6f6a62'); g.addColorStop(0.25, '#aea69a'); g.addColorStop(1, '#c9c1b3');
  c.fillStyle = g; c.fill();
  c.save(); path(); c.clip();
  // canvas weave + scuffs
  for (let i = 0; i < 9000; i++) {
    const y = -140 + Math.pow(R(), 0.8) * 890, x = (R() - 0.5) * 4000;
    c.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    c.fillRect(x, y, 3 + R() * 6, 1.5);
  }
  for (let i = 0; i < 14; i++) {
    const x = (R() - 0.5) * 2600, y = -60 + R() * 700, r = 30 + R() * 90;
    g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(90,60,30,0.16)'); g.addColorStop(1, 'rgba(90,60,30,0)');
    c.save(); c.translate(x, y); c.scale(1, 0.35); c.translate(-x, -y);
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }
  // painted center logo in perspective
  c.save(); c.translate(0, 230); c.scale(1, 0.24);
  c.strokeStyle = 'rgba(150,30,40,0.45)'; c.lineWidth = 26; c.beginPath(); c.arc(0, 0, 520, 0, U.TAU); c.stroke();
  c.strokeStyle = 'rgba(30,50,150,0.4)'; c.lineWidth = 12; c.beginPath(); c.arc(0, 0, 470, 0, U.TAU); c.stroke();
  drawStar(c, 0, 0, 330, 140, 'rgba(160,120,40,0.28)');
  c.restore();
  // back edge darkness
  g = c.createLinearGradient(0, -140, 0, 40);
  g.addColorStop(0, 'rgba(0,0,0,0.65)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(-2000, -140, 4000, 180);
  c.restore();
  // apron edge
  c.strokeStyle = 'rgba(20,20,24,0.9)'; c.lineWidth = 6;
  c.beginPath(); c.moveTo(-1200, -140); c.lineTo(1200, -140); c.stroke();
  return s;
}

// ---------------------------------------------------------------- couch (layer 1, local coords around couch base)
function paintCouch() {
  const s = new Sprite(-300, -360, 600, 420, 2);
  const c = s.ctx;
  const R = U.rng(23);
  const fab = '#4c586a', fabD = '#222833', fabL = '#7f8ca0';
  const cushion = (x, y, w, h, r, light) => {
    U.roundRect(c, x, y, w, h, r);
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, U.shade(fab, light)); g.addColorStop(0.6, fab); g.addColorStop(1, fabD);
    c.fillStyle = g; c.fill();
    c.save(); U.roundRect(c, x, y, w, h, r); c.clip();
    for (let i = 0; i < w * h / 30; i++) { c.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)'; c.fillRect(x + R() * w, y + R() * h, 2, 2); }
    c.restore();
    c.strokeStyle = 'rgba(15,18,24,0.6)'; c.lineWidth = 3; U.roundRect(c, x, y, w, h, r); c.stroke();
  };
  // back
  cushion(-250, -330, 500, 230, 50, 0.18);
  // seat cushions
  cushion(-215, -120, 215, 95, 26, 0.1);
  cushion(0, -120, 215, 95, 26, 0.1);
  // base
  cushion(-250, -40, 500, 70, 16, -0.1);
  // arms
  cushion(-292, -215, 88, 245, 40, 0.22);
  cushion(204, -215, 88, 245, 40, 0.22);
  // worn patches + a stain
  c.fillStyle = 'rgba(160,150,120,0.25)'; c.beginPath(); c.ellipse(-150, -250, 40, 26, 0.3, 0, U.TAU); c.fill();
  c.fillStyle = 'rgba(70,45,20,0.35)'; c.beginPath(); c.ellipse(120, -80, 46, 14, 0, 0, U.TAU); c.fill();
  // duct tape repair
  c.save(); c.translate(-250, -150); c.rotate(-0.4); c.fillStyle = 'rgba(170,172,176,0.9)'; c.fillRect(-10, -12, 80, 24); c.restore();
  // legs
  c.fillStyle = '#2a1a10'; c.fillRect(-235, 28, 26, 26); c.fillRect(209, 28, 26, 26);
  return s;
}

// ---------------------------------------------------------------- floor clutter
function paintClutter() {
  const s = new Sprite(-1100, -140, 2200, 300, 1);
  const c = s.ctx;
  const bottle = (x, y, a) => {
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = '#4a220a'; U.roundRect(c, -40, -12, 64, 24, 10); c.fill();
    c.fillRect(20, -5, 30, 10);
    c.fillStyle = '#b12a26'; c.fillRect(-26, -12, 24, 24);
    c.fillStyle = 'rgba(255,230,190,0.35)'; c.fillRect(-36, -8, 56, 3);
    c.restore();
  };
  const can = (x, y, a, crushed) => {
    c.save(); c.translate(x, y); c.rotate(a);
    const g = c.createLinearGradient(0, -14, 0, 14);
    g.addColorStop(0, '#d9e2e8'); g.addColorStop(0.5, '#2a77b8'); g.addColorStop(1, '#0b2a4a');
    c.fillStyle = g;
    if (crushed) { c.beginPath(); c.moveTo(-26, -14); c.lineTo(-6, -8); c.lineTo(8, -15); c.lineTo(26, -12); c.lineTo(24, 12); c.lineTo(4, 7); c.lineTo(-10, 14); c.lineTo(-26, 12); c.closePath(); c.fill(); }
    else { U.roundRect(c, -26, -15, 52, 30, 5); c.fill(); }
    c.restore();
  };
  bottle(-760, 70, 0.2); bottle(-640, 110, -2.6); bottle(-230, 60, 0.9);
  can(160, 90, 0.3, true); can(230, 60, -0.5, false); can(770, 110, 2.2, true); can(820, 50, 0.1, true); can(110, 140, 1.4, true);
  return s;
}

// ---------------------------------------------------------------- crowd of toy silhouettes (layer 1.25)
const CROWD_TYPES = ['bear', 'bunny', 'robot', 'dino', 'doll', 'soldier', 'duck', 'alien', 'spiky', 'bear', 'clown', 'robot2', 'bunny', 'dino'];
function silhouette(c, type, R) {
  // shoulders
  c.beginPath(); c.ellipse(0, 150, 120, 90, 0, Math.PI, 0); c.lineTo(120, 300); c.lineTo(-120, 300); c.closePath(); c.fill();
  const head = (r, y = 30) => { c.beginPath(); c.arc(0, y, r, 0, U.TAU); c.fill(); };
  switch (type) {
    case 'bear': head(78); c.beginPath(); c.arc(-58, -32, 28, 0, U.TAU); c.arc(58, -32, 28, 0, U.TAU); c.fill(); break;
    case 'bunny': head(72); for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 30, -80, 20, 72, sx * 0.25, 0, U.TAU); c.fill(); } break;
    case 'robot': U.roundRect(c, -70, -40, 140, 130, 14); c.fill(); c.fillRect(-4, -90, 8, 50); c.beginPath(); c.arc(0, -94, 12, 0, U.TAU); c.fill(); break;
    case 'robot2': U.roundRect(c, -64, -30, 128, 110, 40); c.fill(); c.fillRect(-80, 0, 160, 26); break;
    case 'dino': c.beginPath(); c.ellipse(16, 30, 74, 60, -0.2, 0, U.TAU); c.fill(); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-60 + i * 28, -10 - i * 6); c.lineTo(-46 + i * 28, -50 - i * 6); c.lineTo(-30 + i * 28, -14 - i * 6); c.fill(); } break;
    case 'doll': head(66); for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 82, 40, 22, 48, sx * -0.3, 0, U.TAU); c.fill(); } break;
    case 'soldier': head(64, 40); c.beginPath(); c.ellipse(0, 6, 86, 52, 0, Math.PI, 0); c.fill(); c.fillRect(-92, 0, 184, 12); break;
    case 'duck': head(64); c.beginPath(); c.ellipse(70, 46, 46, 16, 0.1, 0, U.TAU); c.fill(); break;
    case 'alien': c.beginPath(); c.ellipse(0, 26, 70, 84, 0, 0, U.TAU); c.fill(); for (const sx of [-1, 1]) { c.lineWidth = 7; c.strokeStyle = c.fillStyle; c.beginPath(); c.moveTo(sx * 20, -50); c.lineTo(sx * 50, -110); c.stroke(); c.beginPath(); c.arc(sx * 52, -114, 12, 0, U.TAU); c.fill(); } break;
    case 'spiky': head(66, 40); for (let i = 0; i < 7; i++) { const a = -Math.PI + (i / 6) * Math.PI; c.beginPath(); c.moveTo(Math.cos(a - 0.25) * 60, 40 + Math.sin(a - 0.25) * 60); c.lineTo(Math.cos(a) * 118, 40 + Math.sin(a) * 118); c.lineTo(Math.cos(a + 0.25) * 60, 40 + Math.sin(a + 0.25) * 60); c.fill(); } break;
    case 'clown': head(70); c.beginPath(); c.moveTo(-40, -30); c.lineTo(0, -120); c.lineTo(40, -30); c.fill(); c.beginPath(); c.arc(0, -124, 16, 0, U.TAU); c.fill(); break;
    default: head(70);
  }
}
function paintCrowd() {
  const out = [];
  const R = U.rng(99);
  CROWD_TYPES.forEach((type, i) => {
    const mk = (rim) => {
      const s = new Sprite(-170, -170, 340, 480, 1);
      const c = s.ctx;
      // rim light: draw silhouette offset upward in rim colour, then the dark body on top
      c.save(); c.filter = 'blur(3px)'; c.fillStyle = rim; c.translate(0, -5); silhouette(c, type, R); c.restore();
      c.save(); c.filter = 'blur(1.5px)'; c.fillStyle = '#07050b'; silhouette(c, type, R); c.restore();
      return s;
    };
    out.push({ type, warm: mk('rgba(255,170,80,0.95)'), cool: mk('rgba(120,140,255,0.95)'), x: -1450 + i * 215 + (R() - 0.5) * 60, y: 25 + R() * 55, s: 0.62 + R() * 0.22, phase: R() * U.TAU, amp: 6 + R() * 10, seed: i });
  });
  return out;
}

// ---------------------------------------------------------------- haze + grain textures
function noiseCanvas(w, h, scale, seed, tint) {
  const cv = createCanvas(w, h);
  const c = cv.getContext('2d');
  const img = c.createImageData(w, h);
  const [r, g, b] = U.hexToRgb(tint);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0, amp = 0.55, f = scale;
    for (let o = 0; o < 4; o++) { v += amp * U.noise2(x * f, y * f, seed + o * 7); amp *= 0.5; f *= 2; }
    v = U.clamp(v * 0.9 + 0.35, 0, 1);
    const i = (y * w + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = Math.floor(v * v * 255);
  }
  c.putImageData(img, 0, 0);
  return cv;
}
function grainTiles(n = 4, size = 256) {
  const out = [];
  const R = U.rng(5);
  for (let k = 0; k < n; k++) {
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    const img = c.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = Math.floor(R() * 255);
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    out.push(cv);
  }
  return out;
}

function build() {
  return {
    wall: paintWall(), neonOn: paintNeon(true), neonOff: paintNeon(false), ropes: paintRopes(), mat: paintMat(),
    couch: paintCouch(), clutter: paintClutter(), crowd: paintCrowd(),
    hazeWarm: noiseCanvas(480, 270, 0.012, 3, '#ffcf9a'), hazeCool: noiseCanvas(480, 270, 0.012, 9, '#a9b6ff'),
    grain: grainTiles(),
  };
}

// xmas light strings in wall coords
const STRINGS = [
  { a: [-1500, -720], b: [-660, -680], sag: 70 },
  { a: [-660, -680], b: [660, -680], sag: 30 },
  { a: [660, -680], b: [1500, -720], sag: 70 },
  { a: [-1350, -330], b: [-700, -300], sag: 60 },
];
const BULB_COLS = ['#ff4040', '#ffd040', '#40ff70', '#40a0ff', '#ff70d0', '#ff9a30'];
function drawXmasLights(ctx, t, energy) {
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#0e1410';
  let k = 0;
  for (const S of STRINGS) {
    const pt = (u) => {
      const x = U.lerp(S.a[0], S.b[0], u), y = U.lerp(S.a[1], S.b[1], u) + Math.sin(u * Math.PI) * S.sag;
      return [x, y];
    };
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const [x, y] = pt(i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    const n = Math.round(Math.hypot(S.b[0] - S.a[0], S.b[1] - S.a[1]) / 70);
    for (let i = 1; i < n; i++) {
      const [x, y] = pt(i / n);
      const col = BULB_COLS[k % BULB_COLS.length];
      // chase pattern synced to the beat energy
      const on = 0.35 + 0.65 * U.clamp(0.5 + 0.5 * Math.sin(t * 3.2 + k * 1.3) + energy * 0.6);
      const g = ctx.createRadialGradient(x, y + 10, 0, x, y + 10, 34);
      g.addColorStop(0, U.rgba(col, 0.55 * on)); g.addColorStop(1, U.rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - 34, y - 24, 68, 68);
      ctx.fillStyle = U.mix(col, '#ffffff', 0.45 * on);
      ctx.beginPath(); ctx.ellipse(x, y + 10, 6, 9, 0, 0, U.TAU); ctx.fill();
      k++;
    }
  }
}

module.exports = { build, applyLayer, PAR, POS, drawXmasLights, drawStar, drawHeart };
