# Standalone OpenBot App And VM Preview

The app is now a separate package at
[`packages/twenty-apps/internal/openbot`](../../packages/twenty-apps/internal/openbot/README.md),
with its own application identity, supplied PNG logo, native settings menu and
per-bot URLs. This corrects the earlier bundled implementation described in the
[historical handoff](2026-11-22-openbot-comments-preview.md), following
[decision 0007](../decisions/openbot/0007-standalone-app-and-shared-bot-identities.md).
The work remains on `conductor/openbot-app-for-crm`, draft PR
[#24](https://github.com/fundlevel-digital/twenty/pull/24), based on main
`35c1561ae0`.

## Ownership

OpenBot owns configuration, encrypted webhook secrets, public Bot identities,
private request/reply state, receipt indexes, signed delivery/callbacks,
Task assignment storage and reminder/workflow definitions. Bots are a native
custom object with a Provider Select, separate from human login accounts.
The adapter registry currently implements only OpenBot. Grok is an extension
point, not a completed integration.

Comments retains ordinary comment storage and an optional HTTP adapter. It can
remain installed and usable without OpenBot. Mentions use generic `bot`
identities while accepting legacy `openbotAgent` selections. Bot-owned replies
are read from OpenBot, rather than granting it ownership of Comments metadata.
The authenticated bridge checks the target as the calling member, and queues
only the member's persisted comment and recipients. OpenBot functions work
without Comments storage; ordinary comment mentions are the optional dependency.
No new per-connection privacy model was inferred from the earlier unresolved
Comments discussion.

Task assignment uses the existing focused host picker/display adapter, updated
to OpenBot's own field and directory identifiers. The SDK cannot add bot records
to the human `assignee` relation, so `task.botAssignees` stores multiple UUIDs
alongside the existing human assignment. No additional engine capability was
introduced for this separation. Native Inbox does not support attaching a Task
record chip; task answers still save and notify the human recipient.

Twenty automatically creates storage-field view columns. OpenBot's application
token cannot change visibility in standard Task views. The preview admin hid the
raw JSON columns with the native view API; this is a documented optional admin
setup step, not an automatic app migration. The integrated Assignee picker
remains available.

## Isolated Preview Migration

The separate OpenBot app was installed into the existing seeded VM. Preview
Task assignments were backed up privately, copied into the new app-owned field,
and retained with stable bot IDs. Two local demo profiles were configured through
the standalone settings API; their public Bot records were synchronized. The old
Comments-owned bot settings, credentials, functions, workflow and Task field were
pruned after reviewing the deletion plan. The Comments object and existing
human/BOT comment history were preserved. Old private request jobs were not
transferred; new requests are owned entirely by OpenBot.

The app only uses manually configured webhook routines. No live OpenBot was
accessed or changed. The preview server and worker retain a fetch guard rejecting
non-loopback destinations, and test deliveries use a local HTTPS fake bot. No
paid model calls or production deployment occurred.

## Verification

- OpenBot: 38 tests; Comments: 67 tests; native Task picker: 5 tests.
- Both app builds and direct app typechecks pass. App lint passes.
- Actual installed Send/Get Status execution and signed callback completed with
  no Comments record created.
- Generic bot mention lookup, create, signed reply display, and resolving/reopening
  an OpenBot-owned thread through Comments passed with delegated member auth.
- Anonymous bridge access is rejected; unit coverage checks target ACL denial,
  member ownership, trusted stored payloads, credential-free discovery, replayed
  delivery state and conflicting callback claims. Optional app unavailability
  leaves normal Comments usable.
- Task assignment and due-warning notifications completed with signed replies in
  OpenBot's own storage. The test Task was marked Done to stop further reminders.
- Source Vite browser verification passed standalone directory loading, per-bot
  settings saves and full reload, hidden saved secret, attributed reply display,
  and typed generic Bot autocomplete. No browser page errors occurred.
- Native Task browser verification passed keyboard selection and persistence
  of two bots alongside a human after full reload, using the native overflow list.
- Fresh browser login verified prefilled email/password without entering either.
  The supplied PNG matches the app asset byte for byte and renders in the native
  app header.

The full frontend typecheck is not reported passing: this VM's incomplete local
SDK declaration outputs and memory limit affected that broad check in the
previous iteration. Focused host behavior checks are used for the picker.

## Access And Operation

Preview: https://fundlevel-w928.conductor.show/ — Conductor sign-in applies.
Open **Settings → Apps → OpenBot → Bots** for the directory. Profiles have their
own reloadable configuration URL. Demo credentials are already filled at login.

The frontend is source Vite, with rebuilt source renderer assets, served through
the local preview proxy. Detached supervisors keep the frontend, API, worker,
proxy and fake bot running while the VM remains awake. A VM shutdown is not
covered by a wake mechanism. Browser checks use the preview hostname mapped to
local TLS, which bypasses Conductor's edge; they do not prove edge authentication
from the user's Mac. Screenshots and runtime files stay ignored under `.context/`.
