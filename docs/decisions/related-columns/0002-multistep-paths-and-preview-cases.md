# 0002. Navigate Multiple Relationship Steps

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: related-columns
- Related: [Related Attributes](0001-related-attributes-across-relationships.md)

## Context

The initial related-column picker exposed one visible relationship, including
configured junctions, although the lookup engine already supported longer paths.
Kareem asked how Attio decides where a path must stop.

## Exchange

- 2026-11-22 Kareem: "How deep does it go?"
- 2026-11-22 Kareem: "Hmm; Lemme see how attio handles it;"
- 2026-11-22 Kareem: "Do u have access to attio? or maybe u can figure it out from their docs/resources?"
- 2026-11-22 Kareem: "I think they do allow multistep, but somehow they figure out the logical cutoff"
- 2026-11-22 Agent: found Attio's documented limit of one multiple-record relationship per path; single-record relationships may follow it. Described the existing engine's five stored relationship-hop limit separately.
- 2026-11-22 Kareem, attached text: "Would this list multiple cities or just one?"
- 2026-11-22 Agent: explained that Company → Team (many) → Primary Location → City can display several cities.
- 2026-11-22 Kareem: "Alr, build it then; then in ur preview please show me every case like this"

## Decision

Extend the native related-attribute picker to navigate successive relationships.
Allow single-record steps before and after one multiple-record step. Keep a
second multiple-record step visible but disabled with an explanation. Demonstrate
single-record, one-to-many, configured many-to-many, mixed paths, empty values,
shared leaf records, repeated scalar values and the depth cutoff in the isolated
VM preview.

## Why

Kareem approved the multi-step behavior after asking specifically about multiple
cities. Attio's documentation supports the relationship-cardinality rule. No
Attio account access or undocumented Attio total-depth behavior is claimed.

## Consequences

The existing engine's five stored-hop limit remains an implementation constraint,
not a newly specified owner preference or a claimed Attio limit. A configured
many-to-many relationship uses two stored hops and one multiple-record step.
Native dropdown pages persist the full selected path and explain blocked choices.

Values follow terminal record identity: a shared Location reached through two
people appears once; two distinct Location records containing the same city can
show the same text twice. There is no implicit aggregation. Existing read-only,
filter and sort restrictions remain. Preview examples use synthetic data; this
request does not authorize a production rollout.

## Evidence

- [Attio: Path limits when using multi-value relationships](https://attio.com/help/reference/managing-your-data/attributes/relationship-attributes#path-limits-when-using-multi-value-relationships).
- `RecordTableLookupTargetFieldSelectMenu`,
  `RecordTableLookupTargetFieldSelectPage`, `getLookupRelationSelection`,
  `getLookupRelationFieldOptions` and `getLookupRelationHops` under the frontend's
  `object-record` module.
- 55 focused tests, direct TypeScript, type-aware lint, optimized source build and
  native browser path/persistence/cutoff checks passed.
- Verification and preview cases: [Multi-step handoff](../../handoffs/2026-11-22-multistep-related-columns.md).
