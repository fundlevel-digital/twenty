import { createHash } from 'node:crypto';
import { ExternalAssistantService } from './external-assistant.service';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { KeyValuePairType } from 'src/engine/core-modules/key-value-pair/key-value-pair.entity';
import { type ExternalAssistantRequest } from './external-assistant.types';

type Row = {
  workspaceId: string;
  applicationId: string;
  key: string;
  type: KeyValuePairType;
  value: unknown;
  application?: { deletedAt: null };
};
const workspaceId = '33333333-3333-4333-8333-333333333333';
const botId = '11111111-1111-4111-8111-111111111111';
const handlerId = '22222222-2222-4222-8222-222222222222';
const application = { id: 'application' } as FlatApplication;
const actor = {
  workspaceId,
  workspaceMemberId: 'member',
  userWorkspaceId: 'membership',
};
const input = {
  id: botId,
  name: 'Research Bot',
  avatarUrl: null,
  enabled: true,
  handlerUniversalIdentifier: handlerId,
};
let rows: Row[];
let sourceParts: Map<string, string>;
const functions = { findOne: jest.fn() };
const memberships = { findOne: jest.fn() };
const executor = { execute: jest.fn() };
const threads = {
  getWritableThread: jest.fn(),
  recordThreadActivity: jest.fn(),
};
const writer = {
  runInTransaction: jest.fn(),
  insertTurn: jest.fn(),
  insertMessage: jest.fn(),
};
const events = { publish: jest.fn() };
const messages = { findOne: jest.fn() };
const parts = { findOne: jest.fn() };
const registry = {
  find: jest.fn(),
  findOne: jest.fn(),
  upsert: jest.fn(),
  manager: { transaction: jest.fn() },
  createQueryBuilder: jest.fn(),
};
let service: ExternalAssistantService;
const key = (row: Row) => `${row.workspaceId}:${row.applicationId}:${row.key}`;
const save = (row: Row) => {
  const existing = rows.find((r) => key(r) === key(row));
  if (existing) {
    Object.assign(existing, row);
  } else {
    rows.push({ ...row, application: { deletedAt: null } });
  }
};
const grant = (overrides: Partial<ExternalAssistantRequest> = {}) => {
  const request: ExternalAssistantRequest = {
    id: 'request',
    assistantId: botId,
    threadId: 'thread',
    messageId: 'message',
    workspaceMemberId: 'member',
    text: 'Stored request',
    expiresAt: Date.now() + 60000,
    ...overrides,
  };
  sourceParts.set(request.messageId, request.text);
  save({
    workspaceId,
    applicationId: application.id,
    key: 'external-assistant:request:' + request.id,
    type: KeyValuePairType.CONFIG_VARIABLE,
    value: {
      ...request,
      text: undefined,
      textDigest: createHash('sha256').update(request.text).digest('hex'),
    },
  });
  return request;
};
beforeEach(() => {
  jest.resetAllMocks();
  rows = [];
  sourceParts = new Map();
  functions.findOne.mockResolvedValue({ id: 'handler' });
  memberships.findOne.mockResolvedValue({ userId: 'user' });
  executor.execute.mockResolvedValue({ data: { queued: true } });
  registry.findOne.mockImplementation(
    async ({ where }) =>
      rows.find((row) =>
        Object.entries(where).every(
          ([property, value]) => row[property as keyof Row] === value,
        ),
      ) ?? null,
  );
  registry.find.mockImplementation(async ({ where }) =>
    rows.filter(
      (row) =>
        row.workspaceId === where.workspaceId &&
        row.key.startsWith('external-assistant:profile:'),
    ),
  );
  registry.upsert.mockImplementation(async (row) => save(row));
  registry.manager.transaction.mockImplementation(async (work) =>
    work({ query: jest.fn(), getRepository: () => registry }),
  );
  registry.createQueryBuilder.mockImplementation(() => {
    let value: Row;
    const builder = {
      insert: () => builder,
      values: (row: Row) => {
        value = row;
        return builder;
      },
      orIgnore: () => builder,
      execute: async () => {
        if (!rows.some((row) => key(row) === key(value))) {
          save(value);
        }
      },
    };
    return builder;
  });
  threads.getWritableThread.mockResolvedValue({ id: 'thread' });
  messages.findOne.mockResolvedValue({ id: 'message' });
  parts.findOne.mockImplementation(async (_workspace, { where }) =>
    sourceParts.has(where.messageId)
      ? {
          type: 'text',
          textContent: sourceParts.get(where.messageId),
          providerMetadata: {
            twenty: {
              assistantReplyContext: {
                isAssistantMentioned: false,
                isDirectAssistantChat: false,
                isStructuredRequestContinuation: false,
                mentionedExternalAssistantIds: [botId],
              },
            },
          },
        }
      : null,
  );
  writer.runInTransaction.mockImplementation(async ({ work }) =>
    work({
      executeRawQuery: async (query: string, parameters: string[]) =>
        query.includes('textContent') && sourceParts.has(parameters[0])
          ? [{ textContent: sourceParts.get(parameters[0]) }]
          : [],
    }),
  );
  writer.insertTurn.mockResolvedValue('turn');
  writer.insertMessage.mockImplementation(
    async ({ id, parts: messageParts }) => {
      sourceParts.set(id, messageParts[0].text);
      return id;
    },
  );
  service = new ExternalAssistantService(
    ...([
      memberships,
      registry,
      functions,
      executor,
      threads,
      writer,
      events,
      messages,
      parts,
    ] as unknown as ConstructorParameters<typeof ExternalAssistantService>),
  );
});

