# 0010. Automate Webhook Setup And Remove Obsolete Configuration

- Date: 2026-11-21
- Status: superseded by 0011 (webhook setup mechanism only)
- Decided by: Kareem
- Area: LinkedIn
- Related: [Archive removal](0003-drop-and-delete-the-archive-worker.md), [Deferred connection](../0006-connect-linkedin-after-the-rollout.md)

## Context

The staged production install retained obsolete archive variables. It also
exposed an operator readiness flag as a configurable True/False setting and
left the Unipile webhook signing secret for manual setup.

## Exchange

- 2026-11-21 Kareem, showing the archive URL: "why is this still here? I thought we got rid of it"
- 2026-11-21 Kareem, showing the empty webhook-secret field: "can the webhook not be setup automatically for me?"
- 2026-11-21 Kareem, showing Connection Privacy Configured: "wtf is this"
- 2026-11-21 Agent: identified configuration retained by the staged install, confirmed that the archive endpoint returns 404, and proposed automatic webhook setup plus removal of the exposed internal switch.

## Decision

Remove the obsolete archive configuration and perform webhook setup using the
saved API key, without requiring the owner to copy its generated secret manually.
LinkedIn sign-in remains deferred. The agent's implementation choice is to keep
privacy readiness in internal app KV rather than a user-editable variable; the
owner did not choose a storage mechanism or assert that privacy checks passed.

## Why

The archive was already retired. The webhook API can register an endpoint and
return its signing secret. A user changing a readiness flag does not perform
native privacy setup or verify permissions.

## Consequences

- Removed ARCHIVE_URL, ARCHIVE_TOKEN and CONNECTION_PRIVACY_READY from live app
  variables while retaining all 821 legacy messages.
- Removed one obsolete app-managed layout tab and its dependent widget; no
  object or field metadata was pruned.
- Readiness now requires the internal boolean `linkedin-private-records-ready`;
  the old environment variable cannot authorize owner-only sharing.
- Added an administrator helper that discovers or creates the app's Unipile v2
  endpoint and stores the API key/signing secret in encrypted registration and
  workspace variables. It preserves unrelated provider endpoints.
- Production verification accepted a signed synthetic non-LinkedIn event with
  HTTP 200 and rejected an unsigned event with HTTP 401. No LinkedIn account was
  connected and no customer message was sent or migrated by this setup.

## Evidence

- [Configuration helper](../../../packages/twenty-apps/internal/fundlevel-linkedin/scripts/configure-webhook.mjs)
- [Unipile endpoint API](https://developer.unipile.com/v2.0/reference/createwebhookendpoint)
- [Signature verification](https://developer.unipile.com/v2.0/docs/configure-a-webhook)
- All 287 app tests and 12 legacy tests, app typecheck and lint passed. The four
  focused privacy tests also passed with a legacy True flag ignored.
