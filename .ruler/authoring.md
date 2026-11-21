# Agent Configuration Sources

Ruler owns repository rules in `.ruler/*.md`. Edit those sources, then run
`bash scripts/ruler-apply.sh` from the repository root
(or `yarn ruler:apply` after root dependencies are installed). The generated root `AGENTS.md` and
`CLAUDE.md` stay tracked so fresh checkouts have instructions before installation.
Do not edit generated rules directly. Scoped rules may use `<area>/.ruler/*.md`.
Keep the root outputs as regular files: Ruler refuses the former `AGENTS.md` →
`CLAUDE.md` symlink when writing generated instructions.

Skills follow the `fundlevel-digital/mono` convention: their canonical source is
`.agents/skills/<name>/SKILL.md`, with committed relative aliases in
`.claude/skills/` and `.pi/skills/`. Codex, Cursor and OpenCode can discover the
canonical directory. Edit the canonical skill; it needs no Ruler regeneration.
Keep supporting references beside the skill. Preserve existing Claude-only skills.

MCP settings, client settings and agent definitions are outside this Ruler setup.
Do not overwrite `.mcp.json`, `.codex/config.toml` or `.claude/settings.json` when
applying rules. The pinned Ruler command uses local sources only. MCP and skill
generation are disabled in `.ruler/ruler.toml`; its CLI flag disables subagent
generation.
