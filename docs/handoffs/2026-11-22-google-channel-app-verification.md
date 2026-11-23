# App-Only Shared Messaging Verification — 2026-11-22

Kareem requested runtime verification after the agent gave conflicting feasibility answers. [Decision 0012](../decisions/0012-verify-google-channel-app-feasibility.md) records the correction and scope.

## Conclusion And Boundaries

An installable Twenty app can create native email-style channels, ingest and deduplicate messages, render them in the record Messages UI, and handle shared-member replies without changing the host code. These capabilities were exercised on the running preview, not inferred only from source.

This verifies the Twenty extension points. It does not verify a finished Google Workspace connector. Actual Google consent, token exchange/refresh, Gmail message retrieval, Google Group identification and routing, Gmail delivery, attachments and arbitrary per-Group membership permissions remain untested. A dedicated global shared-inbox UI was not demonstrated; the tested native UI is a Person record’s Messages tab and conversation drawer. Browser-composer send automation did not complete; shared replies were verified through the native authenticated send mutation and rendered in the browser.

## Runtime And Fixture

- Host: existing Sunny preview, unchanged image `ghcr.io/fundlevel-digital/twenty:1913516c9b8e4b3177c9ccb50412b551a300c9f3`.
- Fixture: ignored `.context/google-channel-probe/`; SDK 2.60.0, CLI 2.59.0.
- Installed app: **Google Channel Verification**, universal identifier `17be9a73-df5e-5ec2-b560-aa3fc5b72240`.
- The app defines a synthetic workspace-scoped connection provider, an email-style messaging provider, an identification function, a probe function and a send callback. A separate Google OAuth provider declaration tests native authorization URL generation with dummy registration credentials.
- The fixture makes no external Google or mail-provider calls. Its send callback records the supplied payload in app KV and returns a synthetic message ID. This is not evidence of external email delivery.
- No product source changes, host rebuild, production connection, production deployment or real import occurred.

## Checks Actually Performed

| Check | Result |
| --- | --- |
| Build, registration, upload and app installation | Passed through CLI `app apply --create --no-prune` |
| App-owned connection creation | Passed through native `connectApplicationWithApiKey`; synthetic key identifies a fake mailbox |
| Multiple native channels on one connection | Passed; shared Team and metadata-only Legal channels |
| SDK ingestion into native messages and threads | Passed through an executed app logic function |
| Repeated ingestion | Passed; same external ID returned the same native message ID |
| Person association | Passed; synthetic messages appear on the synthetic Person’s native Messages tab |
| Shared read access | Passed as owner and a second ordinary member created through native signup |
| Native send callback | Passed for owner and second member through `sendAppChannelMessage`; both replies persisted in the original thread |
| Reply threading | Callback received the original external message ID in `email.inReplyToExternalId` |
| Metadata-only visibility | Owner sees subject/body; second member receives restricted-field markers for both in timeline and direct message GraphQL queries |
| Browser rendering | Owner and second member opened the native Messages tab and shared conversation; second member sees the other conversation as Not Shared; no page errors |
| Native Google OAuth redirect | HTTP 302 to `accounts.google.com/o/oauth2/v2/auth`, authorization-code flow, Gmail read/send scopes, exact preview callback, S256 PKCE |
| Google consent, token exchange, Gmail fetch/send | Not performed |
| Browser composer send | Automation did not complete; do not describe the API send test as a successful composer click |
| Arbitrary Google Group member ACLs | Not performed; metadata/subject/workspace-wide body visibility does not establish per-Group authorization |

The OAuth redirect check used the browser session cookie and a native transient token with navigation headers over the local backend. A request without browser navigation/session opt-in headers was correctly rejected. Registration server variables are updated through `updateApplicationRegistrationVariable`, not the workspace `updateOneApplicationVariable` mutation. The check stops at the redirect and makes no request to Google.

## Review Evidence And Remaining Preview State

Private reproducible drivers and JSON results are under ignored `.context/private/probe-*`. They include member authentication, so they must remain untracked. Screenshots are ignored `.context/gw-probe-messages-owner.png` and `.context/gw-probe-messages-member.png`. The latter shows the shared conversation and the separate Not Shared entry as the second member.

The clearly labeled probe app, fake workspace connection, two channels, synthetic contact, synthetic second member and test messages remain in the preview for review. They are not real Group channels or production records. Google OAuth client values are dummy strings. Existing PlusVibe and Cal.com installations and owner blocklist edits were preserved.

Browser verification used local TLS/host mapping and bypassed Conductor’s public sign-in gate. No public-edge OAuth round trip is claimed. The Hindsight private profile remains unavailable; no memory retention is claimed.
