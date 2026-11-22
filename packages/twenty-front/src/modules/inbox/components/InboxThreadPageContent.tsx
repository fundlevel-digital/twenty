import { type ReactNode, useEffect } from 'react';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/primitives/input';
import { useQuery } from '@apollo/client/react';
import { Navigate } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';

import { AiChatThreadPageContent } from '@/ai-chat/instance/components/AiChatThreadPageContent';
import { aiChatThreadIsDirectMessageFamilySelector } from '@/ai-chat/threads/states/selectors/aiChatThreadIsDirectMessageFamilySelector';
import { InboxDirectMessageTitle } from '@/inbox/components/InboxDirectMessageTitle';
import { InboxThreadDetailsDropdown } from '@/inbox/components/InboxThreadDetailsDropdown';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useCommentsInboxFrontComponent } from '@/inbox/hooks/useCommentsInboxFrontComponent';
import { GET_COMMENT_NOTIFICATION_SENDERS } from '@/inbox/graphql/queries/getCommentNotificationSenders';
import { useUpdateAiChatThreadStatus } from '@/ai-chat/threads/hooks/useUpdateAiChatThreadStatus';
import { FrontComponentSkeletonLoader } from '@/front-components/components/FrontComponentSkeletonLoader';
import { AgentChatInboxAction } from '~/generated-metadata/graphql';

type InboxThreadPageContentProps = {
  threadId: string;
  headerActions?: ReactNode;
  headerTitlePrefix?: ReactNode;
};

export const InboxThreadPageContent = ({
  threadId,
  headerActions,
  headerTitlePrefix,
}: InboxThreadPageContentProps) => {
  const { t } = useLingui();
  const isDirectMessage = useAtomFamilySelectorValue(
    aiChatThreadIsDirectMessageFamilySelector,
    threadId,
  );
  const commentsFrontComponent = useCommentsInboxFrontComponent();
  const { data, loading, error, refetch } = useQuery<
    { chatMessages: { senderApplicationId: string | null }[] },
    { threadId: string }
  >(GET_COMMENT_NOTIFICATION_SENDERS, {
    variables: { threadId },
    skip: !commentsFrontComponent || isDirectMessage,
  });
  const { updateAgentChatThreadInboxState } = useUpdateAiChatThreadStatus();
  const isCommentNotification =
    !loading &&
    !error &&
    !isDirectMessage &&
    !!commentsFrontComponent &&
    !!data?.chatMessages.some(
      ({ senderApplicationId }) =>
        senderApplicationId === commentsFrontComponent.applicationId,
    );
  useEffect(() => {
    if (isCommentNotification) {
      void updateAgentChatThreadInboxState({
        threadIds: [threadId],
        action: AgentChatInboxAction.READ,
      });
    }
  }, [isCommentNotification, threadId, updateAgentChatThreadInboxState]);

  if (commentsFrontComponent && !isDirectMessage) {
    if (loading) {
      return <FrontComponentSkeletonLoader />;
    }
    if (error) {
      return (
        <Button
          onClick={() => {
            void refetch();
          }}
        >{t`Retry Loading Conversation`}</Button>
      );
    }
    if (isCommentNotification) {
      return (
        <Navigate
          replace
          to={`${getAppPath(AppPath.AiChatInbox, { threadId: null })}?section=comments&notification=${encodeURIComponent(threadId)}`}
        />
      );
    }
  }

  return (
    <AiChatThreadPageContent
      threadId={threadId}
      headerActions={headerActions}
      headerTitle={
        isDirectMessage ? (
          <InboxDirectMessageTitle threadId={threadId} />
        ) : undefined
      }
      headerTitlePrefix={headerTitlePrefix}
      headerTitleAccessory={<InboxThreadDetailsDropdown threadId={threadId} />}
    />
  );
};
