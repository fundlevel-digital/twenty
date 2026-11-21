import { type AppConnection } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { calComRequest } from 'src/logic-functions/utils/cal-com-api';
import { type EventTypeChoice } from 'src/types/connection-settings';
export const listEventTypes = async (
  connection: AppConnection,
): Promise<EventTypeChoice[]> => {
  const profile = await calComRequest(
    connection,
    '/me',
    z.object({ data: z.object({ username: z.string() }) }),
  );
  const result = await calComRequest(
    connection,
    `/event-types?username=${encodeURIComponent(profile.data.username)}`,
    z.object({
      data: z.array(
        z.object({
          id: z.number(),
          title: z.string(),
          slug: z.string(),
          bookingUrl: z.string().optional(),
          bookingFields: z
            .array(
              z.object({
                slug: z.string().optional(),
                name: z.string().optional(),
              }),
            )
            .optional(),
        }),
      ),
    }),
    { version: '2026-06-12' },
  );
  return result.data.map((eventType) => ({
    id: eventType.id,
    title: eventType.title,
    slug: eventType.slug,
    bookingUrl: eventType.bookingUrl,
    answerKeys: (eventType.bookingFields ?? []).flatMap((field) =>
      field.slug ? [field.slug] : field.name ? [field.name] : [],
    ),
  }));
};
