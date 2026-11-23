import { z } from 'zod';

export const groupSchema = z
  .object({
    id: z.string().uuid(),
    email: z.email().transform((value) => value.toLowerCase()),
    name: z.string().trim().min(1).max(100),
    visibility: z.enum(['SHARE_EVERYTHING', 'SUBJECT', 'METADATA']),
    enabled: z.boolean(),
  })
  .strict();

export const settingsSchema = z
  .object({
    connectionId: z.string().uuid().nullable(),
    paused: z.boolean(),
    historyDays: z.enum(['7', '30', '90', '365', 'all']),
    contactCreation: z
      .enum(['NONE', 'SENDERS', 'RECIPIENTS', 'EVERYONE'])
      .default('NONE'),
    groups: z.array(groupSchema).max(30),
  })
  .strict()
  .refine(
    (settings) =>
      new Set(settings.groups.map((group) => group.email)).size ===
      settings.groups.length,
    'Each Group address must be unique.',
  );

export type GroupSettings = z.infer<typeof groupSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Preferences = { revision: string; settings: Settings };
export type SyncState = {
  revision: string;
  phase: 'IDLE' | 'BACKFILL' | 'SYNCING' | 'ERROR';
  pageToken?: string;
  historyId?: string;
  historyPageToken?: string;
  backfillStartedAt?: number;
  imported: number;
  lastSuccess?: string;
  error?: string;
};
export type SettingsResponse = Preferences & {
  canManage: boolean;
  connections: {
    id: string;
    name: string;
    handle: string;
    needsReconnect: boolean;
  }[];
  channels: {
    id: string;
    handle: string;
    displayName: string | null;
    visibility: string;
  }[];
  status: SyncState | null;
  error?: string;
};

export const DEFAULT_SETTINGS: Settings = {
  connectionId: null,
  paused: true,
  historyDays: '30',
  contactCreation: 'NONE',
  groups: [],
};
