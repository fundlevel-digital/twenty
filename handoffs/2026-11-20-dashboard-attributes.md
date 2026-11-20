# Handoff: Fundlevel dashboard and derived attributes

Session "Twenty - Fundlevel Dashboard", 2026-11-17 → 2026-11-20. Worktree
`.claude/worktrees/enchanted-prancing-duckling`. This branch, `dashboard-attributes`, holds everything below
plus one commit not on `main` (the Last contact change, see "Left off").

## What this fork is about

Fundlevel runs a forked Twenty CRM (fork: github.com/fundlevel-digital/twenty, git remote `org`; mirror
kareem717/twenty, remote `origin`). This line of work is about the **Fulfillment dashboard** and the **derived
attributes** behind it: who owes whom a reply, contract and payment status per production, follow-up counts,
YouTube metrics, and the engine changes in Twenty needed to show and group by them.

- Live CRM: https://crm.fundlevel.co (workspace subdomain `crm`, id `3b424be9-f8da-41b6-b564-16c9da2df4e1`,
  DB schema `workspace_3iaq1z1s1jv5ol6qhlcwulwbl`). API/server URL: https://crm-login.fundlevel.co.
- Host: `ssh claudy`, deploy dir `/mnt/storage/twenty-crm`, compose project `fundlevel-twenty-trial`.
- Fulfillment dashboard: https://crm.fundlevel.co/object/dashboard/c5715902-b655-4ffe-bf95-6e686dde9a0b
  (tabs "Overview" and "PostHog Q4"; PostHog Q4 deal/opportunity id `754e5600-3db9-534c-a310-c2b9df28edf6`).

## Left off here (do these first)

1. **Last contact "Messages in a row" is built but NOT deployed.** Commit `c795bb4284`, only on this branch.
   - Adds Person field `lastSenderStreak`, label "Messages in a row": the number of consecutive emails from
     whoever sent the latest email to or from that person (meetings excluded, capped at 50). Example: they reply → 1,
     we reply → 1, we follow up → 2, again → 3, they reply → 1. Recomputed when emails are linked, and in the backfill.
   - Files: `packages/twenty-apps/public/last-contact/src/{fields/last-sender-streak.field.ts,
     utils/compute-last-sender-streak.ts, utils/collect-last-sender-streaks.ts, ...}`. Field universal id
     `6b6f0401-2370-41e7-b3a3-da0ad5713da9`. Unit tests pass.
   - **Blocked on an owner decision.** `app apply` failed: "registered on this instance but claimed by no workspace".
     Last contact is a pre-installed npm marketplace app (`@twentyhq/last-contact`, registration
     `78889f06-ea85-4e59-920e-4b784639f0b5`, no owning workspace) installed on all 3 workspaces (crm, sunny,
     schedulerzero). Upstream already released its own 1.12.0, and the commit also bumps to 1.12.0, which collides.
   - Options put to the owner (unanswered when the session ended):
     - (a) **Recommended:** ship it as a small companion app owned by the crm workspace ("Last contact extras").
       Same field and logic; Last contact keeps getting upstream updates; the other workspaces are untouched.
     - (b) Claim the shared registration for crm via metadata mutation
       `claimApplicationRegistrationOwnership(applicationRegistrationId: "78889f06-...")`, bump to a
       non-colliding version, then `npx -y twenty@2.59.0 --no-input app apply --no-prune` from the app folder.
       Upstream updates would stop arriving automatically, and sunny/schedulerzero may be affected.
   - The owner wanted it to be "part of the last contact app". Ask before claiming anything.
   - After deploy: the backfill does NOT run on `app apply`. Trigger it from Settings → Last contact → "Trigger backfill".
2. **LATEST rollup (engine) is committed and on `main` (`d99c9e143f`), but not deployed.** A Boat build
   (run 44773859653) was in progress at the end. Then:
   1. Deploy it: `ssh claudy`, `docker pull ghcr.io/fundlevel-digital/twenty:<full sha>`, set the image on lines 4
      and 65 of `/mnt/storage/twenty-crm/docker-compose.yml`, `docker compose up -d server worker`, and wait for
      `https://crm.fundlevel.co/healthz` to return 200.
   2. Then create Influencer field `followUpStreak` (label "Messages in a row"):
      `{kind: 'ROLLUP', relationFieldName: 'contactLinks', operation: 'LATEST', expression: 'person.lastSenderStreak',
      orderBy: 'person.lastContactAt'}`. Requires the Person field from item 1, or the field in the companion app.
      The owner's rule is "the most recently contacted point of contact"; 122 of 425 influencers have more than one contact.
   3. Production field `creatorFollowUpStreak` = FORMULA `influencer.followUpStreak`.
   4. Add both columns to the Influencers widget and the PostHog Q4 table.
   - LATEST SQL is `(ARRAY_AGG(expr ORDER BY orderBy DESC, id DESC) FILTER (WHERE orderBy IS NOT NULL))[1]`.
     It's unit-tested but has not yet run on a real database.
