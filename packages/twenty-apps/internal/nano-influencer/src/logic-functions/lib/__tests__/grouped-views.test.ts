import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  ensureMembershipGroups,
  refreshGroupedViews,
  saveDecisionMaker,
} from '../grouped-views';
import { Workspace, WorkspaceRateLimitError } from '../workspace';
import { IDENTIFIERS } from '../../../constants/identifiers';

const { enqueueJobs } = vi.hoisted(() => ({ enqueueJobs: vi.fn() }));
vi.mock('twenty-sdk/logic-function', () => ({ enqueueJobs }));
const CREATOR = '11111111-1111-4111-8111-111111111111';
const LIST = '22222222-2222-4222-8222-222222222222';
const ACTOR = '33333333-3333-4333-8333-333333333333';
beforeEach(() => enqueueJobs.mockResolvedValue({ enqueued: true }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
it('uses a real email identity for Nano decision makers without creating CRM People or guessing list ownership', async () => {
  const workspace = new Workspace();
  const upsert = vi.spyOn(workspace, 'upsert').mockResolvedValue({ id: ACTOR });
  await saveDecisionMaker(
    workspace,
    'provider-id',
    { name: 'Example', email: ' Member@Example.Test ' },
    'connection',
  );
  expect(upsert).toHaveBeenCalledExactlyOnceWith(
    'User',
    'email:member@example.test',
    expect.objectContaining({
      name: 'member@example.test',
      displayName: 'Example',
      email: { primaryEmail: 'member@example.test', additionalEmails: [] },
    }),
  );
});
it('keeps operators with no email scoped to their Nano connection', async () => {
  const workspace = new Workspace();
  const upsert = vi.spyOn(workspace, 'upsert').mockResolvedValue({ id: ACTOR });
  await saveDecisionMaker(
    workspace,
    'operator',
    { name: 'Example' },
    'connection',
  );
  expect(upsert).toHaveBeenCalledWith(
    'User',
    'connection:operator',
    expect.objectContaining({ name: 'Example' }),
  );
});
it('adds only missing native relation groups and preserves existing visibility/order', async () => {
  const workspace = new Workspace();
  const metadata = {
    getViews: [
      {
        id: LIST,
        universalIdentifier: IDENTIFIERS.byCreatorView,
        mainGroupByFieldMetadataId: 'creator-field',
        viewGroups: [
          { id: ACTOR, fieldValue: 'existing-creator', position: 7 },
        ],
      },
      {
        id: ACTOR,
        universalIdentifier: 'another-app',
        mainGroupByFieldMetadataId: 'creator-field',
        viewGroups: [],
      },
    ],
    objects: {
      edges: [
        {
          node: {
            fields: {
              edges: [
                {
                  node: {
                    id: 'creator-field',
                    universalIdentifier: '9a00d802-d107-5b55-a6b0-a4b71d51c6a5',
                  },
                },
              ],
            },
          },
        },
      ],
    },
  };
  const request = vi
    .spyOn(workspace, 'request')
    .mockResolvedValueOnce(metadata)
    .mockResolvedValue({});
  await ensureMembershipGroups(workspace, [
    { creatorId: CREATOR, listId: LIST },
    { creatorId: CREATOR, listId: LIST },
    { creatorId: 'existing-creator', listId: LIST },
  ]);
  expect(request).toHaveBeenLastCalledWith(
    expect.stringContaining('createManyViewGroups'),
    {
      inputs: [
        expect.objectContaining({
          viewId: LIST,
          fieldValue: CREATOR,
          isVisible: true,
          position: 8,
        }),
      ],
    },
    '/metadata',
  );
  expect(request).toHaveBeenCalledTimes(2);
});
it('does not overwrite a view after its grouping field was customized', async () => {
  const workspace = new Workspace();
  const request = vi.spyOn(workspace, 'request').mockResolvedValue({
    getViews: [
      {
        id: LIST,
        universalIdentifier: IDENTIFIERS.byCreatorView,
        mainGroupByFieldMetadataId: 'saved-state',
        viewGroups: [],
      },
    ],
    objects: { edges: [{ node: { fields: { edges: [] } } }] },
  });
  await ensureMembershipGroups(workspace, [
    { creatorId: CREATOR, listId: LIST },
  ]);
  expect(request).toHaveBeenCalledTimes(1);
});
it('defers a native grouped-view refresh on rate limiting without changing memberships', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'request').mockRejectedValue(
    new WorkspaceRateLimitError(60000),
  );
  expect(
    await refreshGroupedViews({ after: null, position: 0 }, workspace),
  ).toEqual({ status: 'DEFERRED' });
  expect(enqueueJobs).toHaveBeenCalledWith(
    expect.objectContaining({
      logicFunctionUniversalIdentifier: IDENTIFIERS.refreshGroups,
      delayMs: 62000,
      jobs: [{ payload: { after: null, position: 0 } }],
    }),
  );
});

