import { IDENTIFIERS } from '../../../constants/identifiers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NanoClient } from '../nano-client';
import { Workspace, WorkspaceRateLimitError } from '../workspace';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { setFlags } from '../flags';
import { startSearch, pollSearch, searchInputSchema } from '../search';
import { syncPage } from '../sync';
import { unwrapInput } from '../unwrap-input';

const { enqueueJobs } = vi.hoisted(() => ({ enqueueJobs: vi.fn() }));
vi.mock('twenty-sdk/logic-function', () => ({ enqueueJobs }));

const CREATOR_ID = '11111111-1111-4111-8111-111111111111';
const LIST_ID = '22222222-2222-4222-8222-222222222222';
const SEARCH_ID = '33333333-3333-4333-8333-333333333333';
const RUN_ID = '44444444-4444-4444-8444-444444444444';
const seed = {
  id: CREATOR_ID,
  nanoId: 'UCexample',
  name: 'Example Creator',
  platform: 'ytb',
  emails: [],
};

beforeEach(() => {
  vi.spyOn(Workspace.prototype, 'find').mockResolvedValue([]);
  enqueueJobs.mockResolvedValue({ enqueued: true });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  enqueueJobs.mockReset();
});

describe('Nano transport', () => {
  it('uses the session cookie and does not replay an unsuccessful mutation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('private token contents', { status: 503 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      new NanoClient('secret-fixture').request('/api/search/ytb', {}),
    ).rejects.toThrow('HTTP 503');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Cookie).toBe(
      '__Secure-next-auth.session-token=secret-fixture',
    );
  });

  it('rejects malformed list responses instead of treating them as an empty list', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: 'expired' }))),
    );
    await expect(
      new NanoClient('fixture').page('1', 'fav', 1),
    ).rejects.toThrow();
  });

  it('rejects an HTTP-successful flag response that does not confirm the write', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 401 }))),
    );
    await expect(
      new NanoClient('fixture').setFlag(
        '1',
        { id: 'UCexample', platform: 'ytb' },
        'hide',
      ),
    ).rejects.toThrow();
  });

  it('unwraps route bodies and preserves direct workflow arguments', () => {
    expect(unwrapInput({ body: { creatorId: CREATOR_ID } })).toEqual({
      creatorId: CREATOR_ID,
    });
    expect(unwrapInput({ creatorId: CREATOR_ID })).toEqual({
      creatorId: CREATOR_ID,
    });
  });
});

