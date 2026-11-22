# 0008. Use Native Enum Fields Across Apps

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Application Data Models
- Related: [NanoInfluencer](nano-influencer/0002-enrichment-connections-and-navigation.md)

## Context

The Nano preview exposed platform codes as text. The owner clarified that finite
categorical attributes must use native enum field types and asked to apply the
rule to previously built applications, explicitly Cal.com.

## Exchange

- 2026-11-22 Kareem: "Please bro - rmemebr - things that are enums should be select attributes or multi select"
- 2026-11-22 Kareem: "Backfill the other apps we built (cal.com) that is missing this;"
- 2026-11-22 Agent: audited Cal.com, NanoInfluencer, PlusVibe, Slack Sync, LinkedIn Sync and YouTube Analytics. Found untyped categorical fields in five apps; YouTube's calculation status and existing multi-value LinkedIn/PlusVibe enums were already typed.

## Decision

Use Select for one categorical value and Multi-Select when several values can
apply. Correct earlier apps and backfill existing records. Store stable protocol
values with readable Title Case labels. Free-form content, identifiers and raw
provider diagnostics keep appropriate non-enum types.

## Consequences

The canonical rule is in `.ruler/instructions.md`; Ruler regenerates the tracked
root instructions. Eight new Select fields cover Cal.com booking status, Nano
platform, PlusVibe event and latest reply categories, Slack attachment state,
and LinkedIn member type, proxy protocol and connection method.

Twenty field types and view field targets cannot change in place. New stable
field identifiers and view entries preserve existing record data, old field
identifiers and consumer compatibility. The old text fields are labelled Raw;
normal imports populate both, while default views use native Selects. A shared
operator CLI previews and applies record backfills without overwriting populated
selections. Unknown provider values map to Other where supported and remain
preserved in the raw fields. Already typed single/multi-value attributes remain
unchanged.

## Evidence

See [backfill operations](../../packages/twenty-apps/operations/README.md), app
source and the [preview handoff](../handoffs/2026-11-22-nano-influencer-preview.md).
This record does not authorize a separate production deployment or copy of
customer CRM records into the preview.

The branch-local number was 0007; merging main renumbered this record to 0008
to preserve the already merged preview-login decision. The decision is unchanged.
