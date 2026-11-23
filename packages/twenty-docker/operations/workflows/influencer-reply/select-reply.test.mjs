import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectReply } from './select-reply.ts';

const MAILBOX = {
  id: 'channel',
  connectedAccountId: 'account',
  handle: 'owner@example.test',
};
const email = (overrides = {}) => ({
  id: 'incoming',
  headerMessageId: '<incoming@example.test>',
  messageThreadId: 'thread',
  receivedAt: '2026-11-20T12:00:00Z',
  subject: 'Collaboration',
  text: 'Can you share the brief?',
  isDraft: false,
  associations: [{ messageChannelId: 'channel', direction: 'INCOMING' }],
  participants: [
    { personId: 'contact', role: 'FROM', handle: 'creator@example.test' },
  ],
  ...overrides,
});

test('uses the latest active thread and its latest incoming contact email', () => {
  const result = selectReply(
    [
      email({
        id: 'old',
        messageThreadId: 'old-thread',
        receivedAt: '2026-11-19T12:00:00Z',
      }),
      email(),
      email({
        id: 'outgoing',
        receivedAt: '2026-11-21T12:00:00Z',
        associations: [{ messageChannelId: 'channel', direction: 'OUTGOING' }],
        participants: [
          { personId: 'contact', role: 'TO', handle: 'creator@example.test' },
        ],
      }),
    ],
    ['contact'],
    [MAILBOX],
  );
  assert.equal(result.messageThreadId, 'thread');
  assert.equal(result.parentMessageId, 'incoming');
  assert.equal(result.inReplyTo, '<incoming@example.test>');
  assert.equal(result.connectedAccountId, 'account');
  assert.equal(result.subject, 'Re: Collaboration');
  assert.equal(result.conversation.at(-1).direction, 'OUTGOING');
});

test('ignores drafts and unavailable mailboxes when ranking activity', () => {
  const result = selectReply(
    [
      email(),
      email({
        id: 'draft',
        isDraft: true,
        messageThreadId: 'draft-thread',
        receivedAt: '2026-11-23T12:00:00Z',
      }),
      email({
        id: 'private',
        messageThreadId: 'private-thread',
        receivedAt: '2026-11-23T12:00:00Z',
        associations: [
          { messageChannelId: 'other-channel', direction: 'INCOMING' },
        ],
      }),
    ],
    ['contact'],
    [MAILBOX],
  );
  assert.equal(result.parentMessageId, 'incoming');
});

test('considers multiple linked contacts', () => {
  const result = selectReply(
    [
      email(),
      email({
        id: 'manager-email',
        messageThreadId: 'manager-thread',
        receivedAt: '2026-11-22T12:00:00Z',
        participants: [
          { personId: 'manager', role: 'FROM', handle: 'manager@example.test' },
        ],
      }),
    ],
    ['contact', 'manager'],
    [MAILBOX],
  );
  assert.equal(result.parentMessageId, 'manager-email');
  assert.equal(result.recipients.to, 'manager@example.test');
});

test('does not fall back to an older conversation when the latest has no incoming email', () => {
  assert.throws(
    () =>
      selectReply(
        [
          email(),
          email({
            id: 'new-outreach',
            messageThreadId: 'new-thread',
            receivedAt: '2026-11-22T12:00:00Z',
            associations: [
              { messageChannelId: 'channel', direction: 'OUTGOING' },
            ],
            participants: [
              {
                personId: 'contact',
                role: 'TO',
                handle: 'creator@example.test',
              },
            ],
          }),
        ],
        ['contact'],
        [MAILBOX],
      ),
    /no incoming contact email/,
  );
});

test('requires a real email Header Message ID', () => {
  assert.throws(
    () =>
      selectReply([email({ headerMessageId: null })], ['contact'], [MAILBOX]),
    /Header Message ID/,
  );
});

test('stops when the original sending mailbox is ambiguous', () => {
  assert.throws(
    () =>
      selectReply(
        [
          email({
            associations: [
              { messageChannelId: 'channel', direction: 'INCOMING' },
              { messageChannelId: 'second-channel', direction: 'INCOMING' },
            ],
          }),
        ],
        ['contact'],
        [
          MAILBOX,
          {
            ...MAILBOX,
            id: 'second-channel',
            connectedAccountId: 'second-account',
          },
        ],
      ),
    /Several mailboxes/,
  );
});

test('reports no email history without producing a draft target', () => {
  assert.throws(
    () => selectReply([], ['contact'], [MAILBOX]),
    /No synced email conversation/,
  );
});

test('uses the owning mailbox rather than another Fundlevel address in CC', () => {
  const second = {
    id: 'second-channel',
    connectedAccountId: 'second-account',
    handle: 'second@example.test',
  };
  const result = selectReply(
    [
      email({
        associations: [
          { messageChannelId: 'second-channel', direction: 'INCOMING' },
        ],
        participants: [
          { personId: 'contact', role: 'FROM', handle: 'creator@example.test' },
          { personId: 'owner', role: 'CC', handle: MAILBOX.handle },
          { personId: 'second-owner', role: 'TO', handle: second.handle },
        ],
      }),
    ],
    ['contact'],
    [MAILBOX, second],
  );
  assert.equal(result.connectedAccountId, 'second-account');
  assert.equal(result.fromHandle, second.handle);
});

test('uses the actual incoming address when one contact has multiple addresses', () => {
  const result = selectReply(
    [
      email({
        participants: [
          { personId: 'contact', role: 'FROM', handle: 'old@example.test' },
        ],
      }),
      email({
        id: 'new-address',
        receivedAt: '2026-11-22T12:00:00Z',
        participants: [
          { personId: 'contact', role: 'FROM', handle: 'new@example.test' },
        ],
      }),
    ],
    ['contact'],
    [MAILBOX],
  );
  assert.equal(result.recipients.to, 'new@example.test');
});

test('does not resolve tied latest conversations by arbitrary record id', () => {
  assert.throws(
    () =>
      selectReply(
        [
          email(),
          email({ id: 'second-thread', messageThreadId: 'another-thread' }),
        ],
        ['contact'],
        [MAILBOX],
      ),
    /same latest activity time/,
  );
});

test('includes the incoming reply target when many newer outgoing messages exist', () => {
  const outgoing = Array.from({ length: 15 }, (_, index) =>
    email({
      id: `outgoing-${index}`,
      receivedAt: `2026-11-21T12:${String(index).padStart(2, '0')}:00Z`,
      associations: [{ messageChannelId: 'channel', direction: 'OUTGOING' }],
      participants: [
        { personId: 'contact', role: 'TO', handle: 'creator@example.test' },
      ],
    }),
  );
  const result = selectReply([email(), ...outgoing], ['contact'], [MAILBOX]);
  assert.equal(result.conversation.length, 12);
  assert.equal(result.conversation[0].isReplyTarget, true);
  assert.equal(result.conversation.at(-1).receivedAt, '2026-11-21T12:14:00Z');
});
