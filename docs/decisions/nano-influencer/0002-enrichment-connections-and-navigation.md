# 0002. Enrichment, Multiple Connections And Grouped Navigation

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer
- Related: [Native Enum Fields](../0007-use-native-enum-fields-across-apps.md)

## Exchange

- 2026-11-22 Kareem: "Alsso for the sidebar items, put the nano stuff into a folder"
- 2026-11-22 Kareem: "also, need to ave a cmd or something that enriches influencers via nano; also need to have multi-api connections like the yt app"
- 2026-11-22 Agent: implemented a native NanoInfluencer folder, an enrichment command/workflow action and multiple native workspace API connections following YouTube Analytics.

## Decision

Group Nano sidebar objects under one folder. Provide creator enrichment from a
command and workflow, and multiple native API connections.

## Implementation Choices

Profile enrichment refreshes identities, names, biographies, audience sizes and
related links. A creator with only a profile URL can resolve its Nano identity.
No contact-match call or implicit membership change occurs. Credential rotation
is limited to profile reads; mutations and saved searches stay pinned to their
original connection. List identity includes connection and project ID so equal
project IDs in different accounts cannot collide. Legacy lists require explicit
binding before native connection actions. These are engineering choices needed
to implement the request safely, not additional owner decisions.

## Evidence

Source, unit checks and isolated demo verification are described in the app
README and preview handoff. The VM uses sample Nano responses, with no real Nano
credentials or paid discovery calls. Production deployment remains distinct.
