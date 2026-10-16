// Necromantical — final output stage: 4x nearest-neighbour upscale + CRT finish
// (scanlines, soft glow, vignette, light noise, optional chroma split on hits).
'use strict';
(function () {
  const { clamp, canvas, W, H, FW, FH, PX } = NM;
  let scan, vig, glowSmall, glowBlur;

  NM.initPost = function () {
    // scanline overlay: darken the last sub-row of every 4-row pixel
    scan = canvas(FW, FH);
    const sg = scan.getContext('2d');
    for (let y = 0; y < FH; y += PX) {
      sg.fillStyle = 'rgba(0,0,0,0.30)'; sg.fillRect(0, y + PX - 1, FW, 1);
      sg.fillStyle = 'rgba(0,0,0,0.10)'; sg.fillRect(0, y, FW, 1);
    }
    vig = canvas(FW, FH);
    const vg = vig.getContext('2d');
    const r = vg.createRadialGradient(FW / 2, FH / 2, FH * 0.35, FW / 2, FH / 2, FW * 0.62);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(0.7, 'rgba(0,0,0,0.25)'); r.addColorStop(1, 'rgba(0,0,0,0.7)');
    vg.fillStyle = r; vg.fillRect(0, 0, FW, FH);
    glowSmall = canvas(W / 2, H / 2);
    glowBlur = canvas(W / 2, H / 2);
  };

  NM.finish = function (main, lo, t, P) {
    const ctx = main.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH);
    ctx.imageSmoothingEnabled = false;
    // screen shake in whole game pixels
    let sx = 0, sy = 0;
    if (P.shake > 0) {
      const f = Math.floor(t * 30);
      sx = Math.round((NM.hash1(f * 3 + 1) - 0.5) * 2 * P.shake) * PX;
      sy = Math.round((NM.hash1(f * 5 + 2) - 0.5) * 2 * P.shake * 0.6) * PX;
    }
    if (P.chroma > 0.01) {
      // RGB split: draw the frame three times through channel masks
      const off = Math.round(P.chroma * 3) * PX;
      ctx.drawImage(lo, sx, sy, FW, FH);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#00ffff'; ctx.fillRect(0, 0, FW, FH);
      ctx.globalCompositeOperation = 'lighter';
      const tmp = NM._chromaTmp || (NM._chromaTmp = canvas(FW, FH));
      const tg = tmp.getContext('2d'); tg.imageSmoothingEnabled = false;
      tg.globalCompositeOperation = 'copy'; tg.drawImage(lo, sx - off, sy, FW, FH);
      tg.globalCompositeOperation = 'multiply'; tg.fillStyle = '#ff0000'; tg.fillRect(0, 0, FW, FH);
      ctx.drawImage(tmp, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(lo, sx, sy, FW, FH);
    }
    // soft CRT glow
    if (P.bloom > 0.01) {
      const sg = glowSmall.getContext('2d');
      sg.globalCompositeOperation = 'copy'; sg.filter = 'brightness(1.1) contrast(2.2)';
      sg.drawImage(lo, 0, 0, W / 2, H / 2); sg.filter = 'none';
      const bg = glowBlur.getContext('2d');
      bg.globalCompositeOperation = 'copy'; bg.filter = 'blur(3px)'; bg.drawImage(glowSmall, 0, 0); bg.filter = 'none';
      ctx.imageSmoothingEnabled = true;
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = P.bloom;
      ctx.drawImage(glowBlur, sx, sy, FW, FH);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = false;
    }
    if (P.scan > 0) { ctx.globalAlpha = P.scan; ctx.drawImage(scan, 0, 0); ctx.globalAlpha = 1; }
    if (P.vignette > 0) { ctx.globalAlpha = P.vignette; ctx.drawImage(vig, 0, 0); ctx.globalAlpha = 1; }
    ctx.restore();
  };
})();
