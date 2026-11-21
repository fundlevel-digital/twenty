# 0011. Keep native sharing and distinguish internal from external deletions

- Date: 2026-11-19
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

The prior agent presented seven design points covering duplicate storage, internal-only channels, message attributes, edits/deletes, workspace credentials, sharing and internal Slack apps. The owner’s numbered response is preserved below; the inherited handoff records the resolved implementation contract. This historical record was backfilled on 2026-11-21 from the supplied Claude transcript; its Date is the day of the original exchange.

## Exchange

- 2026-11-19 Kareem (2026-11-19T22:42:37.603Z):

  > 1. there should be a cleaner way
  > 2. THat's fine, I don't want those channels anyways
  > 3. Yeah, just add atributes to the message objects or wtvr
  > 4. sure, I'd rather jsut have a deleted_at or something and hide that from everyone except the user who sent it, or keep it and just display as deleted if it was from an external person
  > 5. sure
  > 6. sure? Maybe just have share config like emails and linkedin has
  > 7. yeah internal

- 2026-11-19 Agent: the inherited handoff describes the implementation response; the concrete source and verification are documented separately from the owner’s words.

## Decision

Reuse standard email/LinkedIn sharing. Soft-delete messages; hide an internally deleted message from everyone except its original sender, while retaining an external deletion with a visible marker. Add provider attributes to native messages. Use internal Slack applications and workspace-scoped credentials. Do not add a manual channel-to-company mapping.

## Why

The owner explicitly asked for native sharing and different handling for internal and external deletions, accepted native message attributes, and confirmed internal apps. “There should be a cleaner way” rejected duplicate per-member message storage; shared provider identity was the agent’s implementation response.

## Consequences

An opt-in provider flag shares canonical message/thread identity across connected members without changing other providers. Company timelines roll up their People’s conversations. Later configurable Person/Company creation does not introduce a manual channel-to-company mapping. The initial suggested provider attributes are implemented through native provider metadata and app-added relations.

## Evidence

Supplied concatenated Claude JSONL export, original root user message at `2026-11-19T22:42:37.603Z`; root `handoff.md`, “Agreed decisions”; current source and verification in [the implementation guide](../../slack-sync.md). No Slack message bodies or customer contact records are copied here.
