import { z } from 'zod';
import {
  getConnection,
  reportConnectionAuthFailure,
} from 'twenty-sdk/logic-function';

export const messagePartSchema: z.ZodType<MessagePart> = z.lazy(() =>
  z.object({
    mimeType: z.string().optional(),
    filename: z.string().optional(),
    headers: z
      .array(z.object({ name: z.string(), value: z.string() }))
      .optional(),
    body: z
      .object({
        data: z.string().optional(),
        attachmentId: z.string().optional(),
        size: z.number().optional(),
      })
      .optional(),
    parts: z.array(messagePartSchema).optional(),
  }),
);
export type MessagePart = {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: MessagePart[];
};
export const googleMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  internalDate: z.string(),
  payload: messagePartSchema,
  labelIds: z.array(z.string()).optional(),
});
export type GoogleMessage = z.infer<typeof googleMessageSchema>;
export const googleProfileSchema = z.object({
  emailAddress: z.email(),
  historyId: z.string(),
});
export const googleSendAsSchema = z.object({
  sendAs: z
    .array(
      z.object({
        sendAsEmail: z.email(),
        verificationStatus: z.string().optional(),
        isPrimary: z.boolean().optional(),
      }),
    )
    .default([]),
});

export class GoogleApiError extends Error {
  constructor(public readonly status: number) {
    super(`Google returned HTTP ${status}.`);
  }
}

export const googleRequestWithToken = async <TData>(
  accessToken: string,
  path: string,
  schema: z.ZodType<TData>,
  body?: unknown,
): Promise<TData> => {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me${path}`,
    {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) throw new GoogleApiError(response.status);
  return schema.parse(await response.json());
};

export const googleRequest = async <TData>(
  connectionId: string,
  path: string,
  schema: z.ZodType<TData>,
  body?: unknown,
): Promise<TData> => {
  const connection = await getConnection(connectionId);
  if (connection.providerName !== 'google-groups' || !connection.accessToken)
    throw new Error('Reconnect the Google Workspace account.');
  try {
    return await googleRequestWithToken(
      connection.accessToken,
      path,
      schema,
      body,
    );
  } catch (error) {
    if (error instanceof GoogleApiError && error.status === 401)
      await reportConnectionAuthFailure({
        connectionId,
        reason: 'Google access expired. Reconnect this account.',
      });
    throw error;
  }
};
