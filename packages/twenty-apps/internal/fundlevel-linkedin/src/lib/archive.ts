// Sends the raw Unipile objects the app read to the Unipile archive Worker (D1), exactly as returned.
//
// Archiving is at-least-once: each call is retried, and if it still fails it throws, so the sync step
// that read the objects is not marked done and is retried on the next run (a completed conversation is
// never read again, so a silent failure would be a permanent gap). Objects are keyed on kind + Unipile
// ID, so retries never duplicate anything. When ARCHIVE_URL / ARCHIVE_TOKEN are unset it does nothing.

export type ArchiveKind =
  | 'account'
  | 'profile'
  | 'sales_navigator_profile'
  | 'relation'
  | 'sent_request'
  | 'received_request'
  | 'chat'
  | 'message';

const MAX_PER_REQUEST = 500;
const RETRY_DELAYS_MS = [1000, 3000, 8000];
const REQUEST_TIMEOUT_MS = 30000;

export class ArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchiveError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const send = async (url: string, token: string, body: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${url.replace(/\/+$/, '')}/objects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'user-agent': 'fundlevel-linkedin-sync' },
      body,
      signal: controller.signal,
    });
    if (response.ok) return null;
    return `HTTP ${response.status} ${(await response.text()).slice(0, 200)}`;
  } catch (error) {
    return String((error as Error)?.message ?? error);
  } finally {
    clearTimeout(timer);
  }
};

export const archive = async (kind: ArchiveKind, unipileAccountId: string, items: any[], idOf: (item: any) => unknown = (item) => item?.id) => {
  const url = process.env.ARCHIVE_URL;
  const token = process.env.ARCHIVE_TOKEN;
  if (!url || !token || items.length === 0) return;
  const objects = items.map((payload) => ({ kind, id: String(idOf(payload) ?? ''), payload })).filter((object) => object.id);
  for (let index = 0; index < objects.length; index += MAX_PER_REQUEST) {
    const body = JSON.stringify({ accountId: unipileAccountId, objects: objects.slice(index, index + MAX_PER_REQUEST) });
    let error = await send(url, token, body);
    for (const delay of RETRY_DELAYS_MS) {
      if (!error) break;
      console.warn(`[linkedin] archive ${kind} failed (${error}); retrying in ${delay / 1000}s`);
      await sleep(delay);
      error = await send(url, token, body);
    }
    if (error) throw new ArchiveError(`Could not archive ${kind} objects: ${error}`);
  }
};
