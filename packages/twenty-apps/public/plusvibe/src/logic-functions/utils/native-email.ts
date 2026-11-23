import { isNonEmptyString } from '@sniptt/guards';
import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';
import { setTimeout } from 'node:timers/promises';
import {
  createMessageChannel,
  ingestMessages,
  kv,
  listConnections,
  listMessageChannels,
  updateMessageChannel,
  type AppMessageChannel,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';

import { getWorkspacePreferences } from 'src/logic-functions/utils/preferences';
import { extractEmailReply } from 'src/logic-functions/utils/email-content';
import {
  findSourceLeadIds,
  syncEmailRelations,
  syncSender,
} from 'src/logic-functions/utils/sync-relations';
import {
  ACCOUNT_PROVIDER_NAMES,
  ACCOUNT_PROVIDER_NAME,
  USER_ACCOUNT_PROVIDER_NAME,
} from 'src/constants/plusvibe';
import {
  API_KEY_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
  USER_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
  MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import {
  getAccountConnection,
  getApiKeyFingerprint,
} from 'src/logic-functions/utils/plusvibe-api';
import {
  recordId,
  syncCampaign,
  syncPerson,
} from 'src/logic-functions/utils/sync-records';
import { syncWorkspace } from 'src/logic-functions/utils/sync-workspace';
import { type PlusvibeLead } from 'src/logic-functions/utils/normalize-event';
import { syncSourceThread } from 'src/logic-functions/utils/sync-source-thread';
import {
  getOwnedInboxesKey,
  verifyOwnedInbox,
} from 'src/logic-functions/utils/verify-owned-inbox';
import { UnresolvedOwnedInboxError } from 'src/logic-functions/errors/unresolved-owned-inbox.error';

const MAX_NATIVE_EMAIL_TEXT_LENGTH = 262_144;
const MAX_NATIVE_EMAIL_SUBJECT_LENGTH = 998;

export type NativeEmail = {
  kind?: 'outreach' | 'unibox';
  externalId: string;
  workspaceId: string;
  workspaceName: string;
  sender?: string;
  senderEvidence?:
    | 'PROVIDER_ACCOUNT'
    | 'OUTBOUND_HEADER'
    | 'RECIPIENT_HEADER'
    | 'KNOWN_CONVERSATION';
  leadEmail: string;
  leadId?: string;
  lead?: PlusvibeLead;
  campaignId?: string;
  campaignName?: string;
  threadId?: string;
  subject: string;
  text: string;
  receivedAt: string;
  direction: 'IN' | 'OUT';
  label?: string;
};

export const findMailConnection = async (
  workspaceId?: string,
  connectionId?: string,
) => {
  const account = await getAccountConnection(workspaceId, connectionId);
  const fingerprint = await getApiKeyFingerprint(workspaceId, connectionId);
  return (await listConnections({}))
    .sort(
      (first, second) =>
        Number(second.providerName === 'plusvibe-mail') -
        Number(first.providerName === 'plusvibe-mail'),
    )
    .find(
      (connection) =>
        ['plusvibe-mail', ...ACCOUNT_PROVIDER_NAMES].includes(
          connection.providerName,
        ) &&
        connection.externalAccountId === fingerprint &&
        (!account || connection.userWorkspaceId === account.userWorkspaceId) &&
        (!ACCOUNT_PROVIDER_NAMES.includes(connection.providerName) ||
          !account ||
          connection.id === account.id) &&
        connection.authFailedAt === null,
    );
};

const ensureChannel = async (
  connectedAccountId: string,
  email: NativeEmail & { sender: string },
  messagingProviderUniversalIdentifier: string,
): Promise<AppMessageChannel> => {
  const preferences = await getWorkspacePreferences(email.workspaceId);
  const kind =
    email.kind ??
    (email.direction === 'OUT' && email.campaignId ? 'outreach' : 'unibox');
  const channelHandle = `plusvibe:${kind}:${email.sender.trim().toLowerCase()}`;
  const visibility =
    kind === 'outreach' ? 'SHARE_EVERYTHING' : preferences.uniboxVisibility;
  const channels = await listMessageChannels({ connectedAccountId });
  const legacy = channels.find(
    (channel) => channel.handle === email.sender.trim().toLowerCase(),
  );
  if (legacy && legacy.visibility !== preferences.uniboxVisibility)
    await updateMessageChannel({
      id: legacy.id,
      visibility: preferences.uniboxVisibility,
    });
  const findExisting = async () =>
    (await listMessageChannels({ connectedAccountId })).find(
      (channel) => channel.handle === channelHandle,
    );
  const existing = channels.find((channel) => channel.handle === channelHandle);
  if (existing) {
    if (existing.visibility !== visibility)
      return updateMessageChannel({ id: existing.id, visibility });
    return existing;
  }
  try {
    return await createMessageChannel({
      connectedAccountId,
      handle: channelHandle,
      displayName: email.sender,
      visibility,
      messagingProvider: {
        universalIdentifier: messagingProviderUniversalIdentifier,
      },
    });
  } catch (error) {
    const concurrent = await findExisting();
    if (concurrent) return concurrent;
    throw error;
  }
};

const THREAD_SCHEMA = z.object({
  updatedAt: z.string(),
  plusvibeHasReplies: z.boolean().nullish(),
  plusvibeReplyLabel: z.string().nullish(),
  plusvibeReplyLabels: z.array(z.string()).nullish(),
  plusvibeLatestActivityAt: z.string().nullish(),
});

export const mergeThreadState = (
  current: z.infer<typeof THREAD_SCHEMA>,
  email: Pick<NativeEmail, 'direction' | 'label' | 'receivedAt'>,
) => {
  const labels = new Set(current.plusvibeReplyLabels ?? []);
  const label = email.label?.trim().toUpperCase();
  if (isNonEmptyString(label))
    labels.add(
      [
        'INTERESTED',
        'NOT_INTERESTED',
        'UNSUBSCRIBED',
        'OUT_OF_OFFICE',
      ].includes(label)
        ? label
        : 'OTHER',
    );
  const isLatest =
    Date.parse(email.receivedAt) >=
    Date.parse(current.plusvibeLatestActivityAt ?? '1970-01-01');
  return {
    plusvibeHasReplies:
      current.plusvibeHasReplies === true || email.direction === 'IN',
    plusvibeReplyLabels: [...labels],
    plusvibeReplyLabel:
      isLatest && isNonEmptyString(label)
        ? label
        : (current.plusvibeReplyLabel ?? ''),
    plusvibeLatestActivityAt: isLatest
      ? email.receivedAt
      : current.plusvibeLatestActivityAt,
  };
};

const getConversationId = (email: NativeEmail) => {
  if (!email.sender)
    throw new UnresolvedOwnedInboxError('PlusVibe owned inbox is missing');
  return recordId(
    'conversation',
    email.workspaceId,
    email.sender,
    email.leadEmail,
    email.campaignId ?? '',
  );
};

export const getCanonicalThreadId = async (email: NativeEmail) => {
  const logicalId = getConversationId(email);
  const key = `plusvibe:conversation:${logicalId}`;
  const current = await kv.get<{
    canonicalId: string;
    providerThreadId?: string;
  }>(key);
  if (
    current &&
    (!current.providerThreadId ||
      !email.threadId ||
      current.providerThreadId === email.threadId)
  ) {
    if (email.threadId && !current.providerThreadId)
      await kv.set(key, { ...current, providerThreadId: email.threadId });
    return current.canonicalId;
  }
  if (current && email.threadId) return email.threadId;
  const canonicalId = email.threadId ?? logicalId;
  await kv.set(key, { canonicalId, providerThreadId: email.threadId });
  return canonicalId;
};

export const updateThreadMetadata = async (
  threadId: string,
  fields: Record<string, unknown>,
  email: Pick<NativeEmail, 'direction' | 'label' | 'receivedAt'>,
) => {
  const client = new RestApiClient({ runAs: 'application' });
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await client.get<{ data: { messageThread: unknown } }>(
      `/rest/messageThreads/${threadId}`,
    );
    const current = THREAD_SCHEMA.parse(response.data.messageThread);
    const filter = encodeURIComponent(
      `and(id[eq]:${threadId},updatedAt[eq]:"${current.updatedAt}")`,
    );
    const result = await client.patch<{
      data?: { updateMessageThreads: { id: string }[] };
    }>(`/rest/messageThreads?filter=${filter}&fields=id`, {
      ...fields,
      ...mergeThreadState(current, email),
    });
    if (result.data?.updateMessageThreads.length) return;
  }
  throw new Error(
    'PlusVibe thread metadata changed concurrently; retry the delivery',
  );
};

export const updateThreadLabel = async (
  workspaceId: string,
  threadId: string,
  label: string,
  occurredAt: string,
) => {
  const response = await new RestApiClient({ runAs: 'application' }).post<{
    data?: {
      plusvibeThreadConversations: {
        edges: { node: { conversationId: string } }[];
      };
    };
    errors?: unknown[];
  }>('/graphql', {
    query:
      'query($thread:UUID!){plusvibeThreadConversations(filter:{threadId:{eq:$thread}}){edges{node{conversationId}}}}',
    variables: { thread: recordId('thread', workspaceId, threadId) },
  });
  if (response.errors?.length)
    throw new Error('Could not find the PlusVibe thread');
  for (const { node } of response.data?.plusvibeThreadConversations.edges ?? [])
    await updateThreadMetadata(
      node.conversationId,
      {},
      { direction: 'OUT', label, receivedAt: occurredAt },
    );
};

export const prepareNativeEmailChannel = async (candidate: NativeEmail) => {
  if (!candidate.sender)
    throw new UnresolvedOwnedInboxError('PlusVibe owned inbox is missing');
  const email = { ...candidate, sender: candidate.sender };
  z.email().parse(email.sender);
  z.email().parse(email.leadEmail);
  if (
    email.sender.trim().toLowerCase() === email.leadEmail.trim().toLowerCase()
  )
    throw new UnresolvedOwnedInboxError(
      'PlusVibe owned inbox cannot be the lead email address',
    );
  if (!Number.isFinite(Date.parse(email.receivedAt)))
    throw new Error('Invalid PlusVibe email timestamp');
  await verifyOwnedInbox(email);
  const connection = await findMailConnection(email.workspaceId);
  if (!connection)
    throw new Error(
      'Connect PlusVibe emails in the app Connections tab before importing messages',
    );
  const channel = await ensureChannel(
    connection.id,
    email,
    connection.providerName === USER_ACCOUNT_PROVIDER_NAME
      ? USER_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER
      : connection.providerName === ACCOUNT_PROVIDER_NAME
        ? API_KEY_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER
        : MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
  );
  return channel;
};

export const prepareUnresolvedHistoryChannel = async (workspaceId: string) => {
  const connection = await findMailConnection(workspaceId);
  if (!connection) throw new Error('PlusVibe mail connection is missing');
  const handle = `plusvibe:unibox:unresolved:${workspaceId}`;
  const existing = (
    await listMessageChannels({ connectedAccountId: connection.id })
  ).find((channel) => channel.handle === handle);
  if (existing) return existing;
  const preferences = await getWorkspacePreferences(workspaceId);
  return createMessageChannel({
    connectedAccountId: connection.id,
    handle,
    displayName: 'Unresolved Historical Inbox',
    visibility: preferences.uniboxVisibility,
    messagingProvider: {
      universalIdentifier:
        connection.providerName === USER_ACCOUNT_PROVIDER_NAME
          ? USER_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER
          : connection.providerName === ACCOUNT_PROVIDER_NAME
            ? API_KEY_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER
            : MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
    },
  });
};

const findReplayChannel = async (
  email: NativeEmail,
  fallback: AppMessageChannel,
) => {
  const result = await new RestApiClient({ runAs: 'application' }).post<{
    data?: {
      messageChannelMessageAssociations: {
        edges: { node: { messageChannelId: string } }[];
      };
    };
    errors?: unknown[];
  }>('/graphql', {
    query:
      'query($external:String!){messageChannelMessageAssociations(first:20,filter:{messageExternalId:{eq:$external}}){edges{node{messageChannelId}}}}',
    variables: { external: `${email.workspaceId}:${email.externalId}` },
  });
  if (result.errors?.length || !result.data)
    throw new Error('Could not verify existing PlusVibe message identity');
  const identifiers = new Set(
    result.data.messageChannelMessageAssociations.edges.map(
      ({ node }) => node.messageChannelId,
    ),
  );
  if (identifiers.size === 0) return fallback;
  const channels = (
    await listMessageChannels({
      connectedAccountId: fallback.connectedAccountId,
    })
  ).filter((channel) => identifiers.has(channel.id));
  if (channels.length > 1)
    throw new Error(
      'Multiple PlusVibe messages share the same provider identity',
    );
  return channels[0] ?? fallback;
};

const syncVerifiedNativeEmail = async (candidate: NativeEmail) => {
  if (!candidate.sender)
    throw new UnresolvedOwnedInboxError('PlusVibe owned inbox is missing');
  const email = { ...candidate, sender: candidate.sender };
  const channel = await findReplayChannel(
    email,
    await prepareNativeEmailChannel(email),
  );
  const personId = await syncPerson(
    {
      ...email.lead,
      email: email.leadEmail,
      lead_id: email.leadId ?? email.lead?.lead_id,
    },
    email.workspaceId,
    { direction: email.direction, senderEmail: email.sender },
  );
  const workspaceId = await syncWorkspace(
    { _id: email.workspaceId, name: email.workspaceName },
    true,
  );
  const campaignId = email.campaignId
    ? await syncCampaign({
        workspaceId: email.workspaceId,
        workspaceName: email.workspaceName,
        externalId: email.campaignId,
        name: email.campaignName,
      })
    : undefined;
  const nativeThreadExternalId = await getCanonicalThreadId(email);
  const conversation = await kv.get<{ providerThreadId?: string }>(
    `plusvibe:conversation:${getConversationId(email)}`,
  );
  const providerThreadId = email.threadId ?? conversation?.providerThreadId;
  const sourceThreadId = providerThreadId
    ? await syncSourceThread(email.workspaceId, providerThreadId)
    : undefined;
  const [message] = await ingestMessages({
    messageChannelId: channel.id,
    messages: [
      {
        externalId: `${email.workspaceId}:${email.externalId}`,
        threadExternalId: `${email.workspaceId}:${nativeThreadExternalId}`,
        subject: email.subject.slice(0, MAX_NATIVE_EMAIL_SUBJECT_LENGTH),
        text: extractEmailReply(email.text).slice(
          0,
          MAX_NATIVE_EMAIL_TEXT_LENGTH,
        ),
        receivedAt: new Date(email.receivedAt),
        participants: [
          {
            role: email.direction === 'OUT' ? 'FROM' : 'TO',
            handle: channel.handle,
            displayName: email.sender,
          },
          {
            role: email.direction === 'OUT' ? 'TO' : 'FROM',
            handle: email.leadEmail,
            displayName: email.leadEmail,
            ...(personId ? { personId } : {}),
          },
        ],
      },
    ],
  });
  if (!message)
    throw new Error('Twenty did not acknowledge the imported message');
  const client = new RestApiClient({ runAs: 'application' });
  const senderId = await syncSender(email.workspaceId, email.sender);
  const leadIds = await findSourceLeadIds(email, personId);
  const common = {
    source: 'PLUSVIBE',
    plusvibeWorkspaceRecordId: workspaceId,
    ...(campaignId ? { plusvibeCampaignRecordId: campaignId } : {}),
  };
  await client.patch(`/rest/messages/${message.messageId}`, {
    ...common,
    text: extractEmailReply(email.text).slice(0, MAX_NATIVE_EMAIL_TEXT_LENGTH),
    plusvibeSenderRecordId: senderId,
    plusvibeInboxResolution: 'Verified',
    ...(sourceThreadId ? { plusvibeThreadRecordId: sourceThreadId } : {}),
  });
  await updateThreadMetadata(message.messageThreadId, common, email);
  await syncEmailRelations(
    email,
    message.messageThreadId,
    senderId,
    leadIds,
    sourceThreadId,
  );
  return message;
};

const syncUnresolvedHistoryEmail = async (email: NativeEmail) => {
  z.email().parse(email.leadEmail);
  if (!Number.isFinite(Date.parse(email.receivedAt)))
    throw new Error('Invalid PlusVibe email timestamp');
  const channel = await findReplayChannel(
    email,
    await prepareUnresolvedHistoryChannel(email.workspaceId),
  );
  const previousInbox = channel.handle.match(
    /^plusvibe:(?:unibox|outreach):([^:]+@[^:]+)$/,
  )?.[1];
  if (previousInbox && previousInbox !== email.leadEmail) {
    const key = getOwnedInboxesKey(email.workspaceId);
    if (
      ((await kv.get<string[]>(key)) ?? []).includes(previousInbox) ||
      (await kv.get<boolean>(`${key}:${previousInbox}`))
    )
      return syncVerifiedNativeEmail({
        ...email,
        sender: previousInbox,
        senderEvidence: 'KNOWN_CONVERSATION',
      });
  }
  const personId = await syncPerson(
    {
      ...email.lead,
      email: email.leadEmail,
      lead_id: email.leadId ?? email.lead?.lead_id,
    },
    email.workspaceId,
    { direction: email.direction },
  );
  const [message] = await ingestMessages({
    messageChannelId: channel.id,
    messages: [
      {
        externalId: `${email.workspaceId}:${email.externalId}`,
        threadExternalId: `${email.workspaceId}:${email.threadId ?? recordId('unresolved-thread', email.workspaceId, email.leadEmail, email.campaignId ?? '')}`,
        subject: email.subject.slice(0, MAX_NATIVE_EMAIL_SUBJECT_LENGTH),
        text: extractEmailReply(email.text).slice(
          0,
          MAX_NATIVE_EMAIL_TEXT_LENGTH,
        ),
        receivedAt: new Date(email.receivedAt),
        participants:
          email.direction === 'OUT'
            ? [
                {
                  role: 'FROM',
                  handle: channel.handle,
                  displayName: 'Unresolved Historical Inbox',
                },
                {
                  role: 'TO',
                  handle: email.leadEmail,
                  displayName: email.leadEmail,
                  ...(personId ? { personId } : {}),
                },
              ]
            : [
                {
                  role: 'FROM',
                  handle: email.leadEmail,
                  displayName: email.leadEmail,
                  ...(personId ? { personId } : {}),
                },
              ],
      },
    ],
  });
  if (!message)
    throw new Error(
      'Twenty did not acknowledge the unresolved historical email',
    );
  const workspaceId = await syncWorkspace(
    { _id: email.workspaceId, name: email.workspaceName },
    true,
  );
  const common = { source: 'PLUSVIBE', plusvibeWorkspaceRecordId: workspaceId };
  await new RestApiClient({ runAs: 'application' }).patch(
    `/rest/messages/${message.messageId}`,
    {
      ...common,
      plusvibeSenderRecordId: null,
      plusvibeInboxResolution: 'Unresolved',
      ...(email.threadId
        ? {
            plusvibeThreadRecordId: await syncSourceThread(
              email.workspaceId,
              email.threadId,
            ),
          }
        : {}),
    },
  );
  await updateThreadMetadata(message.messageThreadId, common, email);
  return message;
};

export const resolveOwnedEmail = async (candidate: NativeEmail) => {
  if (candidate.direction !== 'IN' || !candidate.sender) return candidate;
  const key = getOwnedInboxesKey(candidate.workspaceId);
  const owned = (await kv.get<string[]>(key)) ?? [];
  const [leadIsOwned, senderIsOwned] = await Promise.all([
    owned.includes(candidate.leadEmail) ||
      kv.get<boolean>(`${key}:${candidate.leadEmail}`),
    owned.includes(candidate.sender) ||
      kv.get<boolean>(`${key}:${candidate.sender}`),
  ]);
  if (leadIsOwned && !senderIsOwned) {
    // Some historical Unibox rows mark our sent mail as incoming.
    return {
      ...candidate,
      direction: 'OUT' as const,
      sender: candidate.leadEmail,
      leadEmail: candidate.sender,
      lead: { ...candidate.lead, email: candidate.sender },
      senderEvidence: 'KNOWN_CONVERSATION' as const,
    };
  }
  return candidate;
};

const syncNativeEmailOnce = async (candidate: NativeEmail) => {
  const email = await resolveOwnedEmail(candidate);
  try {
    return await syncVerifiedNativeEmail(email);
  } catch (error) {
    if (!(error instanceof UnresolvedOwnedInboxError)) throw error;
    return syncUnresolvedHistoryEmail(email);
  }
};

export const syncNativeEmail = async (candidate: NativeEmail) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await syncNativeEmailOnce(candidate);
    } catch (error) {
      if (
        !(error instanceof RestApiClientError) ||
        error.status !== 429 ||
        attempt >= 5
      )
        throw error;
      await setTimeout(Math.min(60_000, 5000 * 2 ** attempt));
    }
  }
};
