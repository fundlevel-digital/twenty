# 0006. Configure People Creation, Sync Removal And Attribution

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer

## Exchange

- Kareem: "Would also be cool to have config, similair to the email/calendar app, that let's me select if I want person auto-creation, like \"Auto create all\", only create on favourites, don't create at all, etc."
- Kareem: "WOuld also be nice to have nano influencers linked to people via the emails it has"
- Kareem: "Also is there any automatic synccing from nano?"
- Kareem: "Also, do Nano influencers also get refresh or no?"
- Kareem: "Also would be nice to have the lists and memebershisp show who's list and who's decision it was ykim?"
- Kareem: "ALso config for the sync, where if entires are deleted or lists deleted, weather Twenty should delete them too (default of no)"

## Decision

Provide selectable People creation policies, relate creators to existing People
by email, expose sync configuration, retain attribution where Nano supplies it,
and make deletion opt-in with preservation as the default.

## Implementation Choices

The workspace's Nano Sync settings use native Select variables for Don't Create,
Only Favourites or Auto Create All; removed membership/list policies; and manual
or daily 04:00 UTC sync. Don't Create and Manual Only are conservative initial
choices made by the agent, not additional owner decisions. Both deletion policies
default to Keep In Twenty as Kareem explicitly requested.

Existing People are matched across primary and additional emails with exact,
case-insensitive comparison. Multiple matching People are left unresolved, and
manual relations are preserved. New People are only created under the selected
policy. Profile enrichment and paid contact discovery are separate from list
sync; daily list sync does not invoke paid contact matching.

Opt-in removal uses Trash for memberships or a missing list and its memberships.
Missing entries are reconciled only after complete feeds, and failed account
reads do not establish that lists were deleted. Creators and People remain.

Memberships retain Nano's operator identity, name, email and raw decision snapshot.
The verified project endpoint returns no owner. List Owner is therefore an
assignable Twenty workspace-member relation, not an inferred Nano project owner.

## Verification

The preferences panel rendered and its schedule setting persisted across reload;
it was restored to Manual Only after the test. Native email matching related a
synthetic creator to an existing synthetic Person; both test fixtures were then
removed from active records. No customer People or Nano entries were deleted.
Default-off and opt-in deletion cases, account failure, ambiguity and creation
policy behavior have unit coverage. See the [handoff](../../handoffs/2026-11-22-nano-influencer-preview.md)
for the installed preview, checks and ongoing import status.
