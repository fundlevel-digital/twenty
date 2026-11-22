# 0003. Company And Person Profile Workflows

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: twitter-analytics
- Related: [Rollout Order](0002-merge-install-and-backfill-live-crm.md)

## Context

Before merging and deploying, Kareem expanded the app to Companies and People
and requested configurable automatic creation and backfills.

## Exchange

- 2026-11-22 Kareem: "Acc let's add one more thing; let's make the app create two other workflows:"
- 2026-11-22 Kareem: "I want the X profiles to also be linked to Companies and People; so when those values are updated, the porfiles can be autp created; this should be configurable, so like let me choose if/how I want any backfills, if we should auto-create, etc."
- 2026-11-22 Kareem: "Also, can u lmk what endpoints the app uses from the API, and what the raw results look like?"
- 2026-11-22 Kareem: "Aslo, let me have the multi-api key auth with auth waterfalling like the YT app"
- 2026-11-22 Kareem: "I think the Companies and people alr have X links? So that's kinda what u can base it off of, but I do want the GH profiles to be able to be M2M to those two"
- 2026-11-22 Agent: asked whether "GH profiles" meant X/Twitter Profiles, while proceeding on that assumption.
- 2026-11-22 Kareem: "Yes, X/Twitter Profiles"
- 2026-11-22 Agent: verified live Company and Person metadata includes PDL's `pdlTwitterUrl` Links field and a legacy `twitter` Text field. CLI core introspection omitted those custom fields; direct metadata inspection established their presence.

## Decision

Add native Company and Person workflows using existing X link fields, with
many-to-many Twitter Profile relations to both objects. Expose independent source
field, automatic creation and relation-change preferences, with optional backfill
preview and execution. Preserve the Influencer relation and the merge-before-live
installation order. Explain the two external endpoints and show their responses.
Use individually encrypted API-key connections and the YouTube-style key waterfall.

## Why

Kareem explicitly requested configurable creation/backfills and corrected the
relation cardinality to many-to-many. The X/Twitter clarification rules out an
additional GitHub integration in this work.

## Consequences

Two native app workflows use join records to retain independent Company and
Person memberships. Automatic actions default off, optional backfills distinguish
relating existing profiles from creating missing ones, and managed-link replacement
never removes manual links or deletes profiles. New profiles keep scheduled
analytics disabled. These defaults are implementation choices, not quoted owner
preferences. Rollout and verification status is recorded in the handoff.

## Evidence

- This conversation, 2026-11-22.
- [App README](../../../packages/twenty-apps/internal/twitter-analytics/README.md).
- [Endpoint And Response Examples](../../../packages/twenty-apps/internal/twitter-analytics/API.md).
- [Handoff](../../handoffs/2026-11-22-twitter-analytics.md).
