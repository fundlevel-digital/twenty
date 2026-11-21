# 0001. Reuse Upstream UI for Computed Fields

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: cross-cutting; `packages/twenty-front` and `packages/twenty-server`
- Related: [0002](0002-preview-before-production-deployment.md), [session handoff](../handoffs/2026-11-21-computed-fields-and-preview.md)

## Context

The owner wanted API-only data-model features exposed in the product UI, with
formula attributes as the example. This fork already had computed-field backend
support. Official upstream provided lookup UI and an expression editor used by
validation rules; the computed-field controls needed integration.

## Exchange

- 2026-11-21 Kareem: "What's currently API only and doesn't have UI built for it?"
- 2026-11-21 Kareem: "I meant more like formula attributes n shi"
- 2026-11-21 Kareem: "Is anythign alr implemented on upstream main?"
- 2026-11-21 Kareem: "okay, update to upstream main, use their UI, and implement anything needed"
- 2026-11-21 Agent: merged official main, retained fork computation support, and added formula/rollup controls using a plain textarea initially.
- 2026-11-21 Kareem: "I don't see a formulas UI"
- 2026-11-21 Agent: explained the New Field → output type → Value Source → Calculation path and linked the preview example.
- 2026-11-21 Kareem: "is there no syntax highlighting?"
- 2026-11-21 Agent: confirmed the input was a plain textarea; its red underline was browser spellcheck.
- 2026-11-21 Kareem: "Did upstream start on it?"
- 2026-11-21 Agent: verified that upstream main already had a highlighted expression editor for validation rules, and that the formula/rollup PR excluded UI.
- 2026-11-21 Kareem: "so use that"
- 2026-11-21 Agent: adapted that editor for calculations, preserving condition-mode behavior and verifying the integration in the preview.

## Decision

Use official upstream UI where available and complete the missing computed-field
controls. Formula and rollup expressions use the existing
`ValidationRuleExpressionEditor`, with calculation-specific grammar, suggestions
and help. A formula keeps its output field type; its computation specifies where
the value comes from.

## Why

The owner explicitly requested upstream UI reuse and then specifically selected
the upstream expression editor. Its highlighting, field chips and keyboard
suggestions fit the requested experience. Calculation expressions can return
numbers, text or dates, so the editor's boolean-only condition validation could
not be reused unchanged.

## Consequences

- Formula and rollup creation/editing controls coexist with upstream lookup UI.
- Calculation suggestions use the supported backend functions and the relevant
  object's fields, including related/composite fields and numeric currency parts.
- Browser spellcheck is disabled. Field chips serialize to API field paths.
- Existing calculations remain editable when the creation feature flag is off;
  app-owned computations remain read-only.
- Keyboard handlers, inactive-panel scrolling, refreshed metadata and editor
  value synchronization were adapted and regression-tested. Dirty drafts are
  preserved during metadata refresh.
- Regular stored fields cannot be converted into computed fields under the
  existing backend invariant. Multi-level lookup columns retain fork behavior
  but do not gain upstream's single-level editing controls.

## Evidence

- Official main merged at `80f03c8df028186874802b42a3a5c3183e35a198`.
- Local implementation commits: `3ffbd8f8ee` and `7f7eedf6ab`.
- Sources: `SettingsDataModelFieldComputationForm.tsx`,
  `ValidationRuleExpressionEditor.tsx` and `SettingsObjectFieldEdit.tsx` under
  `packages/twenty-front/src`.
- The final editor verification passed 104 focused tests, direct frontend
  typecheck, type-aware lint, formatting and an optimized build. Browser checks
  covered keyboard/field insertion, exact save/reload values, calculated results,
  both themes and rollup scroll stability.
- [Upstream expression editor](https://github.com/twentyhq/twenty/blob/80f03c8df028186874802b42a3a5c3183e35a198/packages/twenty-front/src/modules/validation-rules/components/ValidationRuleExpressionEditor.tsx).
- [Upstream formula/rollup PR](https://github.com/twentyhq/twenty/pull/30498): its description excluded UI when inspected during this session; PR state may change later.
