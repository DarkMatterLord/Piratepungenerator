// Frame assembly: picks the style for the current beat, renders the story,
// then draws the karaoke captions and the style label on top.
window.APP = (() => {
  const { clamp, lerp, rgb, TAU } = U;
  const SC = window.SCORE;
  const SPB = SC.secondsPerBeat;
  const DUR = SC.duration;

  function styleAt(t) {
    const i = clamp(Math.floor(t / SPB + 1e-6), 0, STYLES.length - 1);
    return [i, STYLES[i]];
  }

  function makeFrame(t, W, H, style, beat) {
    const fps = style.fps || 30;
    // Stop-motion styles hold frames, but never across the style's own beat start.
    const beatStart = beat * SPB;
    const tq = style.fps ? beatStart + Math.floor((t - beatStart) * fps + 1e-6) / fps : t;
    const hold = Math.floor(t * fps + 1e-6);
    const S = STORY.scene(tq);
    const C = R2D.camera(S.cam, W, H);
    const F = { t: tq, tReal: t, b: tq / SPB, beat, lb: t / SPB - beat, W, H, u: H / 720, S, C, hold, style };
    F.groups = R2D.buildGroups(S, C);
    return F;
  }

  // ---------------- captions ----------------
  const lineSyl = SC.lines.map((l) => SC.syllables.filter((s) => s.line === l.index));
  function currentLine(b) {
    for (let i = 0; i < SC.lines.length; i++) {
      const l = SC.lines[i];
      const next = SC.lines[i + 1];
      const end = next ? Math.min(next.start - 0.25, l.end + 1.5) : l.end + 2;
      if (b >= l.start - 0.75 && b < end) return i;
    }
    return -1;
  }
  function drawCaptions(ctx, t, W, H) {
    const b = t / SPB;
    const li = currentLine(b);
    if (li < 0) return;
    const syl = lineSyl[li];
    const u = H / 720;
    const size = Math.round(H * 0.052);
    ctx.save();
    ctx.font = `${size}px 'Luckiest Guy', 'Inter', sans-serif`;
    ctx.textBaseline = 'alphabetic';
    // lay out syllables
    const parts = syl.map((s, i) => ({ s, txt: (i && !s.joinPrev ? ' ' : '') + s.text }));
    let total = 0;
    for (const p of parts) { p.w = ctx.measureText(p.txt).width; p.x = total; total += p.w; }
    const fit = Math.min(1, (W * 0.92) / total);
    const x0 = W / 2 - (total * fit) / 2;
    const y = H - H * 0.075;
    const fadeIn = clamp((b - (SC.lines[li].start - 0.75)) / 0.4);
    ctx.globalAlpha = fadeIn;
    // backing pill
    ctx.fillStyle = 'rgba(10,12,28,0.55)';
    const padX = size * 0.6, ph = size * 1.35;
    roundRect(ctx, x0 - padX, y - size * 1.05, total * fit + padX * 2, ph, ph / 2);
    ctx.fill();
    ctx.translate(x0, y);
    ctx.scale(fit, 1);
    ctx.lineJoin = 'round';
    let hop = null;
    for (const p of parts) {
      const s = p.s;
      const prog = clamp((b - s.beat) / Math.max(0.15, s.dur * 0.6));
      ctx.lineWidth = size * 0.16;
      ctx.strokeStyle = 'rgba(20,16,40,0.95)';
      ctx.strokeText(p.txt, p.x, 0);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(p.txt, p.x, 0);
      if (prog > 0) {
        ctx.save();
        ctx.beginPath(); ctx.rect(p.x - 2, -size * 1.2, p.w * prog + 2, size * 1.6); ctx.clip();
        ctx.fillStyle = '#FFD84A';
        ctx.fillText(p.txt, p.x, 0);
        ctx.restore();
      }
      if (b >= s.beat - 0.02 && b < s.beat + s.dur) hop = { p, f: (b - s.beat) / s.dur };
    }
    // little turtle hopping over the sung syllable
    if (hop) {
      const lead = hop.p.txt.startsWith(' ') ? ctx.measureText(' ').width : 0;
      const cx = hop.p.x + lead + (hop.p.w - lead) / 2;
      const hgt = Math.sin(Math.min(1, hop.f * 1.6) * Math.PI) * size * 0.35;
      ctx.scale(1 / fit, 1);
      drawMiniTurtle(ctx, cx * fit, -size * 1.18 - hgt, size * 0.42);
    }
    ctx.restore();
  }
  function drawMiniTurtle(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = s * 0.09; ctx.strokeStyle = '#14211A';
    ctx.fillStyle = '#86C96E';
    ctx.beginPath(); ctx.arc(s * 0.62, -s * 0.12, s * 0.2, 0, TAU); ctx.fill(); ctx.stroke();
    for (const lx of [-0.32, 0.28]) { ctx.beginPath(); ctx.ellipse(lx * s, s * 0.02, s * 0.11, s * 0.1, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#3E9442';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.42, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E2363C';
    ctx.beginPath(); ctx.ellipse(s * 0.64, -s * 0.27, s * 0.17, s * 0.1, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(s * 0.7, -s * 0.15, s * 0.045, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------------- style label ----------------
  const CAT_COL = { '2D': '#4FC3F7', '3D': '#FFB74D', CLAYMATION: '#F06292', 'STOP-MOTION': '#AED581', ART: '#BA68C8', RETRO: '#4DD0E1', CRAFT: '#FFD54F', OTHER: '#90A4AE' };
  function drawLabel(ctx, i, style, W, H, t) {
    const u = H / 720;
    const lb = t / SPB - i;
    ctx.save();
    ctx.globalAlpha = 0.92;
    const size = Math.round(15 * u);
    ctx.font = `${size}px 'Luckiest Guy', 'Inter', sans-serif`;
    const num = `${String(i + 1).padStart(2, '0')}/80`;
    const name = style.name.toUpperCase();
    const cat = style.cat;
    const wNum = ctx.measureText(num).width, wName = ctx.measureText(name).width;
    ctx.font = `${Math.round(11 * u)}px 'Luckiest Guy', 'Inter', sans-serif`;
    const wCat = ctx.measureText(cat).width;
    const pad = 9 * u, gap = 8 * u;
    const w = pad * 2 + wNum + gap + wName + gap + wCat + 12 * u;
    const h = size + pad * 1.3;
    const x = 14 * u, y = 14 * u;
    // slide-in on every style change
    const slide = (1 - clamp(lb / 0.12)) * -10 * u;
    ctx.translate(slide, 0);
    ctx.fillStyle = 'rgba(10,12,28,0.62)';
    roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px 'Luckiest Guy', 'Inter', sans-serif`;
    ctx.fillStyle = '#FFD84A';
    ctx.fillText(num, x + pad, y + h / 2 + 1 * u);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(name, x + pad + wNum + gap, y + h / 2 + 1 * u);
    const cx = x + pad + wNum + gap + wName + gap;
    ctx.fillStyle = CAT_COL[cat] || '#ccc';
    roundRect(ctx, cx, y + h * 0.2, wCat + 12 * u, h * 0.6, h * 0.3); ctx.fill();
    ctx.font = `${Math.round(11 * u)}px 'Luckiest Guy', 'Inter', sans-serif`;
    ctx.fillStyle = '#10121C';
    ctx.fillText(cat, cx + 6 * u, y + h / 2 + 1 * u);
    ctx.restore();
  }

  // ---------------- frame ----------------
  const opts = { captions: true, label: true };
  // Stop-motion styles hold frames: reuse the held picture and only redraw the overlays.
  let held = null;
  function renderFrame(ctx, t, W, H) {
    t = clamp(t, 0, DUR - 1e-4);
    const [i, style] = styleAt(t);
    const beatStart = i * SPB;
    const key = style.fps ? `${i}:${Math.floor((t - beatStart) * style.fps + 1e-6)}:${W}x${H}` : null;
    if (key && held && held.key === key) {
      ctx.drawImage(held.canvas, 0, 0);
    } else {
      const F = makeFrame(t, W, H, style, i);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      style.draw(ctx, F);
      ctx.restore();
      if (key) {
        if (!held) held = { canvas: document.createElement('canvas') };
        held.canvas.width = W; held.canvas.height = H;
        held.canvas.getContext('2d').drawImage(ctx.canvas, 0, 0);
        held.key = key;
      }
    }
    if (opts.captions) drawCaptions(ctx, t, W, H);
    if (opts.label) drawLabel(ctx, i, style, W, H, t);
    return { index: i, style };
  }

  // Debug/gallery helper: render time t with an explicit style object.
  function renderWith(ctx, t, W, H, style) {
    const i = clamp(Math.floor(t / SPB + 1e-6), 0, 79);
    const F = makeFrame(t, W, H, style, i);
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    style.draw(ctx, F);
    ctx.restore();
  }

  return { renderFrame, renderWith, styleAt, makeFrame, opts, DUR, SPB };
})();
