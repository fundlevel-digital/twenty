import { describe, expect, it } from 'vitest';

import { mapEmail } from 'src/logic-functions/utils/map-email';
import {
  CURSOR_PAGE_SCHEMA,
  PAGE_SCHEMA,
} from 'src/logic-functions/utils/page-schema';

const CAMPAIGN_EMAIL = {
  id: 'provider-message',
  message_id: '&lt;rfc-message@example.com&gt;',
  workspace_id: 'workspace-1',
  campaign_id: 'campaign-1',
  eaccount: 'sender@example.com',
  lead: 'lead@example.com',
  sent_on: '2026-11-20T10:00:00Z',
  subject: 'Hello',
  body: '<p>Hello <b>there</b></p>',
};

describe('PlusVibe email API formats', () => {
  it('keeps distinct provider emails separate when their RFC message ID is reused', () => {
    const first = mapEmail(
      { ...CAMPAIGN_EMAIL, id: 'first-message' },
      'workspace-1',
      'Sales',
      undefined,
      true,
    );
    const second = mapEmail(
      {
        ...CAMPAIGN_EMAIL,
        id: 'second-message',
        sent_on: '2026-11-21T10:00:00Z',
      },
      'workspace-1',
      'Sales',
      undefined,
      true,
    );
    expect(first.externalId).toBe('first-message');
    expect(second.externalId).toBe('second-message');
  });
  it('preserves an alternate reply address instead of replacing it with the original lead email', () => {
    expect(
      mapEmail(
        {
          ...CAMPAIGN_EMAIL,
          direction: 'IN',
          from_address_email: 'alternate@example.net',
        },
        'workspace-1',
        'Sales',
      ),
    ).toMatchObject({
      leadEmail: 'alternate@example.net',
      leadId: undefined,
      sender: 'sender@example.com',
    });
  });
  it('does not trust an inbound account field that identifies the external From address', () => {
    expect(
      mapEmail(
        {
          ...CAMPAIGN_EMAIL,
          direction: 'IN',
          eaccount: 'alternate@example.net',
          from_address_email: 'alternate@example.net',
          to_address_json: [{ address: 'ours@example.org' }],
        },
        'workspace-1',
        'Sales',
      ),
    ).toMatchObject({
      sender: 'ours@example.org',
      senderEvidence: 'RECIPIENT_HEADER',
    });
  });
  it('uses the receiving inbox rather than an incoming message sender as the owned account', () => {
    expect(
      mapEmail(
        {
          ...CAMPAIGN_EMAIL,
          direction: 'IN',
          eaccount: '',
          sender_email: 'lead@example.com',
          from_address_email: 'lead@example.com',
          to_address_json: [{ address: 'historical-inbox@example.com' }],
        },
        'workspace-1',
        'Sales',
      ),
    ).toMatchObject({
      sender: 'historical-inbox@example.com',
      leadEmail: 'lead@example.com',
      direction: 'IN',
    });
  });

  it('still accepts a generic sender header on explicitly outgoing email', () => {
    expect(
      mapEmail(
        {
          ...CAMPAIGN_EMAIL,
          direction: 'OUT',
          eaccount: '',
          sender_email: 'sender@example.com',
        },
        'workspace-1',
        'Sales',
      ).sender,
    ).toBe('sender@example.com');
  });
  it('recovers incoming participants from headers when source account and lead are blank', () => {
    expect(
      mapEmail(
        {
          ...CAMPAIGN_EMAIL,
          direction: 'IN',
          eaccount: '',
          lead: '',
          from_address_email: 'lead@example.com',
          to_address_json: [{ address: 'sender@example.com' }],
        },
        'workspace-1',
        'Sales',
      ),
    ).toMatchObject({
      direction: 'IN',
      sender: 'sender@example.com',
      leadEmail: 'lead@example.com',
    });
  });

  it('recovers outgoing participants and falls back to the provider record identity', () => {
    expect(
      mapEmail(
        {
          ...CAMPAIGN_EMAIL,
          direction: 'OUT',
          eaccount: '',
          lead: '',
          message_id: '',
          from_address_email: 'sender@example.com',
          to_address_email_list: 'lead@example.com',
        },
        'workspace-1',
        'Sales',
      ),
    ).toMatchObject({
      direction: 'OUT',
      sender: 'sender@example.com',
      leadEmail: 'lead@example.com',
      externalId: 'provider-message',
    });
  });

  it('accepts legacy campaign arrays without dropping records', () => {
    expect(PAGE_SCHEMA.parse([{ id: 'campaign-1' }])).toMatchObject({
      data: [{ id: 'campaign-1' }],
      has_more: false,
    });
  });

  it('follows legacy array pages until empty without assuming the first page is complete', () => {
    expect(
      CURSOR_PAGE_SCHEMA.parse([{ _id: 'lead-1' }, { _id: 'lead-2' }]),
    ).toMatchObject({ has_more: true, next_starting_after: 'lead-2' });
    expect(CURSOR_PAGE_SCHEMA.parse([{ id: 'campaign-1' }])).toMatchObject({
      has_more: true,
      next_starting_after: 'campaign-1',
    });
    expect(CURSOR_PAGE_SCHEMA.parse([])).toMatchObject({ has_more: false });
    expect(
      CURSOR_PAGE_SCHEMA.parse({
        data: [{ id: 'campaign-1' }],
        has_more: false,
      }),
    ).toMatchObject({ has_more: false });
    expect(() =>
      CURSOR_PAGE_SCHEMA.parse([{ email: 'lead@example.com' }]),
    ).toThrow();
  });

  it('maps campaign sent emails to stable native identities and plain text', () => {
    expect(
      mapEmail(CAMPAIGN_EMAIL, 'workspace-1', 'Sales', undefined, true),
    ).toMatchObject({
      externalId: 'provider-message',
      direction: 'OUT',
      sender: 'sender@example.com',
      leadEmail: 'lead@example.com',
      text: 'Hello there',
    });
  });

  it('imports full Unibox reply bodies and the original thread identity', () => {
    expect(
      mapEmail(
        {
          ...CAMPAIGN_EMAIL,
          type: 'received',
          timestamp_created: CAMPAIGN_EMAIL.sent_on,
          thread_id: 'thread-1',
          label: 'INTERESTED',
          body: { text: 'Tell me more', html: '<p>Tell me more</p>' },
        },
        'workspace-1',
        'Sales',
      ),
    ).toMatchObject({
      threadId: 'thread-1',
      direction: 'IN',
      label: 'INTERESTED',
      text: 'Tell me more',
    });
  });

  it('does not mistake Unibox sends for incoming mail when From is omitted', () => {
    expect(
      mapEmail({ ...CAMPAIGN_EMAIL, type: 'sent' }, 'workspace-1', 'Sales')
        .direction,
    ).toBe('OUT');
  });

  it('rejects cross-workspace messages and incomplete identities', () => {
    expect(() => mapEmail(CAMPAIGN_EMAIL, 'foreign', 'Sales')).toThrow(
      'Foreign',
    );
    expect(() => mapEmail({ id: 'message-1' }, 'workspace-1', 'Sales')).toThrow(
      'missing',
    );
  });
});
