#!/usr/bin/env bash
# Encode the rendered 12 fps paper-motion frames + the song into a 24 fps H.264 MP4.
# Usage: tools/encode.sh frames/ song.mp3 out/mr-weathervane.mp4 [crf]
set -euo pipefail
FRAMES=${1:-frames}; AUDIO=${2:-song.mp3}; OUT=${3:-out/mr-weathervane.mp4}; CRF=${4:-20}
mkdir -p "$(dirname "$OUT")"
ffmpeg -hide_banner -y -framerate 12 -i "$FRAMES/f_%06d.jpg" -i "$AUDIO" \
  -map 0:v -map 1:a -vf "fps=24,format=yuv420p" \
  -c:v libx264 -preset slow -tune animation -crf "$CRF" -profile:v high -level 4.1 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest "$OUT"
