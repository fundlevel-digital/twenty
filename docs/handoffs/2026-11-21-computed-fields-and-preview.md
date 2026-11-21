# Upstream Integration, Computed Fields and Preview

Date: 2026-11-21. Repository: `fundlevel-digital/twenty`.

## State at Handoff

The changes are committed locally on `conductor/api-only-features`. The
production-seeded Conductor preview is running the updated UI. The requested
merge into fork main and production deployment have not been completed.

| Reference | Meaning |
| --- | --- |
| `80f03c8df028186874802b42a3a5c3183e35a198` | Official upstream main integrated during the session |
| `3ffbd8f8ee` | Local upstream merge and initial computed-field controls |
| `7f7eedf6ab` | Local upstream expression-editor adaptation and regression fixes |

Owner choices and the relevant exchange are recorded in
[0001](../decisions/0001-upstream-and-computed-field-editor.md),
[0002](../decisions/0002-preview-before-production-deployment.md) and
[0003](../decisions/0003-ruler-decisions-and-session-documentation.md).

## What Changed

Official upstream main was merged while retaining the fork's formula/rollup
backend, SELECT formulas, LATEST rollups and multi-level lookup behavior. The
integration reconciled selection, permission, OAuth and cache APIs. Upstream's
single-level lookup editing, filtering and sorting were retained.

Formula and rollup creation/editing controls were added to data-model settings:
choose the output field type, then **Value Source → Calculation**. Controls cover
the expression, related records, operation, optional filter and latest-record
ordering. `IS_COMPUTED_FIELDS_ENABLED` gates creation; existing calculations
remain editable with the flag off, and application-owned calculations are
read-only. Computed values are excluded from record-entry forms and write
payloads.

The initial textarea was replaced at the owner's request with upstream's
`ValidationRuleExpressionEditor`. The final integration includes:

- Syntax highlighting, field chips, field/function suggestions, keyboard
  insertion and function signatures/descriptions.
- Calculation mode using the fork's computed-expression grammar and supported
  functions, rather than condition-mode's boolean-result validation.
- Suggestions scoped to the current object or the rollup's related object,
  including composite and numeric currency subfields.
- Read-only editor support and disabled browser spellcheck.
- Keyboard handlers that stay current as suggestion selection changes.
- Scrolling confined to the active keyboard suggestion, avoiding jumps between
  multiple rollup editors.
- Refreshed metadata reaching both the form and editor without marking the form
  edited, dropping typed characters or overwriting a dirty draft.

Key source locations:

- [Computation form](../../packages/twenty-front/src/modules/settings/data-model/fields/forms/components/SettingsDataModelFieldComputationForm.tsx).
- [Shared expression editor](../../packages/twenty-front/src/modules/validation-rules/components/ValidationRuleExpressionEditor.tsx).
- [Calculation function help](../../packages/twenty-front/src/modules/validation-rules/constants/ComputedFieldFunctionDefinitions.ts).
- [Field edit page](../../packages/twenty-front/src/pages/settings/data-model/SettingsObjectFieldEdit.tsx).
- [Form regression tests](../../packages/twenty-front/src/modules/settings/data-model/fields/forms/components/__tests__/SettingsDataModelFieldComputationForm.test.tsx).

## Preview Established in This Session

The workspace preview is <https://fundlevel-w903.conductor.show/>. It requires
Conductor workspace access and belongs to this workspace, not the production
deployment. A local-only **Preview Formula** field was added to Companies for
review at `/settings/objects/companies/previewFormula`.

Production database and upload snapshots were copied into this cloud VM.
PostgreSQL 17 and Redis 6 run locally, and approximately 9.7 GB of uploads were
restored after checksum verification. Instance and workspace upgrades ran on
the restored database. Production's database and application were not upgraded
or deployed by this work.

The backend listens on port 3000. The final optimized frontend is served on port
3004 from `.context/preview-build-final`, with API proxying to the backend.
Native services were used because the environment did not provide a usable
Docker daemon. The optimized frontend replaced the slow initial development
server.

Runtime URLs and database/Redis/storage settings point at the clone; database
configuration overrides and copied custom-domain redirects were disabled.
Background workers remain stopped. Email logs locally, and OAuth providers,
billing, telemetry and marketplace synchronization were disabled for this
preview. Worker-dependent features are therefore limited.

Temporary production export files and download keys were removed. Runtime
configuration remains in ignored `.env` files, uploads in
`.context/preview-storage`, and preview sign-in details in an ignored private
file. No credentials or customer records belong in this handoff.

These are the results of this session's preview setup. No reusable preview
skill was created, as requested.

## Verification

The upstream merge was checked with current shared/UI builds, direct server and
frontend typechecks, relevant server/shared/frontend tests, lint and formatting.
The initial development setup could not run the database integration suites;
the later restored preview supplied live application verification.

Final expression-editor checks:

- 104 tests across 18 suites passed, covering calculation forms and existing
  validation-rule utilities.
- Direct frontend typecheck, type-aware lint, formatting and optimized build
  passed.
- Browser checks passed for keyboard completion, field-chip insertion, function
  help, light/dark rendering, the exact saved expression after reload, calculated
  results on ten cloned company records, and stable rollup-editor scrolling.
- The final browser run reported no page errors; `/healthz` returned `ok`.

Useful commands from that verification:

```bash
yarn jest packages/twenty-front/src/modules/settings/data-model/fields/forms/components/__tests__/SettingsDataModelFieldComputationForm.test.tsx packages/twenty-front/src/modules/validation-rules/utils/__tests__ --config=packages/twenty-front/jest.config.mjs --runInBand

cd packages/twenty-front
GOMEMLIMIT=5GiB GOGC=50 ../../node_modules/.bin/tsgo -p tsconfig.json --noEmit
```

The Go heap settings allowed the native typechecker to finish within this VM's
memory budget. Lingui extraction needed `--workers 1` to avoid a worker startup
timeout on Node 26. The preview's English messages were extracted/compiled
locally for the optimized build; generated catalog changes were restored per
repository policy. A fresh production build must include the normal catalog
extraction/compilation so the new controls do not display message IDs.

Workspace-local evidence, which is gitignored and not available in a fresh
clone, includes `.context/expression-editor-*.log`,
`.context/formula-editor-light.png`, `.context/formula-editor-dark.png` and
`.context/preview-run.md`.

## Remaining Work and Limits

- The fork-main merge and production deployment remain pending; local commits
  and a preview are not evidence that either happened.
- Regular stored fields cannot be converted to computations under the current
  server invariant. Create a new computed field instead.
- Multi-level lookup columns retain fork read-only behavior; upstream editing,
  filtering and sorting integration is for single-level lookups.
- The final calculation editor does not expose validation-rule-specific Ask AI
  behavior or unsupported condition-only functions.
- Hindsight was unavailable because this workspace lacked its private profile;
  no new remote-memory retention was claimed.

## Documentation Setup Added After Implementation

The shared [decisions skill](../../.agents/skills/decisions/SKILL.md) and
[Ruler documentation rules](../../.ruler/documentation.md) adapt the conventions
in `fundlevel-digital/mono` and `fundlevel-digital/sunny`. Run `yarn ruler:apply`
after editing `.ruler/*.md`. The existing `AGENTS.md → CLAUDE.md` link remains,
existing skills remain in place, and Ruler does not manage MCP configuration.
