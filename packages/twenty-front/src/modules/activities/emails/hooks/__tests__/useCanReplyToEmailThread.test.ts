import { renderHook } from '@testing-library/react';

import { useCanReplyToEmailThread } from '@/activities/emails/hooks/useCanReplyToEmailThread';
import { useMessageThreadChannel } from '@/activities/emails/hooks/useMessageThreadChannel';
import { MessageChannelType } from '~/generated/graphql';

jest.mock('@/activities/emails/hooks/useMessageThreadChannel');

const mockUseMessageThreadChannel = jest.mocked(useMessageThreadChannel);

const setChannel = (
  type: MessageChannelType,
  conversationStyle: string | null,
) => {
  mockUseMessageThreadChannel.mockReturnValue({
    messageThreadChannel: {
      __typename: 'TimelineThreadChannel',
      type,
      conversationStyle,
      provider: 'provider',
      applicationId: null,
    },
    messageThreadChannelLoading: false,
  });
};

describe('email reply availability', () => {
  it('keeps email replies available for email threads', () => {
    setChannel(MessageChannelType.EMAIL, null);
    expect(
      renderHook(() => useCanReplyToEmailThread('thread')).result.current,
    ).toBe(true);
  });

  it('hides the email reply action for chat providers', () => {
    setChannel(MessageChannelType.APP, 'chat');
    expect(
      renderHook(() => useCanReplyToEmailThread('thread')).result.current,
    ).toBe(false);
  });

  it('treats legacy app channels as chat unless explicitly email styled', () => {
    setChannel(MessageChannelType.APP, null);
    expect(
      renderHook(() => useCanReplyToEmailThread('thread')).result.current,
    ).toBe(false);
    setChannel(MessageChannelType.APP, 'email');
    expect(
      renderHook(() => useCanReplyToEmailThread('thread')).result.current,
    ).toBe(true);
  });

  it('waits for the selected thread channel before offering email reply', () => {
    mockUseMessageThreadChannel.mockReturnValue({
      messageThreadChannel: null,
      messageThreadChannelLoading: true,
    });
    expect(
      renderHook(() => useCanReplyToEmailThread('thread')).result.current,
    ).toBe(false);
    expect(
      renderHook(() => useCanReplyToEmailThread(null)).result.current,
    ).toBe(false);
    expect(mockUseMessageThreadChannel).toHaveBeenLastCalledWith('', {
      skip: true,
    });
  });
});
