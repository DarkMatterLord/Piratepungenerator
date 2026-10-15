# Asriel Dreemurr · Reaper of the Void: R1 chain animation reference

An 8-second, 16:9 gameplay-style animation concept for a custom Elden Ring weapon
moveset, made entirely in code. There are no images, models or downloaded assets.
A small 3D rig is posed by keyframes and inverse kinematics, projected through one
locked three-quarter camera, and drawn with the Canvas 2D API.

| File | What it is |
|---|---|
| `out/asriel_reaper_of_the_void_r1_chain.mp4` | Clean cut. 1920×1080, 60 fps, 480 frames (8.00 s), H.264 |
| `out/asriel_reaper_of_the_void_r1_chain_annotated.mp4` | Same take with move names, a frame counter and a startup/active/recovery timeline |
| `index.html` | Interactive player: play/pause, frame stepping, 0.5×/0.25× speed, skeleton overlay, frame-data table |
| `src/reaper_anim.js` | The engine: choreography keys, rig, IK, secondary motion, renderer |
| `tools/check_motion.js` | Frame-by-frame validation (see below) |
| `tools/render_video.js` | Headless Chromium → ffmpeg renderer, plus stills and contact sheets |

## Viewing and re-rendering

Open `index.html` in a browser. It loads `src/reaper_anim.js` next to it, with no
server or build step.

To re-render the videos you need Node 18+, Playwright with Chromium, and ffmpeg
with libx264:

```sh
node tools/check_motion.js                 # validate the motion
node tools/render_video.js                 # both MP4s into out/
node tools/render_video.js --clean         # clean cut only
node tools/render_video.js --still 4.62 --out impact.png --skeleton
node tools/render_video.js --sheet 0.2,1.3,2.3,3.2,4.6,7.5 --out keys.png --cols 3
```

Rendering is frame-exact, not real-time capture. Each frame is evaluated at
`t = frame / 60`, so the same code always produces the same video.

## The take

One uninterrupted shot from a locked camera in front of and to the right of
Asriel (47° off his facing direction, 14° above). His whole body and the whole
scythe stay in frame on every frame. The arena is a neutral stone ring with no
effects other than a violet-black trail. The trail follows the crescent's belly
and only appears when the blade is moving faster than about 10 m/s.

| Time (s) | Beat | Body mechanics |
|---|---|---|
| 0.00–0.50 | Guard | Low two-handed stance, left foot leading, hips turned 30° right. Left hand at the gold pommel, right hand leading. The crescent rests low behind the right hip with the blade canted toward the target. |
| 0.50–1.72 | **R1·1 Low horizontal reap** | Coils further right (hips 44°, chest 64°, weight back over the right foot). Then the hips lead, the chest follows and the arms extend, sweeping the blade from right to left at knee-to-thigh height. The lead foot stays planted; the rear heel lifts and the foot pivots on its ball (42° → −6°). The follow-through wraps to the left with the hands drawn in. |
| 1.72–2.58 | **R1·2 Rising reverse hook** | The blade dips low behind his left side while the shaft rolls about 190° in the hands, so the edge now faces the return path. Weight transfers onto the right leg and the hips unwind. The scythe rises diagonally from low left to high right, ending above the right shoulder. |
| 2.58–3.58 | **R1·3 Advancing waist hook** | One controlled advance: the lead foot steps 0.40 m and the rear foot gathers 0.40 m. During the step the scythe is carried down from high right to waist height on the right and rolled back over, so it never teleports. A short inward hook then pulls across the waist line, from right to centre. |
| 3.58–5.00 | **R1·4 Overhead diagonal reap** | Weight shifts back and the scythe is lifted in front of him and over the right shoulder. The swing comes down through the overhead arc, from high right to low front-left, as the weight drives forward into a deep lead-knee lunge with the rear heel up. The blade finishes hanging just clear of the floor. |
| 5.00–7.15 | Recovery | Holds the lunge briefly, then pulls the blade free, rises, re-plants the rear foot and carries the scythe up and around the right side back to guard. |
| 7.15–8.00 | Guard | Settles and breathes. |

