import { FieldMetadataType, MessageParticipantRole } from 'twenty-shared/types';

import { ApplicationMessageIngestionService } from '../application-message-ingestion.service';

type Dependencies = ConstructorParameters<
  typeof ApplicationMessageIngestionService
>;
const EARLIER = '2026-11-20T00:00:00.000Z';
const LATER = '2026-11-21T00:00:00.000Z';
const SCOPE = {
  workspaceId: 'workspace',
  applicationId: 'application',
  messageChannelId: 'alice',
  requestUserWorkspaceId: null,
};

describe('ApplicationMessageIngestionService', () => {
  const findOwnedOrThrow = jest.fn();
  const getOrRecompute = jest.fn();
  const deduplicatesAcrossConnections = jest.fn();
  const withLock = jest.fn();
  const update = jest.fn();
  const findAssociations = jest.fn();
  const findMessages = jest.fn();
  const saveMessagesAndEnqueueContactCreation = jest.fn();
  const service = new ApplicationMessageIngestionService(
    {
      findOwnedOrThrow,
      deduplicatesAcrossConnections,
    } as unknown as Dependencies[0],
    { saveMessagesAndEnqueueContactCreation } as unknown as Dependencies[1],
    {
      executeInWorkspaceContext: (callback: () => Promise<unknown>) =>
        callback(),
      getRepositoryWithoutPermissionChecks: (name: string) =>
        name === 'message'
          ? { find: findMessages, update }
          : { find: findAssociations },
    } as unknown as Dependencies[2],
    { withLock } as unknown as Dependencies[3],
    {} as Dependencies[4],
    { find: jest.fn().mockResolvedValue([]) } as unknown as Dependencies[5],
    {
      isFeatureEnabled: jest.fn().mockResolvedValue(false),
    } as unknown as Dependencies[6],
    { getOrRecompute } as unknown as Dependencies[7],
    {
      resolve: jest.fn().mockImplementation(async ({ messages }) => messages),
    } as unknown as Dependencies[8],
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findOwnedOrThrow.mockImplementation(async ({ id }: { id: string }) => ({
      messageChannel: {
        id,
        isSyncEnabled: true,
        handle: 'U1',
        participantHandleFieldUniversalIdentifier: null,
      },
      connectedAccount: {},
    }));
    deduplicatesAcrossConnections.mockResolvedValue(true);
    withLock.mockImplementation(async (callback: () => Promise<unknown>) =>
      callback(),
    );
    findAssociations.mockResolvedValue([
      { messageId: 'message', messageExternalId: 'T:C:1' },
    ]);
    findMessages.mockResolvedValue([
      {
        id: 'message',
        headerMessageId: 'app:application:shared:T:C:1',
        providerMetadata: { updatedAt: EARLIER },
      },
    ]);
    update.mockResolvedValue({});
    saveMessagesAndEnqueueContactCreation.mockResolvedValue({
      messageExternalIdsAndIdsMap: new Map([['T:C:1', 'message']]),
      messageExternalIdToMessageThreadIdMap: new Map([['T:C:1', 'thread']]),
    });
  });

  it('uses the same stored identity and lock across connected members for opt-in providers', async () => {
    const messages = [
      {
        externalId: 'T:C:1',
        threadExternalId: 'T:C:1',
        text: 'Hello',
        receivedAt: new Date(EARLIER),
        participants: [{ role: MessageParticipantRole.FROM, handle: 'U2' }],
      },
    ];
    await service.ingest({ ...SCOPE, messages });
    await service.ingest({ ...SCOPE, messageChannelId: 'bob', messages });
    const savedHeaders = saveMessagesAndEnqueueContactCreation.mock.calls.map(
      ([args]) => args.messagesToSave[0].headerMessageId,
    );
    expect(savedHeaders).toEqual([
      'app:application:shared:T:C:1',
      'app:application:shared:T:C:1',
    ]);
    expect(withLock.mock.calls[0][1]).toBe(withLock.mock.calls[1][1]);
    expect(update).not.toHaveBeenCalled();
  });

  it('keeps ordinary providers isolated and does not write provider metadata', async () => {
    deduplicatesAcrossConnections.mockResolvedValue(false);
    await service.ingest({
      ...SCOPE,
      messages: [
        {
          externalId: 'T:C:1',
          threadExternalId: 'T:C:1',
          text: 'Hello',
          receivedAt: new Date(EARLIER),
          participants: [{ role: MessageParticipantRole.FROM, handle: 'U2' }],
        },
      ],
    });
    expect(
      saveMessagesAndEnqueueContactCreation.mock.calls[0][0].messagesToSave[0]
        .headerMessageId,
    ).toBe('app:application:alice:T:C:1');
    expect(update).not.toHaveBeenCalled();
  });

  it('updates only messages associated with the reachable channel', async () => {
    await service.update({
      ...SCOPE,
      messages: [
        {
          externalId: 'T:C:1',
          text: 'Edited',
          providerMetadata: { updatedAt: LATER },
        },
      ],
    });
    expect(findOwnedOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: 'application', id: 'alice' }),
    );
    expect(findAssociations).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ messageChannelId: 'alice' }),
      }),
    );
    expect(update).toHaveBeenCalledWith('message', {
      text: 'Edited',
      providerMetadata: { updatedAt: LATER },
    });
  });

  it('cannot change a message owned by another application even with a matching external id', async () => {
    findMessages.mockResolvedValue([
      { id: 'message', headerMessageId: 'app:other:shared:T:C:1' },
    ]);
    await service.update({
      ...SCOPE,
      messages: [
        {
          externalId: 'T:C:1',
          text: 'Edited',
          providerMetadata: { updatedAt: LATER },
        },
      ],
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('does not create a stub when an update arrives before the original message', async () => {
    findAssociations.mockResolvedValue([]);
    await service.update({
      ...SCOPE,
      messages: [
        {
          externalId: 'T:C:1',
          providerMetadata: { updatedAt: LATER, deletedAt: LATER },
        },
      ],
    });
    expect(update).not.toHaveBeenCalled();
    expect(saveMessagesAndEnqueueContactCreation).not.toHaveBeenCalled();
  });

  it('ignores stale updates and rejects unreachable connections', async () => {
    await service.update({
      ...SCOPE,
      messages: [
        {
          externalId: 'T:C:1',
          text: 'Stale',
          providerMetadata: { updatedAt: EARLIER },
        },
      ],
    });
    expect(update).not.toHaveBeenCalled();
    findOwnedOrThrow.mockRejectedValue(new Error('Connection is private'));
    await expect(service.update({ ...SCOPE, messages: [] })).rejects.toThrow(
      'Connection is private',
    );
  });
  it('updates app extension fields independently of an unchanged provider revision', async () => {
    const identifier = 'a0e6e9ab-ddb0-44ae-b1da-e8217ebc1dd4';
    getOrRecompute.mockResolvedValue({
      flatFieldMetadataMaps: {
        byUniversalIdentifier: {
          [identifier]: {
            universalIdentifier: identifier,
            applicationId: 'application',
            objectMetadataId: 'messages',
            name: 'slackMessageId',
            type: FieldMetadataType.TEXT,
            isActive: true,
          },
        },
      },
      flatObjectMetadataMaps: {
        byUniversalIdentifier: {
          message: { id: 'messages', nameSingular: 'message' },
        },
      },
    });
    await service.update({
      ...SCOPE,
      messages: [
        {
          externalId: 'T:C:1',
          providerMetadata: { updatedAt: EARLIER },
          applicationFields: { message: { [identifier]: 'T:C:1' } },
        },
      ],
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('message', { slackMessageId: 'T:C:1' });
  });

  it('rejects writes to another app field before creating a message', async () => {
    const identifier = 'a0e6e9ab-ddb0-44ae-b1da-e8217ebc1dd4';
    getOrRecompute.mockResolvedValue({
      flatFieldMetadataMaps: {
        byUniversalIdentifier: {
          [identifier]: {
            universalIdentifier: identifier,
            applicationId: 'other-app',
            objectMetadataId: 'messages',
            name: 'privateAttribute',
            type: FieldMetadataType.TEXT,
            isActive: true,
          },
        },
      },
      flatObjectMetadataMaps: {
        byUniversalIdentifier: {
          message: { id: 'messages', nameSingular: 'message' },
        },
      },
    });
    await expect(
      service.ingest({
        ...SCOPE,
        messages: [
          {
            externalId: 'T:C:1',
            threadExternalId: 'T:C:1',
            text: 'Hello',
            receivedAt: new Date(EARLIER),
            participants: [{ role: MessageParticipantRole.FROM, handle: 'U2' }],
            applicationFields: { message: { [identifier]: 'unauthorized' } },
          },
        ],
      }),
    ).rejects.toThrow('Application message fields');
    expect(saveMessagesAndEnqueueContactCreation).not.toHaveBeenCalled();
  });
});
