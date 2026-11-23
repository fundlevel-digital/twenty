import { beforeEach, describe, expect, it, vi } from 'vitest';

const { values, request } = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  request: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({
  plusvibeRequest: request,
}));

import {
  getOwnedInboxesKey,
  verifyOwnedInbox,
} from 'src/logic-functions/utils/verify-owned-inbox';
import { type NativeEmail } from 'src/logic-functions/utils/native-email';

const EMAIL: NativeEmail & { sender: string } = {
  workspaceId: 'workspace',
  workspaceName: 'Sales',
  externalId: 'message',
  sender: 'historical@example.com',
  leadEmail: 'creator@example.net',
  direction: 'IN',
  subject: '',
  text: '',
  receivedAt: '2026-11-23T00:00:00Z',
  senderEvidence: 'RECIPIENT_HEADER',
};

beforeEach(() => {
  values.clear();
  request.mockReset();
});

describe('Owned PlusVibe inbox verification', () => {
  it('retains verified historical inboxes that are no longer connected', async () => {
    values.set(getOwnedInboxesKey(EMAIL.workspaceId), [EMAIL.sender]);
    await expect(verifyOwnedInbox(EMAIL)).resolves.toBeUndefined();
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects external recipients that are not evidenced owned accounts', async () => {
    request.mockResolvedValue({
      accounts: [{ email: 'ours@example.org' }],
      has_more: false,
    });
    await expect(verifyOwnedInbox(EMAIL)).rejects.toThrow('not verified');
    expect(values.size).toBe(0);
  });

  it('verifies a new receiving inbox against the selected provider workspace', async () => {
    request.mockResolvedValue({
      accounts: [{ email: EMAIL.sender.toUpperCase() }],
      has_more: false,
    });
    await verifyOwnedInbox(EMAIL);
    expect(request).toHaveBeenCalledWith(
      '/account/list',
      expect.anything(),
      expect.objectContaining({
        query: expect.objectContaining({ workspace_id: EMAIL.workspaceId }),
      }),
    );
    request.mockReset();
    await verifyOwnedInbox(EMAIL);
    expect(request).not.toHaveBeenCalled();
  });

  it('remembers explicit historical provider account evidence without requiring an active account', async () => {
    await verifyOwnedInbox({ ...EMAIL, senderEvidence: 'PROVIDER_ACCOUNT' });
    await verifyOwnedInbox(EMAIL);
    expect(request).not.toHaveBeenCalled();
  });

  it('follows account pagination and rejects a repeated cursor', async () => {
    request.mockResolvedValue({
      accounts: [],
      has_more: true,
      next_starting_after: 'same',
    });
    await expect(verifyOwnedInbox(EMAIL)).rejects.toThrow(
      'pagination did not advance',
    );
    expect(request).toHaveBeenCalledTimes(2);
  });
});

it('does not accept an account explicitly assigned to a different workspace', async () => {
  request.mockResolvedValue({
    accounts: [{ email: EMAIL.sender, workspace_id: 'another-workspace' }],
    has_more: false,
  });
  await expect(verifyOwnedInbox(EMAIL)).rejects.toThrow('not verified');
});

it('does not trust an outgoing flag and external From header as ownership', async () => {
  request.mockResolvedValue({ accounts: [], has_more: false });
  await expect(
    verifyOwnedInbox({
      ...EMAIL,
      direction: 'OUT',
      senderEvidence: 'OUTBOUND_HEADER',
    }),
  ).rejects.toThrow('not verified');
});
