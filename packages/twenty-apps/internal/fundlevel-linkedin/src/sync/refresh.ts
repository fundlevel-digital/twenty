import { accountSnapshot } from 'src/lib/mappers';
import { withCursor, type Unipile, type UnipilePage } from 'src/lib/unipile';
import { profileFields, updateAccount, upsertAccountSnapshot } from 'src/sync/accounts';

const PROFILE_HOUR_UTC = 9;

// Re-reads every LinkedIn account Unipile has and updates its record. Profile details (real
// profile URL, picture, Sales Navigator ID) cost extra LinkedIn lookups, so they are refreshed
// once a day; a failed lookup leaves the stored values alone.
export const refreshAccounts = async (unipile: Unipile, { withProfiles = new Date().getUTCHours() === PROFILE_HOUR_UTC } = {}) => {
  const raw: any[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page++) {
    const body: UnipilePage<any> = await unipile.get(withCursor('/accounts/?limit=100', cursor));
    raw.push(...(body.data ?? []));
    cursor = body.next_cursor || null;
    if (!cursor || (body.data ?? []).length === 0) break;
  }

  const results: { name: string; id?: string; profile?: string }[] = [];
  for (const snapshot of raw.map(accountSnapshot)) {
    if (!snapshot) continue;
    const id = await upsertAccountSnapshot(snapshot);
    const result: { name: string; id?: string; profile?: string } = { name: snapshot.name, id };
    if (withProfiles && (snapshot.status === 'RUNNING' || snapshot.status === 'DEGRADED')) {
      try {
        const me = await unipile.get(`/${snapshot.unipileAccountId}/users/me`);
        let salesNavigatorId = '';
        if (snapshot.products.includes('SALES_NAVIGATOR')) {
          const sales = await unipile.get(
            `/${snapshot.unipileAccountId}/users/${encodeURIComponent(snapshot.linkedinUserId)}?variant=linkedin_sales_navigator`,
          );
          salesNavigatorId = sales?.id ?? '';
        }
        await updateAccount(
          id,
          profileFields(
            me?.profile_url || `https://www.linkedin.com/in/${snapshot.linkedinUserId}`,
            me?.public_picture_url_large || me?.public_picture_url || '',
            salesNavigatorId,
          ),
        );
        result.profile = 'updated';
      } catch (error) {
        result.profile = `skipped: ${String((error as Error)?.message ?? error).slice(0, 120)}`;
      }
    }
    results.push(result);
  }
  return { accounts: results.length, results };
};
