import { RestApiClient } from 'twenty-client-sdk/rest';
import { IDENTIFIERS } from '../constants/identifiers';
import {
  type CommentDiscussion,
  type CommentInboxResponse,
  type CommentInboxTargetResponse,
  type RecordComment,
} from '../types';
import { graphql } from './graphql';
import { getCommentObjects, readCommentTarget } from './read-comment-target';

type DiscussionComment = Pick<
  RecordComment,
  'body' | 'authorName' | 'createdAt' | 'targetObject' | 'targetRecordId'
>;

export const readCommentInbox = async (
  cursor?: string,
): Promise<CommentInboxResponse> => {
  if (cursor && cursor.length > 1000) throw new Error('Invalid cursor');
  const [objects, page] = await Promise.all([
    getCommentObjects(),
    graphql<{
      recordComments: {
        edges: { node: DiscussionComment }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    }>(
      `
        query ($after: String) {
          recordComments(
            first: 100
            after: $after
            filter: { deleted: { eq: false } }
            orderBy: [{ createdAt: DescNullsLast }]
          ) {
            edges {
              node {
                body
                authorName
                createdAt
                targetObject
                targetRecordId
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      { after: cursor },
      true,
    ),
  ]);
  const latestByRecord = new Map<string, DiscussionComment>();
  for (const { node } of page.recordComments.edges) {
    const key = `${node.targetObject}:${node.targetRecordId}`;
    if (!latestByRecord.has(key)) latestByRecord.set(key, node);
  }
  const discussions: CommentDiscussion[] = [];
  // Bound concurrent access checks; inaccessible records never reach the client.
  const comments = [...latestByRecord.values()];
  for (let offset = 0; offset < comments.length; offset += 10) {
    const batch = await Promise.all(
      comments.slice(offset, offset + 10).map(async (comment) => {
        const target = {
          objectName: comment.targetObject,
          recordId: comment.targetRecordId,
        };
        try {
          const labels = await readCommentTarget(target, objects);
          return {
            ...target,
            ...labels,
            latestComment: {
              body: comment.body,
              authorName: comment.authorName,
              createdAt: comment.createdAt,
            },
          };
        } catch {
          return null;
        }
      }),
    );
    for (const discussion of batch)
      if (discussion) discussions.push(discussion);
  }
  return {
    discussions,
    cursor: page.recordComments.pageInfo.hasNextPage
      ? page.recordComments.pageInfo.endCursor
      : null,
  };
};

export const readCommentNotificationTarget = async (
  notificationId: string,
): Promise<CommentInboxTargetResponse> => {
  if (!/^[0-9a-f-]{36}$/i.test(notificationId))
    throw new Error('Invalid notification');
  const response = await new RestApiClient().post<{
    data?: {
      findManyLogicFunctions: {
        applicationId: string;
        universalIdentifier: string;
      }[];
      chatMessages: {
        senderApplicationId: string | null;
        parts: { textContent: string | null; orderIndex: number }[];
      }[];
    };
    errors?: { message: string }[];
  }>('/metadata', {
    query: `query($threadId: UUID!) {
      findManyLogicFunctions { applicationId universalIdentifier }
      chatMessages(threadId: $threadId) {
        senderApplicationId parts { textContent orderIndex }
      }
    }`,
    variables: { threadId: notificationId },
  });
  if (response.errors?.length || !response.data)
    throw new Error('Notification unavailable');
  const applicationId = response.data.findManyLogicFunctions.find(
    ({ universalIdentifier }) => universalIdentifier === IDENTIFIERS.function,
  )?.applicationId;
  const message = applicationId
    ? response.data.chatMessages.find(
        ({ senderApplicationId }) => senderApplicationId === applicationId,
      )
    : undefined;
  const firstText = message?.parts
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .find(({ textContent }) => textContent)?.textContent;
  const match = firstText?.match(
    /^\[\[record:([a-zA-Z][a-zA-Z0-9]*):([0-9a-f-]{36}):[^\n]*?\]\](?:\n|$)/i,
  );
  if (!match) throw new Error('Comment notification unavailable');
  const target = { objectName: match[1], recordId: match[2] };
  await readCommentTarget(target, await getCommentObjects());
  return { target };
};
