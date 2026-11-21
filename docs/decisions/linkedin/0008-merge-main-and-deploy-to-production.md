# 0008. Merge Main And Deploy LinkedIn To Production

- Date: 2026-11-21
- Status: superseded by 0009 (production deployment authorization only)
- Decided by: Kareem
- Area: LinkedIn
- Related: [0004](0004-cloud-preview-and-simulated-provider-checks.md), [0007](0007-open-the-rebuild-pull-request.md)

## Context

PR #7 was open with the tested rebuild. The app was deployed only to the isolated
preview; the production CRM still ran the previous LinkedIn app. Main had gained
YouTube Analytics changes and shared Ruler/decision guidance.

## Exchange

- 2026-11-21 Kareem: "Is the app deployed on my prod?"
- 2026-11-21 Agent: confirmed the rebuild was preview-only and distinguished earlier live layout changes and archive Worker/D1 deletion.
- 2026-11-21 Kareem: "Merge the remote branch (main) into your branch and resolve conflicts. Then, commit and push your changes."
- 2026-11-21 Kareem: "when done, plese deploy to my live crm"
- 2026-11-21 Agent: committed to merge/push first, then use a staged production migration with the tested privacy fix before enabling owner-only sharing.

## Decision

Merge current `origin/main` into `fundlevel/linkedin-sync-app`, resolve conflicts,
commit and push. Then deploy the LinkedIn rebuild to the live CRM. This supersedes
the preview-only deployment restriction in 0004 and the production exclusion in
0007; it does not change the saved-data/simulated-provider decision or authorize
merging the PR into main.

## Why

Kareem explicitly requested both the branch update and the live deployment after
confirming production had not yet received the rebuild.

## Consequences

Preserve both app areas' decision documentation and shared agent guidance. Deploy
the core private-record share-key fix with the app, retain source rows until
migration reconciliation, and retire legacy objects only after verification.
Unavailable original attachment files and unresolved human account ownership
remain explicit limitations. Record actual deployment results in the app handoff.

## Evidence

Preflight production server/worker were healthy on the same runtime image used
for the isolated preview. Existing preview evidence covers 821 reconciled messages,
302 passing tests and member/embedded-token privacy checks. Production completion
must be verified independently after the deployment.
