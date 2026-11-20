# Handoff: Fundlevel dashboard and derived attributes

Session "Twenty - Fundlevel Dashboard", 2026-11-17 → 2026-11-20, continued in
Conductor workspace `kathmandu`, branch `dashboard--attribute-improvements`.
The latest continuation below supersedes historical stopping points.

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

## Latest continuation — clickable contacts, Production Status and Title Case

Source is committed on `dashboard--attribute-improvements` and pushed to `org`;
no main-branch merge or branch rename was performed by this continuation.

Verified 2026-11-20. Both PostHog Q4 dashboard tables now have a canonical native
**Point of Contact** Person relation and the Production **Status** select column.
The earlier plain-text Point of Contact helpers remain as **Point of Contact Name**,
hidden in these tables. Existing deal and terminal-state filters are preserved:
exclude PUBLISHED and FAILED_CANCELED, retain blank statuses (17 of 20 deal rows).

- The CRM-only Last Contact Extras companion is now **0.3.0**, with six functions.
  It owns Person Messages in a Row, Influencer `lastContactPerson` and Production
  `pointOfContact`, plus the reverse Person relations. It selects the latest
  contacted linked Person, ties by descending Influencer Contact ID. Contact-link
  events, Person `lastContactAt` updates, Production creation/reassignment and a
  daily 06:30 UTC reconciliation keep the native relations current.
- Independent read-only SQL verified all 479 Influencer contact selections and all
  59 Production contact IDs, with zero mismatches. Fresh API reads resolved every
  populated Production relation to its Person record. This uses the standard
  Person record chip/navigation; browser verification remains unavailable because
  the configured Google Chrome executable is missing.
- The owner explicitly approved renaming audited field labels and requested Title
  Case going forward. This standing preference is in `CLAUDE.md` and `DESIGN.md`.
  English workspace `translations` overrides preserve application ownership and
  upstream field definitions. API identifiers, field types, activation and customer
  content are unchanged. Shared polymorphic backing fields inherit the Title Case
  version of their original UI head's label, preserving the UI's wording.
- Final fresh-read verification: **642 of 649** audited definitions are Title
  Case, including **all 285** definitions visible in saved views. All 1,893
  original fields retain their API name, type, activation and application owner.
  Seven hidden system fields reject label-only updates because their existing
  non-nullable schema has no default: Access Group `groupHash`; Record Share
  `objectMetadataId`, `principalType`, `rowCause`; Short Link `authoredTemplateUrl`,
  `resolvedDestinationUrl`, `templateAndResolvedUrlHash`. Their schema/defaults
  were deliberately left unchanged. Unrelated fields added concurrently by another
  agent were outside the original approved audit and were not edited.
- The updated audit artifact compares original and verified current labels:
  `628f3643-70d4-4bb5-96cd-89ef2df6194c`, version 2. Final metadata reads also
  confirmed canonical Person and Status columns and the preserved filter trees.
- Metadata editing exposed two engine bugs, fixed and pushed to `org` on this
  feature branch: `69a5ca26d5` loads owners of dependent computed fields during
  validation; `33b168b815` allows workspace display translations on system fields
  while retaining restrictions on their base schema. Seven targeted tests pass.
- The feature build queued on Boat was canceled. GHCR rejected publishing the
  derived image with `permission_denied`; no credentials were changed. Claudy runs
  the **local-only** image
  `fundlevel-twenty:33b168b815c67cbf0012a644555e410bd57cf934-metadata`, based on
  `d99c9e143fc852a646d5a6c219bf8ab03f43859f`, with the three compiled metadata
  modules overlaid. Both compose image references point to it. Server is healthy,
  worker runs and `/healthz` returns 200. This image is NOT in GHCR: publish a full
  standard build of this branch before recreating the deployment on another host.
  The build workflow now tags `main` only for main-branch builds.
- Companion validation: 16 unit tests pass, standalone capped typecheck passes,
  lint reports zero errors/warnings. The public Last contact directory is restored
  to `origin/main`; its marketplace registration and upstream update path remain
  intact. Earlier claims of three installed workspaces were corrected above.
- Hindsight remains unavailable because this Mac lacks the scoped private profile.
  Durable owner preference and verified operational findings are retained here;
  no central-memory retention is claimed. No backups, pg_dumps or SQL writes.

## Continuation — 2026-11-20, CRM-only companion

The owner chose a **CRM-only companion app**, preserving the marketplace Last
contact registration and upstream updates. This supersedes the installation
choice and deployment instructions in the previous stopping point below.

- Implemented `packages/twenty-apps/internal/last-contact-extras` (version 0.1.0),
  installed as **Last contact extras**. Application universal identifier
  `ac1d4cf8-7f02-4f2f-8edb-9459250feb1f`, installed application id
  `d0880d27-d262-4b73-b1b7-21766d93a392`, owned by the CRM workspace.
- The new Person field is `lastSenderStreak`, label **Messages in a row**, universal
  identifier `166dbef6-83ad-4f96-8700-ebb1f01e3b65`. The earlier Last contact patch
  was removed from the marketplace app source; that directory now matches `origin/main`.
- The companion reads emails and participants and updates People only. Its role
  cannot create or delete records. Participant changes refresh both former and
  current people and all people on the affected messages; message creation,
  deletion, date and draft-state changes also refresh counts. A 06:00 UTC daily
  reconciliation runs in queued batches of up to 50 email-linked people.
- Counts follow inbound/outbound **sides**, matching Last contact, rather than
  individual sender identities within a side. Drafts, undated messages, meetings
  and duplicate recipient rows are excluded. Dates order messages and descending
  message IDs break ties. Empty history gives null; 50 means 50 or more.
