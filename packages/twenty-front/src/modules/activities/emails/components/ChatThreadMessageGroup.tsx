import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import Linkify from 'linkify-react';
import { SlackMessageText } from '@/activities/emails/components/SlackMessageText';
import { isSlackMessagePermalink } from '@/activities/emails/utils/isSlackMessagePermalink';

import { ChatThreadMessageReactions } from '@/activities/emails/components/ChatThreadMessageReactions';
import { ChatThreadMessageProviderMetadata } from '@/activities/emails/components/ChatThreadMessageProviderMetadata';
import { ChatThreadMessageSenderHeader } from '@/activities/emails/components/ChatThreadMessageSenderHeader';
import { getSlackReactionEmoji } from '@/activities/emails/utils/getSlackReactionEmoji';
import { EmailThreadNotShared } from '@/activities/emails/components/EmailThreadNotShared';
import { type ChatMessageReaction } from '@/activities/emails/types/ChatMessageReaction';
import { type ChatMessageGroup } from '@/activities/emails/types/ChatMessageGroup';
import { ChatMessageAttachments } from '@/chat/components/ChatMessageAttachments';
import { ChatMessageReceipt } from '@/chat/components/ChatMessageReceipt';
import { ChatMessageTime } from '@/chat/components/ChatMessageTime';
import { StyledChatMessageActions } from '@/chat/components/StyledChatMessageActions';
import { StyledChatMessageBubble } from '@/chat/components/StyledChatMessageBubble';
import { StyledChatMessageBubbleContent } from '@/chat/components/StyledChatMessageBubbleContent';
import { StyledChatMessageFooter } from '@/chat/components/StyledChatMessageFooter';
import { StyledChatMessageMeta } from '@/chat/components/StyledChatMessageMeta';
import { StyledChatMessageRow } from '@/chat/components/StyledChatMessageRow';
import { LightCopyIconButton } from '@/ui/input/components/LightCopyIconButton';
import {
  isDefined,
  isFieldValueRestricted,
  isNonEmptyArray,
} from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';
import { MessageChannelVisibility } from '~/generated/graphql';

const StyledGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledMessageText = styled.div<{ isDeleted: boolean }>`
  color: ${({ isDeleted }) =>
    isDeleted ? themeCssVariables.tag.text.amber : 'inherit'};
  text-decoration: ${({ isDeleted }) => (isDeleted ? 'line-through' : 'none')};
  white-space: pre-line;

  a {
    color: inherit;
    text-decoration: underline;
  }
`;

const StyledMessageContent = styled.div<{ isRightAligned: boolean }>`
  align-items: flex-end;
  display: flex;
  flex-direction: ${({ isRightAligned }) =>
    isRightAligned ? 'row-reverse' : 'row'};
  gap: ${themeCssVariables.spacing[1]};
  max-width: 100%;
`;

type ChatThreadMessageGroupProps = {
  group: ChatMessageGroup;
  reactionsByMessageId?: Record<string, ChatMessageReaction[]>;
  onReactionToggle?: (messageId: string, emoji: string) => void;
};

export const ChatThreadMessageGroup = ({
  group,
  reactionsByMessageId,
  onReactionToggle,
}: ChatThreadMessageGroupProps) => {
  const visibleMessages = group.messages.filter(
    (message) => message.providerMetadata?.hidden !== true,
  );
  const [firstMessage] = visibleMessages;
  const { isOutgoing } = group;

  return (
    <StyledGroup>
      {visibleMessages.map((message) => {
        const headerSender =
          !isOutgoing && message.id === firstMessage.id
            ? message.sender
            : undefined;
        const hasHeader = isDefined(headerSender);
        const senderHeader = hasHeader && (
          <ChatThreadMessageSenderHeader
            sender={headerSender}
            receivedAt={message.receivedAt}
          />
        );

        if (isFieldValueRestricted(message.text)) {
          return (
            <StyledChatMessageRow key={message.id} isRightAligned={isOutgoing}>
              {senderHeader}
              <EmailThreadNotShared
                visibility={MessageChannelVisibility.METADATA}
              />
            </StyledChatMessageRow>
          );
        }

        const files = (message.attachments ?? []).flatMap(
          (attachment) => attachment.file ?? [],
        );
        const hasText = isNonEmptyString(message.text);
        const providerMetadata = isFieldValueRestricted(
          message.providerMetadata,
        )
          ? undefined
          : message.providerMetadata;
        const reactions =
          reactionsByMessageId?.[message.id] ??
          providerMetadata?.reactions?.map(({ name, count, users }) => ({
            emoji: getSlackReactionEmoji(name),
            count,
            isOwn: false,
            reactorNames: users,
          })) ??
          [];
        const hasReactions = isNonEmptyArray(reactions);

        return (
          <StyledChatMessageRow key={message.id} isRightAligned={isOutgoing}>
            {senderHeader}
            {(hasText || !isNonEmptyArray(files)) && (
              <StyledMessageContent isRightAligned={isOutgoing}>
                <StyledChatMessageBubble isUser isOtherMember={!isOutgoing}>
                  <StyledChatMessageBubbleContent>
                    <StyledMessageText
                      isDeleted={isNonEmptyString(providerMetadata?.deletedAt)}
                    >
                      {isSlackMessagePermalink(providerMetadata?.permalink) ? (
                        <SlackMessageText
                          text={message.text}
                          participants={message.messageParticipants}
                        />
                      ) : (
                        <Linkify
                          options={{
                            target: '_blank',
                            rel: 'noopener noreferrer',
                          }}
                        >
                          {message.text}
                        </Linkify>
                      )}
                    </StyledMessageText>
                    {isOutgoing && (
                      <StyledChatMessageMeta>
                        {isDefined(message.receivedAt) && (
                          <ChatMessageTime date={message.receivedAt} />
                        )}
                        <ChatMessageReceipt status="sent" />
                      </StyledChatMessageMeta>
                    )}
                  </StyledChatMessageBubbleContent>
                </StyledChatMessageBubble>
                {hasText && (
                  <StyledChatMessageActions
                    className="message-actions"
                    isRightAligned={isOutgoing}
                  >
                    <LightCopyIconButton copyText={message.text} />
                  </StyledChatMessageActions>
                )}
              </StyledMessageContent>
            )}
            {isNonEmptyArray(files) && (
              <ChatMessageAttachments
                files={files}
                isRightAligned={isOutgoing}
              />
            )}
            {(hasReactions || isDefined(providerMetadata)) && (
              <StyledChatMessageFooter isRightAligned={isOutgoing}>
                {isDefined(providerMetadata) && (
                  <ChatThreadMessageProviderMetadata
                    metadata={providerMetadata}
                  />
                )}
                {hasReactions && (
                  <ChatThreadMessageReactions
                    reactions={reactions}
                    onReactionToggle={
                      isDefined(onReactionToggle)
                        ? (emoji) => onReactionToggle(message.id, emoji)
                        : undefined
                    }
                  />
                )}
              </StyledChatMessageFooter>
            )}
          </StyledChatMessageRow>
        );
      })}
    </StyledGroup>
  );
};
