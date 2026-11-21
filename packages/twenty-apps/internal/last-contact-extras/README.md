# Last Contact Extras

CRM-owned companion to the marketplace Last contact app. Owns only the Person
`lastSenderStreak` field (Messages in a Row), the Influencer → Person and Production → Person contact
relations and their inverses, one application role, and six logic functions. Installing or updating it does not claim or update the upstream
Last contact registration.

The count is the consecutive inbound or outbound emails at the end of a person's
email history. A sender linked to a workspace member is outbound; other senders
are inbound, matching Last contact. Different people on the same side do not reset
the count. Drafts, undated emails and meetings are excluded. Duplicate participant
rows count once. Email date orders messages, descending message ID breaks ties,
and 50 means 50 or more. No valid email means an empty value.

Participant creation, relinking, sender changes and deletion recompute everyone
linked to the affected messages, including formerly linked people. Message creation, removal, date and
draft-state changes also refresh the count. Writes are skipped when unchanged.
The 06:00 UTC daily email reconciliation traverses distinct email-linked people in
batches of at most 50, advancing by person ID and enqueueing its continuation.
It does not scan the full CRM contact list. API requests are paced 600 ms apart.

## Install and backfill

```bash
yarn install
npx -y twenty@2.59.0 --no-input app apply --create --no-prune
npx -y twenty@2.59.0 --no-input app exec --name backfill-email-streaks
```

`app apply` does not start the backfill. Each queued continuation runs with the
app role. To refresh selected people without a full backfill:

```bash
npx -y twenty@2.59.0 --no-input app exec --name backfill-email-streaks \
  --payload '{"personIds":["<person-id>"]}'
```

## Influencers and Productions

These are workspace-owned computed fields, configured through the metadata API:

- Influencer `followUpStreak`: NUMBER with
  `{kind: 'ROLLUP', relationFieldName: 'contactLinks', operation: 'LATEST', expression: 'person.lastSenderStreak', orderBy: 'person.lastContactAt'}`.
- Production `creatorFollowUpStreak`: NUMBER with
  `{kind: 'FORMULA', expression: 'influencer.followUpStreak'}`.

The Influencer count belongs to its most recently contacted point of contact,
including meeting contact dates, matching the requested contact selection rule.
The engine must support LATEST (Fundlevel image `d99c9e143f` or later).

## Verification

```bash
yarn test:unit --maxWorkers=1 --no-file-parallelism
GOMAXPROCS=1 GOMEMLIMIT=3GiB yarn typecheck --singleThreaded
yarn lint
```

## Clickable Point of Contact

Influencer `lastContactPerson` is a native, read-only many-to-one relation to
Person. The app selects the linked person with the greatest `lastContactAt`,
breaking ties by descending Influencer Contact ID, and leaves the relation empty
when none has a contact date. Contact-link changes and Person contact-date
updates refresh it; a daily 06:30 UTC reconciliation covers missed changes.

Production `pointOfContact` mirrors the same Person relation. Production creation
and influencer changes refresh it as well. Dashboard tables use this canonical
relation, so Twenty renders a Person record chip with its normal navigation.
The older text fields remain named helpers and are hidden from those widgets.

```bash
npx -y twenty@2.59.0 --no-input app exec --name sync-point-of-contact
```
