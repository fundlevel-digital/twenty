import { defineLogicFunction } from 'twenty-sdk/define';
import {
  jsonSchemaToInputSchema,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { bookingPageSchema } from 'src/logic-functions/types/booking';
import { calComRequest } from 'src/logic-functions/utils/cal-com-api';
import { requestConnection } from 'src/logic-functions/utils/request-connection';
const input = z.object({
  status: z.enum(['upcoming', 'past', 'cancelled', 'unconfirmed']).optional(),
  cursor: z.string().optional(),
});
export const listBookings = async (
  parameters: unknown,
  context: LogicFunctionExecutionContext,
) => {
  const options = input.parse(parameters);
  const connection = await requestConnection(context);
  const query = new URLSearchParams({ limit: '50', ...options });
  return calComRequest(connection, `/bookings?${query}`, bookingPageSchema, {
    version: '2026-05-01',
  });
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.LIST,
  name: 'list-cal-com-bookings',
  description:
    'Lists the current user’s Cal.com bookings with cursor pagination.',
  timeoutSeconds: 30,
  handler: listBookings,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['upcoming', 'past', 'cancelled', 'unconfirmed'],
        },
        cursor: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  workflowActionTriggerSettings: {
    label: 'List Cal.com Bookings',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['upcoming', 'past', 'cancelled', 'unconfirmed'],
        },
        cursor: { type: 'string' },
      },
      additionalProperties: false,
    }),
    outputSchema: [{ type: 'object', properties: {} }],
  },
});
