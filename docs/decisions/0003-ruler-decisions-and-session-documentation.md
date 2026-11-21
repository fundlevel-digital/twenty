# 0003. Adopt Ruler and Document This Session

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: repository documentation and agent configuration
- Related: [0001](0001-upstream-and-computed-field-editor.md), [0002](0002-preview-before-production-deployment.md)

## Context

The owner wanted the documentation and decision-record conventions used in
`fundlevel-digital/sunny` or `fundlevel-digital/mono` installed here. The initial
request's documentation scope and additional preview-skill request were then
corrected.

## Exchange

- 2026-11-21 Kareem: "Do u see the docs & decision guide/skill in fundlevel-digital/sunny or fundlevel-digital/mono?Can u please setup that skill(s) here using ruler (also in the other repo); and document what we did here (just the youtube part)"
- 2026-11-21 Kareem: "Also make a skill for setting up remote previews of twenty"
- 2026-11-21 Kareem: "Wait just dont create the preview skill"
- 2026-11-21 Kareem: "and I meant the stuff we did this session; not oyyutbe stuff"
- 2026-11-21 Agent: found the decisions skill in both repos and the Ruler authoring convention; selected mono's centralized decision-record layout and preserved Twenty's existing instruction link and MCP ownership.

## Decision

Set up the documentation/decision workflow in this repository using those Ruler
conventions. Document this session's upstream integration, computed-field UI,
expression-editor adaptation and isolated preview. Do not create a remote-preview
skill as part of this task. The YouTube-only scope was corrected to this session;
no YouTube documentation is required here.

## Why

These are the owner's final explicit instructions. Both reference repos keep
shared skills under `.agents/skills/`, with Ruler owning instruction routing
rather than the skill content. Mono's root `docs/DECISIONS.md` and
`docs/decisions/` layout provides a single place to find the session's choices.

## Consequences

- Ruler sources live in `.ruler/`; the pinned generator is exposed through
  `yarn ruler:apply`.
- Existing repository instructions are preserved as a Ruler source.
  `CLAUDE.md` remains tracked and generated, and `AGENTS.md` keeps its existing
  symlink to it so fresh checkouts retain instructions without a bootstrap step.
- Shared decision guidance is canonical in `.agents/skills/decisions/`, with
  Claude/Pi aliases. Existing skills are preserved.
- Ruler's MCP and experimental skill management are disabled; existing MCP
  configuration is not migrated or overwritten.
- This index, decision records and a session handoff document the completed work
  and distinguish local commits, preview runtime and pending release actions.
- No preview skill is added. A later request for one would be a new decision.

## Evidence

- [Mono decisions skill](https://github.com/fundlevel-digital/mono/blob/94038532154c12f58e51e01a99a0769d1a169f6e/.agents/skills/decisions/SKILL.md).
- [Mono authoring rules](https://github.com/fundlevel-digital/mono/blob/94038532154c12f58e51e01a99a0769d1a169f6e/.ruler/authoring.md).
- [Sunny Ruler configuration](https://github.com/fundlevel-digital/sunny/blob/b3ff508b2b0a7b154c4a60f3c163914d14acc4ba/.ruler/ruler.toml) and [pinned command](https://github.com/fundlevel-digital/sunny/blob/b3ff508b2b0a7b154c4a60f3c163914d14acc4ba/package.json): version 0.3.46.
- Local sources: `.ruler/authoring.md`, `.ruler/documentation.md`,
  `.ruler/instructions.md`, `.ruler/ruler.toml` and the shared decisions skill.
