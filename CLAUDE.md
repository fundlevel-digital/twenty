

<!-- Source: .ruler/00-twenty.md -->

# CLAUDE.md

Twenty is an open-source CRM — an Nx / Yarn 4 monorepo. Main packages: `twenty-front` (React 18, Jotai, Linaria, Vite), `twenty-server` (NestJS, TypeORM, PostgreSQL, Redis, GraphQL), `twenty-shared` (isomorphic types/utils), `twenty-ui`, `twenty-sdk` (application definitions and runtime), `twenty-cli` (standalone CLI), `twenty-e2e-testing` (Playwright).

Match the surrounding code — the adjacent files in the directory you are editing beat any written rule, including for file naming, which varies by area. For product UI usage, `DESIGN.md` takes precedence over older screens; code remains the source of truth for values and component APIs.

## House rules

Where this repo differs from your defaults:

- Short-form `//` comments, never JSDoc blocks; comment only WHY (a constraint the code cannot express, still true for a reader who never saw your change), never WHAT.
- Types over interfaces (except when extending third-party interfaces); string literals over enums (except GraphQL enums); no `any`; descriptive generics (`TData`, not `T`).
- Named exports only. Functional components only.
- Prefer event handlers over `useEffect` for state updates.
- No abbreviations in names (`fieldMetadata`, not `fm`); constants in SCREAMING_SNAKE_CASE; component props types suffixed `Props`.
- Use existing guards and helpers before writing your own: `isDefined`, `isNonEmptyArray`, `isPlainObject`, … from `twenty-shared/utils`; `isNonEmptyString`, `isString`, `isNull`, `isObject`, … from `@sniptt/guards`. Reimplementing an existing util is the most common AI-authored defect here.
- Lingui for user-facing strings, `doNotTranslate()` from `twenty-shared/i18n` for text that must stay as written (error diagnostics, protocol tokens); Linaria (zero-runtime, styled-components pattern) for twenty-front styling.
- Owner preference: use Title Case for UI labels and titles, including fields, columns, objects, views and actions; see the Copy section of `DESIGN.md`. Keep API identifiers and customer-entered content unchanged.
- Before building or changing UI in `twenty-front` or `twenty-ui`, read `DESIGN.md` at the repo root.
- For Twenty product concepts, consult `packages/twenty-ui/src/icon/icon-dictionary.md` and use the canonical icon.
- Import icons from `twenty-ui/icon`, never directly from `@tabler/icons-react`; action and status concepts should use their action or status icons.
- Test behavior, not implementation: query by user-visible text/roles, `@testing-library/user-event` for interactions.

## Comment sparingly

Most code is self-explanatory and a comment on it is just noise — cognitive overhead to read and maintenance debt to keep accurate. Only comment code that is genuinely unintuitive or complex: a non-obvious why , a workaround, a subtle invariant, a deliberate deviation from the obvious approach. Do not narrate what the code does — the code already says that. When a comment truly earns its place, keep it as terse as possible. This overrides matching the surrounding file's comment density. Write lean even in a verbose file.

Two or three lines, and a hard ceiling of five. "Terse" is not relative: much of this repo predates the rule and carries paragraph-length comments, so a file you are editing is not evidence of the standard — it is usually the thing the rule exists to stop spreading. If the why will not fit in five lines, the explanation belongs in a module docstring, a README or an ADR, and the comment is one line pointing there.

The same ceiling applies to a comment's neighbours: do not restate one fact in the Dockerfile, the manifest and the code that reads it. Put it once, where a reader hits it first, and let the others be silent.

Docstrings carry the what and the design; they are not exempt from terseness, but they are the right home for anything a comment is too small to hold.

## Commands

```bash
bash packages/twenty-utils/setup-dev-env.sh   # Postgres/Redis + DB init; only for tasks needing a running app
yarn start                                    # front + server + worker

npx jest path/to/file.spec.ts --config=packages/<pkg>/jest.config.mjs   # single test file (preferred)
npx vitest run --root packages/twenty-ui --project unit <file>          # twenty-ui runs on vitest, not jest
npx nx test twenty-server                     # package unit tests (same for twenty-front, ...)
npx nx run twenty-server:test:integration:with-db-reset
npx nx storybook:build twenty-front && npx nx storybook:test twenty-front

npx nx lint:diff-with-main twenty-server      # diff-based lint (fast; add --configuration=fix); run with typecheck after changes
npx nx fmt <pkg>                              # format
npx nx build twenty-shared                    # required before building/testing packages that depend on it
npx nx database:reset twenty-server
npx nx run twenty-front:graphql:generate      # after GraphQL schema changes (--configuration=metadata for metadata schema)
```

## Gotchas