- **Correction:** live read-only SQL found only one Last contact installation,
  in CRM, at marketplace version 1.12.0. The earlier claim that it is installed
  in all three workspaces was not supported by the live data. Its registration
  remains unclaimed and its source remains npm; neither was changed.
- Deployed engine image `d99c9e143fc852a646d5a6c219bf8ab03f43859f` to server and
  worker on claudy. Both run; server is healthy and `/healthz` returns 200.
- Created Influencer `followUpStreak` (field id
  `4141364f-192c-4f05-8bc7-be17a019fb23`), NUMBER, LATEST over `contactLinks`,
  expression `person.lastSenderStreak`, orderBy `person.lastContactAt`.
- Created Production `creatorFollowUpStreak` (field id
  `7b9b9ffb-2007-472f-9a47-0edf4eb5d0e8`), NUMBER, formula
  `influencer.followUpStreak`. Both labels are **Messages in a row**.
- Verified visible canonical columns in 11 views: the named People, Influencer
  and Production views, their default views and record fields, and the PostHog
  Q4 Influencers and Creators dashboard tables.
- Verification: all 12 companion unit tests pass, standalone capped typecheck
  passes, lint is clean. All three deployed functions executed successfully.
  Live filtering and sorting on both rollups works; all 59 Production formulas
  match their related Influencer values. The server remains healthy (HTTP 200).
- Started the full backfill with `app exec --name backfill-email-streaks`.
  It discovers people through Message Participants instead of scanning all
  18,718 People. Independent SQL finds 1,022 people with valid email history;
  all 1,022 now have populated values, with **zero mismatches** against the
  independent SQL calculation (verified 2026-11-20 at approximately 17:39 UTC).
  To finish the initial population quickly, remaining null counts were grouped
  by the independent SQL result and updated through the normal GraphQL
  `updatePeople` API in batches of at most 100, only where the count was still
  null. No SQL writes were used. The companion's queued reconciliation pass
  remains active, checking already-filled values and skipping unchanged writes.
- Final comparison: all **479 Influencer rollups** match an independent SQL
  selection of the most recently contacted point of contact (ties by contact
  link ID), and all **59 Production formulas** match their Influencer. No
  remaining field population or configuration work is required.
- Browser verification is unavailable because the Playwright browser expects a
  missing Google Chrome installation; column persistence and values were checked
  through fresh API reads. Hindsight recall/retention is unavailable on this Mac
  because the scoped private profile is missing; no Hindsight write was attempted.

The source changes and this updated handoff are local and uncommitted; no
branch was renamed, merged or pushed during this continuation. The task relation
filter, dashboard relation grouping, editor save bug and upstream merge remain
separate open work. No backup or pg_dump was taken.

## Dashboard contact names, active statuses and naming audit — 2026-11-20

Owner asked to show the point of contact in the PostHog Q4 dashboard tables and
exclude terminal Productions. Configured both the Influencers widget view
`ff5668b9-efb3-4358-9953-61df39f85eb5` and Creators table view
`7c75c821-493a-416a-97dd-2db822737d3d` through the metadata API.

- Influencer `lastContactPersonName`, TEXT, label **Point of Contact**, field id
  `66e2035e-023c-4d82-bf52-1ca8e12a03ad`. LATEST over `contactLinks`, ordered by
  `person.lastContactAt`, reads the person's first and last name, omitting a
  separator when either part is empty. Uses the same contact selection and tie
  break as Messages in a row. No contacted linked person means an empty display.
- Production `creatorPointOfContact`, TEXT, label **Point of Contact**, field id
  `1eaa3805-5a5a-4b34-8641-fefe59c98f6a`, formula
  `influencer.lastContactPersonName`. This displays a name, not a relation chip.
  Added it after Influencer in the Influencers widget and near the front of the
  Creators table.
- Both views retain their deal filter and now use an AND root with a nested OR:
  Status IS_NOT `["PUBLISHED","FAILED_CANCELED"]` OR Status IS_EMPTY. This excludes
  only the two terminal options while retaining productions without a status.
- Read-only SQL verified 20 productions for the selected deal, 3 terminal and
  17 remaining. API results match: no terminal rows; all 17 show a contact name.
  Saved column visibility and filter group structure were re-read and verified.
  Independent SQL contact selection matches all 479 Influencer name displays
  (null and empty are equivalent for a blank text display).
- Owner also asked which UI field labels are not in Title Case. Audited the
  English metadata API display labels: 1,893 definitions across 70 objects before
  adding the two already-capitalized Point of Contact fields. Found 285 flagged
  definitions visible in saved views, representing 87 distinct labels. The full
  report includes hidden and internal fields separately. Connector words,
  acronyms, brands, plural `(s)` and units such as `60d` are preserved.
- No existing field labels were renamed. This was an audit request, not a bulk
  rename instruction. The report includes the companion's own `Messages in a
  row` label (proposed `Messages in a Row`).
- Published Conductor artifact `628f3643-70d4-4bb5-96cd-89ef2df6194c`, version 1,
  from `.context/artifacts/field-label-audit/`, without warnings. Raw audit data
  and verification scripts are in `.context/`. The artifact contains metadata
  only, no customer CRM records. Hindsight remains unavailable on this Mac.

## Previous stopping point (superseded by the continuation above)


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
2. **LATEST rollup (engine) is committed and on `main` (`d99c9e143f`), but not deployed.** Its Boat build
   (run 44773859653) **succeeded**, and the image is ready. Then:
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
