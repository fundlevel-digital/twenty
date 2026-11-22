# 0002. Populate the Preview from Live Influencers

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [Initial app decision](0001-native-github-profiles-app-and-preview.md), [preview handoff](../../handoffs/2026-11-22-github-profiles-preview.md)

## Context

The isolated GitHub Profiles app was implemented and reviewed with a public demo
profile. The owner approved the preview and requested its population using the
GitHub links already recorded against live CRM influencers.

## Exchange

- 2026-11-22 Kareem: "Okay, looks good."
- 2026-11-22 Kareem: "Can u go ahead and populate this preview w/ all the GitHub profules we have in the live CRM on influeners?"
- 2026-11-22 Kareem: "Does the app need login info?"
- 2026-11-22 Kareem: "Also, what're the rate limits, and are we handling those?"
- 2026-11-22 Agent: explained that public requests need no GitHub login, the app supports an optional token, and current rate-limit handling stops with a reset-time error rather than automatically waiting/retrying. Used the existing authenticated GitHub CLI for the import without copying its token into the app.

## Decision

Populate this isolated preview with the GitHub profiles recorded for live
influencers. The earlier preview-only restriction did not authorize copying live
CRM records; this explicit request now authorizes the minimal data copy needed
for the preview population. It does not authorize production writes or rollout.

## Criteria and Outcome

Read current active influencer records for GitHub links and inspect their source
notes. Exclude a reference explicitly identified as belonging to a different
brand. Resolve a stored project URL to its owner's profile only after the public
account identity corroborates the associated creator. Preserve explicitly linked
organization accounts as Organization profiles.

The fresh read identified 34 account candidates across 33 influencers. A read-only
check of structured GitHub fields on related contacts found no additional links.
All 34 candidates returned successful profile and social-account responses: 31
User accounts and three Organization accounts. The import created 34 profile
records and minimal influencer records containing source ID and name, preserving
their relations. The existing demo profile remains, giving 35 preview profiles.

The importer reused the app's response schemas, mapping, identity lookup/update
handler and native avatar helper. Private checkpoints make reruns recoverable;
GitHub responses were fetched once and reused for preview writes. Both raw
responses, all provider URL values, nullable flags, and 34 native avatar bindings
were checked after import.

## Quota and Spend

The import made 68 serialized authenticated GitHub API requests using the owner's
existing signed-in CLI. No GitHub token was transferred into the preview app.
No paid API calls were made. The importer checks remaining quota and stops rather
than issuing more requests when rate limited; it does not claim automatic durable
rescheduling. The app itself still reports rate-limit errors and reset times
without automatic queueing/backoff.

## Evidence and Limits

See the preview handoff's population follow-up. Customer names, GitHub account
lists, original CRM notes, response payloads, tokens and private sharing links
remain outside tracked documentation. Production CRM access was read-only. No
production installation, GitHub-secret configuration, merge or deployment was
performed as part of this population.
