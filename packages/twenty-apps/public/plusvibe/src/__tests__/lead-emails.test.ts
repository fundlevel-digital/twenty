import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  values,
  plusvibeRequest,
  syncNativeEmail,
  enqueueJobs,
  post,
  syncPerson,
  enqueueSyncTasks,
  wakeSyncWorker,
} = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  plusvibeRequest: vi.fn(),
  syncNativeEmail: vi.fn(),
  enqueueJobs: vi.fn(),
  post: vi.fn(),
  syncPerson: vi.fn(),
  enqueueSyncTasks: vi.fn(),
  wakeSyncWorker: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  enqueueJobs,
  kv: {
    delete: vi.fn(async (key: string) => values.delete(key)),
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({ plusvibeRequest }));
vi.mock('src/logic-functions/utils/native-email', () => ({ syncNativeEmail }));
vi.mock('src/logic-functions/utils/sync-records', () => ({
  syncPerson,
  enqueueSyncTasks,
  wakeSyncWorker,
  recordId: (...parts: string[]) => parts.join(':'),
}));
vi.mock('src/logic-functions/utils/sync-jobs', () => ({
  enqueueSyncTasks,
  wakeSyncWorker,
}));
vi.mock('src/logic-functions/backfill', () => ({
  sourceIdentity: (source: { id: string }) => source.id,
}));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    post = post;
  },
}));

import {
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
} from 'src/constants/plusvibe';
import {
  findCampaignSender,
  leadEmailsHandler,
  processLeadEmails,
} from 'src/logic-functions/lead-emails';

const INPUT = {
  workspaceId: 'workspace-1',
  runId: 'run-1',
  leadEmail: 'lead@example.com',
};
const CONTEXT = {
  workspaceId: 'twenty-workspace',
  retryCount: 0,
  maxRetries: 3,
  userWorkspaceId: null,
  workspaceMemberId: null,
};
const EMAIL = {
  id: 'message-1',
  message_id: '<message@example.com>',
  eaccount: 'sender@example.com',
  lead: INPUT.leadEmail,
  sent_on: '2026-11-20T10:00:00Z',
  body: 'Hello',
};

beforeEach(() => {
  vi.clearAllMocks();
  values.clear();
  plusvibeRequest.mockReset();
  syncNativeEmail.mockReset();
  values.set(SELECTION_KEY, [INPUT.workspaceId]);
  values.set(getImportKey(INPUT.workspaceId), { runId: INPUT.runId });
  values.set(getRegistrationKey(INPUT.workspaceId), { workspaceName: 'Sales' });
  enqueueJobs.mockResolvedValue({ enqueued: true });
  post.mockReset();
  syncPerson.mockResolvedValue('person-1');
});

