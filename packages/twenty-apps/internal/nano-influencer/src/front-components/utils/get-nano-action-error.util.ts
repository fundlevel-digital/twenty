import { RestApiClientError } from 'twenty-client-sdk/rest';
import { z } from 'zod';

const responseErrorSchema = z.object({
  messages: z.array(z.string()).optional(),
  message: z.string().optional(),
});

export const getNanoActionError = (error: unknown): string | undefined => {
  if (error instanceof RestApiClientError) {
    const response = responseErrorSchema.safeParse(error.body);
    if (response.success) {
      const message =
        response.data.messages?.join(' ') || response.data.message;
      if (message) return message;
    }
  }
  return error instanceof Error ? error.message : undefined;
};
