---
name: decisions
description: "Kareem's auditable decisions: numbered records and area indexes under root docs/decisions, with docs/DECISIONS.md as the top-level index. Load before work in any area, before reopening a settled question, and whenever Kareem settles, reverses or confirms a choice."
---

# Decision records

Kareem wants every decision he makes, and the exchange that led to it, written down so it can be audited later and never argued again by an agent that did not see it (2026-11-18: "I want this to basically be super auditable; so like every single decision and back and forth we have could be there"). This is not only for engineering: GTM, campaigns, lists, copy, landing pages, spend, vendors and process decisions all go here.

## Where they live

All decision records and indexes live under the repository root's `docs` folder.
Read `docs/DECISIONS.md` first, then the relevant area's index.

| Area | Index | Records |
| --- | --- | --- |
| Whole repo | `docs/DECISIONS.md` | `docs/decisions/NNNN-title.md` |
| LinkedIn app | `docs/decisions/linkedin/DECISIONS.md` | `docs/decisions/linkedin/NNNN-title.md` |

Keep each area's existing numbers. A new area gets an index under
`docs/decisions/<area>/`; do not create decision folders or indexes in packages,
apps or GTM workspaces. Non-decision documentation, skills and rules may be
colocated with their consuming package or workspace.

## Before working

Read the root index and the relevant area index under `docs/decisions/`.
Follow settled decisions unless Kareem changes them. Link cross-area decisions
instead of duplicating their records.

## When to write a record

Whenever Kareem:

- picks between options, approves a plan, a spend, a run size or a merge pattern;
- corrects how something was done or says how he wants it done from now on;
- rejects a proposal (a rejection is a decision too: "we will not do X");
- reverses or changes an earlier decision.

And for every list build, whether or not anything was debated (Kareem, 2026-11-18: "u should keep decision logs for list builds and stuff too"): one record per list or batch of lists, under `docs/decisions/gtm/<brand>/client-work/<client>/`, holding the request in his words, every criterion and filter as built (titles kept and excluded, size bands, geography, exclusions, how one person per company was picked, checks such as an agency review), the list name and the migration that made it, the counts at each step, and what was spent. A rebuild or a change of criteria is a new record that supersedes it.

Write it in the same turn, before moving on. Small one-off approvals of a single command ("yeah run it") belong in the record of the larger decision they serve, as a line in its exchange, not in a record of their own.

## The record

File: `docs/decisions/<area>/NNNN-short-title.md`, numbered from 0001 in each area, never reused.

```markdown
# NNNN. Title in plain words

- Date: YYYY-MM-DD (the day it was settled)
- Status: accepted | superseded by NNNN | reverted on YYYY-MM-DD
- Decided by: Kareem
- Area: <folder>
- Related: <other records, by area and number>

## Context
What the situation was and what question had to be answered.

## Exchange
The back-and-forth, in order, dated. Kareem's words are quoted exactly, typos included. The agent's proposals and findings are summarised in a line each.
- YYYY-MM-DD Kareem: "..."
- YYYY-MM-DD Agent: proposed ...
- YYYY-MM-DD Kareem: "..."

## Decision
What was decided, stated so someone else can follow it.

## Why
The reasons, from Kareem's words and the evidence.

## Consequences
What changed because of it: files, tasks, migrations, commits, PRs, runs, lists, money spent. What it rules out.

## Evidence
Numbers, query results, test runs, vendor answers that informed it, with where they came from.
```

Rules for records:

- Kareem's words are quoted exactly. Do not paraphrase them into something stronger or weaker. If profanity is part of the point, keep it.
- No people's names, emails, phones or LinkedIn URLs from the data (the lead database's people). Counts and ids only. Company names are fine when they illustrate the decision.
- Never rewrite an accepted record. To change a decision, write a new record, set the old one's Status to `superseded by NNNN` (the only edit allowed), and add a line to both index entries.
- Commit the record with the work it governs, or on its own if no code changed.

## The index

`DECISIONS.md` in the area directory under root `docs/decisions/`: a one-line description of the area, then a table, newest last:

```markdown
| # | Date | Decision | Status |
| --- | --- | --- | --- |
| [0001](decisions/0001-short-title.md) | 2026-11-18 | One line saying what was decided | accepted |
```
