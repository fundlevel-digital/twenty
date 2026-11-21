import { defineLogicFunction } from 'twenty-sdk/define';
import {
  jsonSchemaToInputSchema,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { calComRequest } from 'src/logic-functions/utils/cal-com-api';
import { requestConnection } from 'src/logic-functions/utils/request-connection';
export const bookingLinks = async (
  _parameters: unknown,
  context: LogicFunctionExecutionContext,
) => {
  const connection = await requestConnection(context);
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
          bookingUrl: z.url().optional(),
        }),
      ),
    }),
    { version: '2026-06-12' },
  );
  return {
    links: result.data.map((eventType) => ({
      ...eventType,
      url:
        eventType.bookingUrl ??
        `https://cal.com/${encodeURIComponent(profile.data.username)}/${encodeURIComponent(eventType.slug)}`,
    })),
  };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.LINKS,
  name: 'get-cal-com-booking-links',
  description:
    'Gets scheduling links for the current user’s Cal.com event types.',
  timeoutSeconds: 60,
  handler: bookingLinks,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  workflowActionTriggerSettings: {
    label: 'Get Cal.com Booking Links',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: {},
      additionalProperties: false,
    }),
    outputSchema: [{ type: 'object', properties: {} }],
  },
});
