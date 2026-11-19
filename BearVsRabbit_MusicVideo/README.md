# BEAR vs RABBIT: a plush rap battle music video

A fully procedural 1080p/30fps music video for the track **"BearVRabbit"**: a rap battle between a
foul-mouthed caramel teddy bear and a shaggy, hung-over puppet bunny. The two characters are original
vector drawings *inspired by* the reference plush designs. Everything (characters, set, lighting, lyrics,
graphics) is drawn in code with Skia (`@napi-rs/canvas`) and encoded with ffmpeg.

## What's in the video

| Time | Section | Look |
|------|---------|------|
| 0:00 | Cold open: tape starts, neon flickers on, nameplates, **VS** slam | VHS, then film |
| 0:08 | **Round 1, Ted** | Warm 35mm "film": letterbox, bloom, grain, light leaks |
| 1:19 | **Round 1, Mr. Floppy** | 90s camcorder "VHS": chroma split, scanlines, tracking rolls |
| 2:40 | **Round 2, Ted** | Film (with a film-burn transition) |
| 3:51 | VCR blue screen, then **Round 2, Mr. Floppy** | VHS |
| 4:56 | "Roll the cameras": camcorder viewfinder | REC overlay |
| 5:03 | **The playback**: on tape, the rabbit is just a limp toy and the bear is yelling at silent fluff | Worn home-video tape |
| 5:10 | STOP, CRT switch-off, "WHO WON?" end card | |

### Two lyric styles

* **Ted, "Gold Stamp".** Bungee and Bungee Inline layered into a gold gradient face with a cream inline
  stripe, a 7-layer chocolate extrusion and a drop shadow. Each word slams in on the exact syllable with an
  overshoot, a screen bump and a spark burst. Rhyme words turn red-hot. When the bar ends, the words drop
  away like loose stuffing.
* **Mr. Floppy, "VHS Closed Caption".** VT323 typed out letter by letter in black 90s closed-caption boxes,
  with a magenta/cyan RGB split, a violet glow, a blinking magenta block cursor and an underline on the
  spoken word. Tracking-glitch slices shear the text. Rhyme words glow pink. The line collapses like a CRT
  switching off.

### Symbology
About 50 pop-up symbols are keyed to specific sung words. Ted gets die-cut gold stickers and Floppy gets
neon line art. Examples: shooting star, camcorder, cassette, Monopoly-style boot, four-leaf clover,
parsnip, gavel, pizza slice, graduation cap and boxing glove. Innuendo in the lyrics is handled only
through these symbols and gags (e.g. the rabbit's ears spring straight up on the Viagra line). There is no
nudity, explicit or implied.

## Pipeline

1. **Vocal separation.** UVR MDX-Net (`tools/sep.py`, via sherpa-onnx) splits vocals from the beat.
2. **Transcription with timestamps.** NVIDIA Parakeet-TDT 0.6B (`tools/asr.py`) runs on the isolated
   vocals in overlapping 24 s windows.
3. **Forced alignment.** Needleman-Wunsch alignment of the ASR words to the real lyrics
   (`tools/align.py`) gives word-level timing for all 1,077 words (988 matched directly, the rest
   interpolated or fixed by hand) → `data/timing.json`.
4. **Audio features.** `tools/analyze_audio.py` (librosa) writes beats (100 BPM), the vocal envelope
   (lip-sync), vocal onsets, bass hits and loudness at 30 fps → `data/audio_features.json`.
5. **Rendering.** `src/render.js` draws every frame as a pure function of time, so segments can render in
   parallel (`tools/render_all.sh`).

### Source map
* `src/fur.js`: plush and shag fur painter (volume shading, AO rim, strand fields, fuzzy silhouettes)
* `src/bear.js`, `src/rabbit.js`: rigged characters (head bob, tilt, turn parallax, brows, lids, wink,
  lip-sync mouth, arms with mic/bottle/can, beat-driven floppy ears)
* `src/set.js`, `src/scene.js`: basement boxing ring, neon sign, Christmas lights, couch, toy-crowd
  silhouettes, spotlights, haze, dust, parallax camera layers
* `src/director.js`: shot list (wide, MS, CU, ECU, dutch, two-shot, reaction), handheld camera, beat
  bumps, gestures, sips, reactions and story events
* `src/lyrics.js`, `src/icons.js`, `src/cards.js`: the two lyric engines, symbol pops, title, round
  cards, HUD, viewfinder, end card
* `src/fx.js`: film and VHS post-processing and transitions

## Re-render

```bash
npm install
# stills for checking
node src/render.js --stills 12.0,82.0,197.6 --outdir /tmp/stills
# full video (4 parallel workers)
tools/render_all.sh path/to/BearVRabbit.mp3 BearVsRabbit.mp4 4
```
The tools in `tools/` need Python with `sherpa-onnx`, `librosa` and `soundfile`, plus the sherpa-onnx
model files (UVR-MDX-NET-Voc_FT and nemo-parakeet-tdt-0.6b-v2-int8) from the k2-fsa/sherpa-onnx GitHub
releases. They only matter if you want to regenerate `data/`.

## Credits
* Fonts: Bungee, Bungee Inline and Bungee Shade (David Jonathan Ross), VT323 (Peter Hull) and Anton
  (Vernon Adams) are all under the SIL Open Font License; Permanent Marker (Font Diner) is under Apache 2.0.
  The licenses are in `fonts/`.
* This is a fan parody. The characters are original drawings inspired by the reference designs.
