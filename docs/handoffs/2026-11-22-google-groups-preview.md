# Google Groups App Preview — 2026-11-22

[Decision 0001](../decisions/google-groups/0001-build-configurable-google-groups-preview.md) records the requested name, supplied logo and instruction to leave configuration for later.

## Implemented And Installed

Source is [packages/twenty-apps/public/google-groups](../../packages/twenty-apps/public/google-groups/README.md). The independent project uses SDK 2.60.0 and CLI 2.59.0. It is installed in Sunny’s isolated preview, not production. No host code changed and no merge or production deployment occurred. The initial installation was unconfigured; the owner subsequently configured Google, as recorded in the follow-up below.

- App: **Google Groups**, universal identifier `217cafed-ac77-57ba-bb72-00cb974757f5`.
- Preview app page: https://fundlevel-w935.conductor.show/settings/applications/bb21b021-b440-4acd-ac0e-bd9b9636f9c1
- **General** contains the native Google Workspace connection card. **Group Channels** contains the setup checklist, callback copy action, selected account, editable Group drafts, visibility, history and processing controls.
- The logo is an unchanged copy of Kareem’s attachment. Both files have SHA-256 `e1c842ca06767cd2436066c070cc86dd3ccde34ce8327afc133c640ba71fcf82`.
- Initial installation added 14 metadata entities with zero updates/deletions. Later no-prune applies updated the app’s own functions/component only.

Google OAuth requests Gmail read, send and settings access, offline consent and PKCE. Identification verifies the authorized mailbox through Gmail’s profile API. Native connection storage/refresh is reused; on-connect does not import mail. Credentials are registration server variables, not workspace application variables.

Backfill uses a stable time anchor and Group-specific search, followed by exact recipient/List-ID routing. Gmail history checkpoints process new messages and label additions. Failed batches retain the previous cursor; expired cursors restart backfill. Group/message and Group/thread IDs keep imports repeatable. Existing unambiguous People are related without creating contacts. Original-sender headers handle Group From rewriting, body decoding respects the declared charset, and plain text/HTML and attachment handling are implemented.

Replies use verified Gmail Send Mail As identities and preserve native thread mapping, Gmail thread IDs, MIME reply headers, Bcc and attachments. Successful delivery keys are cached; an uncertain delivery is not automatically repeated with the same key. These Google paths have mocked transport tests, not a real-provider verification claim.

## Initial Configuration Left For The Owner

No client credentials, Google account, Group list or enabled import was supplied. Final runtime readback is empty Groups, no connection, no channels, no sync state and processing paused.

The app’s checklist and README explain enabling the Gmail API, creating a Google Cloud OAuth Web client, registering the exact preview callback, entering `GOOGLE_GROUPS_CLIENT_ID` / `GOOGLE_GROUPS_CLIENT_SECRET` in the developer registration’s Config → Server Variables, connecting through General, and filling Group Channels. Each Group must deliver Each Email to the selected Gmail account. Reply addresses require verified Gmail Send Mail As entries.

The callback is `https://fundlevel-w935.conductor.show/auth/apps/callback`. Real Google consent, token exchange/refresh, imports, attachments and sends remain pending owner configuration. Group membership-based ACLs, Group-only archives, Gmail deletions/read state and calendars are outside the implemented scope. Native sharing controls govern body/subject visibility, not arbitrary Group membership.

## Verification

- App typecheck and lint passed.
- All **38 tests** passed across five suites: exact routing/negative privacy cases, MIME/charset/sender handling, fixed-anchor pagination, checkpoint failures/expired history, permissions, paused setup, send identities/threading/Bcc/retries, and user-visible setup/save failures.
- Actual app settings handler returned the unconfigured paused state successfully before OAuth credentials existed.
- A refreshed ordinary-member session was forbidden from invoking the settings save through native function execution. Anonymous gateway requests with a cookie and forged identity header returned HTTP 403.
- Authenticated browser checks on the installed component added a synthetic Group, filled fields, saved a paused draft, confirmed Sync Now stayed disabled, removed the draft and saved again. Final readback confirms no test Group remains.
- The configured public hostname and callback rendered correctly. The supplied logo loaded. Light and dark mode screenshots were inspected. No page errors remained.
- Screenshots are ignored `.context/google-groups-app.png` and `.context/google-groups-dark.png`. Private browser drivers and API logs stay under ignored `.context/private/`.
- A real sandbox click initially failed because opaque-origin workers lack `crypto.randomUUID`. The component now uses the existing `uuid` package’s browser fallback; the same add/save flow passed after rebuilding.

