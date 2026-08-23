# Service Offerings

Three engagements, in increasing order of commitment. Each is independently valuable — a
client can stop after any of them.

| | Engagement | Buyer | Starting at |
|---|---|---|---|
| **A** | Self-Hosted AI Agent Setup | Founder or small engineering team who wants their own agent infrastructure | **from $750** |
| **B** | Production AI Agent Integration | Engineering lead with a POC that cannot pass security review | **from $2,000** |
| **C** | Human-Supervised Business Agent | Ops or support lead automating work that changes business state | **Custom scoped engagement** |

Starting prices are entry points, not rate cards. Final scope and price come out of
discovery — nothing is quoted firm from a job post.

Four rules apply to all three:

- **Larger integrations begin with a short paid discovery**, fixed price and credited against
  the build. Small, well-defined setup work can usually be scoped directly.
- **The tests are part of the deliverable.** Not an add-on, not the phase that gets cut when
  the timeline slips.
- **Handover is a paid phase**, because it is real work, and the decision records outlive the
  engagement.
- **No auto-send, auto-refund or auto-delete on day one** in any engagement. That capability
  is earned with evidence, or it is the feature that creates the incident.

---

## A. Self-Hosted AI Agent Setup

**Starting at $750.** Typical delivery: 1–2 weeks from access being granted.

### The problem this solves

> "We want our own agent running on our own infrastructure — not a SaaS seat, not an API key
> pasted into someone else's product. But nobody here has deployed one properly, and the last
> attempt is a container on a laptop that nobody can restart."

This buyer usually has a data-residency or confidentiality reason for self-hosting, or simply
does not want their support workflow depending on a vendor roadmap. What they need is the
boring part done correctly: hardening, persistence, migrations, backups, restart safety, and a
way to operate the thing.

### Deliverables

| # | Deliverable |
|---|---|
| 1 | Hardened host: default-deny firewall, key-only SSH, brute-force protection, unattended security updates, swap and log limits |
| 2 | Agent runtime deployed from a **pinned** image with externalized config and persistent state |
| 3 | PostgreSQL control plane with **forward-only, checksum-guarded migrations** |
| 4 | Nothing exposed publicly — loopback binding throughout, operator access over an SSH tunnel |
| 5 | Operator channel (chat or CLI) with a strict allowlist and a deterministic status command that uses **no** model tokens |
| 6 | Scheduled backups **plus automated restore verification** — a backup you have never restored is not a backup |
| 7 | Image-update monitor that reports drift instead of silently upgrading |
| 8 | Smoke and failure tests actually executed: service restart, database restart, host reboot, invalid credential, dependency down |
| 9 | Deployment runbook and operations runbook, written to be followed by someone who is not me |
| 10 | Architecture decision records for every non-obvious choice |

### Typical scope

- One host, one agent runtime, one operator channel.
- Up to two lightweight integrations that are **read-only** or internal.
- Deployment into infrastructure you own, using your existing cloud account and domain.
- One recorded handover session with your engineers.

### Exclusions

- No business-system write access. That is engagement B or C.
- No customer-facing automation. That is engagement C.
- No multi-region, no Kubernetes, no autoscaling — not before there is measured need.
- No model fine-tuning or training.
- No 24/7 on-call. Ongoing support is a separate retainer.
- No migration of an existing production workload without discovery first.

### What moves the price

A second runtime, an unfamiliar environment, or a compliance requirement that changes the
hardening baseline. Waiting on cloud access or credentials is the usual delay — not the build.

---

## B. Production AI Agent Integration

**Starting at $2,000.** Typical delivery: 4–8 weeks.

### The problem this solves

> "We have a working POC. It demos well. It has been stuck for four months, because nobody can
> answer what happens when it gets something wrong — and honestly, the agent can reach a lot
> more than it should."

This is the best-qualified lead there is. The capability already exists; what is missing is the
boundary, the evidence and the operational spine. The buyer is an engineering lead who already
understands the risk and needs someone to make it testable.

### Deliverables

| # | Deliverable |
|---|---|
| 1 | **Capability audit**: what the agent can *express* today, not what it usually does — free-form parameters, unbounded tool arguments, ignored unknown keys, native tools nobody disabled |
| 2 | **Typed tool boundary**: closed schemas, unknown keys rejected, anchored id validation, no free-form SQL, URL, header or method anywhere in the interface |
| 3 | **Per-runtime credentials**: every component gets its own identity, granted per verb and per column, deny by default |
| 4 | **Privilege matrix as a CI test**: permissions proven by executing real statements under real logins, including negative probes that confirm denials actually deny |
| 5 | **Deterministic disposition layer**: outcomes derived from retrieved evidence rather than model wording; ungrounded assertions rejected; fail-closed on a missing verdict |
| 6 | **Typed error taxonomy** separating business answers from transport failures, with bounded retries only for genuinely transient classes |
| 7 | **Idempotency**: marker-first ordering and unique-index enforcement, so retries and duplicate deliveries stop being an incident class |
| 8 | **Append-only audit** sufficient to reconstruct an incident from rows, with secret redaction before persistence |
| 9 | **Injection test battery** against your real prompts: instruction override, header injection, exfiltration via reply, tool-argument poisoning, data-boundary confusion |
| 10 | **Fault-injected regression suite** your CI keeps forever — the suite deliberately breaks its own dependencies |
| 11 | Decision records and a walkthrough per subsystem |

### Typical scope

