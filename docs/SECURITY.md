# Security Model

Every control, what it prevents, and the test that proves it. Nothing here is a policy
statement without a mechanical check behind it.

---

## The organising principle

> An agent is not safe because it was instructed to behave.
> It is safe because the unsafe action is **unrepresentable**.

Three levels of assurance:

| Level | Claim | What breaks it |
|---|---|---|
| Prompt | "The agent is told not to." | One paragraph in a customer email. |
| Code check | "Output is validated before acting." | One bug, one refactor, one new call site. |
| **Structural** | **No code path can express the action; the database refuses it; the credential lacks the grant.** | **A deliberate, reviewed, committed change — which the test suite blocks.** |

Every control below is at level three, and each is re-proven on every regression run.
Headline: **2,627 assertions, 0 failures, 32 stages, 0 emails sent.**

## Control summary

| # | Control | Enforced by | Proof |
|---|---|---|---|
| 1 | Read-only agent tools | Closed JSON schemas, `additionalProperties: false` | 269 tool-boundary assertions |
| 2 | Deterministic policy | Evidence ledger; model may raise risk, never lower it | 221 pipeline + 108 gate assertions |
| 3 | Human approval | Immutable snapshot + sha256 + TTL, revalidated in-transaction | Approval suite; 0 LLM in the path |
| 4 | Approval != execution | No `executed` status exists; no code path decision to business table | Business tables hashed identical before and after every decision |
| 5 | Least-privilege DB roles | 7 principals, granted per verb and per column | **327 assertions, 7 principals, 42 negative probes** |
| 6 | Isolated executor | Separate process, own login, zero LLM, 3 definer functions | 84 executor assertions |
| 7 | Idempotency | Partial unique index, marker committed before the side effect | 20-way race to exactly 1 write; 8 live threads to 1 draft each |
| 8 | Crash reconciliation | Marker-first ordering; orphan adoption | Crash-window test: `crash_recovered`, no double mutation |
| 9 | Audit | Append-only **by privilege**; secret redaction | 24 redaction + 98 secret-hygiene assertions |
| 10 | Draft-only mail | One choke point, closed 7-operation table, import guard | 440 structural + 165 injection assertions |

---

## 1. Read-only agent tools

The agent runtime is narrowed from the framework default of 15 toolsets and 38 native tools
to **1 toolset and 0 native tools**. No terminal, no filesystem, no browser, no arbitrary
HTTP, no scheduler, no code execution.

What remains is six typed read-only tools — customer lookup, customer orders, customer
subscriptions, order lookup, shipment lookup, subscription lookup — each taking **exactly one
id string** matched against an anchored pattern.

The important property is negative. There is no schema field for:

```text
SQL          URL          filesystem path      HTTP method
header       timeout      retry count          batch size
column list  table name   free-form filter     raw body
```

These are not blocked by a validator that a future refactor could weaken. They are absent
from the interface, so they are **unrepresentable**. Unknown keys are rejected rather than
ignored. Malformed ids are refused before any I/O, and the rejected value is never echoed
back into model-visible text.

The agent holds **no mail credential and no database credential** of any kind.

## 2. Deterministic policy

The model does not get to say what happened.

Raw tool frames are parsed into an **evidence ledger**, and the disposition is derived from
that ledger by ordinary code:

- An assertion with no supporting tool evidence causes the run to be **rejected**.
- The model may make an outcome **more** cautious — raise a risk tier, refuse to answer. It
  can never make one **less** cautious.
- A draft that contradicts the evidence is replaced by a deterministic reply.
- A draft is emitted only if the grounding verdict and the draft verdict are **exactly
  `True`** and the agent status is terminal-valid. **A missing verdict fails closed.**

That last rule exists because of a real defect: an induced tool timeout made the model
assert an order status with zero retrieved evidence. The policy layer rejected the run — and
a downstream step drafted the reply anyway, because it only checked whether text existed.
Both layers were "working"; the gap was between them. That class of defect surfaces under
fault injection, not code review. Full write-up: case study finding 5.3.

Ahead of the model sits an **ambiguity gate**: mail with no usable identifier is answered
deterministically with **0 model calls and 0 tokens**. An attacker cannot burn budget with
identifier-less mail, and cost control is an architectural property rather than an alarm.

## 3. Human approval

A high-risk intent — refund, cancellation, anything that moves money — produces an approval
request rather than an action.

| Property | Implementation |
|---|---|
| Immutable snapshot | Entity state captured at request time; the request row is never rewritten |
| Integrity | Canonical-JSON **sha256** of the snapshot |
| Freshness | TTL; expired requests sweep to a terminal state and cannot be decided |
| Anti-TOCTOU | The snapshot is rebuilt and compared **inside the deciding transaction**; if the world moved, the decision is refused |
| Single decision | A unique constraint on the approval id in the decision table |
| No model in the loop | **Zero LLM** in the decision path — the operator reads a rendered record and answers |
| Attribution | Who decided, when, from which channel, against which snapshot hash |

Both decision channels — the operator chat bridge and the CLI — use the **same narrow
database role** and the same approval core. There is no privileged back door where one
channel is bounded and the other is not.

