# SDK App Previews And Asset Fallback

## Install Into An Isolated Workspace

Use the app's SDK version and its own dependency directory. YouTube Analytics
used `twenty` / `twenty-sdk` 2.59.0 in this session. Resolve a CLI version from the
app manifest instead of assuming the monorepo server and published SDK match.

Keep the source app intact. For a preview that must omit scheduled work, copy
it into an ignored `.context/<app>-preview` fixture and remove only the cron
trigger there. Preserve the real app's production schedule and existing native
connections. Inspect what an old fixture contains before reusing it.

Create an explicitly named CLI remote for the VM and a private session token.
Use `twenty auth login --help` for the installed version. Tokens and connection
keys never belong in a command argument, screenshot or committed file; use the
CLI's stdin token flow or private variable files. Do not reuse a production
remote name for a preview.

The checked CLI workflow is:

```bash
npx -y twenty@2.59.0 --no-input --remote vm-preview --json app plan \
  --no-prune --path <absolute-fixture-path>
npx -y twenty@2.59.0 --no-input --remote vm-preview --json app apply \
  --no-prune --path <absolute-fixture-path>
```

Review the plan first. Start with no pruning so an incomplete fixture cannot
delete existing app entities. Do not replace a real connected key with a dummy
one. Create test connections only when needed, then remove exactly those test
connections. An expired CLI token needs reauthentication, not a workspace reset.

## Edge Auth And Uploads

Conductor's edge can reject server-side callbacks and signed uploads even when
the owner can use the browser. Keep the public origin for browser cookies and
set a reachable `SERVER_INTERNAL_URL` for LOCAL logic functions.

The CLI's signed application uploads may still point at the public origin. In
the isolated preview process, use a narrowly scoped fetch adapter that maps only
that exact preview hostname to `http://localhost:3000`, retaining the signed
path/query, method, headers and body. It must not rewrite Google or storage
hosts. Scope `NODE_OPTIONS=--require <adapter>` to that CLI invocation.

Native file uploads made by an app can have the same problem. The tested avatar
preview changed only the ignored fixture to send its exact preview-origin upload
URL to the internal backend. Production source retained normal signed URLs.
Verify download, PUT upload, completion, record binding and a loaded image.
An analytics refresh can succeed while a separately caught avatar import fails;
inspect both the execution logs and the saved avatar field.

CLI auth may accept a user bearer token for GraphQL but classify a manually
registered token as an API key and refuse `app exec`. In that case, use the
authenticated app route or metadata execution mutation with the same user
session; preserve its real authorization and report execution logs. Production
connection creation can require a browser user session even when CLI OAuth
reads and app execution work. Do not work around this by extracting a key.

## Cached Host UI Fallback

The 2026-11-21 preview used an already deployed host UI because a cold source
frontend was too slow. This is appropriate for SDK app UI/logic checks when the
host version is compatible. It does not validate host frontend source changes.
Prefer source Vite or a build from the current checkout when those are involved.

If choosing this fallback:

1. Cache only the explicitly chosen host's public HTML and static assets under
   `.context/`; never copy its CRM responses, session storage or credentials.
2. Strip the embedded `twenty-client-config` script and replace
   `twenty-env-config` with
   `window._env_={REACT_APP_SERVER_BASE_URL:window.location.origin}`.
3. Serve the shell for client routes and proxy API routes only to the local VM
   backend. Keep static cache paths within the cache root. Preserve status codes,
   content types, request bodies, query strings and streaming responses.
4. Proxy the complete current API prefix set. `/s/`, app bundles, metadata and
   native `/file/` routes are needed for app and avatar verification. A simple
   HTTP proxy does not verify WebSocket-dependent features.
5. Keep proxy/server/worker and PostgreSQL/Redis supervised. Return a distinct
   starting page while dependencies load; do not treat that page's 200 as ready.
6. Register the proxy's actual listener with `conductor preview set --port`.
   The session used 3002; this is a workspace choice, not a required port.

For local browser testing of the exact HTTPS origin, a VM-only TLS listener and
Chrome host mapping can bypass the public edge:

```text
--host-resolver-rules=MAP <preview-host> 127.0.0.1:<local-tls-port>
```

Use a private self-signed certificate, Playwright `ignoreHTTPSErrors: true`, and
the browser's actual supported executable. Keep storage state mode 0600. This
tests same-origin app behavior; separately verify or disclose the untested
Conductor edge. Wait for the requested page and image to finish loading before
taking a screenshot. A drawer's appearance can precede its contents.

## YouTube Analytics Checks

For the app in `packages/twenty-apps/internal/youtube-analytics`, verify native
Add Connection, App Preferences → Analytics, validated timeframe tags, the
YouTube Channels table and record page, and the Refresh Analytics action.
Use the public demo record only with authorized YouTube quota use. Do not run
the production 90-channel batch as a preview test. Refer to the app README for
calculation semantics rather than duplicating them in this skill.
