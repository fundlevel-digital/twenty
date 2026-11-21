import { z } from 'zod';

export const bookingSchema = z.object({
  uid: z.string().min(1),
  title: z.string(),
  status: z.string(),
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  hosts: z
    .array(
      z.object({
        name: z.string().optional(),
        email: z.email(),
        username: z.string().optional(),
      }),
    )
    .default([]),
  attendees: z
    .array(
      z.object({
        name: z.string(),
        email: z.email(),
        absent: z.boolean().nullable().optional(),
      }),
    )
    .default([]),
  absentHost: z.boolean().nullable().optional(),
  eventTypeId: z.number().nullish(),
  eventType: z
    .object({ id: z.number().nullish(), slug: z.string() })
    .nullable()
    .optional(),
  location: z.string().nullable().optional(),
  bookingFieldsResponses: z.record(z.string(), z.unknown()).default({}),
  icsUid: z.string().nullable().optional(),
  rescheduledFromUid: z.string().nullable().optional(),
  rescheduledToUid: z.string().nullable().optional(),
});
export type CalComBooking = z.infer<typeof bookingSchema>;
export const bookingPageSchema = z.object({
  status: z.literal('success'),
  data: z.array(bookingSchema),
  pagination: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type WebhookRegistration = {
  secret: string;
  webhookId?: string;
  active: boolean;
};
export type ConnectionHookPayload = { connectedAccountId: string };

export const webhookIdentifierSchema = z
  .union([z.string().min(1), z.number().int().positive()])
  .transform(String);
export const webhookSchema = z.object({
  status: z.literal('success'),
  data: z.object({ id: webhookIdentifierSchema }),
});
export const webhookListSchema = z.object({
  status: z.literal('success'),
  data: z.array(
    z.object({ id: webhookIdentifierSchema, subscriberUrl: z.url() }),
  ),
});
