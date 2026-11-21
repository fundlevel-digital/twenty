# Agent Configuration Sources

Edit rules in `.ruler/*.md`, then run `bash scripts/ruler-apply.sh`
(or `yarn ruler:apply` after installing root dependencies). Root `AGENTS.md`,
`CLAUDE.md` and the other Ruler outputs are generated. Do not edit them directly.
Existing Twenty rules were preserved in `.ruler/instructions.md` when Ruler was
introduced. MCP configuration is outside this Ruler setup; keep `.mcp.json` intact.

Skills live in `.agents/skills/<name>/SKILL.md`, with aliases from
`.claude/skills/` and `.pi/skills/`. Edit that canonical source; skills do not need
Ruler regeneration. Preserve existing skills and their sources.

The decision skill and this source/alias convention came from
`fundlevel-digital/mono` at `94038532154c12f58e51e01a99a0769d1a169f6e`
(2026-11-21). `sunny` has the earlier colocated-decision convention; use the newer
central layout here. The imported skill's area table is adapted to Twenty.
