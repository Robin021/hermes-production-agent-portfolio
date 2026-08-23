#!/usr/bin/env bash
# Rebuild both demo videos from source. One command, no manual steps.
#
#   ./build.sh
#
# Requires: node 20+, ffmpeg with libx264, and a headless Chrome/Chromium
# binary able to screenshot a local SVG. Override detection with:
#
#   CHROME_SHELL=/path/to/chrome-headless-shell ./build.sh
#
# Deterministic: same sources in, byte-identical frames out. Nothing here
# touches a network, a mailbox, or a real credential.

set -euo pipefail
cd "$(dirname "$0")"

NODE_BIN="${NODE_BIN:-node}"
FFMPEG_BIN="${FFMPEG_BIN:-ffmpeg}"

# ---------------------------------------------------------------- 1. frames
# Each scene file writes: frames/*.svg, ../*.srt, ../*.vtt,
# ../<name>.timeline.json and concat-<name>.txt
"$NODE_BIN" scenes-short.mjs
"$NODE_BIN" scenes-technical.mjs

# ------------------------------------------------------------ 2. rasterize
find_chrome() {
  if [ -n "${CHROME_SHELL:-}" ]; then printf '%s' "$CHROME_SHELL"; return; fi
  local c
  for c in \
    "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell \
    "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell \
    "$(command -v chrome-headless-shell || true)" \
    "$(command -v chromium || true)" \
    "$(command -v google-chrome || true)" ; do
    [ -n "$c" ] && [ -x "$c" ] && { printf '%s' "$c"; return; }
  done
  echo "no headless Chrome found; set CHROME_SHELL=/path/to/binary" >&2
  exit 1
}
CHROME="$(find_chrome)"

mkdir -p png
n=0
for svg in frames/*.svg; do
  id="$(basename "$svg" .svg)"
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1920,1080 \
    --screenshot="$PWD/png/$id.png" "file://$PWD/$svg" >/dev/null 2>&1
  n=$((n+1))
done
echo "rasterized $n frames at 1920x1080"

# --------------------------------------------------------------- 3. encode
# The concat demuxer ignores the final entry's duration, so render.mjs repeats
# the last frame and we trim to the exact scripted length with -t. That keeps
# the video, the .srt and the written script agreeing to the millisecond.
encode() {
  local name="$1" out="../hermes-agent-demo-$1.mp4" secs
  secs="$("$NODE_BIN" -e 'const t=require("../"+process.argv[1]+".timeline.json");process.stdout.write(String(t.total_seconds))' "$name")"
  "$FFMPEG_BIN" -y -hide_banner -loglevel error \
    -f concat -safe 0 -i "concat-$name.txt" \
    -t "$secs" -map_metadata -1 \
    -pix_fmt yuv420p -c:v libx264 -crf 20 -r 30 -movflags +faststart "$out"
  echo "$out  ${secs}s"
}
encode short
encode technical

echo "done. videos are silent by design: there is no audio stream to mute."