3. **Still open, requested by the owner:**
   - **Tasks "Related to" filter.** View filters only allow many-to-one relations (front:
     `packages/twenty-front/src/modules/object-metadata/utils/isFieldMetadataItemFilterable.ts`). `taskTargets` is
     a one-to-many junction (morph). Needs a filter-engine change; upstream has the same limit.
   - **Grouping by a relation inside dashboard table widgets** shows only an empty "No Value" group (tried on
     "All PostHog Q4 creators" grouped by influencer, then reverted). Works on normal list views. The owner wants
     productions grouped by influencer there.
   - **Dashboard editor save bug:** the "Tasks" kanban widget (created 2026-11-20 15:20 UTC) was saved with
     zero view fields, so it rendered blank after reload. I re-added the fields by API (title, body, due date,
     notes, status, agent identifier). Root cause not investigated.
4. **Upstream merge pending.** The fork is about 317 commits behind twentyhq main (2.61, unreleased). A trial
   merge gave 55 conflicts, mostly lookup columns (upstream merged #30439 one-hop lookups and #30450 differently
   from our multi-level version), the OAuth fix (upstream #30603 replaces ours, `f211664c4d`), generated GraphQL
   types and query runners.
   - Recommended: merge once 2.61 is released, on a separate branch.
   - Computed fields are still fork-only upstream, and every engine change in this session adds to the merge.

## Shipped this session (all on `main` unless noted)

| Commit | What | Deployed |
|---|---|---|
| `e8d33cb03d` | LinkedIn app: proxy and country at Unipile sign-in; chat list paged at 25 | yes (app apply) |
| `f211664c4d` | App OAuth callback forwarded to the workspace host (Fathom fix) | yes |
| `edbcbeac32` | Multi-level lookup columns (`viewField.relationPathFieldMetadataIds`, at most 5 hops, one one-to-many) | yes |
| `f3955b2930` | `.github/workflows/fundlevel-build.yaml`: image build on Boat on push to main → `ghcr.io/fundlevel-digital/twenty:<sha>` | yes |
| `0c66619c07` | Validation loads apps that own lookup path hops (`person.lastEmail` from "Last contact") | yes |
| `91e6edbf31` | YouTube Analytics app (`packages/twenty-apps/internal/youtube-analytics`) | yes (app apply) |
| `7400779e54` | Computed FORMULA fields may be SELECT with options, so they can be grouped, filtered and charted | yes (image `7400779e54…`, running now) |
| `d99c9e143f` | LATEST rollup with `orderBy` | **built, not deployed** |
| `c795bb4284` | Last contact "Messages in a row" | **this branch only, not deployed** |

## Workspace configuration done through the API (no code)

- Deleted Production fields: nextAction, waitingOn (select), contractStatus (old select), creatorPaymentStatus
  (old), and sourceAttioRecordId on all 7 objects. Deleted the "Whose turn" pie chart.
- Contract → **Status** select (DRAFT / SENT / SIGNED / CANCELLED), id `0b955957-...`. All 51 contracts are blank;
  the owner fills them in.
- New computed fields. All selects are FORMULA computed selects.

  | Object | Field | Label / purpose |
  |---|---|---|
  | Influencer | `replyStatus` | "Waiting On": US / THEM / NO_CONTACT, from lastInboundAt/lastOutboundAt |
  | Production | `creatorReplyStatus` | "Waiting On": `influencer.replyStatus` |
  | Production | `contractStatusRank` | helper: MAX over contractLinks of a rank (4 signed, 3 sent, 2 draft, 1 cancelled, 0 not set) |
  | Production | `contractStatus` | "Contract Status": NO_CONTRACT / NOT_SET / DRAFT / SENT / SIGNED / CANCELLED |
  | Production | `creatorPaymentMinRank`, `creatorPaymentMaxRank` | helpers: MIN/MAX over transactionLinks, filter PAYABLE, rank 1 outstanding, 2 completed, 3 refunded |
  | Production | `creatorPaymentStatus` | "Creator Payment": NOT_SET_UP / OUTSTANDING / PARTLY_PAID / PAID / REFUNDED |
  | Production | `clientInvoiceMinRank`, `clientInvoiceMaxRank`, `clientInvoiceStatus` | "Client Invoice": same as Creator Payment, for RECEIVABLE |

  - The helper rank fields are hidden in views. Don't delete them.
  - Verified: payment statuses match an independent SQL calculation for all 28 productions with transactions.
    Filters (`eq`, `in`, `neq`) and `productionsGroupBy` work.
  - Field definitions generator: scratchpad `make-status-fields.py` (may be gone).
- Old text "Waiting On" fields (influencer.waitingOn, production.creatorWaitingOn) were relabelled
  "Waiting On (old)" and hidden in views. The owner may want them deleted; ask.
- Dashboard, PostHog Q4 tab:
  - New **Influencers** widget (`78992990-...`, view `ff5668b9-efb3-4358-9953-61df39f85eb5`). It shows the
    deal's productions grouped by Waiting On, with columns name, influencer, Waiting On, last
    inbound/outbound/contact and booking status.
  - "All PostHog Q4 creators" (view `7c75c821-...`) got the 4 status columns and is sorted by the new Waiting On.
    It is not grouped.
  - Widgets were moved: Influencers at row 6, creators table at row 16, Tasks at row 26.
- Restored an email thread that had been soft-deleted (Cole Medin, `5ffc3313-...`). Who deleted it is unknown;
  suspect an API agent (OpenBot / Grok Bot / Treg keys).

## How things work (gotchas)

- **Deploy:**
  1. Push to `org` main; Boat builds in about 17 minutes. Check with `gh run list -R fundlevel-digital/twenty`.
  2. Pull on claudy. It's logged in to ghcr as kareem717.
  3. Swap the image on docker-compose lines 4 and 65.
  4. Run `docker compose up -d server worker`.
- **Never take backups/pg_dumps on claudy.** No AI attribution in commits.
- **Upgrade cursor gotcha:** within a version, instance commands sort before workspace commands, so fork-added
  instance commands can be skipped. Apply by hand and record back-dated `core."upgradeMigration"` rows. See
  memory `claudy-twenty-deployment.md`.
- **Metadata API from the CLI:** `npx -y twenty@2.59.0 --no-input api graphql --metadata --query ... --variables @file.json`
  (remote `fundlevel`; the token refreshes itself). JSON-typed inputs such as widget `position` need variables,
  not inline literals.
- **SQL:**
  `ssh claudy "cd /mnt/storage/twenty-crm && docker compose exec -T db psql -U postgres -d default"`.
  Custom-object tables are `_name` (e.g. `_production`).
- **Computed fields:** results can be NUMBER/TEXT/BOOLEAN/DATE/DATE_TIME/SELECT (formula only). Rollups:
  COUNT/SUM/AVG/MIN/MAX/LATEST, with optional `filter`. Bindings fill themselves. The equality operator is `==`.
  Selects sort alphabetically. Kanban drag on a computed select is rejected by the server.
- **Dashboard widgets:** create the view first (`createView` type TABLE_WIDGET), then `createPageLayoutWidget` with
  `configuration.viewId`, then add view fields/filters/sorts.
- **Owner's Mac (16 GB):** no full typechecks, nx or Docker locally. Use single-file jest with `--runInBand`, and
  the capped tsgo script (`GOMAXPROCS=1 GOMEMLIMIT=3GiB nice -n 15 --singleThreaded`, watchdog kill at 5 GB, a
  temporary tsconfig listing only the changed files).
- YouTube Analytics app: daily at 05:00 UTC, plus a "Refresh YouTube analytics" record action. YouTube calls go
  through treg tools `yt-key-fundlevel-internal` and `yt-key-scheduler-zero` (app secret TREG_TOKEN = treg
  agent `youtube-analytics-twenty`). The old Cloudflare worker's cron was removed, but its wrangler.jsonc in the
  fundlevel repo still declares one.
- An earlier general handoff exists at `/Users/kareem/dev/projects/twenty/handoff.md` (written 2026-11-19, not
  committed).
