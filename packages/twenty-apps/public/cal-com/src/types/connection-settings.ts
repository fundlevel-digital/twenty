import { z } from 'zod';
export const connectionSettingsSchema = z
  .object({
    watchAllLinks: z.boolean().default(true),
    eventTypeIds: z.array(z.number().int().positive()).max(250).default([]),
    history: z.enum(['ALL', 'FUTURE', '30', '90']).default('ALL'),
    createMissingContacts: z.boolean().default(false),
    answerMode: z.enum(['ALL', 'SELECTED', 'NONE']).default('ALL'),
    answerKeys: z.array(z.string().min(1).max(200)).max(100).default([]),
    answerMappings: z
      .array(
        z.object({
          sourceKey: z.string().min(1).max(200),
          targetField: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
        }),
      )
      .max(30)
      .default([]),
    paused: z.boolean().default(false),
  })
  .strict()
  .superRefine((settings, context) => {
    const fields = settings.answerMappings.map(
      (mapping) => mapping.targetField,
    );
    if (new Set(fields).size !== fields.length)
      context.addIssue({
        code: 'custom',
        message: 'Each target field can only be mapped once.',
      });
  });
export type ConnectionSettings = z.infer<typeof connectionSettingsSchema>;
export type StoredSettings = { revision: string; settings: ConnectionSettings };
export const DEFAULT_CONNECTION_SETTINGS = connectionSettingsSchema.parse({});
export type SyncStatus = {
  phase: 'IDLE' | 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  lastSuccessAt?: string;
  lastStartedAt?: string;
  error?: string;
  synced?: number;
  revision?: string;
};
export type ConnectionChoice = {
  id: string;
  name: string;
  scope: string;
  canManage: boolean;
};
export type EventTypeChoice = {
  id: number;
  title: string;
  slug: string;
  bookingUrl?: string;
  answerKeys: string[];
};
export type MappingField = { name: string; label: string };
export type SettingsResponse = {
  connections: ConnectionChoice[];
  connectionId?: string;
  settings?: ConnectionSettings;
  revision?: string;
  status?: SyncStatus;
  eventTypes?: EventTypeChoice[];
  mappingFields?: MappingField[];
  error?: string;
  queued?: boolean;
};