## 4. Approval is not execution

This is the control most often claimed and most rarely true.

In many systems, "approve" is a button that performs the write. Here:

- There is **no `executed` status anywhere in the schema**.
- There is **no code path** from a decision to a business table.
- Business tables are hashed before and after every decision in the test suite and come back
  **byte-identical**.
- Nothing consumes approved decisions automatically. No queue, no worker, no cron.

Approving records **authorization**. Performing the write is a separate act, by a separate
program, run by an operator, under a different database login. Two humans-in-the-loop can be
two different humans, and the audit trail attributes each act independently.

The operator channel is bounded in the same direction: execution-shaped commands are refused
**by name**, and would be powerless anyway because the bridge credential holds no executor
grant. Execution outcomes travel back the other way as **notifications only**, emitted after
commit. No message and no button in that channel can start a write.

## 5. Least-privilege database roles

Seven principals, each granted **per verb and per column**, deny by default. They are
described here by function rather than by their literal role names.

| Principal | Can | Cannot |
|---|---|---|
| Business read-only | SELECT on four business tables | See the control-plane schema **at all** |
| Audit writer | INSERT audit rows | UPDATE or DELETE anything — append-only *by privilege* |
| Mail runtime | Read its own workflow rows; **INSERT** an approval request | **No verb at all** on the decision table; no business schema access; no DELETE; no CREATE; no definer EXECUTE |
| Approval runtime | Approve, reject, close, read | **INSERT an approval request**; touch the business schema; DELETE; CREATE; EXECUTE a definer function |
| Executor | EXECUTE three definer functions | Any direct DML on business tables |
| Definer function owner | Own the write functions | **Log in** — it is NOLOGIN |
| Control-plane owner | Migrations, role setup, operator maintenance | Serve as a daily runtime credential — no runtime path uses it |

The customer-ops agent runtime appears in none of these rows, because it holds **no database
credential at all**. It reaches data only through the read-only toolset.

### The mirror-image pair

The mail runtime and the approval runtime are deliberately pointed in **opposite
directions**. The mail runtime must be able to *open* an approval, because a write-shaped
email genuinely is a request a human must decide — so it holds **no verb whatsoever** on the
decision table. The approval runtime can *close* one and **cannot create** one.

**No single compromised credential can both file a request and approve it.** That is a
database grant table, not a convention in the call graph, so a refactor cannot erase it.

### Proven, not documented

The privilege matrix is a **test**: 327 assertions across 7 principals, executing *real
statements under real logins* against the live catalog, including **42 negative probes** that
confirm the denials actually deny. It runs on every regression. A security review that would
otherwise be a quarterly document is a CI job.

Runtime identity is bound at **import time** from a dedicated connection string. Importing a
workflow without its own credential exits instead of falling back to a broader one — a whole
class of "it silently used the owner connection" incidents is removed by construction.

## 6. Isolated executor

| Property | Value |
|---|---|
| Process | Separate program, invoked explicitly by an operator |
| Credential | Its own login, used nowhere else |
| LLM | **Zero.** No model is loaded, called, or reachable |
| Write capability | `EXECUTE` on exactly three SECURITY DEFINER functions |
| Direct DML | **None** |
| Function owner | A **NOLOGIN** role that no human or service can authenticate as |
| Revalidation | Approval validity, snapshot hash and entity state re-checked **inside** the writing transaction |

Because the write surface is three named functions rather than table access, unintended
mutations are not rejected — they are **unrepresentable**. Changing a customer address is not
"blocked"; no function accepts one.

## 7. Idempotency

Duplicate delivery is normal in real mail and real queues, so it is designed for rather than
patched around.

- A case marker is inserted under a **partial unique index** and **committed before** the
  first external side effect.
- A concurrent duplicate hits the conflict, does not perform the side effect, and returns
  `reused` together with the winner draft id.
- One authorization yields **at most one** business write, enforced by unique index rather
  than by a retry counter or an in-memory lock.

Evidence: a 20-way concurrent executor race produces **exactly one write**. Live, reprocessing
an already-handled message produced **no second draft** — 8 threads, exactly one draft each.

## 8. Crash reconciliation

The dangerous window is between performing an external side effect and recording it. A crash
there is the classic cause of double-charging and double-replying.

Ordering makes it safe: the marker is committed **first**, so after a crash the marker exists
and the orphaned artifact is **adopted** rather than re-created. The run is recorded as
`crash_recovered` with no second mutation.

The same discipline covers the executor: reconciliation determines whether the write landed
and converges to a terminal state without ever mutating twice. When reconciliation itself
cannot resolve, it terminates in an explicit `reconciliation_failed` state that notifies an
operator — **it never guesses**.

*Honest scope:* concurrency and crash recovery are proven **offline**, against the database
and a controlled harness. Repeating them against the live mail provider is future work and is
listed as such.

## 9. Audit

