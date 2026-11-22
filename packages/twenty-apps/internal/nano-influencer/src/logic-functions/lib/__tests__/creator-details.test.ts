import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { NanoClient, NanoHttpError, NanoTransportError } from '../nano-client';
import { Workspace, WorkspaceRateLimitError } from '../workspace';
import { saveCreator } from '../creators';
import { linkCreatorPerson } from '../people';
import { getNanoPreferences } from '../../../utils/preferences';
import { cleanupList } from '../../cleanup-list';
import { scheduledSync } from '../../scheduled-sync';
import { syncPage, startSync } from '../sync';

const { enqueueJobs, listConnections } = vi.hoisted(() => ({
  enqueueJobs: vi.fn(),
  listConnections: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({ enqueueJobs, listConnections }));
const CREATOR = '11111111-1111-4111-8111-111111111111';
const PERSON = '22222222-2222-4222-8222-222222222222';
const LIST = '33333333-3333-4333-8333-333333333333';
const RUN = '44444444-4444-4444-8444-444444444444';
const page = (
  people: {
    id: string;
    emails: { primaryEmail?: string; additionalEmails?: string[] };
  }[],
) => ({
  people: {
    edges: people.map((node) => ({ node })),
    pageInfo: { hasNextPage: false, endCursor: null },
  },
});
beforeEach(() => {
  enqueueJobs.mockResolvedValue({ enqueued: true });
  vi.stubEnv('PERSON_CREATION_POLICY', 'NONE');
  vi.stubEnv('REMOVED_ENTRY_POLICY', 'KEEP');
  vi.stubEnv('REMOVED_LIST_POLICY', 'KEEP');
  vi.stubEnv('SYNC_SCHEDULE', 'MANUAL');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('preserves all profile data and its response envelope while normalizing emails', async () => {
  const raw = {
    id: 'sample',
    platform: 'ytb',
    email: [
      { type: 'email', value: '' },
      { type: 'twitter', value: 'Twitter DM' },
      { type: 'website', value: 'https://example.test/contact' },
      { type: 'email', value: '****@example.test' },
      { type: 'email', value: 'one@example.test' },
    ],
    recentPosts: [{ id: 'video', stats: { views: 123 } }],
    customAnalytics: { median: 10 },
    links: [{ type: 'website', url: 'https://example.test' }],
  };
  const envelope = { data: raw, usage: { cached: true } };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(envelope))),
  );
  const result = await new NanoClient('fixture').profile({
    id: 'sample',
    platform: 'ytb',
  });
  expect(result.rawNanoProfile).toEqual(raw);
  expect(result.enrichmentResults).toEqual(envelope);
  expect(result.email).toEqual(['one@example.test']);
});
it('keeps the original list snapshot including empty email entries and decision metadata', async () => {
  const raw = {
    id: 'sample',
    platform: 'ytb',
    email: [{ value: '' }],
    op_uid: 'operator',
    unmapped: { value: 123 },
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            channels: [raw],
            op_users: {
              operator: {
                id: 'operator',
                name: 'Example',
                email: 'operator@example.test',
              },
            },
          },
        }),
      ),
    ),
  );
  const result = await new NanoClient('fixture').page('1', 'fav', 1);
  expect(result.channels[0].rawNanoListData).toEqual(raw);
  expect(result.channels[0].email).toEqual([]);
  expect(result.op_users?.operator.name).toBe('Example');
});
it('does not replace saved profile enrichment JSON when an ordinary list refresh runs', async () => {
  const workspace = new Workspace();
  const upsert = vi
    .spyOn(workspace, 'upsert')
    .mockResolvedValue({ id: CREATOR, personId: PERSON });
  await saveCreator(workspace, {
    id: 'sample',
    platform: 'ytb',
    rawNanoListData: { recentPosts: [] },
  });
  expect(upsert.mock.calls[0][2]).not.toHaveProperty('rawNanoProfile');
  expect(upsert.mock.calls[0][2]).not.toHaveProperty('enrichmentResults');
});
it('links an exact case-insensitive additional email without accepting substring matches', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR,
    emails: ['One@Example.Test'],
  });
  vi.spyOn(workspace, 'request').mockResolvedValue(
    page([
      { id: 'wrong', emails: { additionalEmails: ['prefixone@example.test'] } },
      { id: PERSON, emails: { additionalEmails: ['ONE@example.test'] } },
    ]),
  );
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: CREATOR });
  await expect(linkCreatorPerson(CREATOR, workspace)).resolves.toEqual({
    status: 'LINKED',
  });
  expect(update).toHaveBeenCalledWith(
    'Creator',
    CREATOR,
    expect.objectContaining({ personId: PERSON, personLinkStatus: 'LINKED' }),
  );
});
it('does not create People with the default policy when emails have no match', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR,
    emails: ['one@example.test'],
  });
  const request = vi.spyOn(workspace, 'request').mockResolvedValue(page([]));
  vi.spyOn(workspace, 'update').mockResolvedValue({ id: CREATOR });
  await linkCreatorPerson(CREATOR, workspace);
  expect(
    request.mock.calls.every(([query]) => !query.includes('createPerson')),
  ).toBe(true);
});
it('leaves ambiguous email matches unresolved without creating another Person', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR,
    emails: ['one@example.test'],
  });
  vi.spyOn(workspace, 'request').mockResolvedValue(
    page([
      { id: PERSON, emails: { primaryEmail: 'one@example.test' } },
      { id: LIST, emails: { primaryEmail: 'one@example.test' } },
    ]),
  );
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: CREATOR });
  await expect(linkCreatorPerson(CREATOR, workspace)).resolves.toEqual({
    status: 'AMBIGUOUS',
  });
  expect(update).toHaveBeenCalledWith(
    'Creator',
    CREATOR,
    expect.objectContaining({ personLinkStatus: 'AMBIGUOUS' }),
  );
  expect(update.mock.calls[0][2]).not.toHaveProperty('personId');
});
it('preserves a manually linked Person', async () => {
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR,
    personId: PERSON,
    emails: ['other@example.test'],
  });
  const request = vi.spyOn(workspace, 'request');
  await linkCreatorPerson(CREATOR, workspace);
  expect(request).not.toHaveBeenCalled();
});
it('creates favourite People only after an active favourite membership exists', async () => {
  vi.stubEnv('PERSON_CREATION_POLICY', 'FAVOURITES');
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR,
    name: 'Example Creator',
    emails: ['one@example.test'],
  });
  vi.spyOn(workspace, 'find').mockResolvedValue([{ id: LIST }]);
  vi.spyOn(workspace, 'update').mockResolvedValue({ id: CREATOR });
  const request = vi
    .spyOn(workspace, 'request')
    .mockResolvedValueOnce(page([]))
    .mockResolvedValueOnce({ createPerson: { id: PERSON } });
  await linkCreatorPerson(CREATOR, workspace);
  expect(request.mock.calls[1][1]).toMatchObject({
    data: {
      name: { firstName: 'Example', lastName: 'Creator' },
      emails: { primaryEmail: 'one@example.test' },
    },
  });
});
it('does not create a hidden-only creator under the favourites policy', async () => {
  vi.stubEnv('PERSON_CREATION_POLICY', 'FAVOURITES');
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR,
    emails: ['one@example.test'],
  });
  vi.spyOn(workspace, 'find').mockResolvedValue([]);
  vi.spyOn(workspace, 'update').mockResolvedValue({ id: CREATOR });
  const request = vi.spyOn(workspace, 'request').mockResolvedValue(page([]));
  await linkCreatorPerson(CREATOR, workspace);
  expect(
    request.mock.calls.every(([query]) => !query.includes('createPerson')),
  ).toBe(true);
});
it('keeps deleted lists by default and never runs cleanup without opt-in', async () => {
  const workspace = new Workspace();
  const trash = vi.spyOn(workspace, 'trash');
  const get = vi.spyOn(workspace, 'get');
  await expect(cleanupList(LIST, workspace)).resolves.toEqual({
    status: 'KEPT',
  });
  expect(trash).not.toHaveBeenCalled();
  expect(get).not.toHaveBeenCalled();
});
it('only trashes the missing list and its memberships after opt-in', async () => {
  vi.stubEnv('REMOVED_LIST_POLICY', 'TRASH');
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: LIST,
    syncStatus: 'REMOVED',
  });
  vi.spyOn(workspace, 'find').mockResolvedValue([{ id: PERSON }]);
  const trash = vi.spyOn(workspace, 'trash').mockResolvedValue();
  await cleanupList(LIST, workspace);
  expect(trash.mock.calls).toEqual([
    ['Membership', PERSON],
    ['List', LIST],
  ]);
});
it('only trashes removed memberships after complete feeds when opted in', async () => {
  vi.stubEnv('REMOVED_ENTRY_POLICY', 'TRASH');
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({ id: LIST, syncRun: RUN });
  vi.spyOn(workspace, 'find').mockResolvedValue([{ id: PERSON }]);
  vi.spyOn(workspace, 'update').mockResolvedValue({ id: LIST });
  const trash = vi.spyOn(workspace, 'trash').mockResolvedValue();
  await syncPage(
    { listId: LIST, projectId: '7', flag: 'reconcile', page: 1, run: RUN },
    workspace,
  );
  expect(trash.mock.calls).toEqual([['Membership', PERSON]]);
});
it('defaults invalid preferences to no creation, no deletion and manual sync', () => {
  vi.stubEnv('PERSON_CREATION_POLICY', 'invalid');
  vi.stubEnv('REMOVED_ENTRY_POLICY', 'invalid');
  vi.stubEnv('REMOVED_LIST_POLICY', 'invalid');
  vi.stubEnv('SYNC_SCHEDULE', 'invalid');
  expect(getNanoPreferences()).toEqual({
    personCreationPolicy: 'NONE',
    removedEntryPolicy: 'KEEP',
    removedListPolicy: 'KEEP',
    syncSchedule: 'MANUAL',
  });
});
it('does not fetch Nano data from the scheduled job while automatic sync is off', async () => {
  await expect(scheduledSync()).resolves.toEqual({ status: 'DISABLED' });
  expect(listConnections).not.toHaveBeenCalled();
});

