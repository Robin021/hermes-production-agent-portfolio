# Example — Approval Request and Decision

A refund request arrives by email. The agent does not refund anything, and approving it does
not refund anything either. All identifiers are synthetic.

---

## 1. The inbound message

```text
From:    customer@example.com
Subject: Refund request for SO-1004

The item arrived damaged. I would like a refund of the full amount please.
```

## 2. What the pipeline decided

| Field | Value |
|---|---|
| Intent | `refund_request` |
| Risk | **`high`** |
| Disposition | **`awaiting_approval`** |
| Business rows written | **0** |
| Draft produced | 1 — an acknowledgement, sending nothing and promising nothing |

The acknowledgement draft says a human is reviewing the request. It does not state an
outcome, because no outcome exists yet.

## 3. The approval request record

```json
{
  "approval_id": "<APPROVAL_ID>",
  "task_id": "<TASK_ID>",
  "run_id": "<RUN_ID>",
  "correlation_id": "mail:<CASE_KEY>",
  "status": "pending",
  "intent": "refund_request",
  "risk": "high",
  "requested_action": "Refund order SO-1004",
  "entity_type": "order",
  "entity_id": "SO-1004",
  "snapshot": {
    "order_id": "SO-1004",
    "customer_id": "CUST-4402",
    "status": "delivered",
    "total_amount": "149.00",
    "currency": "USD",
    "refunded": false,
    "placed_at": "2026-02-24T09:12:00Z"
  },
  "snapshot_hash": "<SHA256_OF_CANONICAL_SNAPSHOT>",
  "requested_at": "2026-03-05T10:41:07Z",
  "expires_at": "2026-03-06T10:41:07Z"
}
```

Three properties matter more than the contents:

| Property | Why |
|---|---|
| The snapshot is **frozen** | The operator decides against the state that existed when the request was filed, not against whatever the world looks like now |
| `snapshot_hash` is a canonical-JSON sha256 | "What exactly did the human authorize" is answerable later, byte for byte |
| `expires_at` | A stale request cannot be decided. It sweeps to a terminal `expired` state |

The `requested_action` field is free text produced upstream — and it is **never** what gets
executed. The executable action is derived mechanically from the constrained `intent` column.
Model wording cannot widen an action.

## 4. What the operator sees

```text
APPROVAL REQUIRED

Approval ID   <APPROVAL_ID>
Intent        refund_request        Risk  high
Action        Refund order SO-1004
Entity        order SO-1004
Customer      CUST-4402
Order state   delivered · 149.00 USD · not yet refunded
Expires       2026-03-06 10:41 UTC

Approving records authorization only. It executes nothing.

[ Approve ]   [ Reject ]
```

There is **zero LLM** in this path. The operator reads a rendered database record; no model
is called to summarize, rank or recommend.

## 5. The decision record

```json
{
  "decision_id": "<DECISION_ID>",
  "approval_id": "<APPROVAL_ID>",
  "decision": "approve",
  "actor_type": "operator_cli",
  "actor_id": "<OPERATOR_ID>",
  "transport": "cli",
  "reason": "Damage confirmed from photos in the thread.",
  "snapshot_hash_at_decision": "<SHA256_OF_CANONICAL_SNAPSHOT>",
  "decided_at": "2026-03-05T11:02:44Z"
}
```

`snapshot_hash_at_decision` is recomputed and compared **inside the same transaction** that
writes this row. If the order had changed between the request and the decision, the hashes
would differ and the decision would be **refused** rather than recorded — the classic
time-of-check to time-of-use gap, closed by construction.

A unique constraint on `approval_id` in the decision table means a second decision is
impossible. Not discouraged — impossible.

## 6. The part that surprises people

```text
business table digest BEFORE the approval:  a3f1...c92d
business table digest AFTER  the approval:  a3f1...c92d      <- identical

order SO-1004 refunded flag:                false
```

The approval is now `approved`, and **nothing has been refunded**.

There is no `executed` status anywhere in the schema and no code path from a decision to a
business table. Nothing consumes approved decisions automatically — no queue, no worker, no
scheduled job. What happens next requires a human to run a different program under a
different database login: [synthetic-execution-result.md](synthetic-execution-result.md).

## 7. Who could have done this, and who could not

| Principal | Can file the request | Can decide it |
|---|---|---|
| Mail runtime | **yes** | **no verb at all** on the decision table |
| Approval runtime | **no** | **yes** |

Neither credential can do both. That is a database grant table rather than a convention in
the call graph, and 327 assertions re-derive it from the live catalog on every regression.

---

*All identifiers, amounts and timestamps on this page are synthetic.*
