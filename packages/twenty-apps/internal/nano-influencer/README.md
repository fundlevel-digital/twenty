# NanoInfluencer

Native Twenty lists, creators, saved/hidden memberships and lookalike discovery.
Calls NanoInfluencer directly using the protocol implemented in Creator Eagle;
it does not require Creator Eagle's server, database, MCP or job runtime.

## Setup

Install into Twenty 2.59.0 or later. In **Settings → Applications →
NanoInfluencer**, add each account separately under **NanoInfluencer API
Connections**. Use the raw value of Nano's `__Secure-next-auth.session-token`
cookie as the API key. These are encrypted native workspace connections, like
YouTube Analytics; add, replace and disconnect them individually. Use one
connection per Nano account and replace its token when the session expires.

Profile enrichment rotates connections within a batch, skips duplicate tokens
and connections with failed authentication, and can move past a 401/403/429 to
another usable credential. List sync, favourite/hide writes and search polling
stay pinned to their account. Equal project IDs across connections remain
separate lists. Native credentials take precedence over the deprecated legacy
application-variable token, which is used only when there are no native
connections. A missing pinned connection is an error; a different account is
never substituted for it.

Run **Sync All Nano Lists** from the command menu. Select individual **Nano
Lists** to run **Sync Nano Lists**. Automatic sync defaults to **Manual Only**.
Enable **Daily At 04:00 UTC** in **Settings → Apps → NanoInfluencer → Nano Sync**
to refresh projects, memberships, saved history and native groups while the server and worker are running. Each list exposes its sync status, error and last successful sync.
A connection that rejects list discovery is reported separately while usable
connections still queue their lists. Existing matched emails accept both plain
strings and Nano list responses containing `{ type, value }` objects. Nullable
country values are treated as unavailable. List jobs checkpoint completed creators and
resume after Twenty or Nano rate limiting; they do not reconcile memberships
until both saved and hidden feeds have been read completely.

## Records And Actions

- **Nano Creators**: one record per platform and Nano ID (YouTube, X,
  Instagram and TikTok), shared across lists. Stores available name, bio,
  country, subscribers, existing matched emails and related links.
- **Nano Lists**: Nano projects and their label names.
- **Nano Memberships**: creator/list relations, Favourite/Hidden/Removed state,
  labels and notes. Select memberships and run **Favourite in Nano**, **Hide in
  Nano** or **Remove From Nano List** to push state changes. These actions
  update Twenty after Nano confirms its response.
- Select up to 10 **Nano Creators** and run **Enrich With NanoInfluencer** to
  refresh the profile, audience size, bio, country and related links. A new
  record may start with just **Profile URL**. Identity lookup binds the result
  to that record and refuses to create a second record for an existing profile.
  Failed enrichments preserve prior values and expose **Enrichment Error**;
  successful runs set **Last Enriched At**. This does not match paid contacts or
  change list membership.
- Select up to 20 **Nano Creators** and run **Add to Nano List** to choose an
  existing synced list and favourite those creators in Nano.
- Select one **Nano Creator** and run **Find Nano Lookalikes**. Its **Nano
  Search** tracks the external job. **Nano Search Results** relate the search
  to imported creators, without automatically favouriting them.
- Select a search and run **Resume Nano Search** after a poll timeout or queue
  problem. This resumes the stored Nano job; it does not start another search.

Incoming sync reads every favourite page, then every hide page. It only marks
memberships missing from both feeds Removed after both reads finish. An error
retains existing creators and membership records. A failed run can be restarted
with Sync Nano Lists. Overlapping pulls supersede older queued runs. Imported
creator identities and membership keys are unique, so retried pages converge.

Twenty field edits alone do not send writes to Nano. Use the explicit commands
or workflow actions. A later pull reflects Nano's current state. Do not run a
list pull and outbound edits to that same list simultaneously: in-flight API
responses can race; pull again afterward to reconcile. Labels and notes import
from Nano; their outbound editing and project creation/renaming/deletion are
not implemented. Removal policies keep CRM records by default; the settings
described below enable recoverable removal of lists and memberships.

## Creator Data, People And Attribution

