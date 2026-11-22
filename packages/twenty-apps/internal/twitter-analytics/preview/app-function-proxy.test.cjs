const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const { once } = require('node:events');
const { createPreviewProxy } = require('./app-function-proxy.cjs');

test('preview aliases retain app authorization and exclude proxy credentials', async () => {
  const upstream = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({ path: request.url, headers: request.headers }),
    );
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const proxy = createPreviewProxy({ upstreamPort: upstream.address().port });
  proxy.listen(0, '127.0.0.1');
  await once(proxy, 'listening');
  const origin = 'http://127.0.0.1:' + proxy.address().port;
  try {
    const headers = {
      Authorization: 'Bearer example-app-token',
      Cookie: 'example-preview-gate=test',
      'Cf-Access-Jwt-Assertion': 'example-access-identity',
      'X-Goog-IAP-JWT-Assertion': 'example-iap-identity',
      'X-Conductor-Identity': 'example-identity',
    };
    const settings = await fetch(
      origin +
        '/rest/twitter-preview-functions/twitter-analytics/relation-settings?test=1',
      { headers },
    );
    assert.equal(settings.status, 200);
    const body = await settings.json();
    assert.equal(body.path, '/s/twitter-analytics/relation-settings?test=1');
    assert.equal(body.headers.authorization, headers.Authorization);
    for (const name of [
      'cookie',
      'cf-access-jwt-assertion',
      'x-goog-iap-jwt-assertion',
      'x-conductor-identity',
    ])
      assert.equal(body.headers[name], undefined);
    const normal = await fetch(origin + '/metadata', { headers });
    assert.equal((await normal.json()).headers.cookie, headers.Cookie);
    assert.equal(
      (
        await fetch(
          origin +
            '/rest/twitter-preview-functions/twitter-analytics/backfill-relations',
          { headers },
        )
      ).status,
      405,
    );
    assert.equal(
      (
        await fetch(origin + '/rest/twitter-preview-functions/unapproved', {
          headers,
        })
      ).status,
      404,
    );
    const backfill = await fetch(
      origin +
        '/rest/twitter-preview-functions/twitter-analytics/backfill-relations',
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: '{"dryRun":true}',
      },
    );
    assert.equal(
      (await backfill.json()).path,
      '/s/twitter-analytics/backfill-relations',
    );
  } finally {
    await Promise.all([
      new Promise((resolve) => proxy.close(resolve)),
      new Promise((resolve) => upstream.close(resolve)),
    ]);
  }
});

test('preserves upgraded connections used by native live updates', async () => {
  const upstreamSockets = new Set();
  const upstream = http.createServer();
  upstream.on('upgrade', (_request, socket) => {
    upstreamSockets.add(socket);
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: preview-test\r\n\r\n',
    );
    socket.on('data', (data) => socket.write(data));
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const proxy = createPreviewProxy({ upstreamPort: upstream.address().port });
  proxy.listen(0, '127.0.0.1');
  await once(proxy, 'listening');
  const connection = net.connect(proxy.address().port, '127.0.0.1');
  try {
    await once(connection, 'connect');
    const handshake = once(connection, 'data');
    connection.write(
      'GET /graphql HTTP/1.1\r\nHost: preview.local\r\nConnection: Upgrade\r\nUpgrade: preview-test\r\n\r\n',
    );
    assert.match((await handshake)[0].toString(), /101 Switching Protocols/);
    const echoed = once(connection, 'data');
    connection.write('preview-connection-test');
    assert.equal((await echoed)[0].toString(), 'preview-connection-test');
  } finally {
    connection.destroy();
    for (const socket of upstreamSockets) socket.destroy();
    await Promise.all([
      new Promise((resolve) => proxy.close(resolve)),
      new Promise((resolve) => upstream.close(resolve)),
    ]);
  }
});
