# Documentation and decisions

Use the `decisions` skill at `.agents/skills/decisions/SKILL.md` before work in an area and when Kareem settles, rejects, corrects or reverses a choice. Read `docs/DECISIONS.md`, then the relevant index under `docs/decisions/`.

Record decisions in the same turn, including Kareem's exact words and the exchange that led to the choice. Distinguish explicit owner choices from agent implementation decisions and observed behavior. Do not turn a question into approval or claim a proposed, unverified, or preview-only change is deployed.

All decision records live under root `docs/decisions/<area>/`, with indexes and stable per-area numbering. Keep accepted records immutable; a reversal gets a new record that supersedes the old one. Keep credentials and customer message contents out of documentation.

For Slack work, read `docs/slack-sync.md` and `docs/decisions/slack/DECISIONS.md`. Use the Slack area for Slack work. Do not import unrelated Sunny/mono decisions or infrastructure instructions.
