import { isNonEmptyString } from '@sniptt/guards';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';
import { kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';

import { isInternalPerson } from 'src/logic-functions/utils/internal-people';
import { normalizeLeadLabel } from 'src/logic-functions/utils/lead-label';
import { getWorkspacePreferences } from 'src/logic-functions/utils/preferences';
import { getLeadPersonKey } from 'src/constants/plusvibe';
import { AmbiguousPersonMatchError } from 'src/logic-functions/errors/ambiguous-person-match.error';
import {
  type PlusvibeLead,
  type normalizeEvent,
} from 'src/logic-functions/utils/normalize-event';

import { recordId } from 'src/logic-functions/utils/record-id';
export { recordId } from 'src/logic-functions/utils/record-id';

const restClient = () => new RestApiClient({ runAs: 'application' });

const CAMPAIGN_STATUS_SCHEMA = z
  .enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'OTHER'])
  .catch('OTHER');

export const findRecord = async (
  plural: string,
  id: string,
): Promise<boolean> => {
  try {
    await restClient().get(`/rest/${plural}/${id}`);
    return true;
  } catch (error) {
    if (error instanceof RestApiClientError && error.status === 404)
      return false;
    throw error;
  }
};

export const createRecordIfMissing = async (
  plural: string,
  id: string,
  fields: Record<string, unknown>,
) => {
  if (await findRecord(plural, id)) return;
  try {
    await restClient().post(`/rest/${plural}`, { id, ...fields });
  } catch (error) {
    // A concurrent delivery or a lost response may have already committed the same ID.
    if (!(await findRecord(plural, id))) throw error;
  }
};

