import {
  loadPreferences,
  updateSyncStatus,
} from 'src/logic-functions/utils/connection-preferences';
import { shouldWatchBooking } from 'src/logic-functions/utils/booking-preferences';
import { listMappingFields } from 'src/logic-functions/utils/mapping-fields';
import { defineLogicFunction } from 'twenty-sdk/define';
import { getConnection, kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  bookingPageSchema,
  bookingSchema,
  type WebhookRegistration,
  type CalComBooking,
} from 'src/logic-functions/types/booking';
import { calComRequest } from 'src/logic-functions/utils/cal-com-api';
import { syncBooking } from 'src/logic-functions/utils/sync-booking';
import { enqueue } from 'src/logic-functions/utils/enqueue';

export const syncWorker = async ({
  connectedAccountId,
  cursor,
  bookingUid,
  revision,
  anchor = new Date().toISOString(),
  processed = 0,
}: {
  connectedAccountId: string;
  cursor?: string;
  bookingUid?: string;
  revision?: string;
  anchor?: string;
  processed?: number;
}) => {
  const registration = await kv.get<WebhookRegistration>(
    `registration:${connectedAccountId}`,
  );
  if (!registration?.active) return { skipped: true };
  const preferences = await loadPreferences(connectedAccountId);
  if (
    preferences.settings.paused ||
    (revision && revision !== preferences.revision)
  )
    return { skipped: true };
  const activeRevision = preferences.revision;
  const mappingFields = new Set(
    preferences.settings.answerMappings.length
      ? (await listMappingFields()).map((field) => field.name)
      : [],
  );
  await updateSyncStatus(connectedAccountId, {
    phase: 'RUNNING',
    lastStartedAt: anchor,
    revision: activeRevision,
    error: undefined,
  });
  try {
    const connection = await getConnection(connectedAccountId);
    const result: {
      data: CalComBooking | CalComBooking[];
      pagination?: { hasMore: boolean; nextCursor: string | null };
    } = bookingUid
      ? await calComRequest(
          connection,
          `/bookings/${encodeURIComponent(bookingUid)}`,
          z.object({
            status: z.literal('success'),
            data: z.union([bookingSchema, z.array(bookingSchema)]),
          }),
          { version: '2026-02-25' },
        )
      : await calComRequest(
          connection,
          `/bookings?${new URLSearchParams({ limit: '50', ...(cursor ? { cursor } : {}) })}`,
          bookingPageSchema,
          { version: '2026-05-01' },
        );
    const bookings = Array.isArray(result.data) ? result.data : [result.data];
    let synced = 0;
    for (const booking of bookings) {
      const current = await loadPreferences(connectedAccountId);
      if (current.revision !== activeRevision || current.settings.paused)
        return { skipped: true };
      if (!shouldWatchBooking(booking, preferences.settings, anchor)) continue;
      await syncBooking(
        booking,
        connectedAccountId,
        preferences.settings,
        mappingFields,
      );
      synced++;
    }
    const pagination = result.pagination;
    if (pagination?.hasMore) {
      if (!pagination.nextCursor || pagination.nextCursor === cursor)
        throw new Error('Cal.com returned an invalid pagination cursor.');
      await enqueue(IDENTIFIERS.SYNC_WORKER, {
        connectedAccountId,
        cursor: pagination.nextCursor,
        revision: activeRevision,
        anchor,
        processed: processed + synced,
      });
    } else {
      await updateSyncStatus(connectedAccountId, {
        phase: 'SUCCESS',
        lastSuccessAt: new Date().toISOString(),
        synced: processed + synced,
        error: undefined,
      });
    }
    return { synced, hasMore: pagination?.hasMore ?? false };
  } catch (error) {
    await updateSyncStatus(connectedAccountId, {
      phase: 'ERROR',
      error: error instanceof Error ? error.message : 'Cal.com sync failed.',
    });
    throw error;
  }
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.SYNC_WORKER,
  name: 'cal-com-sync-worker',
  description: 'Imports a page of Cal.com bookings and queues the next page.',
  timeoutSeconds: 300,
  handler: syncWorker,
});
