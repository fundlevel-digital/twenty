# 0009. Install Matt Pocock's Grilling Skill

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: Repository

## Context

The repository did not have a grilling skill in its canonical skill directory
or its Claude and Pi aliases.

## Exchange

- 2026-11-23 Kareem: "Is the grilling skill instaleld on this repo or no?"
- 2026-11-23 Agent: checked the repository skill directories and confirmed it was absent.
- 2026-11-23 Kareem: "Okay, please install it - it's the one by matt pocock"

## Decision

Install Matt Pocock's upstream `grilling` skill in this repository.

## Why

Kareem explicitly requested that skill and identified its author.

## Consequences

Installed the unchanged upstream skill and agent metadata under
`.agents/skills/grilling/`, with the upstream MIT license alongside them.
Added relative aliases under `.claude/skills/` and `.pi/skills/` to match the
repository's skill layout.

## Evidence

- [Pinned upstream source](https://github.com/mattpocock/skills/tree/abeeaf95660ba9e8b7c753eb38f441ca707a8823/skills/productivity/grilling).
- Installed with the skill-installer helper at upstream commit
  `abeeaf95660ba9e8b7c753eb38f441ca707a8823`.
- Verified upstream skill/agent file hashes and both aliases.
- Installation is in this working tree; no merge or push is claimed.
