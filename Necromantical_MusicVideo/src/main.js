// Necromantical — timeline, shot compositing and frame entry point.
// Pipeline per frame: shot(s) -> 480x270 "game" canvas -> palette quantize + dither
//   -> UI layer (message window etc.) -> 4x nearest-neighbour upscale -> CRT finish.
'use strict';
(function () {
  const { clamp, canvas, W, H, FW, FH, PX } = NM;

  // opts.in: { type: 'fade' | 'black' | 'white' | 'red', dur }   transition into this shot
  // opts.out: { dur, color }                                       fade out at the end of this shot
  NM.SHOTS = [];
  NM.shot = function (start, end, draw, opts = {}) {
    NM.SHOTS.push({ start, end, draw, in: opts.in || null, out: opts.out || null, name: opts.name || '', pal: opts.pal || 'night', ui: opts.ui });
  };

  let lo, bufA, bufB, uiC, main;
  NM.initBuffers = function (mainCanvas) {
    main = mainCanvas;
    lo = canvas(W, H);
    bufA = canvas(W, H);
    bufB = canvas(W, H);
    uiC = canvas(W, H);
  };

  function shotIndexAt(t) {
    const S = NM.SHOTS;
    for (let i = S.length - 1; i >= 0; i--) if (t >= S[i].start) return t < S[i].end ? i : -1;
    return -1;
  }
  NM.shotIndexAt = shotIndexAt;

  function newPost(shot) {
    return {
      pal: shot ? shot.pal : 'night', dither: 1, flash: 0, flashColor: '#ffffff', tint: null,
      shake: 0, glitch: 0, ui: shot && shot.ui !== undefined ? shot.ui : 'msg', face: null, name: 'Isolde',
      bloom: 0.22, scan: 1, vignette: 1, quantize: true, chroma: 0, extraUI: null,
    };
  }

  function drawShot(cv, shot, t, post) {
    const ctx = cv.getContext('2d');
    const d = shot.end - shot.start;
    const S = { t, lt: t - shot.start, d, p: clamp((t - shot.start) / d), post, shot, ctx };
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    shot.draw(ctx, S);
    ctx.restore();
    if (shot.out) {
      const k = clamp((t - (shot.end - shot.out.dur)) / shot.out.dur);
      if (k > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = shot.out.color || '#000'; ctx.globalAlpha = k; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
    if (post.tint) {
      ctx.save(); ctx.globalCompositeOperation = post.tint.mode || 'multiply'; ctx.globalAlpha = clamp(post.tint.a ?? 1);
      ctx.fillStyle = post.tint.color; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  NM.renderFrame = function (t) {
    const i = shotIndexAt(t);
    const shot = i >= 0 ? NM.SHOTS[i] : null;
    const post = newPost(shot);
    const g = lo.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!shot) {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    } else {
      const tin = shot.in;
      if (tin && t < shot.start + tin.dur) {
        const k = clamp((t - shot.start) / tin.dur);
        if (tin.type === 'fade' && i > 0) {
          const prevPost = newPost(NM.SHOTS[i - 1]);
          drawShot(bufA, NM.SHOTS[i - 1], t, prevPost);
          drawShot(bufB, shot, t, post);
          // stepped dissolve (RPG Maker style) — quantized afterwards with the incoming palette
          g.globalAlpha = 1; g.drawImage(bufA, 0, 0);
          g.globalAlpha = Math.round(NM.ease.inOutSine(k) * 8) / 8; g.drawImage(bufB, 0, 0);
          g.globalAlpha = 1;
          if (k < 0.5) post.pal = prevPost.pal;
        } else {
          drawShot(lo, shot, t, post);
          if (tin.type === 'black') {
            g.fillStyle = '#000'; g.globalAlpha = Math.round((1 - NM.ease.inOutSine(k)) * 10) / 10; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
          } else if (tin.type === 'white' || tin.type === 'red') {
            post.flash = Math.max(post.flash, (1 - k) ** 1.5);
            post.flashColor = tin.type === 'white' ? '#ffffff' : '#ff2040';
          }
        }
      } else {
        drawShot(lo, shot, t, post);
      }
    }
    // screen flash (pre-quantize so it dithers like the real thing)
    if (post.flash > 0.01) {
      g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(post.flash); g.fillStyle = post.flashColor; g.fillRect(0, 0, W, H); g.restore();
    }
    if (post.quantize) NM.quantize(lo, post.pal, post.dither);
    if (post.glitch > 0) NM.glitch(lo, t, post.glitch);

    // UI layer (not palette-quantized; hard alpha so text stays crisp)
    const ug = uiC.getContext('2d');
    ug.setTransform(1, 0, 0, 1, 0, 0);
    ug.clearRect(0, 0, W, H);
    const drewUI = NM.drawUI(ug, t, post);
    if (drewUI) { NM.hardAlpha(uiC); g.drawImage(uiC, 0, 0); }

    NM.finish(main, lo, t, post);
  };
})();
