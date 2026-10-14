#!/usr/bin/env bash
# Encode the rendered 12 fps stained-glass frames + the song into 24 fps H.264 MP4s.
#   tools/encode.sh master  <frames> <song.mp3> <out.mp4> [captionsDir]   high-quality master (CRF 18)
#   tools/encode.sh share   <frames> <song.mp3> <out.mp4> [captionsDir]   two-pass copy sized under ~29 MiB
set -euo pipefail
MODE=$1; FRAMES=$2; AUDIO=$3; OUT=$4; CAPS=${5:-}
mkdir -p "$(dirname "$OUT")"
IN=(-framerate 12 -i "$FRAMES/f_%06d.jpg")
VF="[0:v]fps=24,format=yuv420p[v]"
if [[ -n "$CAPS" ]]; then
  IN+=(-framerate 12 -i "$CAPS/c_%06d.png")
  VF="[0:v][1:v]overlay=0:0:format=auto,fps=24,format=yuv420p[v]"
fi
AIDX=$(( ${#IN[@]} / 4 ))
if [[ "$MODE" == master ]]; then
  ffmpeg -hide_banner -y "${IN[@]}" -i "$AUDIO" -filter_complex "$VF" -map "[v]" -map "$AIDX:a" \
    -c:v libx264 -preset slow -tune animation -crf 18 -profile:v high -level 4.1 \
    -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest "$OUT"
else
  # 6:13 at ~29 MiB total: ~560 kb/s video + 80 kb/s audio, 720p
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$AUDIO")
  VB=$(python3 -c "print(int((29*8*1024*1024/float('$DUR') - 82000)/1000))")
  VF2="${VF%\[v\]},scale=1280:720:flags=lanczos[v]"
  ffmpeg -hide_banner -y "${IN[@]}" -filter_complex "$VF2" -map "[v]" -an -c:v libx264 -preset slow -tune animation -b:v "${VB}k" -pass 1 -passlogfile /tmp/cmc2pass -f mp4 /dev/null
  ffmpeg -hide_banner -y "${IN[@]}" -i "$AUDIO" -filter_complex "$VF2" -map "[v]" -map "$AIDX:a" \
    -c:v libx264 -preset slow -tune animation -b:v "${VB}k" -pass 2 -passlogfile /tmp/cmc2pass \
    -c:a aac -b:a 80k -ar 44100 -movflags +faststart -shortest "$OUT"
fi
ls -la "$OUT"
