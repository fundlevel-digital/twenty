// Unipile archive for the LinkedIn Sync app.
//
//   POST /unipile/webhook   Unipile's webhook endpoint. Checks the signature, stores the event in D1,
//                           then forwards the untouched request to the Twenty app. Events Twenty did
//                           not accept are re-sent by the 10-minute cron (re-signed), up to 5 times.
//   POST /objects           The Twenty app sends the raw objects it read from Unipile (bearer token).
//   GET  /events            List stored events, newest first (bearer token). ?type= ?account_id= ?before_id= ?limit=
//   GET  /objects/:kind/:id One stored object (bearer token).
//   GET  /health

export interface Env {
  DB: D1Database;
  UNIPILE_WEBHOOK_SECRET: string;
  INGEST_TOKEN: string;
  TWENTY_WEBHOOK_URL: string;
}

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const MAX_OBJECTS_PER_REQUEST = 500;
const STATEMENTS_PER_BATCH = 50;
const FORWARD_TIMEOUT_MS = 90_000;
const MAX_FORWARD_ATTEMPTS = 5;
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
const RETRIES_PER_RUN = 20;
const KINDS = new Set(['account', 'profile', 'sales_navigator_profile', 'relation', 'sent_request', 'received_request', 'chat', 'message']);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

const constantTimeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
};

// Unipile signs "<t>.<raw body>" with HMAC-SHA256; header "unipile-signature: t=<unix>,v0=<hex>".
export const verifySignature = async (header: string | null, rawBody: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)) => {
  if (!header || !secret) return false;
  const parts = new Map(
    header.split(',').map((part) => {
      const separator = part.indexOf('=');
      return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()] as [string, string];
    }),
  );
  const timestamp = parts.get('t');
  const signature = parts.get('v0');
  if (!timestamp || !signature) return false;
  if (!Number.isFinite(Number(timestamp)) || Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
  return constantTimeEqual(expected, signature.toLowerCase());
};

const isAuthorized = (request: Request, env: Env) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return Boolean(env.INGEST_TOKEN) && constantTimeEqual(token, env.INGEST_TOKEN);
};

const handleWebhook = async (request: Request, env: Env) => {
  const rawBody = await request.text();
  const signature = request.headers.get('unipile-signature');
  if (!(await verifySignature(signature, rawBody, env.UNIPILE_WEBHOOK_SECRET))) return json({ error: 'Invalid signature' }, 401);

  let event: any = {};
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Body is not JSON' }, 400);
  }
  const now = new Date().toISOString();
  const eventId = typeof event?.id === 'string' && event.id ? event.id : null;
  const accountId = event?.account_id ?? event?.payload?.account?.id ?? null;
  const type = event?.type ?? event?.event ?? null;

  // Store first, so the event is kept even when Twenty is down.
  const stored = eventId
    ? await env.DB.prepare(
        `INSERT INTO unipile_event (event_id, type, account_id, received_at, last_delivery_at, payload)
         VALUES (?1, ?2, ?3, ?4, ?4, ?5)
         ON CONFLICT (event_id) DO UPDATE SET deliveries = deliveries + 1, last_delivery_at = ?4
         RETURNING id`,
      )
        .bind(eventId, type, accountId, now, rawBody)
        .first<{ id: number }>()
    : await env.DB.prepare(
        `INSERT INTO unipile_event (type, account_id, received_at, last_delivery_at, payload) VALUES (?1, ?2, ?3, ?3, ?4) RETURNING id`,
      )
        .bind(type, accountId, now, rawBody)
        .first<{ id: number }>();

  const status = await forward(env, stored?.id ?? -1, rawBody, signature ?? '');
  // Stored either way; a failed forward is retried by the scheduled job, so Unipile need not retry.
  return json({ stored: stored?.id ?? null, forwarded: status });
};

