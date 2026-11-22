# 0012. Deploy GitHub Profiles To The Live CRM

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [Native App](0001-native-github-profiles-app-and-preview.md), [Noreply Filtering](0011-configurable-noreply-email-filter.md)

## Exchange

- 2026-11-22 Kareem: "Go ahead and deploy on the live CRM" with an attached branch
  continuation note confirming that PR #25 was merged.
- 2026-11-22 Agent: install the exact merged app through the saved production
  CLI remote, review its metadata plan, preserve existing CRM applications and
  record the resulting live state separately from preview verification.

## Decision

Deploy the merged GitHub Profiles application to the existing live CRM workspace.
The merged source is PR #25, commit `b13a4e000e116250658c74794c768e5e68f949e7`.

## Scope

This authorizes the app installation and bounded verification. It does not start
an influencer/profile backfill, commit email extraction batch or automatic source
sync. New-install defaults retain disabled automatic source sync, no stale-link
removal and enabled noreply filtering. Preview customer records, saved preferences
and OAuth connections are not automatically promoted to production.

No host frontend, core server or shared package changes are part of this app's
merged diff, so installing the native app does not require replacing the live
core image. Credential readiness and live OAuth consent must be verified
separately from successful app installation. The owner previously chose to
handle GitHub OAuth registration and credentials directly.

## Evidence

GitHub reports PR #25 merged at the recorded commit. The production release uses
an isolated Mac checkout and the existing native CLI remote; credentials remain
on the Mac. The [release handoff](../../handoffs/2026-11-22-github-profiles-live-release.md)
records the actual installed state, validation and remaining setup.