describe('list synchronization', () => {
  it('imports hidden creators and advances to reconciliation only after that feed finishes', async () => {
    const workspace = new Workspace();
    const nano = new NanoClient('fixture');
    vi.spyOn(workspace, 'get').mockResolvedValue({
      id: LIST_ID,
      syncRun: RUN_ID,
    });
    const update = vi
      .spyOn(workspace, 'update')
      .mockResolvedValue({ id: LIST_ID });
    const upsert = vi
      .spyOn(workspace, 'upsert')
      .mockResolvedValue({ id: CREATOR_ID });
    vi.spyOn(nano, 'page').mockResolvedValue({
      channels: [
        {
          id: 'UCexample',
          platform: 'ytb',
          subsCount: '0',
          labels: ['Review'],
          note: 'Example',
        },
      ],
      total_pages: 1,
    });
    await syncPage(
      { listId: LIST_ID, projectId: '7', run: RUN_ID, flag: 'hide', page: 1 },
      workspace,
      nano,
    );
    expect(upsert).toHaveBeenCalledWith(
      'Creator',
      'ytb:UCexample',
      expect.objectContaining({ subscribers: 0 }),
      expect.any(String),
    );
    expect(upsert).toHaveBeenCalledWith(
      'Membership',
      `${LIST_ID}:ytb:UCexample`,
      expect.objectContaining({
        flag: 'HIDDEN',
        listId: LIST_ID,
        creatorId: CREATOR_ID,
        labels: ['Review'],
      }),
    );
    expect(enqueueJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        logicFunctionUniversalIdentifier: IDENTIFIERS.syncPage,
        jobs: [
          { payload: expect.objectContaining({ flag: 'reconcile', page: 1 }) },
        ],
      }),
    );
    expect(update).not.toHaveBeenCalledWith(
      'List',
      LIST_ID,
      expect.objectContaining({ syncStatus: 'SYNCED' }),
    );
  });

  it('follows all pages before moving from favourites to hides', async () => {
    const workspace = new Workspace();
    const nano = new NanoClient('fixture');
    vi.spyOn(workspace, 'get').mockResolvedValue({
      id: LIST_ID,
      syncRun: RUN_ID,
    });
    vi.spyOn(workspace, 'update').mockResolvedValue({ id: LIST_ID });
    vi.spyOn(nano, 'page').mockResolvedValue({ channels: [], total_pages: 3 });
    await syncPage(
      { listId: LIST_ID, projectId: '7', run: RUN_ID, flag: 'fav', page: 2 },
      workspace,
      nano,
    );
    expect(enqueueJobs.mock.calls[0][0].jobs[0].payload).toMatchObject({
      flag: 'fav',
      page: 3,
    });
  });

  it('leaves stale records alone after an incomplete Nano read', async () => {
    const workspace = new Workspace();
    const nano = new NanoClient('fixture');
    vi.spyOn(workspace, 'get').mockResolvedValue({
      id: LIST_ID,
      syncRun: RUN_ID,
    });
    const update = vi
      .spyOn(workspace, 'update')
      .mockResolvedValue({ id: LIST_ID });
    const find = vi.spyOn(workspace, 'find');
    vi.spyOn(nano, 'page').mockRejectedValue(new Error('Nano HTTP 429'));
    await expect(
      syncPage(
        { listId: LIST_ID, projectId: '7', run: RUN_ID, flag: 'fav', page: 1 },
        workspace,
        nano,
      ),
    ).rejects.toThrow('429');
    expect(find).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      'List',
      LIST_ID,
      expect.objectContaining({ syncStatus: 'FAILED' }),
    );
    expect(enqueueJobs).not.toHaveBeenCalled();
  });

  it('ignores an older superseded sync job', async () => {
    const workspace = new Workspace();
    const nano = new NanoClient('fixture');
    vi.spyOn(workspace, 'get').mockResolvedValue({
      id: LIST_ID,
      syncRun: 'new-run',
    });
    const page = vi.spyOn(nano, 'page');
    expect(
      await syncPage(
        { listId: LIST_ID, projectId: '7', run: RUN_ID, flag: 'fav', page: 1 },
        workspace,
        nano,
      ),
    ).toEqual({ status: 'SUPERSEDED' });
    expect(page).not.toHaveBeenCalled();
  });

  it('marks missing memberships removed without deleting their creators', async () => {
    const workspace = new Workspace();
    vi.spyOn(workspace, 'get').mockResolvedValue({
      id: LIST_ID,
      syncRun: RUN_ID,
    });
    vi.spyOn(workspace, 'find').mockResolvedValue([{ id: CREATOR_ID }]);
    const update = vi
      .spyOn(workspace, 'update')
      .mockResolvedValue({ id: LIST_ID });
    await syncPage(
      {
        listId: LIST_ID,
        projectId: '7',
        run: RUN_ID,
        flag: 'reconcile',
        page: 1,
      },
      workspace,
    );
    expect(update).toHaveBeenCalledWith(
      'Membership',
      CREATOR_ID,
      expect.objectContaining({ flag: 'REMOVED' }),
    );
    expect(update).toHaveBeenCalledWith(
      'List',
      LIST_ID,
      expect.objectContaining({ syncStatus: 'SYNCED' }),
    );
  });
});

