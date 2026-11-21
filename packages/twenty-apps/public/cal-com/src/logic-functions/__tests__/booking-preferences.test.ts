import { expect, it } from 'vitest';
import {
  DEFAULT_CONNECTION_SETTINGS,
  connectionSettingsSchema,
} from 'src/types/connection-settings';
import { bookingSchema } from 'src/logic-functions/types/booking';
import {
  shouldWatchBooking,
  selectBookingAnswers,
  mapBookingAnswers,
} from 'src/logic-functions/utils/booking-preferences';
const booking = bookingSchema.parse({
  uid: 'test',
  title: 'Demo',
  status: 'accepted',
  eventTypeId: 20,
  start: '2026-11-01T10:00:00Z',
  end: '2026-11-01T10:30:00Z',
  updatedAt: '2026-11-01T09:00:00Z',
});
const anchor = '2026-11-21T10:00:00Z';
it('defaults to all links and history without creating contacts', () => {
  expect(shouldWatchBooking(booking, DEFAULT_CONNECTION_SETTINGS, anchor)).toBe(
    true,
  );
  expect(DEFAULT_CONNECTION_SETTINGS.createMissingContacts).toBe(false);
});
it('accepts only selected event types and treats no selection as none', () => {
  expect(
    shouldWatchBooking(
      booking,
      {
        ...DEFAULT_CONNECTION_SETTINGS,
        watchAllLinks: false,
        eventTypeIds: [20],
      },
      anchor,
    ),
  ).toBe(true);
  expect(
    shouldWatchBooking(
      booking,
      {
        ...DEFAULT_CONNECTION_SETTINGS,
        watchAllLinks: false,
        eventTypeIds: [],
      },
      anchor,
    ),
  ).toBe(false);
});
it('applies history windows while including future bookings', () => {
  expect(
    shouldWatchBooking(
      booking,
      { ...DEFAULT_CONNECTION_SETTINGS, history: '30' },
      anchor,
    ),
  ).toBe(true);
  expect(
    shouldWatchBooking(
      booking,
      { ...DEFAULT_CONNECTION_SETTINGS, history: 'FUTURE' },
      anchor,
    ),
  ).toBe(false);
  expect(
    shouldWatchBooking(
      { ...booking, start: '2027-01-01T10:00:00Z' },
      { ...DEFAULT_CONNECTION_SETTINGS, history: '30' },
      anchor,
    ),
  ).toBe(true);
  expect(
    shouldWatchBooking(
      { ...booking, start: '2026-01-01T10:00:00Z' },
      { ...DEFAULT_CONNECTION_SETTINGS, history: '90' },
      anchor,
    ),
  ).toBe(false);
});
it('stores only chosen answers or no answers', () => {
  const answers = { topic: 'Demo', size: 12 };
  expect(
    selectBookingAnswers(answers, {
      ...DEFAULT_CONNECTION_SETTINGS,
      answerMode: 'SELECTED',
      answerKeys: ['topic'],
    }),
  ).toEqual({ topic: 'Demo' });
  expect(
    selectBookingAnswers(answers, {
      ...DEFAULT_CONNECTION_SETTINGS,
      answerMode: 'NONE',
    }),
  ).toEqual({});
});
it('maps answers only into approved custom fields, preserving source identifiers', () => {
  expect(
    mapBookingAnswers(
      { company_size: 12 },
      {
        ...DEFAULT_CONNECTION_SETTINGS,
        answerMappings: [
          { sourceKey: 'company_size', targetField: 'size' },
          { sourceKey: 'company_size', targetField: 'status' },
        ],
      },
      new Set(['size']),
    ),
  ).toEqual({ size: '12' });
});
it('rejects duplicate mapping targets and invalid target names', () => {
  expect(
    connectionSettingsSchema.safeParse({
      answerMappings: [
        { sourceKey: 'a', targetField: 'size' },
        { sourceKey: 'b', targetField: 'size' },
      ],
    }).success,
  ).toBe(false);
  expect(
    connectionSettingsSchema.safeParse({
      answerMappings: [{ sourceKey: 'a', targetField: '__proto__' }],
    }).success,
  ).toBe(false);
});

it('includes bookings from deleted event types only when watching all links', () => {
  const orphan = bookingSchema.parse({
    ...booking,
    eventTypeId: null,
    eventType: null,
  });
  expect(shouldWatchBooking(orphan, DEFAULT_CONNECTION_SETTINGS, anchor)).toBe(
    true,
  );
  expect(
    shouldWatchBooking(
      orphan,
      {
        ...DEFAULT_CONNECTION_SETTINGS,
        watchAllLinks: false,
        eventTypeIds: [20],
      },
      anchor,
    ),
  ).toBe(false);
});
