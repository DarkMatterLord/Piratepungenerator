# Mr. Weathervane — "A Hundred Percent Chance of Demise" (paper-motion music video)

A procedurally animated cut-paper music video. Every frame is drawn on an HTML canvas: textured
paper pieces with soft layered shadows and scissor-cut edges, puppets jointed with brass split
pins, props on visible sticks and strings, animated "on twos" (12 fps) for a stop-motion feel.
The palette starts as friendly 1950s pastels and drains toward midnight, emerald and tarnished
gold as the forecast gets darker.

## Pipeline

The song file is not in the repo. Put it next to `index.html` as `song.mp3`, then:

```bash
# 1. audio features (beats, energy bands, vocal envelope for lip sync)
ffmpeg -i song.mp3 -ac 2 -ar 48000 song48k.wav
ffmpeg -i song.mp3 -ac 1 -ar 16000 song16k.wav
pip install librosa soundfile
python3 tools/analyze_audio.py song48k.wav features.json vocal_env.npy

# 2. lyric sheet (with [Section] tags) from the MP3's embedded lyrics tag
python3 tools/extract_lyrics.py song.mp3 lyrics.json

# 3. word timestamps: Whisper-small (ONNX, transformers.js), model from the npm package
#    `sts-whisper-small` (extract the tarball; pass its models/ dir)
npm install @huggingface/transformers@3.7.5 wavefile
node tools/transcribe.mjs <path>/package/models/ song16k.wav asr_words.json 0 "" word

# 4. align the official lyric lines to the ASR words, then build data.js
python3 tools/build_timing.py lyrics.json timing.json asr_words.json
python3 tools/make_data.py timing.json features.json vocal_env.npy data.js

# 5. render (headless Chromium via Playwright) and encode
npm install            # playwright 1.56.1
node tools/render.mjs frames frames 12 0 272.04 4
tools/encode.sh frames song.mp3 out/mr-weathervane.mp4
```

Other render modes, handy while editing:

```bash
node tools/render.mjs snap  out/snaps 3.5,48.6,204.5     # full-size PNG stills
node tools/render.mjs sheet out/sheet.jpg 10,20,30,40 4  # contact sheet
```

Open `index.html` through any static server (e.g. `npx serve .`) to watch it play live in sync
with `song.mp3`; `?t=120` starts at 2:00.

## Code map

| File | What it holds |
| --- | --- |
| `engine.js` | paper primitives: texture, shadows, cut edges, split pins, camera, easing, grain/scanlines |
| `weathervane.js` | the Mr. Weathervane puppet: suit, lapel pin, storm-spiral irises, replacement mouths, lip sync |
| `props.js` | clouds, sun, rain, houses, townsfolk, umbrellas, thought bubbles, TV set, pushpin, crayon hurricane |
| `sets.js` | the Channel 9 studio and weather map, the living room, the toy-theatre stage |
| `timeline.js` | shot list, friendly-to-dark arc, transitions, the teleprompter lyric strip, post effects |
| `scenes_a.js` … `scenes_d.js` | the shots: intro → verse 1 → choruses → the Unspoken Outlook → interlude → bridge → finale |

Shots are keyed to word timestamps (`atWord('demise', t)`), so visual hits land on the lyric.

## Fonts

From Google Fonts, shipped under their open licenses (SIL OFL 1.1 or Apache 2.0): Limelight,
Yellowtail, Bebas Neue, Alfa Slab One, Special Elite, Playfair Display, Josefin Sans.
