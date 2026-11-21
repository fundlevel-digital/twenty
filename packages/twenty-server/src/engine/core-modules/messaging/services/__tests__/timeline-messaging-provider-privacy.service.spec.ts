import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { type ObjectRecord } from 'twenty-shared/types';

import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { TimelineMessagingService } from 'src/engine/core-modules/messaging/services/timeline-messaging.service';

jest.mock(
  'src/engine/core-modules/auth/storage/workspace-auth-context.storage',
  () => ({
    getWorkspaceAuthContext: jest.fn(),
  }),
);

const VIEWER = {
  type: 'user',
  workspace: { id: '20202020-0000-4000-8000-000000000000' },
  workspaceMemberId: 'viewer-member',
};

const buildQueryBuilder = () => {
  const queryBuilder: Record<string, jest.Mock> = {};
  for (const method of [
    'innerJoin',
    'leftJoin',
    'leftJoinAndSelect',
    'select',
    'addSelect',
    'groupBy',
    'orderBy',
    'offset',
    'limit',
    'andWhere',
    'where',
    'distinctOn',
  ]) {
    queryBuilder[method] = jest.fn(() => queryBuilder);
  }
  queryBuilder.getMany = jest.fn().mockResolvedValue([]);
  queryBuilder.getCount = jest.fn().mockResolvedValue(1);
  queryBuilder.getRawMany = jest.fn().mockResolvedValue([{ id: 'thread-id' }]);
  return queryBuilder;
};

const buildService = (messages: ObjectRecord[], upgraded = true) => {
  const totalQueryBuilder = buildQueryBuilder();
  const pageQueryBuilder = buildQueryBuilder();
  const repository = {
    createQueryBuilder: jest
      .fn()
      .mockReturnValueOnce(totalQueryBuilder)
      .mockReturnValue(pageQueryBuilder),
    find: jest.fn().mockResolvedValue([{ id: 'thread-id', messages }]),
  };
  const service = new TimelineMessagingService(
    {
      executeInWorkspaceContext: jest.fn(async (callback: () => unknown) => {
        jest.mocked(getWorkspaceAuthContext).mockReturnValue({
          type: 'system',
          workspace: VIEWER.workspace,
        } as never);
        return callback();
      }),
      getRepositoryWithoutPermissionChecks: jest.fn(() => repository),
    } as never,
    {} as never,
    {} as never,
    {
      getOrRecompute: jest.fn().mockResolvedValue({
        flatFieldMetadataMaps: {
          byUniversalIdentifier: upgraded
            ? {
                [STANDARD_OBJECTS.message.fields.providerMetadata
                  .universalIdentifier]: {},
              }
            : {},
        },
      }),
    } as never,
    {} as never,
    {} as never,
    {
      applyVisibilityRestrictions: jest.fn(
        async ({
          records,
          authContext,
        }: {
          records: ObjectRecord[];
          authContext: typeof VIEWER;
        }) => {
          expect(authContext).toEqual(VIEWER);
          for (const record of records) {
            if (record.id === 'hidden-message') {
              record.providerMetadata = { hidden: true };
              record.text = 'restricted';
            }
          }
        },
      ),
    } as never,
  );
  return { service, totalQueryBuilder, pageQueryBuilder };
};

const visibleMessage = {
  id: 'visible-message',
  text: 'Ordinary email preview',
  subject: 'Visible subject',
  receivedAt: new Date('2026-11-20T00:00:00Z'),
};
const hiddenMessage = {
  id: 'hidden-message',
  text: 'Deleted private text',
  subject: 'Private subject',
  receivedAt: new Date('2026-11-21T00:00:00Z'),
  providerMetadata: { deletedAt: '2026-11-21T00:00:00Z' },
};

const listThreads = (service: TimelineMessagingService) =>
  service.getAndCountMessageThreads({
    personIds: ['person-id'],
    workspaceId: VIEWER.workspace.id,
    offset: 0,
    pageSize: 20,
  });

describe('TimelineMessagingService provider privacy', () => {
  beforeEach(() =>
    jest.mocked(getWorkspaceAuthContext).mockReturnValue(VIEWER as never),
  );

  it('selects latest visible preview, date and count using the original viewer', async () => {
    const { service, totalQueryBuilder, pageQueryBuilder } = buildService([
      hiddenMessage,
      visibleMessage,
    ]);
    const result = await listThreads(service);
    expect(result.messageThreads).toEqual([
      expect.objectContaining({
        subject: 'Visible subject',
        lastMessageBody: 'Ordinary email preview',
        lastMessageReceivedAt: visibleMessage.receivedAt,
        numberOfMessagesInThread: 1,
      }),
    ]);
    for (const queryBuilder of [totalQueryBuilder, pageQueryBuilder]) {
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('"messages"."providerMetadata"'),
        { providerDeletionViewerWorkspaceMemberId: VIEWER.workspaceMemberId },
      );
    }
  });

  it('omits threads whose only message is internally deleted', async () => {
    const { service } = buildService([{ ...hiddenMessage }]);
    expect((await listThreads(service)).messageThreads).toEqual([]);
  });

  it('excludes hidden messages from subject search before selecting matching threads', async () => {
    const { service, totalQueryBuilder } = buildService([
      { ...hiddenMessage },
      { ...visibleMessage },
    ]);
    const result = await service.searchMessageThreads({
      workspaceId: VIEWER.workspace.id,
      searchInput: 'Visible',
      messageChannelIds: ['channel-id'],
    });
    expect(totalQueryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('"messages"."providerMetadata"'),
      { providerDeletionViewerWorkspaceMemberId: VIEWER.workspaceMemberId },
    );
    expect(result[0].lastMessageBody).toBe('Ordinary email preview');
  });

  it('does not include hidden-message senders in participant summaries', async () => {
    const { service, totalQueryBuilder } = buildService([]);
    const result = await service.getThreadParticipantsByThreadId(
      ['thread-id'],
      VIEWER.workspace.id,
    );
    expect(result).toEqual({});
    expect(totalQueryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('"message"."providerMetadata"'),
      { providerDeletionViewerWorkspaceMemberId: VIEWER.workspaceMemberId },
    );
  });

  it('preserves ordinary email previews on workspaces before the metadata upgrade', async () => {
    const { service, totalQueryBuilder } = buildService(
      [{ ...visibleMessage }],
      false,
    );
    expect((await listThreads(service)).messageThreads[0].lastMessageBody).toBe(
      'Ordinary email preview',
    );
    expect(totalQueryBuilder.andWhere).not.toHaveBeenCalledWith(
      expect.stringContaining('providerMetadata'),
      expect.anything(),
    );
  });
});
