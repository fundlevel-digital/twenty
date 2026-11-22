# 0006. Add List-Entry Comments And Merge After Better Lists

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Comments
- Dependency: [Better Lists, Workspace 932](https://app.conductor.build/fundlevel/w/932)
- Reference: [Attio Comments And Mentions](https://attio.com/help/reference/productivity-collaborating/comments-and-mentions)

## Context

Kareem supplied Attio's maintained documentation and identified Better Lists as
the prerequisite for comments on list entries.

## Exchange

- 2026-11-22 Kareem: "Here are more docs here in case there's more useful stuff: https://attio.com/help/reference/productivity-collaborating/comments-and-mentions"
- 2026-11-22 Kareem: "Btw, u need to merge after https://app.conductor.build/fundlevel/w/932"
- 2026-11-22 Kareem: "Don't mesasge that thread, but please remind me abt this when I ask u to deploy/merge"
- 2026-11-22 Kareem: "Cause u need to implement comments on the list entires too"
- 2026-11-22 Agent: Recorded the required merge order and inspected available Better Lists evidence without messaging that workspace or its session.

## Decision

Support comments on list entries as well as parent records. Keep their feeds
separate and apply the entry/list's access checks rather than granting access
through the parent record. The Comments change must merge after Better Lists
from workspace 932.

Before any requested Comments merge or deployment, remind Kareem of this
dependency, confirm Better Lists has merged, and verify Comments against its
merged list-entry model. Do not message the workspace 932 thread. This record
does not authorize a merge or deployment now.

## Evidence

Attio documents separate feeds for record and list-entry comments, with list
access required to read the latter. Its documentation also identifies emoji
reactions, thread-starter reply notifications, view-wide feeds and responding
from Inbox; these are separate parity checks, not proof they already exist here.

Read-only Better Lists transcript evidence describes native custom entry
objects with a Parent Record relation. Its creation hook uses singular names
`betterList` plus a UUID without hyphens, a corresponding `Entries` plural,
and a `better-lists:v1:` description marker. Treat this as an observed working
contract, not a substitute for verification against the final merged source.

The [app README](../../../packages/twenty-apps/internal/comments/README.md)
tracks the implementation and verification state. Record-only preview checks
do not establish combined Better Lists integration or list access enforcement.

The Comments handler now returns an explicit entry/list context for those
objects, and the composer names the list. Automated tests cover entry/parent
feed isolation, entry access denial, cross-feed mutations and entry notification
references. The isolated preview has two native entry objects, each related to
the same seeded company. API checks verified distinct feeds, replies,
resolve/reopen and cross-list deletion rejection. These fixtures do not include
the Better Lists application or prove recipient-side list permissions.
Browser checks opened Comments on a native entry, displayed its list label and
persisted reply, and copied a thread link addressed to that entry rather than
the parent company.
