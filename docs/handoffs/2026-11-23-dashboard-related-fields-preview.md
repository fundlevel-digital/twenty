# Dashboard Related Fields Preview

The isolated preview serves an optimized frontend built from this checkout,
including the dashboard related-field picker, lookup draft metadata preservation,
hide/show support and related-filter refresh signature changes.

- Preview: https://fundlevel-w945.conductor.show/
- Dashboard: https://fundlevel-w945.conductor.show/object/dashboard/7dcaaffa-5977-4d03-aee8-a6390ffa06b7
- Synthetic objects: Contracts, Productions and Demo Deals. Four Contracts cover
  a matching Deal, another Deal and a Production without a Deal. The saved
  Production → Deal filter returns two matching Contracts.
- Demo email and password autofill were verified in a fresh Chrome session;
  signing in required no typing.

## Runtime

PostgreSQL 16 and Redis 7 run in isolated VM containers. The local database was
initialized with both fast and slow instance commands before development seeding.
No production data, connections or credentials were copied, and no external app
refreshes or paid API calls were requested.

The server, queue worker and source-built frontend run under a detached Python
supervisor in `.context/preview-supervisor.py`. It restarts exited child
processes while this VM remains active. Private configuration, browser state,
API key and TLS helper files remain in gitignored local files. No VM wake or
shutdown persistence is configured. Restart the existing preview with
`python3 .context/start-supervisor.py` only after checking its existing PID and
listeners to avoid starting a second supervisor.

The public frontend on port 3001 proxies API requests to port 3000. Anonymous
public requests reach Conductor's sign-in gate (401). Browser checks use the
exact HTTPS app origin through a VM-local TLS proxy and Chrome host mapping;
this verifies app routing and authentication while bypassing Conductor's edge.
Backend and frontend-proxied health endpoints were checked locally.

## Verification

The implementation's 16 focused frontend tests, 73 shared filter tests,
frontend TypeScript and type-aware lint passed in the preceding implementation
turn. Native browser checks verified the actual dashboard table, opened Fields →
Related Fields, navigated Production → Deal → Name, added the column, saved
the dashboard and confirmed the value remained after reload. The table showed
two matching Contracts and their Acme Q4 Deal value. The new label rendered in
English after local catalog compilation. The dashboard flow emitted no uncaught
page errors; an aborted metadata request during the intentional reload is
expected. Browser verification used light mode; dark mode was not checked in
this session.

Screenshots are kept in `.context/dashboard-related-fields-picker.png`,
`.context/dashboard-related-field-added.png` and
`.context/dashboard-relations-preview.png`.

The new English label required extracting and compiling local Lingui catalogs
for the optimized preview. Catalog source changes are restored after the build;
generated translations are not part of the implementation diff. A 4 GiB private
swap file supports the VM's memory limit. Stop the backend and worker while
building the host frontend; concurrent builds and backend startup can exceed
the VM allocation even with swap. Restart the supervisor after the build exits
successfully.

## Scope

This is implemented and previewed on the VM. It is not a production deployment.
The [owner decision](../decisions/related-columns/0008-dashboard-related-fields-and-filters.md)
records the request and supported filtering scope. Hindsight memory remains
unavailable because the VM lacks the private profile; no memory write is claimed.
