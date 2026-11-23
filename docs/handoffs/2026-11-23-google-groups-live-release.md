# Google Groups Live Release — 2026-11-23

[Decision 0006](../decisions/google-groups/0006-deploy-merged-app-to-live-crm.md)
records the owner's request to deploy after
[PR #37](https://github.com/fundlevel-digital/twenty/pull/37) merged as
`b39ad2d1c5d4e0f9b2b28fc8099c55902eeecef1`.

## Installed

The exact merged Google Groups SDK app is installed in the live Fundlevel
workspace through the existing `fundlevel` CLI remote on the Mac. No host image
rollout was required: the merged PR changes app code and documentation only.

- Application: `ec5000e0-449b-401b-a0e9-7f7620678d5b`.
- Registration: `d8ca7e10-ca79-4ad1-8479-269706a8b797`.
- Artifact content hash: `755acd6f20e32d7c2c108300fb7591c16217484065ad475eca4e00111ad63072`.
- Reviewed and applied metadata: **37 creates, zero updates, deletions,
  destructive actions or cascades**, with pruning disabled.
- Uploaded 26 files totaling 5,413,921 bytes.
- Five logic functions, one settings component, one Google connection provider,
  one messaging provider, four conversation summary fields and native inbox
  navigation are installed.

The source was extracted from the exact merge commit into an isolated Mac
release directory and installed with immutable Yarn 4.18.1 dependencies, SDK
2.60.0 and CLI 2.59.0. Production authentication stayed on the Mac. Preview
fixtures, copied mail, Google tokens and saved preferences were not promoted.
The optional generated cover image was skipped because Sharp was unavailable;
the supplied app logo uploaded normally and passed its live checksum check.

## Verification

- Fresh Mac validation passed 61 tests across eight suites, direct app typecheck,
  lint and app build.
- All 18 preexisting application IDs and all 90 object IDs are preserved. Google
  Groups is the nineteenth app; it adds no new objects.
- A fresh native post-install plan reports zero changes in every category.
- The installed settings component checksum matches the approved build manifest.
  The public app logo returned HTTP 200 and matched the source PNG bytes.
- Shared-login and Fundlevel `/healthz` endpoints both returned HTTP 200.
- A normal signed-in CLI execution of the read-only settings handler succeeded
  in 623 ms: revision `initial`, processing paused, zero Groups, zero connections,
  contact creation Never and no sync state. No Gmail fetch or send was invoked.
- Native metadata verifies the Google Groups folder and **All Group Emails**
  view. The live view ID is `a7ff3f5f-91cb-468c-a065-4fe18377da80`.
- Verification used supported CLI/API access and public assets, not an
  authenticated production browser interaction or Google consent round trip.

The first metadata verification query used unsupported content field names;
that read-only query was corrected and the supported query passed. The initial
local checksum scan looked in the CLI state directory instead of its in-memory
build artifact list; matching the installed checksum against the build manifest
then passed. Neither correction changed the app installation.

## Configure Google Before Syncing

Open [Google Groups settings](https://crm.fundlevel.co/settings/applications/ec5000e0-449b-401b-a0e9-7f7620678d5b).
The app is installed with its empty, paused defaults. Configure its Google OAuth
Client ID and secret under
[developer registration variables](https://crm-login.fundlevel.co/settings/developers/apps/d8ca7e10-ca79-4ad1-8479-269706a8b797),
with the exact authorized callback:

`https://crm-login.fundlevel.co/auth/apps/callback`

Then use the native Google Workspace connection flow and choose the intended
Group channels, sharing, history window and contact policy before resuming.
[All Group Emails](https://crm.fundlevel.co/objects/messageThreads?viewId=a7ff3f5f-91cb-468c-a065-4fe18377da80)
will populate after live imports. The three mailbox-specific shortcuts in the
preview were fixture-only; the merged live source provides the reusable All
Group Emails view and its Group filter.

Google consent, live imports, contact creation, Gmail delivery and workflow
execution were not enabled or tested by this deployment. The app does not add a
dedicated On New Group Email workflow trigger. The preview's historical-mail
verification remains separate evidence and is not a live import result.

Private release files, plans, validation logs and preservation evidence remain
in the Mac directory referenced by `~/.twenty/.google-groups-live-release-path`.
No credentials or customer CRM records are included here. Hindsight remains
unavailable because the VM lacks its private profile; no retention is claimed.
