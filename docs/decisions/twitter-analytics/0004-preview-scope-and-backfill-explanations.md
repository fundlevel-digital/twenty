# 0004. Keep Additional Changes On Preview And Explain Backfill Selection

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: twitter-analytics
- Related: [Original Live Rollout](0002-merge-install-and-backfill-live-crm.md), [Company And Person Workflows](0003-company-and-person-profile-workflows.md)

## Context

The original app had explicit live-install approval. The agent carried that
approval forward to the subsequently added Company/Person workflow scope and
installed it on live. Kareem corrected that interpretation after the merge.
He also asked about relation grouping and requested clearer settings and more
selective backfills.

## Exchange

- 2026-11-22 Kareem: "U should have kept this on the preview but wtvr"
- 2026-11-22 Kareem: "any way to be abe to group by these? Or this a bigger ovverhal? it's okay if it is, since I want this functionality all over the CRM, in which case I'll just start another session to work just on that"
- 2026-11-22 Agent: confirmed record grouping supports single-record relations but excludes Has Many relations; CRM-wide many-to-many grouping requires shared query and view behavior changes.
- 2026-11-22 Kareem: "add more descriptions here, I don't get what they do except for the X link field"
- 2026-11-22 Kareem: "do these select which records to process properly? Like if the record doesn't have a X field it prolly shouldn't spend type evalutating it ykim"
- 2026-11-22 Agent: verified backfills fetched all source records before skipping empty X fields. Proposed filtering populated fields before processing, with a separate managed-relation cleanup pass for replacement mode.

## Decision

Keep these additional changes on the isolated preview for review. The earlier
live approval did not authorize every subsequent feature extension. Do not infer
a request to revert the existing installation from this correction.

Explain automatic modes, relation replacement and one-time backfills in the
settings UI. Exclude records with empty X fields before normal backfill processing,
while preserving cleanup when previously managed X links are cleared. Assess
CRM-wide relation grouping separately; this exchange does not request its
implementation.

## Why

Kareem explicitly corrected the deployment scope and said the settings were
unclear. His backfill question identifies unnecessary work on records without X
values. The cleanup exception is an implementation requirement of the previously
requested replacement behavior, not an independently stated owner preference.

## Consequences

The source change adds setting-specific explanations and distinguishes preview
counts from applied changes. Backfills filter Text and Links fields server-side,
including secondary-only links. Replacement cleanup reads managed memberships
instead of scanning unrelated empty records. No production change is authorized
or performed in this follow-up. Preview verification is recorded in the handoff.

## Evidence

- This conversation and attached settings screenshots, 2026-11-22.
- [Groupable Record Fields](../../../packages/twenty-front/src/modules/object-record/record-group/utils/canGroupRecordsByFieldMetadataItem.ts).
- [Shared Grouping Support](../../../packages/twenty-shared/src/utils/fieldMetadata/isFieldMetadataSupportedInGroupBy.ts).
- [Relation Jobs](../../../packages/twenty-apps/internal/twitter-analytics/src/logic-functions/utils/profile-relation-jobs.util.ts).
- [Handoff](../../handoffs/2026-11-22-twitter-analytics.md).
