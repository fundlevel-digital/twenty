const http = require('node:http');
const net = require('node:net');

const aliasPrefix = '/rest/twitter-preview-functions';
const routes = new Map([
  ['/twitter-analytics/relation-settings', 'GET'],
  ['/twitter-analytics/backfill-relations', 'POST'],
  ['/twitter-analytics/import-influencers', 'POST'],
  ['/twitter-analytics/refresh', 'POST'],
]);
const forwardedFunctionHeaders = new Set([
  'authorization',
  'content-type',
  'accept',
  'origin',
  'host',
]);

const createPreviewProxy = ({
  upstreamPort = 3000,
  diagnostics = false,
} = {}) => {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://preview.local');
    let path = request.url;
    let headers = request.headers;
    if (
      url.pathname === aliasPrefix ||
      url.pathname.startsWith(aliasPrefix + '/')
    ) {
      const route = url.pathname.slice(aliasPrefix.length);
      if (!routes.has(route)) {
        response.writeHead(404);
        response.end('Unknown preview function route');
        return;
      }
      if (request.method !== routes.get(route)) {
        response.writeHead(405, { Allow: routes.get(route) });
        response.end('Method not allowed');
        return;
      }
      // The access gate consumes page cookies; app handlers receive only their own authorization.
      headers = Object.fromEntries(
        Object.entries(request.headers).filter(([key]) =>
          forwardedFunctionHeaders.has(key),
        ),
      );
      path = '/s' + route + url.search;
    }
    const upstream = http.request(
      {
        hostname: '127.0.0.1',
        port: upstreamPort,
        path,
        method: request.method,
        headers,
      },
      (incoming) => {
        if (
          diagnostics &&
          (request.url.startsWith('/s/twitter-analytics/') ||
            request.url.startsWith(aliasPrefix) ||
            request.url === '/metadata')
        )
          console.log(
            JSON.stringify({
              time: new Date().toISOString(),
              path: new URL(request.url, 'http://preview.local').pathname,
              method: request.method,
              status: incoming.statusCode,
              cookiePresent: Boolean(request.headers.cookie),
              platform: (request.headers['user-agent'] || '').includes(
                'Macintosh',
              )
                ? 'mac'
                : 'other',
            }),
          );
        response.writeHead(incoming.statusCode, incoming.headers);
        incoming.pipe(response);
      },
    );
    upstream.on('error', () => {
      if (!response.headersSent)
        response.writeHead(502, { 'Content-Type': 'text/plain' });
      response.end('Preview backend unavailable');
    });
    request.on('aborted', () => upstream.destroy());
    request.pipe(upstream);
  });

  server.on('upgrade', (request, socket, head) => {
    if (request.url.startsWith(aliasPrefix)) {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
      return;
    }
    const upstream = net.connect(upstreamPort, '127.0.0.1', () => {
      let headers = `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`;
      for (let index = 0; index < request.rawHeaders.length; index += 2)
        headers += `${request.rawHeaders[index]}: ${request.rawHeaders[index + 1]}\r\n`;
      upstream.write(headers + '\r\n');
      if (head.length) upstream.write(head);
      socket.pipe(upstream);
      upstream.pipe(socket);
    });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
    socket.on('close', () => upstream.destroy());
  });
  return server;
};
module.exports = { createPreviewProxy };
if (require.main === module)
  createPreviewProxy({
    diagnostics: process.env.PREVIEW_PROXY_DIAGNOSTICS === 'true',
  }).listen(3002, '0.0.0.0');
