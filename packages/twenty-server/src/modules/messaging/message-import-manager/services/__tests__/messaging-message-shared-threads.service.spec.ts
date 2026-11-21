import { MessageDirection } from 'src/modules/messaging/common/enums/message-direction.enum';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/types/workspace-transaction-scope.type';
import { type WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { MessagingMessageService } from '../messaging-message.service';

describe('MessagingMessageService cross-connection threads', () => {
  it('links a disjoint reply delivered to another connection to the existing app thread', async () => {
    const sharedAssociation = {
      messageThreadExternalId: 'T:C:root',
      message: {
        id: 'previous',
        messageThreadId: 'canonical-thread',
        headerMessageId: 'app:app:shared:earlier-reply',
      },
    };
    const findAssociations = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([sharedAssociation])
      .mockResolvedValueOnce([]);
    const insertAssociations = jest.fn();
    const insertMessages = jest.fn();
    const insertThreads = jest.fn();
    const repository = (name: string) =>
      name === 'messageChannelMessageAssociation'
        ? { find: findAssociations, insert: insertAssociations }
        : name === 'message'
          ? { find: jest.fn().mockResolvedValue([]), insert: insertMessages }
          : { insert: insertThreads };
    const service = new MessagingMessageService({
      executeInWorkspaceContext: (callback: () => Promise<unknown>) =>
        callback(),
    } as unknown as WorkspaceOrmManager);
    const reply: MessageWithParticipants = {
      headerMessageId: 'app:app:shared:later-reply',
      subject: null,
      text: 'Second reply',
      receivedAt: new Date(),
      isDraft: false,
      attachments: [],
      externalId: 'later-reply',
      messageThreadExternalId: 'T:C:root',
      direction: MessageDirection.INCOMING,
      participants: [],
      sharedThreadApplicationId: 'app',
    };
    const result = await service.saveMessagesWithinTransaction(
      [reply],
      'bob-channel',
      {
        getRepositoryWithoutPermissionChecks: repository,
      } as unknown as WorkspaceTransactionScope,
      'workspace',
    );
    expect(
      result.messageExternalIdToMessageThreadIdMap.get('later-reply'),
    ).toBe('canonical-thread');
    expect(insertThreads).not.toHaveBeenCalled();
    expect(insertMessages).toHaveBeenCalledWith([
      expect.objectContaining({ messageThreadId: 'canonical-thread' }),
    ]);
    expect(insertAssociations).toHaveBeenCalledWith([
      expect.objectContaining({
        messageChannelId: 'bob-channel',
        messageExternalId: 'later-reply',
      }),
    ]);
    expect(
      findAssociations.mock.calls[1][0].where[0].message.headerMessageId.value,
    ).toBe('app:app:shared:%');
  });
});
