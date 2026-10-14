'use strict';
// Boot: load fonts, init engine + glass, expose renderAt(t) for capture, or play along with audio.
window.MV = { ready: false };
(async function boot() {
  await Promise.all(['500 40px "Cinzel"', '700 40px "Cinzel Decorative"', '40px "UnifrakturMaguntia"', 'italic 40px "IM Fell English"'].map((f) => document.fonts.load(f)));
  initEngine(document.getElementById('c'));
  initGlass();
  initScenes();
  const capOnly = new URLSearchParams(location.search).has('captions');
  window.renderAt = (t) => { if (capOnly) renderCaption(t); else renderFrame(t); return true; };
  window.MV.ready = true;
  const params = new URLSearchParams(location.search);
  if (params.has('capture')) return;
  const ui = document.getElementById('ui'), btn = document.getElementById('play'), tl = document.getElementById('time');
  ui.hidden = false;
  const audio = new Audio(params.get('audio') || 'song.mp3');
  audio.currentTime = parseFloat(params.get('t') || '0');
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
