import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, mutationMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  mutationMock: vi.fn(),
}));
vi.mock('twenty-client-sdk/core', () => ({
  CoreApiClient: vi.fn(function () {
    return { query: queryMock, mutation: mutationMock };
  }),
}));

import { pickSelectedFields } from 'src/__tests__/pick-selected-fields';

import onEmailInteraction from '../on-email-interaction';

const PERSON_ID = '11111111-1111-1111-1111-111111111111';
const MESSAGE_ID = '22222222-2222-2222-2222-222222222222';
const OLDER_MESSAGE_ID = '44444444-4444-4444-4444-444444444444';
const MEMBER_ID = '33333333-3333-3333-3333-333333333333';
const RECEIVED_AT = '2026-06-10T09:00:00.000Z';
const OLDER_RECEIVED_AT = '2026-06-01T09:00:00.000Z';
const OLDEST_MESSAGE_ID = '55555555-5555-5555-5555-555555555555';
const OLDEST_RECEIVED_AT = '2026-05-20T09:00:00.000Z';

const handler = onEmailInteraction.config.handler as (
  batch: unknown,
) => Promise<void>;

const buildPage = (nodes: Record<string, unknown>[]) => ({
  edges: nodes.map((node) => ({ node })),
  pageInfo: { hasNextPage: false, endCursor: null },
});

const buildBatch = (
  participants: { personId: string | null; messageId: string | null }[],
) => ({
  name: 'messageParticipant.updated',
  events: participants.map(({ personId, messageId }, index) => ({
    recordId: `participant-${index}`,
    properties: {
      updatedFields: ['personId'],
      after: { id: `participant-${index}`, personId, messageId },
    },
  })),
});

const isPersonRecentMessagesQuery = (query: {
  messageParticipants?: { __args: { filter: { personId?: unknown } } };
}) => Boolean(query.messageParticipants?.__args.filter.personId);

const setupQueryMock = (
  messageParticipants: Record<string, unknown>[],
  messages: Record<string, unknown>[] = [],
  {
    recentParticipants = [],
    currentPerson = {},
  }: {
    recentParticipants?: Record<string, unknown>[];
    currentPerson?: Record<string, unknown>;
  } = {},
) => {
  queryMock.mockImplementation((query) => {
    if (isPersonRecentMessagesQuery(query)) {
      const personId = query.messageParticipants.__args.filter.personId.eq;

      return Promise.resolve({
        messageParticipants: buildPage(
          recentParticipants
            .filter((node) => node.personId === personId)
            .map((node) =>
              pickSelectedFields({
                record: node,
                selection: query.messageParticipants.edges.node,
              }),
            ),
        ),
      });
    }

    if (query.messageParticipants) {
      const requestedMessageIds: string[] =
        query.messageParticipants.__args.filter.and[0].messageId.in;

      return Promise.resolve({
        messageParticipants: buildPage(
          messageParticipants
            .filter((node) =>
              requestedMessageIds.includes(node.messageId as string),
            )
            .map((node) =>
              pickSelectedFields({
                record: node,
                selection: query.messageParticipants.edges.node,
              }),
            ),
        ),
      });
    }

    if (query.messages) {
      return Promise.resolve({
        messages: buildPage(
          messages.map((node) =>
            pickSelectedFields({
              record: node,
              selection: query.messages.edges.node,
            }),
          ),
        ),
      });
    }

    if (query.people) {
      const requestedIds: string[] = query.people.__args.filter.id.in;
      return Promise.resolve({
        people: buildPage(
          query.people.edges.node.companyId
            ? requestedIds.map((id) => ({ id, companyId: null }))
            : requestedIds.map((id) => ({ id, ...currentPerson })),
        ),
      });
    }

    if (query.companies) {
      return Promise.resolve({ companies: buildPage([]) });
    }

    return Promise.resolve({ opportunities: buildPage([]) });
  });
};

beforeEach(() => {
  queryMock.mockReset();
  mutationMock.mockReset();
  mutationMock.mockResolvedValue({});
});

describe('on-email-interaction definition', () => {
  it('should be valid and batch personId updates', () => {
    expect(onEmailInteraction.success).toBe(true);
    expect(onEmailInteraction.config.databaseEventTriggerSettings).toEqual({
      eventName: 'messageParticipant.updated',
      updatedFields: ['personId'],
      batchMode: true,
    });
  });
});

