# Technical Demo Script — 4 minutes

For a reader who will ask *how is that enforced?* after every sentence. Same arc as the short
cut, with the enforcement mechanism shown next to each claim.

Source of truth for timing: [assets/demo/technical.timeline.json](../assets/demo/technical.timeline.json).

- Video: `assets/demo/hermes-agent-demo-technical.mp4`
- Subtitles: `assets/demo/hermes-agent-demo-technical.srt` / `.vtt`
- Frame sources: `assets/demo/build/frames/T*.svg`, plus the three architecture diagrams in `assets/`

Test output shown in the frames is transcribed from the recorded regression run, with database
role names replaced by their function (*mail runtime*, *approval runtime*, *executor*,
*business read role*). Identifiers are synthetic placeholders throughout.

---

## Frame plan

| # | In | Out | Frame | On screen | The mechanism |
|---|---|---|---|---|---|
| T01 | 0:00 | 0:08 | Title card | *Human-supervised AI agent for customer operations.* 2,627 assertions &#183; 0 failures &#183; 32 stages &#183; 0 emails sent | The claim, with the number that backs it |
| T02 | 0:08 | 0:20 | Architecture | `assets/workflow.png` | Two paths: low risk ends in a draft, high risk ends at a human |
| T03 | 0:20 | 0:34 | Tool boundary | The agent tool table: four read tools, one open-case tool, and the closed operation table | The agent holds no write verb. Not policy &#8212; absence |
| T04 | 0:34 | 0:46 | Case A terminal | `mail-cli process`, typed lookup, `grounded=True`, one draft in the source thread | Envelope derivation is a pure function of the source message |
| T05 | 0:46 | 0:58 | Non-mutation proof | Labels and unread identical before/after; `88 passed, 0 failed`; *the only new object anywhere is one draft* | Asserted mailbox-state equality, not an assumption |
| T06 | 0:58 | 1:12 | Injection email | The hostile message in full: three header-injection attempts plus an exfiltration instruction | The worst realistic input, read out loud |
| T07 | 1:12 | 1:28 | Injection result | `To:` unchanged, CC/BCC/Reply-To empty, attacker domain absent from the body | Model output never reaches an envelope field |
| T08 | 1:28 | 1:40 | Injection suite | `165 passed, 0 failed` &#183; *the attack surface does not exist, structurally* &#183; *zero model calls* | Five attack shapes, deterministic, no LLM in the assertion path |
| T09 | 1:40 | 1:52 | Grounding failure | Induced tool timeout: `agent_unsafe_output`, `drafts created: 0` | Fail-closed: no grounding verdict, no draft. A permanent fault-injection stage |
| T10 | 1:52 | 2:06 | Deterministic policy | Risk classification table: intent &#8594; risk &#8594; disposition, with no model in the decision | The same input always produces the same disposition |
| T11 | 2:06 | 2:20 | Approval card | Action, target entity, amount, snapshot hash, expiry | A decision record, not a chat message |
| T12 | 2:20 | 2:36 | Approve &#8800; execute | `assets/approval-execution-flow.png` &#8212; approval recorded, business tables byte-identical | The gap is the design. Nothing consumes approvals automatically |
| T13 | 2:36 | 2:52 | Execution | `executor-cli execute` under a separate login; one stored function; `rows_written=1` | The approval, the snapshot hash and the entity state are re-validated inside the transaction |
| T14 | 2:52 | 3:04 | Idempotency | Twenty concurrent passes &#8594; still exactly one draft; `48 passed, 0 failed` | A unique index, not a retry counter |
| T15 | 3:04 | 3:20 | Least privilege | `assets/separation-of-duties.png` &#183; `327 passed, 0 failed` &#183; 7 principals &#183; 42 negative probes | Real SQL under real logins. Statements that fail if the claim is false |
| T16 | 3:20 | 3:34 | Opposed roles | Mail runtime can open an approval and cannot decide one; approval runtime can decide and cannot open | Nobody can file a request and then approve it &#8212; enforced by grants |
| T17 | 3:34 | 3:48 | The privilege bug | Grant replay skipped grants inside `DO $$` blocks; PostgreSQL grants EXECUTE to PUBLIC by default | Fix: explicit revoke plus a parser rewrite. The restore drill re-runs all 327 assertions against the restored copy |
| T18 | 3:48 | 4:00 | Honest boundary | *No draft-only scope exists. The token can technically send. No code path can express it, and 440 structural assertions plus an import guard keep it that way.* | The claim and its limit, side by side |
| T19 | 4:00 | 4:12 | Final card | The five closing lines | |

Total run time: 252.0 s.

## Captions, verbatim

