# 0005. Resume CRM Work With Manually Configured Webhooks

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: OpenBot
- Related: [Workflow actions](0003-workflow-actions-and-sender-secrets.md)

## Exchange

- Kareem: "U should be good to continue build the openbot app now, comments and other stuff have been implemented"
- Agent: Resumed implementation and drafted an automatic host connector in the
  isolated CRM checkout; read OpenBot source from GitHub.
- Kareem: "wait are u touching openbot??"
- Kareem: "DO NOT touch my live openbot"
- Kareem: "I'll just configure the webhookroutines by hand"
- Agent: Confirmed no live OpenBot connection or changes had occurred; removed
  the automatic connector and enrollment implementation from the working tree.

## Decision

Resume CRM-side integration work and the approved workflow blocks. Kareem will
create/configure the OpenBot webhook routines manually. Do not connect to,
configure or modify the live OpenBot. The pause is superseded by this narrower
scope, and automatic enrollment is deferred in favor of manual webhook setup.

## Evidence And State

Only the isolated Twenty checkout and preview were changed. OpenBot source was
read from GitHub; no request was sent to the live OpenBot host. The automatic
connector experiment was never installed and is preserved only in ignored local
artifacts. Its code, queue object, secret variable, settings UI and enrollment
endpoint were removed from the proposed changes. No production deployment or
paid agent execution occurred.
