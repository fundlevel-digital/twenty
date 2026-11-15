import { links, type AccountSnapshot } from 'src/lib/mappers';
import { findAll, updateEach, upsertMany } from 'src/lib/twenty';

export type AccountRow = {
  id: string;
  name: string | null;
  unipileAccountId: string;
  linkedinUserId: string;
  status: string | null;
  products: string[] | null;
  syncStage: string | null;
  syncState: Record<string, any> | null;
};

const ACCOUNT_SELECTION = 'id name unipileAccountId linkedinUserId status products syncStage syncState';

export const listAccounts = () => findAll<AccountRow>('linkedinAccounts', {}, ACCOUNT_SELECTION, { max: 200 });

export const findAccountByUnipileId = async (unipileAccountId: string) =>
  (await findAll<AccountRow>('linkedinAccounts', { unipileAccountId: { eq: unipileAccountId } }, ACCOUNT_SELECTION, { max: 1 }))[0];

// Account records are matched on the LinkedIn User ID: it survives a re-link in Unipile, while the
// Unipile account ID does not.
export const upsertAccountSnapshot = async (snapshot: AccountSnapshot, extra: Record<string, unknown> = {}) => {
  const [id] = await upsertMany('linkedinAccount', 'linkedinAccounts', [
    {
      linkedinUserId: snapshot.linkedinUserId,
      unipileAccountId: snapshot.unipileAccountId,
      name: snapshot.name,
      status: snapshot.status,
      products: snapshot.products,
      proxyHost: snapshot.proxyHost,
      proxyPort: snapshot.proxyPort,
      proxyAuto: snapshot.proxyAuto,
      proxyUsername: snapshot.proxyUsername,
      ...snapshot.details,
      ...extra,
    },
  ]);
  return id;
};

export const updateAccount = async (id: string, data: Record<string, unknown>) => {
  const failures = await updateEach('linkedinAccount', [{ id, data }]);
  if (failures.length > 0) throw new Error(`Could not update LinkedIn Account: ${failures[0].error}`);
};

export const profileFields = (profileUrl: string, pictureUrl: string, salesNavigatorId: string) => ({
  profileLink: links(profileUrl),
  ...(pictureUrl ? { profilePictureUrl: pictureUrl } : {}),
  ...(salesNavigatorId ? { salesNavigatorId } : {}),
});
