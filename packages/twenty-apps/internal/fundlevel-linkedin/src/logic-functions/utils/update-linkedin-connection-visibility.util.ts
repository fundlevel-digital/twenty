import { RestApiClient } from 'twenty-client-sdk/rest';
import { type AppConnection, kv } from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';
import { findAll, graphql } from 'src/lib/twenty';
import { ensureLinkedinAccount } from 'src/logic-functions/utils/ensure-linkedin-account.util';
import { isLinkedinConnectionPrivacyReady } from 'src/logic-functions/utils/is-linkedin-connection-privacy-ready.util';

export const updateLinkedinConnectionVisibility = async (
  connection: AppConnection,
  visibility: 'WORKSPACE' | 'OWNER',
) => {
  if (visibility === 'OWNER' && !(await isLinkedinConnectionPrivacyReady()))
    throw new Error(
      'A workspace administrator must configure LinkedIn record permissions before enabling owner-only connections.',
    );
  const account = await ensureLinkedinAccount(connection);
  const objectMetadataId = await kv.get<string>(
    'linkedin-private-records-connection-object-id',
  );
  if (!isDefined(objectMetadataId))
    throw new Error(
      'Configure native LinkedIn privacy before changing visibility.',
    );
  const records = await findAll<{ id: string }>(
    'linkedinConnections',
    { accountId: { eq: account.id } },
    'id',
    { max: Number.MAX_SAFE_INTEGER },
  );
  const updateVisibility = async () => {
    for (let index = 0; index < records.length; index += 200) {
      await graphql(
        'mutation($filter:LinkedinConnectionFilterInput!,$data:LinkedinConnectionUpdateInput!){updateLinkedinConnections(filter:$filter,data:$data){id}}',
        {
          filter: {
            accountId: { eq: account.id },
            id: {
              in: records.slice(index, index + 200).map((record) => record.id),
            },
          },
          data: { visibility, ownerId: connection.workspaceMemberId },
        },
      );
    }
  };
  // Restrict before marking records private; publish only after marking them shared.
  if (visibility === 'WORKSPACE') await updateVisibility();
  for (let index = 0; index < records.length; index += 30) {
    await Promise.all(
      records.slice(index, index + 30).map(async (record) => {
        const result = await new RestApiClient().post<{
          errors?: { message: string }[];
        }>('/metadata', {
          query:
            'mutation($target:RecordTargetInput!,$isPrivate:Boolean!){setRecordPrivate(target:$target,isPrivate:$isPrivate){isPrivate}}',
          variables: {
            target: { objectMetadataId, recordId: record.id },
            isPrivate: visibility === 'OWNER',
          },
        });
        if (result.errors?.length)
          throw new Error(
            result.errors.map((error) => error.message).join('; '),
          );
      }),
    );
  }
  if (visibility === 'OWNER') await updateVisibility();
};
