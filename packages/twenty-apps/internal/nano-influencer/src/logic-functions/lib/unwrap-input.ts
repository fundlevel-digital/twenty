import { z } from 'zod';

export const unwrapInput = (payload: unknown): unknown => {
  const route = z.object({ body: z.unknown() }).safeParse(payload);
  return route.success && 'body' in route.data
    ? route.data.body
    : (payload ?? {});
};