export const syncPerson = async (
  lead: PlusvibeLead,
  workspaceId: string,
  options: {
    isFullLeadRecord?: boolean;
    direction?: 'IN' | 'OUT';
    senderEmail?: string;
  } = {},
): Promise<string | undefined> => {
  const email = (lead.email ?? lead.lead_email)?.trim().toLowerCase();
  if (!isNonEmptyString(email))
    throw new Error('PlusVibe lead email is required');
  const leadId = lead.lead_id ?? lead._id;
  const mappingKey = isNonEmptyString(leadId)
    ? getLeadPersonKey(workspaceId, leadId)
    : undefined;
  const linkPerson = async (personId: string) => {
    await syncLead(lead, workspaceId, personId, options.isFullLeadRecord);
    if (mappingKey) await kv.set(mappingKey, personId);
    return personId;
  };
  if (isNonEmptyString(leadId)) {
    try {
      const existing = await restClient().get<{
        data?: { plusvibeLead?: { personId?: string | null } };
      }>(`/rest/plusvibeLeads/${recordId('lead', workspaceId, leadId)}`);
      const selectedPersonId = existing.data?.plusvibeLead?.personId;
      if (
        isNonEmptyString(selectedPersonId) &&
        (await findRecord('people', selectedPersonId))
      )
        return linkPerson(selectedPersonId);
    } catch (error) {
      if (!(error instanceof RestApiClientError && error.status === 404))
        throw error;
    }
  }
  if (mappingKey) {
    const mappedId = await kv.get<string>(mappingKey);
    if (isNonEmptyString(mappedId) && (await findRecord('people', mappedId)))
      return linkPerson(mappedId);
  }
  const client = new CoreApiClient({ runAs: 'application' });
  const matches = new Set<string>();
  let cursor: string | undefined;
  do {
    const result: unknown = await client.query({
      people: {
        __args: {
          filter: {
            or: [
              { emails: { primaryEmail: { ilike: email } } },
              { emails: { additionalEmails: { ilike: `%${email}%` } } },
            ],
          },
          first: 200,
          ...(cursor ? { after: cursor } : {}),
        },
        edges: {
          node: {
            id: true,
            emails: { primaryEmail: true, additionalEmails: true },
          },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    const { people } = z
      .object({
        people: z.object({
          edges: z.array(
            z.object({
              node: z.object({
                id: z.uuid(),
                emails: z.object({
                  primaryEmail: z.string().nullish(),
                  additionalEmails: z.array(z.string()).nullish(),
                }),
              }),
            }),
          ),
          pageInfo: z
            .object({
              hasNextPage: z.boolean(),
              endCursor: z.string().nullish(),
            })
            .optional(),
        }),
      })
      .parse(result);
    // Additional emails expose LIKE filters only; verify every returned address exactly.
    for (const { node } of people.edges) {
      const addresses = [
        node.emails.primaryEmail,
        ...(node.emails.additionalEmails ?? []),
      ];
      if (addresses.some((address) => address?.trim().toLowerCase() === email))
        matches.add(node.id);
    }
    if (!people.pageInfo?.hasNextPage) break;
    const nextCursor = people.pageInfo.endCursor;
    if (!nextCursor || nextCursor === cursor)
      throw new Error('Person lookup pagination did not advance');
    cursor = nextCursor;
  } while (cursor);
  if (matches.size > 1) {
    await syncLead(lead, workspaceId, undefined, options.isFullLeadRecord);
    throw new AmbiguousPersonMatchError();
  }
  if (matches.size === 1) return linkPerson([...matches][0]);
  const preferences = await getWorkspacePreferences(workspaceId);
  const canCreate =
    preferences.contactAutoCreationPolicy === 'SENT_AND_RECEIVED'
      ? options.direction !== undefined
      : preferences.contactAutoCreationPolicy === 'SENT' &&
        options.direction === 'OUT';
  if (
    !canCreate ||
    (await isInternalPerson(
      email,
      workspaceId,
      preferences,
      options.senderEmail,
    ))
  ) {
    await syncLead(
      lead,
      workspaceId,
      undefined,
      options.isFullLeadRecord,
      'UNMATCHED',
    );
    return undefined;
  }
  const personId = recordId('person', email);
  await createRecordIfMissing('people', personId, {
    name: { firstName: lead.first_name ?? '', lastName: lead.last_name ?? '' },
    emails: { primaryEmail: email, additionalEmails: [] },
    jobTitle: lead.job_title ?? '',
  });
  return linkPerson(personId);
};

export const syncLead = async (
  lead: PlusvibeLead,
  workspaceId: string,
  personId?: string,
  isFullLeadRecord = false,
  matchStatus: 'MATCHED' | 'NEEDS_REVIEW' | 'UNMATCHED' = personId
    ? 'MATCHED'
    : 'NEEDS_REVIEW',
) => {
  const externalId = lead.lead_id ?? lead._id;
  if (!isNonEmptyString(externalId)) return;
  const email = (lead.email ?? lead.lead_email)?.trim().toLowerCase();
  if (!isNonEmptyString(email)) return;
  const id = recordId('lead', workspaceId, externalId);
  const sourceStatus = lead.status?.trim().toUpperCase();
  const sourceFields = {
    externalId,
    name:
      [lead.first_name, lead.last_name].filter(isNonEmptyString).join(' ') ||
      email,
    emails: { primaryEmail: email, additionalEmails: [] },
    ...(sourceStatus
      ? {
          status: z
            .enum([
              'NOT_CONTACTED',
              'CONTACTED',
              'REPLIED',
              'COMPLETED',
              'BOUNCED',
              'UNSUBSCRIBED',
              'SKIPPED',
              'PAUSED',
              'OTHER',
            ])
            .catch('OTHER')
            .parse(sourceStatus),
          statusRaw: lead.status,
        }
      : {}),
    ...(lead.label !== undefined && lead.label !== null
      ? { leadLabel: normalizeLeadLabel(lead.label) }
      : {}),
  };
  const links: Record<string, unknown> = {
    ...(personId ? { personId } : {}),
    matchStatus,
    lastSyncedAt: new Date().toISOString(),
  };
  const workspaceRecordId = recordId('workspace', workspaceId);
  if (await findRecord('plusvibeWorkspaces', workspaceRecordId))
    links.workspaceRecordId = workspaceRecordId;
  const campaignId = lead.campaign_id ?? lead.camp_id;
  if (isNonEmptyString(campaignId)) {
    const campaignRecordId = recordId('campaign', workspaceId, campaignId);
    if (await findRecord('plusvibeCampaigns', campaignRecordId))
      links.campaignRecordId = campaignRecordId;
  }
  await createRecordIfMissing('plusvibeLeads', id, {
    ...sourceFields,
    ...links,
  });
  await restClient().patch(`/rest/plusvibeLeads/${id}`, {
    ...(isFullLeadRecord
      ? sourceFields
      : {
          ...(sourceStatus
            ? { status: sourceFields.status, statusRaw: lead.status }
            : {}),
          ...(lead.label !== undefined && lead.label !== null
            ? { leadLabel: normalizeLeadLabel(lead.label) }
            : {}),
        }),
    ...links,
  });
  return id;
};

export const syncCampaign = async ({
  workspaceId,
  externalId,
  name,
  status,
}: {
  workspaceId: string;
  workspaceName: string;
  externalId: string;
  name?: string;
  status?: string;
}) => {
  const id = recordId('campaign', workspaceId, externalId);
  const link = new URL('https://app.plusvibe.ai/v2/campaigns/');
  link.searchParams.set('workspace_id', workspaceId);
  const fields = {
    externalId,
    workspaceRecordId: recordId('workspace', workspaceId),
    campaignLink: {
      primaryLinkLabel: 'PlusVibe',
      primaryLinkUrl: link.toString(),
      secondaryLinks: [],
    },
    ...(isNonEmptyString(name) ? { name } : {}),
    ...(isNonEmptyString(status)
      ? {
          status,
          campaignStatus: CAMPAIGN_STATUS_SCHEMA.parse(
            status.trim().toUpperCase(),
          ),
        }
      : {}),
  };
  await createRecordIfMissing('plusvibeCampaigns', id, {
    name: name ?? externalId,
    ...fields,
  });
  await restClient().patch(`/rest/plusvibeCampaigns/${id}`, fields);
  return id;
};

export const syncActivity = async (
  event: NonNullable<ReturnType<typeof normalizeEvent>>,
  workspaceName: string,
) => {
  const id = recordId('activity', event.externalId);
  if (await findRecord('plusvibeActivities', id)) return;
  const personId = await syncPerson(event.lead, event.workspaceId);
  const campaignId = event.campaignId
    ? await syncCampaign({
        workspaceId: event.workspaceId,
        workspaceName,
        externalId: event.campaignId,
        name: event.campaignName,
      })
    : undefined;
  await createRecordIfMissing('plusvibeActivities', id, {
    name: event.subject || event.eventType,
    externalId: event.externalId,
    workspaceRecordId: recordId('workspace', event.workspaceId),

    eventType: event.eventType,
    email: event.email,
    subject: event.subject,
    content: event.content,
    occurredAt: event.occurredAt,
    leadLabel: normalizeLeadLabel(event.label),
    personId,
    ...(campaignId ? { campaignId } : {}),
    threadLink: {
      primaryLinkLabel: 'PlusVibe',
      primaryLinkUrl: event.threadLink,
      secondaryLinks: [],
    },
  });
};
