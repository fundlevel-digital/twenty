# VM Setup And Recovery

These paths and commands were checked against this repository on 2026-11-21.
Read current `project.json`, `.env.example` and Vite configuration before using
them on another revision. Run commands from the repository root unless noted.

## Inspect Or Initialize

Inspect `.context/`, active listeners, existing Docker containers and preview
logs first. An existing database or connection is not disposable just because
the preview is unavailable. Do not print `.env` values while inspecting them.

For a fresh workspace:

```bash
yarn install --immutable
npx nx build twenty-shared --skip-nx-cache
bash packages/twenty-utils/setup-dev-env.sh
```

The setup helper starts PostgreSQL/Redis and initializes the development schema.
It invokes `reset:env` targets when dependencies are installed: inspect those
targets and preserve existing preview environment files before rerunning it.
Do not use its `--reset` option to recover a stopped service. If demo data is
absent in a newly initialized development database, use the repository's
`workspace:seed:dev` command through `nx command-no-deps`, after checking its
current arguments. `database:reset` is destructive and is not a restart command.

On restricted Linux VMs, Docker may need host networking. The tested sandbox
used PostgreSQL 16 and Redis 7, with an existing daemon started using
`sudo dockerd --iptables=false --bridge=none`. This is a fallback for environments
without bridge/iptables support, not the default Docker setup. Start existing
containers instead of replacing their volumes. Install missing system packages
with the VM's package manager, such as `dnf` on Amazon Linux.

## Configure One Public Origin

In a Conductor cloud workspace, register the frontend port and obtain its URL:

```bash
conductor preview set --port 3001
conductor preview get
```

Before starting server and worker, configure their private development
environment with the returned HTTPS origin:

```dotenv
SERVER_URL=https://<preview-host>
FRONTEND_URL=https://<preview-host>
SERVER_INTERNAL_URL=http://localhost:3000
LOGIC_FUNCTION_TYPE=LOCAL
```

Use the existing development database/Redis settings and a private `APP_SECRET`.
Do not overwrite them with production values. `SERVER_INTERNAL_URL` is only for
the LOCAL driver and must be reachable from both server and worker.

The frontend's development environment normally uses:

```dotenv
VITE_HOST=0.0.0.0
REACT_APP_PORT=3001
REACT_APP_SERVER_BASE_URL=http://localhost:3000
```

In the checked Vite configuration, `REACT_APP_SERVER_BASE_URL` chooses the API
proxy's backend target; the browser's `src/config/index.ts` falls back to
`window.location.origin` when no runtime override is injected. Inspect rendered
HTML and browser requests to confirm this. Do not set Vite's proxy target to its
own public origin. If Vite blocks the preview hostname, allow that exact host in
workspace-local configuration rather than disabling host checks globally.

Vite builds its API matchers from
`packages/twenty-front/src/config/apiProxyPrefixes.ts`. A custom proxy must cover
the current `ApiPath` list, including GraphQL, metadata, auth, app assets, files,
client config and `/s/` logic functions. Support WebSocket upgrades when the
feature under test needs subscriptions or HMR.

## Start Processes Persistently

The repository's normal foreground command is:

```bash
yarn start
```

It starts the frontend, backend and queue worker. A Conductor run action should
keep its processes in the same managed group. For an ephemeral command tool on a
cloud VM, a detached supervisor is an alternative. This verified launch pattern
keeps a process alive after the tool returns:

```python
from pathlib import Path
import json
import subprocess

repository = Path.cwd()
context = repository / '.context'
context.mkdir(exist_ok=True)
with (context / 'preview.log').open('ab') as output:
    process = subprocess.Popen(
        ['yarn', 'start'], cwd=repository,
        stdin=subprocess.DEVNULL, stdout=output,
        stderr=subprocess.STDOUT, start_new_session=True,
    )
(context / 'preview-process.json').write_text(json.dumps({'pid': process.pid}))
```

Check for an existing matching process before launching a second stack. A PID
file alone is insufficient: verify the command and working directory. Detached
launch does not itself restart a crashed process or survive a VM shutdown. For a
long-lived preview, configure the available process supervisor or Conductor wake
action to restore the same stack and verify that behavior. Shell-only `nohup`
was terminated by this sandbox's tool wrapper; do not assume it is persistent.

For SDK-only work with a previously built server, the tested lightweight commands
run in `packages/twenty-server`:

```bash
NODE_ENV=development node dist/main.js
NODE_ENV=development node dist/queue-worker/queue-worker
```

Build first when source or branch changes make `dist` stale. Keep both processes
under supervision. The worker is required for deferred schema/index operations.

## Health And Recovery

Check both backend and exposed frontend/proxy paths:

```bash
curl --fail http://localhost:3000/healthz
curl --fail http://localhost:3001/healthz
```

Then check login and the requested page in a browser. In the seeded development
workspace, use Continue With Email and the prefilled credentials.

| Symptom                                                  | Next check                                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Public 502                                               | Published port, proxy listener, Docker, PostgreSQL/Redis, backend and worker logs |
| Anonymous public 401                                     | Conductor edge sign-in; test the owner's authenticated browser                    |
| Shell loads, requests hit a production host or localhost | Runtime HTML/client configuration and proxy target                                |
| Logic function callbacks fail behind edge auth           | LOCAL driver's `SERVER_INTERNAL_URL` in server and worker                         |
| Schema changes hang or metrics columns are missing       | Worker logs and deferred schema jobs                                              |
| Services disappear after a tool returns                  | Process parent/group and detached launch or supervisor                            |

On recovery, restart the existing services with their original data. Re-register
the public port if needed. Do not reset the database or remove saved API-key
connections to repair routing, expired CLI auth or stopped processes.
