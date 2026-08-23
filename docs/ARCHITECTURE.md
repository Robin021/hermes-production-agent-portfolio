# Architecture

For a technical evaluator. No project history, no sprint numbering — the system as it
stands, and the reasoning behind each boundary.

---

## 1. What the system is

A self-hosted, human-supervised LLM agent platform that handles inbound customer email.
It reads a message, retrieves the system-of-record data behind it, decides an outcome from
measured evidence, and produces a **reply draft**. Anything that changes business state stops
and waits for a human — and the human decision **still does not perform the write**. A
separate, separately-credentialed operator action does.

The design centre is a single sentence:

> The LLM sits in the middle of the pipeline and touches nothing on either edge.

It holds no mail credential and no database credential. It contributes an intent and body
text. Every other field — recipient, thread, subject, headers, risk tier, disposition — is
computed by deterministic code from the source message and from tool evidence.

## 2. Component map

```mermaid
flowchart TB
    subgraph UNTRUSTED["UNTRUSTED INPUT"]
        MAIL["Customer email<br/>may contain prompt injection"]
    end

    subgraph DET1["DETERMINISTIC · no LLM"]
        READ["Mail read<br/>readonly scope · one named message<br/>mutates no mailbox state"]
        GATE["Ambiguity gate<br/>no identifier -> answered<br/>0 model calls · 0 tokens"]
    end

    subgraph AGENT["AGENT · the only LLM in the system"]
        OPS["Customer Ops runtime<br/>0 native tools · 1 toolset<br/>no terminal · no files · no browser<br/>holds no mail or DB credential"]
        TOOLS["6 typed read-only tools<br/>one id string each<br/>no SQL · no URL · no header · no method"]
    end

    subgraph DET2["DETERMINISTIC · no LLM"]
        POLICY["Policy layer<br/>outcome derived from tool evidence<br/>model may raise risk, never lower it"]
        COMPOSE["Envelope derivation<br/>recipient · thread · subject · headers<br/>pure functions of the SOURCE message"]
    end

    subgraph HUMAN["HUMAN"]
        DRAFT["Reply DRAFT<br/>a person presses Send. Always."]
        APPR["Approval request<br/>immutable snapshot + sha256 + TTL"]
        DECIDE["Operator decides<br/>chat channel or CLI · 0 LLM · 0 tokens"]
        EXEC["Operator runs executor<br/>explicit manual command"]
    end

    WRITE["Exactly ONE business write<br/>SECURITY DEFINER function<br/>re-validated inside the transaction"]
    NOTIFY["Operator notification<br/>NOTIFICATION ONLY<br/>no button can start a write"]

    MAIL --> READ --> GATE
    GATE -->|identifier present| OPS
    GATE -->|none: deterministic reply| COMPOSE
    OPS <--> TOOLS
    OPS --> POLICY
    POLICY -->|low risk| COMPOSE --> DRAFT
    POLICY -->|high risk| APPR --> DECIDE
    DECIDE -->|approved| STOP["STOPS HERE<br/>approve records authorization<br/>no executed status exists in the schema"]
    STOP -.->|separate act, separate credential| EXEC --> WRITE --> NOTIFY

    classDef untrusted fill:#fee,stroke:#c00,stroke-width:2px
    classDef det fill:#eef7ee,stroke:#284
    classDef agent fill:#eef,stroke:#446
    classDef human fill:#ffd,stroke:#a80,stroke-width:2px
    classDef danger fill:#fdd,stroke:#900,stroke-width:2px
    class MAIL untrusted
    class READ,GATE,POLICY,COMPOSE det
    class OPS,TOOLS agent
    class DRAFT,APPR,DECIDE,EXEC,STOP human
    class WRITE,NOTIFY danger
```

Read it as three claims:

1. The LLM never holds a credential and never fills an envelope field.
2. Every arrow that leaves the system passes through a **human**.
3. `approved` is a **terminal state**. The dotted line is a separate operator act under a
   separate credential — there is no automatic consumer of approved decisions.

## 3. Runtime topology

