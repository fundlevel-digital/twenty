---
name: decisions
description: Record Kareem's decisions with exact quotes, the exchange, evidence and outcomes under root docs/decisions. Read before substantial work, reopening a settled question, or recording an approval, rejection, correction or reversal.
---

# Decision Records

Read `docs/DECISIONS.md`, then the relevant area's index and records before
working. Follow settled choices unless Kareem changes them. A record supplies
context, not permission for a new production action.

This adapts the centralized layout from
[`fundlevel-digital/mono`](https://github.com/fundlevel-digital/mono/blob/main/.agents/skills/decisions/SKILL.md).
The earlier `sunny` skill colocates indexes with packages; use the centralized
layout here.

## Placement

All decision records and indexes live in the repository root's `docs` directory:

| Scope             | Index                                                              | Records                        |
| ----------------- | ------------------------------------------------------------------ | ------------------------------ |
| Repository        | `docs/DECISIONS.md`                                                | `docs/decisions/NNNN-title.md` |
| YouTube Analytics | `docs/decisions/youtube-analytics/DECISIONS.md`                    | Same directory                 |
| LinkedIn Sync     | `docs/decisions/linkedin/DECISIONS.md`                             | Same directory                 |
| PlusVibe          | `docs/decisions/packages/twenty-apps/public/plusvibe/DECISIONS.md` | Same directory                 |
| Slack Sync        | `docs/decisions/slack/DECISIONS.md`                                | Same directory                 |
| New area          | `docs/decisions/<area>/DECISIONS.md`                               | Same directory                 |

Keep operational instructions beside their owning package or skill. Link to
them from records rather than copying a runbook into every decision. Record a
cross-area decision once and link it from the other area indexes.

## When To Record

Write a record in the same turn when Kareem chooses or rejects an option,
approves a plan, corrects a requirement, or reverses a settled choice. Group
small command approvals into the larger decision they serve. For list-building
work, record the criteria, changes, counts and spend even without a debate.

Use the actual conversation, not a reconstructed dialogue. Quote Kareem exactly,
including typos. Summarize the agent's findings and proposals in a line each.
If older messages are unavailable, identify the gap and cite the available
handoff or record; do not invent a quote or attribute an inferred reason to him.

Keep credentials, private sharing links and customer record contents out of
records. Use counts and non-sensitive identifiers for verification. Separate
implemented, merged, deployed and verified states, with dates and source links.
Do not report a preserved timestamp as proof of a fresh calculation.

## Record Format

Number from `0001` within each area, using the next unused number. Never reuse
a number or rewrite an accepted record. To reverse a decision, add a new record,
change only the old record's status to `superseded by NNNN`, and update both
index entries. Commit the record with its work, or separately for documentation.

```markdown
# NNNN. Title In Plain Words

- Date: YYYY-MM-DD
- Status: accepted | superseded by NNNN | reverted on YYYY-MM-DD
- Decided by: Kareem
- Area: <area>
- Related: <links, if any>

## Context

The situation and the question to settle.

## Exchange

- YYYY-MM-DD Kareem: "Exact words."
- YYYY-MM-DD Agent: summarized finding or proposal.
- YYYY-MM-DD Kareem: "Exact correction or approval."

## Decision

The resulting choice and what it rules out.

## Why

Reasons stated by Kareem or supported by cited evidence; label inferences.

## Consequences

Resulting behavior, files, migrations, commits, deployments or costs.

## Evidence

Sources, checks and remaining uncertainty.
```

Each area index starts with a one-line description followed by this table,
oldest first. Links are relative to the index's directory:

```markdown
| #                           | Date       | Decision           | Status   |
| --------------------------- | ---------- | ------------------ | -------- |
| [0001](0001-short-title.md) | YYYY-MM-DD | The settled choice | accepted |
```
