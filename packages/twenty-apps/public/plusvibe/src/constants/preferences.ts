export type PlusvibePreferences = {
  autoCreatePeople: boolean;
  uniboxVisibility: 'METADATA' | 'SUBJECT' | 'SHARE_EVERYTHING';
};
export const DEFAULT_PREFERENCES: PlusvibePreferences = {
  autoCreatePeople: true,
  uniboxVisibility: 'METADATA',
};