it('registers only an application-owned handler and protects registry values from ordinary app KV', async () => {
  await service.register(workspaceId, application, input);
  expect(functions.findOne).toHaveBeenCalledWith(
    workspaceId,
    expect.objectContaining({
      where: expect.objectContaining({
        applicationId: application.id,
        universalIdentifier: handlerId,
      }),
    }),
  );
  expect(functions.findOne.mock.calls[0][1].where).not.toHaveProperty(
    'workspaceId',
  );
  expect(rows[0].type).toBe(KeyValuePairType.CONFIG_VARIABLE);
  expect(await service.list(workspaceId)).toEqual([
    expect.objectContaining({ id: botId, name: 'Research Bot' }),
  ]);
  expect(JSON.stringify(await service.list(workspaceId))).not.toContain(
    'secret',
  );
});
it.each([
  'invalid',
  'http://example.test/avatar.png',
  'https://user:password@example.test/avatar.png',
])(
  'rejects an invalid or credential-bearing avatar URL: %s',
  async (avatarUrl) => {
    await expect(
      service.register(workspaceId, application, { ...input, avatarUrl }),
    ).rejects.toThrow('HTTPS avatar URL');
    expect(rows).toHaveLength(0);
  },
);
it('rejects a handler outside the owning app', async () => {
  functions.findOne.mockResolvedValue(null);
  await expect(
    service.register(workspaceId, application, input),
  ).rejects.toThrow('owned by this application');
  expect(rows).toHaveLength(0);
});
it('rejects taking over another application’s stable identity', async () => {
  await service.register(workspaceId, application, input);
  await expect(
    service.register(workspaceId, { id: 'other' } as FlatApplication, input),
  ).rejects.toThrow('another application');
});
it('keeps identity IDs when renamed and stops discovery and requests when disabled', async () => {
  await service.register(workspaceId, application, input);
  grant();
  await service.register(workspaceId, application, {
    ...input,
    name: 'Renamed Bot',
    enabled: false,
  });
  expect(await service.list(workspaceId)).toEqual([]);
  await expect(
    service.request(workspaceId, application.id, 'request'),
  ).rejects.toThrow('Assistant unavailable');
});
it('rejects arbitrary-thread replies from another app or an expired grant', async () => {
  await service.register(workspaceId, application, input);
  grant();
  await expect(
    service.reply(workspaceId, 'other', 'request', 'Spoofed'),
  ).rejects.toThrow('request unavailable');
  grant({ expiresAt: Date.now() - 1 });
  await expect(
    service.reply(workspaceId, application.id, 'request', 'Expired'),
  ).rejects.toThrow('expired');
  expect(writer.insertMessage).not.toHaveBeenCalled();
});
it('rechecks the source member’s thread access before a reply', async () => {
  await service.register(workspaceId, application, input);
  grant();
  threads.getWritableThread.mockRejectedValue(new Error('Access revoked'));
  await expect(
    service.reply(workspaceId, application.id, 'request', 'Private'),
  ).rejects.toThrow('Access revoked');
  expect(writer.insertMessage).not.toHaveBeenCalled();
});
it('writes one attributed reply into the granted thread and rejects replacement text', async () => {
  await service.register(workspaceId, application, input);
  grant();
  await service.reply(workspaceId, application.id, 'request', 'Done');
  await service.reply(workspaceId, application.id, 'request', 'Done');
  expect(writer.insertMessage).toHaveBeenCalledTimes(1);
  expect(writer.insertMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      threadId: 'thread',
      senderApplicationId: application.id,
      parts: [
        expect.objectContaining({
          providerMetadata: {
            externalAssistant: expect.objectContaining({
              id: botId,
              name: 'Research Bot',
              applicationId: application.id,
            }),
          },
        }),
      ],
    }),
  );
  await expect(
    service.reply(workspaceId, application.id, 'request', 'Changed'),
  ).rejects.toThrow('different reply');
});
it('dispatches the saved message with its member context and no model execution', async () => {
  await service.register(workspaceId, application, input);
  const text = `[[record:externalAssistant:${botId}:Research Bot]] Help`;
  sourceParts.set('message', text);
  expect(await service.dispatch(actor, 'thread', 'message')).toBe(true);
  expect(executor.execute).toHaveBeenCalledWith(
    expect.objectContaining({
      logicFunctionId: 'handler',
      userId: 'user',
      userWorkspaceId: 'membership',
      payload: { requestId: expect.any(String) },
    }),
  );
  const request = rows.find((row) =>
    row.key.startsWith('external-assistant:request:'),
  )?.value as ExternalAssistantRequest;
  expect(request).toMatchObject({
    textDigest: createHash('sha256').update(text).digest('hex'),
    messageId: 'message',
    threadId: 'thread',
    workspaceMemberId: 'member',
  });
});
it('returns a delivery failure without losing the stored member message', async () => {
  await service.register(workspaceId, application, input);
  sourceParts.set(
    'message',
    `[[record:externalAssistant:${botId}:Research Bot]] Help`,
  );
  executor.execute.mockRejectedValue(new Error('Unavailable'));
  expect(await service.dispatch(actor, 'thread', 'message')).toBe(false);
  expect(sourceParts.has('message')).toBe(true);
});
it('rejects stale or forged assistant mentions before dispatch', async () => {
  await expect(
    service.validateMentions(
      workspaceId,
      `[[record:externalAssistant:${botId}:Fake]]`,
      [botId],
    ),
  ).rejects.toThrow('unavailable');
  expect(executor.execute).not.toHaveBeenCalled();
});

it('rejects late replies into a deleted conversation', async () => {
  await service.register(workspaceId, application, input);
  grant();
  threads.getWritableThread.mockResolvedValue({
    id: 'thread',
    deletedAt: new Date(),
  });
  await expect(
    service.reply(workspaceId, application.id, 'request', 'Late'),
  ).rejects.toThrow('conversation unavailable');
  expect(writer.insertMessage).not.toHaveBeenCalled();
});

it('does not dispatch a quoted or plain-text reference without explicit recipient selection', async () => {
  await service.register(workspaceId, application, input);
  expect(
    await service.validateMentions(
      workspaceId,
      `> [[record:externalAssistant:${botId}:Research Bot]]`,
    ),
  ).toEqual([]);
  expect(executor.execute).not.toHaveBeenCalled();
});

it('permits notification attribution only to an active identity owned by the caller app', async () => {
  await service.register(workspaceId, application, input);
  expect(
    await service.ownedIdentity(workspaceId, application.id, botId),
  ).toMatchObject({ id: botId, applicationId: application.id });
  await expect(
    service.ownedIdentity(workspaceId, 'other', botId),
  ).rejects.toThrow('not enrolled by this application');
});
