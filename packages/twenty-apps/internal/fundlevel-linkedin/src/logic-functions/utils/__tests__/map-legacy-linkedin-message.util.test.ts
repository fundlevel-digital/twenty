import { describe, expect, it } from 'vitest';
import { type LegacyLinkedinMessage } from 'src/logic-functions/types/legacy-linkedin-message.type';
import { mapLegacyLinkedinMessage } from 'src/logic-functions/utils/map-legacy-linkedin-message.util';

const message: LegacyLinkedinMessage = {
  id: 'legacy',
  unipileMessageId: 'external',
  unipileChatId: 'thread',
  text: 'Hello',
  direction: 'INBOUND',
  sentAt: '2026-11-21T00:00:00Z',
  isDeleted: false,
  senderMemberId: 'ACoAother',
  senderName: 'Other',
  senderProfileLink: null,
  hasAttachments: false,
  attachmentDetails: [],
  connection: {
    name: 'Other',
    memberId: 'ACoAother',
    personId: 'person',
    profileLink: { primaryLinkUrl: 'https://www.linkedin.com/in/other' },
  },
};
describe('legacy message migration', () => {
  it('keeps the original message and thread IDs so retrying can deduplicate', () => {
    expect(mapLegacyLinkedinMessage(message, 'me')).toMatchObject({
      externalId: 'external',
      threadExternalId: 'thread',
      text: 'Hello',
      participants: [
        { role: 'FROM', personId: 'person' },
        { role: 'TO', handle: 'me' },
      ],
    });
  });
  it('attributes outbound messages to the connected member', () => {
    expect(
      mapLegacyLinkedinMessage({ ...message, direction: 'OUTBOUND' }, 'me')
        .participants,
    ).toEqual(expect.arrayContaining([{ role: 'FROM', handle: 'me' }]));
  });
  it('does not expose the stored body of a deleted message', () => {
    expect(
      mapLegacyLinkedinMessage({ ...message, isDeleted: true }, 'me').text,
    ).toBe('[Deleted LinkedIn message]');
  });
  it('stops on invalid timestamps instead of silently skipping a message', () => {
    expect(() =>
      mapLegacyLinkedinMessage({ ...message, sentAt: null }, 'me'),
    ).toThrow('timestamp');
  });
});

it('does not address an orphaned outbound message back to its sender', () => {
  const migrated = mapLegacyLinkedinMessage(
    {
      ...message,
      direction: 'OUTBOUND',
      connection: null,
      senderProfileLink: { primaryLinkUrl: 'https://www.linkedin.com/in/me' },
    },
    'me',
  );
  expect(
    migrated.participants.find((participant) => participant.role === 'TO')
      ?.handle,
  ).not.toBe('https://www.linkedin.com/in/me');
});

it('does not guess the direction of a malformed source record', () => {
  expect(() =>
    mapLegacyLinkedinMessage({ ...message, direction: '' }, 'me'),
  ).toThrow('valid direction');
});
