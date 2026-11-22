# 0001. Native GitHub Profiles App and Preview

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [App README](../../../packages/twenty-apps/internal/github-profiles/README.md), [preview handoff](../../handoffs/2026-11-22-github-profiles-preview.md)

## Context

The owner explored GitHub's public profile and social-account APIs and requested
an app that stores their responses and exposes the data in Twenty.

## Exchange

- 2026-11-22 Kareem: "Alright, can we make a app called \"GitHub Profiles\" that creates a \"GitHub Profiles\" object? Then I'd want every influencer to have a many GH to one Influencer relation."
- 2026-11-22 Kareem: "Also, would wanna store the raw" — followed by both GitHub user and social-account endpoint examples. The example account details are omitted from this record.
- 2026-11-22 Kareem: "It should also have workflow action to get these two responses"
- 2026-11-22 Kareem: "Please build htis and give me a preview"
- 2026-11-22 Agent: implemented the SDK app and installed it in an isolated demo workspace. A native workflow execution completed, refreshed the existing profile, and returned both responses. Browser checks verified the table, record fields and native avatar.

## Decision

Create a GitHub Profiles app and object. Each influencer can have many profiles;
each profile belongs to at most one influencer. Include Links fields for Bluesky,
Facebook, Generic, Hometown, Instagram, LinkedIn, Mastodon, NPM, Reddit, Threads,
Twitch, Twitter and YouTube, labeled with the URL suffix. Store both raw API
responses and the requested account identity, contact, bio, count, flag and date
fields. Use the GitHub avatar as the native record image. Add a workflow action
that retrieves both responses and an isolated preview for review.

## Why

The requested model makes GitHub account data available as structured CRM fields
and original JSON, related to the existing influencer records.

## Consequences

Source lives in `packages/twenty-apps/internal/github-profiles`. GitHub ID is a
unique field, source timestamps have separate GitHub-prefixed fields, and social
providers use native Links fields with secondary links. These are implementation
choices supporting the request, not additional owner decisions.

The preview uses synthetic influencer data and a public GitHub demo account.
Production CRM records and installations were not changed. The request does not
authorize a production rollout or an automatic import of existing CRM profiles.

## Evidence

See the app README and preview handoff for schema, tests, native workflow
verification, preview-only upload routing and hosting limits.
