# 0011. Workspace-Owned Social Profile Linking

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer

## Context And Exchange

Kareem asked how Nano profiles could automatically link to X, YouTube and other
platform profiles, clarifying: "Just a question^".

The agent described matching platform IDs and enrichment links, with optional
profile creation and shared People relations.

Kareem: "But I don't want to make this part of the app ykim? Like I'd rather a custom workflow or something we build".

## Decision

Keep cross-app social-profile linking in workspace-owned automation, such as a
custom Twenty workflow, rather than adding it to the NanoInfluencer app.

## Consequences And Evidence

A proposed workflow can react to creator changes, find corresponding platform
records and update custom relations. Matching rules, missing-record creation and
backfill behavior remain workspace choices; they have not been settled here.
This exchange is architectural discussion, not an instruction to implement or
activate a workflow. No application code, CRM fields or live automation changed.
