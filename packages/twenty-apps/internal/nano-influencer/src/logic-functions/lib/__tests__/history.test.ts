import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  importHistory,
  importHistoryResults,
  startHistorySync,
} from '../history';
import { NanoClient } from '../nano-client';
import { Workspace, WorkspaceRateLimitError } from '../workspace';
import { IDENTIFIERS } from '../../../constants/identifiers';
import { normalizeCountry } from '../../../utils/countries';

const { enqueueJobs } = vi.hoisted(() => ({ enqueueJobs: vi.fn() }));
vi.mock('twenty-sdk/logic-function', () => ({ enqueueJobs }));
const SEARCH = '11111111-1111-4111-8111-111111111111';
const CREATOR = '22222222-2222-4222-8222-222222222222';
const log = {
  taskId: 'task',
  type: 'search',
  platform: 'ytb',
  title: 'Example',
  status: 'SUCC',
  created: 1700000000,
  updated: 1700000010,
  kwSearch: false,
  useremail: 'member@example.test',
};
beforeEach(() => enqueueJobs.mockResolvedValue({ enqueued: true }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
it('reads saved history with pagination without submitting searches', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ logs: [log], totalCount: 31 })),
    );
  vi.stubGlobal('fetch', fetch);
  expect(await new NanoClient('fixture').history(2)).toEqual({
    logs: [log],
    totalCount: 31,
  });
  expect(fetch.mock.calls[0][0]).toBe(
    'https://www.nanoinfluencer.ai/api/task/logs?page=2&pageSize=30',
  );
  expect(fetch.mock.calls[0][1].method).toBe('GET');
});
it('queues usable accounts while reporting failed connections', async () => {
  const first = new NanoClient('fixture', 'one'),
    second = new NanoClient('fixture', 'two');
  vi.spyOn(first, 'history').mockResolvedValue({ logs: [log], totalCount: 31 });
  vi.spyOn(second, 'history').mockRejectedValue(new Error('Session expired'));
  expect(await startHistorySync(undefined, [first, second])).toEqual({
    queued: 1,
    totalCount: 31,
    failed: [{ connectionId: 'two', message: 'Session expired' }],
  });
});
it('imports account-scoped search history and keeps the original provider log', async () => {
  const workspace = new Workspace(),
    client = new NanoClient('fixture', 'one');
  vi.spyOn(client, 'history').mockResolvedValue({
    logs: [log],
    totalCount: 31,
  });
  vi.spyOn(workspace, 'find').mockResolvedValue([]);
  const upsert = vi
    .spyOn(workspace, 'upsert')
    .mockResolvedValue({ id: SEARCH });
  vi.spyOn(workspace, 'update').mockResolvedValue({ id: SEARCH });
  await importHistory(
    { connectionId: 'one', page: 1, offset: 0 },
    workspace,
    client,
  );
  expect(upsert).toHaveBeenCalledWith(
    'Search',
    'one:task',
    expect.objectContaining({
      rawNanoSearch: log,
      origin: 'NANO',
      status: 'FINISHED',
      startedAt: '2023-11-14T22:13:20.000Z',
    }),
    'id historyImportStatus',
  );
  expect(enqueueJobs).toHaveBeenCalledWith(
    expect.objectContaining({
      logicFunctionUniversalIdentifier: IDENTIFIERS.importHistoryResults,
    }),
  );
  expect(enqueueJobs).toHaveBeenCalledWith(
    expect.objectContaining({
      logicFunctionUniversalIdentifier: IDENTIFIERS.importHistory,
      jobs: [{ payload: { connectionId: 'one', page: 2, offset: 0 } }],
    }),
  );
});
it('marks expired results unavailable instead of manufacturing empty successful results', async () => {
  const workspace = new Workspace(),
    client = new NanoClient('fixture');
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: SEARCH,
    jobId: 'task',
    connectionId: 'one',
  });
  vi.spyOn(client, 'request').mockResolvedValue({
    data: { status: 'removed', data: null },
  });
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: SEARCH });
  expect(
    await importHistoryResults(
      { searchId: SEARCH, page: 1, offset: 0 },
      workspace,
      client,
    ),
  ).toEqual({ status: 'UNAVAILABLE' });
  expect(update).toHaveBeenCalledWith(
    'Search',
    SEARCH,
    expect.objectContaining({ historyImportStatus: 'UNAVAILABLE' }),
  );
});
it('stores original search results while reusing canonical creator identities', async () => {
  const workspace = new Workspace(),
    client = new NanoClient('fixture');
  const raw = {
    id: 'sample',
    platform: 'ytb',
    name: 'Example',
    score: 0.9,
    email: [{ value: 'Twitter DM' }, { value: 'one@example.test' }],
  };
  const envelope = { data: { status: 'finished', data: { channels: [raw] } } };
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: SEARCH,
    jobId: 'task',
    connectionId: 'one',
    rawNanoSearch: log,
    resultIds: [],
  });
  vi.spyOn(client, 'request').mockResolvedValue(envelope);
  const upsert = vi
    .spyOn(workspace, 'upsert')
    .mockResolvedValue({ id: CREATOR });
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: SEARCH });
  await importHistoryResults(
    { searchId: SEARCH, page: 1, offset: 0 },
    workspace,
    client,
  );
  expect(upsert).toHaveBeenCalledWith(
    'Creator',
    'ytb:sample',
    expect.objectContaining({ emails: ['one@example.test'] }),
    'id avatarUrl personId emails emailAvailability',
  );
  expect(upsert).toHaveBeenCalledWith(
    'Discovery',
    `${SEARCH}:ytb:sample`,
    expect.objectContaining({ rawNanoResult: raw, creatorId: CREATOR }),
  );
  expect(update).toHaveBeenCalledWith(
    'Search',
    SEARCH,
    expect.objectContaining({
      historyImportStatus: 'IMPORTED',
      rawNanoSearchResults: envelope,
      resultIds: [CREATOR],
      importedCount: 1,
    }),
  );
});
it('retries an incomplete result chunk on rate limiting so creator IDs are not lost', async () => {
  const workspace = new Workspace(),
    client = new NanoClient('fixture');
  vi.spyOn(workspace, 'get').mockRejectedValue(
    new WorkspaceRateLimitError(60000),
  );
  expect(
    await importHistoryResults(
      { searchId: SEARCH, page: 1, offset: 10 },
      workspace,
      client,
    ),
  ).toEqual({ status: 'DEFERRED' });
  expect(enqueueJobs).toHaveBeenCalledWith(
    expect.objectContaining({
      delayMs: 62000,
      jobs: [{ payload: { searchId: SEARCH, page: 1, offset: 10 } }],
    }),
  );
});
it.each([
  ['US', 'US'],
  ['United States', 'US'],
  ['uk', 'GB'],
  ['Turkey', 'TR'],
  ['', 'UNKNOWN'],
  ['not a country', 'UNKNOWN'],
])(
  'normalizes country %s without inventing unknown categories',
  (input, expected) => {
    expect(normalizeCountry(input) ?? 'UNKNOWN').toBe(expected);
  },
);

