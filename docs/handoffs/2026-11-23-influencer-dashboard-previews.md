# Cold And Ghosted Dashboard Previews — 2026-11-23

Kareem requested concrete previews after discussing outreach stages. See
[decision 0007](../decisions/influencer-outreach/0007-build-cold-and-ghosted-previews.md)
and the [preview README](../../packages/twenty-apps/internal/influencer-outreach-preview/README.md).

- Cold: <https://fundlevel-w939.conductor.show/#cold>
- Ghosted: <https://fundlevel-w939.conductor.show/#ghosted>

These are standalone interactive concepts built with `twenty-ui` 2.61.0 and
fictional data. No CRM backend, customer records, provider integrations or sends
are involved. Layouts, operational groups and sample counting windows remain
review proposals. Stage definitions and accepted requirements are in the
[area decision index](../decisions/influencer-outreach/DECISIONS.md).

Direct TypeScript checking, production build and browser interaction checks
passed. Screenshots under `.context/` capture Cold, Ghosted, inbox details,
thread details, dark mode and a mobile pane. Both development and built static
versions were checked locally with Chrome. The Conductor URL returns its expected
anonymous sign-in gate; authenticated public edge access was not verified.

A detached Python server serves the built `dist` on port 3001. The private task
PID file is `.context/outreach-preview-process.json`, with static-server logs in
`.context/outreach-preview-static.log`. The README documents rebuilding and
restarting. Tool completion persistence was verified; VM wake recovery was not.
