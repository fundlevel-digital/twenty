import { describe, expect, it, vi } from 'vitest';

import { listAnalyticsEntries } from 'src/logic-functions/utils/list-analytics-entries.util';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

describe('listAnalyticsEntries', () => {
  it('follows the cursor until the last page', async () => {
    const variablesSeen: Record<string, unknown>[] = [];
    const client: WorkspaceGraphqlClient = {
      request: vi.fn(
        async (_query: string, variables: Record<string, unknown>) => {
          variablesSeen.push(variables);
          const isFirstPage = variablesSeen.length === 1;

          return {
            youtubeChannels: {
              edges: [
                {
                  node: {
                    id: isFirstPage ? 'entry-1' : 'entry-2',
                    name: 'Entry',
                    youtubeId: null,
                  },
                },
              ],
              pageInfo: {
                hasNextPage: isFirstPage,
                endCursor: isFirstPage ? 'cursor-1' : null,
              },
            },
          };
        },
      ) as WorkspaceGraphqlClient['request'],
    };

    const entries = await listAnalyticsEntries({
      client,
      selection: { kind: 'records', channelIds: ['entry-1'] },
    });

    expect(entries.map((entry) => entry.id)).toEqual(['entry-1', 'entry-2']);
    expect(variablesSeen).toEqual([
      { filter: { id: { in: ['entry-1'] } }, first: 200 },
      {
        filter: { id: { in: ['entry-1'] } },
        first: 200,
        after: 'cursor-1',
      },
    ]);
  });
});
