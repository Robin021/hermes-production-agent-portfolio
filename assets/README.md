# assets/

Visual material for this repository: the architecture diagram exports and the stills taken
from the demo recording.

**Nothing is committed here yet.** The diagrams in [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
render from source in the Markdown itself, so they stay correct when the text changes and need
no binary here. Image exports are produced on request for a proposal or a slide deck.

## What belongs here

| File | Purpose |
|---|---|
| `architecture.svg` / `architecture.png` | Rendered export of the trust-boundary diagram, for slides and proposals |
| `approval-flow.svg` | The request to decision to execution sequence, rendered |
| `demo-thumbnail.png` | Opening frame of the walkthrough video |
| `demo-case-b.png` | The injection case: the attacker address in the body, absent from the envelope |
| `demo-approval.png` | The operator prompt, with the identical before and after digests |
| `demo.gif` | Short loop of one case, for a profile or a listing page |

Prefer SVG for diagrams and PNG for screen captures. Keep each file under about 2 MB so the
repository stays quick to clone.

## The rule every file here has to pass

An image leaks what text review would have caught, because nobody greps a screenshot. The
redaction checklist in [docs/DEMO.md](../docs/DEMO.md) applies to every frame committed here,
and it reduces to one line:

> If a frame contains an address, a path, a key, an id or a hostname that a stranger could type
> somewhere, it does not get published.

In practice, before a capture is added:

| Check | What to do |
|---|---|
| Shell prompt | Reduced to a bare symbol - no user, no host, no working directory |
| Window title and tab bar | Cropped out, since both carry paths and account names |
| Mail account chip | Collapsed; avatar and address out of frame |
| Message, thread and draft identifiers | Blurred, or replaced with the placeholders used throughout `examples/` |
| Operator channel header | Cropped - the bot name and chat id live there |
| Connection strings, config files, environment listings | Never on screen at all |
| Desktop notifications, unrelated tabs, other mailbox folders | Clean profile, notifications off before recording |

Blur is a last resort rather than the plan. Compose the frame so the sensitive region is never
captured, because a blur applied to a screenshot can sometimes be undone and a crop cannot.

One more, easy to forget: strip image metadata before committing. A screenshot can carry a
device name, a username in a file path, and occasionally a location.

---

*Every identifier appearing in any asset here is synthetic, exactly as in `examples/`.*