const sign = async (secret: string, rawBody: string) => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return `t=${timestamp},v0=${hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`)))}`;
};

// Sends one stored event to the Twenty app and records Twenty's answer.
const forward = async (env: Env, id: number, rawBody: string, signature: string) => {
  let status: number | null = null;
  let answer = '';
  try {
    const response = await fetch(env.TWENTY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'unipile-signature': signature || (await sign(env.UNIPILE_WEBHOOK_SECRET, rawBody)) },
      body: rawBody,
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
    status = response.status;
    answer = (await response.text()).slice(0, 2000);
  } catch (error) {
    answer = `Forward failed: ${String((error as Error)?.message ?? error)}`.slice(0, 2000);
  }
  await env.DB.prepare('UPDATE unipile_event SET forward_status = ?1, forward_response = ?2, forward_attempts = forward_attempts + 1 WHERE id = ?3')
    .bind(status, answer, id)
    .run();
  return status;
};

// Every 10 minutes: re-send events Twenty did not accept (unreachable, or a 5xx), oldest first, up to
// 5 attempts within a day. Re-signed with the shared secret, since the original signature expires.
const retryFailedForwards = async (env: Env) => {
  const since = new Date(Date.now() - RETRY_WINDOW_MS).toISOString();
  const { results } = await env.DB.prepare(
    `SELECT id, payload FROM unipile_event
     WHERE (forward_status IS NULL OR forward_status >= 500) AND forward_attempts < ?1 AND received_at > ?2
     ORDER BY id LIMIT ?3`,
  )
    .bind(MAX_FORWARD_ATTEMPTS, since, RETRIES_PER_RUN)
    .all<{ id: number; payload: string }>();
  for (const row of results) await forward(env, row.id, row.payload, '');
  return results.length;
};

type IncomingObject = { kind: string; id: string; payload: unknown };

const handleObjects = async (request: Request, env: Env) => {
  if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  let body: { accountId?: string; objects?: IncomingObject[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body is not JSON' }, 400);
  }
  const objects = Array.isArray(body.objects) ? body.objects : [];
  if (!body.accountId) return json({ error: 'accountId is required' }, 400);
  if (objects.length > MAX_OBJECTS_PER_REQUEST) return json({ error: `At most ${MAX_OBJECTS_PER_REQUEST} objects per request` }, 413);
  const bad = objects.find((object) => !KINDS.has(object?.kind) || typeof object?.id !== 'string' || !object.id);
  if (bad) return json({ error: 'Every object needs a known kind and a string id', example: bad }, 400);

  const now = new Date().toISOString();
  const statement = env.DB.prepare(
    `INSERT INTO unipile_object (kind, unipile_id, account_id, payload, first_seen_at, fetched_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?5)
     ON CONFLICT (kind, unipile_id) DO UPDATE SET payload = excluded.payload, account_id = excluded.account_id, fetched_at = excluded.fetched_at`,
  );
  for (let index = 0; index < objects.length; index += STATEMENTS_PER_BATCH) {
    await env.DB.batch(
      objects
        .slice(index, index + STATEMENTS_PER_BATCH)
        .map((object) => statement.bind(object.kind, object.id, body.accountId, JSON.stringify(object.payload ?? null), now)),
    );
  }
  return json({ stored: objects.length });
};

const handleListEvents = async (request: Request, env: Env) => {
  if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 500);
  const where: string[] = [];
  const values: unknown[] = [];
  for (const [param, column] of [
    ['type', 'type'],
    ['account_id', 'account_id'],
  ] as const) {
    const value = url.searchParams.get(param);
    if (value) {
      values.push(value);
      where.push(`${column} = ?${values.length}`);
    }
  }
  const beforeId = Number(url.searchParams.get('before_id'));
  if (beforeId > 0) {
    values.push(beforeId);
    where.push(`id < ?${values.length}`);
  }
  values.push(limit);
  const { results } = await env.DB.prepare(
    `SELECT id, event_id, type, account_id, received_at, deliveries, forward_status, forward_response, payload
     FROM unipile_event ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT ?${values.length}`,
  )
    .bind(...values)
    .all();
  return json({ events: results.map((row: any) => ({ ...row, payload: JSON.parse(row.payload) })) });
};

const handleGetObject = async (request: Request, env: Env, kind: string, id: string) => {
  if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  const row = await env.DB.prepare('SELECT * FROM unipile_object WHERE kind = ?1 AND unipile_id = ?2').bind(kind, id).first<any>();
  return row ? json({ ...row, payload: JSON.parse(row.payload) }) : json({ error: 'Not found' }, 404);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    try {
      if (request.method === 'POST' && path === '/unipile/webhook') return await handleWebhook(request, env);
      if (request.method === 'POST' && path === '/objects') return await handleObjects(request, env);
      if (request.method === 'GET' && path === '/events') return await handleListEvents(request, env);
      const objectMatch = path.match(/^\/objects\/([a-z_]+)\/(.+)$/);
      if (request.method === 'GET' && objectMatch) return await handleGetObject(request, env, objectMatch[1], decodeURIComponent(objectMatch[2]));
      if (path === '/health') return json({ ok: true });
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      console.error('unipile-archive error', error);
      return json({ error: String((error as Error)?.message ?? error) }, 500);
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(retryFailedForwards(env).then((count) => console.log(`retried ${count} event forwards`)));
  },
};
