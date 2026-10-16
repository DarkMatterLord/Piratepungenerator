#!/usr/bin/env bash
# Encode the rendered JPEG frame sequence + the song into the final MP4.
#   bash render/encode.sh [frames_dir] [output.mp4] [crf] [tune]   (defaults: crf 20, tune animation)
set -euo pipefail
cd "$(dirname "$0")/.."
FRAMES="${1:-build/frames}"
OUT="${2:-build/Necromantical_MusicVideo_1080p.mp4}"
CRF="${3:-20}"
TUNE="${4:-animation}"
ffmpeg -y -hide_banner -loglevel warning -stats \
  -framerate 30 -i "$FRAMES/f_%06d.jpg" \
  -i audio/Necromantical.mp3 \
  -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf "$CRF" -tune "$TUNE" -pix_fmt yuv420p \
  -c:a aac -b:a 256k \
  -metadata title="Necromantical (Music Video)" -metadata artist="darkmatter96" \
  -shortest -movflags +faststart "$OUT"
ls -lh "$OUT"
