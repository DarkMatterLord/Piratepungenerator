'use strict';
// Hand props: microphone, beer bottle (bear), beer can (rabbit). Each sprite's origin is the grip point.
const { Sprite } = require('./fur');
const U = require('./util');

function mic() {
  const s = new Sprite(-30, -95, 60, 150);
  const c = s.ctx;
  // handle (tapered)
  let g = c.createLinearGradient(-12, 0, 12, 0);
  g.addColorStop(0, '#111'); g.addColorStop(0.35, '#4a4a52'); g.addColorStop(0.5, '#6b6b75'); g.addColorStop(1, '#0c0c0e');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(-13, -48); c.lineTo(13, -48); c.lineTo(8, 50); c.quadraticCurveTo(0, 56, -8, 50); c.closePath(); c.fill();
  // collar ring
  g = c.createLinearGradient(-15, 0, 15, 0);
  g.addColorStop(0, '#5d5d63'); g.addColorStop(0.45, '#e9e9ef'); g.addColorStop(1, '#4b4b51');
  c.fillStyle = g; U.roundRect(c, -16, -56, 32, 12, 4); c.fill();
  // grille ball
  g = c.createRadialGradient(-8, -80, 2, 0, -72, 26);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#c9cad2'); g.addColorStop(0.8, '#6c6e78'); g.addColorStop(1, '#3a3b42');
  c.fillStyle = g; c.beginPath(); c.arc(0, -74, 24, 0, U.TAU); c.fill();
  c.save(); c.beginPath(); c.arc(0, -74, 24, 0, U.TAU); c.clip();
  c.strokeStyle = 'rgba(30,30,40,0.35)'; c.lineWidth = 1;
  for (let i = -30; i <= 30; i += 5) { c.beginPath(); c.moveTo(i, -100); c.lineTo(i + 30, -48); c.stroke(); c.beginPath(); c.moveTo(i, -100); c.lineTo(i - 30, -48); c.stroke(); }
  c.restore();
  c.strokeStyle = 'rgba(20,20,25,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(0, -74, 24, 0, U.TAU); c.stroke();
  return s;
}

function bottle() {
  const s = new Sprite(-30, -120, 60, 175);
  const c = s.ctx;
  const path = () => {
    c.beginPath();
    c.moveTo(-6, -112); c.lineTo(6, -112); c.lineTo(7, -70);
    c.bezierCurveTo(8, -52, 21, -48, 21, -28); c.lineTo(21, 46); c.quadraticCurveTo(21, 52, 14, 52);
    c.lineTo(-14, 52); c.quadraticCurveTo(-21, 52, -21, 46); c.lineTo(-21, -28);
    c.bezierCurveTo(-21, -48, -8, -52, -7, -70); c.closePath();
  };
  let g = c.createLinearGradient(-21, 0, 21, 0);
  g.addColorStop(0, '#2a1004'); g.addColorStop(0.3, '#7a3a0e'); g.addColorStop(0.5, '#a0521a'); g.addColorStop(1, '#2a1004');
  c.fillStyle = g; path(); c.fill();
  // label (red, like the reference)
  c.save(); path(); c.clip();
  g = c.createLinearGradient(-21, 0, 21, 0);
  g.addColorStop(0, '#5e0b0b'); g.addColorStop(0.4, '#c42727'); g.addColorStop(0.6, '#d63a32'); g.addColorStop(1, '#5e0b0b');
  c.fillStyle = g; c.fillRect(-22, -8, 44, 44);
  c.fillStyle = 'rgba(255,230,180,0.85)'; c.fillRect(-22, -6, 44, 2); c.fillRect(-22, 32, 44, 2);
  c.fillStyle = 'rgba(255,220,160,0.6)'; c.beginPath(); c.arc(0, 14, 9, 0, U.TAU); c.fill();
  c.restore();
  // cap
  c.fillStyle = '#c9a64a'; U.roundRect(c, -8, -118, 16, 9, 2); c.fill();
  // glass highlights
  c.strokeStyle = 'rgba(255,240,210,0.55)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-13, -26); c.lineTo(-13, 44); c.stroke();
  c.strokeStyle = 'rgba(255,240,210,0.35)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-3, -105); c.lineTo(-3, -72); c.stroke();
  return s;
}

function can() {
  const s = new Sprite(-28, -70, 56, 110);
  const c = s.ctx;
  let g = c.createLinearGradient(-22, 0, 22, 0);
  g.addColorStop(0, '#5f6a73'); g.addColorStop(0.3, '#dfe7ec'); g.addColorStop(0.45, '#ffffff'); g.addColorStop(1, '#434b52');
  c.fillStyle = g; U.roundRect(c, -22, -58, 44, 92, 6); c.fill();
  // generic teal/blue bands
  c.save(); U.roundRect(c, -22, -58, 44, 92, 6); c.clip();
  g = c.createLinearGradient(-22, 0, 22, 0);
  g.addColorStop(0, '#0b2a4a'); g.addColorStop(0.4, '#2a77b8'); g.addColorStop(0.55, '#4aa3e0'); g.addColorStop(1, '#0b2a4a');
  c.fillStyle = g; c.fillRect(-22, -42, 44, 56);
  c.fillStyle = '#f2d24b'; c.fillRect(-22, -20, 44, 9);
  c.fillStyle = 'rgba(255,255,255,0.75)';
  c.font = 'bold 13px Anton'; c.textAlign = 'center'; c.fillText('LITE', 0, 4);
  c.restore();
  c.fillStyle = '#9aa3aa'; U.roundRect(c, -18, -64, 36, 8, 3); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, -50); c.lineTo(-12, 28); c.stroke();
  return s;
}

module.exports = { mic, bottle, can };
