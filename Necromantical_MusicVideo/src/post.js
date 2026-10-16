// Necromantical — final stage: bloom, flashes, chromatic split, glitch, vignette, film grain.
'use strict';
(function () {
  const { clamp, canvas, W, H } = NM;
  let vig, small, blur, tmp;

  NM.initPost = function () {
    vig = canvas(W, H);
    const vg = vig.getContext('2d');
    const r = vg.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H / 2, W * 0.66);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(0.6, 'rgba(8,2,6,0.32)'); r.addColorStop(1, 'rgba(4,0,2,0.88)');
    vg.fillStyle = r; vg.fillRect(0, 0, W, H);
    small = canvas(W / 4, H / 4);
    blur = canvas(W / 4, H / 4);
    tmp = canvas(W, H);
  };

  NM.finish = function (main, scene, t, P) {
    const ctx = main.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    let sx = 0, sy = 0;
    if (P.shake > 0) {
      sx = NM.fbm1(t * 14 + 3.1, 2) * P.shake * 14;
      sy = NM.fbm1(t * 14 + 71.7, 2) * P.shake * 9;
    }
    const zoom = P.shake > 0 ? 1.02 : 1;
    const dw = W * zoom, dh = H * zoom, dx = (W - dw) / 2 + sx, dy = (H - dh) / 2 + sy;
    if (P.chroma > 0.01) {
      const off = P.chroma * 10;
      ctx.drawImage(scene, dx, dy, dw, dh);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#00ffff'; ctx.fillRect(0, 0, W, H);
      const tg = tmp.getContext('2d');
      tg.globalCompositeOperation = 'copy'; tg.drawImage(scene, dx - off, dy, dw, dh);
      tg.globalCompositeOperation = 'multiply'; tg.fillStyle = '#ff0000'; tg.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(tmp, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(scene, dx, dy, dw, dh);
    }
    // glitch: displaced horizontal slices
    if (P.glitch > 0.01) {
      const f = Math.floor(t * 30), n = Math.floor(4 + P.glitch * 12);
      for (let i = 0; i < n; i++) {
        const y = Math.floor(NM.hash1(f * 31 + i) * H), h = 4 + Math.floor(NM.hash1(f * 17 + i * 3) * 50 * P.glitch);
        const ddx = Math.round((NM.hash1(f * 7 + i * 13) - 0.5) * 220 * P.glitch);
        ctx.drawImage(main, 0, y, W, h, ddx, y, W, h);
      }
    }
    // bloom
    if (P.bloom > 0.01) {
      const sg = small.getContext('2d');
      sg.globalCompositeOperation = 'copy'; sg.filter = 'brightness(1.05) contrast(2.4)';
      sg.drawImage(main, 0, 0, W / 4, H / 4); sg.filter = 'none';
      const bg = blur.getContext('2d');
      bg.globalCompositeOperation = 'copy'; bg.filter = 'blur(9px)'; bg.drawImage(small, 0, 0); bg.filter = 'none';
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = P.bloom;
      ctx.drawImage(blur, 0, 0, W, H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (P.flash > 0.004) {
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = clamp(P.flash); ctx.fillStyle = P.flashColor; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (P.vignette > 0) { ctx.globalAlpha = P.vignette; ctx.drawImage(vig, 0, 0); ctx.globalAlpha = 1; }
    if (P.grain > 0) {
      const f = Math.floor(t * 30);
      NM.tiled(ctx, NM.TX.grain[f % 4], P.grain, 'overlay', (NM.hash1(f) * 512) | 0, (NM.hash1(f + 9) * 512) | 0);
    }
    ctx.restore();
  };
})();
