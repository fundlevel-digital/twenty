# 0010. Make The Scoped Reply Code Readable To The Bot

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: OpenBot
- Related: [0009](0009-recipient-and-task-creation-gaps.md)

## Exchange

Kareem asked: "Why does it need a trusted tool? Why can't we just give it to the bot in plain text?"

Agent clarified that a trusted tool is an implementation choice, not a
cryptographic requirement, and that the credential is scoped to one request.
After inspecting OpenBot's existing field-name redaction rule, the agent
explained that the app's `reply.secret` field matches it.

Kareem: "Oh okay, so maybe we just change the name?"

Agent treated the proposal as a request to test and apply an app-side payload
compatibility change, without changing the live OpenBot or its redaction code.

## Decision And Implementation

Send the scoped credential as `data.reply.code`, with `data.reply.secret` kept
as a compatibility alias for existing routines. The agent chose the name `code`.
New routine instructions use `code` to generate the same callback signature.
This intentionally makes the request credential readable to the receiving bot;
it does not expose the routine's signing secret or a general CRM token.

The request scope, expiry, original-source access checks, reply-signature format
and idempotency remain unchanged. Old saved events are not rewritten. A fresh
request is needed to receive the new field. The trusted helper remains optional;
it is no longer a prerequisite of the documented default setup.

Conductor's public callback authentication gate is independent of this payload
change. No external callback reachability or live OpenBot configuration change
is claimed.

## Evidence And Limits

Inspected OpenBot source snapshot: `a7daac0630f9ab37e1c710388f49593b229541a2`.
Its logging package's actual `redactSecrets` function masked `reply.secret` and
preserved `reply.code` for a synthetic request-scoped HMAC value, including an
event wrapped as text. This does not promise identical behavior in all future
versions or for values separately registered with a redactor.

A no-network probe exercised the real app sender, the actual OpenBot redactor,
code-based callback signing and the app's signature verifier. The reply verified
successfully after the legacy `secret` alias was redacted. All 47 app tests and direct typecheck passed. CLI build/apply succeeded in the
isolated preview, with no diagnostics and no settings changes.
No real bot request was sent during this check; the live OpenBot was untouched.
