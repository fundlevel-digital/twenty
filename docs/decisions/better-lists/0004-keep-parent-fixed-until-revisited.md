# 0004. Keep The Parent Fixed Until Revisited

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Better Lists
- Related: [Fixed parent](0002-distinct-navigation-and-fixed-parent.md), [App-only boundary](0003-app-only-boundary.md)

## Context

After learning that Attio permits changing a list's parent object type, Kareem asked how formulas referencing parent attributes would adapt. The agent explained that automatic formula remapping was not established by the documentation. Kareem confirmed the existing fixed-parent requirement while leaving future behavior open.

## Exchange

- Kareem: "And I guess what U had before was this? Like state You showed me before I asked you to like change the sidebar up and stuff like that?"
- Agent: clarified that the first preview already used host fork code, before the sidebar feedback; no app-only version had been built.
- Kareem: "Okay, yeah, in this case, I'm not too sure how I want this handled. I guess potentially the formulas could just break, which is okay, and show some error state or something. But I guess you can document that right now I'm going to decide to just keep our forced fixtures of the parent objects. Because if I needed to quote unquote change the parent object, in theory, I should be able to just make a new list and copy a bunch of the stuff over. But until I figure out if changing it is even important for me. And like how I'd want to handle things will just keep this divergence from audio behavior."

## Decision

Keep each list's parent object type fixed after creation for now. This is an intentional divergence from Attio, subject to a future owner decision rather than a permanent product constraint.

If a different parent object type is needed, the intended workaround is to create a new list and copy suitable configuration or data. This does not assert that an automatic copy feature exists, nor that records or formulas can be transferred between unrelated object schemas without mapping.

Allowing formulas to fail with an error state is a possibility for a future design, not authorization to enable parent changes or implement that behavior now.

## Why

Kareem has not yet decided whether changing the parent type is important or how its effects should be handled. Creating a separate list provides an alternative while that question remains open.

## Consequences

No runtime behavior changed in this exchange. The fixed-parent prototype remains as previously implemented; app-only replacement remains outstanding under decision 0003. This confirmation does not approve retaining its host guards in an app-only implementation. No production action occurred.

## Evidence

- Attached owner replies: `.context/attachments/g5DL06/chat-reply-2026-11-22_11-25-22.txt` and `.context/attachments/rEaaGy/chat-reply-2026-11-22_11-26-22.txt`.
- Existing implementation and packaging status: [Better Lists handoff](../../handoffs/2026-11-22-better-lists.md).
- Hindsight remains unavailable in this VM as recorded in decision 0003; this record is local repository documentation.
