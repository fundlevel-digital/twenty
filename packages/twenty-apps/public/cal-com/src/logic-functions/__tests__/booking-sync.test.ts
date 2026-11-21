import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  bookingSchema,
  webhookSchema,
  webhookListSchema,
} from 'src/logic-functions/types/booking';
import { bookingFields } from 'src/logic-functions/utils/booking-fields';
import { verifySignature } from 'src/logic-functions/utils/verify-signature';
import { syncBooking } from 'src/logic-functions/utils/sync-booking';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('src/logic-functions/utils/workspace-client', () => ({
  createWorkspaceGraphqlClient: () => ({ request }),
}));
const booking = bookingSchema.parse({
  uid: 'booking-one',
  title: 'Discovery Call',
  status: 'accepted',
  start: '2026-11-22T10:00:00Z',
  end: '2026-11-22T10:30:00Z',
  updatedAt: '2026-11-21T10:00:00Z',
  attendees: [{ name: 'Demo Guest', email: 'guest@example.com' }],
  icsUid: 'calendar-one',
  bookingFieldsResponses: { purpose: 'Demo' },
});
beforeEach(() => request.mockReset());

describe('Cal.com booking sync', () => {
  it('rejects modified or unsigned webhook bodies', () => {
    const raw = '{"booking":"one"}';
    const signature = createHmac('sha256', 'test-secret')
      .update(raw)
      .digest('hex');
    expect(verifySignature(raw, signature, 'test-secret')).toBe(true);
    expect(verifySignature(raw + ' ', signature, 'test-secret')).toBe(false);
    expect(verifySignature(raw, undefined, 'test-secret')).toBe(false);
    expect(verifySignature(raw, 'zz'.repeat(32), 'test-secret')).toBe(false);
  });
  it('preserves answers, reported no-shows and reschedule history', () => {
    expect(
      bookingFields(
        {
          ...booking,
          attendees: [
            { name: 'Guest', email: 'guest@example.com', absent: true },
          ],
        },
        'connection',
      ),
    ).toMatchObject({ status: 'No-Show', answers: { purpose: 'Demo' } });
    expect(
      bookingFields(
        { ...booking, status: 'cancelled', rescheduledToUid: 'replacement' },
        'connection',
      ),
    ).toMatchObject({ status: 'Rescheduled', rescheduledToUid: 'replacement' });
    expect(
      bookingFields({ ...booking, status: 'cancelled' }, 'connection').status,
    ).toBe('Cancelled');
  });
  it('does not overwrite newer booking data with an older import', async () => {
    request.mockResolvedValueOnce({
      calComBookings: {
        edges: [
          {
            node: {
              id: 'saved',
              updatedAt: '2026-11-21T12:00:00Z',
              sourceUpdatedAt: '2026-11-21T12:00:00Z',
            },
          },
        ],
      },
    });
    await syncBooking(booking, 'connection');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('links unique contacts and calendars without creating a second calendar event', async () => {
    request
      .mockResolvedValueOnce({ calComBookings: { edges: [] } })
      .mockResolvedValueOnce({
        people: { edges: [{ node: { id: 'person-one' } }] },
      })
      .mockResolvedValueOnce({
        calendarEvents: { edges: [{ node: { id: 'calendar-one' } }] },
      })
      .mockResolvedValueOnce({ createCalComBooking: { id: 'created' } });
    await syncBooking(booking, 'connection');
    expect(request.mock.calls[3][1].data).toMatchObject({
      personId: 'person-one',
      calendarEventId: 'calendar-one',
      bookingUid: booking.uid,
    });
    expect(
      request.mock.calls.some(([query]) =>
        query.includes('createCalendarEvent'),
      ),
    ).toBe(false);
  });
  it('leaves ambiguous contact and calendar matches unlinked', async () => {
    const edges = [{ node: { id: 'one' } }, { node: { id: 'two' } }];
    request
      .mockResolvedValueOnce({ calComBookings: { edges: [] } })
      .mockResolvedValueOnce({ people: { edges } })
      .mockResolvedValueOnce({ calendarEvents: { edges } })
      .mockResolvedValueOnce({ createCalComBooking: { id: 'created' } });
    await syncBooking(booking, 'connection');
    expect(request.mock.calls[3][1].data.personId).toBeUndefined();
    expect(request.mock.calls[3][1].data.calendarEventId).toBeUndefined();
  });
  it('retries when another sync changes the booking during an update', async () => {
    request
      .mockResolvedValueOnce({
        calComBookings: {
          edges: [
            {
              node: {
                id: 'saved',
                updatedAt: '2026-11-21T09:00:00Z',
                sourceUpdatedAt: '2026-11-21T09:00:00Z',
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({ people: { edges: [] } })
      .mockResolvedValueOnce({ calendarEvents: { edges: [] } })
      .mockResolvedValueOnce({ updateCalComBookings: [] });
    await expect(syncBooking(booking, 'connection')).rejects.toThrow(
      'Booking changed during sync',
    );
  });
});

it.each(['webhook-id', 123])(
  'accepts Cal.com webhook identifier %s during connection setup',
  (id) => {
    expect(
      webhookSchema.parse({ status: 'success', data: { id } }).data.id,
    ).toBe(String(id));
    expect(
      webhookListSchema.parse({
        status: 'success',
        data: [{ id, subscriberUrl: 'https://example.com/webhook' }],
      }).data[0].id,
    ).toBe(String(id));
  },
);

it('creates a missing Person only when explicitly enabled', async () => {
  request
    .mockResolvedValueOnce({ calComBookings: { edges: [] } })
    .mockResolvedValueOnce({ people: { edges: [] } })
    .mockResolvedValueOnce({ createPerson: { id: 'created-person' } })
    .mockResolvedValueOnce({ calendarEvents: { edges: [] } })
    .mockResolvedValueOnce({ createCalComBooking: { id: 'booking' } });
  const { DEFAULT_CONNECTION_SETTINGS } =
    await import('src/types/connection-settings');
  await syncBooking(booking, 'connection', {
    ...DEFAULT_CONNECTION_SETTINGS,
    createMissingContacts: true,
  });
  expect(request.mock.calls[2][0]).toContain('createPerson');
  expect(request.mock.calls[4][1].data.personId).toEqual(expect.any(String));
});
it('never creates a Person for ambiguous email matches', async () => {
  request
    .mockResolvedValueOnce({ calComBookings: { edges: [] } })
    .mockResolvedValueOnce({
      people: { edges: [{ node: { id: 'one' } }, { node: { id: 'two' } }] },
    })
    .mockResolvedValueOnce({ calendarEvents: { edges: [] } })
    .mockResolvedValueOnce({ createCalComBooking: { id: 'booking' } });
  const { DEFAULT_CONNECTION_SETTINGS } =
    await import('src/types/connection-settings');
  await syncBooking(booking, 'connection', {
    ...DEFAULT_CONNECTION_SETTINGS,
    createMissingContacts: true,
  });
  expect(
    request.mock.calls.some(([query]) => query.includes('createPerson')),
  ).toBe(false);
});
