import { FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED } from 'twenty-shared/constants';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import {
  MessageChannelVisibility,
  type ObjectRecord,
} from 'twenty-shared/types';

import { ApplyMessagesVisibilityRestrictionsService } from 'src/modules/messaging/common/query-hooks/message/apply-messages-visibility-restrictions.service';

const MESSAGE_ID = 'message-id';
const SENDER_ID = 'sender-member-id';

const buildService = ({
  senderWorkspaceMemberId = SENDER_ID as string | null,
  deleted = true,
  visibility = MessageChannelVisibility.SHARE_EVERYTHING,
  upgraded = true,
} = {}) => {
  const findMessages = jest.fn().mockResolvedValue([
    {
      id: MESSAGE_ID,
      providerMetadata: deleted ? { deletedAt: '2026-11-21T10:00:00Z' } : null,
    },
  ]);
  const findSenders = jest.fn().mockResolvedValue([
    {
      messageId: MESSAGE_ID,
      workspaceMemberId: senderWorkspaceMemberId,
    },
  ]);
  const workspaceOrmManager = {
    executeInWorkspaceContext: jest.fn((callback: () => unknown) => callback()),
    getRepositoryWithoutPermissionChecks: jest.fn((objectName: string) => ({
      find:
        objectName === 'message'
          ? findMessages
          : objectName === 'messageParticipant'
            ? findSenders
            : jest.fn().mockResolvedValue([
                {
                  messageId: MESSAGE_ID,
                  messageChannelId: 'channel-id',
                },
              ]),
    })),
  };
  const service = new ApplyMessagesVisibilityRestrictionsService(
    workspaceOrmManager as never,
    { registerHandler: jest.fn() } as never,
    {
      find: jest.fn().mockResolvedValue([
        {
          id: 'channel-id',
          visibility,
          connectedAccount: {
            userWorkspaceId: 'connection-owner-id',
            applicationId: 'app-id',
          },
        },
      ]),
    } as never,
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
  );

  return { service, findMessages };
};

const createMessage = (): ObjectRecord => ({
  id: MESSAGE_ID,
  text: 'Sensitive Slack text',
  subject: 'Client channel',
  attachments: [{ id: 'attachment-id' }],
  providerMetadata: {
    deletedAt: '2026-11-21T10:00:00Z',
    reactions: [{ name: 'thumbsup' }],
  },
});

describe('ApplyMessagesVisibilityRestrictionsService provider deletions', () => {
  it('hides deleted internal content from another user even with shared everything', async () => {
    const { service } = buildService();
    const message = createMessage();
    await service.applyVisibilityRestrictions({
      records: [message],
      authContext: {
        type: 'user',
        workspace: { id: 'workspace-id' },
        workspaceMemberId: 'other-member',
      } as never,
    });
    expect(message.text).toBe(FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED);
    expect(message.subject).toBe(
      FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED,
    );
    expect(message.attachments).toEqual([]);
    expect(message.providerMetadata).toEqual({ hidden: true });
  });

  it('keeps a deleted internal message visible to its sender', async () => {
    const { service } = buildService();
    const message = createMessage();
    await service.applyVisibilityRestrictions({
      records: [message],
      authContext: {
        type: 'user',
        workspace: { id: 'workspace-id' },
        workspaceMemberId: SENDER_ID,
      } as never,
    });
    expect(message.text).toBe('Sensitive Slack text');
  });

  it('does not grant the owning app access to deleted internal content', async () => {
    const { service } = buildService();
    const message = createMessage();
    await service.applyVisibilityRestrictions({
      records: [message],
      authContext: {
        type: 'application',
        workspace: { id: 'workspace-id' },
        application: { id: 'app-id' },
      } as never,
    });
    expect(message.providerMetadata).toEqual({ hidden: true });
  });

  it('keeps deleted external messages visible with their tombstone', async () => {
    const { service } = buildService({ senderWorkspaceMemberId: null });
    const message = createMessage();
    await service.applyVisibilityRestrictions({
      records: [message],
      authContext: {
        type: 'user',
        workspace: { id: 'workspace-id' },
        workspaceMemberId: 'other-member',
      } as never,
    });
    expect(message.text).toBe('Sensitive Slack text');
    expect(message.providerMetadata).toHaveProperty('deletedAt');
  });

  it('redacts reactions and permalink under metadata-only sharing', async () => {
    const { service } = buildService({
      deleted: false,
      visibility: MessageChannelVisibility.METADATA,
    });
    const message = createMessage();
    message.providerMetadata = { reactions: [{ name: 'thumbsup' }] };
    await service.applyVisibilityRestrictions({
      records: [message],
      authContext: {
        type: 'user',
        workspace: { id: 'workspace-id' },
        workspaceMemberId: 'other-member',
      } as never,
    });
    expect(message.providerMetadata).toBeNull();
  });

  it('redacts a mutation tombstone before its transaction is visible to the read connection', async () => {
    const { service } = buildService({ deleted: false });
    const message = createMessage();
    await service.applyVisibilityRestrictions({
      records: [message],
      authContext: {
        type: 'user',
        workspace: { id: 'workspace-id' },
        workspaceMemberId: 'other-member',
      } as never,
    });
    expect(message.text).toBe(FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED);
    expect(message.providerMetadata).toEqual({ hidden: true });
  });

  it('protects attachments through the common visible-message lookup', async () => {
    const { service } = buildService();
    const result = await service.findVisibleMessageIds({
      messageIds: [MESSAGE_ID],
      authContext: {
        type: 'user',
        workspace: { id: 'workspace-id' },
        workspaceMemberId: 'other-member',
      } as never,
    });
    expect(result.fullyVisibleMessageIds.has(MESSAGE_ID)).toBe(false);
    expect(result.hiddenMessageIds.has(MESSAGE_ID)).toBe(true);
  });

  it('does not query a column before the workspace upgrade', async () => {
    const { service, findMessages } = buildService({ upgraded: false });
    await service.findVisibleMessageIds({
      messageIds: [MESSAGE_ID],
      authContext: {
        type: 'user',
        workspace: { id: 'workspace-id' },
        workspaceMemberId: 'other-member',
      } as never,
    });
    expect(findMessages).not.toHaveBeenCalled();
  });
});
