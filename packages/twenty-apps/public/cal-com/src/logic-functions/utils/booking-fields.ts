import { normalizeEnumValue } from 'src/utils/enum-fields';
import { createHash } from 'node:crypto';
import { type CalComBooking } from 'src/logic-functions/types/booking';

export const bookingRecordId = (uid: string): string => {
  const bytes = createHash('sha256').update(`cal-com:${uid}`).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const legacyBookingFields = (booking: CalComBooking, connectionId: string) => ({
  name: booking.title,
  bookingUid: booking.uid,
  status: booking.rescheduledToUid
    ? 'Rescheduled'
    : booking.status === 'accepted' &&
        (booking.absentHost ||
          booking.attendees.some((attendee) => attendee.absent))
      ? 'No-Show'
      : booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
  startsAt: booking.start,
  endsAt: booking.end,
  hostEmail: booking.hosts[0]?.email ?? '',
  attendeeEmail: booking.attendees[0]?.email ?? '',
  attendeeName: booking.attendees[0]?.name ?? '',
  eventType: booking.eventType?.slug ?? '',
  location: booking.location ?? '',
  answers: booking.bookingFieldsResponses,
  sourceUpdatedAt: booking.updatedAt,
  syncedAt: new Date().toISOString(),
  connectionId,
  rescheduledFromUid: booking.rescheduledFromUid ?? '',
  rescheduledToUid: booking.rescheduledToUid ?? '',
  bookingUrl: `https://app.cal.com/booking/${encodeURIComponent(booking.uid)}`,
});

export const bookingFields = (booking: CalComBooking, connectionId: string) => {
  const fields = legacyBookingFields(booking, connectionId);
  return {
    ...fields,
    bookingStatus: normalizeEnumValue('bookingStatus', fields.status),
  };
};
