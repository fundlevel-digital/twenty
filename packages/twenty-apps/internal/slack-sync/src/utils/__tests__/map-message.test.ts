import * as schema from 'src/constants/schema-identifiers';
vi.mock('src/utils/slack-channel', () => ({
  upsertSlackChannel: vi.fn().mockResolvedValue('channel-record'),
}));
import type * as SlackModule from 'src/utils/slack';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mapMessage, type MappingCache } from 'src/utils/map-message';
const mocks = vi.hoisted(() => ({
  slackRequest: vi.fn(),
  post: vi.fn(),
  listConnections: vi.fn(),
  get: vi.fn(),
}));
vi.mock('src/utils/slack', async (original) => ({
  ...(await original<typeof SlackModule>()),
  slackRequest: mocks.slackRequest,
}));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    post = mocks.post;
  },
}));
vi.mock('twenty-sdk/logic-function', () => ({
  listConnections: mocks.listConnections,
  kv: { get: mocks.get },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(null);
  mocks.listConnections.mockResolvedValue([]);
  mocks.slackRequest.mockImplementation(async (_token, method, parameters) => {
    if (method === 'conversations.info') return { channel: { id: 'C' } };
    if (method === 'conversations.members')
      return { members: ['INTERNAL', 'CLIENT'] };
    if (method === 'users.info')
      return { user: { profile: { email: `${parameters.user}@example.com` } } };
    if (method === 'chat.getPermalink')
      return { permalink: 'https://example.slack.com/archives/C/p1' };
    throw new Error(method);
  });
  mocks.post.mockImplementation(async (_path, request) => ({
    data: {
      people: {
        edges: request.variables.email.startsWith('client')
          ? [{ node: { id: 'person' } }]
          : [],
      },
      workspaceMembers: {
        edges: request.variables.email.startsWith('internal')
          ? [{ node: { id: 'member' } }]
          : [],
      },
    },
  }));
});
const input = {
  token: 'token',
  teamId: 'T',
  channelId: 'C',
  subject: 'Client',
  message: { ts: '100.000001', user: 'INTERNAL', text: 'Hello' },
};
describe('Slack message record linkage', () => {
  it('associates one shared conversation with every uniquely matched lead in its channel', async () => {
    const originalSlackRequest = mocks.slackRequest.getMockImplementation();
    mocks.slackRequest.mockImplementation(async (...parameters) =>
      parameters[1] === 'conversations.members'
        ? {
            members: [
              'INTERNAL',
              'LEAD_ONE',
              'LEAD_TWO',
              'LEAD_ONE',
              'UNMATCHED',
            ],
          }
        : originalSlackRequest?.(...parameters),
    );
    mocks.post.mockImplementation(async (_path, request) => ({
      data: {
        people: {
          edges: request.variables.email.startsWith('lead_')
            ? [{ node: { id: request.variables.email.split('@')[0] } }]
            : [],
        },
        workspaceMembers: { edges: [] },
      },
    }));

    const message = await mapMessage(input);
    expect(message.threadExternalId).toBe('T:C:100.000001');
    expect(
      message.participants
        .filter(({ personId }) => personId)
        .map(({ personId }) => personId),
    ).toEqual(['lead_one', 'lead_two']);
    expect(
      message.participants.filter(({ handle }) => handle === 'T:LEAD_ONE'),
    ).toHaveLength(1);
    expect(message.participants).toContainEqual(
      expect.objectContaining({ handle: 'T:UNMATCHED', role: 'TO' }),
    );
    expect(
      message.participants.find(({ handle }) => handle === 'T:UNMATCHED')
        ?.personId,
    ).toBeUndefined();
  });

  it.each([
    ['own Slack workspace', { team_id: 'T' }, [], false],
    ['external lead', { team_id: 'EXTERNAL' }, [], true],
    ['external guest', { team_id: 'T', is_restricted: true }, [], true],
    [
      'employee domain in another workspace',
      { team_id: 'EXTERNAL' },
      ['example.com'],
      false,
    ],
    ['unknown workspace membership', {}, [], false],
    ['bot', { team_id: 'EXTERNAL', is_bot: true }, [], false],
    ['deactivated user', { team_id: 'EXTERNAL', deleted: true }, [], false],
  ])(
    'handles %s for contact auto-creation',
    async (_name, userFields, employeeDomains, eligible) => {
      const originalRequest = mocks.slackRequest.getMockImplementation();
      mocks.slackRequest.mockImplementation(async (...parameters) =>
        parameters[1] === 'users.info'
          ? {
              user: {
                ...userFields,
                profile: {
                  email: 'external@example.com',
                  display_name: 'External',
                },
              },
            }
          : originalRequest?.(...parameters),
      );
      mocks.post.mockResolvedValue({
        data: { people: { edges: [] }, workspaceMembers: { edges: [] } },
      });
      const message = await mapMessage({ ...input, employeeDomains });
      expect('contactEmail' in message.participants[0]).toBe(eligible);
    },
  );

  it('never offers workspace members for automatic lead creation even when Slack places them in another workspace', async () => {
    const originalRequest = mocks.slackRequest.getMockImplementation();
    mocks.slackRequest.mockImplementation(async (...parameters) =>
      parameters[1] === 'users.info'
        ? {
            user: {
              team_id: 'EXTERNAL',
              profile: { email: 'member@example.com' },
            },
          }
        : originalRequest?.(...parameters),
    );
    mocks.post.mockResolvedValue({
      data: {
        people: { edges: [] },
        workspaceMembers: { edges: [{ node: { id: 'member' } }] },
      },
    });
    const message = await mapMessage(input);
    expect(message.participants[0]).toMatchObject({
      workspaceMemberId: 'member',
    });
    expect(message.participants[0]).not.toHaveProperty('contactEmail');
  });

  it('links an outgoing message to its client recipient', async () => {
    const message = await mapMessage(input);
    expect(message.participants).toContainEqual(
      expect.objectContaining({ role: 'TO', personId: 'person' }),
    );
    expect(message.participants).toContainEqual(
      expect.objectContaining({ role: 'FROM', workspaceMemberId: 'member' }),
    );
  });
  it('reuses member and profile queries within a history page', async () => {
    const cache: MappingCache = new Map();
    await mapMessage({ ...input, cache });
    await mapMessage({
      ...input,
      message: { ...input.message, ts: '101.000001' },
      cache,
    });
    expect(mocks.listConnections).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledTimes(2);
    expect(
      mocks.slackRequest.mock.calls.filter(
        (call) => call[1] === 'conversations.members',
      ),
    ).toHaveLength(1);
  });
  it('keeps deleted messages deleted when history later delivers them', async () => {
    mocks.get.mockResolvedValue('2026-11-21T00:00:00.000Z');
    const message = await mapMessage(input);
    expect(message.providerMetadata).toMatchObject({
      deletedAt: '2026-11-21T00:00:00.000Z',
      updatedAt: '2026-11-21T00:00:00.000Z',
    });
  });
});

describe('native Slack fields', () => {
  it('records channel identity and the native parent relation for replies', async () => {
    const previousImplementation = mocks.post.getMockImplementation();
    mocks.post.mockImplementation(async (path, request) =>
      request.query.includes('SlackParent')
        ? { data: { messages: { edges: [{ node: { id: 'parent-record' } }] } } }
        : previousImplementation?.(path, request),
    );
    const mapped = await mapMessage({
      ...input,
      message: { ...input.message, thread_ts: '99.000001' },
    });
    expect(mapped.applicationFields.message).toMatchObject({
      [schema.MESSAGE_SLACK_ID_UNIVERSAL_IDENTIFIER]: 'T:C:100.000001',
      [schema.MESSAGE_CHANNEL_UNIVERSAL_IDENTIFIER]: 'channel-record',
      [schema.MESSAGE_REPLY_ID_UNIVERSAL_IDENTIFIER]: 'T:C:99.000001',
      [schema.MESSAGE_PARENT_UNIVERSAL_IDENTIFIER]: 'parent-record',
    });
    expect(mapped.applicationFields.thread).toEqual({
      [schema.THREAD_SLACK_ID_UNIVERSAL_IDENTIFIER]: 'T:C:99.000001',
      [schema.THREAD_CHANNEL_UNIVERSAL_IDENTIFIER]: 'channel-record',
    });
  });
});
