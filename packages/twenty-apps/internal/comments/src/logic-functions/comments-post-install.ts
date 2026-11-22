import { definePostInstallLogicFunction } from 'twenty-sdk/define';
import { graphql } from '../utils/graphql';

export const backfillCommentAuthorKinds = async () => {
  let updated = 0;
  for (const authorType of ['BOT', 'SYSTEM', 'HUMAN']) {
    let remaining = true;
    while (remaining) {
      const result = await graphql<{ updateRecordComments: { id: string }[] }>(
        'mutation($data: RecordCommentUpdateInput!, $filter: RecordCommentFilterInput!) { updateRecordComments(data: $data, filter: $filter) { id } }',
        {
          filter: {
            and: [
              { authorType: { is: 'NULL' } },
              ...(authorType === 'HUMAN'
                ? []
                : [{ authorKind: { eq: authorType } }]),
            ],
          },
          data: { authorType },
        },
        true,
      );
      updated += result.updateRecordComments.length;
      remaining = result.updateRecordComments.length > 0;
    }
  }
  return { updated };
};
export default definePostInstallLogicFunction({
  universalIdentifier: 'b43daa7c-8bf0-40ce-a1e1-c944f8f15845',
  name: 'comments-post-install',
  description:
    'Backfill native author kinds while retaining legacy author fields.',
  timeoutSeconds: 90,
  shouldRunOnVersionUpgrade: true,
  shouldRunSynchronously: false,
  handler: backfillCommentAuthorKinds,
});
