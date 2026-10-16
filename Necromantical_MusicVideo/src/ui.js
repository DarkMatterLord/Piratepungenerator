// Necromantical — RPG Maker style UI: message window with face graphic + typewriter lyrics,
// name box, choice / item / status windows, title menu.
'use strict';
(function () {
  const { clamp, lerp, W, H, TAU, range } = NM;
  const FONT = '"DotGothic16"';

  // ---------- window skin ----------
  NM.uiWindow = function (ctx, x, y, w, h, open = 1, opt = {}) {
    if (open <= 0.02) return false;
    const hh = Math.max(2, Math.round(h * open));
    const yy = Math.round(y + (h - hh) / 2);
    ctx.save();
    const g = ctx.createLinearGradient(0, yy, 0, yy + hh);
    g.addColorStop(0, opt.top || 'rgba(26,12,28,0.94)');
    g.addColorStop(1, opt.bottom || 'rgba(6,3,9,0.94)');
    ctx.fillStyle = g;
    ctx.fillRect(x + 1, yy + 1, w - 2, hh - 2);
    // double border
    ctx.fillStyle = opt.border || '#d8cfe6';
    ctx.fillRect(x + 1, yy, w - 2, 1); ctx.fillRect(x + 1, yy + hh - 1, w - 2, 1);
    ctx.fillRect(x, yy + 1, 1, hh - 2); ctx.fillRect(x + w - 1, yy + 1, 1, hh - 2);
    ctx.fillStyle = opt.inner || '#6a5d8a';
    ctx.fillRect(x + 3, yy + 2, w - 6, 1); ctx.fillRect(x + 3, yy + hh - 3, w - 6, 1);
    ctx.fillRect(x + 2, yy + 3, 1, hh - 6); ctx.fillRect(x + w - 3, yy + 3, 1, hh - 6);
    // crimson corner gems
    if (hh > 10) {
      ctx.fillStyle = opt.gem || '#e0203c';
      for (const [cx, cy] of [[x + 1, yy + 1], [x + w - 4, yy + 1], [x + 1, yy + hh - 4], [x + w - 4, yy + hh - 4]]) {
        ctx.fillRect(cx + 1, cy, 1, 3); ctx.fillRect(cx, cy + 1, 3, 1);
      }
    }
    ctx.restore();
    return open > 0.98;
  };

  NM.uiText = function (ctx, s, x, y, opt = {}) {
    ctx.save();
    ctx.font = `${opt.size || 16}px ${opt.font || FONT}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = opt.align || 'left';
    if (opt.shadow !== false) { ctx.fillStyle = opt.shadowColor || '#000'; ctx.fillText(s, Math.round(x) + 1, Math.round(y) + 1); }
    ctx.fillStyle = opt.color || '#f2ece6';
    ctx.fillText(s, Math.round(x), Math.round(y));
    ctx.restore();
  };
  NM.uiTextW = function (ctx, s, size = 16, font = FONT) { ctx.save(); ctx.font = `${size}px ${font}`; const w = ctx.measureText(s).width; ctx.restore(); return w; };

  // blinking "next" arrow
  function nextArrow(ctx, x, y, t) {
    const b = Math.floor(t * 3) % 2;
    ctx.fillStyle = '#e8203c';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 3 + i, y + b + i, 7 - i * 2, 1);
  }

  // ---------- face graphic (pre-quantized) ----------
  let faceC = null;
  function faceGraphic(ctx, x, y, size, who, expr, t) {
    if (!faceC) faceC = NM.canvas(64, 64);
    const fg = faceC.getContext('2d');
    fg.setTransform(1, 0, 0, 1, 0, 0);
    fg.clearRect(0, 0, 64, 64);
    fg.fillStyle = who === 'lucien' ? '#141022' : '#1a0a14';
    fg.fillRect(0, 0, size, size);
    fg.save();
    fg.beginPath(); fg.rect(0, 0, size, size); fg.clip();
    if (who === 'lucien') NM.lucienFace(fg, size / 2, size * 0.56, size * 0.95, expr, t);
    else NM.isoldeFace(fg, size / 2, size * 0.56, size * 0.95, expr, t);
    fg.restore();
    NM.quantize(faceC, who === 'lucien' ? 'corpse' : 'portrait', 0.6, 0, 0, size, size);
    ctx.drawImage(faceC, 0, 0, size, size, x, y, size, size);
    // frame
    ctx.fillStyle = '#6a5d8a';
    ctx.fillRect(x - 1, y - 1, size + 2, 1); ctx.fillRect(x - 1, y + size, size + 2, 1); ctx.fillRect(x - 1, y, 1, size); ctx.fillRect(x + size, y, 1, size);
  }
  NM.faceGraphic = faceGraphic;

  // face expression per lyric line (index into NM.T.lines)
  const EXPR = [
    'cold', 'smirk', 'cold', 'hungry', // intro
    'sad', 'tender', 'sad', 'smirk', // verse 1
    'cold', 'smirk', 'crazed', 'hungry', // pre 1
    'crazed', 'tender', 'smile', 'smirk', // chorus 1
    'tender', 'sad', 'smirk', 'cold', // verse 2
    'cold', 'crazed', 'tender', 'smile', // pre 2
    'crazed', 'smirk', 'hungry', 'sad', // chorus 2
    'tender', 'smirk', 'cold', 'smile', // interlude
    'cold', 'crazed', 'sad', 'smirk', // bridge
    'crazed', 'cold', 'smirk', 'smile', // chorus 3
    'tender', 'smirk', 'cold', 'tender', // outro A
    'crazed', 'sad', 'smirk', 'cold', // outro B
  ];
  NM.EXPR = EXPR;

  // word-wrap for the message box
  function wrap(ctx, s, maxW) {
    const words = s.split(' ');
    const lines = [''];
    for (const w of words) {
      const cand = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w;
      if (ctx.measureText(cand).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = cand;
    }
    return lines;
  }

  // ---------- message window driven by the lyric timeline ----------
  // window stays open while lines follow each other closely; opens/closes over 0.15s
  let blocks = null;
  function msgOpenAmount(t) {
    if (!blocks) {
      blocks = [];
      for (const l of NM.T.lines) {
        const s0 = l.start - 0.45, s1 = l.end + 1.2;
        const last = blocks[blocks.length - 1];
        if (last && s0 - last[1] < 0.8) last[1] = Math.max(last[1], s1); else blocks.push([s0, s1]);
      }
    }
    let best = 0;
    for (const [s0, s1] of blocks) best = Math.max(best, range(s0, s0 + 0.15, t) * (1 - range(s1, s1 + 0.15, t)));
    return best;
  }
  NM.msgOpenAmount = msgOpenAmount;

  NM.drawMessage = function (ctx, t, post) {
    const open = msgOpenAmount(t) * (post.msgOpen ?? 1);
    const x = 6, y = 200, w = 468, h = 64;
    const full = NM.uiWindow(ctx, x, y, w, h, open);
    if (!full) return open > 0.02;
    const i = NM.lineIndexAt(t);
    const L = i >= 0 ? NM.T.lines[i] : null;
    const who = post.speaker || 'isolde';
    const expr = post.face || (i >= 0 ? EXPR[i] : 'cold');
    faceGraphic(ctx, x + 8, y + 8, 48, who, expr, t);
    // name box
    const name = post.name || 'Isolde';
    const nw = NM.uiTextW(ctx, name) + 16;
    NM.uiWindow(ctx, x, y - 19, nw, 19, 1, { gem: '#00000000' });
    NM.uiText(ctx, name, x + 8, y - 17, { color: '#ff5a6e' });
    if (!L) return true;
    ctx.save();
    ctx.font = `16px ${FONT}`;
    const lines = wrap(ctx, L.text, w - 80);
    const total = L.text.length;
    const shown = Math.floor(total * clamp((t - L.start + 0.2) / Math.max(0.6, (L.end - L.start) * 0.82)));
    let left = shown;
    lines.forEach((ln, k) => {
      const part = ln.slice(0, Math.max(0, left));
      left -= ln.length + 1;
      // the title word is inked crimson
      const m = part.match(/^(Necromantical)(.*)$/);
      const tx = x + 66, ty = y + 10 + k * 20;
      if (m) {
        NM.uiText(ctx, m[1], tx, ty, { color: '#ff3a52' });
        NM.uiText(ctx, m[2], tx + NM.uiTextW(ctx, m[1]), ty);
      } else NM.uiText(ctx, part, tx, ty);
    });
    ctx.restore();
    if (shown >= total) nextArrow(ctx, x + w - 14, y + h - 12, t);
    return true;
  };

  // centred subtitle style (title screen, cut-ins)
  NM.drawSubtitle = function (ctx, t, opt = {}) {
    const i = NM.lineIndexAt(t);
    if (i < 0) return false;
    const L = NM.T.lines[i];
    const a = range(L.start - 0.3, L.start, t);
    const total = L.text.length;
    const shown = Math.floor(total * clamp((t - L.start + 0.2) / Math.max(0.6, (L.end - L.start) * 0.82)));
    if (a < 0.5) return false;
    const s = L.text.slice(0, shown);
    const y = opt.y ?? 236;
    ctx.save(); ctx.font = `16px ${FONT}`;
    const wFull = ctx.measureText(L.text).width;
    ctx.restore();
    NM.uiText(ctx, s, W / 2 - wFull / 2, y, { color: opt.color || '#f2ece6' });
    return true;
  };

  // ---------- choice window ----------
  NM.choiceWindow = function (ctx, x, y, options, sel, open, t, opt = {}) {
    const w = opt.w || 200, h = 12 + options.length * 20;
    if (!NM.uiWindow(ctx, x, y, w, h, open)) return;
    options.forEach((o, k) => {
      if (k === sel) {
        const pulse = 0.55 + 0.25 * Math.sin(t * 8);
        ctx.fillStyle = `rgba(196,18,47,${pulse})`;
        ctx.fillRect(x + 6, y + 6 + k * 20, w - 12, 19);
        ctx.fillStyle = '#ffd0d6';
        ctx.fillRect(x + 6, y + 6 + k * 20, w - 12, 1); ctx.fillRect(x + 6, y + 24 + k * 20, w - 12, 1);
      }
      NM.uiText(ctx, o, x + 14, y + 8 + k * 20, { color: opt.colors?.[k] || '#f2ece6' });
    });
  };

  // ---------- popup (item get etc.) ----------
  NM.popup = function (ctx, text, open, opt = {}) {
    ctx.save(); ctx.font = `16px ${FONT}`;
    const tw = ctx.measureText(text.replace(/[\[\]]/g, '')).width;
    ctx.restore();
    const iconW = opt.icon ? 20 : 0;
    const w = Math.round(tw + 28 + iconW), h = 30;
    const x = Math.round(W / 2 - w / 2), y = opt.y ?? 40;
    if (!NM.uiWindow(ctx, x, y, w, h, open)) return;
    let cx = x + 14;
    if (opt.icon) { opt.icon(ctx, cx + 7, y + 15); cx += iconW; }
    // [bracketed] words are highlighted
    const parts = text.split(/(\[[^\]]+\])/);
    for (const p of parts) {
      if (!p) continue;
      const hl = p.startsWith('[');
      const s = hl ? p.slice(1, -1) : p;
      NM.uiText(ctx, s, cx, y + 7, { color: hl ? '#ff5a6e' : '#f2ece6' });
      cx += NM.uiTextW(ctx, s);
    }
  };

  // ---------- gauge ----------
  NM.gauge = function (ctx, x, y, w, k, c1, c2) {
    ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = '#2a1a24'; ctx.fillRect(x, y, w, 4);
    const fw = Math.round(w * clamp(k));
    ctx.fillStyle = c1; ctx.fillRect(x, y, fw, 4);
    ctx.fillStyle = c2; ctx.fillRect(x, y, fw, 1);
  };

  // ---------- title-screen menu ----------
  NM.titleMenu = function (ctx, t, sel, open, blink) {
    const opts = ['New Game', 'Continue', 'Shutdown'];
    const x = W / 2 - 64, y = 178, w = 128, h = 70;
    if (!NM.uiWindow(ctx, x, y, w, h, open)) return;
    opts.forEach((o, k) => {
      const on = k === sel;
      if (on && (!blink || Math.floor(t * 12) % 2 === 0)) {
        ctx.fillStyle = 'rgba(196,18,47,0.75)'; ctx.fillRect(x + 6, y + 6 + k * 19, w - 12, 18);
      }
      NM.uiText(ctx, o, W / 2, y + 7 + k * 19, { align: 'center', color: k === 1 ? '#7a6a80' : '#f2ece6' });
    });
  };

  // ---------- main UI dispatcher ----------
  NM.drawUI = function (ctx, t, post) {
    let drew = false;
    if (NM.SHOW_LYRICS !== false) {
      if (post.ui === 'msg') drew = NM.drawMessage(ctx, t, post) || drew;
      else if (post.ui === 'sub') drew = NM.drawSubtitle(ctx, t, post.subOpt || {}) || drew;
    }
    if (post.extraUI) for (const f of post.extraUI) { f(ctx); drew = true; }
    return drew;
  };
})();
