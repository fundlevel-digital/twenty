import { RestApiClient } from 'twenty-client-sdk/rest';
import {
  createRecordIfMissing,
  recordId,
  syncLead,
} from 'src/logic-functions/utils/sync-records';
import { type NativeEmail } from 'src/logic-functions/utils/native-email';

export const syncSender = async (workspaceId: string, email: string) => {
  const id = recordId('sender', workspaceId, email.trim().toLowerCase());
  await createRecordIfMissing('plusvibeSenders', id, {
    name: email,
    emails: { primaryEmail: email, additionalEmails: [] },
    workspaceRecordId: recordId('workspace', workspaceId),
  });
  return id;
};

const linkRecords = async (
  plural: string,
  leftName: string,
  leftId: string,
  rightName: string,
  rightId: string,
  name: string,
) => {
  await createRecordIfMissing(
    plural,
    recordId('link', plural, leftId, rightId),
    { name, [`${leftName}Id`]: leftId, [`${rightName}Id`]: rightId },
  );
};

export const findSourceLeadIds = async (
  email: NativeEmail,
  personId?: string,
) => {
  const leadId = await syncLead(
    {
      ...email.lead,
      lead_id: email.leadId ?? email.lead?.lead_id,
      email: email.leadEmail,
      campaign_id: email.campaignId,
    },
    email.workspaceId,
    personId,
    false,
    personId ? 'MATCHED' : 'UNMATCHED',
  );
  if (leadId) return [leadId];
  const result = await new RestApiClient({ runAs: 'application' }).post<{
    data?: {
      plusvibeLeads: {
        edges: { node: { id: string; emails: { primaryEmail: string } } }[];
      };
    };
    errors?: unknown[];
  }>('/graphql', {
    query:
      'query($workspace:UUID!,$email:String!,$campaign:UUIDFilterInput){plusvibeLeads(filter:{workspaceRecordId:{eq:$workspace},emails:{primaryEmail:{ilike:$email}},campaignRecordId:$campaign},first:200){edges{node{id emails{primaryEmail}}}}}',
    variables: {
      workspace: recordId('workspace', email.workspaceId),
      email: email.leadEmail,
      campaign: email.campaignId
        ? { eq: recordId('campaign', email.workspaceId, email.campaignId) }
        : undefined,
    },
  });
  if (result.errors?.length)
    throw new Error('Could not resolve PlusVibe Leads');
  return (result.data?.plusvibeLeads.edges ?? [])
    .filter(
      ({ node }) =>
        node.emails.primaryEmail.trim().toLowerCase() ===
        email.leadEmail.toLowerCase(),
    )
    .map(({ node }) => node.id);
};

export const syncEmailRelations = async (
  email: NativeEmail,
  conversationId: string,
  senderId: string,
  leadIds: string[],
  sourceThreadId?: string,
) => {
  if (!email.sender)
    throw new Error('PlusVibe sender relations require a verified inbox');
  await linkRecords(
    'plusvibeConversationSenders',
    'conversation',
    conversationId,
    'sender',
    senderId,
    email.sender,
  );
  if (sourceThreadId) {
    await linkRecords(
      'plusvibeThreadConversations',
      'thread',
      sourceThreadId,
      'conversation',
      conversationId,
      email.threadId ?? 'Conversation',
    );
    await linkRecords(
      'plusvibeThreadSenders',
      'thread',
      sourceThreadId,
      'sender',
      senderId,
      email.sender,
    );
  }
  for (const leadId of leadIds) {
    await linkRecords(
      'plusvibeConversationLeads',
      'conversation',
      conversationId,
      'lead',
      leadId,
      email.leadEmail,
    );
    await linkRecords(
      'plusvibeLeadSenders',
      'lead',
      leadId,
      'sender',
      senderId,
      email.sender,
    );
    if (sourceThreadId)
      await linkRecords(
        'plusvibeThreadLeads',
        'thread',
        sourceThreadId,
        'lead',
        leadId,
        email.leadEmail,
      );
  }
};
