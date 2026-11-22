# Better Lists — 2026-11-22

## Current Packaging Requirement

Kareem initially required [app-only implementation and advance disclosure of SDK limits](../decisions/better-lists/0003-app-only-boundary.md), then [accepted retaining this prototype and restoring its earlier Data Model layout](../decisions/better-lists/0006-restore-earlier-data-model-layout.md). The native implementation remains; an app-only conversion is no longer part of this task. The general preference for app-only work and disclosure before adding fork requirements remains in force.

Kareem [reconfirmed fixed parent types for now](../decisions/better-lists/0004-keep-parent-fixed-until-revisited.md), with a new list and suitable copying as the intended workaround. Future parent changes and formula error handling remain undecided. No automatic copy feature is claimed. The first preview was already fork-based, before the sidebar feedback.

## Latest Data Model Layout

The [navigation decision](../decisions/better-lists/0007-use-app-preferences-and-workspace-folder.md) moves list management to App Preferences → Better Lists and replaces the custom sidebar section with a native Lists folder under Workspace. All Lists and the standalone Workspace settings entry are removed. Manage Permissions is removed from list settings. Legacy Better Lists URLs redirect to the preferences routes, preserving query parameters. That navigation change did not itself install or re-own metadata as an SDK app; the later registration is described below. Backend behavior is unchanged.

## SDK App And Selection Commands

The [latest decision](../decisions/better-lists/0008-register-sdk-app-and-selection-commands.md) adds a real SDK app in [internal/better-lists](../../packages/twenty-apps/internal/better-lists/README.md), installed only in this preview. It appears in Installed Apps and App Preferences. Its explicit USER-scoped Lists settings item displays management under the native General/Lists tabs. The earlier host preference card remains only as a fallback for DATA_MODEL-only members. Existing entry objects remain workspace Custom metadata; their ownership was not transferred.

Registered commands are Create Better List and Manage Better Lists globally, and a pinned Add to List action for explicit record selections. Create New List opens the requested blank form, fixes its parent to the selected object, creates entries for the selection and offers Go to List. The SDK uses Twenty's command side panel. The existing host still supplies membership synchronization, parent enforcement and deletion cleanup; this is a hybrid app, not an app-only conversion. No additional engine code was added for the SDK registration.

All SDK requests use member-scoped application tokens. The role grants record read/create/update and DATA_MODEL/LAYOUTS, intersected with the member's own permissions. The update grant is required because this preview has separate create permissions disabled: `getEnforcedOperationType` maps creation to updates. Read/create alone reproduced REST 403; the compatibility grant allowed a member-scoped create (201), and the probe entry was removed. No delete grant is given.

The linked remote renderer requires matching React and React DOM versions; pinning both to 19.2.7 fixed React error 527. Its sandbox has an opaque origin where `crypto.randomUUID` is unavailable, so app identifiers use the existing uuid library with `getRandomValues` support. Metadata paging uses ConnectionCursor, not String. Settings components alone synthesize a legacy WORKSPACE menu entry, which is absent from App Preferences; the app declares its own USER-scoped Lists item. The app uses local linked SDK packages because this checkout's 2.61 APIs are not published to npm.

Permission-flag installation also exposed a stale bootstrap-schema column: `core.rolePermissionFlag.flag` remained required after runtime moved to `permissionFlagId`. The committed 2.7 FinalizeRolePermissionFlagCutover command was applied transactionally to the isolated preview, after verifying zero missing, broken or mismatched links. The current upgrade cursor was preserved. This repairs the preview bootstrap only and is not a production upgrade procedure.

Browser verification passed for the actual Installed Apps row, native App Preferences row and Lists tab, both global commands, global blank creation form, the pinned selection action, adding two selected records to an existing list, and creating a blank list from two selected records with a disabled parent selector. Go to List opened the new populated native table without a reload. Temporary entries and the verification list were removed; final API reads confirmed exactly the original two lists in the native folder, with five Account Ladder entries and zero Monitored People entries. The browser harness now waits for real record IDs rather than the table's temporary `row-id-0` placeholder. Screenshots: `.context/BetterLists-Installed-App.png`, `.context/BetterLists-SDK-Settings.png`, `.context/BetterLists-Registered-Commands.png`, `.context/BetterLists-Create-From-Selection.png`, `.context/BetterLists-Selection-Success.png` and `.context/BetterLists-New-List-Records.png`.