it('keeps a missing Nano list by default after a complete successful account scan', async () => {
  const workspace = new Workspace();
  const nano = new NanoClient('fixture', 'account');
  vi.spyOn(nano, 'projects').mockResolvedValue([{ id: '7' }]);
  vi.spyOn(workspace, 'upsert').mockResolvedValue({ id: LIST });
  vi.spyOn(workspace, 'findAll').mockResolvedValue([
    { id: PERSON, projectId: '9' },
  ]);
  const update = vi.spyOn(workspace, 'update').mockResolvedValue({ id: LIST });
  const trash = vi.spyOn(workspace, 'trash');
  await startSync({}, workspace, nano);
  expect(update).toHaveBeenCalledWith('List', PERSON, {
    syncStatus: 'REMOVED',
    syncError: '',
  });
  expect(trash).not.toHaveBeenCalled();
  expect(enqueueJobs).toHaveBeenCalledTimes(1);
});
it('does not infer deleted lists from an account that rejects access', async () => {
  vi.stubEnv('REMOVED_LIST_POLICY', 'TRASH');
  const workspace = new Workspace();
  const nano = new NanoClient('fixture', 'account');
  vi.spyOn(nano, 'projects').mockRejectedValue(new NanoHttpError(403));
  const find = vi.spyOn(workspace, 'findAll');
  const trash = vi.spyOn(workspace, 'trash');
  await expect(startSync({}, workspace, nano)).rejects.toThrow(
    'No Nano lists could be read',
  );
  expect(find).not.toHaveBeenCalled();
  expect(trash).not.toHaveBeenCalled();
});
it('supports explicit auto-create-all without inventing a contact email', async () => {
  vi.stubEnv('PERSON_CREATION_POLICY', 'ALL');
  const workspace = new Workspace();
  vi.spyOn(workspace, 'get').mockResolvedValue({
    id: CREATOR,
    name: 'Example Creator',
    emails: [],
  });
  vi.spyOn(workspace, 'update').mockResolvedValue({ id: CREATOR });
  const request = vi
    .spyOn(workspace, 'request')
    .mockResolvedValue({ createPerson: { id: PERSON } });
  await linkCreatorPerson(CREATOR, workspace);
  const data = request.mock.calls[0][1].data;
  expect(data).toMatchObject({
    name: { firstName: 'Example', lastName: 'Creator' },
  });
  expect(data).not.toHaveProperty('emails');
});

