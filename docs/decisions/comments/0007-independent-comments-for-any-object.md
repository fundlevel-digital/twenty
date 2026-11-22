# 0007. Keep Comments Independent Of Better Lists

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Comments
- Supersedes: [0006](0006-list-entry-comments-after-better-lists.md)

## Context

The app already addresses a discussion using its target object name and record
ID. List entries in the inspected implementation are ordinary custom records,
so a provider-specific classification and merge dependency are unnecessary.

## Exchange

- 2026-11-22 Kareem: "WEll acc, on second thought, this app shouldn't depend on Better Lists app, can we rework it? I guess every list entry is a normal object anyways no?"
- 2026-11-22 Agent: Confirmed each entry is a record within a custom object, and removed provider-specific detection, context types and merge gating.

## Decision

Comments is a standalone app for standard and custom object records, including
records used as list entries. Each feed is identified only by object name and
record ID. Access is checked on that target record, without relying on a parent
relation or another app's metadata marker.

Cancel the required merge order after workspace 932 and the associated reminder
from decision 0006. Future Comments merges and deployments must not be blocked
on Better Lists. Preserve the instruction not to message that thread. This
change does not authorize a merge/deployment or resume OpenBot work.

## Consequences

The response carries the ordinary object's display label rather than a
record/list-entry classification. The UI displays that label consistently.
Tests use unrelated custom object names without provider metadata and include
a record without a parent relation. Existing threads, target IDs, permission
checks, replies and links retain the same storage behavior.

The [app README](../../../packages/twenty-apps/internal/comments/README.md)
and [Attio comparison](../../../packages/twenty-apps/internal/comments/ATTIO-PARITY.md)
track current capabilities and verification limits. Privacy and notification
access checks remain Comments concerns; they are not delegated to Better Lists.

## Evidence

The app typecheck, CLI build and 47 app tests pass. The isolated preview created
comments and replies on an ordinary custom record with no parent relation or
provider description. Browser checks opened that record's Comments panel,
displayed its ordinary object label, and expanded the saved reply. Existing
entry fixtures also retained independent feeds and thread behavior after the
classification was removed. No production deployment or merge was performed.
