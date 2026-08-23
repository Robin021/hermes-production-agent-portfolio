#!/usr/bin/env node
// Short demo, 90 seconds. Scene data only; all drawing lives in render.mjs.
// Timings mirror docs/DEMO_SHORT_SCRIPT.md exactly.

import { build, MD, MID, RA, NE } from "./render.mjs";

const scenes = [
  {
    id: "S01", type: "title", dur: 6, label: "opening",
    kicker: "human-supervised ai agent for customer operations",
    headline: ["An AI agent that can draft the reply " + MD, "but cannot send it."],
    stats: [
      { n: "2,627", l: "assertions", tone: "ok" },
      { n: "0", l: "failures", tone: "ok" },
      { n: "0", l: "emails sent", tone: "ok" }
    ],
    foot: "Draft-only customer support " + MID + " deterministic policy " + MID + " human approval " + MID + " least-privilege execution",
    caption: "An AI agent that can draft a customer reply " + MD + " and cannot send it."
  },
  {
    id: "S02", type: "mailList", dur: 4, label: "case A " + MID + " a request arrives",
    account: "support inbox",
    rows: [{ from: "customer@example.com", subject: "Where is my order SO-1001?", snippet: "Hi, I ordered last week and the tracking page has not updated. Can you check?", time: "09:14", tag: "TEST_LABEL", unread: true }],
    note: "Synthetic sender, synthetic order. The workflow is the real one.",
    caption: "A support request arrives. Ordinary, low risk, no money involved."
  },
  {
    id: "S03", type: "terminal", dur: 6, label: "case A " + MID + " the agent reads",
    title: "operator session",
    lines: [
      { t: "cmd", s: "$ mail-cli process --message-id <MESSAGE_ID_A>" },
      { t: "dim", s: "  fetch          one named message, read scope only" },
      { t: "dim", s: "  classify       intent=order_status   risk=low   deterministic" },
      { t: "gap" },
      { t: "key", s: "  tool call      get_order_status(order_ref=\"SO-1001\")" },
      { t: "dim", s: "  tool kind      read-only " + MID + " typed arguments " + MID + " no SQL surface" },
      { t: "ok", s: "  returned       status=in_transit  carrier_ref=TRK-55012  eta=2 days" },
      { t: "gap" },
      { t: "dim", s: "  writes available to the agent runtime: none" }
    ],
    caption: "The agent reads one named message and looks up the order through a typed, read-only tool."
  },
  {
    id: "S04", type: "table", dur: 4, label: "case A " + MID + " evidence",
    title: "The reply is built from a record, not from fluent text",
    head: ["Field", "Value", "Source"],
    rows: [
      { c: ["Order", "SO-1001", "business record"], tone: "ok" },
      { c: ["Customer", "CUST-4402", "business record"], tone: "ok" },
      { c: ["Status", "in_transit", "business record"], tone: "ok" },
      { c: ["Carrier reference", "TRK-55012", "business record"], tone: "ok" },
      { c: ["grounded", "True", "grounding verdict"], tone: "ok" },
      { c: ["Model contribution", "body text + intent", "language model"], tone: "warn" }
    ],
    foot: "no grounding verdict " + RA + " no draft " + MID + " the run fails closed",
    caption: "The reply is grounded in a record. No record, no claim " + MD + " the run fails closed instead."
  },
  {
    id: "S05", type: "draftView", dur: 6, label: "case A " + MID + " the output",
    banner: "DRAFT " + MD + " NOT SENT",
    headers: [
      ["To:", "customer@example.com", "ok"],
      ["Cc:", "(empty)", "ok"],
      ["Bcc:", "(empty)", "ok"],
      ["Reply-To:", "(not set)", "ok"],
      ["Thread:", "<THREAD_ID_A>  (the original thread)", "ok"],
      ["Subject:", "Re: Where is my order SO-1001?", null]
    ],
    body: [
      "Thanks for getting in touch about order SO-1001.",
      "",
      "It left our warehouse and is currently in transit under tracking",
      "reference TRK-55012, with delivery expected within two days.",
      "",
      "If it has not arrived by then, reply here and we will chase the carrier."
    ],
    note: "recipient derived from the source message " + MID + " never chosen by the model",
    caption: "A draft appears in the original thread, addressed to the person who wrote in. Nothing is sent."
  },
  {
    id: "S06", type: "split", dur: 4, label: "case A " + MID + " nothing changed",
    left: { title: "MAILBOX BEFORE", tone: "ok", lines: ["labels    TEST_LABEL, UNREAD", "unread    true", "threads   8", "drafts    0"], note: "captured before the run" },
    right: { title: "MAILBOX AFTER", tone: "ok", lines: ["labels    TEST_LABEL, UNREAD", "unread    true", "threads   8", "drafts    1"], note: "88 assertions, 0 failures" },
    foot: "programmatic_sends = 0",
    caption: "Reading mutated nothing: same labels, still unread, zero sends."
  },
  {
    id: "S07", type: "mailList", dur: 8, label: "case D " + MID + " now it touches money",
    account: "support inbox",
    rows: [
      { from: "customer@example.com", subject: "Cancel my order and refund SO-1004", snippet: "I changed my mind. Please cancel and refund the full amount to my card.", time: "10:02", tag: "TEST_LABEL", unread: true },
      { from: "customer@example.com", subject: "Where is my order SO-1001?", snippet: "Hi, I ordered last week and the tracking page has not updated.", time: "09:14", tag: "TEST_LABEL", unread: true }
    ],
    note: "A refund is not a question. It is a write to business state.",
    caption: "Now a request that would move money."
  },
  {
    id: "S08", type: "terminal", dur: 7, label: "case D " + MID + " it stops",
    title: "operator session",
    lines: [
      { t: "cmd", s: "$ mail-cli process --message-id <MESSAGE_ID_D>" },
      { t: "dim", s: "  classify            intent=refund_request   risk=high   deterministic" },
      { t: "dim", s: "  policy              high risk " + RA + " open approval, write nothing" },
      { t: "gap" },
      { t: "warn", s: "  status              awaiting_approval" },
      { t: "ok", s: "  business_rows_written  0" },
      { t: "ok", s: "  drafts_created      1   (acknowledgement only, not sent)" },
      { t: "ok", s: "  approval_id         <APPROVAL_ID>" },
      { t: "gap" },
      { t: "dim", s: "  the agent login holds no INSERT, UPDATE or DELETE on business tables" }
    ],
    caption: "The agent stops at awaiting_approval and writes no business row. It never had the permission to."
  },
  {
    id: "S09", type: "chat", dur: 10, label: "case D " + MID + " a human decides",
    title: "operator approval channel",
    cards: [{
      title: "APPROVAL REQUIRED", tone: "warn",
      rows: [
        ["action", "refund_order"],
        ["target", "SO-1004  " + MID + "  CUST-4402"],
        ["amount", "142.00 USD"],
        ["snapshot", "<SHA256_OF_CANONICAL_SNAPSHOT>"],
        ["approval", "<APPROVAL_ID>"],
        ["expires", "in 60 minutes"]
      ],
      buttons: ["Approve", "Reject"],
      note: "zero model tokens in this path " + MID + " the decision is recorded, not generated"
    }],
    caption: "A human decides, in a channel with no model in it."
  },
  {
    id: "S10", type: "split", dur: 10, label: "the part most designs get wrong",
    left: { title: "APPROVAL RECORDED", tone: "ok", lines: ["decision      approved", "decided_by    <OPERATOR_ID>", "decision_id   <DECISION_ID>", "recorded_at   +0.4s"], note: "an authorization exists" },
    right: { title: "BUSINESS STATE UNCHANGED", tone: "ok", lines: ["order status  unchanged", "refund rows   0", "table hash    <SHA256_OF_CANONICAL_SNAPSHOT>", "              " + MID + " identical to before"], note: "nothing consumes approvals automatically" },
    foot: "approve " + NE + " execute",
    caption: "The approval is recorded " + MD + " and business state is byte-identical. Approving is not executing."
  },
  {
    id: "S11", type: "terminal", dur: 10, label: "a second, explicit act",
    title: "executor session " + MID + " separate login",
    lines: [
      { t: "cmd", s: "$ executor-cli execute --approval <APPROVAL_ID>" },
      { t: "dim", s: "  login             executor role (not the agent, not the approver)" },
      { t: "dim", s: "  direct table writes granted to this login: none" },
      { t: "gap" },
      { t: "key", s: "  calling           refund_order(...)   one stored function" },
      { t: "dim", s: "  revalidating      approval state, snapshot hash, entity state" },
      { t: "dim", s: "                    " + MID + " inside the same transaction" },
      { t: "gap" },
      { t: "ok", s: "  committed         execution_id <EXECUTION_ID>" }
    ],
    caption: "Execution is a separate, explicit command under a separate login."
  },
  {
    id: "S12", type: "chat", dur: 9, label: "one write, then a report",
    title: "operator approval channel",
    cards: [{
      title: "EXECUTION SUCCEEDED", tone: "ok",
      rows: [
        ["execution", "<EXECUTION_ID>"],
        ["approval", "<APPROVAL_ID>"],
        ["action", "refund_order  " + MID + "  SO-1004"],
        ["rows_written", "1"],
        ["idempotent_replay", "false"],
        ["emails sent", "0"]
      ],
      note: "notification only " + MID + " no button in this message can start a write"
    }],
    caption: "One write. One outcome notification. Replaying the command changes nothing further."
  },
  {
    id: "S13", type: "closing", dur: 6, label: "close",
    lines: [
      "AI can reason.",
      "AI cannot self-authorize.",
      "AI cannot directly write.",
      "Human approval does not equal execution.",
      "Every state change is auditable."
    ],
    foot: "2,627 assertions " + MID + " 0 failures " + MID + " 0 emails sent",
    caption: "AI can reason. It cannot authorize itself, and it cannot write."
  }
];

const total = build(scenes, "short");
console.log("short: " + scenes.length + " frames, " + total.toFixed(1) + "s");