The earlier synthetic **Google Channel Verification** app is separate and remains available as evidence of native sharing/ingestion/send callbacks. Its synthetic credentials are not copied into Google Groups.

## Preview Routing And Processes

The public preview now targets port **3002**, a detached gateway that proxies the existing image’s frontend/APIs to backend port 3001. The ignored `.context/google-groups-preview/` fixture changes the settings request from `/s/google-groups/settings` to the exact `/rest/preview/google-groups/settings` endpoint and states that preview scheduling is paused. The gateway maps that POST back to the authenticated app route, forwarding only content type, length and bearer authorization; page cookies and identity headers do not reach app code. Other traffic and WebSocket upgrades proxy normally. Production source retains its normal route.

The preview gateway driver/PID/log are ignored `.context/private/google-groups-gateway.*`. The existing local test TLS proxy targets the gateway. Browser verification uses local TLS/host mapping and bypasses Conductor’s edge; the owner’s authenticated public-edge session and Google callback round trip were not tested. Anonymous public requests encounter Conductor’s sign-in gate.

The existing server, restricted metadata worker, PostgreSQL and Redis containers remain running. Integration cron queues remain excluded. Google Groups is initially paused; after configuration the preview uses manual Sync Now. Its source declares five-minute polling for a normal configured deployment. Detached processes survive command completion; no wake mechanism or VM-shutdown survival is claimed.

## Remaining State

The new package and documentation are local, uncommitted changes. Existing PlusVibe/Cal.com installations and owner blocklist edits were preserved. No production CRM change or external Google import/send occurred. Hindsight recall/retention remains unavailable because this VM has no private profile; no memory write is claimed.

## Preview Recovery — 2026-11-22 20:39 UTC

Kareem requested bringing the preview back up. The port-3002 gateway had resumed, but Docker and the CRM containers were stopped after VM idle. Restarted the existing daemon with the original host-network flags, then started the same PostgreSQL, Redis, server and restricted-worker containers. No database initialization, reseeding, environment replacement or app installation occurred. Backend and gateway health passed; the original Sunny apps remained installed. Authenticated local-origin browser login, record loading and Google Groups settings passed with zero browser errors. Anonymous public health returned Conductor’s expected 401 gate. The VM still has no configured wake mechanism for Docker.

## Contact Creation And Dropdown Follow-Up — 2026-11-22

[Decision 0002](../decisions/google-groups/0002-contact-creation-controls-and-dropdown-positioning.md) records the owner's request for creation choices and correction of the detached select menu. The owner had configured one Google connection and one Group and enabled processing. Read-only comparisons before and after this update preserved all saved settings, the connection identifiers and the revision; no import was started by the agent.

**Create Missing Contacts** now offers Never, Senders Only, Recipients Only and Everyone. Older preferences read as Never without a write. To, Cc and Bcc count as recipients. Unambiguous existing primary-email matches link in every mode; ambiguous matches remain unlinked. New People use deterministic email-derived IDs and never overwrite existing People. The selected Gmail mailbox, its Send Mail As identities and configured Group addresses are excluded from contact creation. The app role includes the native Person write grant required by the existing create API. Real-provider creation was not exercised.

The native select previously portalled into a sandbox overlay with a different coordinate origin. An owned relative wrapper and non-portalled absolute positioner fix account, sharing, contact and history menus without modifying host source. The installed browser check after scrolling measured zero gap and matching left edges for account, contacts and history; history correctly opened upward near the viewport bottom. Browser errors: zero. Screenshots: ignored `.context/google-groups-select-fixed.png` and `.context/google-groups-contact-options.png`.

Typecheck, lint and **55 tests across six suites** passed. Tests cover all creation policies and participant roles, own-address exclusions, ambiguous/existing matches, concurrent creation recovery and saving the visible policy without triggering a sync. The app update was applied with no pruning only to the isolated preview. Local TLS/host mapping bypassed Conductor's edge; no real-provider import, contact creation or send was executed. Changes remain local and uncommitted; production was untouched.

## Fundlevel Preview Follow-Up — 2026-11-22

At Kareem's request the public preview now opens a separate [Fundlevel snapshot](2026-11-22-fundlevel-google-groups-preview.md), with Google Groups installed there too. Sunny's database, files, app connection and preferences remain preserved in their original VM runtime. Its gateway is still port 3002; the active Fundlevel gateway is port 3004. The same public hostname serves whichever port Conductor exposes.