it('reads every saved keyword page and retains each original page response', async () => {
  const workspace = new Workspace(),
    client = new NanoClient('fixture');
  const raw = {
    cid: 'sample',
    countryName: 'United States',
    email: 'one@example.test',
  };
  const envelope = { channels: [raw], platform: 'ytb', totalPages: 2 };
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: SEARCH,
    jobId: 'task',
    connectionId: 'one',
    rawNanoSearch: { ...log, kwSearch: true, rootJobId: 'root' },
    resultIds: [],
    rawNanoSearchResults: {},
  });
  const request = vi.spyOn(client, 'request').mockResolvedValue(envelope);
  const upsert = vi
    .spyOn(workspace, 'upsert')
    .mockResolvedValue({ id: CREATOR });
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: SEARCH });
  await importHistoryResults(
    { searchId: SEARCH, page: 1, offset: 0 },
    workspace,
    client,
  );
  expect(request).toHaveBeenCalledWith('/api/kw/task/root', {
    page: 1,
    pageSize: 20,
  });
  expect(upsert).toHaveBeenCalledWith(
    'Creator',
    'ytb:sample',
    expect.objectContaining({
      creatorCountry: 'US',
      emails: ['one@example.test'],
    }),
    'id avatarUrl personId emails emailAvailability',
  );
  expect(update).toHaveBeenCalledWith(
    'Search',
    SEARCH,
    expect.objectContaining({ rawNanoSearchResults: { '1': envelope } }),
  );
  expect(enqueueJobs).toHaveBeenCalledWith(
    expect.objectContaining({
      jobs: [{ payload: { searchId: SEARCH, page: 2, offset: 0 } }],
    }),
  );
});
it('retains durable per-result progress when a later result hits the rate limit', async () => {
  const workspace = new Workspace(),
    client = new NanoClient('fixture');
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: SEARCH,
    jobId: 'task',
    connectionId: 'one',
    rawNanoSearch: log,
    resultIds: [],
  });
  vi.spyOn(client, 'request').mockResolvedValue({
    data: {
      status: 'finished',
      data: {
        channels: [
          { id: 'first', platform: 'ytb' },
          { id: 'second', platform: 'ytb' },
        ],
      },
    },
  });
  vi.spyOn(workspace, 'upsert')
    .mockResolvedValueOnce({ id: CREATOR })
    .mockResolvedValueOnce({ id: SEARCH })
    .mockRejectedValueOnce(new WorkspaceRateLimitError(60000));
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: SEARCH });
  expect(
    await importHistoryResults(
      { searchId: SEARCH, page: 1, offset: 0 },
      workspace,
      client,
    ),
  ).toEqual({ status: 'DEFERRED' });
  expect(update).toHaveBeenCalledWith(
    'Search',
    SEARCH,
    expect.objectContaining({ resultIds: [CREATOR], importedCount: 1 }),
  );
  expect(enqueueJobs).toHaveBeenCalledWith(
    expect.objectContaining({
      jobs: [{ payload: { searchId: SEARCH, page: 1, offset: 1 } }],
    }),
  );
});

it('imports an available empty keyword collection without calling it expired', async () => {
  const workspace = new Workspace(),
    client = new NanoClient('fixture');
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: SEARCH,
    jobId: 'task',
    connectionId: 'one',
    rawNanoSearch: { ...log, kwSearch: true, rootJobId: 'root' },
    resultIds: [],
  });
  vi.spyOn(client, 'request').mockResolvedValue({
    channels: [],
    totalPages: 0,
  });
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: SEARCH });
  expect(
    await importHistoryResults(
      { searchId: SEARCH, page: 1, offset: 0 },
      workspace,
      client,
    ),
  ).toEqual({ status: 'IMPORTED', importedCount: 0 });
  expect(update).toHaveBeenCalledWith(
    'Search',
    SEARCH,
    expect.objectContaining({
      historyImportStatus: 'IMPORTED',
      importedCount: 0,
    }),
  );
});
