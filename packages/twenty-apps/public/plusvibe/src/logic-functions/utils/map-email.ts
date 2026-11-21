import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';
import { convert } from 'html-to-text';

import { type NativeEmail } from 'src/logic-functions/utils/native-email';

const TEXT = z.string().nullish();
const EMAIL_SCHEMA = z.looseObject({
  id: TEXT,
  _id: TEXT,
  message_id: TEXT,
  workspace_id: TEXT,
  campaign_id: TEXT,
  camp_id: TEXT,
  lead: TEXT,
  lead_id: TEXT,
  first_name: TEXT,
  last_name: TEXT,
  job_title: TEXT,
  email: TEXT,
  lead_email: TEXT,
  eaccount: TEXT,
  email_account_name: TEXT,
  sender_email: TEXT,
  from_address_email: TEXT,
  from_email: TEXT,
  to_address_email_list: TEXT,
  to_address_json: z.array(z.object({ address: TEXT })).nullish(),
  thread_id: TEXT,
  last_thread_id: TEXT,
  sent_on: TEXT,
  timestamp_created: TEXT,
  date: TEXT,
  modified_at: TEXT,
  subject: TEXT,
  body: z.union([z.string(), z.object({ text: TEXT, html: TEXT })]).nullish(),
  text_body: TEXT,
  content_preview: TEXT,
  label: TEXT,
  type: TEXT,
  direction: TEXT,
});

export const normalizeMessageId = (value: string) =>
  value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').trim();

export const mapEmail = (
  value: unknown,
  workspaceId: string,
  workspaceName: string,
  leadEmail?: string,
  campaignEmail = false,
  fallbackSender?: string,
): NativeEmail => {
  const email = EMAIL_SCHEMA.parse(value);
  if (
    isNonEmptyString(email.workspace_id) &&
    email.workspace_id !== workspaceId
  )
    throw new Error('Foreign PlusVibe email workspace');
  const account = [
    email.eaccount,
    email.email_account_name,
    email.sender_email,
  ].find(isNonEmptyString);
  const sourceLead = [
    leadEmail,
    email.lead,
    email.lead_email,
    email.email,
  ].find(isNonEmptyString);
  const from = [email.from_address_email, email.from_email].find(
    isNonEmptyString,
  );
  const recipient = [
    ...(email.to_address_json?.map(({ address }) => address) ?? []),
    ...(email.to_address_email_list?.split(',').map((value) => value.trim()) ??
      []),
  ].find((value) => z.email().safeParse(value).success);
  const sourceDirection = (email.direction ?? email.type)?.toUpperCase();
  const direction =
    campaignEmail ||
    ['OUT', 'OUTBOUND', 'OUTGOING', 'SENT'].includes(sourceDirection ?? '')
      ? 'OUT'
      : ['IN', 'INBOUND', 'INCOMING', 'RECEIVED'].includes(
            sourceDirection ?? '',
          )
        ? 'IN'
        : isNonEmptyString(from) && isNonEmptyString(account)
          ? from.toLowerCase() === account.toLowerCase()
            ? 'OUT'
            : 'IN'
          : undefined;
  if (!direction) throw new Error('PlusVibe email direction is missing');
  const sender =
    account ?? (direction === 'OUT' ? from : recipient) ?? fallbackSender;
  const lead = sourceLead ?? (direction === 'OUT' ? recipient : from);
  const identifier = [email.message_id, email.id, email._id].find(
    isNonEmptyString,
  );
  const receivedAt = [
    email.sent_on,
    email.timestamp_created,
    email.date,
    email.modified_at,
  ].find(isNonEmptyString);
  if (
    !isNonEmptyString(sender) ||
    !isNonEmptyString(lead) ||
    !isNonEmptyString(identifier) ||
    !isNonEmptyString(receivedAt)
  )
    throw new Error(
      `PlusVibe email is missing: ${[
        !isNonEmptyString(sender) && 'sender',
        !isNonEmptyString(lead) && 'lead',
        !isNonEmptyString(identifier) && 'identifier',
        !isNonEmptyString(receivedAt) && 'receivedAt',
      ]
        .filter(Boolean)
        .join(', ')}`,
    );
  const plainText =
    email.text_body ??
    (typeof email.body === 'object' && email.body
      ? email.body.text
      : undefined);
  const html = typeof email.body === 'string' ? email.body : email.body?.html;
  const body = isNonEmptyString(plainText)
    ? plainText
    : isNonEmptyString(html)
      ? convert(html, { wordwrap: false })
      : (email.content_preview ?? '');
  return {
    externalId: normalizeMessageId(identifier),
    workspaceId,
    workspaceName,
    sender: sender.trim().toLowerCase(),
    leadEmail: lead.trim().toLowerCase(),
    leadId: email.lead_id ?? undefined,
    lead: {
      email: lead,
      lead_id: email.lead_id,
      first_name: email.first_name,
      last_name: email.last_name,
      job_title: email.job_title,
    },
    campaignId: email.campaign_id ?? email.camp_id ?? undefined,
    threadId: email.thread_id ?? email.last_thread_id ?? undefined,
    subject: email.subject ?? '',
    text: body,
    receivedAt,
    direction,
    label: email.label ?? undefined,
  };
};
