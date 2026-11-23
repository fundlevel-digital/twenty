# 0007. Require Autofilled Preview Login

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Repository / Remote Previews

## Context

The Comments VM preview used Twenty's seeded demo sign-in autofill. Kareem
requested that the preview skill require this behavior for future previews.

## Exchange

- 2026-11-22 Kareem: "Yo, somehow on ur preview the previe wlogin & password are auto-filled; can u please make the preview skill say that this is a must"
- 2026-11-22 Agent: Verified the server's `SIGN_IN_PREFILLED` setting and the frontend form's email/password autofill, then made autofill and a fresh-session login check mandatory in the canonical preview skill.

## Decision

Every isolated Twenty preview must prefill both demo login fields, so Kareem can
sign in without typing credentials. This also applies to recovered previews and
cached host UIs.

## Why

Kareem explicitly requested this as a mandatory preview requirement.

## Consequences

The [preview skill](../../.agents/skills/twenty-remote-preview/SKILL.md) requires
autofill before handoff. Its [VM setup reference](../../.agents/skills/twenty-remote-preview/references/vm-setup.md)
specifies `SIGN_IN_PREFILLED=true` and verification without browser-saved
credentials or automation filling either field. The setting stays scoped to
isolated demo previews.

## Evidence

- [Server client configuration](../../packages/twenty-server/src/engine/core-modules/client-config/services/client-config.service.ts) exposes `SIGN_IN_PREFILLED` as `signInPrefilled`.
- [Frontend sign-in form](../../packages/twenty-front/src/modules/auth/sign-in-up/hooks/useSignInUpForm.ts) fills both fields when that setting is enabled.
- This change updates instructions and records the owner preference; no runtime or production configuration changes are needed.
