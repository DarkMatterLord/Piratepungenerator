# Necromantical — Music Video

A fully animated gothic romance horror music video for **"Necromantical" by darkmatter96**, drawn
as detailed dark pixel art in the spirit of gothic pixel games (*Blasphemous*) and RPG horror games
(*The Witch's House*, *Ib*, *Mad Father*, *Symbiosis*). It uses limited per-scene palettes,
ordered dithering, sprite outlines, and moonlight, candlelight and blood-red glows. The animation
is built for weight: anticipation and overshoot on gestures, hit-stops and screen shake on impacts,
breathing and secondary motion on hair, veils and skirts, and camera moves with parallax.

The lyrics arrive as the villainess's dialogue in a pixel RPG message window, along with choice,
status and item windows and a title menu.

An earlier full-HD **oil-paint** rendering of the same video is still built from this code
(`--style paint`, see below).

**The story.** Isolde loses her husband Lucien when his carriage plunges from a storm-lashed cliff.
She will not let him rest. At his grave she draws a blood-red circle, binds his rising soul and drags
him back into his corpse. Everything after is told from her side:
- the grip of his hand bursting from the soil and the kiss before the blood moon;
- the waltz among the graves;
- the manor and its crypt;
- his plea for release, and her answer: *"Never. He stays."*;
- his dossier fading to *Undead · Cursed · Puppet*;
- the marionette stage and the ballroom danse macabre;
- the mirror that shows her as a skeleton bride;
- *"Obtained [Lucien's Soul]"*;
- the villagers' torch march, broken when the dead rise;
- her domain bleeding across the map of the valley, and years passing;
- an embrace in chains, and the ending card: *ENDING — Death's Ordained*.

![Contact sheet: one frame every 6 seconds](docs/contact_sheet.jpg)

## Output

`build/Necromantical_MusicVideo_1080p.mp4` — 1920×1080, 30 fps, 3:08, H.264 + AAC
(render it yourself with the steps below; `build/` is not committed).

## How it works

Every frame is a pure function of time `t`. Shots are authored in 1920×1080 coordinates and drawn
on an HTML canvas:

1. **Scene** (`src/scenes1-4.js`, 68 shots).
   - `env.js`: 2.5D environments built on a pinhole camera with depth fog — graveyards, the manor,
     and one-point-perspective hall, crypt and ballroom.
   - `portrait.js`: portraits with a turnable head model, chiaroscuro shading and hair locks. A
     figure-scale mode fits heads into the full-body figures.
   - `rig.js`: full-body figures, dressed skeletons, ghosts, villagers, horses, carriage, plus the
     rim-light/outline/form-shading layer.
   - `hands.js`: close-up hands — living, gloved, corpse and bone.
   - `draw.js`: effects such as chains, sigils, candles, lightning and particles.
   - `core.js`: the weight helpers — springs, hit-stop, impact envelopes, squash & stretch, and
     beat-snapped pose sequencing.
2. **Pixel finish** (`pixel.js`, the default style).
   - The shot is drawn at **640×360**, colour-graded and given a little bloom.
   - It is then snapped to that shot's own palette with 8×8 Bayer dithering. Palettes are built
     by `render/palettes.mjs`: k-means over sample frames, plus a few shared accent colours, saved
     to `data/palettes.js`.
   - Figures get 1-pixel sprite outlines and form shading.
   - Transitions dissolve or fade through the dither pattern.
   - The frame is upscaled 3× with hard pixel edges.
3. **UI** (`ui.js`). Drawn on its own 640×360 layer: pixel fonts (DotGothic16, Pixelify Sans), gold
   pixel frames, a quantised portrait cameo, typewriter lyrics, and dithered transparency.

With `--style paint` (or `index.html?style=paint`), shots are instead drawn at full HD and finished
by `paint.js` and `post.js`: a Kuwahara oil filter, brush-stroke and canvas textures, bloom and grain.

Lyric timing (`data/timing.json`) was derived from the song itself:
- beat/downbeat tracking and energy envelopes with librosa;
- word-level alignment of the embedded lyrics using a grammar-restricted Vosk recogniser on a
  centre-channel vocal stem, checked against spectrograms.

Each chorus lands on the full-band hit after its dropout.

## Run it

```bash
npm install                                     # Playwright (uses the system Chromium)
open index.html                                 # or serve the folder: live preview player with audio + scrubber
node render/palettes.mjs                        # (re)build the per-shot pixel palettes -> data/palettes.js
node render/render.mjs --out build/frames --q 0.95   # render all 5662 frames (~2.5 min on 4 cores)
bash render/encode.sh                           # mux with audio -> build/Necromantical_MusicVideo_1080p.mp4
node render/render.mjs --stills 36.2,80 --out build/stills   # PNG stills for review
node render/render.mjs --style paint --out build/frames_paint   # the oil-paint version (~18 min)
node render/render.mjs --test path/to/shots.js --stills 1 --out build/test   # render a scratch test timeline
node render/check.mjs                           # print the shot timeline, flag gaps/overlaps
```

`index.html?lyrics=0` hides the message window lyrics.

### Re-deriving the lyric timing (`analysis/`)

Scripts take a working directory `$WD` containing `audio/song.wav` (44.1 kHz stereo decode of the MP3)
and write into `$WD/analysis/`:

```bash
python3 analysis/analyze.py  $WD/audio/song.wav $WD/analysis/basic.json   # tempo, beats, loudness
python3 analysis/vocals.py   $WD/audio/song.wav $WD/analysis               # REPET-SIM foreground + spectrograms
python3 analysis/center.py   $WD/audio/song.wav $WD/audio/center16k.wav    # centre-channel vocal stem
python3 analysis/vosk_run.py <vosk-model-small-en-us-0.15> $WD/audio/center16k.wav lyrics.txt $WD/analysis/vosk_center_g.json grammar
python3 analysis/align.py    $WD                                           # lyric words -> per-line estimates
python3 analysis/build_timing.py $WD data/timing.json                      # hand-verified line windows + envelopes
echo "window.TIMING = $(cat data/timing.json);" > data/timing.js              # what index.html loads
```

Fonts: DotGothic16, Pixelify Sans, Silkscreen, VT323, UnifrakturMaguntia, Cinzel, Cinzel Decorative,
IM Fell English (+ SC) (Google Fonts, SIL Open Font License).

The first, top-down RPG Maker-style version of the video is in the git history (commit `ee778b0`).
