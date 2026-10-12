# Divinity: cinematic storyboard lyric video

A 1920×1080, 30 fps lyric video for **Divinity** (4:32). It is built from 38 storyboard frames and timed to the isolated vocal stem.

## Deliverables

| File | What it is |
|---|---|
| `Divinity.mp4` | The finished video: 1920×1080, 30 fps, H.264 at about 2.7 Mbps + AAC 192k, 92 MB (sized to fit GitHub's 100 MB file limit) |
| `Divinity.srt` | Line-timed subtitles, usable as closed captions on YouTube |
| `Divinity.lrc` | Line-timed lyrics for music players |
| `STORYBOARD.md` | The shot list: frame, timecode, transition, camera move and lyric for each shot |

## How it was timed

1. **Vocal timing.** `0 Lead Vocal.mp3` (the isolated vocal) was transcribed with word timestamps. A Parakeet TDT model ran through sherpa-onnx. The recognised words were then aligned to the lyric sheet, which gives a start time for every sung word (`timing/lines_timed.json`). Recognition misses ("Hakai", "Whis" and so on) were filled by name aliases. Chorus 2's "HAKAI" line was filled from the chorus 1 timing, because the choruses repeat 52.8 s apart. Accuracy is about ±0.1 s per word.
2. **Beat grid.** The full mix was beat-tracked at about 96 BPM (`timing/beats.json`). Cuts were snapped near beats, and the flash and shake hits were placed on the big impacts (20.45 s, the chorus drops, the solo, 259.4 s).
3. **Frame-to-lyric mapping.** Each of the 31 captioned frames was matched to its lyric couplet (`timing/caption_map.json`). The 7 caption-free frames cover the instrumental passages: the sleeping intro, the band intro, the guitar solo and the final wide shot.

## Effects

- **Karaoke reveal of the baked-in lyrics.** A clean plate with the text removed was built for each captioned frame (`scripts/prep.py`). Each caption rests as dim ghost text. Each word then lights up exactly when it is sung, with a violet glow pulse. The capitalised power words (DIVINITY, BEND, HAKAI, END, UNMAKE, BRIGHT, FIGHT, HESITATE, ALL…) also trigger a flash and a small camera shake.
- **Camera moves on every shot.** Slow push-ins, pull-backs and pans are constrained so the caption stays in frame. The chorus drops get slam zooms.
- **Beat-reactive light.** A bloom and a micro-zoom pulse on each beat, scaled by the loudness of the track.
- **Atmosphere.** Drifting violet and gold particles, a vignette, flashes and shakes on the hits, and a dip to black into the spoken interlude.
- **Title cards.** A "DIVINITY" title slams in when the band kicks in at 0:20, and an end card sits over the final shot of Earth.

## Re-rendering

The scripts in `scripts/` run in order:

`asr.py` → `align.py` → `wordtimes.py` → `words_in_image.py` → `prep.py` → `beats.py` / `audiofeat.py` → `render.py`

They take a working directory and the folder holding the source images and audio. Those are the uploaded files, which are not checked in here. `render.py <work> <images> <first_frame> <last_frame> <out.mp4>` renders a frame range, so several ranges can render in parallel and be concatenated. The fonts are Cinzel and Cinzel Decorative, from Google Fonts.
