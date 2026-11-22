import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type RecordComment } from '../types';
import { filterThreads } from '../utils/filter-threads';
const mocks = vi.hoisted(() => ({
  graphql: vi.fn(),
  get: vi.fn(),
  query: vi.fn(),
  send: vi.fn(),
  clientOptions: vi.fn(),
  mention: vi.fn(),
  reference: vi.fn(),
}));
vi.mock('../utils/graphql', () => ({ graphql: mocks.graphql }));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    get = mocks.get;
  },
}));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    constructor(options?: unknown) {
      mocks.clientOptions(options);
    }
    query = mocks.query;
    mutation = mocks.send;
  },
}));
vi.mock('twenty-sdk/logic-function', () => ({
  inboxMention: mocks.mention,
  inboxReferenceRecord: mocks.reference,
}));
import { commentsHandler } from '../logic-functions/comments';

const target = {
  objectName: 'company',
  recordId: '11111111-1111-4111-8111-111111111111',
};
const context = {
  workspaceId: 'workspace',
  userWorkspaceId: 'user',
  workspaceMemberId: 'member',
  retryCount: 0,
  maxRetries: 0,
};
const comment = (overrides: Partial<RecordComment> = {}): RecordComment => ({
  id: 'thread',
  body: 'Hello',
  authorId: 'member',
  authorName: 'Alex',
  parentId: null,
  resolved: false,
  deleted: false,
  createdAt: new Date().toISOString(),
  mentions: '[]',
  targetObject: 'company',
  targetRecordId: target.recordId,
  ...overrides,
});
const call = (
  body: Parameters<typeof commentsHandler>[0]['body'],
  caller = context,
) => commentsHandler({ body } as Parameters<typeof commentsHandler>[0], caller);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.mention.mockResolvedValue('[[record:workspaceMember:teammate:Taylor]]');
  mocks.reference.mockResolvedValue('[[record:company:record:Acme]]');
  mocks.query.mockResolvedValue({
    objects: {
      edges: [{ node: { nameSingular: 'company', namePlural: 'companies' } }],
    },
  });
  mocks.get.mockResolvedValue({
    data: {
      company: { id: target.recordId, name: 'Acme' },
      workspaceMember: { name: { firstName: 'Alex', lastName: 'Smith' } },
    },
  });
  mocks.graphql.mockResolvedValue({
    recordComments: {
      edges: [{ node: comment() }],
      pageInfo: { hasNextPage: false },
    },
  });
});
describe('comment access', () => {
  it('rejects unauthenticated callers before reading anything', async () => {
    await expect(
      call({ ...target, action: 'list' }, {
        ...context,
        workspaceMemberId: null,
      } as unknown as typeof context),
    ).rejects.toThrow('Sign in');
    expect(mocks.graphql).not.toHaveBeenCalled();
  });
  it('checks record access before application reads', async () => {
    mocks.get.mockRejectedValue(new Error('Forbidden'));
    await expect(call({ ...target, action: 'list' })).rejects.toThrow(
      'Forbidden',
    );
    expect(mocks.graphql).not.toHaveBeenCalled();
  });
  it('prevents deleting another author’s comment', async () => {
    await expect(
      call(
        { ...target, action: 'delete', id: 'thread' },
        { ...context, workspaceMemberId: 'someone-else' },
      ),
    ).rejects.toThrow('Only the author');
    expect(mocks.graphql).toHaveBeenCalledTimes(1);
  });
  it('rejects replies to a thread on another record', async () => {
    await expect(
      call({
        ...target,
        action: 'create',
        parentId: 'other-thread',
        body: 'Reply',
      }),
    ).rejects.toThrow('Reply to an open thread');
    expect(mocks.graphql).toHaveBeenCalledTimes(1);
  });
  it('rejects replies to resolved threads', async () => {
    mocks.graphql.mockResolvedValue({
      recordComments: {
        edges: [{ node: comment({ resolved: true }) }],
        pageInfo: { hasNextPage: false },
      },
    });
    await expect(
      call({ ...target, action: 'create', parentId: 'thread', body: 'Reply' }),
    ).rejects.toThrow('Reply to an open thread');
  });
  it('rejects empty comments', async () => {
    await expect(
      call({ ...target, action: 'create', body: '   ' }),
    ).rejects.toThrow('Write a comment');
  });
  it('rejects unresolved typed recipients before saving a comment', async () => {
    await expect(
      call({
        ...target,
        action: 'create',
        body: 'Hello @unknown',
        mentions: [],
      }),
    ).rejects.toThrow('Select a user, bot, or record');
    expect(mocks.graphql).toHaveBeenCalledTimes(1);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('rejects an inaccessible selected recipient before saving or notifying', async () => {
    mocks.mention.mockRejectedValueOnce(new Error('Recipient unavailable'));
    await expect(
      call({
        ...target,
        action: 'create',
        body: 'Hello @Taylor',
        mentions: [
          { id: 'missing', label: 'Taylor', objectName: 'workspaceMember' },
        ],
      }),
    ).rejects.toThrow('Recipient unavailable');
    expect(mocks.graphql).toHaveBeenCalledTimes(1);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('paginates without dropping earlier comments', async () => {
    mocks.graphql
      .mockResolvedValueOnce({
        recordComments: {
          edges: [{ node: comment() }],
          pageInfo: { hasNextPage: true, endCursor: 'next' },
        },
      })
      .mockResolvedValueOnce({
        recordComments: {
          edges: [{ node: comment({ id: 'second' }) }],
          pageInfo: { hasNextPage: false },
        },
      });
    expect(await call({ ...target, action: 'list' })).toMatchObject({
      comments: [{ id: 'thread' }, { id: 'second' }],
    });
  });
  it('delivers mentions as the application with record context', async () => {
    mocks.graphql
      .mockResolvedValueOnce({
        recordComments: { edges: [], pageInfo: { hasNextPage: false } },
      })
      .mockResolvedValueOnce({
        createRecordComment: comment({ body: 'Hello @Taylor' }),
      });
    mocks.send.mockResolvedValue({
      sendInboxMessage: { threadId: 'inbox-thread' },
    });
    const result = await call({
      ...target,
      action: 'create',
      body: 'Hello @Taylor',
      mentions: [
        { id: 'teammate', label: 'Taylor', objectName: 'workspaceMember' },
      ],
    });
    expect(result).toMatchObject({ notificationFailed: false });
    expect(mocks.clientOptions).toHaveBeenCalledWith({ runAs: 'application' });
    expect(mocks.send).toHaveBeenCalledWith({
      sendInboxMessage: {
        __args: {
          input: expect.objectContaining({
            workspaceMemberIds: ['teammate'],
            text: '[[record:company:record:Acme]]\n\nHello [[record:workspaceMember:teammate:Taylor]]',
          }),
        },
        threadId: true,
      },
    });
  });
  it('does not notify an identity whose selected label is now part of an email', async () => {
    mocks.graphql
      .mockResolvedValueOnce({
        recordComments: { edges: [], pageInfo: { hasNextPage: false } },
      })
      .mockResolvedValueOnce({
        createRecordComment: comment({ body: 'alex@example.test' }),
      });
    await call({
      ...target,
      action: 'create',
      body: 'alex@example.test',
      mentions: [
        {
          id: 'teammate',
          label: 'example.test',
          objectName: 'workspaceMember',
        },
      ],
    });
    expect(mocks.mention).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.graphql).toHaveBeenLastCalledWith(
      expect.any(String),
      {
        data: expect.objectContaining({ mentions: '[]' }),
      },
      true,
    );
  });
  it('keeps a saved comment when notification delivery fails', async () => {
    mocks.graphql
      .mockResolvedValueOnce({
        recordComments: { edges: [], pageInfo: { hasNextPage: false } },
      })
      .mockResolvedValueOnce({
        createRecordComment: comment({ body: 'Hello @Taylor' }),
      });
    mocks.send.mockRejectedValue(new Error('Offline'));
    expect(
      await call({
        ...target,
        action: 'create',
        body: 'Hello @Taylor',
        mentions: [
          { id: 'teammate', label: 'Taylor', objectName: 'workspaceMember' },
        ],
      }),
    ).toMatchObject({
      notificationFailed: true,
      comments: [{ body: 'Hello @Taylor' }],
    });
  });
});
describe('thread filters', () => {
  it('includes threads the member replied to', () => {
    const root = comment({ authorId: 'other' });
    expect(
      filterThreads(
        [root, comment({ id: 'reply', parentId: root.id })],
        'member',
        false,
        true,
      ),
    ).toEqual([root]);
  });
  it('hides resolved threads by default', () => {
    expect(
      filterThreads([comment({ resolved: true })], 'member', false, false),
    ).toEqual([]);
  });
  it('keeps replies visible when the original comment is deleted', () => {
    const root = comment({ deleted: true });
    expect(
      filterThreads(
        [root, comment({ id: 'reply', parentId: root.id })],
        'member',
        false,
        false,
      ),
    ).toEqual([root]);
  });
});

describe('custom object record comments', () => {
  const entryObjectName = 'reviewEntry';
  const otherEntryObjectName = 'followUpEntry';
  const entryTarget = { ...target, objectName: entryObjectName };
  const otherEntryTarget = { ...target, objectName: otherEntryObjectName };
  const storedComments = [
    comment({ id: 'parent-thread' }),
    comment({ id: 'entry-thread', targetObject: entryObjectName }),
    comment({ id: 'other-list-thread', targetObject: otherEntryObjectName }),
  ];
  beforeEach(() => {
    mocks.query.mockResolvedValue({
      objects: {
        edges: [
          {
            node: {
              nameSingular: 'company',
              namePlural: 'companies',
              labelPlural: 'Companies',
            },
          },
          ...[entryObjectName, otherEntryObjectName].map((nameSingular) => ({
            node: {
              nameSingular,
              namePlural:
                nameSingular === entryObjectName
                  ? 'reviewEntries'
                  : 'followUpEntries',
              labelPlural: 'Review Queue',
            },
          })),
        ],
      },
    });
    mocks.get.mockResolvedValue({
      data: {
        [entryObjectName]: {
          id: target.recordId,
          name: 'Acme',
          parentRecordId: 'parent-record',
        },
        [otherEntryObjectName]: {
          id: target.recordId,
          name: 'Acme',
          parentRecordId: 'parent-record',
        },
        company: { id: target.recordId, name: 'Acme' },
        workspaceMember: { name: { firstName: 'Alex', lastName: 'Smith' } },
      },
    });
    mocks.graphql.mockImplementation(async (_query, { filter }) => ({
      recordComments: {
        edges: storedComments
          .filter(
            (item) =>
              item.targetObject === filter.targetObject.eq &&
              item.targetRecordId === filter.targetRecordId.eq,
          )
          .map((node) => ({ node })),
        pageInfo: { hasNextPage: false },
      },
    }));
  });

  it('keeps the parent record and each list entry in separate feeds', async () => {
    expect(await call({ ...entryTarget, action: 'list' })).toMatchObject({
      comments: [{ id: 'entry-thread' }],
      objectLabel: 'Review Queue',
    });
    expect(await call({ ...otherEntryTarget, action: 'list' })).toMatchObject({
      comments: [{ id: 'other-list-thread' }],
    });
    expect(await call({ ...target, action: 'list' })).toMatchObject({
      comments: [{ id: 'parent-thread' }],
      objectLabel: 'Companies',
    });
  });

  it('supports a custom record without a parent relation or integration marker', async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        [entryObjectName]: { id: target.recordId, name: 'Standalone Review' },
      },
    });
    expect(await call({ ...entryTarget, action: 'list' })).toMatchObject({
      recordLabel: 'Standalone Review',
      objectLabel: 'Review Queue',
      comments: [{ id: 'entry-thread' }],
    });
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });

  it.each(['list', 'create', 'delete', 'resolve', 'search'] as const)(
    'checks entry access before %s rather than using parent access',
    async (action) => {
      mocks.get.mockRejectedValue(new Error('List access denied'));
      await expect(call({ ...entryTarget, action })).rejects.toThrow(
        'List access denied',
      );
      expect(mocks.get).toHaveBeenCalledWith(
        `/rest/reviewEntries/${target.recordId}`,
      );
      expect(mocks.graphql).not.toHaveBeenCalled();
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );

  it.each([
    { action: 'delete' as const, id: 'parent-thread' },
    { action: 'resolve' as const, id: 'other-list-thread', resolved: true },
    {
      action: 'create' as const,
      parentId: 'parent-thread',
      body: 'Wrong feed',
    },
  ])('rejects a cross-feed $action', async (request) => {
    await expect(call({ ...entryTarget, ...request })).rejects.toThrow();
    expect(mocks.graphql).toHaveBeenCalledTimes(1);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('saves against the entry and references that entry in its notification', async () => {
    mocks.graphql
      .mockResolvedValueOnce({
        recordComments: { edges: [], pageInfo: { hasNextPage: false } },
      })
      .mockResolvedValueOnce({
        createRecordComment: comment({
          id: 'new-entry-comment',
          targetObject: entryObjectName,
          body: 'Please review @Taylor',
        }),
      });
    await call({
      ...entryTarget,
      action: 'create',
      body: 'Please review @Taylor',
      mentions: [
        { id: 'teammate', label: 'Taylor', objectName: 'workspaceMember' },
      ],
    });
    expect(mocks.graphql).toHaveBeenLastCalledWith(
      expect.any(String),
      {
        data: expect.objectContaining({
          targetObject: entryObjectName,
          targetRecordId: target.recordId,
        }),
      },
      true,
    );
    expect(mocks.reference).toHaveBeenCalledWith({
      objectNameSingular: entryObjectName,
      recordId: target.recordId,
    });
  });
});