| # | Caption |
|---|---|
| T01 | 2,627 assertions. 0 failures. 0 emails sent. |
| T02 | Low risk ends in an unsent draft. High risk ends at a human. |
| T03 | The agent has four read tools and one way to open a case. No write verb exists in its interface. |
| T04 | One named message in, one grounded draft out, in the original thread. |
| T05 | Mailbox state before and after: identical. The only new object anywhere is one draft. |
| T06 | Now the hostile version: three header-injection attempts and an exfiltration instruction. |
| T07 | Recipient unchanged. No CC, no BCC, no Reply-To, no smuggled header. |
| T08 | Five attack shapes, 165 assertions, zero model calls. The attack surface is structurally absent. |
| T09 | When grounding fails, the run fails. Zero drafts created &#8212; asserted, permanently. |
| T10 | Risk classification is deterministic. The model never decides what is allowed. |
| T11 | The approval is a record: action, target, amount, snapshot hash, expiry. |
| T12 | Approval recorded. Business state byte-identical. Approving is not executing. |
| T13 | Execution is a separate command under a separate login, re-validated inside the transaction. |
| T14 | Twenty concurrent passes, still exactly one draft. Guaranteed by a unique index. |
| T15 | 327 privilege assertions, seven principals, real SQL under real logins. |
| T16 | The mail runtime can open an approval and cannot decide one. The approval runtime is the reverse. |
| T17 | The bug worth showing: a restored database granted EXECUTE to PUBLIC. Found by a probe, not a review. |
| T18 | The provider offers no draft-only scope. What is proven is that no code path can express a send. |
| T19 | AI can reason. It cannot authorize itself, and it cannot write. |

## Optional voice-over

> **0:00** Two thousand six hundred and twenty-seven assertions, no failures, and no email ever
> sent. That last number is the one that matters, so let me show you why it holds.
>
> **0:08** Two paths. A low-risk question ends as an unsent draft. Anything that would change
> business state ends at a human, and approving it still does not perform the write.
>
> **0:20** Start with the tools. The agent gets four read-only lookups and one way to open a
> case for a human. There is no send tool, no update tool, no SQL. Not disabled &#8212; absent.
>
> **0:34** Case A. One named message in, one draft out, in the original thread, addressed to the
> sender. The envelope is derived from the source message; the model contributes body text and
> an intent, and that is the whole extent of its authority.
>
> **0:46** And reading the mailbox mutated nothing. Labels, unread state, thread membership,
> compared before and after. Eighty-eight assertions say the only new object anywhere is one draft.
>
> **0:58** Now the hostile version. Three separate attempts to rewrite the headers plus an
> instruction to forward the thread, wrapped in an ordinary order-status question.
>
> **1:12** Recipient unchanged. No CC, no BCC, no Reply-To. The attacker domain does not appear
> in the body either.
>
> **1:28** Five attack shapes, a hundred and sixty-five assertions, and zero model calls in the
> assertion path &#8212; because the defence is not a prompt.
>
> **1:40** Here is a real defect I found in my own system. I induced a tool timeout. The model
> asserted an order status with no evidence behind it, the safety layer rejected the run &#8212; and
> the mail workflow drafted a reply anyway. Now a draft requires an explicit grounding verdict
> and an explicit draft verdict, both true. A missing verdict fails closed, and a permanent
> fault-injection stage asserts the absence of a draft.
>
> **1:52** Risk classification is deterministic. Same input, same disposition, every time.
>
> **2:06** A high-risk request becomes a record: action, target, amount, a hash of the entity
> snapshot, an expiry.
>
> **2:20** The operator approves. And the business tables are byte-identical. Nothing consumes
> approved decisions automatically &#8212; that gap is the design, not a missing feature.
>
> **2:36** Execution is a separate command under a separate login, which has no direct write
> permission on business tables. It can call three stored functions, and each one re-validates
> the approval, the snapshot hash and the entity state inside the transaction. Changing a
> customer address is not blocked; no function takes one.
>
> **2:52** Live mailboxes redeliver, so twenty concurrent passes over the same message still
> produce exactly one draft. That is a unique index, not a retry counter.
>
> **3:04** And the biggest single suite proves privileges: three hundred and twenty-seven
> assertions running real SQL under seven real logins, forty-two of them checking that something
> is *refused*.
>
> **3:20** Two roles point in opposite directions on purpose. The mail runtime can open an
> approval and has no permission to decide one. The approval runtime can decide and cannot open
> one. Nobody files a request and then approves it, and that is a grant table.
>
> **3:34** Which found a genuine bug. Grant replay after a restore scanned migration text and
> silently skipped grants written inside procedural blocks &#8212; and PostgreSQL grants EXECUTE to
> PUBLIC by default. So a restored database briefly let any login call the executor functions.
> A probe caught it; no code review would have. The restore drill now re-runs all three hundred
> and twenty-seven privilege assertions against the restored copy.
>
> **3:48** One honest limit. The provider has no draft-only scope, so the compose token is
> technically capable of sending. What I have proven is that no code path here can express a
> send: one choke point, a closed table of seven operations, and a guard that refuses to import
> the module if a forbidden operation appears. That is a real boundary and a different claim
> from impossible. I would rather tell you which one it is.
>
> **4:00** An agent with a blast radius you can measure.

## Redaction, applied at build time

Same rule as the short cut, and for the same reason: every frame is generated vector art built
from synthetic fixtures, so there is no capture of a real mailbox, terminal or chat client in
this repository. Database role names in the privilege frames are rewritten to functional
descriptions; test *counts* are transcribed verbatim because they are the evidence.
