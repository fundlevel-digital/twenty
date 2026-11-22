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
import { type RecordComment } from '../types';
import { graphql } from '../utils/graphql';

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
  const replyId = getOpenBotReplyId(delivery.id);
  const fields =
    'id body authorId authorName authorKind parentId targetObject targetRecordId resolved deleted';
  const loadComments = async () => {
    const result = await graphql<{
      recordComments: { edges: { node: RecordComment }[] };
    }>(
      `query($filter: RecordCommentFilterInput!) { recordComments(filter: $filter, first: 3) { edges { node { ${fields} } } } }`,
      { filter: { id: { in: [task.threadId, task.commentId, replyId] } } },
      true,
    );
    return result.recordComments.edges.map(({ node }) => node);
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
  if (!existingReply) {
    try {
      await graphql(
        'mutation($data: RecordCommentCreateInput!) { createRecordComment(data: $data) { id } }',
        {
          data: {
            id: replyId,
            name: body.text.trim().slice(0, 80),
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
          },
        },
        true,
      );
    } catch (error) {
      const duplicate = (await loadComments()).find(({ id }) => id === replyId);
      if (
        !duplicate ||
        duplicate.authorId !== connection.id ||
        duplicate.body !== body.text.trim()
      )
        throw error;
    }
  }
  // A unique comment ID and Inbox idempotency key also cover simultaneous callback retries.
  const metadataClient = new MetadataApiClient({ runAs: 'application' });
  const {
    sendInboxMessage: { threadId },
  } = await metadataClient.mutation({
    sendInboxMessage: {
      __args: {
        input: {
          workspaceMemberIds: [task.requestedBy],
          threadKey: `openbot:${task.threadId}`,
          idempotencyKey: replyId,
          title: `${connection.name} replied · ${task.recordLabel}`,
          text: body.text.trim(),
        },
      },
      threadId: true,
    },
  });
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
    path: '/comments/openbot/reply',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['x-openbot-timestamp', 'x-openbot-signature'],
  },
});
