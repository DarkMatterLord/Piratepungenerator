# Necromantical — Music Video

A fully animated gothic romance horror music video for **"Necromantical" by darkmatter96**,
made in the style of RPG Maker horror games (*The Witch's House*, *Ib*, *Mad Father*, *Ao Oni*,
*Symbiosis*): low-resolution pixel art with limited, dithered palettes, top-down tile maps with chibi
sprites and emotion balloons, anime portrait cut-ins and event CGs, and the lyrics delivered as the
villainess's dialogue in an RPG message window — all under a soft CRT finish.

**The story.** Isolde loses her husband Lucien when his carriage plunges from a storm-lashed cliff.
She will not let him rest. At his grave she draws a blood-red circle, chains his rising soul and
drags him back into his corpse. What follows is told from her side: the resurrection and the kiss
before the blood moon, the waltz among the graves, the dusty mansion and the crypt, his plea for
release (and her answer: *"Never. He stays."*), his status screen fading to *Undead · Cursed · Puppet*,
a danse macabre, the item popup *"Obtained [Lucien's Soul]!"*, the villagers' siege repelled by the
risen dead, her domain spreading across the overworld, years passing, and the ending card —
*ENDING – Death's Ordained*.

![Contact sheet: one frame every 6 seconds](docs/contact_sheet.jpg)

## Output

`build/Necromantical_MusicVideo_1080p.mp4` — 1920×1080, 30 fps, 3:08, H.264 + AAC
(render it yourself with the steps below; `build/` is not committed).

## How it works

Every frame is a pure function of time `t`, drawn with the HTML canvas:

1. **Scene** (`src/scenes1-4.js`, 68 shots) draws at the game resolution of **480×270**
   using the map engine (`tiles.js`, `maps.js`), sprites (`sprites.js`), anime portraits
   (`anime.js`), full-body CG figures (`rig.js`) and effects (`draw.js`).
2. **Pixel pass** (`pixel.js`) snaps every pixel to the shot's limited palette
   (night, blood, mansion, crypt, sepia, ballroom, portrait, corpse, cover, scare) with 4×4 Bayer dithering
   on gradients only, so flat colours stay clean.
3. **UI layer** (`ui.js`) — message window with face graphic and typewriter lyrics, name box,
   choice / status / item windows, title menu.
4. **Finish** (`post.js`) — 4× nearest-neighbour upscale to 1920×1080, CRT scanlines, soft glow,
   vignette, screen shake and RGB split on hits.

Lyric timing (`data/timing.json`) was derived from the song itself: beat/downbeat tracking and
energy envelopes with librosa, plus word-level alignment of the embedded lyrics using a
grammar-restricted Vosk recogniser on a centre-channel vocal stem, checked against spectrograms.
Each chorus lands on the full-band hit after its dropout.

## Run it

```bash
npm install                                     # Playwright (uses the system Chromium)
open index.html                                 # or serve the folder: live preview player with audio + scrubber
node render/render.mjs --out build/frames       # render all 5662 frames (≈3 min on 4 cores)
bash render/encode.sh                           # mux with audio -> build/Necromantical_MusicVideo_1080p.mp4
node render/render.mjs --stills 36.2,80 --out build/stills   # PNG stills for review
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

Fonts: UnifrakturMaguntia, DotGothic16, Cinzel, IM Fell English, Pixelify Sans, VT323, Silkscreen
(Google Fonts, SIL Open Font License).
