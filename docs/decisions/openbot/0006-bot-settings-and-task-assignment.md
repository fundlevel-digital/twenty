# 0006. Bot Settings, Task Assignment And Reminder Workflows

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: OpenBot
- Related: [Manual webhooks](0005-resume-crm-with-manual-webhooks.md)

## Exchange

- Kareem: "Oh, yeah please build that out; it should let me config bots, their webhook URLs/ secrets, etc."
- Kareem: "I think a page showing the bot and the. Having a separate page per bot config would be nice"
- Kareem: "Would also be nice to have a way to assign tasks to bots? Like being able to set assignee attribute to a bot(s), ik that might require some more engine shi but I'm cool w it"
- Kareem: "Also a way to send bots routines and shi based on when a task is assigned, due, a configurable warning X time before a task is due, etc."
- Kareem: "I'd also need some way to be able to setup a workflow that would ping bots every X time after their task is overdue? This can just be a normal workflow too w/ maybe some custom nodes if needed, that the app comes with"
- Agent: Explained that native Assignee is a single workspace-member relation and
  proposed app-owned bot configuration, a multi-bot task field, and a focused
  host picker/display adapter to combine them with the existing human assignee.

## Decision

Build a native bot directory and individual bot configuration pages, including
webhook URLs and secrets. Support task assignment to multiple bots, assignment
and due-time notifications, configurable advance warnings, and recurring overdue
reminders through configurable workflows. Engine changes for bot task assignees
are acceptable within this explained scope; unrelated host changes are not.

## Boundaries

The live OpenBot must not be accessed or changed. Kareem configures its routines
manually. Secrets remain encrypted and are not returned to ordinary app readers.
Preserve existing human assignees and native task access checks. Verification
uses the isolated CRM and its local demo endpoint, without production changes or
paid agent calls.

## State

Implementation and preview verification are in progress. This record does not
claim completed delivery, a live OpenBot connection or a production deployment.
