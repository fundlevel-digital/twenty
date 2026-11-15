// Sends the raw Unipile objects the app read to the Unipile archive Worker (D1), exactly as returned.
// Archiving never blocks the sync: Unipile stays the source of truth, so a failed batch is logged
// and the object is stored again the next time it is read.

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

let failures = 0;
export const archiveFailures = () => failures;

export const archive = async (kind: ArchiveKind, unipileAccountId: string, items: any[], idOf: (item: any) => unknown = (item) => item?.id) => {
  const url = process.env.ARCHIVE_URL;
  const token = process.env.ARCHIVE_TOKEN;
  if (!url || !token || items.length === 0) return;
  const objects = items
    .map((payload) => ({ kind, id: String(idOf(payload) ?? ''), payload }))
    .filter((object) => object.id);
  for (let index = 0; index < objects.length; index += MAX_PER_REQUEST) {
    try {
      const response = await fetch(`${url.replace(/\/+$/, '')}/objects`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'user-agent': 'fundlevel-linkedin-sync' },
        body: JSON.stringify({ accountId: unipileAccountId, objects: objects.slice(index, index + MAX_PER_REQUEST) }),
      });
      if (!response.ok) {
        failures++;
        console.warn(`[linkedin] archive ${kind} failed: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
      }
    } catch (error) {
      failures++;
      console.warn(`[linkedin] archive ${kind} failed: ${String((error as Error)?.message ?? error)}`);
    }
  }
};
