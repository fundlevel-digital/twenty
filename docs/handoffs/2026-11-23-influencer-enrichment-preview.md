# Influencer Enrichment VM Preview

Date: 2026-11-23. Scope: isolated preview only; no production deployment.

## Result

Created the native **Influencer Enrichment (Preview)** workflow as a draft with
one **Launch Manually** trigger and zero action steps, following the
[owner's instructions](../decisions/influencer-enrichment/0001-temporary-manual-workflow-and-data-preview.md).
No enrichment providers were called and no outreach was enrolled or sent.

The preview runs the existing deployed Twenty image, pinned to
`ghcr.io/fundlevel-digital/twenty:27194f251e68c18b3ab44eed9221beeec8593ffd`.
It serves the built host UI from that image, not frontend source from this checkout.
The current branch was preserved.

## Copied Data

| Data | Rows |
| --- | ---: |
| Influencers | 479 |
| Influencer Contacts | 590 |
| Distinct People linked through Influencer Contacts | 564 |
| YouTube Channels | 480, including 1 already soft-deleted |
| Twitter Profiles | 235 |
| Influencer Analytics Entries | 90 |
| People | 22,752 |
| Companies | 11,715 |
| Legacy List Memberships | 2,095 |

Copied supporting relationship tables, notes, attachment records, native metadata,
views, app assets and available profile images. GitHub profile/link tables were
empty in the live source and remain empty in the preview. Existing LinkedIn and
other social URL fields on the copied records are retained; LinkedIn account,
chat and message sync data were not imported.

Influencer, contact, channel, Twitter profile, analytics and supporting relationship
table fingerprints matched the live source. Contact and company historical recency
values were preserved from the snapshot. References to omitted email/calendar
history were cleared in the clone, with their foreign keys restored afterward.
This copy is a snapshot, not a live synchronization.

## Isolation And Runtime

PostgreSQL, Redis, server and worker run in separate preview containers on this VM.
Server and worker use a fresh preview secret and local services/storage. No
production SSH key, saved CLI credentials, OAuth client secret, connected-account
token, API key or provider application-variable value was installed in the VM.
Other workspaces and their data are unavailable in the preview.

Existing published workflow pointers were cleared, workflow versions changed to
draft, webhooks excluded, cron registration disabled and email configured to log
locally. Google/Microsoft integrations, telemetry and billing are disabled.
The worker processes local metadata jobs without resuming the live schedules.

Production exports were read-only and transferred through a temporary,
random-path-protected HTTPS transfer server on the Mac. Production SSH and CLI
authentication stayed on the Mac. Private configuration and browser state are
under ignored `.context/enrichment-preview/`; no customer records or credentials
are included in tracked documentation.

The preview port is 3000. Containers use restart policies; the Docker daemon was
launched detached. These processes remain alive after command completion, but no
VM shutdown/wake restoration is configured or claimed.

## Verification And Limits

- Backend health returned `ok`.
- A fresh browser session showed prefilled demo email and password; sign-in
  required clicking Continue and Sign In without entering either value.
- Browser checks opened the Influencers table, the YouTube Channels table and
  the workflow Flow tab. The table showed 479 active channels, matching the copy.
- The workflow editor rendered exactly one manual trigger and no actions.
- The final browser check reported no page errors and confirmed a loaded image.
- Browser checks used the exact HTTPS origin through a VM-local TLS proxy and
  Chrome host mapping. This bypasses Conductor's edge; anonymous public access
  returns the expected 401 sign-in gate, not verified owner-authenticated access.
- Large video/media attachment payloads and inbox/calendar messages were not
  copied. Their attachment metadata may remain; playback is not verified.
- External provider connections are intentionally unconfigured. No paid refresh,
  enrichment run or workflow execution was used as verification.
- Hindsight was unavailable because this VM lacks its private profile; no remote
  memory retention is claimed.

Local screenshot: `.context/influencer-enrichment-workflow.png`.
