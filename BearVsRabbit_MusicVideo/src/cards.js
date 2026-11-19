'use strict';
// Overlay graphics: title sequence, nameplates, round cards, per-verse HUD, camcorder viewfinder,
// tape OSD, the blue-screen interstitial and the end card.
const U = require('./util');
const L = require('./lyrics');
const I = require('./icons');
const W = 1920, H = 1080;

function fmtCounter(t) {
  const s = Math.floor(t), m = Math.floor(s / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function vhsText(ctx, txt, x, y, size, col = '#f4f7ff', align = 'left', split = 3) {
  ctx.font = `${size}px VT323`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,40,200,0.7)'; ctx.fillText(txt, x - split, y);
  ctx.fillStyle = 'rgba(40,220,255,0.7)'; ctx.fillText(txt, x + split, y);
  ctx.restore();
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3; ctx.shadowBlur = 2;
  ctx.fillStyle = col; ctx.fillText(txt, x, y);
  ctx.restore();
}
function goldText(ctx, txt, x, y, size, opts = {}) {
  ctx.save(); ctx.translate(x, y);
  if (opts.rot) ctx.rotate(opts.rot);
  if (opts.scale) ctx.scale(opts.scale, opts.scale);
  L.tedWord(ctx, txt, size, !!opts.emph, !!opts.glow, opts.flash || 0);
  ctx.restore();
}
function rays(ctx, x, y, r, t, col, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.4);
  for (let i = 0; i < 18; i++) {
    ctx.rotate(U.TAU / 18);
    const g = ctx.createLinearGradient(0, 0, r, 0);
    g.addColorStop(0, U.rgba(col, 0.55 * a)); g.addColorStop(1, U.rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, -r * 0.09); ctx.lineTo(r, r * 0.09); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ intro
function intro(ctx, t) {
  // tape start OSD
  if (t < 2.16) {
    if (Math.floor(t * 2.5) % 2 === 0 || t > 1.0) vhsText(ctx, 'PLAY ▶', 90, 120, 78);
    vhsText(ctx, 'SP', 1700, 120, 64);
    if (t < 1.2) {
      ctx.fillStyle = `rgba(0,0,0,${U.clamp(1 - t / 1.2) * 0.9})`; ctx.fillRect(0, 0, W, H);
      vhsText(ctx, 'PLAY ▶', 90, 120, 78);
    }
  }
  // bear nameplate
  if (t >= 2.16 && t < 4.3) {
    const a = t - 2.16, out = U.clamp((t - 4.0) / 0.3);
    const s = U.lerp(2.6, 1, U.easeOutBack(U.clamp(a / 0.3), 2)) * (1 - out * 0.3);
    ctx.save(); ctx.globalAlpha = 1 - out;
    rays(ctx, 1350, 430, 520, t, '#ffb347', U.clamp(a / 0.3));
    goldText(ctx, 'TED', 1350, 410, 190, { scale: s, rot: -0.06 * (1 - U.clamp(a / 0.3)), flash: U.clamp(1 - a / 0.15) });
    if (a > 0.35) {
      const k = U.easeOutCubic(U.clamp((a - 0.35) / 0.3));
      ctx.globalAlpha = (1 - out) * k;
      ctx.font = '40px Bungee'; ctx.textAlign = 'center';
      ctx.fillStyle = '#2a0f03'; ctx.fillText('THE LIVING, TALKING BEAR', 1354, 548 + 4);
      ctx.fillStyle = '#fff2cf'; ctx.fillText('THE LIVING, TALKING BEAR', 1350, 548);
      ctx.fillStyle = '#ffc53a'; ctx.fillRect(1350 - 330 * k, 572, 660 * k, 6);
    }
    ctx.restore();
  }
  // rabbit nameplate
  if (t >= 4.3 && t < 6.24) {
    const a = t - 4.3, out = U.clamp((t - 5.95) / 0.25);
    ctx.save();
    ctx.translate(560, 430); ctx.scale(1, 1 - out); ctx.translate(-560, -430);
    const name = 'MR. FLOPPY';
    const n = Math.min(name.length, Math.floor(a / 0.045));
    ctx.font = '170px VT323';
    const tw = ctx.measureText(name).width;
    ctx.fillStyle = 'rgba(7,3,18,0.85)'; ctx.fillRect(560 - tw / 2 - 30, 300, (tw + 60) * (n / name.length), 160);
    vhsText(ctx, name.slice(0, n), 560 - tw / 2, 430, 170, '#ffffff', 'left', 5);
    if (n < name.length || Math.floor(t * 7) % 2) { ctx.fillStyle = '#ff2bd6'; ctx.fillRect(560 - tw / 2 + (tw * n) / name.length + 6, 330, 50, 100); }
    if (a > 0.6) {
      const sub = 'THE COPING MECHANISM';
      const m = Math.min(sub.length, Math.floor((a - 0.6) / 0.03));
      ctx.font = '62px VT323';
      const sw = ctx.measureText(sub).width;
      ctx.fillStyle = 'rgba(7,3,18,0.85)'; ctx.fillRect(560 - sw / 2 - 16, 478, (sw + 32) * (m / sub.length), 64);
      vhsText(ctx, sub.slice(0, m), 560 - sw / 2, 528, 62, '#ff8eea');
    }
    ctx.restore();
  }
  // VS slam
  if (t >= 6.24 && t < 7.9) {
    const a = t - 6.24, out = U.clamp((t - 7.55) / 0.35);
    ctx.save(); ctx.globalAlpha = 1 - out;
    ctx.fillStyle = `rgba(0,0,0,${0.45 * (1 - out)})`; ctx.fillRect(0, 0, W, H);
    const flash = U.clamp(1 - a / 0.18);
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.85})`; ctx.fillRect(0, 0, W, H); }
    rays(ctx, 960, 470, 900, t, '#ff3355', 0.8);
    const sl = U.easeOutCubic(U.clamp(a / 0.25));
    goldText(ctx, 'TED', U.lerp(-300, 470, sl), 470, 150, { rot: -0.08 });
    ctx.save();
    const fx = U.lerp(2300, 1450, sl);
    ctx.font = '150px VT323'; const fw = ctx.measureText('MR. FLOPPY').width;
    ctx.fillStyle = 'rgba(7,3,18,0.85)'; ctx.fillRect(fx - fw / 2 - 20, 395, fw + 40, 130);
    vhsText(ctx, 'MR. FLOPPY', fx, 505, 150, '#ffffff', 'center', 6);
    ctx.restore();
    // VS
    const vs = U.lerp(4, 1, U.easeOutBack(U.clamp((a - 0.08) / 0.3), 2.5));
    if (a > 0.08) {
      ctx.save(); ctx.translate(990, 470); ctx.rotate(0.15); ctx.scale(2.4 * vs, 2.4 * vs); ctx.globalAlpha *= 0.95; I.drawSticker(ctx, 'bolt'); ctx.restore();
            ctx.save(); ctx.translate(960, 480); ctx.scale(vs, vs); ctx.rotate(-0.08);
      ctx.font = '230px Anton'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 26; ctx.strokeStyle = '#1a0006'; ctx.strokeText('VS', 8, 12);
      ctx.lineWidth = 16; ctx.strokeStyle = '#fff'; ctx.strokeText('VS', 0, 0);
      const g = ctx.createLinearGradient(0, -110, 0, 110);
      g.addColorStop(0, '#ff9aa8'); g.addColorStop(0.5, '#ff1f3d'); g.addColorStop(1, '#8a0018');
      ctx.fillStyle = g; ctx.fillText('VS', 0, 0);
      ctx.restore();
ctx.restore();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ round cards
function roundCardTed(ctx, t, t0, label) {
  const a = t - t0, life = 2.3;
  if (a < 0 || a > life) return;
  const inn = U.easeOutBack(U.clamp(a / 0.35), 2.2), out = U.easeInCubic(U.clamp((a - (life - 0.35)) / 0.35));
  ctx.save();
  ctx.translate(960, 205 - out * 320);
  { const g = ctx.createRadialGradient(0, 20, 40, 0, 20, 520); g.addColorStop(0, `rgba(10,4,0,${0.75 * (1 - out) * U.clamp(a / 0.2)})`); g.addColorStop(1, 'rgba(10,4,0,0)'); ctx.fillStyle = g; ctx.fillRect(-600, -400, 1200, 900); }
  rays(ctx, 0, 0, 420, t, '#ffb347', U.clamp(a / 0.3) * (1 - out));
  ctx.scale(inn, inn);
  goldText(ctx, label, 0, 0, 104, { flash: U.clamp(1 - a / 0.15), glow: true });
  ctx.font = '38px Bungee'; ctx.textAlign = 'center';
  ctx.fillStyle = '#2a0f03'; ctx.fillText('★ TED ★', 3, 92);
  ctx.fillStyle = '#fff2cf'; ctx.fillText('★ TED ★', 0, 89);
  // ringing bell
  ctx.save(); ctx.translate(-330, 0); ctx.rotate(Math.sin(a * 30) * 0.4 * Math.exp(-a * 2)); ctx.scale(0.95, 0.95); I.drawSticker(ctx, 'bell'); ctx.restore();
  if (a < 1.2) {
    ctx.save(); ctx.translate(-330, -95); ctx.rotate(-0.2);
    ctx.font = '40px Bungee'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.globalAlpha = U.clamp(1 - (a - 0.8) / 0.4);
    ctx.fillText('DING!', 0, 0); ctx.restore();
  }
  ctx.restore();
}
function roundCardFloppy(ctx, t, t0, label) {
  const a = t - t0, life = 2.3;
  if (a < 0 || a > life) return;
  const out = U.clamp((a - (life - 0.2)) / 0.2);
  ctx.save();
  ctx.translate(960, 200); ctx.scale(1 + out * 0.2, 1 - out * 0.96); ctx.translate(-960, -200);
  const txt = `▶ ${label}`;
  const n = Math.min(txt.length, Math.floor(a / 0.05));
  ctx.font = '130px VT323';
  const tw = ctx.measureText(txt).width;
  ctx.fillStyle = 'rgba(7,3,18,0.85)'; ctx.fillRect(960 - tw / 2 - 26, 110, (tw + 52) * (n / txt.length), 125);
  vhsText(ctx, txt.slice(0, n), 960 - tw / 2, 210, 130, '#ffffff', 'left', 5);
  if (a > 0.5) {
    const sub = 'MR. FLOPPY';
    const m = Math.min(sub.length, Math.floor((a - 0.5) / 0.05));
    ctx.font = '70px VT323'; const sw = ctx.measureText(sub).width;
    ctx.fillStyle = 'rgba(7,3,18,0.85)'; ctx.fillRect(960 - sw / 2 - 16, 248, (sw + 32) * (m / sub.length), 72);
    vhsText(ctx, sub.slice(0, m), 960 - sw / 2, 302, 70, '#ff8eea');
  }
  ctx.restore();
}
// full-screen VCR blue screen before the rabbit's second verse
function blueScreen(ctx, t, t0, t1) {
  if (t < t0 || t >= t1) return;
  const a = t - t0, left = t1 - t;
  let alpha = U.clamp(a / 0.12) * U.clamp(left / 0.15);
  if (left < 0.4 && U.hash(Math.floor(t * 30), 3) < 0.5) alpha *= 0.4;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1328c8'; ctx.fillRect(0, 0, W, H);
  vhsText(ctx, 'PLAY ▶', 90, 120, 78);
  vhsText(ctx, fmtCounter(t), 1830, 120, 64, '#f4f7ff', 'right');
  vhsText(ctx, 'ROUND 2', 960, 470, 190, '#ffffff', 'center', 6);
  const sub = 'MR. FLOPPY';
  const m = Math.min(sub.length, Math.floor(Math.max(0, a - 0.4) / 0.06));
  vhsText(ctx, sub.slice(0, m) + (Math.floor(t * 6) % 2 ? '█' : ' '), 960, 590, 100, '#ff8eea', 'center', 4);
  const bars = Math.min(10, Math.floor(a * 6));
  vhsText(ctx, 'TRACKING ' + '█'.repeat(bars) + '░'.repeat(10 - bars), 960, 900, 56, '#f4f7ff', 'center', 2);
  ctx.restore();
}

// ------------------------------------------------------------------ per-verse HUD
function hud(ctx, t, F) {
  const sec = F.sec;
  if (!sec || t >= F.T.playback || F.noHud) return;
  const a = t - sec.start;
  if (F.mode === 'film' && sec.speaker === 'ted') {
    const k = U.easeOutCubic(U.clamp((a - 2.0) / 0.4));
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k; ctx.translate(-260 * (1 - k), 0);
    goldText(ctx, sec.label, 175, 112, 34);
    ctx.font = '26px Bungee'; ctx.textAlign = 'left';
    ctx.fillStyle = '#2a0f03'; ctx.fillText('★ TED', 77, 160);
    ctx.fillStyle = '#ffe2a0'; ctx.fillText('★ TED', 75, 158);
    ctx.restore();
  } else if (F.mode === 'vhs' && sec.speaker === 'floppy') {
    if (Math.floor(t * 1.5) % 2 === 0 || a > 4) vhsText(ctx, 'PLAY ▶', 80, 110, 66);
    vhsText(ctx, `${sec.label.replace('ROUND', 'RND')} · MR.FLOPPY`, 80, 160, 42, '#ff8eea');
    vhsText(ctx, 'SP ' + fmtCounter(t), 1840, 110, 58, '#f4f7ff', 'right');
  }
}

// ------------------------------------------------------------------ camcorder viewfinder & tape
function viewfinder(ctx, t, k) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5;
  const m = 70, l = 90;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * l); ctx.lineTo(x, y); ctx.lineTo(x + sx * l, y); ctx.stroke();
  }
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(940, 540); ctx.lineTo(980, 540); ctx.moveTo(960, 520); ctx.lineTo(960, 560); ctx.stroke();
  if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(130, 140, 16, 0, U.TAU); ctx.fill(); }
  vhsText(ctx, 'REC', 160, 158, 64, '#ffffff');
  // battery
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(1700, 115, 90, 40); ctx.fillStyle = '#fff'; ctx.fillRect(1790, 125, 8, 20);
  for (let i = 0; i < 3; i++) ctx.fillRect(1708 + i * 27, 122, 20, 26);
  vhsText(ctx, 'SP  ' + fmtCounter(t), 1790, 1000, 56, '#ffffff', 'right');
  ctx.restore();
}
function playbackOSD(ctx, t, T) {
  if (t < T.playback || t >= T.stop + 0.25) return;
  if (t < T.stop) {
    vhsText(ctx, 'PLAY ▶', 80, 110, 70);
    // camcorder date stamp: it's always Christmas in this basement
    vhsText(ctx, 'DEC.25 1996', 1830, 960, 60, '#ffcf4a', 'right', 2);
    vhsText(ctx, 'PM 11:58', 1830, 1010, 60, '#ffcf4a', 'right', 2);
  } else vhsText(ctx, 'STOP ■', 80, 110, 70);
}
// picture collapses like a CRT switching off
function crtOff(ctx, src, t, t0) {
  const a = (t - t0) / 0.35;
  if (a < 0) return false;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (a < 1) {
    const sy = Math.max(0.004, 1 - U.easeInCubic(Math.min(1, a * 1.6)));
    const sx = a < 0.62 ? 1 : 1 - U.easeInCubic((a - 0.62) / 0.38);
    ctx.translate(960, 540); ctx.scale(Math.max(0.002, sx), sy); ctx.translate(-960, -540);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${U.clamp(a * 1.6)})`; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  return true;
}
function endCard(ctx, t, t0, tEnd) {
  const a = t - t0;
  if (a < 0) return;
  const fadeOut = U.clamp((tEnd - t) / 1.2);
  ctx.save();
  ctx.globalAlpha = U.clamp(a / 0.6) * fadeOut;
  // "WHO" in the bear's gold stamp, "WON?" in the rabbit's VHS caption
  const k1 = U.easeOutBack(U.clamp((a - 0.2) / 0.35), 2);
  goldText(ctx, 'WHO', 720, 430, 160, { scale: k1, flash: U.clamp(1 - (a - 0.2) / 0.15) });
  if (a > 0.7) {
    const txt = 'WON?';
    const n = Math.min(4, Math.floor((a - 0.7) / 0.08));
    ctx.font = '210px VT323'; const tw = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(7,3,18,0.9)'; ctx.fillRect(1010, 330, (tw + 40) * (n / 4), 175);
    vhsText(ctx, txt.slice(0, n), 1030, 480, 210, '#ffffff', 'left', 6);
  }
  if (a > 1.6) {
    const k = U.easeOutElastic(U.clamp((a - 1.6) / 0.7));
    ctx.save(); ctx.translate(640, 700); ctx.scale(k, k);
    ctx.save(); ctx.translate(-150, 0); ctx.scale(0.9, 0.9); I.drawSticker(ctx, 'star'); ctx.restore();
    goldText(ctx, 'TED', 60, 0, 70);
    ctx.restore();
  }
  if (a > 2.0) {
    ctx.save(); ctx.translate(1290, 700);
    ctx.globalAlpha *= Math.floor(a * 30) % 7 === 0 && a < 2.5 ? 0.3 : 1;
    ctx.save(); ctx.translate(-210, 0); I.drawNeon(ctx, 'cassette', t); ctx.restore();
    ctx.font = '96px VT323'; const fw = ctx.measureText('MR. FLOPPY').width;
    ctx.fillStyle = 'rgba(7,3,18,0.85)'; ctx.fillRect(-140, -55, fw + 30, 92);
    vhsText(ctx, 'MR. FLOPPY', -125, 22, 96, '#ffffff', 'left', 4);
    ctx.restore();
  }
  if (a > 2.6) {
    ctx.globalAlpha = U.clamp((a - 2.6) / 0.8) * fadeOut * 0.85;
    ctx.font = '34px Bungee'; ctx.textAlign = 'center'; ctx.fillStyle = '#d9c9b0';
    ctx.fillText('A  P L U S H   R A P   B A T T L E', 960, 905);
    vhsText(ctx, 'BE KIND, REWIND', 960, 975, 52, '#8fdcff', 'center', 2);
  }
  ctx.restore();
}

module.exports = { intro, roundCardTed, roundCardFloppy, blueScreen, hud, viewfinder, playbackOSD, crtOff, endCard, vhsText, goldText };
