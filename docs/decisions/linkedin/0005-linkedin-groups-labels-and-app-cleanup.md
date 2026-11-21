# 0005. Organize LinkedIn Fields And Remove The Separate App

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: LinkedIn
- Related: [area index](DECISIONS.md), [app handoff](../../../packages/twenty-apps/internal/fundlevel-linkedin/HANDOFF.md)

## Context

The CRM needed LinkedIn fields grouped on record Home tabs, obsolete fields
removed, clear labels and a single retained LinkedIn integration.

## Exchange

- 2026-11-21 Kareem: 'Ok, first can you please add a "LinkedIn" field group on company, people, etc. "Home" tabs'
- 2026-11-21 Kareem, referencing the attached field screenshot: "delete these please"
- 2026-11-21 Kareem: "What is this? Also needs to be title case, just like all objejcts, fields, etc. same"
- 2026-11-21 Kareem: "also unintall the LinkedIn app (not the one we're building"

## Decision

Group relevant LinkedIn fields on Home tabs, remove the obsolete fields shown,
use Title Case for app labels and uninstall the separate official LinkedIn app
while keeping our LinkedIn Sync app.

## Why

These are explicit layout, naming and cleanup requests. Uninstalling the
separate app must not invoke its upstream-account deletion hooks against a reused
provider account.

## Consequences

Home groups were added to People, Companies, Influencers and Workspace Members;
three obsolete Person LinkedIn ID fields were removed earlier in the session.
The rebuild's labels use Title Case. The official app was uninstalled from the
preview with its cloned destructive hooks disabled first. Its production install
remains pending a future production cutover.

## Evidence

The earlier handoff records the completed live layout/field cleanup. Preview
metadata/screens verified Title Case and removal of the official app. The own
app identity, accounts, connections and migrated native messages remain.