describe('on-email-interaction handler', () => {
  it('sets interaction, owner, item, contacted and lastEmail for an outbound email', async () => {
    setupQueryMock([
      {
        messageId: MESSAGE_ID,
        role: 'TO',
        workspaceMemberId: null,
        message: { receivedAt: RECEIVED_AT },
      },
      {
        messageId: MESSAGE_ID,
        role: 'FROM',
        workspaceMemberId: MEMBER_ID,
        message: { receivedAt: RECEIVED_AT },
      },
    ]);

    await handler(buildBatch([{ personId: PERSON_ID, messageId: MESSAGE_ID }]));

    expect(mutationMock.mock.calls[0][0].createPeople.__args).toEqual({
      upsert: true,
      data: [
        {
          id: PERSON_ID,
          lastContactAt: RECEIVED_AT,
          lastContactById: MEMBER_ID,
          lastContactItemMessageId: MESSAGE_ID,
          lastContactItemCalendarEventId: null,
          lastOutboundAt: RECEIVED_AT,
          lastEmailId: MESSAGE_ID,
        },
      ],
    });
  });

  it('resolves every message of the batch in one query and updates each person once', async () => {
    setupQueryMock([
      {
        messageId: OLDER_MESSAGE_ID,
        role: 'FROM',
        workspaceMemberId: null,
        message: { receivedAt: OLDER_RECEIVED_AT },
      },
      {
        messageId: MESSAGE_ID,
        role: 'FROM',
        workspaceMemberId: MEMBER_ID,
        message: { receivedAt: RECEIVED_AT },
      },
    ]);

    await handler(
      buildBatch([
        { personId: PERSON_ID, messageId: OLDER_MESSAGE_ID },
        { personId: PERSON_ID, messageId: MESSAGE_ID },
      ]),
    );

    const participantQueries = queryMock.mock.calls.filter(
      ([query]) =>
        query.messageParticipants && !isPersonRecentMessagesQuery(query),
    );
    expect(participantQueries).toHaveLength(1);
    expect(participantQueries[0][0].messageParticipants.__args.filter).toEqual({
      and: [
        { messageId: { in: [OLDER_MESSAGE_ID, MESSAGE_ID] } },
        {
          or: [
            { role: { eq: 'FROM' } },
            { workspaceMemberId: { is: 'NOT_NULL' } },
          ],
        },
      ],
    });
    expect(queryMock.mock.calls.some(([query]) => query.messages)).toBe(false);

    const personUpserts = mutationMock.mock.calls.filter(
      ([mutation]) => mutation.createPeople,
    );
    expect(personUpserts).toHaveLength(1);
    expect(personUpserts[0][0].createPeople.__args.data).toEqual([
      {
        id: PERSON_ID,
        lastContactAt: RECEIVED_AT,
        lastContactById: MEMBER_ID,
        lastContactItemMessageId: MESSAGE_ID,
        lastContactItemCalendarEventId: null,
        lastOutboundAt: RECEIVED_AT,
        lastInboundAt: OLDER_RECEIVED_AT,
        lastEmailId: MESSAGE_ID,
      },
    ]);
  });

  it('should do nothing when no participant has both a person and a message', async () => {
    await handler(
      buildBatch([
        { personId: null, messageId: MESSAGE_ID },
        { personId: PERSON_ID, messageId: null },
      ]),
    );

    expect(queryMock).not.toHaveBeenCalled();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('should not update the person when the message has no receivedAt', async () => {
    setupQueryMock([
      {
        messageId: MESSAGE_ID,
        role: 'FROM',
        workspaceMemberId: MEMBER_ID,
        message: { receivedAt: null },
      },
    ]);

    await handler(buildBatch([{ personId: PERSON_ID, messageId: MESSAGE_ID }]));

    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('ignores a draft email', async () => {
    setupQueryMock([
      {
        messageId: MESSAGE_ID,
        role: 'FROM',
        workspaceMemberId: MEMBER_ID,
        message: { receivedAt: RECEIVED_AT, isDraft: true },
      },
    ]);

    await handler(buildBatch([{ personId: PERSON_ID, messageId: MESSAGE_ID }]));

    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('ignores a draft email without a sender or team member participant', async () => {
    setupQueryMock(
      [],
      [{ id: MESSAGE_ID, receivedAt: RECEIVED_AT, isDraft: true }],
    );

    await handler(buildBatch([{ personId: PERSON_ID, messageId: MESSAGE_ID }]));

    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('counts a message without a sender or team member participant as an inbound email', async () => {
    setupQueryMock([], [{ id: MESSAGE_ID, receivedAt: RECEIVED_AT }]);

    await handler(buildBatch([{ personId: PERSON_ID, messageId: MESSAGE_ID }]));

    const messageQueries = queryMock.mock.calls.filter(
      ([query]) => query.messages,
    );
    expect(messageQueries).toHaveLength(1);
    expect(messageQueries[0][0].messages.__args.filter).toEqual({
      id: { in: [MESSAGE_ID] },
    });
    expect(mutationMock.mock.calls[0][0].createPeople.__args.data).toEqual([
      {
        id: PERSON_ID,
        lastContactAt: RECEIVED_AT,
        lastContactById: null,
        lastContactItemMessageId: MESSAGE_ID,
        lastContactItemCalendarEventId: null,
        lastInboundAt: RECEIVED_AT,
        lastEmailId: MESSAGE_ID,
      },
    ]);
  });

  describe('messages in a row', () => {
    const senderParticipants = [
      {
        messageId: MESSAGE_ID,
        role: 'FROM',
        workspaceMemberId: MEMBER_ID,
        message: { receivedAt: RECEIVED_AT },
      },
      {
        messageId: OLDER_MESSAGE_ID,
        role: 'FROM',
        workspaceMemberId: MEMBER_ID,
        message: { receivedAt: OLDER_RECEIVED_AT },
      },
      {
        messageId: OLDEST_MESSAGE_ID,
        role: 'FROM',
        workspaceMemberId: null,
        message: { receivedAt: OLDEST_RECEIVED_AT },
      },
    ];
    const recentParticipants = [
      [MESSAGE_ID, RECEIVED_AT],
      [OLDER_MESSAGE_ID, OLDER_RECEIVED_AT],
      [OLDEST_MESSAGE_ID, OLDEST_RECEIVED_AT],
    ].map(([messageId, receivedAt]) => ({
      personId: PERSON_ID,
      messageId,
      message: { receivedAt, isDraft: false },
    }));
    const upToDatePerson = {
      lastContactAt: RECEIVED_AT,
      lastOutboundAt: RECEIVED_AT,
      lastInboundAt: OLDEST_RECEIVED_AT,
      lastEmail: { receivedAt: RECEIVED_AT },
    };

    it("counts the person's latest emails from the same side and writes it with the other fields", async () => {
      setupQueryMock(senderParticipants, [], { recentParticipants });

      await handler(
        buildBatch([{ personId: PERSON_ID, messageId: MESSAGE_ID }]),
      );

      const recentQueries = queryMock.mock.calls.filter(([query]) =>
        isPersonRecentMessagesQuery(query),
      );
      expect(recentQueries).toHaveLength(1);
      expect(recentQueries[0][0].messageParticipants.__args).toMatchObject({
        filter: { personId: { eq: PERSON_ID } },
        orderBy: [
          { message: { receivedAt: 'DescNullsLast' } },
          { messageId: 'DescNullsLast' },
        ],
        first: 50,
      });

      const senderQueries = queryMock.mock.calls.filter(
        ([query]) =>
          query.messageParticipants && !isPersonRecentMessagesQuery(query),
      );
      expect(
        senderQueries.map(
          ([query]) => query.messageParticipants.__args.filter.and[0],
        ),
      ).toEqual([
        { messageId: { in: [MESSAGE_ID] } },
        { messageId: { in: [OLDER_MESSAGE_ID, OLDEST_MESSAGE_ID] } },
      ]);

      expect(mutationMock.mock.calls[0][0].createPeople.__args.data).toEqual([
        {
          id: PERSON_ID,
          lastContactAt: RECEIVED_AT,
          lastContactById: MEMBER_ID,
          lastContactItemMessageId: MESSAGE_ID,
          lastContactItemCalendarEventId: null,
          lastOutboundAt: RECEIVED_AT,
          lastEmailId: MESSAGE_ID,
          lastSenderStreak: 2,
        },
      ]);
    });

    it('writes only messages in a row when an older email is linked late', async () => {
      setupQueryMock(senderParticipants, [], {
        recentParticipants,
        currentPerson: { ...upToDatePerson, lastSenderStreak: 1 },
      });

      await handler(
        buildBatch([{ personId: PERSON_ID, messageId: OLDER_MESSAGE_ID }]),
      );

      expect(mutationMock.mock.calls[0][0].createPeople.__args.data).toEqual([
        { id: PERSON_ID, lastSenderStreak: 2 },
      ]);
    });

    it('skips the write when messages in a row already match', async () => {
      setupQueryMock(senderParticipants, [], {
        recentParticipants,
        currentPerson: { ...upToDatePerson, lastSenderStreak: 2 },
      });

      await handler(
        buildBatch([{ personId: PERSON_ID, messageId: OLDER_MESSAGE_ID }]),
      );

      expect(
        mutationMock.mock.calls.some(([mutation]) => mutation.createPeople),
      ).toBe(false);
    });

    it('restarts at 1 when the other side replies', async () => {
      const replyAt = '2026-06-11T09:00:00.000Z';
      const replyMessageId = '66666666-6666-6666-6666-666666666666';

      setupQueryMock(
        [
          ...senderParticipants,
          {
            messageId: replyMessageId,
            role: 'FROM',
            workspaceMemberId: null,
            message: { receivedAt: replyAt },
          },
        ],
        [],
        {
          recentParticipants: [
            {
              personId: PERSON_ID,
              messageId: replyMessageId,
              message: { receivedAt: replyAt, isDraft: false },
            },
            ...recentParticipants,
          ],
          currentPerson: { ...upToDatePerson, lastSenderStreak: 2 },
        },
      );

      await handler(
        buildBatch([{ personId: PERSON_ID, messageId: replyMessageId }]),
      );

      expect(
        mutationMock.mock.calls[0][0].createPeople.__args.data[0],
      ).toMatchObject({ lastInboundAt: replyAt, lastSenderStreak: 1 });
    });
  });
});
