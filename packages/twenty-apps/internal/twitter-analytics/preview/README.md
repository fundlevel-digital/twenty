# Protected Preview Function Routes

The embedded renderer omits page cookies for `/s` routes because HTTP handlers
receive request headers. Conductor requires its access cookie, so these requests
can receive a plain-text 401 before reaching Twenty. Signing into the CRM again
does not fix that access gate.

For this isolated preview, `app-function-proxy.cjs` listens on port 3002 and proxies
the host on port 3000. Its four allowlisted routes under
`/rest/twitter-preview-functions/twitter-analytics/` map to the corresponding
`/s/twitter-analytics/` route. The renderer sends page cookies to `/rest`, allowing
Conductor to authenticate the request. The proxy then forwards only Authorization,
Content-Type, Accept, Origin and Host to the function. Cookies and access-proxy
identity headers are excluded. Native app bearer authentication is still required.
Other host requests and upgraded connections retain their normal behavior.

Run the proxy in a supervised process or container, then register port 3002 with
`conductor preview set --port 3002`. In the ignored preview app copy only, rewrite
the settings, backfill, Influencer import and refresh front-component request
paths to the alias prefix. Keep backend trigger paths and production source paths
unchanged. Preserve the existing preview-only cron and avatar-upload adjustments.
The proxy is an operational helper and is not a native app entry point.

Check header handling and upgraded connections with:

```sh
node --test preview/app-function-proxy.test.cjs
```

`PREVIEW_PROXY_DIAGNOSTICS=true` logs request paths, status codes and cookie
presence, never credential values or response bodies. It is off by default.
Verify both a cookie-gated browser and the real authenticated public preview;
an ungated local TLS proxy cannot reproduce this failure. See the
[handoff](../../../../../docs/handoffs/2026-11-22-twitter-analytics.md).
