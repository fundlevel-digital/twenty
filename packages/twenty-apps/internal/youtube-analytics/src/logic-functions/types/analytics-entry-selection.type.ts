export type AnalyticsEntrySelection =
  | { kind: 'calculationsEnabled' }
  | { kind: 'records'; channelIds: string[] };
