import { MessageChannelType } from 'twenty-shared/types';

import { ApplicationMessageChannelsService } from 'src/engine/metadata-modules/message-channel/services/application-message-channels.service';
import { findMessagingProviderOnConnectionProvider } from 'src/engine/metadata-modules/messaging-provider/utils/find-messaging-provider-on-connection-provider.util';
import { type MessageChannelDTO } from 'src/engine/metadata-modules/message-channel/dtos/message-channel.dto';

jest.mock(
  'src/engine/metadata-modules/messaging-provider/utils/find-messaging-provider-on-connection-provider.util',
  () => ({
    findMessagingProviderOnConnectionProvider: jest.fn(),
  }),
);

const messageChannel = {
  type: MessageChannelType.APP,
  connectedAccountId: 'account-1',
  messagingProviderUniversalIdentifier: 'provider-1',
} as MessageChannelDTO;

describe('ApplicationMessageChannelsService send capability', () => {
  const connectedAccountRepository = { findOne: jest.fn() };
  const workspaceCacheService = { getOrRecompute: jest.fn() };
  const service = new ApplicationMessageChannelsService(
    {} as never,
    connectedAccountRepository as never,
    {} as never,
    {} as never,
    workspaceCacheService as never,
  );
  const getCapability = (channel = messageChannel) =>
    service.canSendMessages({
      workspaceId: 'workspace-1',
      messageChannel: channel,
    });

  beforeEach(() => {
    jest.resetAllMocks();
    connectedAccountRepository.findOne.mockResolvedValue({
      id: 'account-1',
      applicationId: 'application-1',
      connectionProviderId: 'connection-provider-1',
    });
    workspaceCacheService.getOrRecompute.mockResolvedValue({
      flatMessagingProviderMaps: {},
      flatConnectionProviderMaps: {},
    });
  });

  it('allows a bound provider with a send function', async () => {
    jest.mocked(findMessagingProviderOnConnectionProvider).mockReturnValue({
      applicationId: 'application-1',
      sendMessageLogicFunctionUniversalIdentifier: 'send-function-1',
    } as never);

    expect(await getCapability()).toBe(true);
    expect(connectedAccountRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'account-1', workspaceId: 'workspace-1' },
    });
    expect(findMessagingProviderOnConnectionProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        messagingProviderUniversalIdentifier: 'provider-1',
        connectionProviderId: 'connection-provider-1',
      }),
    );
  });

  it.each([
    {
      applicationId: 'application-1',
      sendMessageLogicFunctionUniversalIdentifier: null,
    },
    {
      applicationId: 'other-application',
      sendMessageLogicFunctionUniversalIdentifier: 'send-function-1',
    },
    undefined,
  ])('denies missing, read-only, or mismatched providers', async (provider) => {
    jest
      .mocked(findMessagingProviderOnConnectionProvider)
      .mockReturnValue(provider as never);

    expect(await getCapability()).toBe(false);
  });

  it('denies an orphan channel', async () => {
    connectedAccountRepository.findOne.mockResolvedValue(null);

    expect(await getCapability()).toBe(false);
    expect(workspaceCacheService.getOrRecompute).not.toHaveBeenCalled();
  });

  it('does not expose app-send capability on email channels', async () => {
    expect(
      await getCapability({
        ...messageChannel,
        type: MessageChannelType.EMAIL,
      }),
    ).toBe(false);
    expect(connectedAccountRepository.findOne).not.toHaveBeenCalled();
  });
});
