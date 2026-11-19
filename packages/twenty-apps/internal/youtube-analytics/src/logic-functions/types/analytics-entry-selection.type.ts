export type AnalyticsEntrySelection =
  | { kind: 'calculationsEnabled' }
  | { kind: 'records'; entryIds: string[]; influencerIds: string[] };
