import { describe, expect, it, vi } from 'vitest';

import { pickSelectedFields } from 'src/__tests__/pick-selected-fields';
import {
  buildPersonAggregates,
  buildPersonUpdateData,
} from 'src/utils/person-last-contact-aggregation';

const PERSON_ID = '11111111-1111-1111-1111-111111111111';
const SENT_MESSAGE_ID = '22222222-2222-2222-2222-222222222222';
const DRAFT_MESSAGE_ID = '33333333-3333-3333-3333-333333333333';
const SENT_AT = '2026-06-01T09:00:00.000Z';
const DRAFTED_AT = '2026-06-10T09:00:00.000Z';

const buildPage = (nodes: Record<string, unknown>[]) => ({
  edges: nodes.map((node) => ({ node })),
  pageInfo: { hasNextPage: false, endCursor: null },
});

describe('buildPersonAggregates', () => {
  it('ignores draft emails', async () => {
    const client = {
      query: vi.fn((query) => {
        if (query.messageParticipants?.edges.node.personId) {
          return Promise.resolve({
            messageParticipants: buildPage(
              [
                {
                  personId: PERSON_ID,
                  message: {
                    id: SENT_MESSAGE_ID,
                    receivedAt: SENT_AT,
                    isDraft: false,
                  },
                },
                {
                  personId: PERSON_ID,
                  message: {
                    id: DRAFT_MESSAGE_ID,
                    receivedAt: DRAFTED_AT,
                    isDraft: true,
                  },
                },
              ].map((node) =>
                pickSelectedFields({
                  record: node,
                  selection: query.messageParticipants.edges.node,
                }),
              ),
            ),
          });
        }

        if (query.messageParticipants) {
          return Promise.resolve({ messageParticipants: buildPage([]) });
        }

        return Promise.resolve({
          calendarEventParticipants: buildPage([]),
          calendarEvents: buildPage([]),
        });
      }),
    };

    const aggregates = await buildPersonAggregates(client as never, [
      PERSON_ID,
    ]);

    expect(aggregates.get(PERSON_ID)).toMatchObject({
      lastContactAt: SENT_AT,
      lastEmail: { at: SENT_AT, id: SENT_MESSAGE_ID },
      item: { kind: 'email', id: SENT_MESSAGE_ID },
    });
  });

  it('counts messages in a row from emails only, ignoring meetings', async () => {
    const MEMBER_ID = '44444444-4444-4444-4444-444444444444';
    const MEETING_ID = '55555555-5555-5555-5555-555555555555';
    const MEETING_AT = '2026-06-05T09:00:00.000Z';
    const emails = [
      {
        id: 'message-1',
        receivedAt: '2026-06-01T09:00:00.000Z',
        fromMember: false,
      },
      {
        id: 'message-2',
        receivedAt: '2026-06-02T09:00:00.000Z',
        fromMember: true,
      },
      {
        id: 'message-3',
        receivedAt: '2026-06-03T09:00:00.000Z',
        fromMember: true,
      },
    ];
    const client = {
      query: vi.fn((query) => {
        if (query.messageParticipants?.edges.node.personId) {
          return Promise.resolve({
            messageParticipants: buildPage(
              emails.map(({ id, receivedAt }) => ({
                personId: PERSON_ID,
                message: { id, receivedAt, isDraft: false },
              })),
            ),
          });
        }

        if (query.messageParticipants) {
          return Promise.resolve({
            messageParticipants: buildPage(
              emails
                .filter(({ fromMember }) => fromMember)
                .map(({ id }) => ({
                  messageId: id,
                  role: 'FROM',
                  workspaceMemberId: MEMBER_ID,
                })),
            ),
          });
        }

        if (query.calendarEventParticipants?.edges.node.personId) {
          return Promise.resolve({
            calendarEventParticipants: buildPage([
              {
                personId: PERSON_ID,
                calendarEvent: {
                  id: MEETING_ID,
                  startsAt: MEETING_AT,
                  isCanceled: false,
                },
              },
            ]),
          });
        }

        return Promise.resolve({ calendarEventParticipants: buildPage([]) });
      }),
    };

    const aggregates = await buildPersonAggregates(client as never, [
      PERSON_ID,
    ]);

    expect(aggregates.get(PERSON_ID)).toMatchObject({
      lastContactAt: MEETING_AT,
      lastSenderStreak: 2,
    });
  });

  it('leaves messages in a row empty for a person met but never emailed', async () => {
    const client = {
      query: vi.fn((query) => {
        if (query.calendarEventParticipants?.edges.node.personId) {
          return Promise.resolve({
            calendarEventParticipants: buildPage([
              {
                personId: PERSON_ID,
                calendarEvent: {
                  id: 'meeting-1',
                  startsAt: '2026-06-05T09:00:00.000Z',
                  isCanceled: false,
                },
              },
            ]),
          });
        }

        return Promise.resolve({
          messageParticipants: buildPage([]),
          calendarEventParticipants: buildPage([]),
        });
      }),
    };

    const aggregates = await buildPersonAggregates(client as never, [
      PERSON_ID,
    ]);

    expect(aggregates.get(PERSON_ID)?.lastSenderStreak).toBeUndefined();
    expect(
      buildPersonUpdateData(aggregates.get(PERSON_ID)).lastSenderStreak,
    ).toBeNull();
  });
});
