# 0011. Let The App Configure Its Webhook From A Service Key

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: LinkedIn
- Related: [0010](0010-automatic-webhook-and-internal-configuration.md)

## Context

The previous deployment added an administrator setup script and ran it once.
The app still exposed a required signing-secret input. That did not meet the
owner's request for automatic app configuration.

## Exchange

- 2026-11-21 Kareem: "Still a little confused... why is it prompting me if ur saying it'll auto-config?"
- 2026-11-21 Kareem: "Also make sure that the Unipile API Key should be called a Service Key, since u need a service key to be able to config api webhooks"
- 2026-11-21 Kareem: "Like I meant, I wanted the APP to auto config the webhook kon my behalf; not YOU do it for me ykim"
- 2026-11-21 Agent: acknowledged that a one-time administrator action was insufficient and implemented configuration in the app's native save check and scheduled repair.

## Decision

The owner supplies a **Unipile Service Key**. The app discovers, creates or repairs
its own webhook automatically when native settings are saved, and retries on a
schedule. Remove the manual signing-secret input. Do not make LinkedIn sign-in a
prerequisite for webhook configuration or resume deferred history migration.

## Why

Kareem explicitly asked for an app capability, not an operator completing setup
on his behalf. The key needs webhook-management permissions.

## Consequences

The existing API identifier `UNIPILE_API_KEY` remains compatible; its UI label and
description now say Service Key. Only the provider endpoint ID is stored in app
KV. Signed delivery fetches the secret from Unipile with the saved Service Key;
it does not persist that secret in plaintext or ask the owner to copy it.

The app uses its public function domain when available, otherwise its workspace
address. Setup probes that route before moving a known legacy endpoint.
Unrelated endpoints and another workspace's shared server endpoint are excluded;
legacy adoption requires an explicit endpoint ID scoped to this install.

## Evidence

- [App configuration](../../../packages/twenty-apps/internal/fundlevel-linkedin/src/application.config.ts)
- [Automatic configuration](../../../packages/twenty-apps/internal/fundlevel-linkedin/src/unipile/utils/configure-unipile-webhook.util.ts)
- [Save check](../../../packages/twenty-apps/internal/fundlevel-linkedin/src/logic-functions/linkedin-health-check.ts)
- [Deployment verification](../../handoffs/2026-11-21-live-crm-rollout.md)
