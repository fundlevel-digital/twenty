import { kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import {
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
  type PlusvibeImportState,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import {
  IMPORT_PAGE_SCHEMA,
  processImportPage,
} from 'src/logic-functions/backfill';
import {
  processLeadEmails,
  enqueueLeadEmails,
  findCampaignSender,
} from 'src/logic-functions/lead-emails';
import { getApiKeyFingerprint } from './plusvibe-api';
import { syncInputKey, type SyncJob } from './sync-jobs';
import { LEAD_SCHEMA, normalizeEvent } from './normalize-event';
import { syncCampaign, syncPerson, syncActivity } from './sync-records';
import { syncWorkspace } from './sync-workspace';
import {
  findMailConnection,
  syncNativeEmail,
  updateThreadLabel,
} from './native-email';
import { mapEmail } from './map-email';
import { recordId } from './record-id';
import { AmbiguousPersonMatchError } from 'src/logic-functions/errors/ambiguous-person-match.error';

export type SyncReceipt = {
  object: 'messages' | 'plusvibeLeads' | 'plusvibeCampaigns';
  id: string;
  externalId: string;
  workspaceId: string;
};

export const processSyncTask = async (
  job: SyncJob,
): Promise<SyncReceipt | undefined> => {
  const saved = await kv.get<Record<string, unknown>>(syncInputKey(job.id));
  if (!saved) throw new Error('Saved sync input is missing');
  const input = z
    .object({
      workspaceId: z.string(),
      runId: z.string(),
      source: z.unknown().optional(),
      origin: z.string().optional(),
      leadEmail: z.string().optional(),
    })
    .parse(saved);
  if (input.workspaceId !== job.sourceWorkspaceId || input.runId !== job.runId)
    throw new Error('Sync input scope mismatch');
  if (
    !((await kv.get<string[]>(SELECTION_KEY)) ?? []).includes(input.workspaceId)
  )
    return;
  const registration = await kv.get<PlusvibeRegistration>(
    getRegistrationKey(input.workspaceId),
  );
  if (!registration) throw new Error('Workspace registration is missing');
  if (
    registration.apiKeyFingerprint !==
    (await getApiKeyFingerprint(input.workspaceId))
  )
    throw new Error('Workspace connection changed');
  const sourceWorkspace = z
    .looseObject({ workspace_id: z.string().nullish() })
    .safeParse(input.source);
  if (
    sourceWorkspace.success &&
    sourceWorkspace.data.workspace_id &&
    sourceWorkspace.data.workspace_id !== input.workspaceId
  )
    throw new Error('Foreign workspace source');
  if (job.kind !== 'WEBHOOK') {
    const state = await kv.get<PlusvibeImportState>(
      getImportKey(input.workspaceId),
    );
    if (state?.runId !== input.runId) return;
  }
  if (job.kind === 'IMPORT_PAGE') {
    const page = IMPORT_PAGE_SCHEMA.parse(saved);
    const key = getImportKey(input.workspaceId);
    const state = await kv.get<PlusvibeImportState>(key);
    if (
      state?.phase === 'failed' &&
      state.failedPhase === page.phase &&
      (state.cursor ?? null) === page.cursor &&
      ['RETRYING', 'RUNNING'].includes(job.status)
    ) {
      await kv.set(key, {
        ...state,
        phase: page.phase,
        failedPhase: undefined,
        error: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
    await processImportPage(saved);
    return;
  }
  if (job.kind === 'CAMPAIGN_HISTORY') {
    await processLeadEmails(saved);
    return;
  }
  if (job.kind === 'LEAD' || job.kind === 'CAMPAIGN')
    await syncWorkspace(
      { _id: input.workspaceId, name: registration.workspaceName },
      true,
    );
  if (job.kind === 'LEAD') {
    const lead = LEAD_SCHEMA.parse(input.source);
    const externalId = z
      .string()
      .min(1)
      .parse(lead.lead_id ?? lead._id);
    const email = z.email().parse(lead.email ?? lead.lead_email);
    if (lead.workspace_id && lead.workspace_id !== input.workspaceId)
      throw new Error('Foreign workspace lead');
    try {
      await syncPerson(lead, input.workspaceId, { isFullLeadRecord: true });
    } catch (error) {
      if (!(error instanceof AmbiguousPersonMatchError)) throw error;
    }
    if (await findMailConnection(input.workspaceId))
      await enqueueLeadEmails({
        workspaceId: input.workspaceId,
        runId: input.runId,
        leadEmail: email,
      });
    return {
      object: 'plusvibeLeads',
      workspaceId: input.workspaceId,
      id: recordId('lead', input.workspaceId, externalId),
      externalId,
    };
  }
  if (job.kind === 'CAMPAIGN') {
    const campaign = z
      .object({
        id: z.string().optional(),
        _id: z.string().optional(),
        camp_name: z.string().optional(),
        status: z.string().optional(),
      })
      .parse(input.source);
    const externalId = z
      .string()
      .min(1)
      .parse(campaign.id ?? campaign._id);
    const id = await syncCampaign({
      workspaceId: input.workspaceId,
      workspaceName: registration.workspaceName,
      externalId,
      name: campaign.camp_name,
      status: campaign.status,
    });
    return {
      object: 'plusvibeCampaigns',
      workspaceId: input.workspaceId,
      id,
      externalId,
    };
  }
  if (job.kind === 'EMAIL') {
    const source = z
      .looseObject({
        eaccount: z.string().nullish(),
        email_account_name: z.string().nullish(),
        sender_email: z.string().nullish(),
        campaign_id: z.string().nullish(),
        camp_id: z.string().nullish(),
      })
      .parse(input.source);
    const campaign = source.campaign_id ?? source.camp_id;
    const fallback =
      input.origin === 'campaign' &&
      campaign &&
      input.leadEmail &&
      ![source.eaccount, source.email_account_name, source.sender_email].some(
        (value) => value?.trim(),
      )
        ? await findCampaignSender(input.workspaceId, campaign, input.leadEmail)
        : undefined;
    const email = mapEmail(
      input.source,
      input.workspaceId,
      registration.workspaceName,
      input.leadEmail,
      input.origin === 'campaign',
      fallback,
    );
    const result = await syncNativeEmail(email);
    return {
      object: 'messages',
      workspaceId: input.workspaceId,
      id: result.messageId,
      externalId: email.externalId,
    };
  }
  if (job.kind === 'WEBHOOK') {
    const normalized = normalizeEvent(input.source, input.workspaceId);
    if (!normalized) return;
    if (
      ['EMAIL_SENT', 'UNIBOX_EMAIL_SENT', 'EMAIL_REPLY'].includes(
        normalized.eventType,
      )
    ) {
      const externalId = z.string().min(1).parse(normalized.messageId);
      const message = await syncNativeEmail({
        kind: normalized.eventType === 'EMAIL_SENT' ? 'outreach' : 'unibox',
        externalId,
        workspaceId: input.workspaceId,
        workspaceName: registration.workspaceName,
        sender: normalized.sender,
        senderEvidence: normalized.senderEvidence,
        leadEmail: normalized.email,
        leadId: normalized.lead.lead_id ?? undefined,
        lead: normalized.lead,
        direction: normalized.direction,
        campaignId: normalized.campaignId,
        campaignName: normalized.campaignName,
        threadId: normalized.threadId,
        receivedAt: normalized.occurredAt,
        subject: normalized.subject,
        text: normalized.content,
        label: normalized.label,
      });
      return {
        object: 'messages',
        workspaceId: input.workspaceId,
        id: message.messageId,
        externalId,
      };
    }
    await syncWorkspace(
      { _id: input.workspaceId, name: registration.workspaceName },
      true,
    );
    await syncActivity(normalized, registration.workspaceName);
    if (normalized.threadId && normalized.label)
      await updateThreadLabel(
        normalized.workspaceId,
        normalized.threadId,
        normalized.label,
        normalized.occurredAt,
      );
  }
};
