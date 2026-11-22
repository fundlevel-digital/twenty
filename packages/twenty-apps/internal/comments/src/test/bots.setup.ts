import { vi } from 'vitest';
vi.mock('../openbot/provider', () => ({
  getPublicOpenBotAgents: vi.fn(async () => []),
  readBotRecord: vi.fn(async () => ({ comments: [], statuses: [] })),
  botProviderRequest: vi.fn(async () => ({ queued: true })),
}));
