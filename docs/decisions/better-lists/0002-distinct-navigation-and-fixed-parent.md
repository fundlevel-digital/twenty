# 0002. Keep Lists Distinct and Their Parent Fixed

- Date: 2026-11-22
- Status: superseded by 0006 for Data Model presentation and 0007 for navigation; fixed-parent requirement retained
- Decided by: Kareem
- Area: Better Lists
- Related: [Initial request](0001-attio-style-lists.md)

## Context

The preview showed each list twice in the sidebar and exposed the generic object relations editor for its backing entry object.

## Exchange

- Kareem: "Is this not abug?" (sidebar screenshot showing duplicate list entries).
- Kareem: "I also don't like how lists are considered objects? Is theree no way to give them their own data model section without changing the code? or maybe at least change the \"app\" to be like better lists or something?"
- Kareem: "Also don't like how I'm able to relate to multiple objects, like hard for me to tell what the PArent is/isnt'"
- Kareem: "Also I don't think Paren't objects of lists should be changebale"
- Kareem: "Oh nvm I didn't see the lists setting - is that something a App can do or is that something u had to change in the fork?"
- Agent: clarified that the current Lists settings section is a fork change, while SDK apps can own metadata and contribute application preferences. This exchange does not approve a new app ownership migration or SDK repackaging.
- Kareem supplied the [Attio lists documentation](https://attio.com/help/reference/managing-your-data/lists) as further reference.

## Decision

A list has one clearly presented parent object, fixed at creation. Do not expose generic relation creation as list configuration. Remove automatic duplicate list-object links from Workspace and highlight the dedicated Lists navigation item.

## Consequences

The dedicated list screen manages list-only attributes. Generic object-detail links redirect there. The list field picker excludes relation types. Metadata API guards reject modification/removal of the parent, additional list relations, and changes to the parent configuration marker. Normal attributes and ordinary CRM relations remain supported.

## Evidence

Implementation and verification are described in the [handoff](../../handoffs/2026-11-22-better-lists.md). SDK ownership remains unchanged; no cosmetic substitution of the App column is presented as a real ownership transfer.

The supplied Attio documentation allows privileged users to change parent objects. The immutable-parent requirement here is Kareem's explicit preference, which takes precedence. Attio also supports repeated list entries for a record; these are distinct from duplicated sidebar links.
