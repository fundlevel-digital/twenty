import { type AppConnection, listConnections } from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';
import { findAll, graphql, upsertMany } from 'src/lib/twenty';
import { getUnipileUser } from 'src/unipile/utils/get-unipile-user.util';
import { withLinkedinLease } from 'src/unipile/utils/with-unipile-account-request.util';

export type LinkedAccount = {
  id: string;
  name: string;
  unipileAccountId: string;
  linkedinUserId: string;
  ownerId: string | null;
  connectedAccountId: string | null;
  legacyUnipileAccountId?: string | null;
};
export const ensureLinkedinAccount = async (
  connection: AppConnection,
): Promise<LinkedAccount> => {
  const externalAccountId = connection.externalAccountId;
  if (!isDefined(externalAccountId) || !isDefined(connection.workspaceMemberId))
    throw new Error('LinkedIn connection has no account or workspace member');
  return withLinkedinLease(
    `account-binding:${externalAccountId}`,
    async () => {
      const selection =
        'id name unipileAccountId linkedinUserId ownerId connectedAccountId legacyUnipileAccountId';
      const [bound] = await findAll<LinkedAccount>(
        'linkedinAccounts',
        { unipileAccountId: { eq: externalAccountId } },
        selection,
        { max: 1 },
      );
      const profile = isDefined(bound)
        ? undefined
        : await getUnipileUser({ accountId: externalAccountId, userId: 'me' });
      const [legacy] = isDefined(profile)
        ? await findAll<LinkedAccount>(
            'linkedinAccounts',
            { linkedinUserId: { eq: profile.id } },
            selection,
            { max: 1 },
          )
        : [];
      const existing = bound ?? legacy;
      if (
        isDefined(existing?.ownerId) &&
        existing.ownerId !== connection.workspaceMemberId
      )
        throw new Error('This LinkedIn account belongs to another member');
      if (
        isDefined(existing?.connectedAccountId) &&
        existing.connectedAccountId !== connection.id
      ) {
        const active = await listConnections({
          providerName: connection.providerName,
        });
        if (
          active.some(
            (candidate) => candidate.id === existing.connectedAccountId,
          )
        )
          throw new Error('This LinkedIn account is already connected');
      }
      const linkedinUserId = existing?.linkedinUserId ?? profile?.id;
      if (!isDefined(linkedinUserId))
        throw new Error('LinkedIn profile has no stable member ID');
      const record = {
        name: connection.name,
        unipileAccountId: externalAccountId,
        linkedinUserId,
        legacyUnipileAccountId:
          existing?.legacyUnipileAccountId ??
          existing?.unipileAccountId ??
          null,
        connectedAccountId: connection.id,
        ownerId: connection.workspaceMemberId,
        ownerUserWorkspaceId: connection.userWorkspaceId,
        status: 'RUNNING',
      };
      const id = isDefined(existing)
        ? (
            await graphql<{ updateLinkedinAccount: { id: string } }>(
              'mutation($id:UUID!,$data:LinkedinAccountUpdateInput!){updateLinkedinAccount(id:$id,data:$data){id}}',
              { id: existing.id, data: record },
            )
          ).data.updateLinkedinAccount.id
        : (
            await upsertMany('linkedinAccount', 'linkedinAccounts', [record])
          )[0];
      if (!isDefined(id)) throw new Error('Could not save LinkedIn account');
      return {
        id,
        name: connection.name,
        unipileAccountId: externalAccountId,
        linkedinUserId,
        ownerId: connection.workspaceMemberId,
        connectedAccountId: connection.id,
        legacyUnipileAccountId:
          existing?.legacyUnipileAccountId ?? existing?.unipileAccountId,
      };
    },
    { spacingMilliseconds: 0 },
  );
};
