#!/usr/bin/env node
// Offline renderer: drives index.html in headless Chromium, captures every
// frame from the canvas and pipes it into ffmpeg. Frame-exact (no realtime).
//
//   node tools/render_video.js                       both MP4s into out/
//   node tools/render_video.js --clean               clean version only
//   node tools/render_video.js --hud                 annotated version only
//   node tools/render_video.js --sheet 0.5,1.3 --out sheet.png [--hud] [--skeleton] [--cols 4]
//   node tools/render_video.js --still 1.3 --out frame.png [--hud] [--skeleton]
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

async function openPage() {
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined;
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + path.join(ROOT, 'index.html') + '?render=1');
  await page.waitForFunction(() => typeof window.renderAt === 'function');
  return { browser, page };
}
const grab = (page, t, o) => page.evaluate(([t, o]) => {
  window.renderAt(t, o);
  return document.getElementById('cv').toDataURL('image/png').split(',')[1];
}, [t, o]);

async function sheet(times, out, o, cols) {
  const { browser, page } = await openPage();
  const data = await page.evaluate(async ([times, o, cols]) => {
    const tw = 640, th = 360, rows = Math.ceil(times.length / cols);
    const sc = document.createElement('canvas'); sc.width = tw * cols; sc.height = th * rows;
    const g = sc.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sc.width, sc.height);
    const src = document.getElementById('cv');
    times.forEach((t, i) => {
      window.renderAt(t, o);
      g.drawImage(src, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect((i % cols) * tw, Math.floor(i / cols) * th, 120, 26);
      g.fillStyle = '#fff'; g.font = '16px monospace'; g.fillText(`t=${t.toFixed(2)} F${Math.round(t * 60)}`, (i % cols) * tw + 6, Math.floor(i / cols) * th + 18);
    });
    return sc.toDataURL('image/png').split(',')[1];
  }, [times, o, cols]);
  fs.writeFileSync(out, Buffer.from(data, 'base64'));
  await browser.close();
  console.log('wrote', out);
}

async function video(out, o) {
  const { browser, page } = await openPage();
  const meta = await page.evaluate(() => ({ fps: window.ReaperAnim.FPS, dur: window.ReaperAnim.DURATION }));
  const N = Math.round(meta.fps * meta.dur);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  const t0 = Date.now();
  // N frames cover [0, DURATION); the clip is exactly DURATION seconds long.
  for (let f = 0; f < N; f++) {
    const b64 = await grab(page, f / meta.fps, o);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`\r${path.basename(out)}  frame ${f}/${N}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log(`\r${path.basename(out)}  ${N} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${out}`);
}

(async () => {
  const o = { hud: flag('--hud'), skeleton: flag('--skeleton') };
  if (opt('--sheet')) {
    const times = opt('--sheet').split(',').map(Number);
    return sheet(times, path.resolve(opt('--out', 'sheet.png')), o, +opt('--cols', 4));
  }
  if (opt('--still')) {
    const { browser, page } = await openPage();
    fs.writeFileSync(path.resolve(opt('--out', 'still.png')), Buffer.from(await grab(page, +opt('--still'), o), 'base64'));
    await browser.close();
    return console.log('wrote', opt('--out', 'still.png'));
  }
  const outDir = path.join(ROOT, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  if (!flag('--hud')) await video(path.join(outDir, 'asriel_reaper_of_the_void_r1_chain.mp4'), { hud: false });
  if (!flag('--clean')) await video(path.join(outDir, 'asriel_reaper_of_the_void_r1_chain_annotated.mp4'), { hud: true });
})().catch(e => { console.error(e); process.exit(1); });
