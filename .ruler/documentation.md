# Documentation and Decisions

Use the decisions skill at `.agents/skills/decisions/SKILL.md` before substantial
repository work, before reopening a settled question, and when the owner chooses,
corrects, rejects or reverses an approach. Read `docs/DECISIONS.md` and the relevant
area index first. Record the decision and its exchange before the handoff.

All decision records live under root `docs/decisions/`; use numbered records and
link them from the appropriate index. Keep durable product and operational
explanations with their consuming package when appropriate. Session handoffs live
under `docs/handoffs/`, linked from `docs/README.md`, and explain what changed,
why, verification, limitations and remaining work. Link to commits and maintained
source rather than duplicating code or raw logs.

Keep intended, implemented, merged and deployed states distinct. Quote relevant
owner instructions exactly, including corrections, without turning an agent's
implementation choice into an owner decision. Documentation and decision records
do not grant authorization for later deployments or external actions.

Never copy credentials, tokens, private keys, connection strings containing
credentials, or customer CRM records into documentation. Describe private runtime
configuration by its location and purpose. Redact any secret from a quoted
exchange explicitly.
