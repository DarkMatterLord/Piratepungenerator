'use strict';
// Composes one finished frame: world -> look (film / VHS) -> transitions -> icons -> lyrics -> graphics.
require('./assets');
const { createCanvas } = require('@napi-rs/canvas');
const U = require('./util');
const SC = require('./scene');
const D = require('./director');
const LY = require('./lyrics');
const IC = require('./icons');
const CD = require('./cards');
const BEAR = require('./bear');
const RAB = require('./rabbit');
const { FX } = require('./fx');

const W = 1920, H = 1080;

class Renderer {
  constructor() {
    this.A = SC.buildAll();
    this.main = createCanvas(W, H);
    this.ctx = this.main.getContext('2d');
    this.fx = new FX(this.A.set.grain);
    this.pops = IC.buildPops(D.LINES);
    this.frozen = null;
    this.grad = createCanvas(W, 420);
    const g = this.grad.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 0, 420);
    lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = lg; g.fillRect(0, 0, W, 420);
  }

  render(t) {
    const T = D.T, ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    if (t >= T.stop) return this.renderEnd(t);
    const F = D.frameState(t);
    F.T = T;
    SC.drawWorld(ctx, this.A, F);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // ------------- look
    if (F.mode === 'film') this.fx.film(this.main, t, F);
    else this.fx.vhs(this.main, t, F, F.mode === 'playback' ? 1 : 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // ------------- transitions between the two worlds
    const S = D.SECTIONS;
    for (const tt of [4.3, S[1].start, S[3].start, T.playback]) {
      const d = t - tt;
      if (d > -0.12 && d < 0.35) this.fx.staticBurst(ctx, t, d < 0 ? 0.3 + (d + 0.12) * 5 : 0.9 * (1 - d / 0.35));
    }
    for (const tt of [2.16, 6.24, S[2].start]) {
      const d = t - tt;
      if (d > -0.05 && d < 0.55) this.fx.filmBurn(ctx, t, d < 0 ? 0.5 : 1 - d / 0.55);
    }

    // ------------- letterbox for the film look
    if (F.mode === 'film') {
      const since = F.sec ? t - Math.max(F.sec.start, F.sec.speaker === 'ted' ? F.sec.start : 0) : t - 2.16;
      this.fx.letterbox(ctx, U.smooth(since / 0.4));
    }
    ctx.drawImage(this.grad, 0, H - 420);

    // ------------- icon pops
    for (const p of this.pops) if (t >= p.t0 && t < p.t0 + 1.8) IC.drawPop(ctx, p, t);

    // ------------- lyrics
    const frame = Math.round(t * 30);
    for (const L of D.LINES) {
      if (t < L.start - 0.02) break;
      const exitT = L.end;
      if (t > exitT + 0.45) continue;
      const lay = LY.layout(ctx, L, `${L.idx}`, L.speaker);
      if (L.speaker === 'ted') LY.drawTedLine(ctx, L, lay, t, exitT);
      else LY.drawFloppyLine(ctx, L, lay, t, exitT, frame);
    }

    // ------------- graphics
    const cam = D.EV.camcorder, roll = D.EV.roll;
    F.noHud = (t >= cam.start && t < cam.end) || t >= roll.start;
    CD.hud(ctx, t, F);
    if (t < T.intro + 2) CD.intro(ctx, t);
    CD.roundCardTed(ctx, t, 7.45, S[0].label);
    CD.roundCardTed(ctx, t, S[2].start, S[2].label);
    CD.roundCardFloppy(ctx, t, S[1].start - 0.25, S[1].label);
    CD.blueScreen(ctx, t, T.gap2, S[3].start);
    CD.viewfinder(ctx, t, t >= roll.start && t < T.playback ? U.smooth((t - roll.start) / 0.2) : 0);
    // the camcorder-dance reaction gets a little REC tag
    if (t >= cam.start && t < cam.end) CD.viewfinder(ctx, t, 0.85);
    CD.playbackOSD(ctx, t, T);
    return this.main;
  }

  renderEnd(t) {
    const T = D.T, ctx = this.ctx;
    if (!this.frozen) {
      const tf = T.stop - 1 / 30;
      this.render(tf);
      this.frozen = createCanvas(W, H);
      this.frozen.getContext('2d').drawImage(this.main, 0, 0);
      CD.vhsText(this.frozen.getContext('2d'), 'STOP ■', 80, 110, 70);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (t < T.stop + 0.12) { ctx.drawImage(this.frozen, 0, 0); this.fx.staticBurst(ctx, t, 0.25); return this.main; }
    CD.crtOff(ctx, this.frozen, t, T.stop + 0.12);
    this.fx.staticBurst(ctx, t, 0.05);
    // both fighters take a bow on the end card
    const k = U.clamp((t - T.stop - 1.4) / 0.8) * U.clamp((T.end - t) / 1.2);
    if (k > 0) {
      const bi = D.beatInfo(t);
      ctx.save();
      ctx.globalAlpha = k;
      for (const [x, col] of [[300, '255,170,70'], [1630, '120,110,255']]) {
        const g = ctx.createRadialGradient(x, 990, 10, x, 990, 300);
        g.addColorStop(0, `rgba(${col},0.35)`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - 320, 600, 640, 480);
      }
      BEAR.draw(ctx, this.A.bear, { x: 300, y: 1030, scale: 0.62, turn: 0.3, bob: 0.4 * Math.pow(1 - bi.phase, 3), smile: 1, anger: 0.4,
        armL: -0.3, armR: -2.45 + 0.1 * Math.sin(t * 3), bottleAng: 0.2, tilt: 0.04 * Math.sin(t * 1.3) });
      RAB.draw(ctx, this.A.rabbit, { x: 1630, y: 990, scale: 0.62, turn: -0.3, lookX: -0.6, lid: 0.45, mouth: 0.3, tongueWag: Math.sin(t * 5),
        earL: 0.33 + 0.1 * Math.sin(t * 2), earR: -0.33 - 0.1 * Math.sin(t * 2 + 1), armL: 2.5, canAng: -0.2, armR: 0.25, tilt: 0.05 });
      ctx.restore();
    }
    CD.endCard(ctx, t, T.stop + 0.8, T.end);
    ctx.drawImage(this.fx.scan, 0, 0);
    return this.main;
  }
}

module.exports = { Renderer };