```mermaid
flowchart TB
    NET["Internet"] -->|SSH ONLY| HOSTBOX
    NET -.->|"everything else: DENY at the host firewall"| X[" "]

    subgraph HOSTBOX["Single Linux host · default-deny firewall · every service bound to loopback"]
        subgraph HOSTP["HOST PROCESSES · survive image upgrades"]
            BRIDGE["operator chat bridge<br/>outbound polling only"]
            CLIS["ops CLIs<br/>migrate · business · approval · executor · mail"]
            CRON["scheduled jobs<br/>2 backups · update check · weekly restore verify"]
        end

        subgraph DOCK["CONTAINERS"]
            H1["agent runtime — operator<br/>loopback only · no DB credentials"]
            H2["agent runtime — customer ops<br/>loopback only · 0 native tools"]
            PG[("PostgreSQL<br/>schema business + control plane")]
            BAPI["business API<br/>loopback only"]
            BAGENT["business API — agent path<br/>NO HOST PORT<br/>failure simulation hard-off"]
            BTOOLS["business tools · MCP<br/>NO HOST PORT"]
        end
    end

    GAPI["Mail provider API<br/>readonly + compose only"]
    TG["Operator chat API"]

    H1 --> BTOOLS
    H2 --> BTOOLS
    BTOOLS --> BAGENT --> PG
    BAPI --> PG
    CLIS --> PG
    CLIS -->|outbound HTTPS| GAPI
    BRIDGE --> TG
    CRON --> PG

    classDef noport fill:#eef7ee,stroke:#284,stroke-dasharray: 4 3
    class BAGENT,BTOOLS noport
```

Nothing is reachable from the internet except SSH. Operator access to any internal API is
over an SSH tunnel. The two components on the agent data path have **no host port at all** —
not even a loopback one.

The control plane runs on the host, outside the agent image, so upgrading the agent runtime
cannot break migrations, approvals, execution, backups or the operator channel.

## 4. The agent boundary

The customer-ops runtime is a second, dedicated instance of the agent framework, narrowed
from the default 15 toolsets and 38 native tools to **1 toolset and 0 native tools**. No
terminal, no filesystem, no browser, no arbitrary HTTP, no scheduler.

Its entire reach into the business is six typed read-only tools:

| Tool | Argument | Returns |
|---|---|---|
| `customer_lookup` | one customer id | customer record |
| `customer_orders` | one customer id | that customer orders |
| `customer_subscriptions` | one customer id | that customer subscriptions |
| `order_lookup` | one order id | order record |
| `shipment_lookup` | one shipment id | shipment record |
| `subscription_lookup` | one subscription id | subscription record |

Each schema declares exactly one string property with an anchored pattern, and
`additionalProperties: false`. There is **no field** for SQL, a URL, a path, an HTTP method,
a header, a timeout or a retry count — so those are not filtered, they are
**unrepresentable**. Unknown keys are rejected rather than ignored. Invalid ids are refused
before any I/O and are never echoed back into a model-visible string.

Errors are classified at our own boundary into a typed taxonomy with an explicit `retryable`
flag. A business answer such as "no such order" is a **result**, not a transport failure —
a distinction that matters because the framework tool client opens a circuit breaker after
three consecutive error results. See finding 5.1 in the case study.

## 5. The deterministic disposition layer

The model does not decide what happened. Raw tool frames are parsed into an **evidence
ledger**, and the outcome is derived from that ledger:

- If the model asserts a fact with no supporting tool evidence, the run is rejected.
- The model may make an outcome **more** cautious. It can never make it less.
- A draft whose content contradicts the evidence is replaced by a deterministic reply.
- A draft is produced only when the grounding verdict and the draft verdict are both
  exactly `True` and the agent status is terminal-valid. A missing verdict fails closed.

Ahead of the model there is an **ambiguity gate**: mail with no usable identifier is answered
deterministically with **0 model calls and 0 tokens**. Cost control becomes an architectural
property rather than a budget alarm.

## 6. Approval, and why it is not execution

A high-risk intent produces an approval request carrying an **immutable snapshot** of the
entity state, a canonical-JSON sha256 of that snapshot, and a TTL.

