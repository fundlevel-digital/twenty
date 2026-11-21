# Decisions And Operational Skills

Use the [decisions skill](.agents/skills/decisions/SKILL.md) before substantial
work and when Kareem settles, rejects, corrects or reverses a choice. Read
[docs/DECISIONS.md](docs/DECISIONS.md), then the relevant area index. Record the
exchange and evidence in root `docs/decisions/<area>/` in the same turn. Respect
settled choices unless Kareem changes them; record reversals by supersession.

For setting up, restoring or diagnosing a remote Twenty preview, use the
[Twenty remote preview skill](.agents/skills/twenty-remote-preview/SKILL.md).

LinkedIn's index is `docs/decisions/linkedin/DECISIONS.md`; implementation and
operating details remain in `packages/twenty-apps/internal/fundlevel-linkedin/`.
Distinguish source implementation, preview verification and production changes.

For Slack work, read `docs/slack-sync.md` and `docs/decisions/slack/DECISIONS.md`. Keep the distinction between the local snapshot, native Slack OAuth, and live deployment explicit.
