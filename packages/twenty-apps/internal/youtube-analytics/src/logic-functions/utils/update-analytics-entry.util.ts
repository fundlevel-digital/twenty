import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

const UPDATE_ANALYTICS_ENTRY_MUTATION = `
  mutation UpdateYoutubeChannel(
    $id: UUID!
    $data: YoutubeChannelUpdateInput!
  ) {
    updateYoutubeChannel(id: $id, data: $data) {
      id
    }
  }
`;

export const updateAnalyticsEntry = async ({
  client,
  entryId,
  data,
}: {
  client: WorkspaceGraphqlClient;
  entryId: string;
  data: Record<string, unknown>;
}): Promise<void> => {
  await client.request(UPDATE_ANALYTICS_ENTRY_MUTATION, { id: entryId, data });
};
