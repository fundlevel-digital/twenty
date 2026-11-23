import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  accountEventStatus,
  accountSnapshot,
  chatRecord,
  memberDetails,
  memberIdFromUrl,
  memberRef,
  messageRecord,
  slugFromUrl,
  syncKey,
} from './mappers.ts';

test('accountSnapshot keeps only the account details the payload carries', () => {
  const full = accountSnapshot({
    id: 'acc_1',
    provider: 'linkedin',
    user_id: 'ACoA1',
    created_at: '2026-01-01T00:00:00.000Z',
    is_locked: false,
    metadata: { allow_country_fallback: true, connection_method: 'cookie' },
    proxy: { protocol: 'http', country: null },
  });
  assert.deepEqual(full?.details, {
    proxyProtocol: 'http',
    proxyProtocolType: 'HTTP',
    proxyCountry: '',
    allowCountryFallback: true,
    connectionMethod: 'cookie',
    connectionMethodType: 'COOKIE',
    isLocked: false,
    unipileCreatedAt: '2026-01-01T00:00:00.000Z',
  });
  assert.deepEqual(accountSnapshot({ id: 'acc_1', provider: 'linkedin', user_id: 'ACoA1' })?.details, {});
});

test('memberDetails skips missing fields so they never blank stored values', () => {
  assert.deepEqual(memberDetails({ description: 'Founder', public_picture_url: 'https://x/p.jpg', type: 'PERSON' }), {
    headline: 'Founder',
    profilePictureUrl: 'https://x/p.jpg',
    memberType: 'PERSON',
    memberCategory: 'PERSON',
  });
  assert.deepEqual(memberDetails({}), {});
});

test('chatRecord maps the chat flags and last message', () => {
  const record = chatRecord(
    {
      id: 'chat_1',
      unread_count: 2,
      is_archived: true,
      muted_until: false,
      folders: ['INBOX'],
      restrictions: [],
      created_at: '2026-01-01T00:00:00.000Z',
      creator_id: 'ACoA2',
      last_message: { text: 'Hello\n  there', timestamp: '2026-02-01T00:00:00.000Z' },
    },
    'SALES_NAVIGATOR',
    'account-id',
    'connection-id',
    'Jane Doe',
  );
  assert.equal(record.name, 'Jane Doe');
  assert.equal(record.channel, 'SALES_NAVIGATOR');
  assert.equal(record.unreadCount, 2);
  assert.equal(record.isArchived, true);
  assert.equal(record.isMuted, false);
  assert.deepEqual(record.folders, ['INBOX']);
  assert.equal(record.lastMessagePreview, 'Hello there');
  assert.equal(record.lastMessageAt, '2026-02-01T00:00:00.000Z');
});

test('slugFromUrl normalises profile URLs and ignores member-ID URLs', () => {
  assert.equal(slugFromUrl('https://www.linkedin.com/in/Jane-Doe/'), 'jane-doe');
  assert.equal(slugFromUrl('linkedin.com/in/jos%C3%A9-ruiz?trk=x'), 'josé-ruiz');
  assert.equal(slugFromUrl('https://www.linkedin.com/in/ACoAAAJF5lYBl2f'), '');
  assert.equal(slugFromUrl('https://example.com/jane'), '');
  assert.equal(slugFromUrl(null), '');
});

test('memberIdFromUrl reads member IDs written into the URL', () => {
  assert.equal(memberIdFromUrl('https://www.linkedin.com/in/ACoAAAJF5lYBl2f_x-1'), 'ACoAAAJF5lYBl2f_x-1');
  assert.equal(memberIdFromUrl('https://www.linkedin.com/in/jane-doe'), '');
});

test('memberRef separates classic and Sales Navigator IDs', () => {
  const classic = memberRef({ id: 'ACoAA1', public_identifier: 'jane', first_name: 'Jane', last_name: 'Doe' });
  assert.deepEqual(classic, {
    memberId: 'ACoAA1',
    salesNavigatorUserId: '',
    publicIdentifier: 'jane',
    name: 'Jane Doe',
    profileUrl: 'https://www.linkedin.com/in/jane',
  });
  const sales = memberRef({ id: 'ACwAA9', profile_url: 'https://www.linkedin.com/in/jane', display_name: 'Jane' });
  assert.equal(sales.memberId, '');
  assert.equal(sales.salesNavigatorUserId, 'ACwAA9');
  assert.equal(sales.publicIdentifier, 'jane');
  const idOnly = memberRef({ id: 'ACoAA2' });
  assert.equal(idOnly.profileUrl, 'https://www.linkedin.com/in/ACoAA2');
});

test('syncKey prefers the permanent member ID', () => {
  assert.equal(syncKey('ME', memberRef({ id: 'ACoAA1', public_identifier: 'jane' })), 'ME:ACoAA1');
  assert.equal(syncKey('ME', memberRef({ id: 'ACwAA9', public_identifier: 'jane' })), 'ME:ACwAA9');
  assert.equal(syncKey('ME', memberRef({ public_identifier: 'Jane' })), 'ME:slug:jane');
  assert.equal(syncKey('ME', memberRef({})), '');
});

test('accountSnapshot keeps only running products and stringifies the proxy port', () => {
  const snapshot = accountSnapshot({
    id: 'acc_1',
    provider: 'linkedin',
    user_id: 'ACoAme',
    name: 'Me',
    status: 'running',
    proxy: { host: 'proxy.example.com', port: 8443, username: 'proxy', auto_proxy: false },
    metadata: { products_connection_status: { classic: 'running', sales_navigator: 'disconnected', company: 'running' } },
  });
  assert.deepEqual(snapshot?.products, ['CLASSIC', 'COMPANY_PAGES']);
  assert.equal(snapshot?.proxyPort, '8443');
  assert.equal(accountSnapshot({ provider: 'whatsapp', user_id: 'x' }), null);
});

test('accountEventStatus marks a single product outage as Degraded', () => {
  assert.equal(accountEventStatus('account.status.disconnected', { product: 'sales_navigator' }), 'DEGRADED');
  assert.equal(accountEventStatus('account.status.disconnected', {}), 'DISCONNECTED');
  assert.equal(accountEventStatus('account.status.disconnected', { account: { status: 'running' } }), 'RUNNING');
  assert.equal(accountEventStatus('account.remove', {}), 'REMOVED');
  assert.equal(accountEventStatus('account.add', {}), 'RUNNING');
  assert.equal(accountEventStatus('message.new', {}), null);
});

test('messageRecord maps direction, channel and attachments', () => {
  const record = messageRecord(
    {
      id: 'm1',
      text: 'Hello\nthere',
      is_sender: true,
      timestamp: '2026-01-01T00:00:00.000Z',
      is_mentionned: true,
      specifics: { type: 'INMAIL' },
      sender: { id: 'ACoAme', first_name: 'Me' },
      attachments: [{ id: 'a1', type: 'shared_content', media_type: 'post', url: 'https://x', author: 'A' }],
    },
    'chat1',
    { newest: null, oldest: null, complete: false, channel: 'CLASSIC' },
    'conn1',
  );
  assert.equal(record.direction, 'OUTBOUND');
  assert.equal(record.channel, 'INMAIL');
  assert.equal(record.name, 'Sent: Hello there');
  assert.equal(record.isMentioned, true);
  assert.equal(record.hasAttachments, true);
  assert.equal((record.attachmentDetails[0] as any).url, 'https://x');
});
