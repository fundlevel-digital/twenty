import { FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED } from 'twenty-shared/constants';
import { type ObjectRecord } from 'twenty-shared/types';

import { ApplyMessageThreadsVisibilityRestrictionsService } from 'src/modules/messaging/common/query-hooks/message-thread/apply-message-threads-visibility-restrictions.service';

const buildService = ({
  fullyVisibleMessageIds = new Set<string>(),
  subjectVisibleMessageIds = new Set<string>(),
} = {}) => {
  const findMessages = jest.fn().mockResolvedValue([
    { id: 'message-1', messageThreadId: 'thread-1' },
    { id: 'message-2', messageThreadId: 'thread-2' },
  ]);
  const registerHandler = jest.fn();
  const findVisibleMessageIds = jest.fn().mockResolvedValue({
    fullyVisibleMessageIds,
    subjectVisibleMessageIds,
    hiddenMessageIds: new Set<string>(),
  });
  const service = new ApplyMessageThreadsVisibilityRestrictionsService(
    {
      executeInWorkspaceContext: (callback: () => unknown) => callback(),
      getRepositoryWithoutPermissionChecks: () => ({ find: findMessages }),
    } as never,
    { registerHandler } as never,
    { findVisibleMessageIds } as never,
  );

  return { service, registerHandler, findMessages, findVisibleMessageIds };
};

const authContext = {
  type: 'user',
  workspace: { id: 'workspace-id' },
  workspaceMemberId: 'viewer-id',
} as const;

const createThread = (): ObjectRecord => ({
  id: 'thread-1',
  subject: 'Confidential client launch',
});

describe('ApplyMessageThreadsVisibilityRestrictionsService', () => {
  it('registers for direct and nested native thread records', () => {
    const { service, registerHandler } = buildService();
    service.onModuleInit();
    expect(registerHandler).toHaveBeenCalledWith({
      objectNameSingular: 'messageThread',
      handler: service,
    });
  });

  it.each(['fullyVisibleMessageIds', 'subjectVisibleMessageIds'] as const)(
    'keeps a thread subject with %s access',
    async (visibilityKind) => {
      const { service } = buildService({
        [visibilityKind]: new Set(['message-1']),
      });
      const thread = createThread();
      await service.applyVisibilityRestrictions({
        records: [thread],
        authContext: authContext as never,
      });
      expect(thread.subject).toBe('Confidential client launch');
    },
  );

  it('redacts metadata-only and internally deleted subjects using message visibility', async () => {
    const { service, findVisibleMessageIds } = buildService({
      fullyVisibleMessageIds: new Set(['message-2']),
    });
    const thread = createThread();
    await service.applyVisibilityRestrictions({
      records: [thread],
      authContext: authContext as never,
    });
    expect(thread.subject).toBe(
      FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED,
    );
    expect(findVisibleMessageIds).toHaveBeenCalledWith({
      messageIds: ['message-1', 'message-2'],
      authContext,
    });
  });

  it('does not query when subject is absent or a system service is reading', async () => {
    const { service, findMessages } = buildService();
    await service.applyVisibilityRestrictions({
      records: [{ id: 'thread-1' }],
      authContext: authContext as never,
    });
    await service.applyVisibilityRestrictions({
      records: [createThread()],
      authContext: {
        type: 'system',
        workspace: { id: 'workspace-id' },
      } as never,
    });
    expect(findMessages).not.toHaveBeenCalled();
  });
});
