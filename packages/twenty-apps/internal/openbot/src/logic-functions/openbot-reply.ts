import {
  NativeAssistantApiError,
  replyToNativeAssistant,
} from '../openbot/native-assistants';
import { createHmac } from 'node:crypto';
import { isNonEmptyString, isString, isObject } from '@sniptt/guards';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  kv,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';

import { OPENBOT_REPLY_FUNCTION_IDENTIFIER } from '../openbot/constants';

import { getOpenBotConnections } from '../openbot/connections';
import { openBotDeliveryKey } from '../openbot/queue-comment';
import { verifyOpenBotReply } from '../openbot/signing';
import {
  getOpenBotReplyId,
  getOpenBotReplySecret,
  type OpenBotDelivery,
} from '../openbot/tasks';
import { isCurrentTaskEvent } from '../openbot/task-events';
import { sourceKey, replyKey } from '../openbot/messages';
import { type BotMessage } from '../types';
import { graphql } from '../utils/graphql';
import { canAttachRecordToInbox } from '../utils/can-attach-record-to-inbox';

const response = (status: number, message: string) => ({
  __twentyHttpResponse: true as const,
  status,
  body: { message },
});

export const openBotReplyHandler = async (
  request: RoutePayload<unknown>,
  context: LogicFunctionExecutionContext,
) => {
  const rawBody =
    request.isBase64Encoded && request.rawBody
      ? Buffer.from(request.rawBody, 'base64').toString('utf8')
      : request.rawBody;
  if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > 65536)
    return response(400, 'Invalid reply body');
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return response(400, 'Invalid JSON');
  }
  if (
    !isObject<Record<string, unknown>, unknown>(body) ||
    !isString(body.deliveryId) ||
    !/^[0-9a-f-]{36}:[0-9a-f-]{36}$/.test(body.deliveryId) ||
    !isNonEmptyString(body.text) ||
    !body.text.trim() ||
    body.text.length > 10000
  ) {
    return response(
      400,
      'A delivery ID and reply of up to 10,000 characters are required',
    );
  }
  const delivery = await kv.get<OpenBotDelivery>(
    openBotDeliveryKey(body.deliveryId),
  );
  if (!delivery || delivery.expiresAt < Date.now())
    return response(404, 'Task unavailable');
  const connection = getOpenBotConnections().find(
    ({ id }) => id === delivery.task.agentId,
  );
  if (
    !connection ||
    !verifyOpenBotReply({
      secret: getOpenBotReplySecret(
        connection,
        context.workspaceId,
        body.deliveryId,
      ),
      body: rawBody,
      timestamp: request.headers['x-openbot-timestamp'],
      signature: request.headers['x-openbot-signature'],
    })
  )
    return response(401, 'Invalid reply signature');

  const task = delivery.task;
  if (task.taskEvent && !(await isCurrentTaskEvent(task.taskEvent, connection)))
    return response(409, 'The task is no longer eligible for this event');
  const replyId = getOpenBotReplyId(delivery.id);
  const fields =
    'id body authorId authorName authorKind: authorType parentId targetObject targetRecordId resolved deleted';
  const loadComments = async () => {
    const ownSource = await kv.get<BotMessage>(sourceKey(task.commentId));
    const savedReply = await kv.get<BotMessage>(replyKey(delivery.id));
    const ownParent = await kv.get<BotMessage>(sourceKey(task.threadId));
    if (ownSource) return [ownSource, ...(savedReply ? [savedReply] : [])];
    const result = await graphql<{
      recordComments: { edges: { node: BotMessage }[] };
    }>(
      `query($filter: RecordCommentFilterInput!) { recordComments(filter: $filter, first: 3) { edges { node { ${fields} } } } }`,
      { filter: { id: { in: [task.threadId, task.commentId, replyId] } } },
      true,
    );
    return [
      ...result.recordComments.edges.map(({ node }) => node),
      ...(ownParent ? [ownParent] : []),
      ...(savedReply ? [savedReply] : []),
    ];
  };
  const comments = await loadComments();
  const parent = comments.find(({ id }) => id === task.threadId);
  const source = comments.find(({ id }) => id === task.commentId);
  if (
    !parent ||
    parent.parentId ||
    parent.deleted ||
    parent.resolved ||
    !source ||
    source.deleted ||
    parent.targetObject !== task.objectName ||
    parent.targetRecordId !== task.recordId ||
    source.targetObject !== task.objectName ||
    source.targetRecordId !== task.recordId
  ) {
    return response(409, 'The originating thread is no longer open');
  }
  const existingReply = comments.find(({ id }) => id === replyId);
  if (
    existingReply &&
    (existingReply.body !== body.text.trim() ||
      existingReply.authorId !== connection.id)
  ) {
    return response(409, 'This task already has a different reply');
  }
  if (task.inboxRequestId) {
    try {
      await replyToNativeAssistant(task.inboxRequestId, body.text.trim());
    } catch (error) {
      if (
        error instanceof NativeAssistantApiError &&
        error.errorCode &&
        ['BAD_USER_INPUT', 'NOT_FOUND', 'FORBIDDEN', 'CONFLICT'].includes(
          error.errorCode,
        )
      )
        return response(
          409,
          'The Inbox request is unavailable or already answered',
        );
      throw error;
    }
  }
  if (!existingReply) {
    if (!task.inboxRequestId) {
      const digest = createHmac(
        'sha256',
        getOpenBotReplySecret(connection, context.workspaceId, delivery.id),
      )
        .update(body.text.trim())
        .digest('hex');
      const loadClaim = async () => {
        const { botRequests } = await graphql<{
          botRequests: { edges: { node: { name: string } }[] };
        }>(
          'query($id:UUID!){botRequests(filter:{id:{eq:$id}},first:1){edges{node{name}}}}',
          { id: replyId },
          true,
        );
        return botRequests.edges[0]?.node;
      };
      let claim = await loadClaim();
      if (!claim) {
        try {
          await graphql(
            'mutation($data:BotRequestCreateInput!){createBotRequest(data:$data){id}}',
            {
              data: {
                id: replyId,
                name: digest,
                scopeKey: 'reply',
                deliveryId: `reply:${delivery.id}`,
              },
            },
            true,
          );
        } catch (error) {
          claim = await loadClaim();
          if (!claim) throw error;
        }
      }
      if (claim && claim.name !== digest)
        return response(409, 'This task already has a different reply');
    }
    await kv.set(replyKey(delivery.id), {
      id: replyId,
      body: body.text.trim(),
      authorId: connection.id,
      authorName: connection.name,
      authorKind: 'BOT',
      parentId: task.threadId,
      targetObject: task.objectName,
      targetRecordId: task.recordId,
      mentions: '[]',
      resolved: false,
      deleted: false,
      createdAt: new Date().toISOString(),
    });
  }
  // Receipt claims and Inbox idempotency keys cover simultaneous callback retries.
  if (task.requestedBy && !task.inboxRequestId) {
    const metadataClient = new MetadataApiClient({ runAs: 'application' });
    const notificationInput = {
      externalAssistantId: connection.id,
      workspaceMemberIds: [task.requestedBy],
      threadKey: `openbot:${task.threadId}`,
      idempotencyKey: replyId,
      title: `${connection.name} replied · ${task.recordLabel}`,
      text: body.text.trim(),
    };
    const {
      sendInboxMessage: { threadId },
    } = await metadataClient.mutation({
      sendInboxMessage: {
        __args: {
          input: notificationInput,
        },
        threadId: true,
      },
    });
    if (await canAttachRecordToInbox(task.objectName))
      await metadataClient.mutation({
        attachRecordToInboxThread: {
          __args: {
            input: {
              threadId,
              objectNameSingular: task.objectName,
              recordId: task.recordId,
            },
          },
        },
      });
  }
  await kv.set(openBotDeliveryKey(delivery.id), {
    ...delivery,
    status: 'replied',
  });
  return response(200, 'Reply saved');
};

export default defineLogicFunction({
  universalIdentifier: OPENBOT_REPLY_FUNCTION_IDENTIFIER,
  name: 'openbot-reply',
  description: 'Accepts a signed, task-scoped OpenBot reply.',
  timeoutSeconds: 30,
  handler: openBotReplyHandler,
  httpRouteTriggerSettings: {
    path: '/openbot/reply',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['x-openbot-timestamp', 'x-openbot-signature'],
  },
});
