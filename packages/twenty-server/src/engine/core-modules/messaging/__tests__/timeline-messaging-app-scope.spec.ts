import {
  ConnectedAccountProvider,
  MessageChannelType,
} from 'twenty-shared/types';

import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { TimelineMessagingResolver } from 'src/engine/core-modules/messaging/timeline-messaging.resolver';

jest.mock(
  'src/engine/core-modules/auth/storage/workspace-auth-context.storage',
);

const getMessagesFromObjectRecord = jest
  .fn()
  .mockResolvedValue({ timelineThreads: [] });
const resolver = new TimelineMessagingResolver(
  { getMessagesFromObjectRecord } as never,
  {} as never,
  {} as never,
);
const requestedChannel = {
  type: MessageChannelType.EMAIL,
  provider: ConnectedAccountProvider.GOOGLE,
};
const args = {
  objectNameSingular: 'person',
  recordId: 'person-id',
  page: 1,
  pageSize: 20,
  channel: requestedChannel,
};

describe('embedded app record timelines', () => {
  beforeEach(() => jest.clearAllMocks());

  it('limits an app acting for a user to its own conversations even when it requests another provider', async () => {
    jest.mocked(getWorkspaceAuthContext).mockReturnValue({
      type: 'user',
      application: { id: 'current-app' },
    } as never);
    await resolver.getTimelineThreadsFromObjectRecord(
      'viewer',
      { id: 'workspace' } as never,
      args,
    );
    expect(getMessagesFromObjectRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        userWorkspaceId: 'viewer',
        channel: {
          type: MessageChannelType.APP,
          provider: ConnectedAccountProvider.APP,
          applicationId: 'current-app',
        },
      }),
    );
  });

  it('keeps the native user timeline channel selection unchanged', async () => {
    jest
      .mocked(getWorkspaceAuthContext)
      .mockReturnValue({ type: 'user' } as never);
    await resolver.getTimelineThreadsFromObjectRecord(
      'viewer',
      { id: 'workspace' } as never,
      args,
    );
    expect(getMessagesFromObjectRecord).toHaveBeenCalledWith(
      expect.objectContaining({ channel: requestedChannel }),
    );
  });
});
