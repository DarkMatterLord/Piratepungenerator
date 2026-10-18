"""Single source of truth for "Trump Likes Turtles".

Everything is measured in beats. 120 BPM in 4/4 means one beat is exactly
0.5 s, so the 80 half-second animation styles change on every beat and the
whole song is 20 bars = 80 beats = 40 s.

Running this file writes:
  audio/score.json  - read by the audio build
  js/score.js       - read by the animation (lyrics, lip-sync, sfx cues)
"""

import json
import os

BPM = 120
BEATS = 80
SECONDS_PER_BEAT = 60.0 / BPM

# Melody is written in C major around E4..C5; the audio build may transpose
# the whole song (TRANSPOSE semitones) to suit the singing voice. Timing is fixed.
TRANSPOSE = -12

SECTIONS = [
    {"name": "intro", "start": 0, "end": 8},
    {"name": "verse1", "start": 8, "end": 24},
    {"name": "chorus1", "start": 24, "end": 40},
    {"name": "verse2", "start": 40, "end": 56},
    {"name": "chorus2", "start": 56, "end": 72},
    {"name": "outro", "start": 72, "end": 80},
]

# (start beat, end beat, chord symbol)
CHORDS = [
    (0, 4, "C"), (4, 8, "G7"),
    (8, 12, "C"), (12, 16, "F"), (16, 20, "C"), (20, 24, "G"),
    (24, 28, "F"), (28, 32, "C"), (32, 34, "Dm"), (34, 36, "G"), (36, 40, "C"),
    (40, 44, "C"), (44, 48, "F"), (48, 52, "C"), (52, 56, "G"),
    (56, 60, "F"), (60, 64, "C"), (64, 66, "Dm"), (66, 68, "G"), (68, 72, "C"),
    (72, 74, "F"), (74, 76, "G"), (76, 77, "G7"), (77, 80, "C"),
]

# Each syllable: (beat, duration in beats, syllable text, pitch)
# A syllable starting with "-" continues the previous word.
_CHORUS_A = [  # "Trump likes turtles, yes he really, really does!"
    (0.0, 1.0, "Trump", "A4"), (1.0, 1.0, "likes", "A4"),
    (2.0, 0.5, "tur", "C5"), (2.5, 0.5, "-tles", "A4"),
    (3.0, 0.5, "yes", "G4"), (3.5, 0.5, "he", "A4"),
    (4.0, 0.5, "real", "G4"), (4.5, 0.5, "-ly", "E4"),
    (5.0, 0.5, "real", "G4"), (5.5, 0.5, "-ly", "E4"),
    (6.0, 1.5, "does!", "C5"),
]
_CHORUS_B = [  # "Tremendous little turtles, the best there ever was!"
    (7.5, 0.5, "Tre", "G4"), (8.0, 0.5, "-men", "A4"), (8.5, 0.5, "-dous", "A4"),
    (9.0, 0.5, "lit", "F4"), (9.5, 0.5, "-tle", "A4"),
    (10.0, 0.5, "tur", "B4"), (10.5, 1.0, "-tles,", "G4"),
    (11.5, 0.5, "the", "G4"), (12.0, 0.5, "best", "C5"), (12.5, 0.5, "there", "B4"),
    (13.0, 0.5, "ev", "A4"), (13.5, 0.5, "-er", "B4"),
    (14.0, 1.5, "was!", "C5"),
]


def _shift(notes, by):
    return [(b + by, d, s, p) for (b, d, s, p) in notes]


LINES = [
    {"text": "Out on the lawn by the White House pond,", "notes": [
        (8.0, 1.0, "Out", "G4"), (9.0, 0.5, "on", "E4"), (9.5, 0.5, "the", "E4"),
        (10.0, 1.0, "lawn", "G4"), (11.0, 0.5, "by", "E4"), (11.5, 0.5, "the", "G4"),
        (12.0, 1.0, "White", "A4"), (13.0, 1.0, "House", "A4"), (14.0, 1.5, "pond,", "F4"),
    ]},
    {"text": "Donald met a turtle and they formed a bond.", "notes": [
        (16.0, 0.5, "Do", "G4"), (16.5, 0.5, "-nald", "E4"),
        (17.0, 0.5, "met", "G4"), (17.5, 0.5, "a", "E4"),
        (18.0, 0.5, "tur", "G4"), (18.5, 0.5, "-tle", "C5"),
        (19.0, 0.5, "and", "B4"), (19.5, 0.5, "they", "A4"),
        (20.0, 1.0, "formed", "B4"), (21.0, 1.0, "a", "A4"), (22.0, 1.5, "bond.", "G4"),
    ]},
    {"text": "Trump likes turtles, yes he really, really does!",
     "notes": _shift(_CHORUS_A, 24)},
    {"text": "Tremendous little turtles, the best there ever was!",
     "notes": _shift(_CHORUS_B, 24)},
    {"text": "He gave him some lettuce and a tiny red hat,", "notes": [
        (40.0, 0.5, "He", "E4"), (40.5, 0.5, "gave", "G4"), (41.0, 0.5, "him", "E4"),
        (41.5, 0.5, "some", "E4"), (42.0, 0.5, "let", "G4"), (42.5, 0.5, "-tuce", "E4"),
        (43.0, 0.5, "and", "E4"), (43.5, 0.5, "a", "G4"),
        (44.0, 0.5, "ti", "A4"), (44.5, 0.5, "-ny", "A4"),
        (45.0, 1.0, "red", "A4"), (46.0, 1.5, "hat,", "F4"),
    ]},
    {"text": "said, “Nobody's ever seen a turtle like that!”", "notes": [
        (48.0, 0.5, "said,", "G4"), (48.5, 0.5, "“No", "G4"), (49.0, 0.5, "-bod", "E4"),
        (49.5, 0.5, "-y's", "G4"), (50.0, 0.5, "ev", "C5"), (50.5, 0.5, "-er", "B4"),
        (51.0, 0.5, "seen", "A4"), (51.5, 0.5, "a", "G4"),
        (52.0, 0.5, "tur", "B4"), (52.5, 0.5, "-tle", "A4"),
        (53.0, 1.0, "like", "B4"), (54.0, 1.5, "that!”", "G4"),
    ]},
    {"text": "Trump likes turtles, yes he really, really does!",
     "notes": _shift(_CHORUS_A, 56)},
    {"text": "Tremendous little turtles, the best there ever was!",
     "notes": _shift(_CHORUS_B, 56)},
    {"text": "Slow and steady… believe me!", "notes": [
        (72.0, 1.0, "Slow", "C5"), (73.0, 1.0, "and", "A4"),
        (74.0, 1.0, "stea", "B4"), (75.0, 0.5, "-dy…", "G4"),
        (75.5, 0.5, "be", "G4"), (76.0, 1.0, "-lieve", "B4"), (77.0, 2.5, "me!", "C5"),
    ]},
]

