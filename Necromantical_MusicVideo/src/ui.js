// Necromantical — ornate gothic UI (dialogue plate with painted cameo + typewriter lyrics,
// name plate, choice card, item banner, title menu). Drawn crisp on top of the painting.
'use strict';
(function () {
  const { clamp, lerp, W, H, TAU, range, canvas, rgba } = NM;
  const GOLD = '#c09a5a', GOLD_D = '#5a4020', CREAM = '#ece2d2', CRIM = '#e0203c';

  // ---------- ornate frame ----------
  function curl(g, x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(s * 0.6, 0, s, s * 0.3, s * 0.8, s * 0.7); g.bezierCurveTo(s * 0.65, s * 0.95, s * 0.35, s * 0.8, s * 0.45, s * 0.55); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(0, s * 0.6, s * 0.3, s, s * 0.7, s * 0.8); g.stroke();
    g.restore();
  }
  NM.ornateBox = function (g, x, y, w, h, a = 1, opt = {}) {
    if (a <= 0.01) return;
    g.save();
    g.globalAlpha = a;
    const bg = g.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, opt.top || 'rgba(22,10,18,0.82)'); bg.addColorStop(1, opt.bottom || 'rgba(6,3,6,0.9)');
    g.fillStyle = bg;
    g.fillRect(x, y, w, h);
    // inner vignette
    const vg = g.createRadialGradient(x + w / 2, y + h / 2, h * 0.2, x + w / 2, y + h / 2, w * 0.6);
    vg.addColorStop(0, 'rgba(60,20,30,0.18)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = vg; g.fillRect(x, y, w, h);
    g.strokeStyle = GOLD; g.lineWidth = 2; g.strokeRect(x + 6, y + 6, w - 12, h - 12);
    g.strokeStyle = GOLD_D; g.lineWidth = 1; g.strokeRect(x + 11, y + 11, w - 22, h - 22);
    g.strokeStyle = GOLD; g.lineWidth = 1.6;
    curl(g, x + 6, y + 6, 26, 0); curl(g, x + w - 6, y + 6, 26, Math.PI / 2); curl(g, x + w - 6, y + h - 6, 26, Math.PI); curl(g, x + 6, y + h - 6, 26, -Math.PI / 2);
    if (opt.gem !== false) {
      g.fillStyle = GOLD; g.beginPath(); g.moveTo(x + w / 2, y - 2); g.lineTo(x + w / 2 + 14, y + 6); g.lineTo(x + w / 2, y + 14); g.lineTo(x + w / 2 - 14, y + 6); g.closePath(); g.fill();
      g.fillStyle = CRIM; g.beginPath(); g.arc(x + w / 2, y + 6, 4.5, 0, TAU); g.fill();
      NM.glow(g, x + w / 2, y + 6, 16, '#ff2040', 0.6 * a);
    }
    g.restore();
  };

  NM.uiText = function (g, s, x, y, opt = {}) {
    g.save();
    g.font = opt.font || 'italic 46px "IM Fell English"';
    g.textBaseline = opt.base || 'alphabetic'; g.textAlign = opt.align || 'left';
    g.globalAlpha = opt.alpha ?? 1;
    g.shadowColor = opt.shadow || 'rgba(0,0,0,0.9)'; g.shadowBlur = opt.blur ?? 8; g.shadowOffsetY = 2;
    g.fillStyle = opt.color || CREAM;
    g.fillText(s, x, y);
    g.restore();
  };
  NM.uiTextW = (g, s, font) => { g.save(); g.font = font || 'italic 46px "IM Fell English"'; const w = g.measureText(s).width; g.restore(); return w; };

  // ---------- painted cameo portraits (cached per expression) ----------
  const cameoCache = new Map();
  function cameo(who, expr) {
    const key = who + '|' + expr;
    if (cameoCache.has(key)) return cameoCache.get(key);
    const c = canvas(180, 210), g = c.getContext('2d');
    const bg = g.createRadialGradient(90, 90, 10, 90, 105, 130);
    bg.addColorStop(0, who === 'lucien' ? '#2a3044' : '#3a1622'); bg.addColorStop(1, '#0a0608');
    g.fillStyle = bg; g.fillRect(0, 0, 180, 210);
    if (who === 'lucien') NM.paintLucien(g, 90, 96, 150, expr, 0, { noBlink: true, yaw: 0.15 });
    else NM.paintIsolde(g, 90, 96, 150, expr, 0, { noBlink: true, yaw: -0.15 });
    NM.kuwahara(c, 2, 4);
    cameoCache.set(key, c);
    return c;
  }
  NM.drawCameo = function (g, x, y, rx, ry, who, expr, a = 1) {
    g.save(); g.globalAlpha = a;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.save(); g.clip();
    g.drawImage(cameo(who, expr), x - rx, y - ry * 1.02, rx * 2, ry * 2.3);
    g.restore();
    g.strokeStyle = GOLD; g.lineWidth = 5; g.stroke();
    g.strokeStyle = GOLD_D; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, rx + 5, ry + 5, 0, 0, TAU); g.stroke();
    g.fillStyle = GOLD; for (const [dx, dy] of [[0, -ry - 6], [0, ry + 6]]) { g.beginPath(); g.arc(x + dx, y + dy, 5, 0, TAU); g.fill(); }
    g.restore();
  };

  // face expression per lyric line
  const EXPR = [
    'cold', 'smirk', 'cold', 'hungry', 'sad', 'tender', 'sad', 'smirk', 'cold', 'smirk', 'crazed', 'hungry',
    'crazed', 'tender', 'smile', 'smirk', 'tender', 'sad', 'smirk', 'cold', 'cold', 'crazed', 'tender', 'smile',
    'crazed', 'smirk', 'hungry', 'sad', 'tender', 'smirk', 'cold', 'smile', 'cold', 'crazed', 'sad', 'smirk',
    'crazed', 'cold', 'smirk', 'smile', 'tender', 'smirk', 'cold', 'tender', 'crazed', 'sad', 'smirk', 'cold',
  ];
  NM.EXPR = EXPR;

  // ---------- dialogue plate driven by the lyric timeline ----------
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
    for (const [s0, s1] of blocks) best = Math.max(best, range(s0, s0 + 0.35, t) * (1 - range(s1, s1 + 0.35, t)));
    return best;
  }
  NM.msgOpenAmount = msgOpenAmount;

  NM.drawMessage = function (g, t, post) {
    const open = msgOpenAmount(t) * (post.msgOpen ?? 1);
    if (open <= 0.01) return false;
    const x = 250, y = 872, w = 1420, h = 160;
    const a = NM.ease.inOutSine(open);
    g.save();
    g.translate(0, (1 - a) * 18);
    NM.ornateBox(g, x, y, w, h, a);
    const i = NM.lineIndexAt(t);
    const L = i >= 0 ? NM.T.lines[i] : null;
    const who = post.speaker || 'isolde';
    const expr = post.face || (i >= 0 ? EXPR[i] : 'cold');
    NM.drawCameo(g, x + 92, y + h / 2 - 4, 62, 74, who, expr, a);
    // name plate
    const name = post.name || 'Isolde';
    g.save(); g.globalAlpha = a;
    g.font = '40px "UnifrakturMaguntia"';
    const nw = g.measureText(name).width + 74;
    NM.ornateBox(g, x + 180, y - 30, nw, 52, a, { gem: false, top: 'rgba(30,8,14,0.95)', bottom: 'rgba(10,2,6,0.95)' });
    g.restore();
    NM.uiText(g, name, x + 205, y + 10, { font: '40px "UnifrakturMaguntia"', color: CRIM, alpha: a, shadow: 'rgba(255,30,60,0.6)', blur: 12 });
    if (L && open > 0.6) {
      const font = 'italic 46px "IM Fell English"';
      const total = L.text.length;
      const prog = clamp((t - L.start + 0.15) / Math.max(0.6, (L.end - L.start) * 0.85));
      const shownF = total * prog;
      const shown = Math.floor(shownF);
      const tx = x + 200, ty = y + 92;
      // the title word inked crimson; newest letter fades in
      let cx = tx;
      g.save(); g.font = font;
      const m = L.text.match(/^(Necromantical)(.*)$/);
      const parts = m ? [[m[1], '#ff3a52'], [m[2], CREAM]] : [[L.text, CREAM]];
      let idx = 0;
      for (const [str, col] of parts) {
        for (const ch of str) {
          if (idx > shown) break;
          const fa = idx < shown ? 1 : shownF - shown;
          NM.uiText(g, ch, cx, ty, { font, color: col, alpha: a * fa, shadow: col === CREAM ? 'rgba(0,0,0,0.9)' : 'rgba(255,30,60,0.7)', blur: col === CREAM ? 8 : 14 });
          cx += g.measureText(ch).width;
          idx++;
        }
      }
      g.restore();
      if (shown >= total) {
        const b = 0.5 + 0.5 * Math.sin(t * 6);
        g.save(); g.globalAlpha = a * b; g.fillStyle = GOLD;
        g.beginPath(); g.moveTo(x + w - 46, y + h - 40); g.lineTo(x + w - 30, y + h - 40); g.lineTo(x + w - 38, y + h - 28); g.closePath(); g.fill(); g.restore();
      }
    }
    g.restore();
    return true;
  };

  // centred subtitle (title screen)
  NM.drawSubtitle = function (g, t, opt = {}) {
    const i = NM.lineIndexAt(t);
    if (i < 0) return false;
    const L = NM.T.lines[i];
    const a = range(L.start - 0.3, L.start + 0.1, t);
    const prog = clamp((t - L.start + 0.15) / Math.max(0.6, (L.end - L.start) * 0.85));
    const font = 'italic 44px "IM Fell English"';
    const wFull = NM.uiTextW(g, L.text, font);
    g.save(); g.font = font;
    let cx = W / 2 - wFull / 2;
    const shownF = L.text.length * prog;
    [...L.text].forEach((ch, k) => {
      if (k > shownF) return;
      NM.uiText(g, ch, cx, opt.y ?? 1010, { font, alpha: a * clamp(shownF - k), color: opt.color || CREAM });
      cx += g.measureText(ch).width;
    });
    g.restore();
    return true;
  };

  // ---------- choice card ----------
  NM.choiceCard = function (g, t, title, options, sel, a, blink) {
    if (a <= 0.01) return;
    const w = 860, h = 120 + options.length * 70, x = (W - w) / 2, y = 300;
    NM.ornateBox(g, x, y, w, h, a);
    NM.uiText(g, title, W / 2, y + 74, { font: '44px "Cinzel"', align: 'center', color: '#e8c8a8', alpha: a });
    options.forEach((o, k) => {
      const yy = y + 150 + k * 70;
      const on = k === sel;
      if (on && (!blink || Math.floor(t * 10) % 2 === 0)) {
        g.save(); g.globalAlpha = a * 0.85;
        const hg = g.createLinearGradient(x + 60, 0, x + w - 60, 0);
        hg.addColorStop(0, 'rgba(160,10,30,0)'); hg.addColorStop(0.5, 'rgba(160,10,30,0.75)'); hg.addColorStop(1, 'rgba(160,10,30,0)');
        g.fillStyle = hg; g.fillRect(x + 60, yy - 44, w - 120, 58); g.restore();
        NM.flame(g, x + 110, yy - 14, 22, t, 3, { color: '#ffcf7a', glowR: 3, glowA: 0.5 * a });
      }
      NM.uiText(g, o, W / 2, yy, { font: 'italic 46px "IM Fell English"', align: 'center', color: on ? '#ffe8e8' : '#9a8aa0', alpha: a });
    });
  };

  // ---------- item banner ----------
  NM.itemBanner = function (g, t, text, a, icon) {
    if (a <= 0.01) return;
    const font = '40px "Cinzel"';
    const tw = NM.uiTextW(g, text.replace(/[\[\]]/g, ''), font);
    const w = tw + 200, h = 100, x = (W - w) / 2, y = 70;
    NM.ornateBox(g, x, y, w, h, a);
    if (icon) icon(g, x + 70, y + h / 2);
    let cx = x + 120;
    for (const p of text.split(/(\[[^\]]+\])/)) {
      if (!p) continue;
      const hl = p.startsWith('[');
      const s = hl ? p.slice(1, -1) : p;
      NM.uiText(g, s, cx, y + 64, { font, color: hl ? '#ff5a6e' : '#e8d8c0', alpha: a, shadow: hl ? 'rgba(255,40,70,0.7)' : 'rgba(0,0,0,0.9)', blur: hl ? 14 : 8 });
      cx += NM.uiTextW(g, s, font);
    }
  };

  // ---------- title menu ----------
  NM.titleMenu = function (g, t, sel, a, blink) {
    if (a <= 0.01) return;
    const opts = ['New Game', 'Continue', 'Shutdown'];
    opts.forEach((o, k) => {
      const yy = 720 + k * 64;
      const on = k === sel;
      if (on && (!blink || Math.floor(t * 12) % 2 === 0)) {
        NM.flame(g, W / 2 - 170, yy - 12, 22, t, 5, { color: '#ffcf7a', glowR: 4, glowA: 0.6 * a });
        NM.flame(g, W / 2 + 170, yy - 12, 22, t, 9, { color: '#ffcf7a', glowR: 4, glowA: 0.6 * a });
      }
      NM.uiText(g, o, W / 2, yy, { font: '42px "Cinzel"', align: 'center', color: on ? '#ffe2c8' : k === 1 ? '#6a5a6a' : '#b8a8b0', alpha: a, shadow: on ? 'rgba(255,120,60,0.6)' : 'rgba(0,0,0,0.9)', blur: on ? 16 : 8 });
    });
  };

  // ---------- dispatcher ----------
  NM.drawUI = function (g, t, post) {
    let drew = false;
    if (NM.SHOW_LYRICS !== false) {
      if (post.ui === 'msg') drew = NM.drawMessage(g, t, post) || drew;
      else if (post.ui === 'sub') drew = NM.drawSubtitle(g, t, post.subOpt || {}) || drew;
    }
    if (post.extraUI) for (const f of post.extraUI) { f(g); drew = true; }
    return drew;
  };
})();