**Raw Nano List Data** retains each unmodified source creator snapshot. **Raw
Nano Profile** stores the full profile payload, and **Enrichment Results** keeps
its response envelope. **Related Links** remains Raw JSON. Unknown fields,
recent posts, short/long video arrays and analytics are preserved rather than
mapped to a fixed set of columns. The API does not promise exactly ten videos.
A list pull does not overwrite the richer profile/enrichment JSON. Failed
refreshes preserve the last successful results. Blank, masked and invalid email entries (including contact labels such as Twitter DM) are omitted
from the display array, while their source values remain in raw snapshots. An
empty Nano email result does not erase an existing non-empty email on the creator.

Nano images are imported asynchronously into a native **Avatar** Files field,
which supplies the record image. Downloads are limited to 2 MB and supported
image hosts. An unchanged stored image is reused; **Avatar Error** reports
failed imports without blocking creator or membership sync.

The creator **Person** relation can be assigned manually. Email matching searches
primary and additional emails, compares complete normalized addresses, and leaves
multiple matches unresolved. A manually assigned Person is preserved.

Workspace settings are native Selects:

| Preference | Options | Initial Value |
| --- | --- | --- |
| Person Auto-Creation | Don't Create, Only Favourites, Auto Create All | Don't Create |
| Removed Nano Entries | Keep In Twenty, Move Memberships To Trash | Keep In Twenty |
| Deleted Nano Lists | Keep In Twenty, Move To Trash | Keep In Twenty |
| Automatic Sync | Manual Only, Daily At 04:00 UTC | Manual Only |

Existing People are matched in every creation mode. Only Favourites creates a
Person only when an active favourite membership exists. Auto Create All also
permits creators without email addresses; no address is invented. Creation uses
a stable identity to recover concurrent attempts. Changes apply on subsequent
syncs; previously imported rows receive new snapshots/avatars/attribution when
refreshed.

Removal of missing memberships requires complete favourite and hide reads.
Missing lists are inferred only from a successful account project scan. Opt-in
list removal trashes the list and its memberships; shared creators and People
are preserved. Turning these options on does not authorize Nano-side deletion.

**Decision By**, **Decision Maker Email** and **Nano Operator ID** identify the
operator Nano returned for a membership. Raw membership and operator metadata
are retained. **List Owner** is an assignable Twenty workspace member: Nano's
project endpoint does not return a project owner, so it cannot be auto-filled
from that response.

## Workflow And Agent Actions

The same actions are authenticated HTTP routes under `/s/nano-influencer/`,
workflow actions and agent tools:

| Action / Route | Input | Result |
| --- | --- | --- |
| `sync` | Optional `listIds` (Twenty IDs), `connectionId`; omit to discover all projects in all connections | Number of queued lists |
| `find-lookalikes` | `creatorId`, optional `listId`, `connectionId`, `requestId`, `filters` | `searchId`, Nano `jobId`, status |
| `resume-search` | `searchId` | Status and imported `creatorIds` when available |
| `enrich-creators` | `creatorIds` (1–10) | Successful IDs and individual errors |
| `set-flags` | `listId`, `creatorIds` (1–20), `flag`: `fav`, `hide` or `del` | Successful IDs and individual failures |

`listId` on a search scopes Nano's existing hide filtering; it does not
favourite the results. Filters accept `subs`, `views` and `posts` as `[minimum]`
or `[minimum, maximum]`, `lastPostDays`, `email` and `country` (country codes).
Search topics come from the seed's Nano profile; saved/recent deduplication is
on. Results import in chunks of 20. Automatic polling waits up to 60 intervals
of 10 seconds before leaving the search resumable. The first results page is
imported; Nano continuation tokens are stored, but a next-page command is not
yet implemented.

Use a stable UUID `requestId` for retries of the same workflow search. A unique
search record claims it before submission. Existing requests return that record
instead of starting another paid search. If submission is ambiguous, the status
is Submission Unknown: inspect Nano before deliberately starting a new request.
No automatic retries replay a Nano search or flag mutation. Search discovery
may consume the Nano account's quota. Contact matching is not invoked: sync
imports only emails already present in list responses.

## Development And Installation

```bash
corepack yarn install --immutable
corepack yarn test
corepack yarn typecheck
corepack yarn lint
npx -y twenty@2.59.0 --no-input app build
npx -y twenty@2.59.0 --no-input --remote <remote> app plan --no-prune
npx -y twenty@2.59.0 --no-input --remote <remote> app apply --create --no-prune
```