# Lines where the cartoon Trump lip-syncs (chorus + his own quote + outro).
LIPSYNC_LINES = [2, 3, 5, 6, 7, 8]

# Sound effects the animation also reacts to (same beat = same moment on screen).
SFX = [
    {"beat": 0.0, "sfx": "crash"},
    {"beat": 6.0, "sfx": "snare_roll", "dur": 2.0},
    {"beat": 18.0, "sfx": "bloop_up"},          # turtle pops its head out
    {"beat": 22.0, "sfx": "sparkle"},           # heart appears
    {"beat": 24.0, "sfx": "crash"},
    {"beat": 24.0, "sfx": "choir_swell", "dur": 4.0},  # turtle lifted to the sky
    {"beat": 28.0, "sfx": "whoosh", "dur": 3.5},       # happy spin
    {"beat": 41.0, "sfx": "crunch"}, {"beat": 41.5, "sfx": "crunch"},
    {"beat": 42.0, "sfx": "crunch"}, {"beat": 42.5, "sfx": "crunch"},
    {"beat": 45.0, "sfx": "ding"},              # tiny red hat goes on
    {"beat": 48.5, "sfx": "camera"}, {"beat": 49.5, "sfx": "camera"},
    {"beat": 50.5, "sfx": "camera"}, {"beat": 51.25, "sfx": "camera"},
    {"beat": 52.5, "sfx": "camera"}, {"beat": 53.5, "sfx": "camera"},
    {"beat": 56.0, "sfx": "crash"},
    {"beat": 56.0, "sfx": "march_snare", "dur": 8.0},  # turtle parade
    {"beat": 64.0, "sfx": "firework_launch"}, {"beat": 65.0, "sfx": "firework_bang"},
    {"beat": 66.0, "sfx": "firework_launch"}, {"beat": 67.0, "sfx": "firework_bang"},
    {"beat": 68.0, "sfx": "firework_launch"}, {"beat": 69.0, "sfx": "firework_bang"},
    {"beat": 70.0, "sfx": "firework_launch"}, {"beat": 70.5, "sfx": "firework_bang"},
    {"beat": 71.0, "sfx": "firework_bang"},
    {"beat": 72.0, "sfx": "chimes"},            # sunset by the pond
    {"beat": 77.0, "sfx": "crash"},             # final hit
    {"beat": 78.5, "sfx": "wink"},              # turtle winks at the camera
]


def build():
    lines = []
    syllables = []
    for i, line in enumerate(LINES):
        notes = line["notes"]
        start = notes[0][0]
        end = notes[-1][0] + notes[-1][1]
        lines.append({"index": i, "text": line["text"], "start": start, "end": end,
                      "lipsync": i in LIPSYNC_LINES})
        for (b, d, s, p) in notes:
            syllables.append({"line": i, "beat": b, "dur": d,
                              "text": s.lstrip("-"), "joinPrev": s.startswith("-"),
                              "pitch": p})
    return {
        "title": "Trump Likes Turtles",
        "bpm": BPM,
        "beats": BEATS,
        "secondsPerBeat": SECONDS_PER_BEAT,
        "duration": BEATS * SECONDS_PER_BEAT,
        "transpose": TRANSPOSE,
        "sections": SECTIONS,
        "chords": [{"start": a, "end": b, "chord": c} for (a, b, c) in CHORDS],
        "lines": lines,
        "syllables": syllables,
        "sfx": SFX,
    }


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    score = build()
    with open(os.path.join(here, "score.json"), "w") as f:
        json.dump(score, f, indent=1, ensure_ascii=False)
    with open(os.path.join(here, "..", "js", "score.js"), "w") as f:
        f.write("// Generated by audio/score.py - do not edit by hand.\n")
        f.write("window.SCORE = " + json.dumps(score, ensure_ascii=False) + ";\n")
    print("wrote score.json and js/score.js:",
          len(score["lines"]), "lines,", len(score["syllables"]), "syllables")
