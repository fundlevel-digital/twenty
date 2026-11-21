import { beforeEach, expect, it, vi } from 'vitest';
const { records, createRecordIfMissing } = vi.hoisted(() => {
  const records = new Map<string, unknown>();
  return {
    records,
    createRecordIfMissing: vi.fn(
      async (plural: string, id: string, fields: unknown) => {
        if (!records.has(id)) records.set(id, { plural, fields });
      },
    ),
  };
});
vi.mock('src/logic-functions/utils/sync-records', () => ({
  createRecordIfMissing,
  recordId: (...parts: string[]) => parts.join(':'),
  syncLead: vi.fn(),
}));
import { syncEmailRelations } from 'src/logic-functions/utils/sync-relations';
import { type NativeEmail } from 'src/logic-functions/utils/native-email';
const EMAIL: NativeEmail = {
  externalId: 'mail-1',
  workspaceId: 'source-workspace',
  workspaceName: 'Workspace',
  sender: 'one@example.com',
  leadEmail: 'lead@example.com',
  subject: 'Hello',
  text: 'Hello',
  direction: 'OUT',
  receivedAt: '2026-11-21T00:00:00Z',
};
beforeEach(() => {
  records.clear();
  vi.clearAllMocks();
});
it('retains multiple Leads, Senders and native conversations on one source Thread without duplicate links', async () => {
  await syncEmailRelations(
    EMAIL,
    'conversation-1',
    'sender-1',
    ['lead-1', 'lead-2'],
    'thread-1',
  );
  const size = records.size;
  await syncEmailRelations(
    EMAIL,
    'conversation-1',
    'sender-1',
    ['lead-1', 'lead-2'],
    'thread-1',
  );
  expect(records.size).toBe(size);
  await syncEmailRelations(
    { ...EMAIL, sender: 'two@example.com' },
    'conversation-2',
    'sender-2',
    ['lead-1'],
    'thread-1',
  );
  expect(
    [...records.keys()].filter((key) =>
      key.startsWith('link:plusvibeThreadLeads:'),
    ),
  ).toHaveLength(2);
  expect(
    [...records.keys()].filter((key) =>
      key.startsWith('link:plusvibeThreadConversations:'),
    ),
  ).toHaveLength(2);
  expect(
    [...records.keys()].filter((key) =>
      key.startsWith('link:plusvibeThreadSenders:'),
    ),
  ).toHaveLength(2);
  expect(
    [...records.keys()].filter((key) =>
      key.startsWith('link:plusvibeLeadSenders:lead-1:'),
    ),
  ).toHaveLength(2);
});