### Frame data (60 fps; at 30 fps, halve and round)

Active windows are authored the way hitbox frames would be. The blade speed is
measured at the crescent's outer belly inside each window.

| Input | Move | Startup | Active | Recovery | Peak blade speed |
|---|---|---|---|---|---|
| R1·1 | Low Horizontal Reap | 38 | 20 | 16 | 31.2 m/s |
| R1·2 | Rising Reverse Hook | 20 | 17 | 16 | 28.5 m/s |
| R1·3 | Advancing Waist Hook | 33 | 11 | 17 | 16.0 m/s |
| R1·4 | Overhead Diagonal Reap | 50 | 12 | 24 (+129 to guard) | 26.9 m/s |

Each recovery leads directly into the next startup, so the four attacks chain
without returning to guard.

## What keeps the motion reproducible

`tools/check_motion.js` evaluates all 481 frames and currently reports:

- **Grip:** the hands are solved by two-bone IK onto points on the shaft, with a
  gap of 0 m on every frame. When a grip point is out of reach, the leading hand
  slides along the shaft (at most 7.4 cm) instead of letting go.
- **Feet:** planted feet drift 0 m. A planted foot only changes yaw while its heel
  is lifted, so it pivots on the ball and never rotates flat on the floor. The
  pelvis height is softly clamped so both legs always reach their feet.
- **Floor:** the weapon's lowest point is 9 cm above the floor.
- **Self-intersection:** no weapon-to-body contacts (torso, head, thighs, shins)
  and no hand inside the torso.
- **Framing:** everything stays inside 321–1602 × 86–1002 px of the 1920×1080 frame.

The scythe is handled as a long, weighted hooked weapon. The swing is driven
from the ground up: the hips turn first, then the chest, then the arms, then the
blade. Every channel is a monotone cubic (PCHIP) curve, so motion eases through
the keys without overshoot. Strikes accelerate late and decelerate through the
follow-through. The blade direction is keyed so the crescent leads along its path.

Secondary motion is simulated at 240 Hz: hair locks, back hair, the tabard, the
coat's mid and hem rings, and a five-column cape with cloth spacing constraints.
None of it feeds back into the body.

## Appearance

The look is matched to the provided reference sheet:

- **Asriel:** white goat face with long white hair falling in front of the
  shoulders and a spiky crest, black ram horns, a thin gold halo with a star, and
  black armour with gold filigree and a glowing heart. Spiked pauldrons, a
  floor-length galaxy coat with a tattered hem open over a crescent-moon tabard,
  white fur at the wrists and shins, and black hoof-boots.
- **Reaper of the Void:** black shaft with a gold bell pommel, gold rings and a
  collar. The main galaxy crescent curls back toward the hands, a smaller crescent
  hooks upward on the opposite side, and both have gold rims. A white star sits at
  the head.

Proportions are about 2.0 m to the top of the head (horns and halo above that)
and a 2.15 m shaft. The blade outline was traced from the reference at about
2.4 mm per pixel.

Every colour, dimension and blade-outline point lives in `LOOK`, `RIG` and
`BLADE` at the top of `src/reaper_anim.js`. Every pose lives in `KEYS`.

## Scope

This clip animates the first four R1 attacks, as the brief asks, with no extra
attacks. The rest of the moveset is not animated yet:

- R1·5 pivoting low sweep and R1·6 diagonal finishing reap
- R2 ×4: charged crescent sweep, heavy upward hook, descending blade drag,
  two-handed rotational finisher
- Ash of War "Event Horizon: The Unmaking": three attacks with delayed void
  detonations at predetermined impact points

The keyframe system, rig and validator are built so they can be added as further
clips.
