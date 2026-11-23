import { isNonEmptyString } from '@sniptt/guards';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  inboxMention,
  inboxReferenceRecord,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from '../constants/identifiers';
import { readBotRecord, botProviderRequest } from '../openbot/provider';
import {
  getPublicOpenBotAgents,
  searchOpenBotMentions,
  validateOpenBotMention,
} from '../openbot/mentions';
import { queueOpenBotMentions } from '../openbot/queue-comment';
import {
  type CommentRequest,
  type CommentResponse,
  type CommentInboxResponse,
  type CommentInboxTargetResponse,
  type RecordComment,
  type Mention,
} from '../types';
import { graphql } from '../utils/graphql';
import {
  readCommentInbox,
  readCommentNotificationTarget,
} from '../utils/comment-inbox';
import {
  getCommentObjects,
  readCommentTarget,
} from '../utils/read-comment-target';
import { getMentionRanges, hasUnselectedMention } from '../utils/mention-draft';

const FIELDS =
  'id body authorId authorName authorKind: authorType parentId resolved deleted createdAt mentions targetObject targetRecordId';
type CommentEdges = {
  recordComments: {
    edges: { node: RecordComment }[];
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
};

export const commentsHandler = async (
  { body: input }: RoutePayload<CommentRequest>,
  context: LogicFunctionExecutionContext,
): Promise<
  | CommentResponse
  | CommentInboxResponse
  | CommentInboxTargetResponse
  | Mention[]
> => {
  const memberId = context.workspaceMemberId;
  if (!memberId) throw new Error('Sign in to use comments');
  if (!input) throw new Error('Select a record');
  if (input.action === 'inbox') return readCommentInbox(input.cursor);
  if (input.action === 'inbox-target')
    return readCommentNotificationTarget(input.notificationId);
  const { recordLabel, objectLabel } = await readCommentTarget(
    input,
    await getCommentObjects(),
  );

  if (input.action === 'search') {
    const query = (input.query ?? '').slice(0, 100);
    const [members, records] = await Promise.all([
      graphql<{
        workspaceMembers: {
          edges: {
            node: { id: string; name: { firstName: string; lastName: string } };
          }[];
        };
      }>(
        'query { workspaceMembers(first: 200) { edges { node { id name { firstName lastName } } } } }',
        {},
      ),
      graphql<{
        search: {
          edges: {
            node: {
              recordId: string;
              objectNameSingular: string;
              label: string;
            };
          }[];
        };
      }>(
        'query($query: String!) { search(searchInput: $query, limit: 12, excludedObjectNameSingulars: ["recordComment", "workspaceMember"]) { edges { node { recordId objectNameSingular label } } } }',
        { query },
      ),
    ]);
    return [
      ...(await searchOpenBotMentions(query)),
      ...members.workspaceMembers.edges
        .map(({ node }) => ({
          id: node.id,
          label:
            `${node.name.firstName ?? ''} ${node.name.lastName ?? ''}`.trim(),
          objectName: 'workspaceMember',
        }))
        .filter(({ label }) =>
          label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
        )
        .slice(0, 8),
      ...records.search.edges
        .filter(({ node }) => node.objectNameSingular !== 'bot')
        .map(({ node }) => ({
          id: node.recordId,
          label: node.label,
          objectName: node.objectNameSingular,
        })),
    ];
  }

  const comments: RecordComment[] = [];
  let cursor: string | undefined;
  do {
    const page: CommentEdges = await graphql<CommentEdges>(
      `query($filter: RecordCommentFilterInput!, $after: String) { recordComments(filter: $filter, first: 200, after: $after, orderBy: [{createdAt: AscNullsLast}]) { edges { node { ${FIELDS} } } pageInfo { hasNextPage endCursor } } }`,
      {
        filter: {
          targetObject: { eq: input.objectName },
          targetRecordId: { eq: input.recordId },
        },
        after: cursor,
      },
      true,
    );
    comments.push(...page.recordComments.edges.map(({ node }) => node));
    cursor = page.recordComments.pageInfo.hasNextPage
      ? page.recordComments.pageInfo.endCursor
      : undefined;
  } while (cursor);

  const botRecord = await readBotRecord(input);
  comments.push(...botRecord.comments);
  comments.sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  );
  const result = {
    comments,
    memberId,
    recordLabel,
    objectLabel,
    openBotAgents: await getPublicOpenBotAgents(),
    openBotDeliveries: botRecord.statuses,
  };
  if (input.action === 'list') return result;
  const existing = comments.find(({ id }) => id === input.id);
  if (
    (input.action === 'delete' || input.action === 'resolve') &&
    existing?.botOwned
  ) {
    await botProviderRequest({ ...input });
    return commentsHandler(
      { body: { ...input, action: 'list' } } as RoutePayload<CommentRequest>,
      context,
    );
  }
  if (input.action === 'delete' || input.action === 'resolve') {
    if (!existing || (existing.deleted && input.action === 'delete'))
      throw new Error('Comment unavailable');
    if (input.action === 'delete' && existing.authorId !== memberId)
      throw new Error('Only the author can delete this comment');
    if (
      input.action === 'resolve' &&
      (existing.parentId || typeof input.resolved !== 'boolean')
    )
      throw new Error('Resolve a thread');
    const data =
      input.action === 'delete'
        ? { deleted: true, body: '', mentions: '[]' }
        : { resolved: input.resolved };
    const update = await graphql<{ updateRecordComment: RecordComment }>(
      `mutation($id: UUID!, $data: RecordCommentUpdateInput!) { updateRecordComment(id: $id, data: $data) { ${FIELDS} } }`,
      { id: existing.id, data },
      true,
    );
    return {
      ...result,
      comments: comments.map((comment) =>
        comment.id === existing.id ? update.updateRecordComment : comment,
      ),
    };
  }
  if (input.action !== 'create') throw new Error('Unsupported action');
  if (!isNonEmptyString(input.body?.trim()) || input.body.length > 10000)
    throw new Error('Write a comment of up to 10,000 characters');
  if (hasUnselectedMention(input.body, input.mentions ?? []))
    throw new Error('Select a user, bot, or record for each @ mention');
  const parent = comments.find(({ id }) => id === input.parentId);
  if (input.parentId && (!parent || parent.parentId || parent.resolved))
    throw new Error('Reply to an open thread');
  const {
    data: { workspaceMember: member },
  } = await new RestApiClient().get<{
    data: {
      workspaceMember: { name: { firstName: string; lastName: string } };
    };
  }>(`/rest/workspaceMembers/${memberId}`);
  const authorName =
    `${member.name.firstName ?? ''} ${member.name.lastName ?? ''}`.trim();
  const mentions = [
    ...new Set(
      getMentionRanges(input.body, input.mentions ?? []).map(
        ({ mention }) => mention,
      ),
    ),
  ];
  if (mentions.length > 20) throw new Error('Mention up to 20 recipients');
  const botValidation = await Promise.all(
    mentions
      .filter((mention) => ['bot', 'openbotAgent'].includes(mention.objectName))
      .map((mention) => validateOpenBotMention(mention, input.body ?? '')),
  );
  if (botValidation.some((valid) => !valid)) {
    throw new Error('Select a connected OpenBot agent from the mention picker');
  }
  // Validate references as the caller before saving or delivering any mention.
  const references = await Promise.all(
    mentions
      .filter(({ objectName }) => !['bot', 'openbotAgent'].includes(objectName))
      .map(async (mention) => ({
        mention,
        text:
          mention.objectName === 'workspaceMember'
            ? await inboxMention({ workspaceMemberId: mention.id })
            : await inboxReferenceRecord({
                objectNameSingular: mention.objectName,
                recordId: mention.id,
              }),
      })),
  );
  const created = await graphql<{ createRecordComment: RecordComment }>(
    `mutation($data: RecordCommentCreateInput!) { createRecordComment(data: $data) { ${FIELDS} } }`,
    {
      data: {
        name: input.body.slice(0, 80),
        body: input.body.trim(),
        parentId: input.parentId ?? null,
        targetObject: input.objectName,
        targetRecordId: input.recordId,
        authorId: memberId,
        authorName,
        authorKind: 'HUMAN',
        authorType: 'HUMAN',
        mentions: JSON.stringify(mentions),
        resolved: false,
        deleted: false,
      },
    },
    true,
  );
  const comment = created.createRecordComment;
  let openBotDeliveryFailed = false;
  try {
    await queueOpenBotMentions(comment, mentions, recordLabel);
  } catch {
    openBotDeliveryFailed = true;
  }
  let notificationFailed = false;
  const recipients = [
    ...new Set(
      mentions
        .filter(
          (mention) =>
            mention.objectName === 'workspaceMember' && mention.id !== memberId,
        )
        .map(({ id }) => id),
    ),
  ];
  if (recipients.length) {
    try {
      let text = comment.body;
      for (const reference of references)
        text = text.replaceAll(`@${reference.mention.label}`, reference.text);
      const targetReference = await inboxReferenceRecord({
        objectNameSingular: input.objectName,
        recordId: input.recordId,
      });
      await new MetadataApiClient({ runAs: 'application' }).mutation({
        sendInboxMessage: {
          __args: {
            input: {
              workspaceMemberIds: recipients,
              threadKey: `comment:${comment.id}`,
              idempotencyKey: comment.id,
              title: `${authorName} mentioned you · ${recordLabel}`,
              text: `${targetReference}\n\n${text}`,
            },
          },
          threadId: true,
        },
      });
    } catch {
      notificationFailed = true;
    }
  }
  return {
    ...result,
    comments: [...comments, comment],
    notificationFailed,
    openBotDeliveryFailed,
    openBotDeliveries: (await readBotRecord(input)).statuses,
  };
};

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.function,
  name: 'record-comments',
  description: 'Read and write record comment threads as the signed-in member.',
  timeoutSeconds: 30,
  handler: commentsHandler,
  httpRouteTriggerSettings: {
    path: '/comments',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