Review a plan before applying. Use a separate preview workspace and credentials;
installation does not authorize production changes or a paid account sync.
Runtime permissions cover its six objects, native views, People read/create, workspace-member
read, file uploads and its own application settings. Only lists and memberships
have Trash permission; creators and People are never deleted by sync. Background server and worker processes are both required.

The [decisions](../../../../docs/decisions/nano-influencer/DECISIONS.md) record
scope. Tests cover transport authentication, safe failures, pagination,
reconciliation, unique search requests and result collection. Live Nano account
behavior requires separate verification with a connected account.

## Preview Verification

The [VM handoff](../../../../docs/handoffs/2026-11-22-nano-influencer-preview.md)
describes the isolated live preview and browser checks. The fixture currently
allows list/profile and saved-history/result reads, with paid contact matching, new searches
and outbound Nano actions disabled. Earlier demo-only checks are historical.

## Native Enum Upgrade

Creator **Country** and **Platform** are native Selects. Country normalizes country names and ISO codes; unrecognized source text remains in **Country (Raw)**. **Platform** offers YouTube, X, Instagram and TikTok. Saved
State, Sync Status and Search Status are also native Selects. Old platform codes
remain in **Platform (Raw)** for identity compatibility, with their table column
hidden. The [shared backfill CLI](../../operations/README.md) fills existing
records without external API calls or overwriting populated selections.

The five sidebar entries live under **NanoInfluencer**. Existing legacy lists
with no connection binding can still use the legacy token before native keys
are added. Bind a legacy list explicitly through Sync Nano Lists with its
original `connectionId` before using native credentials. After discovery has
already created that account's canonical list, keep the old records for review
rather than blindly rebinding or deleting their memberships. Legacy running
searches without an account binding cannot be polled using a different account.

The [VM preview handoff](../../../../docs/handoffs/2026-11-22-nano-influencer-preview.md)
distinguishes its restricted live fixture from the complete source app.

## Saved Search History And Grouped Views

Run **Sync Nano Search History** to import each connected account's existing
search logs. The command reports unusable connections while usable accounts
continue. No search is submitted. Searches retain **Raw Nano Search**, **Searched
By**, **Started At**, **Origin** and **History Import Status**. Available keyword
collections paginate through all saved pages; similar searches use the existing
task reader. Expired/removed results are **Unavailable**, with the provider
response retained when one is returned. A real available empty collection is
separate from an expired collection. Imported results retain **Raw Nano Result**
and the complete responses in **Raw Nano Search Results**. Keyword pages are
keyed by page number. These are the currently available saved collections, not a
reconstructed snapshot of an earlier keyword batch. Existing creators are reused
by platform/Nano ID. Result imports checkpoint each completed result and resume
after rate limiting. An imported search is not automatically resubmitted.

**Nano Users** identify Nano decision makers without creating CRM People or
workspace members. Their group label is the email when available; missing emails
use the Nano display name/identity. Native membership **Decision Maker** relations
support grouping; **Decision Maker Email** retains the native Email value.
**List Owner** remains an explicit Twenty assignment: Nano's project response
omits the project owner, and decision actors do not establish ownership.

In Nano Memberships, choose **By List**, **By Creator** or **By Decision Maker**.
**Refresh Nano Grouped Views** backfills decision-maker relations and native
view-group entries from existing memberships. List-page sync queues group updates
for the records it saves. The refresh also populates an app membership view after
its group field changes to one of those relations. It preserves existing group
order/visibility and respects customized group fields. The grouped views use the
native load limit of 100; Twenty controls how groups are displayed. Native view
refresh is asynchronous, like the list import.

Creator **Email Availability** is a native Select: **Has Email** or **No Email**.
Choose **By Email Availability** or **By Country** in Nano Creators. The Email
Availability column is hidden by default; its grouping remains available. Availability
counts only usable saved addresses; an empty incoming Nano email response does
not erase known addresses. Native create/update hooks keep the category current
when an address is added or removed in Twenty. They watch only email/availability
changes, skip consistent snapshots and repair against current stored data.
**Refresh Nano Grouped Views** also backfills both creator categories and groups.
The country view populates actual values instead of filling its first groups
with unused countries.
