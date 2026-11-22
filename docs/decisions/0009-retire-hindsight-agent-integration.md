# 0009. Retire The Hindsight Agent Integration

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Repository Agent Configuration

## Exchange

- Kareem: "Please remove the hindisght skills, we don't have that stuff anymore - not sure why it's here"
- Agent: Remove the Hindsight skill, its aliases and the rules that invoke it;
  remove the obsolete MCP launch configuration as part of that cleanup.

## Decision

Stop requiring or invoking Hindsight for repository work. The integration is no
longer part of this development environment.

## Implementation And Verification

- Removed the canonical skill and its Claude alias.
- Removed the Engineering memory section from `.ruler/instructions.md`, then
  regenerated `AGENTS.md` and `CLAUDE.md` through the pinned Ruler script.
- Removed only the `hindsight` entry from `.mcp.json`; the other MCP server
  definitions remain identical.
- Removed `.codex/config.toml`, which contained only the Hindsight MCP entry.
- Marked the old operations runbook as retired. Historical handoffs and the old
  standalone scripts remain historical material, with no active agent hook.
- Verified no Hindsight references remain in active rules, skills or MCP config,
  and that the remaining MCP JSON parses correctly.