describe('explicit outbound updates', () => {
  it('reports a Nano failure without publishing a successful local state', async () => {
    const workspace = new Workspace();
    const nano = new NanoClient('fixture');
    vi.spyOn(workspace, 'get')
      .mockResolvedValueOnce({ id: LIST_ID, externalKey: '7' })
      .mockResolvedValueOnce(seed);
    const upsert = vi.spyOn(workspace, 'upsert');
    vi.spyOn(nano, 'setFlag').mockRejectedValue(new Error('Nano HTTP 403'));
    const result = await setFlags(
      { listId: LIST_ID, creatorIds: [CREATOR_ID], flag: 'hide' },
      workspace,
      nano,
    );
    expect(result.updated).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('lookalike searches', () => {
  it('reuses the same workflow request without starting another paid search', async () => {
    const workspace = new Workspace();
    const nano = new NanoClient('fixture');
    vi.spyOn(workspace, 'find').mockResolvedValue([
      { id: SEARCH_ID, jobId: 'job-1', status: 'RUNNING' },
    ]);
    const submit = vi.spyOn(nano, 'submit');
    expect(
      await startSearch(
        { creatorId: CREATOR_ID, requestId: RUN_ID },
        workspace,
        nano,
      ),
    ).toMatchObject({ searchId: SEARCH_ID, jobId: 'job-1' });
    expect(submit).not.toHaveBeenCalled();
  });

  it('lets only the winner of a competing request submit to Nano', async () => {
    const workspace = new Workspace();
    const nano = new NanoClient('fixture');
    vi.spyOn(workspace, 'find')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: SEARCH_ID, status: 'SUBMITTING' }]);
    vi.spyOn(workspace, 'get').mockResolvedValue(seed);
    vi.spyOn(workspace, 'create').mockRejectedValue(
      new Error('Unique conflict'),
    );
    const submit = vi.spyOn(nano, 'submit');
    expect(
      await startSearch(
        { creatorId: CREATOR_ID, requestId: RUN_ID },
        workspace,
        nano,
      ),
    ).toMatchObject({ status: 'SUBMITTING' });
    expect(submit).not.toHaveBeenCalled();
  });

  it('collects results without favouriting them in a Nano list', async () => {
    const workspace = new Workspace();
    const nano = new NanoClient('fixture');
    vi.spyOn(workspace, 'get')
      .mockResolvedValueOnce({
        id: SEARCH_ID,
        jobId: 'job-1',
        status: 'RUNNING',
        seedId: CREATOR_ID,
      })
      .mockResolvedValueOnce(seed);
    vi.spyOn(nano, 'poll').mockResolvedValue({
      status: 'finished',
      data: { channels: [{ id: 'UCresult', name: 'Example Result' }] },
    });
    const upsert = vi
      .spyOn(workspace, 'upsert')
      .mockResolvedValue({ id: CREATOR_ID });
    vi.spyOn(workspace, 'update').mockResolvedValue({ id: SEARCH_ID });
    expect(
      await pollSearch({ searchId: SEARCH_ID, attempt: 0 }, workspace, nano),
    ).toMatchObject({ status: 'FINISHED', creatorIds: [CREATOR_ID] });
    expect(upsert.mock.calls.map(([entity]) => entity)).toEqual([
      'Creator',
      'Discovery',
    ]);
  });

  it('stops automatic polling after its bound and retains the resumable Nano job', async () => {
    const workspace = new Workspace();
    const nano = new NanoClient('fixture');
    vi.spyOn(workspace, 'get')
      .mockResolvedValueOnce({
        id: SEARCH_ID,
        jobId: 'job-1',
        seedId: CREATOR_ID,
      })
      .mockResolvedValueOnce(seed);
    vi.spyOn(nano, 'poll').mockResolvedValue({ status: 'running' });
    const update = vi
      .spyOn(workspace, 'update')
      .mockResolvedValue({ id: SEARCH_ID });
    expect(
      await pollSearch({ searchId: SEARCH_ID, attempt: 60 }, workspace, nano),
    ).toMatchObject({ status: 'WAITING' });
    expect(enqueueJobs).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalledWith(
      'Search',
      SEARCH_ID,
      expect.objectContaining({ jobId: '' }),
    );
  });

  it('rejects reversed subscriber ranges before any network call', () => {
    expect(
      searchInputSchema.safeParse({
        creatorId: CREATOR_ID,
        filters: { subs: [100, 5] },
      }).success,
    ).toBe(false);
  });
});

describe('Nano saved creator emails', () => {
  it('imports string and structured emails from live list responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              channels: [
                {
                  id: 'UCexample',
                  platform: 'ytb',
                  country: null,
                  email: [
                    'first@example.test',
                    { type: 'email', value: 'second@example.test' },
                  ],
                },
              ],
              total_pages: 1,
            },
          }),
        ),
      ),
    );
    const result = await new NanoClient('fixture').page('7', 'fav', 1);
    expect(result.channels[0].country).toBeUndefined();
    expect(result.channels[0].email).toEqual([
      'first@example.test',
      'second@example.test',
    ]);
  });

  it('rejects an unrecognized email object before a list can be reconciled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              channels: [
                {
                  id: 'UCexample',
                  platform: 'ytb',
                  email: [{ type: 'email' }],
                },
              ],
            },
          }),
        ),
      ),
    );
    await expect(
      new NanoClient('fixture').page('7', 'fav', 1),
    ).rejects.toThrow();
  });
});

