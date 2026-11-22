import { gql } from '@apollo/client';

export const GET_COMMENT_NOTIFICATION_SENDERS = gql`
  query GetCommentNotificationSenders($threadId: UUID!) {
    chatMessages(threadId: $threadId) {
      senderApplicationId
    }
  }
`;