| Property | Implementation |
|---|---|
| Append-only | **By privilege.** The writing role has INSERT and *no* UPDATE or DELETE — not a policy, a grant |
| Coverage | Tool calls, dispositions, approvals, decisions, executions, notifications, reconciliation outcomes |
| Reconstruction | An incident is reconstructed from **rows**, not from log prose |
| Attribution | Every authorization and every execution names its actor, channel and timestamp |
| Redaction | Secrets are redacted before anything is persisted — 24 dedicated assertions |
| Secret hygiene | 98 assertions across nine credential shapes prove no token, refresh token, client secret or connection string reaches a log, an audit row, a prompt, or a draft body |
| Cost accounting | Token usage and cost recorded per run, with pricing decoupled from task logic |

A sanitized audit trail for one end-to-end case is included at
[examples/synthetic-audit.json](../examples/synthetic-audit.json).

## 10. Draft-only mail boundary

All provider traffic passes through **one choke point** into a **closed table of exactly
seven operations**:

```text
GET   messages.get        GET   drafts.list
GET   messages.list       GET   drafts.get
GET   labels.list         GET   profile
POST  drafts.create   <-- the only write operation that exists
```

An **import-time guard** raises `ImportError` if a forbidden substring — send, modify, trash,
delete, forward and four more — appears in any declared path. The module does not load; the
process does not run.

Scopes requested are exactly read-only and compose. Credentials live in a mode-600 file
outside version control, and the loader **fails closed** if the file mode grants any group or
world access. The regression chain fails if OAuth material ever appears in an environment
file.

### What is proven about the draft itself

| Claim | Proof |
|---|---|
| Reading mutates nothing | Labels and unread state compared before and after, byte for byte — identical |
| Exactly one draft per response | Partial unique index; 8 live threads, 1 draft each |
| The reply reaches the source sender | `To:` compared **character for character** with the source `From:` — 34 assertions, 0 failures |
| No CC, no BCC | Asserted per case |
| Correct thread | Draft bound to the source thread, asserted live |
| Injection cannot redirect the envelope | A message instructing the agent to add `To:`, `Bcc:` and `Reply-To: attacker@evil.invalid` and forward the thread: recipient unchanged, attacker domain in **no header and no body** |
| Nothing was sent | A **delta** — the sent count is unchanged across the entire run — plus two bounds a real send could not satisfy. **0 programmatic sends** |

The reason injection resistance is structural rather than lucky: **the agent never chooses
the recipient**. It contributes body text and an intent. Recipient, thread, subject and
headers are computed by pure functions from the source message. There is no code path where
model output reaches an envelope field.

### The honest caveat

The provider offers **no draft-only scope**. The compose token is technically capable of
sending. The proven claim is different and narrower:

> No code path in this system can express a send — and 440 structural assertions plus an
> import-time guard fail loudly the moment one could.

That is a real boundary. It is not the same as "impossible", and the difference is stated
rather than blurred.

## Perimeter and platform

| Control | State |
|---|---|
| Network exposure | Default-deny firewall; **SSH only** from the internet |
| Service binding | Every service bound to loopback; the two components on the agent data path have **no host port at all** |
| Operator access | Over an SSH tunnel; no public dashboard |
| SSH | Key-only; password and keyboard-interactive authentication disabled; brute-force protection active |
| Container privilege | Runtime executes as an unprivileged uid; the install tree is read-only to it |
| Secrets | Never in version control; delivered out of band; mode-600 files; env-only injection |
| Patching | Unattended security updates; pinned image tags with a drift monitor rather than silent upgrades |
| Backups | Two scheduled backups, a **weekly automated restore verification**, and a separate **scripted privilege restore drill** |

Restore verification is not decorative, and it runs at two levels because a dump and its
privilege model are not the same artifact.

| Check | What it does | Scale |
|---|---|---|
| Weekly automated restore verification | Restores the dump into a scratch database and compares row counts table by table, then drops it | 6 tables |
| Scripted privilege restore drill | Restores into a scratch database and audits the **recovered copy's grants** — privilege matrix in catalog-only mode, with a negative control requiring the un-repaired restore to fail | **111 assertions** on the restored copy |
| Live runtime privilege matrix | Executes **real statements under real logins** against the running system, asserting that forbidden ones are refused | **327 assertions · 7 principals · 42 negative probes** |

The distinction matters: a restore that silently widens grants is a security incident that
looks like a successful recovery, and the live matrix passes either way because it never
touches the restored copy. That is why the drill exists, and it found one. See case study
finding 5.2.

## Residual risks, stated plainly

| Risk | Status |
|---|---|
| The compose token could technically send if new code were written | Mitigated structurally (choke point, closed table, import guard, 440 assertions). Not eliminated — the provider has no draft-only scope. |
| Model output quality varies | Accepted by design. A wrong output is a **draft a human does not send**. Deterministic layers do not vary with the model. |
| Live concurrency and crash behaviour against the provider | Proven offline only. Listed as future work rather than claimed. |
| Host compromise via SSH | Standard hardening applied. Single-host deployment is a deliberate scope choice for a reference system. |
| Operator error at approval time | Bounded: approving executes nothing, the snapshot is revalidated, and execution requires a second deliberate act under a different credential. |

---

*No credentials, hostnames, addresses, account identifiers or message identifiers appear in
this document. All examples are synthetic.*
