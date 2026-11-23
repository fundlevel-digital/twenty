import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';

const SOURCE_SCHEMA = z.object({
  last_sent_at: z.string().nullish(),
  ws_last_sent_at: z.string().nullish(),
  sent_step: z.coerce.number().int().nonnegative().nullish(),
  replied_count: z.coerce.number().int().nonnegative().nullish(),
  is_completed: z.union([z.boolean(), z.literal(0), z.literal(1)]).nullish(),
});

export const getLeadOutreachFields = (source: unknown) => {
  const lead = SOURCE_SCHEMA.parse(source);
  const date = (value: string | null | undefined) =>
    isNonEmptyString(value) && Number.isFinite(Date.parse(value))
      ? new Date(value).toISOString()
      : null;
  const lastSentAt = date(lead.last_sent_at);
  const workspaceLastSentAt = date(lead.ws_last_sent_at);
  return {
    lastSentAt,
    workspaceLastSentAt,
    sentStep: lead.sent_step ?? null,
    replyCount: lead.replied_count ?? null,
    isSequenceCompleted:
      lead.is_completed === undefined || lead.is_completed === null
        ? null
        : Boolean(lead.is_completed),
    hasSentEvidence:
      Boolean(lastSentAt || workspaceLastSentAt) || (lead.sent_step ?? 0) > 0,
  };
};
