import { createSyncRestClient } from 'src/logic-functions/utils/sync-context';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  kv,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';

import {
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
  type PlusvibeImportState,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { LEAD_EMAILS_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  enqueueSyncTasks,
  wakeSyncWorker,
} from 'src/logic-functions/utils/sync-jobs';
import { sourceIdentity } from 'src/logic-functions/backfill';
import { PAGE_SCHEMA } from 'src/logic-functions/utils/page-schema';
import { plusvibeRequest } from 'src/logic-functions/utils/plusvibe-api';
import { recordId } from 'src/logic-functions/utils/sync-records';

const INPUT_SCHEMA = z.object({
  workspaceId: z.string(),
  runId: z.string(),
  leadEmail: z.email(),
  pageTrail: z.string().optional(),
  visitedTrails: z.array(z.string()).optional(),
});
type LeadEmailInput = z.infer<typeof INPUT_SCHEMA>;

export const findCampaignSender = async (
  workspaceId: string,
  campaignId: string,
  leadEmail: string,
) => {
  const response = await createSyncRestClient().post<{
    data?: {
      messages: {
        totalCount: number;
        edges: {
          node: {
            plusvibeSenderRecord: { emails: { primaryEmail: string } } | null;
            messageParticipants: {
              edges: { node: { handle: string } }[];
            };
          };
        }[];
      };
    };
    errors?: unknown[];
  }>('/graphql', {
    query:
      'query($workspace:UUID!,$campaign:UUID!,$lead:String!){messages(filter:{source:{eq:PLUSVIBE},plusvibeWorkspaceRecordId:{eq:$workspace},plusvibeCampaignRecordId:{eq:$campaign},messageParticipants:{handle:{ilike:$lead}}},first:1000){totalCount edges{node{plusvibeSenderRecord{emails{primaryEmail}} messageParticipants{edges{node{handle}}}}}}}',
    variables: {
      workspace: recordId('workspace', workspaceId),
      campaign: recordId('campaign', workspaceId, campaignId),
      lead: leadEmail,
    },
  });
  if (response.errors?.length)
    throw new Error('Could not resolve the PlusVibe campaign sender');
  const messages = response.data?.messages;
  if (!messages || messages.totalCount > messages.edges.length)
    return undefined;
  const senders = new Set(
    messages.edges
      .filter(({ node }) =>
        node.messageParticipants.edges.some(
          ({ node: { handle } }) =>
            handle.trim().toLowerCase() === leadEmail.toLowerCase(),
        ),
      )
      .flatMap(({ node }) =>
        node.plusvibeSenderRecord
          ? [node.plusvibeSenderRecord.emails.primaryEmail.trim().toLowerCase()]
          : [],
      )
      .filter((sender) => z.email().safeParse(sender).success),
  );
  return senders.size === 1 ? [...senders][0] : undefined;
};

export const enqueueLeadEmails = async (
  input: LeadEmailInput,
  delayMilliseconds = 2000,
) => {
  await enqueueSyncTasks([
    {
      kind: 'CAMPAIGN_HISTORY',
      workspaceId: input.workspaceId,
      runId: input.runId,
      identity: [
        input.leadEmail.trim().toLowerCase(),
        input.pageTrail ?? 'start',
      ],
      payload: input,
      delayMilliseconds,
    },
  ]);
  await wakeSyncWorker();
};

export const processLeadEmails = async (payload: unknown) => {
  const input = INPUT_SCHEMA.parse(payload);
  if (
    !((await kv.get<string[]>(SELECTION_KEY)) ?? []).includes(input.workspaceId)
  )
    return { skipped: true };
  const state = await kv.get<PlusvibeImportState>(
    getImportKey(input.workspaceId),
  );
  if (state?.runId !== input.runId) return { skipped: true };
  const registration = await kv.get<PlusvibeRegistration>(
    getRegistrationKey(input.workspaceId),
  );
  if (!registration) return { skipped: true };
  const page = await plusvibeRequest('/unibox/campaign-emails', PAGE_SCHEMA, {
    query: {
      workspace_id: input.workspaceId,
      lead: input.leadEmail,
      ...(input.pageTrail ? { page_trail: input.pageTrail } : {}),
    },
    retryRateLimits: true,
  });
  const next = page.page_trail ?? page.next_starting_after;
  if (
    (page.has_more && !next) ||
    (next &&
      (next === input.pageTrail || (input.visitedTrails ?? []).includes(next)))
  )
    throw new Error('PlusVibe campaign email pagination did not advance');
  await enqueueSyncTasks(
    page.data.map((source) => ({
      kind: 'EMAIL',
      workspaceId: input.workspaceId,
      runId: input.runId,
      identity: ['campaign', sourceIdentity(source)],
      payload: {
        workspaceId: input.workspaceId,
        runId: input.runId,
        source,
        leadEmail: input.leadEmail,
        origin: 'campaign',
      },
    })),
  );
  if (next)
    await enqueueLeadEmails({
      ...input,
      pageTrail: next,
      visitedTrails: [
        ...(input.visitedTrails ?? []),
        input.pageTrail ?? 'start',
      ],
    });
  return { discovered: page.data.length };
};

export const leadEmailsHandler = async (
  payload: unknown,
  _context?: LogicFunctionExecutionContext,
) => {
  await enqueueLeadEmails(INPUT_SCHEMA.parse(payload));
  return { queued: true };
};

export default defineLogicFunction({
  universalIdentifier: LEAD_EMAILS_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-lead-emails',
  timeoutSeconds: 60,
  handler: leadEmailsHandler,
});
