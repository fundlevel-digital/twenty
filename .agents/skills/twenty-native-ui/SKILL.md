---
name: twenty-native-ui
description: Choose and reuse Twenty CRM components when building or reviewing host screens or SDK app front components. Apply before introducing browser-native, custom or third-party controls.
---

# Native Twenty UI

Read root `DESIGN.md`. Kareem's rule is to use existing Twenty CRM components
whenever they support the required behavior. SDK apps follow the same rule as
the host. New/custom UI is appropriate only when no suitable existing component
supports what is being built; briefly identify that capability gap.

Search `twenty-ui` and the closest consuming screen before implementing a
control. Use the native component's styles, states, keyboard behavior and
accessibility; copying its appearance onto a browser control is not reuse.
Compose native primitives where needed, rather than rebuilding their behavior.

For SDK apps, verify exports and prop types in the app's installed `twenty-ui`
version instead of assuming the checkout's latest API is published. For example,
the Twitter app's 2.59.0 package exports the compound `Select` from
`twenty-ui/primitives/input`; its `Root`, `Label`, `Trigger`, `Value`, `Icon`, `Portal`,
`Positioner`, `Popup` and `Item` parts replace a hand-styled HTML `<select>`.
Keep existing native settings sections, buttons, typography and theme tokens.

See the tested [SDK Select composition](../../../packages/twenty-apps/internal/twitter-analytics/src/front-components/components/ProfileRelationSelect.tsx).
It supplies a positioned portal container for embedded popup coordinates and
retains compatibility with keyboard clicks on older embedded hosts.

Verify the actual control opens, selects, responds to the keyboard and retains
labels and helper descriptions in the embedded app runtime. For protected
previews, use the remote preview skill to verify through the access gate.

See [the owner decision](../../../docs/decisions/0008-reuse-native-twenty-ui-components.md).
