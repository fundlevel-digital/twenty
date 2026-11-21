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
