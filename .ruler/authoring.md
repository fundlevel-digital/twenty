# Agent Configuration Sources

Repository instructions are owned by `.ruler/*.md`. Run `yarn ruler:apply`
after changing them. `CLAUDE.md` is generated and stays tracked so fresh
checkouts have instructions before installing tools. The existing `AGENTS.md`
symlink points to that same file for Codex, Cursor, Pi and OpenCode.
Edit the Ruler sources, not the generated file. Keep package-specific instructions
in place; this configuration generates repository-root instructions only.
Paths in these instruction sources are relative to the repository root.

Shared skills live in `.agents/skills/<name>/SKILL.md`. Claude and Pi aliases
link to those canonical directories from `.claude/skills/` and `.pi/skills/`.
Codex, Cursor and OpenCode discover `.agents/skills/` directly. Skill edits need
no Ruler regeneration. Preserve the existing Claude-only skills unless their
migration is part of the task.

This setup follows `fundlevel-digital/mono` and `fundlevel-digital/sunny`.
Ruler is pinned to 0.3.46, matching sunny. Its MCP and experimental skill
management are disabled: existing `.mcp.json`, agent settings and skill sources
have their own owners and must not be overwritten by `ruler:apply`.
