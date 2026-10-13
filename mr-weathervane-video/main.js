'use strict';
// Boot: load fonts, init engine, expose renderAt(t) for capture, or play along with audio.
const FONT_FAMILIES = ['Limelight', 'Yellowtail', 'Bebas Neue', 'Alfa Slab One', 'Special Elite', 'Playfair Display', 'Josefin Sans'];
window.MV = { ready: false };
(async function boot() {
  await Promise.all(
    FONT_FAMILIES.map((f) => document.fonts.load(`${f === 'Playfair Display' ? 'italic 700 ' : f === 'Josefin Sans' ? '600 ' : ''}40px "${f}"`))
  );
  initEngine(document.getElementById('c'));
  initScenes();
  window.renderAt = (t) => { renderFrame(t); return true; };
  window.MV.ready = true;
  const params = new URLSearchParams(location.search);
  if (params.has('capture')) return;
  // Live preview with the song
  const ui = document.getElementById('ui'), btn = document.getElementById('play'), tl = document.getElementById('time');
  ui.hidden = false;
  const audio = new Audio(params.get('audio') || 'song.mp3');
  const start = parseFloat(params.get('t') || '0');
  audio.currentTime = start;
  btn.onclick = () => (audio.paused ? audio.play() : audio.pause());
  audio.onplay = () => (btn.textContent = 'Pause');
  audio.onpause = () => (btn.textContent = 'Play');
  const loop = () => {
    const t = audio.currentTime;
    renderFrame(t);
    tl.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    requestAnimationFrame(loop);
  };
  loop();
})();