it('does not erase known emails when Nano returns no available email addresses', async () => {
  const workspace = new Workspace();
  const upsert = vi
    .spyOn(workspace, 'upsert')
    .mockResolvedValue({ id: CREATOR, emails: ['known@example.test'] });
  const update = vi
    .spyOn(workspace, 'update')
    .mockResolvedValue({ id: CREATOR });
  await saveCreator(workspace, { id: 'sample', platform: 'ytb', email: [] });
  expect(upsert.mock.calls[0][2]).not.toHaveProperty('emails');
  expect(update).toHaveBeenCalledWith('Creator', CREATOR, {
    emailAvailability: 'AVAILABLE',
  });
});

it('recognizes rate limits from servers that expose only the standard error code', async () => {
  vi.spyOn(RestApiClient.prototype, 'post').mockResolvedValue({
    errors: [{ message: 'Limited', extensions: { code: 'RATE_LIMITED' } }],
  });
  await expect(
    new Workspace().request('query { example }', {}),
  ).rejects.toBeInstanceOf(WorkspaceRateLimitError);
});

it('retries a timed-out list read from its completed creator offset without reconciling or starting a new run', async () => {
  const workspace = new Workspace(),
    client = new NanoClient('fixture');
  vi.spyOn(workspace, 'get').mockResolvedValue({ id: LIST, syncRun: RUN });
  const update = vi.spyOn(workspace, 'update').mockResolvedValue({ id: LIST });
  vi.spyOn(client, 'page').mockRejectedValue(
    new NanoTransportError('Timed out'),
  );
  expect(
    await syncPage(
      {
        listId: LIST,
        projectId: '1',
        run: RUN,
        flag: 'fav',
        page: 2,
        channelOffset: 5,
      },
      workspace,
      client,
    ),
  ).toEqual({ status: 'DEFERRED' });
  expect(enqueueJobs).toHaveBeenCalledWith(
    expect.objectContaining({
      delayMs: 60000,
      jobs: [
        {
          payload: expect.objectContaining({
            run: RUN,
            page: 2,
            channelOffset: 5,
            readRetryAttempt: 1,
          }),
        },
      ],
    }),
  );
  expect(update).not.toHaveBeenCalledWith(
    'List',
    LIST,
    expect.objectContaining({ syncStatus: 'FAILED' }),
  );
});
