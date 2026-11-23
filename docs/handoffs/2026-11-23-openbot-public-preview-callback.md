# OpenBot Public Preview Callback

Kareem reported that a routine received HTTP 403 while posting its reply. The
VM reproduced that status from Conductor’s public preview, with the response:
`This preview only accepts same-origin requests.` The same unsigned request
reached Twenty’s validation locally. The public rejection happened before the
app callback, so changing the reply code or HMAC would not fix it.

## VM Change

A separate temporary Cloudflare Quick Tunnel exposes a callback-only relay on
loopback port 3550. Only `POST /s/openbot/reply` is forwarded to the VM backend.
The relay requires JSON, signature/timestamp header shapes and a bounded body;
the app still checks the actual HMAC, request expiry, source permissions and
idempotency. Browser routes, metadata, GraphQL, query-string variants and other
methods are unavailable through this relay. It forwards no browser credentials
and records only callback statuses, not request bodies or signatures.

Only the isolated app’s `OPENBOT_REPLY_URL` was updated. Its connection
fingerprint was unchanged; bot webhook URLs, secrets and policies were preserved.
The CRM remains behind Conductor protection. No live OpenBot configuration,
routine, or production service was accessed or changed.

Runtime files are private, untracked files under `.context/`:

- `openbot-callback-relay.cjs`: route-restricted ingress.
- `openbot-callback-supervisor.py`: relay/tunnel restart loop and PID/log files.
- `openbot-callback-url-watcher.py`: watches tunnel hostname changes and updates
  only the VM callback variable. If the saved URL was separately changed, it
  suspends updates instead of overwriting the new choice.
- `openbot-callback-managed.json`: managed URL state, without bot credentials.

The binary came from Cloudflare’s official release with its published SHA-256
verified. Quick Tunnel hostnames can change when their connector process is
recreated; this is a preview facility, not a production URL or uptime promise.
See [Cloudflare’s Quick Tunnel documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
Detached processes survive shell exit while this VM runs; VM shutdown recovery
has not been established.

## Verification And Retry

Public HTTPS checks returned 404 for root, metadata, GraphQL and a callback with
extra query parameters; the unsigned exact callback returned 401. An incorrect
signature for a known synthetic delivery returned the app’s 401 response.
Conductor’s metadata endpoint remained protected.

The current saved target was checked to be the local Preview Bot before sending
one synthetic native Agent request. Its fixture applied the actual OpenBot
source redactor, signed with `reply.code`, and posted through the public tunnel
without the previous local TLS mapping. The relay and app returned 200, and the
native Agent conversation contained the attributed reply. No owner-configured
external bot was triggered by this verification.

Send a fresh CRM request so its event carries the updated callback URL. Saved
old events retain their former URL. Routine delivery receipts must distinguish
work completion from callback delivery: only HTTP 200 confirms a reply was
posted. Keep failed callback attempts retryable using the same delivery ID and
answer, plus a fresh timestamp/signature, without repeating the original work.
A 403 must not permanently mark the callback as delivered.

This supersedes the public-ingress verification limitation in the earlier
[native Agent handoff](2026-11-23-openbot-native-agent-runtime.md) for the new
callback-only URL. It does not claim a successful callback from the owner’s
live OpenBot instance.