All eleven metadata GraphQL documents validate against the running preview schema. The SDK service uses CreateOneObjectInput and UpdateObjectPayload; the earlier guessed input names failed server validation and were corrected. Three service tests pass for parent mismatch, partial retries and setup rollback. App typechecking and syntax lint pass. Frontend integration lint, formatting and the full direct frontend typecheck pass; the latter ran after closing Chrome with the memory limits recorded below. Server and frontend-proxied health endpoints remain healthy. Browser verification uses the VM host mapping described below and does not verify Conductor's edge authentication.

The preview's two existing object navigation items were reparented through native metadata APIs, retaining their IDs. New list creation now places its native object link into that folder. Membership options are renumbered when appending a new list: a previously removed option had left positions 0 and 2, and using the array length for a new option collided with position 2 and failed validation. The browser check reproduced that case and passed after normalization. No engine change was added for this fix.

Browser checks passed for the two links inside the Workspace folder, removal of All Lists and the Workspace Lists settings item, navigation through the Better Lists preference card, individual settings remaining under App Preferences, removal of Manage Permissions, preservation of the creation query through a legacy URL, and creation into the existing folder without a duplicate folder. The temporary verification list and its unused membership option were removed; a final API read confirmed exactly the original two managed lists inside the native folder. Screenshots: `.context/BetterLists-Workspace-Folder.png`, `.context/BetterLists-App-Preferences.png` and `.context/BetterLists-Preferences-Settings.png`. Frontend lint, formatting and the full direct frontend typecheck passed. The check ran with `GOMEMLIMIT=1600MiB GOGC=40 GOMAXPROCS=2` after closing the browser to reduce VM memory pressure; earlier unrestricted checks had been killed. Backend and proxied frontend health checks remained healthy.

The original object-detail route again shows Fields, Settings and Layout tabs for list entry objects. Dedicated list identity settings offer Manage Attributes to open that screen. The Relations and Fields tables use the standard Data Model layout, with Add Relation hidden for managed lists to retain the fixed-parent requirement. Other objects keep normal relation controls. The sidebar, membership automation and backend guards are unchanged. This section supersedes the generic object-detail redirect and embedded field table described in the earlier corrections below.

Verification: browser checks passed for Manage Attributes navigation, all three tabs, the parent relation and existing custom fields, suppression of Add Relation for lists, direct Data Model navigation without redirection, and absence of browser runtime errors. Screenshot: `.context/BetterLists-Restored-Data-Model.png`. Lint passed on the three touched frontend files; formatting and diff whitespace checks passed. A fresh full frontend typecheck was killed by the VM memory limit (SIGKILL), so it is not reported as passing for this restoration. Backend and frontend-proxied health checks remained healthy. Browser verification used the existing public-origin TLS host mapping and bypassed Conductor's edge, as described below.

## Implementation

The retained native host feature and SDK app share managed-list metadata. Lists appear in the Workspace Lists folder, with management in App Preferences. The list manager creates a native entry object per list, a required relation to the chosen parent object, and a parent multi-select named List Entries. List names, searchable emoji and slugs are editable. Each entry object supports native saved views, filtering, sorting, custom fields, record pages and role permissions.

A wildcard database-event listener reconciles membership on create, update, upsert, soft delete, destruction and restore. It checks remaining entries before removing membership, handles both sides of a parent move, and serializes updates per parent using transaction advisory locks. Deleting a list clears its memberships without deleting parent records. Creation attempts to remove its entry object if relation or membership setup fails.

The parent type is immutable after creation. Internal object API names use generated identifiers; the configured slug is descriptive metadata. List names are used as parent membership option labels. Templates, per-list notification subscriptions, and Attio's individual-member/automation permission interface are not implemented; native Twenty roles enforce access. This is a first native implementation, not complete Attio parity.

## Preview

The isolated VM runs the source frontend from this checkout with a local server, worker, PostgreSQL 16 and Redis 7. `.context/preview-supervisor.py` monitors the three app processes and restarts them after a crash. Logs and process IDs are in `.context/`. This does not restore the VM after shutdown. Conductor publishes frontend port 3001; its private preview URL is available through `conductor preview get`.

Two temporary 4 GiB swap files are enabled on the VM to reduce memory pressure during verification. Cold source compilation is slow. The preview uses one public origin and a local Vite API proxy. Backend `SERVER_INTERNAL_URL` points to its VM listener. Public-origin browser verification uses a VM-only TLS proxy and Chrome host mapping, bypassing the Conductor edge authentication gate. Anonymous requests to that edge return 401; owner edge access must be assessed separately.

