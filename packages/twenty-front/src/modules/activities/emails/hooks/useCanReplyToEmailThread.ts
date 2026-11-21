import { useMessageThreadChannel } from '@/activities/emails/hooks/useMessageThreadChannel';
import { isChatTimelineThreadChannel } from '@/activities/emails/utils/isChatTimelineThreadChannel';
import { isDefined } from 'twenty-shared/utils';

export const useCanReplyToEmailThread = (messageThreadId: string | null) => {
  const { messageThreadChannel, messageThreadChannelLoading } =
    useMessageThreadChannel(messageThreadId ?? '', {
      skip: !isDefined(messageThreadId),
    });

  return (
    isDefined(messageThreadId) &&
    !messageThreadChannelLoading &&
    isDefined(messageThreadChannel) &&
    !isChatTimelineThreadChannel(messageThreadChannel)
  );
};