it('retries a concurrent group-creation conflict so another page can finish the same native group', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'request').mockRejectedValue(
    new Error('Concurrent group create'),
  );
  expect(
    await refreshGroupedViews(
      {
        after: null,
        position: 0,
        records: [{ creatorId: CREATOR, listId: LIST }],
      },
      workspace,
    ),
  ).toEqual({ status: 'DEFERRED' });
  expect(enqueueJobs).toHaveBeenCalledWith(
    expect.objectContaining({
      delayMs: 5000,
      jobs: [
        {
          payload: expect.objectContaining({
            attempt: 1,
            records: [{ creatorId: CREATOR, listId: LIST }],
          }),
        },
      ],
    }),
  );
});

it('populates country groups from present creator values, including No Value, without hiding countries behind unused options', async () => {
  const workspace = new Workspace();
  const request = vi
    .spyOn(workspace, 'request')
    .mockResolvedValueOnce({
      nanoCreators: {
        edges: [
          {
            node: {
              id: CREATOR,
              creatorCountry: 'US',
              emailAvailability: 'MISSING',
            },
          },
          {
            node: {
              id: LIST,
              creatorCountry: 'BR',
              emailAvailability: 'MISSING',
            },
          },
          {
            node: {
              id: ACTOR,
              creatorCountry: null,
              emailAvailability: 'MISSING',
            },
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })
    .mockResolvedValueOnce({
      getViews: [
        {
          id: LIST,
          universalIdentifier: IDENTIFIERS.byCountryView,
          mainGroupByFieldMetadataId: 'country-field',
          viewGroups: [],
        },
      ],
      objects: {
        edges: [
          {
            node: {
              fields: {
                edges: [
                  {
                    node: {
                      id: 'country-field',
                      universalIdentifier: IDENTIFIERS.creatorCountry,
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    })
    .mockResolvedValue({});
  expect(
    await refreshGroupedViews(
      { phase: 'COUNTRIES', after: null, position: 0 },
      workspace,
    ),
  ).toEqual({ status: 'REFRESHED', processed: 3 });
  expect(request).toHaveBeenLastCalledWith(
    expect.stringContaining('createManyViewGroups'),
    {
      inputs: [
        expect.objectContaining({ fieldValue: 'US', isVisible: true }),
        expect.objectContaining({ fieldValue: 'BR', isVisible: true }),
        expect.objectContaining({ fieldValue: '', isVisible: true }),
      ],
    },
    '/metadata',
  );
});

it('backfills email availability from stored valid emails without modifying the emails', async () => {
  const workspace = new Workspace();
  const request = vi
    .spyOn(workspace, 'request')
    .mockResolvedValueOnce({
      nanoCreators: {
        edges: [
          {
            node: {
              id: CREATOR,
              creatorCountry: 'US',
              emails: ['member@example.test'],
              emailAvailability: 'MISSING',
            },
          },
          {
            node: {
              id: LIST,
              creatorCountry: null,
              emails: ['Twitter DM'],
              emailAvailability: 'MISSING',
            },
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({
      getViews: [
        {
          id: LIST,
          universalIdentifier: IDENTIFIERS.byEmailAvailabilityView,
          mainGroupByFieldMetadataId: 'availability-field',
          viewGroups: [],
        },
      ],
      objects: {
        edges: [
          {
            node: {
              fields: {
                edges: [
                  {
                    node: {
                      id: 'availability-field',
                      universalIdentifier: IDENTIFIERS.creatorEmailAvailability,
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    })
    .mockResolvedValue({});
  expect(
    await refreshGroupedViews(
      { phase: 'COUNTRIES', after: null, position: 0 },
      workspace,
    ),
  ).toEqual({ status: 'REFRESHED', processed: 2 });
  expect(request.mock.calls[1][1]).toEqual({
    data: { emailAvailability: 'AVAILABLE' },
    filter: { id: { in: [CREATOR] } },
  });
  expect(request).toHaveBeenLastCalledWith(
    expect.stringContaining('createManyViewGroups'),
    {
      inputs: [
        expect.objectContaining({ fieldValue: 'AVAILABLE' }),
        expect.objectContaining({ fieldValue: 'MISSING' }),
      ],
    },
    '/metadata',
  );
});