When a human decides, the snapshot is rebuilt and compared **inside the deciding
transaction**. If the world moved, the decision is refused. A unique constraint on the
approval id makes a second decision impossible. There is **zero LLM** in the decision path.

And then it stops. There is no `executed` status in the schema and no code path from a
decision to a business table. Execution is a separate program, run by an operator, under a
different database login:

```mermaid
flowchart LR
    D["Decision: approved"] --> S["TERMINAL<br/>authorization recorded"]
    S -.->|"manual operator command<br/>different credential"| E["Executor process<br/>zero LLM"]
    E --> F["3 SECURITY DEFINER functions<br/>owned by a NOLOGIN role"]
    F --> W["at most ONE business write<br/>guarded by a unique index"]
    W --> N["Operator notification<br/>after commit · notification only"]
    classDef t fill:#ffd,stroke:#a80,stroke-width:2px
    class S,E t
```

The executor login holds **zero direct DML** on business tables. Its only capability is
`EXECUTE` on three narrow functions. Those functions accept the operations the business
actually authorizes and nothing else — so an unrelated mutation such as changing a customer
address is not blocked by a check, it is **unrepresentable**: no function accepts one.

## 7. Privilege model

```mermaid
flowchart LR
    subgraph ROLES["7 database principals, each with a distinct grant set"]
        direction TB
        RO["business read-only<br/>SELECT on 4 business tables<br/>cannot see the control-plane schema at all"]
        TW["audit writer<br/>INSERT audit only<br/>no UPDATE, no DELETE — append-only BY PRIVILEGE"]
        GM["mail runtime<br/>can OPEN an approval<br/>NO VERB on the decision table"]
        AR["approval runtime<br/>can CLOSE an approval<br/>CANNOT insert an approval request"]
        EX["executor<br/>EXECUTE on 3 definer functions<br/>ZERO direct business DML"]
        BEO["definer function owner<br/>owns the write functions<br/>NOLOGIN"]
        OWN["control-plane owner<br/>migrations and admin ONLY<br/>never a daily runtime"]
    end

    GM ---|"opposite directions BY GRANT:<br/>neither can file AND self-approve"| AR
    EX --> BEO

    MATRIX["privilege matrix test<br/>327 assertions · 7 principals<br/>real statements under real logins<br/>42 negative probes<br/>runs on EVERY regression"] -.->|proves| ROLES

    classDef proof fill:#ffd,stroke:#a80,stroke-width:2px
    class MATRIX proof
```

Every runtime has its own identity, granted **per verb and per column**, deny by default.
The control-plane owner credential is used for migrations, role setup and operator
maintenance only — no daily runtime path uses it.

The mirror-image pairing of the mail runtime and the approval runtime is the sharpest
control in the system. A write-shaped email genuinely *is* a request a human must decide, so
the mail runtime must be able to INSERT an approval request. It therefore holds **no verb at
all** on the decision table, while the approval runtime can write a decision and cannot
INSERT a request. Separation of duties becomes a database fact instead of a call-graph
convention.

Runtime identity is bound at **import time** from a dedicated connection string. A workflow
imported without its own credential exits instead of falling back to a broader one.

## 8. Mail capability boundary

```mermaid
flowchart TB
    CODE["All mail traffic"] --> CHOKE["ONE _call choke point"]
    CHOKE --> TABLE["Closed OPERATIONS table · exactly 7 entries"]
    TABLE --> G1["GET messages.get"]
    TABLE --> G2["GET messages.list"]
    TABLE --> G3["GET labels.list"]
    TABLE --> G4["GET drafts.list"]
    TABLE --> G5["GET drafts.get"]
    TABLE --> G6["GET profile"]
    TABLE --> P1["POST drafts.create<br/>the ONLY write"]

    GUARD["Import-time guard<br/>module raises ImportError if send / modify / trash<br/>appears in ANY declared path"] -.->|blocks at import| TABLE
    IDENT["Identity bound at import<br/>refuses to load without its own narrow credential<br/>no fallback to the owner credential exists"] -.-> CHOKE

    P1 --> DRAFT["Draft in the source thread<br/>recipient = source sender, character-exact<br/>no CC · no BCC"]
    DRAFT --> HUMAN["A human presses Send"]

    classDef guard fill:#ffd,stroke:#a80,stroke-width:2px
    classDef write fill:#fdd,stroke:#900,stroke-width:2px
    class GUARD,IDENT guard
    class P1 write
```

