import { type CalComBooking } from 'src/logic-functions/types/booking';
import { type ConnectionSettings } from 'src/types/connection-settings';
export const shouldWatchBooking = (
  booking: CalComBooking,
  settings: ConnectionSettings,
  anchor: string,
): boolean => {
  if (settings.paused) return false;
  const eventTypeId = booking.eventTypeId ?? booking.eventType?.id;
  if (
    !settings.watchAllLinks &&
    (typeof eventTypeId !== 'number' ||
      !settings.eventTypeIds.includes(eventTypeId))
  )
    return false;
  if (settings.history === 'ALL') return true;
  const earliest =
    Date.parse(anchor) -
    (settings.history === 'FUTURE' ? 0 : Number(settings.history) * 86400000);
  return Date.parse(booking.start) >= earliest;
};
export const selectBookingAnswers = (
  answers: Record<string, unknown>,
  settings: ConnectionSettings,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(answers).filter(
      ([key]) =>
        settings.answerMode === 'ALL' ||
        (settings.answerMode === 'SELECTED' &&
          settings.answerKeys.includes(key)),
    ),
  );
export const mapBookingAnswers = (
  answers: Record<string, unknown>,
  settings: ConnectionSettings,
  allowedFields: Set<string>,
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const mapping of settings.answerMappings) {
    if (!allowedFields.has(mapping.targetField)) continue;
    const value = answers[mapping.sourceKey];
    if (value === undefined || value === null) continue;
    result[mapping.targetField] =
      typeof value === 'string' ? value : JSON.stringify(value);
  }
  return result;
};