- **`twenty-shared/dist` is per-branch state nothing tracks.** After switching branches or editing `twenty-shared`, run `npx nx build twenty-shared --skip-nx-cache` before trusting any typecheck or test failure in a dependent package.
- **Nx caching can serve a stale pass.** To verify a fix, run `npx tsgo -p tsconfig.json --noEmit` in the package directly rather than `nx typecheck`.
- **Do not commit translation catalogs unless translations are the task.** `lingui extract`/`compile` regenerate `packages/twenty-server/src/engine/core-modules/i18n/locales/*.po` and `locales/generated/*` with thousands of lines of churn as a side effect of touching any `msg` string. The i18n pipeline maintains them; leave them out of your commit.
- **Commit messages must not carry AI attribution.** CI rejects commits containing `@anthropic.com` co-author trailers or "Generated with Claude Code" lines.
- **Upgrade commands** (`packages/twenty-server/src/database/commands/upgrade-version-command/`): add or edit files only under the current `TWENTY_CURRENT_VERSION` directory, with a real epoch-ms timestamp strictly greater than every existing one in that directory — CI enforces both, and the upgrade cursor silently skips a command that sorts before an already-applied one. Instance commands implement `up` and `down`; workspace commands only implement `runOnWorkspace`, since nothing ever runs a `down` on them. Never rewrite committed command logic. Keep command-only helpers and constants in the version folder, never in runtime modules, and never make runtime code branch on migration state. See `packages/twenty-server/docs/UPGRADE_COMMANDS.md`.
- **Entity file changes need a generated instance command**: `npx nx run twenty-server:database:migrate:generate --name <name> --type <fast|slow>` (slow = adds a data-backfill step).
- A read-only Postgres MCP server is configured in `.mcp.json` for inspecting workspace data, metadata, and migration results. Writes go through the CLI commands above.
- E2E login: click "Continue with Email" and use the prefilled credentials.

## Engineering memory

Use the [Hindsight memory skill](.agents/skills/hindsight-memory/SKILL.md)
proactively for every substantial repository task. Recall relevant prior choices,
known fixes and owner preferences before planning or changing code, and after a
context handoff. Before the final handoff, retain new verified decisions, fixes
and durable owner corrections with dates, source and verification. Do not wait
for the user to ask or repeat instructions. Skip trivial edits and repetitive
status; keep credentials and customer CRM records out of memory.

Use only `twenty-crm-self-host`. Verify recalled claims against current source
and deployment evidence. If memory is unavailable, report a safe status and
continue independent work. Connection details and CLI fallback are in the
[memory runbook](packages/twenty-docker/operations/hindsight-memory.md).



<!-- Source: .ruler/10-authoring.md -->

# Authoring Agent Rules and Skills

Root rules are generated by Ruler from `.ruler/*.md`. Edit these sources, then
run `yarn ruler:apply`. Do not hand-edit the generated `CLAUDE.md`; the existing
`AGENTS.md` symlink shares it with Codex, Cursor, Pi and OpenCode. Existing Twenty
rules live in `.ruler/00-twenty.md` and retain their precedence for engineering.
Ruler is pinned in `package.json`; local-only generation ignores global rules.

Skills have a separate canonical source: `.agents/skills/<name>/SKILL.md`.
Claude and Pi use relative symlinks from `.claude/skills/<name>` and
`.pi/skills/<name>`. Codex, Cursor and OpenCode read the canonical directory.
Edit the canonical skill, not an alias. Skill edits do not need Ruler generation.
Ruler's experimental skills propagation is disabled to preserve this layout and
Twenty's existing skills. New skills should follow the same source/alias pattern.

MCP generation is deliberately disabled for this setup. Existing `.mcp.json`,
`.codex/config.toml` and `.claude/settings.json` keep their current ownership and
configuration. This documentation setup does not import another repository's
MCP services, credentials, runtime configuration, or deployment permissions.

`CLAUDE.md` remains tracked here so repository instructions are present in a
fresh checkout before installing tools. Commit regenerated rules with their
sources. Run Ruler again and check that it produces no additional diff.

This guide follows `fundlevel-digital/mono`'s `.ruler/authoring.md` at
`94038532154c12f58e51e01a99a0769d1a169f6e`, adapted to Twenty's existing
`AGENTS.md` symlink, Yarn workflow, tracked instructions and MCP ownership.



<!-- Source: .ruler/20-decisions.md -->

# Decision Records

Before substantial work, read `docs/DECISIONS.md` and the relevant area's index.
Use the [decisions skill](.agents/skills/decisions/SKILL.md) when Kareem settles,
corrects, rejects or reverses a choice, or when documenting an earlier exchange.
Record his exact words and distinguish his decisions from agent assumptions.

All records and area indexes live under root `docs/decisions/`. PlusVibe's index
is `docs/decisions/packages/twenty-apps/public/plusvibe/DECISIONS.md`. Current
operation and implementation instructions remain in the consuming package's
README; decision records explain why and preserve the exchange.

Accepted records are append-only except for a status change linking to a new
superseding record. Preserve local numbering and link related decisions instead
of duplicating them. Include evidence and separate implemented, tested, merged
and deployed states. Never imply production approval from a preview request.
Keep credentials and customer contact records out of the audit trail.
