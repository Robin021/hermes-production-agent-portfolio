# Example — Execution Result and Operator Notification

What happens after a human approves — and what has to happen for anything to be written.
Continues from [synthetic-approval.md](synthetic-approval.md). All identifiers are synthetic.

---

## 1. Approval alone does nothing

The approval from the previous example is now `approved`, and order `SO-1004` is still not
refunded. To change that, an operator runs a separate program:

```bash
executor-cli execute --approval <APPROVAL_ID>
```

| Property of that program | Value |
|---|---|
| Process | Separate binary, invoked by hand |
| Database login | Its own, used nowhere else |
| Model involvement | **zero** — no model is loaded, called or reachable |
| Direct DML on business tables | **none** |
| Write capability | `EXECUTE` on exactly three SECURITY DEFINER functions |
| Function owner | A role that **cannot log in** |

## 2. What the function re-checks before writing

The executor does not trust its caller, and the function does not trust the executor. Inside
the writing transaction:

| Check | Failure mode it closes |
|---|---|
| The approval exists and is `approved` | Executing an unapproved or rejected request |
| The approval has not expired | Executing a decision made against a stale world |
| The snapshot hash still matches | The entity changed between authorization and action |
| The entity is still in an executable state | Double-refunding an already-refunded order |
| No prior successful execution exists | Duplicate execution of one authorization |

The action itself is derived from the approval `intent` column, which is constrained by a
CHECK. Free-text from an upstream model never selects an operation.

## 3. The execution record

```json
{
  "execution_id": "<EXECUTION_ID>",
  "approval_id": "<APPROVAL_ID>",
  "task_id": "<TASK_ID>",
  "run_id": "<RUN_ID>",
  "snapshot_hash": "<SHA256_OF_CANONICAL_SNAPSHOT>",
  "action": "refund_order",
  "entity_type": "order",
  "entity_id": "SO-1004",
  "status": "succeeded",
  "block_reason": null,
  "error_type": null,
  "attempt_count": 1,
  "started_at": "2026-03-05T11:07:12Z",
  "completed_at": "2026-03-05T11:07:12Z"
}
```

And the business effect — exactly one row, exactly one field:

```text
order SO-1004   refunded: false -> true      refunded_at: 2026-03-05T11:07:12Z
rows written:   1
```

## 4. The terminal states, and what each means

| Status | Meaning | Operator action |
|---|---|---|
| `succeeded` | The write landed and is committed | None |
| `blocked` | A precondition failed — expired approval, hash mismatch, entity already in the target state. **Nothing was written** | Read `block_reason`; usually re-request approval |
| `failed` | The attempt errored and the transaction rolled back. **Nothing was written** | Read `error_type`; retry is safe |
| `reconciliation_failed` | A crash occurred in the mutation window and reconciliation could not determine whether the write landed | **Human investigation.** The system refuses to guess |

That last state is the point of the design. A system that guesses in this situation either
double-refunds a customer or silently loses an authorized action. This one stops and says so.

## 5. Idempotency, proven under load

```text
20 concurrent executors, one approval

  execution rows created:       20
  status = succeeded:            1
  status = blocked:             19      (reason: already_executed)
  business rows written:         1
```

One authorization yields at most one write. This is enforced by a unique index, not by a
retry counter, an in-memory lock or a distributed coordination service.

## 6. The crash window

```text
crash injected between the write and the record

  reconciliation outcome:  crash_recovered
  business rows written:   1          <- not 2
  refunded flag:           true
```

The marker is committed **before** the side effect, so after a crash the orphaned effect is
**adopted** rather than repeated.

## 7. The operator notification

```text
EXECUTION COMPLETED

Execution ID   <EXECUTION_ID>
Approval ID    <APPROVAL_ID>
Task ID        <TASK_ID>
Action         refund_order
Entity         order SO-1004
Outcome        succeeded
Reason         --
Time           2026-03-05 11:07:12 UTC

Notification only -- this message executed nothing.
```

Four properties of that message:

| Property | Detail |
|---|---|
| Emitted **after commit** | It reports a fact, never an intention |
| **Notification only** | No button, no reply and no command in this channel can start a write |
| Delivered **exactly once per outcome** | A unique constraint on execution and outcome; a retry cannot double-notify |
| Content is bounded | No stack trace, no connection string, no payload — asserted, not assumed |

A later reclassification by reconciliation produces a **new** notification for the new
outcome rather than rewriting this one, so the operator sees the history rather than a
mutated present.

## 8. The complete chain, in one view

```text
email -> agent -> policy -> approval request      (no write)
                                  |
                          human decides           (no write)
                                  |
                       operator runs executor     <- separate act, separate credential
                                  |
                        definer function          <- re-validates inside the transaction
                                  |
                          ONE business write
                                  |
                     notification, after commit   <- cannot start anything
```

Every arrow that changes the world has a human immediately upstream of it.

---

*All identifiers, amounts and timestamps on this page are synthetic.*
