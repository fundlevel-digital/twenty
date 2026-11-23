# Influencer Outreach Dashboard Preview

Interactive Cold and Ghosted dashboard concepts for Kareem's requirements
discussion. Every creator, contact, email address, message and metric is fictional.
This standalone React preview has no CRM backend, credentials, external provider
calls, email sending or campaign enrollment.

## Run

From this directory, install with `npm install --workspaces=false --legacy-peer-deps`,
then run `npm run start`. For a static preview, run `npm run build` and serve `dist`:

```bash
python3 -m http.server 3001 --bind 0.0.0.0 --directory dist
```

Open `/#cold` or `/#ghosted`. Only Conductor's workspace access gate applies;
there is no separate Twenty login or login data in this concept preview.

## Review

- Cold: filter using the summary cards, search creators, sort by last outbound,
  and open a creator to inspect POCs, address usage and sequence history.
- Ghosted: compare follow-up counts for the last responding POC and all POCs,
  inspect the last reply, switch the table to inbox history, and open a creator
  for context, inbox counts/access and an illustrative conversation excerpt.
- Toggle dark mode in the page header. Escape closes creator details.
- Missing imported history is represented explicitly, including unknown sequence
  status and partial counts. LinkedIn activity is not included in the samples.

## Implementation Boundaries

Uses published `twenty-ui` 2.61.0 for tabs, buttons, input, search, cards, avatars,
statuses, badges, navigation rows, typography, icons and themes. The published
package does not expose the host record table or host side panel; this isolated
preview uses a semantic table and a CSS detail-pane layout composed with those
native primitives. No host/fork changes or SDK app installation are needed.

Cold operational groups are proposals, not newly configured CRM stages. Example
waterfall rounds are supplied by explicit fixture history, not inferred from
send counts. Ghosted sample follow-up counts share a window beginning at the
latest creator reply; production reset rules and channel aggregation remain
unsettled. Per-inbox totals are historical and can precede that window.

Inbox access is fixture data, not a checked live capability. Conversation text
is an illustrative excerpt; there is no provider-backed full-thread browser.
These are UI concepts rather than verified native dashboard configuration.

Requirements and owner choices: [Decision Index](../../../../docs/decisions/influencer-outreach/DECISIONS.md).
