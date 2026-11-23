import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ graphql: vi.fn() }));
vi.mock('../utils/graphql', () => ({ graphql: mocks.graphql }));
import { backfillCommentAuthorKinds } from '../logic-functions/comments-post-install';
it('preserves existing bot/system classifications and backfills remaining legacy humans', async () => {
  mocks.graphql
    .mockResolvedValueOnce({ updateRecordComments: [{ id: 'bot' }] })
    .mockResolvedValueOnce({ updateRecordComments: [] })
    .mockResolvedValueOnce({ updateRecordComments: [{ id: 'system' }] })
    .mockResolvedValueOnce({ updateRecordComments: [] })
    .mockResolvedValueOnce({ updateRecordComments: [{ id: 'human' }] })
    .mockResolvedValueOnce({ updateRecordComments: [] })
    .mockResolvedValue({ updateRecordComments: [] });
  expect(await backfillCommentAuthorKinds()).toEqual({ updated: 3 });
  expect(await backfillCommentAuthorKinds()).toEqual({ updated: 0 });
  expect(
    mocks.graphql.mock.calls
      .filter((_, index) => [0, 2, 4].includes(index))
      .map(([, variables]) => variables),
  ).toEqual([
    {
      filter: {
        and: [{ authorType: { is: 'NULL' } }, { authorKind: { eq: 'BOT' } }],
      },
      data: { authorType: 'BOT' },
    },
    {
      filter: {
        and: [{ authorType: { is: 'NULL' } }, { authorKind: { eq: 'SYSTEM' } }],
      },
      data: { authorType: 'SYSTEM' },
    },
    {
      filter: { and: [{ authorType: { is: 'NULL' } }] },
      data: { authorType: 'HUMAN' },
    },
  ]);
});
