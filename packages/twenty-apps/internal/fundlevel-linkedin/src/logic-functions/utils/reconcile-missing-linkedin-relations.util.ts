import { findAll, graphql } from 'src/lib/twenty';

export const reconcileMissingLinkedinRelations = async (
  accountId: string,
  snapshotStartedAt: string,
) => {
  for (const [statuses, status] of [
    [['CONNECTED'], 'REMOVED'],
    [['REQUEST_SENT', 'REQUEST_RECEIVED'], 'NOT_CONNECTED'],
  ] as const) {
    const filter = {
      accountId: { eq: accountId },
      status: { in: statuses },
      or: [
        { lastRelationSeenAt: { lt: snapshotStartedAt } },
        { lastRelationSeenAt: { is: 'NULL' } },
      ],
    };
    const records = await findAll<{ id: string }>(
      'linkedinConnections',
      filter,
      'id',
      { max: Number.MAX_SAFE_INTEGER },
    );
    for (let index = 0; index < records.length; index += 200) {
      await graphql(
        'mutation($filter:LinkedinConnectionFilterInput!,$data:LinkedinConnectionUpdateInput!){updateLinkedinConnections(filter:$filter,data:$data){id}}',
        {
          filter: {
            ...filter,
            id: {
              in: records.slice(index, index + 200).map((record) => record.id),
            },
          },
          data: { status },
        },
      );
    }
  }
};
