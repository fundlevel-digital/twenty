import { createHash } from 'node:crypto';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  enqueueJobs,
  kv,
  RetryableLogicFunctionError,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { isNonEmptyString } from '@sniptt/guards';
import { RestApiClient } from 'twenty-client-sdk/rest';

import {
  getEmailFailureKey,
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
  type PlusvibeImportState,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { LEAD_EMAILS_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { mapEmail } from 'src/logic-functions/utils/map-email';
import { syncNativeEmail } from 'src/logic-functions/utils/native-email';
import { PAGE_SCHEMA } from 'src/logic-functions/utils/page-schema';
import { plusvibeRequest } from 'src/logic-functions/utils/plusvibe-api';
import { recordId } from 'src/logic-functions/utils/sync-records';

const INPUT_SCHEMA = z.object({
  workspaceId: z.string(),
  runId: z.string(),
  leadEmail: z.email(),
  pageTrail: z.string().optional(),
});
type LeadEmailInput = z.infer<typeof INPUT_SCHEMA>;

export const findCampaignSender = async (
  workspaceId: string,
  campaignId: string,
  leadEmail: string,
) => {
  const response = await new RestApiClient({ runAs: 'application' }).post<{
    data?: {
      messages: {
        totalCount: number;
        edges: {
          node: {
            plusvibeSenderRecord: { emails: { primaryEmail: string } } | null;
            messageParticipants: { handle: string }[];
          };
        }[];
      };
    };
    errors?: unknown[];
  }>('/graphql', {
    query:
      'query($workspace:UUID!,$campaign:UUID!,$lead:String!){messages(filter:{source:{eq:PLUSVIBE},plusvibeWorkspaceRecordId:{eq:$workspace},plusvibeCampaignRecordId:{eq:$campaign},messageParticipants:{handle:{ilike:$lead}}},first:1000){totalCount edges{node{plusvibeSenderRecord{emails{primaryEmail}} messageParticipants{handle}}}}}',
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
        node.messageParticipants.some(
          ({ handle }) =>
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

const getLeadEmailsJobId = (input: LeadEmailInput) => {
  const identity = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
  return `plusvibe-mail-${identity}`;
};

export const enqueueLeadEmails = async (
  input: LeadEmailInput,
  delayMilliseconds = 2000,
) => {
  await enqueueJobs({
    logicFunctionUniversalIdentifier: LEAD_EMAILS_UNIVERSAL_IDENTIFIER,
    jobs: [{ jobId: getLeadEmailsJobId(input), payload: input }],
    delayMs: delayMilliseconds,
    retryLimit: 3,
  });
};

export const leadEmailsHandler = async (
  payload: unknown,
  context: LogicFunctionExecutionContext,
) => {
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
  try {
    const query: Record<string, string> = {
      workspace_id: input.workspaceId,
      lead: input.leadEmail,
    };
    if (input.pageTrail) query.page_trail = input.pageTrail;
    const page = await plusvibeRequest('/unibox/campaign-emails', PAGE_SCHEMA, {
      query,
      retryRateLimits: true,
    });
    const campaignSenders = new Map<string, string | undefined>();
    for (const value of page.data) {
      const source = z
        .object({
          eaccount: z.string().nullish(),
          email_account_name: z.string().nullish(),
          sender_email: z.string().nullish(),
          campaign_id: z.string().nullish(),
          camp_id: z.string().nullish(),
        })
        .parse(value);
      const campaignId = source.campaign_id ?? source.camp_id;
      let fallbackSender: string | undefined;
      if (
        ![source.eaccount, source.email_account_name, source.sender_email].some(
          isNonEmptyString,
        ) &&
        isNonEmptyString(campaignId)
      ) {
        if (!campaignSenders.has(campaignId))
          campaignSenders.set(
            campaignId,
            await findCampaignSender(
              input.workspaceId,
              campaignId,
              input.leadEmail,
            ),
          );
        fallbackSender = campaignSenders.get(campaignId);
      }
      await syncNativeEmail(
        mapEmail(
          value,
          input.workspaceId,
          registration.workspaceName,
          input.leadEmail,
          true,
          fallbackSender,
        ),
      );
    }
    const next = page.page_trail ?? page.next_starting_after;
    if (next && next === input.pageTrail)
      throw new Error('PlusVibe campaign email pagination did not advance');
    if (next) await enqueueLeadEmails({ ...input, pageTrail: next });
    const failure = await kv.get<{ jobId?: string }>(
      getEmailFailureKey(input.workspaceId),
    );
    if (failure?.jobId === getLeadEmailsJobId(input))
      await kv.delete(getEmailFailureKey(input.workspaceId));
    return { imported: page.data.length };
  } catch (error) {
    if (error instanceof z.ZodError || context.retryCount >= context.maxRetries)
      await kv.set(getEmailFailureKey(input.workspaceId), {
        runId: input.runId,
        failedAt: new Date().toISOString(),
        jobId: getLeadEmailsJobId(input),
      });
    if (
      !(error instanceof z.ZodError) &&
      context.retryCount < context.maxRetries
    )
      throw new RetryableLogicFunctionError(
        error instanceof Error ? error.message : 'PlusVibe email import failed',
      );
    throw error;
  }
};

export default defineLogicFunction({
  universalIdentifier: LEAD_EMAILS_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-lead-emails',
  timeoutSeconds: 300,
  handler: leadEmailsHandler,
});
