import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ findAll: vi.fn(), graphql: vi.fn() }));
vi.mock('src/lib/twenty', () => mocks);
const { reconcileMissingLinkedinRelations } = await import(
  'src/logic-functions/utils/reconcile-missing-linkedin-relations.util'
);
it('reconciles every missing relation within the API bulk limit and rechecks the completed snapshot', async () => {
  mocks.findAll
    .mockResolvedValueOnce(
      Array.from({ length: 401 }, (_, index) => ({ id: String(index) })),
    )
    .mockResolvedValueOnce([]);
  await reconcileMissingLinkedinRelations('account', '2026-11-21T00:00:00Z');
  expect(
    mocks.graphql.mock.calls.map(
      ([, variables]) => variables.filter.id.in.length,
    ),
  ).toEqual([200, 200, 1]);
  expect(mocks.graphql.mock.calls[2][1]).toMatchObject({
    filter: {
      accountId: { eq: 'account' },
      status: { in: ['CONNECTED'] },
      or: [
        { lastRelationSeenAt: { lt: '2026-11-21T00:00:00Z' } },
        { lastRelationSeenAt: { is: 'NULL' } },
      ],
    },
    data: { status: 'REMOVED' },
  });
});
