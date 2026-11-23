import {
  selectReply,
  type EmailMessage,
  type Mailbox,
} from './select-reply.ts';

type Connection<TRecord> = {
  edges: { node: TRecord }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

type MessageRecord = Omit<EmailMessage, 'associations' | 'participants'> & {
  messageChannelMessageAssociations: Connection<
    EmailMessage['associations'][number]
  >;
  messageParticipants: Connection<EmailMessage['participants'][number]>;
};

const request = async <TData>(
  path: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<TData> => {
  const apiUrl =
    process.env.TWENTY_INTERNAL_API_URL ?? process.env.TWENTY_API_URL;
  const token =
    process.env.TWENTY_APP_ACCESS_TOKEN ??
    process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN;
  if (!apiUrl || !token)
    throw new Error('The workflow caller authentication is missing.');
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`CRM query failed with HTTP ${response.status}.`);
  const body = (await response.json()) as {
    data?: TData;
    errors?: { message: string }[];
  };
  if (body.errors?.length || !body.data) {
    throw new Error(
      body.errors?.map((error) => error.message).join('; ') ??
        'CRM query returned no data.',
    );
  }
  return body.data;
};

export const main = async ({ influencerId }: { influencerId: string }) => {
  if (!influencerId)
    throw new Error('Select one Influencer before running this workflow.');

  const contactIds = new Set<string>();
  let after: string | null = null;
  do {
    const result = await request<{
      influencer: {
        contactLinks: Connection<{ personId: string | null }>;
      } | null;
    }>(
      '/graphql',
      `query($id:UUID!,$after:String){
      influencer(filter:{id:{eq:$id}}){
        contactLinks(first:200,after:$after){
          edges{node{personId}} pageInfo{hasNextPage endCursor}
        }
      }
    }`,
      { id: influencerId, after },
    );
    if (!result.influencer)
      throw new Error('The selected Influencer could not be found.');
    for (const { node } of result.influencer.contactLinks.edges) {
      if (node.personId) contactIds.add(node.personId);
    }
    after = result.influencer.contactLinks.pageInfo.hasNextPage
      ? result.influencer.contactLinks.pageInfo.endCursor
      : null;
  } while (after);
  if (contactIds.size === 0)
    throw new Error('This Influencer has no linked contact.');

  const { myMessageChannels } = await request<{
    myMessageChannels: (Mailbox & {
      type: string;
      messagingProviderUniversalIdentifier: string | null;
    })[];
  }>(
    '/metadata',
    `{
    myMessageChannels{
      id connectedAccountId handle type messagingProviderUniversalIdentifier
    }
  }`,
  );
  const mailboxes = myMessageChannels.filter(
    (channel) =>
      channel.type === 'EMAIL' && !channel.messagingProviderUniversalIdentifier,
  );
  if (mailboxes.length === 0)
    throw new Error(
      'No connected email mailbox is accessible to the workflow caller.',
    );

  const messageIds = new Set<string>();
  after = null;
  do {
    const result = await request<{
      messageParticipants: Connection<{ messageId: string }>;
    }>(
      '/graphql',
      `query($ids:[UUID!]!,$after:String){
      messageParticipants(first:200,after:$after,filter:{personId:{in:$ids}}){
        edges{node{messageId}} pageInfo{hasNextPage endCursor}
      }
    }`,
      { ids: [...contactIds], after },
    );
    for (const { node } of result.messageParticipants.edges)
      messageIds.add(node.messageId);
    after = result.messageParticipants.pageInfo.hasNextPage
      ? result.messageParticipants.pageInfo.endCursor
      : null;
  } while (after);

  const messages: EmailMessage[] = [];
  const identifiers = [...messageIds];
  for (let offset = 0; offset < identifiers.length; offset += 100) {
    const result = await request<{ messages: Connection<MessageRecord> }>(
      '/graphql',
      `query($ids:[UUID!]!){
        messages(first:100,filter:{id:{in:$ids}}){
          edges{node{
            id headerMessageId messageThreadId receivedAt subject text isDraft
            messageChannelMessageAssociations(first:200){
              edges{node{messageChannelId direction}} pageInfo{hasNextPage endCursor}
            }
            messageParticipants(first:200){
              edges{node{personId role handle}} pageInfo{hasNextPage endCursor}
            }
          }} pageInfo{hasNextPage endCursor}
        }
      }`,
      { ids: identifiers.slice(offset, offset + 100) },
    );
    for (const { node } of result.messages.edges) {
      if (
        node.messageParticipants.pageInfo.hasNextPage ||
        node.messageChannelMessageAssociations.pageInfo.hasNextPage
      ) {
        throw new Error(
          'The conversation exceeds the participant limit; select it manually.',
        );
      }
      messages.push({
        ...node,
        associations: node.messageChannelMessageAssociations.edges.map(
          (edge) => edge.node,
        ),
        participants: node.messageParticipants.edges.map((edge) => edge.node),
      });
    }
  }
  const reply = selectReply(messages, [...contactIds], mailboxes);
  const parent = messages.find(
    (message) => message.id === reply.parentMessageId,
  )!;
  const sender = parent.participants.find(
    (participant) =>
      participant.role === 'FROM' && participant.handle === reply.recipients.to,
  );
  if (!sender?.personId)
    throw new Error('The reply sender is not linked to a contact.');
  const linkedInfluencerIds = new Set<string>();
  after = null;
  do {
    const result = await request<{
      influencerContacts: Connection<{ influencerId: string | null }>;
    }>(
      '/graphql',
      `query($personId:UUID!,$after:String){
      influencerContacts(first:200,after:$after,filter:{personId:{eq:$personId}}){
        edges{node{influencerId}} pageInfo{hasNextPage endCursor}
      }
    }`,
      { personId: sender.personId, after },
    );
    for (const { node } of result.influencerContacts.edges) {
      if (node.influencerId) linkedInfluencerIds.add(node.influencerId);
    }
    after = result.influencerContacts.pageInfo.hasNextPage
      ? result.influencerContacts.pageInfo.endCursor
      : null;
  } while (after);
  if (!linkedInfluencerIds.has(influencerId) || linkedInfluencerIds.size > 1) {
    throw new Error(
      'The incoming sender is linked to multiple Influencers. Choose and verify the conversation manually before drafting.',
    );
  }
  return reply;
};
