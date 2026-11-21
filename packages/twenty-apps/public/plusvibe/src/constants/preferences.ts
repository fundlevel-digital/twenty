import { z } from 'zod';

export const INTERNAL_DOMAIN_SCHEMA = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.hostname());
export const PREFERENCES_SCHEMA = z.object({
  contactAutoCreationPolicy: z.enum(['SENT_AND_RECEIVED', 'SENT', 'NONE']),
  excludeInternalPeople: z.boolean(),
  internalDomains: z.array(INTERNAL_DOMAIN_SCHEMA).max(50),
  uniboxVisibility: z.enum(['METADATA', 'SUBJECT', 'SHARE_EVERYTHING']),
});
export type PlusvibePreferences = z.infer<typeof PREFERENCES_SCHEMA>;
export const DEFAULT_PREFERENCES: PlusvibePreferences = {
  contactAutoCreationPolicy: 'SENT_AND_RECEIVED',
  excludeInternalPeople: true,
  internalDomains: [],
  uniboxVisibility: 'METADATA',
};