describe('Campaign sent-email history', () => {
  it('resolves an unambiguous campaign sender from participant connections', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ ...EMAIL, eaccount: '', campaign_id: 'campaign-1' }],
    });
    post.mockResolvedValueOnce({
      data: {
        messages: {
          totalCount: 3,
          edges: [
            {
              node: {
                plusvibeSenderRecord: {
                  emails: { primaryEmail: 'sender@example.com' },
                },
                messageParticipants: {
                  edges: [{ node: { handle: INPUT.leadEmail } }],
                },
              },
            },
            {
              node: {
                plusvibeSenderRecord: {
                  emails: { primaryEmail: 'unrelated@example.com' },
                },
                messageParticipants: {
                  edges: [{ node: { handle: 'other@example.com' } }],
                },
              },
            },
            {
              node: {
                plusvibeSenderRecord: {
                  emails: { primaryEmail: 'SENDER@example.com' },
                },
                messageParticipants: {
                  edges: [{ node: { handle: INPUT.leadEmail } }],
                },
              },
            },
          ],
        },
      },
    });
    expect(
      await findCampaignSender(
        INPUT.workspaceId,
        'campaign-1',
        INPUT.leadEmail,
      ),
    ).toBe('sender@example.com');
    expect(post).toHaveBeenCalledWith(
      '/graphql',
      expect.objectContaining({
        variables: {
          workspace: 'workspace:' + INPUT.workspaceId,
          campaign: 'campaign:workspace-1:campaign-1',
          lead: INPUT.leadEmail,
        },
      }),
    );
  });

  it('leaves the sender unresolved when conversations disagree or results are incomplete', async () => {
    post.mockResolvedValueOnce({
      data: {
        messages: {
          totalCount: 2,
          edges: [
            {
              node: {
                plusvibeSenderRecord: {
                  emails: { primaryEmail: 'first@example.com' },
                },
                messageParticipants: {
                  edges: [{ node: { handle: INPUT.leadEmail } }],
                },
              },
            },
            {
              node: {
                plusvibeSenderRecord: {
                  emails: { primaryEmail: 'second@example.com' },
                },
                messageParticipants: {
                  edges: [{ node: { handle: INPUT.leadEmail } }],
                },
              },
            },
          ],
        },
      },
    });
    expect(
      await findCampaignSender(
        INPUT.workspaceId,
        'campaign-1',
        INPUT.leadEmail,
      ),
    ).toBeUndefined();
    post.mockResolvedValueOnce({
      data: {
        messages: {
          totalCount: 2,
          edges: [
            {
              node: {
                plusvibeSenderRecord: {
                  emails: { primaryEmail: 'first@example.com' },
                },
                messageParticipants: {
                  edges: [{ node: { handle: INPUT.leadEmail } }],
                },
              },
            },
          ],
        },
      },
    });
    expect(
      await findCampaignSender(
        INPUT.workspaceId,
        'campaign-1',
        INPUT.leadEmail,
      ),
    ).toBeUndefined();
  });

  it('persists source emails before publishing the next page', async () => {
    plusvibeRequest.mockResolvedValue({
      data: [EMAIL],
      has_more: false,
      page_trail: 'next',
    });
    expect(await processLeadEmails(INPUT)).toEqual({ discovered: 1 });
    expect(enqueueSyncTasks).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({
        kind: 'EMAIL',
        payload: expect.objectContaining({ source: EMAIL, origin: 'campaign' }),
      }),
    ]);
    expect(enqueueSyncTasks).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({
        kind: 'CAMPAIGN_HISTORY',
        payload: { ...INPUT, pageTrail: 'next', visitedTrails: ['start'] },
      }),
    ]);
    expect(syncNativeEmail).not.toHaveBeenCalled();
  });
  it('does not publish another page when saving its source emails fails', async () => {
    plusvibeRequest.mockResolvedValue({ data: [EMAIL], page_trail: 'next' });
    enqueueSyncTasks.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(processLeadEmails(INPUT)).rejects.toThrow(
      'Storage unavailable',
    );
    expect(enqueueSyncTasks).toHaveBeenCalledOnce();
  });
  it('rejects incomplete or repeated pagination', async () => {
    plusvibeRequest.mockResolvedValue({ data: [], has_more: true });
    await expect(processLeadEmails(INPUT)).rejects.toThrow('pagination');
    plusvibeRequest.mockResolvedValue({ data: [], page_trail: 'current' });
    await expect(
      processLeadEmails({ ...INPUT, pageTrail: 'current' }),
    ).rejects.toThrow('pagination');
  });
  it('keeps superseded runs from fetching source history', async () => {
    expect(await processLeadEmails({ ...INPUT, runId: 'old' })).toEqual({
      skipped: true,
    });
    expect(plusvibeRequest).not.toHaveBeenCalled();
  });
  it('turns old queue deliveries into durable tasks without inline ingestion', async () => {
    expect(await leadEmailsHandler(INPUT, CONTEXT)).toEqual({ queued: true });
    expect(enqueueSyncTasks).toHaveBeenCalledWith([
      expect.objectContaining({ kind: 'CAMPAIGN_HISTORY', payload: INPUT }),
    ]);
    expect(plusvibeRequest).not.toHaveBeenCalled();
  });
});
