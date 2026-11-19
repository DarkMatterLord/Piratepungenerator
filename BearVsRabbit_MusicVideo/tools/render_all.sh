#!/usr/bin/env bash
# Render the whole video in N parallel segments, then concat + mux the original audio.
# usage: tools/render_all.sh <audio.mp3> <out.mp4> [workers] [workdir]
set -euo pipefail
AUDIO="$1"; OUT="$2"; N="${3:-4}"; WD="${4:-/tmp/bvr_render}"
cd "$(dirname "$0")/.."
mkdir -p "$WD"
FRAMES=$(node -e "console.log(require('./data/audio_features.json').frames)")
PER=$(( (FRAMES + N - 1) / N ))
pids=()
: > "$WD/list.txt"
for i in $(seq 0 $((N-1))); do
  A=$((i*PER)); B=$(( (i+1)*PER )); [ $B -gt $FRAMES ] && B=$FRAMES
  node src/render.js --from $A --to $B --out "$WD/seg_$i.mp4" --crf "${CRF:-19}" --preset "${PRESET:-medium}" > "$WD/log_$i.txt" 2>&1 &
  pids+=($!)
  echo "file '$WD/seg_$i.mp4'" >> "$WD/list.txt"
done
for p in "${pids[@]}"; do wait $p; done
ffmpeg -y -v error -f concat -safe 0 -i "$WD/list.txt" -i "$AUDIO" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -movflags +faststart -shortest "$OUT"
echo "DONE $OUT"
