---
name: decisions
description: Keep the owner's choices and their supporting exchanges auditable in docs/DECISIONS.md and numbered records under docs/decisions. Read before substantial repository work or reopening a settled question, and update when the owner chooses, corrects, rejects or reverses an approach.
---

# Decision Records

Read `docs/DECISIONS.md`, then the relevant area index before starting work.
Follow settled owner choices and later corrections. Verify technical premises
against current source; if new evidence contradicts a premise, explain it and
cite the record rather than silently changing the decision.

## Placement

Keep every decision record under root `docs/decisions/`, following the convention
in `fundlevel-digital/mono`:

- Cross-cutting decisions: `docs/decisions/NNNN-short-title.md`, indexed in
  `docs/DECISIONS.md`.
- Area decisions: `docs/decisions/<area>/NNNN-short-title.md`, with an area
  `DECISIONS.md` in that directory, linked from the root index.
- Number from `0001` within each area; never reuse a number. Record a decision
  once and cross-link other areas instead of duplicating it.

## Recording Choices

Write a record in the same turn, before handing off, when the owner chooses an
approach, approves a plan, corrects the work, rejects a proposal, or reverses a
choice. Include small command approvals in the larger decision's exchange rather
than making a record for each command.

Preserve the relevant back-and-forth in order. Quote the owner's words exactly,
including typos, and summarize the agent's proposals and findings. Distinguish
explicit instructions, agent implementation choices, and verified outcomes.
An accepted decision is historical evidence, not authorization for a deployment
or another external action.

Use this structure, scaled to the decision:

```markdown
# NNNN. Title

- Date: YYYY-MM-DD
- Status: accepted | superseded by NNNN | reverted on YYYY-MM-DD
- Decided by: <owner>
- Area: <repository folder or cross-cutting>
- Related: <records and handoffs>

## Context
The problem and the choice to make.

## Exchange
Dated owner quotes and agent summaries, in chronological order.

## Decision
The final choice and its scope, including corrections and rejected alternatives.

## Why
The owner's stated reasons and the supporting evidence.

## Consequences
What changed, what remains, and what the decision rules out.

## Evidence
Source paths, commits, verification results, and their practical limits.
```

Do not rewrite an accepted record's history. A reversal gets a new record; update
the old status and both index entries to show the supersession. Commit records
with the work they govern, or in a documentation commit when recording earlier
work.

Keep credentials, tokens, private keys and customer CRM records out of records.
Explicitly redact secrets if a relevant quote contains them. Record verification
results and aggregate counts rather than customer data. Keep planned,
implemented, merged and deployed states distinct.

## Index and Session Handoffs

The root index has a table with number, date, decision and status, newest last.
Area indexes use the same format. Link session handoffs from `docs/README.md`;
handoffs explain implementation, validation and remaining work, while records
preserve the choices. Link between them rather than duplicating the whole session.

Adapted from the [mono decisions skill](https://github.com/fundlevel-digital/mono/blob/94038532154c12f58e51e01a99a0769d1a169f6e/.agents/skills/decisions/SKILL.md).
