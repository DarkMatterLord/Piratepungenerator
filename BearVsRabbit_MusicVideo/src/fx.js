'use strict';
// Post-processing looks:
//   film     -> the bear's verses: warm 35mm grade, bloom, fine grain, letterbox, light leaks
//   vhs      -> the rabbit's verses: chroma split, scanlines, desaturated purple tint, tape noise,
//               head-switching band, occasional tracking roll
//   playback -> the ending: a worn home-video tape (heavier VHS)
const { createCanvas } = require('@napi-rs/canvas');
const U = require('./util');
const W = 1920, H = 1080;

class FX {
  constructor(grain) {
    this.grain = grain;
    this.a = createCanvas(W, H); this.b = createCanvas(W, H);
    this.s1 = createCanvas(480, 270); this.s2 = createCanvas(480, 270);
    this.scan = createCanvas(W, H);
    const sc = this.scan.getContext('2d');
    for (let y = 0; y < H; y += 3) { sc.fillStyle = 'rgba(0,0,0,0.2)'; sc.fillRect(0, y, W, 1); sc.fillStyle = 'rgba(255,255,255,0.025)'; sc.fillRect(0, y + 1, W, 1); }
    this.vig = createCanvas(W, H);
    const vc = this.vig.getContext('2d');
    const g = vc.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.62)');
    vc.fillStyle = g; vc.fillRect(0, 0, W, H);
  }
  bloom(main, amount) {
    const a = this.s1.getContext('2d'), b = this.s2.getContext('2d');
    a.globalCompositeOperation = 'source-over'; a.filter = 'blur(4px)'; a.drawImage(main, 0, 0, 480, 270); a.filter = 'none';
    b.globalCompositeOperation = 'source-over'; b.drawImage(this.s1, 0, 0);
    b.globalCompositeOperation = 'multiply'; b.drawImage(this.s1, 0, 0); // square -> keeps the highlights
    const m = main.getContext('2d');
    m.save(); m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'lighter'; m.globalAlpha = amount; m.drawImage(this.s2, 0, 0, W, H); m.restore();
  }
  grainPass(m, t, alpha, scale) {
    const tile = this.grain[Math.floor(t * 30) % this.grain.length];
    const ts = 256 * scale;
    const ox = -Math.floor(U.hash(Math.floor(t * 30), 1) * ts), oy = -Math.floor(U.hash(Math.floor(t * 30), 2) * ts);
    m.save(); m.globalCompositeOperation = 'overlay'; m.globalAlpha = alpha;
    for (let y = oy; y < H; y += ts) for (let x = ox; x < W; x += ts) m.drawImage(tile, x, y, ts, ts);
    m.restore();
  }
  chroma(main, dx) {
    const A = this.a.getContext('2d'), B = this.b.getContext('2d');
    A.globalCompositeOperation = 'source-over'; A.drawImage(main, 0, 0);
    A.globalCompositeOperation = 'multiply'; A.fillStyle = '#ff0000'; A.fillRect(0, 0, W, H);
    B.globalCompositeOperation = 'source-over'; B.drawImage(main, 0, 0);
    B.globalCompositeOperation = 'multiply'; B.fillStyle = '#00ffff'; B.fillRect(0, 0, W, H);
    const m = main.getContext('2d');
    m.save(); m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'source-over'; m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
    m.globalCompositeOperation = 'lighter';
    m.drawImage(this.a, -dx, 0); m.drawImage(this.b, dx, 0);
    m.restore();
  }
  film(main, t, F) {
    const m = main.getContext('2d');
    this.bloom(main, 0.32);
    m.save();
    m.globalCompositeOperation = 'soft-light'; m.fillStyle = 'rgba(255,150,60,0.16)'; m.fillRect(0, 0, W, H);
    // drifting light leak from the edge
    m.globalCompositeOperation = 'screen';
    const lx = W * (0.05 + 0.1 * Math.sin(t * 0.21)), ly = H * (0.2 + 0.2 * Math.sin(t * 0.17));
    const g = m.createRadialGradient(lx, ly, 0, lx, ly, 700);
    g.addColorStop(0, 'rgba(255,120,40,0.13)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    m.fillStyle = g; m.fillRect(0, 0, W, H);
    m.restore();
    this.grainPass(m, t, 0.08, 1);
    m.drawImage(this.vig, 0, 0);
  }
  vhs(main, t, F, heavy = 0) {
    const frame = Math.floor(t * 30);
    this.bloom(main, 0.22);
    const m = main.getContext('2d');
    // colour: desaturate, purple-blue cast, lifted blacks
    m.save();
    m.globalCompositeOperation = 'saturation'; m.fillStyle = `rgba(128,128,128,${0.28 + heavy * 0.25})`; m.fillRect(0, 0, W, H);
    m.globalCompositeOperation = 'soft-light'; m.fillStyle = 'rgba(110,80,255,0.25)'; m.fillRect(0, 0, W, H);
    m.globalCompositeOperation = 'screen'; m.fillStyle = `rgba(28,14,48,${0.55 + heavy * 0.2})`; m.fillRect(0, 0, W, H);
    m.restore();
    this.chroma(main, 3 + heavy * 3 + (U.hash(frame, 3) < 0.05 ? 6 : 0));
    // horizontal line wobble + tracking roll band
    const A = this.a.getContext('2d');
    A.globalCompositeOperation = 'source-over'; A.drawImage(main, 0, 0);
    const rollCycle = Math.floor(t / 3.1);
    const rolling = U.hash(rollCycle, 9) < 0.35 + heavy * 0.5;
    const rp = (t / 3.1) % 1;
    if (rolling && rp < 0.45) {
      const by = H * (1.1 - rp / 0.45 * 1.3), bh = 70 + heavy * 50;
      for (let y = Math.max(0, by - bh); y < Math.min(H, by + bh); y += 6) {
        const k = 1 - Math.abs(y - by) / bh;
        const dx = (U.hash(y + frame * 7, 5) - 0.5) * 60 * k + 25 * k;
        m.drawImage(this.a, 0, y, W, 6, dx, y, W, 6);
      }
      m.fillStyle = 'rgba(255,255,255,0.10)'; m.fillRect(0, by - 4, W, 8);
    }
    // head-switching noise at the bottom
    const hb = 16;
    m.drawImage(this.a, 0, H - hb, W, hb, 18 + U.hash(frame, 6) * 14, H - hb + 3, W, hb);
    m.fillStyle = 'rgba(255,255,255,0.12)'; m.fillRect(0, H - hb + 3, W, 2);
    // dropouts
    for (let i = 0; i < 4 + heavy * 6; i++) {
      if (U.hash(frame * 13 + i, 7) < 0.55) continue;
      const y = U.hash(frame * 17 + i, 8) * H, x = U.hash(frame * 19 + i, 9) * W, w = 30 + U.hash(frame + i, 10) * 220;
      m.fillStyle = `rgba(255,255,255,${0.25 + 0.4 * U.hash(i + frame, 11)})`; m.fillRect(x, y, w, 1.5);
    }
    m.drawImage(this.scan, 0, 0);
    this.grainPass(m, t, 0.14 + heavy * 0.08, 2);
    m.drawImage(this.vig, 0, 0);
    // CRT-ish rounded darkening
    m.save(); m.globalAlpha = 0.6; m.drawImage(this.vig, 0, 0); m.restore();
  }
  letterbox(m, k) {
    if (k <= 0) return;
    const h = 62 * k;
    m.fillStyle = '#000'; m.fillRect(0, 0, W, h); m.fillRect(0, H - h, W, h);
  }
  staticBurst(m, t, k) {
    if (k <= 0.01) return;
    m.save();
    m.globalAlpha = k;
    const tile = this.grain[Math.floor(t * 60) % this.grain.length];
    for (let y = 0; y < H; y += 512) for (let x = 0; x < W; x += 512) m.drawImage(tile, x, y, 512, 512);
    m.globalAlpha = k * 0.8;
    m.fillStyle = 'rgba(255,255,255,0.9)';
    m.fillRect(0, H * U.hash(Math.floor(t * 60), 3), W, 3);
    m.restore();
  }
  filmBurn(m, t, k) {
    if (k <= 0.01) return;
    m.save(); m.globalCompositeOperation = 'screen';
    const r = 300 + (1 - k) * 1600;
    const g = m.createRadialGradient(150, 300, 0, 150, 300, r);
    g.addColorStop(0, `rgba(255,250,230,${k})`); g.addColorStop(0.35, `rgba(255,160,50,${k * 0.9})`); g.addColorStop(1, 'rgba(200,40,0,0)');
    m.fillStyle = g; m.fillRect(0, 0, W, H);
    m.restore();
  }
}

module.exports = { FX };
