import { z } from 'zod';

export const sourceTypeSchema = z.enum(['person', 'company']);
export type SourceType = z.infer<typeof sourceTypeSchema>;
export const syncModeSchema = z.enum([
  'LINK_ONLY',
  'CREATE_MISSING',
  'REFRESH',
]);
export type SyncMode = z.infer<typeof syncModeSchema>;

const sourceSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  fieldUniversalIdentifier: z
    .union([z.string().uuid(), z.literal('')])
    .default(''),
  mode: syncModeSchema.default('CREATE_MISSING'),
  removeStaleLinks: z.boolean().default(false),
  backfillMode: syncModeSchema.default('CREATE_MISSING'),
  backfillScanLimit: z
    .string()
    .refine(
      (value) =>
        value === 'ALL' ||
        (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 5000),
      'Choose All Records or a maximum from 1 to 5,000.',
    )
    .default('500'),
});
export const syncSettingsSchema = z.object({
  person: sourceSettingsSchema.default({
    enabled: false,
    fieldUniversalIdentifier: 'eab908ff-2dd6-4216-b341-8198a56fc8e1',
    mode: 'CREATE_MISSING',
    removeStaleLinks: false,
    backfillMode: 'CREATE_MISSING',
    backfillScanLimit: '500',
  }),
  company: sourceSettingsSchema.default({
    enabled: false,
    fieldUniversalIdentifier: '',
    mode: 'CREATE_MISSING',
    removeStaleLinks: false,
    backfillMode: 'CREATE_MISSING',
    backfillScanLimit: '500',
  }),
  allowAnonymous: z.boolean().default(true),
  skipNoreplyEmails: z.boolean().default(true),
});
export type SyncSettings = z.infer<typeof syncSettingsSchema>;
export const DEFAULT_SYNC_SETTINGS = syncSettingsSchema.parse({});