- One agent, one primary workflow, up to three integrated systems.
- Read-only integration first; write paths only through the patterns in engagement C.
- Works against your existing stack — the patterns are stack-independent, and mapping them is
  scoping work rather than research.
- A staging environment with representative but **synthetic** data during the build.

### Exclusions

- No production customer data during discovery or the initial build. Synthetic fixtures first,
  always.
- No approval or execution workflow — that is engagement C.
- No new agent capability. This engagement makes existing capability shippable.
- No model selection or frontier-model evaluation as a research exercise.
- No frontend work.
- No rewrite of your application. The work happens at the agent boundary.

### A faster entry point

A **security review only, no implementation** variant runs 1–2 weeks at a fixed price. It
produces the capability audit, the privilege findings and the injection battery results
without touching your code. It is the fastest way to find out whether the full engagement is
worth buying.

---

## C. Human-Supervised Business Agent

**Custom scoped engagement.** Typical delivery: 6–12 weeks, phased.

### The problem this solves

> "We want the agent to actually *do* things — issue the refund, cancel the subscription,
> update the order. Legal said no. Security said no. And they are both right, because right now
> approving something and doing it are the same button."

This buyer needs automation that changes business state, and needs it to survive an
audit. What they are really buying is **separation of duties that is provable per action**.

### Deliverables

Everything in engagement B, plus:

| # | Deliverable |
|---|---|
| 1 | **Risk tiering**: which intents are automatic, which draft for review, which require human authorization — derived from your data, not assumed |
| 2 | **Approval workflow**: immutable snapshot of entity state, canonical-JSON hash, TTL, and revalidation **inside the deciding transaction** so a stale approval is refused |
| 3 | **Approve != Execute**: authorization and action are separate records, separate acts and separate credentials. No status transition performs a write |
| 4 | **Isolated executor**: separate process, own login, zero model involvement, write capability limited to narrow stored procedures owned by a role that cannot log in |
| 5 | **Unrepresentable mutations**: operations you never authorized are not blocked by a check — no function accepts them |
| 6 | **One authorization to at most one write**, enforced by unique index, proven under concurrent load |
| 7 | **Crash reconciliation**: a crash in the mutation window converges to a terminal state without double-mutating, and terminates explicitly rather than guessing |
| 8 | **Draft-only outbound**: customer-facing replies are drafts in the correct thread, addressed to exactly the source sender, no CC, no BCC. A human sends |
| 9 | **Operator interface**: approve, reject, expire, inspect — over chat and CLI, with **zero** model tokens in the decision path |
| 10 | **Post-commit notifications**: outcomes reported to operators after the fact. No message and no button can start a write |
| 11 | **Attribution trail**: who authorized what, against which snapshot, when, from which channel, and who executed it |

### Typical scope

- One customer-facing channel (email, helpdesk or ticketing) plus one system of record.
- Three to five automated intents, with the high-risk ones routed to approval.
- Two to four narrow write operations behind the execution boundary.
- A pilot alongside your team, sending nothing, until the drafts are ones you would have sent
  unmodified.
- An evaluation harness on your data, with per-intent accuracy measured rather than promised.

### How it phases

| Phase | Work | Duration |
|---|---|---|
| 1 — Discovery | Sample real tickets, classify what is genuinely automatable, map data sources, agree risk tiers and what "correct" means per intent. Deliverable: a scoped spec with an honest automation ceiling. | 1 week |
| 2 — Draft-only pilot | Top three to five intents. Read-only integration, typed tool boundary, deterministic policy, draft generation, audit trail. Runs alongside your team, sending nothing. | 3–4 weeks |
| 3 — Approval workflow | High-risk intents route to a human. Immutable snapshots, TTL, revalidation, attribution. | 2 weeks |
| 4 — Execution boundary | Isolated executor, narrow write procedures, idempotency, crash reconciliation, operator notifications. | 2–3 weeks |
| 5 — Measured rollout | Evaluation harness on your data, per-intent accuracy, tuning against measured failures. | ongoing |

Each phase is separately decidable. A client who stops after phase 2 has a working draft-only
assistant and owns everything built to that point.

### Exclusions

- **No auto-send from day one.** Draft-only in production first; auto-send for specific
  low-risk intents is a scoped follow-on with its own evidence.
- **No automatic consumption of approved decisions.** If you want a queue worker executing
  approvals unattended, that is a deliberate later decision with its own risk review — not a
  default.
- No payment-processor or ledger integration without a separate scoping engagement.
- No attachment handling, no inbound polling infrastructure, no bulk campaigns in the initial
  scope.
- No guaranteed deflection percentage before discovery. Anyone quoting one from a job post is
  guessing.
- No regulatory certification. I can produce the evidence an auditor asks for; I am not an
  auditor.

---

## What every engagement includes

- **The source, the tests and the runbooks.** No black box, no lock-in.
- **Decision records with their reasoning**, so the thinking outlives the engagement.
- **The caveats in writing**, in the same document as the results. Where a boundary is weaker
  than it looks, the weaker version is what gets written down.

## What I will not do in any engagement

- Build a framework. You get the narrowest thing that solves your actual workflow.
- Add a queue, a vector database or an orchestration layer before there is demonstrated need.
- Promise an accuracy or deflection number before discovery.
- Ship auto-send, auto-refund or auto-delete as a launch feature.
- Leave you dependent on me.

---

*The reference implementation behind these offerings is documented in
[docs/CASE_STUDY.md](CASE_STUDY.md). It has not been deployed for a paying client, and no
customer outcomes are claimed.*