Only neutral dev seed records were used. Account Ladder contains five seeded people, Grade, Buyer Type, Ladder Rank, and a Priority Accounts view. No production data was copied and no paid external API calls were made.

## Setup Findings

Fresh migration replay fails in a historical slow migration referencing a removed core agentChatThread table. This preview was bootstrapped using the current core entities and a current upgrade cursor. Schema synchronization requires restoring deferred metadata foreign keys, omitting the circular workspace-custom-application foreign key during seeding, and dropping the retired connectedAccount.visibility column. Failed seeding also leaves permission enums/tables that must be cleaned before a retry. These adjustments are isolated preview operations, not a production upgrade procedure. The ignored bootstrap scripts record the exact local operations; they must not be run against production.

## Verification

- Three membership lifecycle unit tests passed.
- Frontend lint passed for the feature and settings integrations.
- Final direct frontend typecheck passed after building the SDK, renderer, email and client SDK declarations. Full server checks and the production-scope check exceeded the VM’s available memory (exit 137), including after temporary swap was enabled. Server lint without type-aware rules passed; the complete server typecheck remains unverified. The production configuration also needed absolute source aliases and explicit inputs under the TS 7 compiler; the ignored check config records that adaptation.
- Actual API checks created the native list, required parent relation, membership field and entry; confirmed membership synchronization, membership filtering, removal on deletion and restoration.
- The demo's custom fields, populated values and second saved view were created through authenticated native APIs.
- Backend and proxied health endpoints return healthy.
- Browser checks verified the list manager, creation of Monitored People through the form, sidebar entries, the Account Ladder native table, configuration settings, and the searchable emoji picker. Screenshots are in `.context/BetterLists.png`, `.context/BetterLists-Entries.png`, and `.context/BetterLists-Settings.png`. New object API identifiers must pass through the existing camelCase helper: raw UUID hex segments fail Twenty’s camelCase validator at numeric boundaries.

## Remaining Risks

List Entries is a maintained multi-select rather than a protected computed relation. Direct manual edits to that parent field can diverge until a relevant list-entry event reconciles it. List creation and rename span metadata mutations and are not atomic across all entities; rollback after creation failure removes the new entry object but cannot guarantee complete rollback of concurrently edited metadata. Deleting a list can leave an unused membership option label. These limits need hardening before production rollout.

The navigation verification also exposed an existing failed-setup cleanup edge: if creation fails before its membership option is installed, the core deletion cleanup tries to cast an absent value to the parent's enum. The incomplete preview test list was repaired by adding its missing option through the metadata API, then deleting the list and option through the same APIs. The option-position creation failure is fixed; the general failed-setup enum-cast cleanup edge remains. No backend change was made during the navigation task.


## Earlier Owner Corrections — 2026-11-22

This section records the earlier implementation; the Data Model and SDK sections above describe the final presentation and packaging.

The duplicate Workspace links are now filtered from display without deleting saved sidebar configuration. Lists highlight in their dedicated section on index, entry and settings routes. Explicit saved-view and record shortcuts remain available.

List settings now contain list-only attributes directly. Generic object-detail and protected parent-field edit URLs redirect there, and the field picker excludes relation types. List deletion retains its own confirmation dialog in the dedicated settings screen. Metadata field APIs protect the parent relation from updates, deletion and renaming, including deletion through its reverse relation. They reject additional relations on list entry objects. Object APIs reject changing or removing the configured parent marker. Whole-list deletion remains supported.

The Lists settings section is a fork feature. An SDK app can own objects and supply app preferences, but no app-ownership transfer or SDK repackaging was performed in this correction.

The [Attio create-list docs](https://attio.com/help/reference/managing-your-data/lists/create-lists) explicitly allow multiple entries for the same parent record. The [management docs](https://attio.com/help/reference/managing-your-data/lists/manage-lists) allow parent changes for privileged users; Better Lists intentionally keeps parents immutable at Kareem's request.

Verification: 10 new regression tests passed, focused navigation/guard utility typechecks passed, and frontend and server syntax lint passed. Running-preview API probes rejected parent updates, deletion, parent configuration changes (including clearing the marker), and secondary relations. Ordinary list attributes were still created and removed successfully. Browser verification found one link per list, `aria-current="page"` on the selected list, a redirect to dedicated settings, no Add Relation control, no relation choices in the attribute picker, and cancellation of the list deletion confirmation without deleting data. Screenshots: `.context/BetterLists-Fixed-Navigation.png` and `.context/BetterLists-Fixed-Settings.png`. Full server typechecking remains subject to the memory limit recorded above.
