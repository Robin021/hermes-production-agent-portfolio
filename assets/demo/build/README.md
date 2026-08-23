# How the demo videos are built

Both videos in this folder are generated, not recorded.

```
./build.sh
```

That is the whole procedure. It regenerates the frames, the subtitles, the
timelines and both MP4s from source, and the output is byte-identical each run.

## Why generated instead of screen-recorded

A screen recording of the real system would contain a real mailbox, a real
operator channel, real message and thread identifiers, a hostname and a
filesystem layout. Redacting a video frame by frame is error-prone and
unverifiable. Drawing every frame from synthetic fixtures makes the leak
impossible rather than merely unlikely: there is no capture to redact.

The tradeoff is stated plainly in the videos themselves. Every frame carries
a `SYNTHETIC FIXTURE / NO CUSTOMER DATA` marker, and the numbers on screen are
the real measured numbers from the private engineering repository.

## Files

| Path | What it is |
| --- | --- |
| `render.mjs` | The renderer. Frame types, layout, captions, subtitle and concat generation. |
| `scenes-short.mjs` | 13 scenes, 90 s. Mirrors `docs/DEMO_SHORT_SCRIPT.md`. |
| `scenes-technical.mjs` | 19 scenes, 252 s. Mirrors `docs/DEMO_TECHNICAL_SCRIPT.md`. |
| `build.sh` | Frames, then rasterize, then encode. |
| `frames/*.svg` | Generated vector frames, 1920x1080. Source of truth for pixels. |
| `png/*.png` | Rasterized frames. Regenerable; not committed. |
| `concat-*.txt` | ffmpeg concat lists with per-frame durations. |

Outputs land one level up in `assets/demo/`:

- `hermes-agent-demo-short.mp4` and `hermes-agent-demo-technical.mp4`
- `.srt` and `.vtt` subtitles for both
- `short.timeline.json` and `technical.timeline.json`

## One timeline, three outputs

Each scene declares its id, type, duration and caption once. From that single
list the renderer emits the frame, the burned-in caption, the subtitle cue and
the ffmpeg duration together. A timing change cannot desynchronize the video
from its subtitles or from the written script, because there is only one place
to change it.

The timeline JSON is the artifact the written scripts cite, so the documents,
the subtitles and the encoded video always agree.

## Requirements

- Node 20 or newer
- ffmpeg with libx264
- A headless Chrome or Chromium that can screenshot a local file

`build.sh` looks for a Playwright headless shell, then `chrome-headless-shell`,
`chromium` and `google-chrome` on `PATH`. Override anything that matters:

```
CHROME_SHELL=/path/to/chrome-headless-shell NODE_BIN=node FFMPEG_BIN=ffmpeg ./build.sh
```

## Encoding notes

H.264, yuv420p, 30 fps, CRF 20, `+faststart`. No audio stream at all, which is
why the videos are safe to autoplay muted. `-map_metadata -1` strips container
metadata so no username, machine name or software path rides along.

The concat demuxer ignores the last entry’s duration, so the renderer repeats
the final frame and the encoder trims to the exact scripted length with `-t`.
That is what keeps the file at exactly 90.000 s and 252.000 s.
