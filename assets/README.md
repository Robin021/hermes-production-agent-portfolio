# assets/

Three diagrams, each written to answer one buyer question in the time it takes to look at it.
Committed as SVG (the source of truth, hand-authored, diffable) and as a 2x PNG for slides,
proposals and anywhere Markdown rendering of SVG is unreliable.

| File | The question it answers |
|---|---|
| `workflow.svg` / `.png` | *What actually happens to an incoming email?* Both paths side by side: the low-risk path ending in an unsent draft, and the high-risk path stopping at a human. |
| `separation-of-duties.svg` / `.png` | *If one credential leaks, what can the attacker do?* A capability matrix over seven principals, showing which verbs each one does not have. |
| `approval-execution-flow.svg` / `.png` | *Does approving a refund issue the refund?* No. The diagram names the gap between authorization and action and explains why nothing closes it automatically. |

The Mermaid sources in [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) stay authoritative for
the component-level view; they render inline and cannot drift from the surrounding text. These
three files exist because a matrix and a swimlane are worth hand-setting, and because a buyer
skimming a page looks at pictures first.

## demo/

Two silent, caption-burned cuts of the same walkthrough, plus everything needed to rebuild them:

| File | What it is |
|---|---|
| `demo/hermes-agent-demo-short.mp4` | 90 s, 1920x1080, 30 fps. The version a buyer watches before deciding whether to keep reading. |
| `demo/hermes-agent-demo-technical.mp4` | 252 s. Same arc, with the enforcement mechanism shown beside each claim. |
| `demo/poster-short.png` / `poster-technical.png` | Single-frame stills, used as the clickable thumbnails in the top-level README. |
| `demo/*.srt` / `demo/*.vtt` | Subtitles in both common formats. The videos carry no audio track at all, so captions are the only narration. |
| `demo/*.timeline.json` | The single source of truth for scene order and timing. Frames, subtitles and video all derive from it. |
| `demo/build/` | Scene definitions, hand-authored SVG frames, and `build.sh` — one command reproduces both MP4s byte for byte. See [demo/build/README.md](demo/build/README.md). |

Same rule as the diagrams, for the same reason: **every frame is drawn, not captured.**

## Regenerating the PNGs

The PNGs are exports, not originals. Edit the SVG, then re-export at 2x with any headless
browser:

```
chrome-headless-shell --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=<W>,<H> \
  --screenshot=assets/<name>.png file://$PWD/assets/<name>.svg
```

Sizes match each file's `viewBox`: workflow 1400x640, separation-of-duties 1400x780,
approval-execution-flow 1500x890. Any SVG renderer works; the diagrams use no external
fonts beyond a system sans-serif fallback chain and no embedded raster data.

## The rule every file here has to pass

These three diagrams are drawn rather than captured, so there is nothing in them to leak.
That is deliberate: **no screen capture of a real mailbox, terminal or chat client is
committed to this repository.** Every label is either a synthetic identifier or a role
described by function.

If a screen capture is ever added, it has to survive the checklist below first, which is the
same one in [docs/DEMO.md](../docs/DEMO.md) and reduces to one line:

> If a frame contains an address, a path, a key, an id or a hostname that a stranger could
> type somewhere, it does not get published.

| Check | What to do |
|---|---|
| Shell prompt | Reduced to a bare symbol - no user, no host, no working directory |
| Window title and tab bar | Cropped out, since both carry paths and account names |
| Mail account chip | Collapsed; avatar and address out of frame |
| Message, thread and draft identifiers | Replaced with the placeholders used throughout `examples/` |
| Operator channel header | Cropped - the bot name and chat id live there |
| Connection strings, config files, environment listings | Never on screen at all |
| Desktop notifications, unrelated tabs, other mailbox folders | Clean profile, notifications off before recording |

Blur is a last resort rather than the plan. Compose the frame so the sensitive region is
never captured, because a blur applied to a screenshot can sometimes be undone and a crop
cannot. And strip image metadata before committing - a screenshot can carry a device name, a
username inside a file path, and occasionally a location.

---

*Every identifier appearing in any asset here is synthetic, exactly as in `examples/`.*
