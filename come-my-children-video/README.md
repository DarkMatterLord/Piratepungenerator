# Malacay: "Come My Children" (stained-glass music video)

A procedurally animated stained-glass music video. Every frame is drawn on an HTML canvas as backlit
glass:
- pieces glow from behind and fall off toward the lead
- mottled cathedral-glass texture
- lead came with soft halos
- grisaille brushwork and matting on faces, hands and drapery
- light that swells with the music

The story plays out window by window in Malacay's cathedral, from the refused throne to the blood
god, the Shaikan's betrayal and the storm he makes of himself. Animation is "on twos" (12 fps).

## Pipeline

The song file is not in the repo (nor is `data.js`, which holds its lyrics). Put the song next to
`index.html` as `song.mp3`, then build the timing data with the same tools as the
`mr-weathervane-video` project:

```bash
ffmpeg -i song.mp3 -ac 2 -ar 48000 song48k.wav && ffmpeg -i song.mp3 -ac 1 -ar 16000 song16k.wav
python3 tools/analyze_audio.py song48k.wav features.json vocal_env.npy
python3 tools/extract_lyrics.py song.mp3 lyrics.json
node tools/transcribe.mjs <whisper-small models dir> song16k.wav asr_words.json 0 "" word
python3 tools/build_timing.py lyrics.json timing.json asr_words.json
python3 tools/make_data.py timing.json features.json vocal_env.npy data.js overrides.json
```

`overrides.json` pins first words the recogniser misses: `[["Intro",0,0,4.4],["Intro",6,0,29.1]]`.

Render and encode:

```bash
npm install                                     # playwright 1.56.1
node tools/render.mjs frames frames 12 0 373 4  # 4,476 frames, 4 browser workers
node tools/captions.mjs captions 12 0 373       # optional lyric banderoles (transparent PNGs)
tools/encode.sh master frames song.mp3 out/come-my-children.mp4
tools/encode.sh share  frames song.mp3 out/come-my-children-720p-share.mp4 [captions]
```

Handy while editing:

```bash
node tools/render.mjs snap  out/snaps 1,88,188      # full-size PNG stills
node tools/render.mjs sheet out/sheet.jpg 10,20,30 4  # contact sheet
```

## Code map

| File | What it holds |
| --- | --- |
| `engine.js` | canvas helpers shared with the first video: math, easing, colour, camera, vignette |
| `glass.js` | **the glass:** backlight, glass pieces, lead and blood-lead, grisaille, tessellations, rose windows, gothic arches and tracery, light beams, cracks and shattering, banderoles, bloom |
| `figkit.js` | **the figure toolkit:** Catmull-Rom spline regions cut by lead, panels, tapered brush strokes, blurred matting, hand unions, the vein web of the blood form |
| `figures.js` | Malacay: a jointed glass figure (collar, pauldrons, chainmail, coat, flame cuffs, swept silver hair), face painting, blood form, lip sync |
| `world.js` | quarry and rosette grounds, mandorlas with jewelled rims, borders, and the people (Shaikan, kings, mages, gods, the dead) |
| `props.js` | throne, Hybernian banner and crest, circlet, hourglass, orb, map of kingdoms, vials, crown, sword, door, hearts, oath, clouds, the golden capital, giant hands |
| `dragon.js` | Ur, the golden dragon, with optional blood chains |
| `creatures.js` | the Malakar swarm, and the Emperor (shown only as a ghost) |
| `timeline.js` | shot dispatcher, transitions (fade, through-black, flash, shatter), music-reactive light, caption pass |
| `scenes_*.js` | the windows: intro, verse 1, the three choruses, verse 2, interlude and bridge, outro |
| `shots.js` | the shot list, keyed to the lyric line times |
