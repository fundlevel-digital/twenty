# Better Lists

An SDK application providing a real Installed Apps entry, App Preferences → Better Lists → Lists, and three registered commands:

- Create Better List opens a blank-list form.
- Manage Better Lists opens list management.
- Add to List is pinned for explicit record selections. It offers compatible existing lists and Create New List, preserves the parent object, adds the selection, and confirms the result with Go to List. Failed records can be retried without re-adding records already confirmed successful.

## Runtime Boundary

The app owns its settings components, commands and interactive selection flow. Requests run as the signed-in member and retain native API permissions. The existing workspace list objects and attributes remain workspace Custom metadata; installation does not rename that application or transfer ownership.

Its role grants record read, create and update, plus DATA_MODEL and LAYOUTS configuration. Update is required for creation on hosts where `IS_CREATE_RECORDS_PERMISSION_ENABLED` is disabled: Twenty maps create checks to update checks in that configuration. The app's UI only reads parent records and creates list entries; the member's own permissions still cap every request. The role grants no record deletion.

The retained Better Lists host feature provides membership synchronization, immutable-parent enforcement and generic deletion cleanup. This package currently requires that fork; it is not a standalone replacement for those engine features. Native object settings continue to manage list-only attributes and saved views. The Workspace Lists folder uses ordinary navigation metadata.

Creation publishes the managed-list marker after installing the membership option and required relation, allowing an incomplete setup to roll back without the host cleanup attempting to cast an enum value that was never installed.

Explicit record selections are supported. Select All across a filtered dataset is excluded from command availability. Repeated entries across separate Add to List actions are allowed, matching Attio. A network failure after a successful server write can have an uncertain outcome; check the list before retrying such a failure.

## Development And Preview Installation

The authoring packages are linked to the current monorepo because its 2.61 SDK APIs are not published on npm yet. Install root dependencies and build twenty-shared, twenty-client-sdk, twenty-ui and twenty-sdk before working on this package. Then run `yarn install --mode=skip-build` here.

Use the matching local CLI (`packages/twenty-cli/dist/cli.cjs`, built with its Vite build) against an explicitly named isolated preview remote. Run `app plan --no-prune --path <app-directory>` first. A fresh registration requires `app apply --create --no-prune`; later updates use `app apply --no-prune`. Keep preview credentials and any signed-upload adapter outside this package.

The settings menu item has USER scope so it appears in App Preferences. This scopes the entry point; list data is shared workspace data and its APIs enforce the member's permissions. A legacy workspace Settings entry may remain from the first non-pruning installation.

Keep React and React DOM pinned to the linked remote renderer's exact version. Allowing React to drift beyond the renderer produced React error 527 in the preview.

The local preview install does not authorize a production installation.
