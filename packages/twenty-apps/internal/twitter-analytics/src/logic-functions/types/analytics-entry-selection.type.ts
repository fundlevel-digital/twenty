export type AnalyticsEntrySelection =
  | { kind: 'calculationsEnabled' }
  | { kind: 'records'; profileIds: string[] };
