# 0003. Show Related Values As Source Record Chips

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: related-columns
- Related: [Multi-step Paths](0002-multistep-paths-and-preview-cases.md)

## Context

The preview rendered multiple related values as adjacent text. Names and city
values ran together. Kareem supplied the preview screenshot alongside an Attio
example with individual chips and source avatars, and linked its relationship
documentation.

## Exchange

- 2026-11-22 Kareem: "I don't like how these look, attio's look like this:"
- 2026-11-22 Kareem: "Here are more docs; https://attio.com/help/reference/managing-your-data/attributes/relationship-attributes"
- 2026-11-22 Agent: identified the separate chips and source-record avatars in the reference; proposed native Twenty chips, source attribution and a +N overflow control.

## Decision

Replace the adjacent-text multi-value display with separate native chips that
identify the source record. Reuse existing Twenty avatars, chips, tooltips,
overflow and record navigation. Keep the accepted multi-step navigation and
cardinality/depth cutoffs.

## Why

Kareem rejected the current presentation and supplied the intended visual
reference. Separate chips make value boundaries clear. Source avatars explain
which related record supplies a value, especially when labels repeat.

## Consequences

Tracking the record introduced by the multiple-record step is an implementation
inference from the screenshot, not an additional quoted owner requirement.
Company → Team → Primary Location → City retains one value per person, even when
two people share the same Location. Configured junctions identify the related
record beyond the junction. Duplicate links to the same source/leaf pair collapse.
This replaces the earlier implementation's leaf-only display deduplication;
record-store deduplication by leaf ID remains independent.

Only readable source labels/images are requested. Field formatters still render
the values, and avatar navigation opens the related source record. Missing values
remain empty and numeric zero remains a value. This change does not add the
filtering/sorting functionality described in Attio's documentation or authorize a
production rollout.

## Evidence

- Owner-supplied preview and Attio screenshots in this conversation.
- [Attio Relationship Attributes](https://attio.com/help/reference/managing-your-data/attributes/relationship-attributes).
- Implementation and verification: [Related Value Chip Handoff](../../handoffs/2026-11-22-related-value-chips.md).
