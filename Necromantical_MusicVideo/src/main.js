// Necromantical — timeline, shot compositing and frame entry point.
// Pipeline per frame: shot(s) -> 1920x1080 scene canvas -> oil-paint pass (Kuwahara + brush
//   strokes + canvas) -> colour grade -> finish (bloom, flash, vignette, grain) -> UI layer.
'use strict';
(function () {
  const { clamp, canvas, W, H } = NM;

  // opts.in: { type: 'fade' | 'black' | 'white' | 'red', dur }   transition into this shot
  // opts.out: { dur, color }                                       fade out at the end of this shot
  // opts.grade / opts.paint: per-shot colour grade and paint-filter settings
  NM.SHOTS = [];
  NM.shot = function (start, end, draw, opts = {}) {
    NM.SHOTS.push({ start, end, draw, in: opts.in || null, out: opts.out || null, name: opts.name || '', ui: opts.ui, grade: opts.grade, paint: opts.paint });
  };

  let scene, bufA, bufB, main;
  NM.initBuffers = function (mainCanvas) {
    main = mainCanvas;
    scene = canvas(W, H);
    bufA = canvas(W, H);
    bufB = canvas(W, H);
  };

  function shotIndexAt(t) {
    const S = NM.SHOTS;
    for (let i = S.length - 1; i >= 0; i--) if (t >= S[i].start) return t < S[i].end ? i : -1;
    return -1;
  }
  NM.shotIndexAt = shotIndexAt;

  function newPost(shot) {
    return {
      flash: 0, flashColor: '#ffffff', shake: 0, glitch: 0, chroma: 0,
      ui: shot && shot.ui !== undefined ? shot.ui : 'msg', face: null, name: 'Isolde',
      bloom: 0.38, vignette: 1, grain: 0.06, extraUI: null,
      paint: Object.assign({ r: 6, sharp: 2, strokes: 0.6, weave: 0.22, blotch: 0.32 }, shot && shot.paint),
      grade: shot && shot.grade !== undefined ? shot.grade : { shadow: '#140a1c', light: '#e8b48a', amount: 0.35 },
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
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    shot.draw(ctx, S);
    ctx.restore();
    if (shot.out) {
      const k = clamp((t - (shot.end - shot.out.dur)) / shot.out.dur);
      if (k > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = shot.out.color || '#000'; ctx.globalAlpha = NM.ease.inOutSine(k); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
  }

  NM.renderFrame = function (t) {
    const i = shotIndexAt(t);
    const shot = i >= 0 ? NM.SHOTS[i] : null;
    const post = newPost(shot);
    const g = scene.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!shot) {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    } else {
      const tin = shot.in;
      if (tin && t < shot.start + tin.dur) {
        const k = clamp((t - shot.start) / tin.dur);
        if (tin.type === 'fade' && i > 0) {
          drawShot(bufA, NM.SHOTS[i - 1], t, newPost(NM.SHOTS[i - 1]));
          drawShot(bufB, shot, t, post);
          g.globalAlpha = 1; g.drawImage(bufA, 0, 0);
          g.globalAlpha = NM.ease.inOutSine(k); g.drawImage(bufB, 0, 0);
          g.globalAlpha = 1;
        } else {
          drawShot(scene, shot, t, post);
          if (tin.type === 'black') {
            g.fillStyle = '#000'; g.globalAlpha = 1 - NM.ease.inOutSine(k); g.fillRect(0, 0, W, H); g.globalAlpha = 1;
          } else if (tin.type === 'white' || tin.type === 'red') {
            post.flash = Math.max(post.flash, (1 - k) ** 1.5);
            post.flashColor = tin.type === 'white' ? '#fff4e8' : '#ff2040';
          }
        }
      } else {
        drawShot(scene, shot, t, post);
      }
    }
    NM.paintPass(scene, t, post);
    NM.grade(g, post.grade);
    NM.finish(main, scene, t, post);
    // crisp UI on top of the painting
    const mg = main.getContext('2d');
    mg.save(); mg.setTransform(1, 0, 0, 1, 0, 0);
    NM.drawUI(mg, t, post);
    mg.restore();
  };
})();
