---
name: twenty-remote-preview
description: Set up, restore and verify an isolated Twenty CRM preview on a remote VM, including Conductor URLs, persistent server/worker/frontend processes and app upload troubleshooting.
---

# Twenty Remote Previews

Read the repository rules and relevant decision records first. Detect the
environment rather than assuming access to the owner's Mac. In Conductor,
`CONDUCTOR_IS_LOCAL=0` means the cloud VM; `CONDUCTOR_PORT` is not allocated there.
Use the bundled Conductor skill, when available, for Conductor actions and
repository configuration. Its CLI is `conductor --help`.

Use an isolated development database and workspace. Preserve an existing
preview's records, connections and saved preferences when recovering it.
Preview work does not authorize production deployment, copying production CRM
data, or running a paid/quota-consuming batch. Use a public demo channel only
when a real external refresh is authorized, and disclose that quota use.

## Choose The Workflow

- **New VM or source UI changes:** follow [VM setup](references/vm-setup.md).
  Run the frontend from this checkout. The server, worker and frontend must all
  remain alive after the command tool returns.
- **Existing preview unavailable:** use the recovery checks in that reference.
  Inspect its listeners, logs and containers before rerunning setup or seeding.
- **SDK app work or slow source frontend:** read
  [app previews and asset fallback](references/app-previews.md). A cached shell
  can validate an app in an existing host UI, but does not verify modified host
  frontend source. State which frontend is being served.

## Public And Internal Origins

Expose one origin that serves the frontend and proxies Twenty APIs to the VM
backend. Point `SERVER_URL` and `FRONTEND_URL` at that public origin. For the
LOCAL logic-function driver, set `SERVER_INTERNAL_URL` to the backend address
reachable by both server and worker, typically `http://localhost:3000` on the
same VM. Do not set a localhost internal URL for Lambda functions on another
network.

Keep the Vite API proxy target local. Confirm the browser uses the public
origin for API requests; a browser on the owner's Mac cannot use the VM's
`localhost`. Avoid a public-origin proxy loop. Cached frontend HTML must have
production bootstrap configuration removed and its server origin replaced.

## Verify Before Sharing

Check backend health, the public port's proxied health endpoint, login, the
requested page, relevant API responses and browser errors. An HTTP 200 shell or
startup page alone does not prove the app is ready. If app logic changes schema,
confirm the worker processes deferred metadata jobs. Verify an actual image
loads when testing file uploads or avatars.

Distinguish Conductor's anonymous sign-in gate from an app outage: an anonymous
401 can be expected, while a 502 with missing listeners needs service recovery.
Test the authenticated public URL when possible. A browser using local TLS and
host mapping tests the app origin but bypasses Conductor's edge; disclose that
limit rather than claiming the public edge was verified.

Save screenshots under `.context/`. Report the URL, what was seeded and checked,
any external calls made, and how the preview processes survive or restart. Keep
credentials, browser state, TLS keys and local connection files private and
untracked. Do not claim a preview survives a VM shutdown unless a wake mechanism
has been configured and verified.
