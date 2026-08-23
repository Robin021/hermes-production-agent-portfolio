# Short Demo Script — 90 seconds

The muted-playback version of the pitch. Every claim in this cut is legible on screen; the
voice-over is optional and adds nothing the frames do not already say.

Source of truth for timing: [assets/demo/short.timeline.json](../assets/demo/short.timeline.json).
The same file generates the frames, the subtitles and the video. If a timecode below and that
file disagree, the file is right.

- Video: `assets/demo/hermes-agent-demo-short.mp4`
- Subtitles: `assets/demo/hermes-agent-demo-short.srt` / `.vtt`
- Frame sources: `assets/demo/build/frames/S*.svg` (hand-authored vector, no screen capture)

All identifiers are synthetic placeholders. No real message, thread, draft, account, host or
credential appears in any frame.

---

## Frame plan

| # | In | Out | Frame | What is on screen | The beat it lands |
|---|---|---|---|---|---|
| S01 | 0:00 | 0:06 | Title card | *An AI agent that can draft the reply — but cannot send it.* Under it: 2,627 assertions &#183; 0 failures &#183; 0 emails sent | The objection first, the product second |
| S02 | 0:06 | 0:10 | Inbox | A support message: *"Where is my order SO-1001?"* Unread, in a test label | A real support workflow, synthetic data |
| S03 | 0:10 | 0:16 | Terminal | `mail-cli process --message-id <MESSAGE_ID_A>` and a typed read-only lookup returning the order record | The agent reads; it does not guess |
| S04 | 0:16 | 0:20 | Evidence panel | Order row, status, tracking reference, `grounded=True` | The answer is tied to a record, not to fluent text |
| S05 | 0:20 | 0:26 | Draft view | The reply, in the original thread, `To:` the original sender, CC/BCC empty, banner **DRAFT &#8212; NOT SENT** | The agent composes; a human sends |
| S06 | 0:26 | 0:30 | Non-mutation check | Labels and unread state identical before and after; `programmatic_sends=0` | Reading changed nothing at all |
| S07 | 0:30 | 0:38 | Inbox | A second message: *"Cancel my order and refund SO-1004."* | Now the request touches money |
| S08 | 0:38 | 0:45 | Terminal | `status=awaiting_approval`, `business_rows_written=0`, an acknowledgement draft and nothing else | High risk stops at a human, by construction |
| S09 | 0:45 | 0:55 | Operator channel | An approval card: action, target, amount, expiry, and two buttons | The decision path contains zero model tokens |
| S10 | 0:55 | 1:05 | Split proof | **APPROVAL RECORDED** next to **BUSINESS STATE UNCHANGED** &#8212; the same table hash before and after | Approve is not execute |
| S11 | 1:05 | 1:15 | Terminal | `executor-cli execute --approval <APPROVAL_ID>` run under a separate login | Execution is a second, explicit human act |
| S12 | 1:15 | 1:24 | Result + notification | `rows_written=1`, `idempotent_replay=false`, and the outcome notification in the operator channel | Exactly one mutation, reported after the fact |
| S13 | 1:24 | 1:30 | Final card | The five closing lines | What a buyer should remember |

Total run time: 90.0 s.

## Captions, verbatim

These strings are baked into the frames *and* shipped as subtitles, so the cut reads the same
with the sound off.

| # | Caption |
|---|---|
| S01 | An AI agent that can draft a customer reply &#8212; and cannot send it. |
| S02 | A support request arrives. Ordinary, low risk, no money involved. |
| S03 | The agent reads one named message and looks up the order through a typed, read-only tool. |
| S04 | The reply is grounded in a record. No record, no claim &#8212; the run fails closed instead. |
| S05 | A draft appears in the original thread, addressed to the person who wrote in. Nothing is sent. |
| S06 | Reading mutated nothing: same labels, still unread, zero sends. |
| S07 | Now a request that would move money. |
| S08 | The agent stops at awaiting_approval and writes no business row. It never had the permission to. |
| S09 | A human decides, in a channel with no model in it. |
| S10 | The approval is recorded &#8212; and business state is byte-identical. Approving is not executing. |
| S11 | Execution is a separate, explicit command under a separate login. |
| S12 | One write. One outcome notification. Replaying the command changes nothing further. |
| S13 | AI can reason. It cannot authorize itself, and it cannot write. |

## Optional voice-over

Read at a normal pace this lands at roughly 88 seconds. Skip it entirely and the cut still
works &#8212; that is the requirement, not a nice-to-have.

> **0:00** Every team wants an AI agent on their support inbox. The question that stops them is
> always the same one: what happens when it emails a customer something wrong?
>
> **0:06** So here is a support request. Real workflow, synthetic customer.
>
> **0:10** The agent reads one message and looks up the order through a typed, read-only tool.
> It has no other way to learn anything.
>
> **0:16** The answer is tied to that record. If the lookup fails, the run fails &#8212; it does not
> improvise a status.
>
> **0:20** And this is the whole product in one frame. A draft, in the right thread, addressed
> to exactly the person who wrote in. Not sent. There is no code path here that can send it.
>
> **0:26** Reading the mailbox changed nothing: same labels, still unread, zero sends.
>
> **0:30** Now the interesting case. A refund.
>
> **0:38** The agent stops at awaiting approval, and it wrote no business row &#8212; not because it
> was told not to, but because its database login has no write permission at all.
>
> **0:45** A human decides. There is not a single model token in this path.
>
> **0:55** And here is the part most designs get wrong. The approval is recorded, and the
> business tables are byte-identical. Approving something does not perform it.
>
> **1:05** Execution is a second, deliberate act, under a different login.
>
> **1:15** One write, through a stored function that re-validates the approval inside the
> transaction. Then the outcome comes back to the operator. Run it again and nothing else moves.
>
> **1:24** That is an agent with a blast radius you can measure.

## Redaction, applied at build time

Nothing in this cut is a screen capture. Every frame is a hand-authored vector drawing built
from synthetic fixtures, which is why there is no host address, mailbox address, avatar,
bot name, chat id, real identifier, absolute path, connection string or token anywhere in it.
The shell prompt is a bare symbol. The account chip reads *support inbox*.

The one-line rule: if a frame contains something a stranger could type somewhere, it does not
ship.
