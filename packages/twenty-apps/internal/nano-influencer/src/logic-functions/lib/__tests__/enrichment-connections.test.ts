import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getNanoClient, getNanoClients } from '../credentials';
import { enrichCreators } from '../enrich';
import { NanoClient, NanoHttpError } from '../nano-client';
import { startSync } from '../sync';
import { pollSearch } from '../search';
import { Workspace } from '../workspace';

const { listConnections, enqueueJobs } = vi.hoisted(() => ({
  listConnections: vi.fn(),
  enqueueJobs: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({ listConnections, enqueueJobs }));

const CREATOR_ID = '11111111-1111-4111-8111-111111111111';
const profile = {
  id: 'UCexample',
  platform: 'ytb' as const,
  name: 'Example Creator',
  desc: 'Updated biography',
  subsCount: 12000,
};
const connection = (id: string, token: string) => ({
  id,
  accessToken: token,
  providerType: 'api-key',
  authFailedAt: null,
});

beforeEach(() => {
  vi.stubEnv('NANOINFLUENCER_API_TOKEN', '');
  vi.spyOn(Workspace.prototype, 'find').mockResolvedValue([]);
  vi.spyOn(Workspace.prototype, 'findAll').mockResolvedValue([]);
  enqueueJobs.mockResolvedValue({ enqueued: true });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it('loads multiple native connections and ignores duplicates, failed authentication and empty tokens', async () => {
  listConnections.mockResolvedValue([
    connection('one', 'token-1'),
    connection('duplicate', 'token-1'),
    connection('two', 'token-2'),
    connection('empty', ''),
    { ...connection('expired', 'token-3'), authFailedAt: '2026-11-22' },
  ]);
  expect((await getNanoClients()).map((client) => client.connectionId)).toEqual(
    ['one', 'two'],
  );
  expect(listConnections).toHaveBeenCalledWith({
    providerName: 'nano-influencer',
    scope: 'WORKSPACE',
  });
});

it('does not substitute another account for an unavailable pinned connection', async () => {
  listConnections.mockResolvedValue([connection('other-account', 'token')]);
  await expect(getNanoClient('original-account')).rejects.toThrow(
    'another account will not be used',
  );
});

it('refuses to poll a legacy search through an unbound native account', async () => {
  listConnections.mockResolvedValue([connection('other-account', 'token')]);
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR_ID,
    jobId: 'old-job',
    status: 'RUNNING',
  });
  const poll = vi.spyOn(NanoClient.prototype, 'poll');
  await expect(
    pollSearch({ searchId: CREATOR_ID, attempt: 0 }, workspace),
  ).rejects.toThrow('no account binding');
  expect(poll).not.toHaveBeenCalled();
});

it('keeps identical Nano project IDs separate across connected accounts', async () => {
  listConnections.mockResolvedValue([
    connection('account-one', 'token-1'),
    connection('account-two', 'token-2'),
  ]);
  vi.spyOn(NanoClient.prototype, 'projects').mockResolvedValue([
    { id: '7', title: 'Example List' },
  ]);
  const workspace = new Workspace();
  const upsert = vi
    .spyOn(workspace, 'upsert')
    .mockResolvedValueOnce({ id: CREATOR_ID })
    .mockResolvedValueOnce({ id: '22222222-2222-4222-8222-222222222222' });
  vi.spyOn(workspace, 'update').mockResolvedValue({ id: CREATOR_ID });
  expect(await startSync({}, workspace)).toEqual({ queued: 2 });
  expect(upsert.mock.calls.map((call) => call[1])).toEqual([
    'account-one:7',
    'account-two:7',
  ]);
  expect(upsert.mock.calls.map((call) => call[2].connectionId)).toEqual([
    'account-one',
    'account-two',
  ]);
});

it('enriches the selected creator and rotates past a credential rejected for quota', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR_ID,
    nanoId: profile.id,
    platform: 'ytb',
    name: 'Old Name',
  });
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: CREATOR_ID });
  const exhausted = new NanoClient('token-1', 'one');
  const available = new NanoClient('token-2', 'two');
  vi.spyOn(exhausted, 'profile').mockRejectedValue(new NanoHttpError(429));
  vi.spyOn(available, 'profile').mockResolvedValue(profile);
  expect(
    await enrichCreators({ creatorIds: [CREATOR_ID] }, workspace, [
      exhausted,
      available,
    ]),
  ).toEqual({ updated: [CREATOR_ID], failed: [] });
  expect(update).toHaveBeenCalledWith(
    'Creator',
    CREATOR_ID,
    expect.objectContaining({
      name: profile.name,
      bio: profile.desc,
      subscribers: 12000,
      creatorPlatform: 'YTB',
    }),
    expect.any(String),
  );
  expect(update).toHaveBeenCalledWith(
    'Creator',
    CREATOR_ID,
    expect.objectContaining({
      enrichmentError: '',
      enrichedAt: expect.any(String),
    }),
  );
});

it('resolves a profile URL and binds the identity to the original CRM record', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR_ID,
    profileUrl: 'https://www.youtube.com/@example',
  });
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: CREATOR_ID });
  const client = new NanoClient('token', 'one');
  vi.spyOn(client, 'lookup').mockResolvedValue(profile);
  vi.spyOn(client, 'profile').mockResolvedValue(profile);
  await enrichCreators({ creatorIds: [CREATOR_ID] }, workspace, [client]);
  expect(update).toHaveBeenCalledWith(
    'Creator',
    CREATOR_ID,
    expect.objectContaining({
      externalKey: 'ytb:UCexample',
      nanoId: 'UCexample',
    }),
    expect.any(String),
  );
});

it('retains existing profile values when every credential fails', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR_ID,
    nanoId: profile.id,
    platform: 'ytb',
  });
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: CREATOR_ID });
  const client = new NanoClient('token', 'one');
  vi.spyOn(client, 'profile').mockRejectedValue(new NanoHttpError(401));
  expect(
    (await enrichCreators({ creatorIds: [CREATOR_ID] }, workspace, [client]))
      .failed,
  ).toHaveLength(1);
  expect(update).toHaveBeenCalledExactlyOnceWith('Creator', CREATOR_ID, {
    enrichmentError: expect.stringContaining('No usable Nano connections'),
  });
});

it('queues a usable account even when another account rejects list access', async () => {
  listConnections.mockResolvedValue([
    connection('blocked', 'bad-token'),
    connection('available', 'good-token'),
  ]);
  vi.spyOn(NanoClient.prototype, 'projects')
    .mockRejectedValueOnce(new NanoHttpError(403))
    .mockResolvedValueOnce([{ id: '7', title: 'Example List' }]);
  const workspace = new Workspace();
  vi.spyOn(workspace, 'upsert').mockResolvedValue({ id: CREATOR_ID });
  vi.spyOn(workspace, 'update').mockResolvedValue({ id: CREATOR_ID });
  const result = await startSync({}, workspace);
  expect(result.queued).toBe(1);
  expect(result.failed).toEqual([
    { connectionId: 'blocked', message: expect.stringContaining('HTTP 403') },
  ]);
  expect(enqueueJobs).toHaveBeenCalledTimes(1);
});

it('reports rejected list access without queuing work when every account fails', async () => {
  listConnections.mockResolvedValue([connection('blocked', 'bad-token')]);
  vi.spyOn(NanoClient.prototype, 'projects').mockRejectedValue(
    new NanoHttpError(403),
  );
  await expect(startSync({}, new Workspace())).rejects.toThrow(
    'No Nano lists could be read',
  );
  expect(enqueueJobs).not.toHaveBeenCalled();
});
