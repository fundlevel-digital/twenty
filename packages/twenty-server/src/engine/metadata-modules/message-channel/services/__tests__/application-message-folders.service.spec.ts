import { ApplicationMessageFoldersService } from '../application-message-folders.service';

type Dependencies = ConstructorParameters<
  typeof ApplicationMessageFoldersService
>;

describe('ApplicationMessageFoldersService partial discovery', () => {
  const findOwnedOrThrow = jest.fn().mockResolvedValue({ messageChannel: {} });
  const find = jest.fn();
  const insert = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const getOrRecompute = jest.fn();
  const findRecords = jest.fn();
  const service = new ApplicationMessageFoldersService(
    { findOwnedOrThrow } as unknown as Dependencies[0],
    { find, insert, update, delete: remove } as unknown as Dependencies[1],
    {
      executeInWorkspaceContext: (callback: () => Promise<unknown>) =>
        callback(),
      getRepositoryWithoutPermissionChecks: () => ({ find: findRecords }),
    } as unknown as Dependencies[2],
    {
      withLock: (callback: () => Promise<unknown>) => callback(),
    } as unknown as Dependencies[3],
    { getOrRecompute } as unknown as Dependencies[4],
  );

  beforeEach(() => {
    jest.clearAllMocks();
    find.mockResolvedValue([
      { id: 'existing', externalId: 'C1', name: 'Client', isSynced: false },
      {
        id: 'previous-page',
        externalId: 'C2',
        name: 'Other client',
        isSynced: true,
      },
    ]);
  });

  it('preserves previous discovery pages and a user disabling an existing channel', async () => {
    await service.sync({
      applicationId: 'app',
      workspaceId: 'workspace',
      requestUserWorkspaceId: null,
      messageChannelId: 'channel',
      isPartial: true,
      folders: [
        { externalId: 'C1', name: 'Client', isSynced: true },
        { externalId: 'C3', name: 'New client', isSynced: true },
      ],
    });
    expect(findOwnedOrThrow).toHaveBeenCalledWith({
      applicationId: 'app',
      workspaceId: 'workspace',
      requestUserWorkspaceId: null,
      id: 'channel',
    });
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith('workspace', [
      expect.objectContaining({
        externalId: 'C3',
        isSynced: true,
        messageChannelId: 'channel',
      }),
    ]);
  });

  it('still permits explicit full sync to change existing folder sync settings', async () => {
    await service.sync({
      applicationId: 'app',
      workspaceId: 'workspace',
      requestUserWorkspaceId: null,
      messageChannelId: 'channel',
      folders: [
        { externalId: 'C1', name: 'Client', isSynced: true },
        { externalId: 'C2', name: 'Other client', isSynced: true },
      ],
    });
    expect(update).toHaveBeenCalledWith(
      'workspace',
      { id: 'existing' },
      { isSynced: true },
    );
  });
  it('rejects bindings to another application conversation object', async () => {
    findOwnedOrThrow.mockResolvedValueOnce({
      messageChannel: { messagingProviderUniversalIdentifier: 'provider' },
    });
    getOrRecompute.mockResolvedValueOnce({
      flatMessagingProviderMaps: {
        byUniversalIdentifier: {
          provider: {
            applicationId: 'other-app',
            channelObjectUniversalIdentifier: 'object',
          },
        },
      },
      flatObjectMetadataMaps: {
        byUniversalIdentifier: {
          object: { applicationId: 'other-app', nameSingular: 'channel' },
        },
      },
    });
    await expect(
      service.sync({
        applicationId: 'app',
        workspaceId: 'workspace',
        requestUserWorkspaceId: null,
        messageChannelId: 'channel',
        isPartial: true,
        folders: [
          { externalId: 'C1', name: 'Client', applicationRecordId: 'record' },
        ],
      }),
    ).rejects.toThrow('Folder records must belong');
    expect(insert).not.toHaveBeenCalled();
  });

  it('binds an existing record owned by the declared conversation object', async () => {
    findOwnedOrThrow.mockResolvedValueOnce({
      messageChannel: { messagingProviderUniversalIdentifier: 'provider' },
    });
    getOrRecompute.mockResolvedValueOnce({
      flatMessagingProviderMaps: {
        byUniversalIdentifier: {
          provider: {
            applicationId: 'app',
            channelObjectUniversalIdentifier: 'object',
          },
        },
      },
      flatObjectMetadataMaps: {
        byUniversalIdentifier: {
          object: { applicationId: 'app', nameSingular: 'channel' },
        },
      },
    });
    findRecords.mockResolvedValueOnce([{ id: 'record' }]);
    await service.sync({
      applicationId: 'app',
      workspaceId: 'workspace',
      requestUserWorkspaceId: null,
      messageChannelId: 'channel',
      isPartial: true,
      folders: [
        { externalId: 'C1', name: 'Client', applicationRecordId: 'record' },
      ],
    });
    expect(update).toHaveBeenCalledWith(
      'workspace',
      { id: 'existing' },
      { applicationRecordId: 'record' },
    );
  });
});