Scopes requested are exactly read-only and compose. Nothing else.

**Stated honestly:** the provider offers no draft-only scope, so the compose token is
technically capable of sending. The proven claim is narrower and stronger than a promise —
*no code path in this system can express a send* — and 440 structural assertions plus the
import-time guard fail loudly the moment one could.

## 9. Idempotency and the crash window

```mermaid
sequenceDiagram
    participant C as Caller A
    participant D as Database
    participant G as Mail API
    participant C2 as Caller B (duplicate)

    C->>D: INSERT case marker (partial unique index)
    Note over C,D: marker committed BEFORE the first mail call
    C->>G: POST drafts
    C2->>D: INSERT case marker
    D-->>C2: conflict — a sibling holds the draft
    C2-->>C2: returns reused + the winner draft id
    G-->>C: draft id
    C->>D: attach draft id
    Note over C,G: crash between POST and attach?<br/>the marker exists, so the draft is ADOPTED, not re-created
```

Proven live: reprocessing an already-handled message produced **no second draft** — 8
threads, exactly one draft each. Proven offline: a 20-way executor race yields exactly one
write, and a crash in the mutation window reconciles without ever double-mutating.

## 10. Data model, in outline

| Schema | Contents | Who can touch it |
|---|---|---|
| business | Synthetic customers, orders, shipments, subscriptions. 24 CHECK constraints carrying the domain invariants; fixed-time fixtures so tests do not decay. | The read-only role reads. Writes exist only inside definer functions. |
| control plane | Tasks and their state machine, approval requests and decisions, execution records, append-only audit, model usage and cost. | Per-runtime roles, granted per verb and per column. |

Schema changes go through forward-only, checksum-guarded migrations — 18 of them — and a
clean-database run from the first migration reproduces an identical dataset hash.

## 11. Operational properties

| Property | How it is handled |
|---|---|
| Config | Externalized; secrets delivered out of band, never in version control |
| State | Persistent volumes; the database is the single source of truth |
| Backups | Two scheduled backups; a **weekly automated restore verification**, not just a dump |
| Upgrades | Pinned image tags and digests; an update monitor reports drift rather than auto-applying |
| Restart safety | Every service restart-safe; host reboot tested |
| Observability | Deterministic status command over the operator channel; audit rows rather than log prose |
| Cost | Token and cost accounting per run; pricing table decoupled from task logic |

## 12. What the architecture can absorb next

| Extension | Fits because |
|---|---|
| A different inbound channel — helpdesk, ticketing, chat, web form | The mail transport is one adapter behind a deterministic pipeline |
| A different system of record — CRM, ERP, billing, order management | The tool boundary is six typed read-only functions over a data source |
| More business write operations | Each is one narrow definer function plus one grant plus one privilege assertion |
| Additional approval channels | The decision path has no LLM in it and is already CLI plus chat |
| Auto-send for specific low-risk intents | Would be a deliberate, reviewed capability change with its own evidence — the current boundary is a closed operation table, and widening it is visible in the diff |
| Multi-tenant or multi-mailbox operation | Identity is bound per runtime at import; adding a runtime adds a credential, not a code path |

## 13. Explicit non-goals

- **No auto-send.** A human presses Send.
- **No automatic consumption of approved decisions.** Approval is authorization; execution is
  a separate operator act.
- **No agent-authored SQL, URLs, or shell.** Not filtered — unrepresentable.
- **No horizontal scale-out** in this deployment. It is a single-host reference system;
  the patterns are topology-independent, and a real deployment would be sized to real load.
- **No real customer data anywhere.** The business dataset is synthetic and constrained to be.

---

*Database principals are described here by function. Hostnames, addresses, ports,
filesystem paths, account identifiers and credentials are omitted deliberately.*
