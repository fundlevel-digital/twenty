# 0010. Search Filter Parity And Native Inputs

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer
- Related: [0001](0001-native-nano-sync-and-discovery.md), [0008](0008-group-both-decision-email-and-creator-email-availability.md)

## Context And Exchange

Kareem supplied screenshots of Find Nano Lookalikes, a raw API Connection ID,
requestId, a Creator picker and the limited workflow filters. His instructions
included "This shouldbe a select from the actual settings", "wtf is this", and
"should be called a lookalike seed".

Kareem: "I need 1:1 parity with the nano api in regards to search filters (min, max, keywords, etc.) across workflows and commands; also please add descriptions; also use titlecase; also please for things that are supposed to be selects/multi-selects, render them as such in human readable (i.e. contries are formatted as porper countries, and then conveted to the ISO codes or wtvr)".

The agent identified requestId as an optional retry-safety key and explained
that the public API is narrower than the existing website API integration.
The prior turn also established that full submitted search inputs were not saved.

## Decision

Provide a global Find Nano Lookalikes command with an editable form. Give the
command and workflow action the same supported options, descriptions and Title
Case labels. Show saved native API connections by name, label the source record
Lookalike Seed, hide retry internals from the normal form, and use readable
Select/Multi-Select inputs for categorical choices. Convert country choices to
Nano's numeric ISO codes at the API boundary.

## Implementation And Scope

The shared search definition covers subscriber/follower, median-view, post,
engagement-rate and view-rate ranges; activity, email depth, personas, country
inclusion/exclusion and TikTok shop sales; keywords and keyword inclusion/
exclusion; negative seed topics, YouTube Shorts, favourite/recent deduplication
and continuation values. Existing range arrays and identifiers remain accepted.
The original retry key remains supported for existing workflows and advanced
callers; commands generate it internally.

Each new Twenty search saves Search Input JSON with the chosen inputs and the
exact Nano request body before submission. Existing imported history retains its
original payload; unavailable historical filters are not fabricated.

The host workflow renderer gains connection-provider input metadata, readable
enum labels, hidden-field support and descriptions. Native connection settings
remain the source of truth; credentials are never returned to the form or saved
in the input snapshot. This does not migrate connections to the public API.

## Evidence

Wire behavior is compared with the existing creator-eagle Nano integration and
Nano's website client, including ISO numeric countries, deep email, topic
negation and pagination. The narrower public interface is documented in
[Nano's API reference](https://www.nanoinfluencer.ai/public-api/docs).
Verification and preview limitations are recorded in the maintained
[handoff](../../handoffs/2026-11-22-nano-influencer-preview.md).