it('preserves Twenty retry timing without confusing rate limits with permission errors', async () => {
  vi.spyOn(RestApiClient.prototype, 'post').mockResolvedValue({
    errors: [
      {
        message: 'Limited',
        extensions: { subCode: 'RATE_LIMITED', retryAfterMs: 1200 },
      },
    ],
  });
  await expect(
    new Workspace().request('query { example }', {}),
  ).rejects.toMatchObject({ retryAfterMs: 1200 });
});

it('checkpoints completed creators before deferring a rate-limited list page', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: LIST_ID,
    syncRun: RUN_ID,
  });
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: LIST_ID });
  vi.spyOn(workspace, 'upsert')
    .mockResolvedValueOnce({ id: CREATOR_ID })
    .mockResolvedValueOnce({ id: CREATOR_ID })
    .mockRejectedValueOnce(new WorkspaceRateLimitError(60_000));
  const nano = new NanoClient('fixture');
  vi.spyOn(nano, 'page').mockResolvedValue({
    channels: [
      { id: 'first', platform: 'ytb' },
      { id: 'second', platform: 'ytb' },
    ],
  });
  const result = await syncPage(
    { listId: LIST_ID, projectId: '7', run: RUN_ID, flag: 'fav', page: 1 },
    workspace,
    nano,
  );
  expect(result.status).toBe('DEFERRED');
  expect(enqueueJobs).toHaveBeenCalledWith(
    expect.objectContaining({
      jobs: [{ payload: expect.objectContaining({ channelOffset: 1 }) }],
      delayMs: expect.any(Number),
    }),
  );
  expect(enqueueJobs.mock.calls[0][0].delayMs).toBeGreaterThanOrEqual(61_000);
  expect(
    update.mock.calls.some(([, , data]) => data.syncStatus === 'FAILED'),
  ).toBe(false);
});

it('resumes a list page without processing creators before its checkpoint', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: LIST_ID,
    syncRun: RUN_ID,
  });
  vi.spyOn(workspace, 'update').mockResolvedValue({ id: LIST_ID });
  const upsert = vi
    .spyOn(workspace, 'upsert')
    .mockResolvedValue({ id: CREATOR_ID });
  const nano = new NanoClient('fixture');
  vi.spyOn(nano, 'page').mockResolvedValue({
    channels: [
      { id: 'first', platform: 'ytb' },
      { id: 'second', platform: 'ytb' },
    ],
  });
  await syncPage(
    {
      listId: LIST_ID,
      projectId: '7',
      run: RUN_ID,
      flag: 'fav',
      page: 1,
      channelOffset: 1,
    },
    workspace,
    nano,
  );
  expect(
    upsert.mock.calls
      .filter(([entity]) => entity === 'Creator')
      .map(([, identity]) => identity),
  ).toEqual(['ytb:second']);
  expect(enqueueJobs).toHaveBeenCalledWith(
    expect.objectContaining({
      jobs: [
        {
          payload: expect.objectContaining({ flag: 'hide', channelOffset: 0 }),
        },
      ],
    }),
  );
});

it('recovers the same record when a competing upsert wins its unique identity', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'create').mockRejectedValue(
    new Error('Concurrent create conflict'),
  );
  vi.spyOn(workspace, 'find').mockResolvedValue([{ id: CREATOR_ID }]);
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: CREATOR_ID });
  await expect(
    workspace.upsert('Creator', 'ytb:example', { name: 'Updated' }),
  ).resolves.toEqual({ id: CREATOR_ID });
  expect(update).toHaveBeenCalledWith(
    'Creator',
    CREATOR_ID,
    {
      name: 'Updated',
    },
    'id',
  );
});

it('removes blank Nano emails without losing non-empty addresses', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            channels: [
              {
                id: 'test',
                platform: 'ytb',
                email: [
                  '',
                  { type: 'email', value: '   ' },
                  'one@example.test',
                  { type: 'email', value: 'two@example.test' },
                  'one@example.test',
                ],
              },
            ],
          },
        }),
      ),
    ),
  );
  const result = await new NanoClient('fixture').page('1', 'fav', 1);
  expect(result.channels[0].email).toEqual([
    'one@example.test',
    'two@example.test',
  ]);
});
