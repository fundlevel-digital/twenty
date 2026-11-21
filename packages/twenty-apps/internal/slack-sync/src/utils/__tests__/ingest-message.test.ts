import { describe, expect, it, vi } from 'vitest';
import { ingestSlackMessage } from 'src/utils/ingest-message';
const mocks = vi.hoisted(() => ({
  ingestMessages: vi.fn(),
  get: vi.fn(),
  updateMessages: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  ingestMessages: mocks.ingestMessages,
  kv: { get: mocks.get },
}));
vi.mock('src/utils/update-messages', () => ({
  updateMessages: mocks.updateMessages,
}));
describe('delete and initial import races', () => {
  it('replays a delete arriving after mapping but before the initial insert', async () => {
    let tombstone: string | null = null;
    mocks.ingestMessages.mockImplementation(async () => {
      tombstone = '2026-11-21T12:00:00.000Z';
      return [];
    });
    mocks.get.mockImplementation(async () => tombstone);
    await ingestSlackMessage('channel', {
      externalId: 'T:C:100',
      threadExternalId: 'T:C:100',
      text: 'Original',
      receivedAt: new Date(),
      participants: [{ role: 'FROM', handle: 'T:U' }],
    });
    expect(mocks.updateMessages).toHaveBeenCalledWith({
      messageChannelId: 'channel',
      messages: [
        {
          externalId: 'T:C:100',
          providerMetadata: { deletedAt: tombstone, updatedAt: tombstone },
        },
      ],
    });
  });
});
