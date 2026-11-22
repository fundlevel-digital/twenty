# 0004. Mention Autocomplete, Record Tabs And An Inbox Preview

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Comments

## Context

The preview composer supported a mention picker behind the toolbar button, but
typing an @ fragment did not open suggestions. Kareem also asked to inspect an
incoming notification and place Comments beside the other record tabs.

## Exchange

- 2026-11-22 Kareem: "This needs to have autofiill and some sort of validation"
- 2026-11-22 Kareem: "I wanna preview the inbox shit some how"
- 2026-11-22 Kareem: "Let's also have a comments tab; let's also have some sort of privacy config per connection, like the email//calendar app"
- 2026-11-22 Agent: Identified typed mention autocomplete as the first request, proposed validation of selected recipients and an incoming demo notification, and asked whether connection privacy means OpenBot access or each user's comment visibility. That privacy scope remains awaiting clarification.
- 2026-11-22 OpenBot agent: Provided the merged composer and requested preserving bot identities, the Bots group/avatar, and caret restoration after controlled value updates while extending autocomplete and validation.

## Decision

Add typed mention suggestions and recipient validation, provide an incoming
Inbox preview, and expose Comments as a record tab. Follow the existing native
email/calendar settings pattern for the requested privacy control once its
connection scope is clarified. This record does not select a privacy model.

## Consequences

The composer searches typed fragments, supports arrow keys and Enter/Tab,
replaces the fragment without losing surrounding text, and retains the
OpenBot group's identity and avatar support. Unselected @ mentions block saving
in both the composer and handler; deleted or edited mentions do not retain a
notification recipient. Selected references still require caller access.

Company and Person record tabs reuse the existing Comments component and saved
threads through SDK page-layout extensions. Other objects retain the Comments
command and can place its widget on their record layout. The isolated preview
has an incoming mention from a different seeded member, since self mentions
intentionally do not notify. No production change or external message is
authorized by these preview checks.

## Evidence

The [app README](../../../packages/twenty-apps/internal/comments/README.md)
tracks implementation and verification. Automated checks cover typed selection,
caret placement, surrounding text, keyboard actions, missing/inaccessible
recipients, stale search responses, failed searches and removed mentions.

Browser verification exposed a keyboard race that component tests could not
exercise: the browser inserts a newline before a worker can cancel Enter. The
host now reserves active autocomplete keys and declared submit shortcuts before
forwarding events. Tests through the actual host wrapper cover that behavior.
The app also imports its own SDK UI stylesheet, keeping menu classes and their
native scrolling rules consistent with the bundled UI version.
