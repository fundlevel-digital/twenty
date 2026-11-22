import { z } from 'zod';
export const preferenceDefinitions = [
  {
    key: 'PERSON_CREATION_POLICY',
    label: 'Person Auto-Creation',
    description:
      'Existing People are matched by email in every mode. New People follow this policy on the next sync.',
    defaultValue: 'NONE',
    options: [
      { value: 'NONE', label: "Don't Create" },
      { value: 'FAVOURITES', label: 'Only Favourites' },
      { value: 'ALL', label: 'Auto Create All' },
    ],
  },
  {
    key: 'REMOVED_ENTRY_POLICY',
    label: 'Removed Nano Entries',
    description:
      'After a complete list read, keep removed memberships or move them to Trash. Creators and People are preserved.',
    defaultValue: 'KEEP',
    options: [
      { value: 'KEEP', label: 'Keep In Twenty' },
      { value: 'TRASH', label: 'Move Memberships To Trash' },
    ],
  },
  {
    key: 'REMOVED_LIST_POLICY',
    label: 'Deleted Nano Lists',
    description:
      'When a list disappears from an account that was read successfully, keep it or move the list and its memberships to Trash.',
    defaultValue: 'KEEP',
    options: [
      { value: 'KEEP', label: 'Keep In Twenty' },
      { value: 'TRASH', label: 'Move To Trash' },
    ],
  },
  {
    key: 'SYNC_SCHEDULE',
    label: 'Automatic Sync',
    description:
      'Daily sync runs at 04:00 UTC while this instance is running. Lists and memberships refresh automatically. Profile enrichment runs separately.',
    defaultValue: 'MANUAL',
    options: [
      { value: 'MANUAL', label: 'Manual Only' },
      { value: 'DAILY', label: 'Daily At 04:00 UTC' },
    ],
  },
] as const;
export const getNanoPreferences = () => ({
  personCreationPolicy: z
    .enum(['NONE', 'FAVOURITES', 'ALL'])
    .catch('NONE')
    .parse(process.env.PERSON_CREATION_POLICY),
  removedEntryPolicy: z
    .enum(['KEEP', 'TRASH'])
    .catch('KEEP')
    .parse(process.env.REMOVED_ENTRY_POLICY),
  removedListPolicy: z
    .enum(['KEEP', 'TRASH'])
    .catch('KEEP')
    .parse(process.env.REMOVED_LIST_POLICY),
  syncSchedule: z
    .enum(['MANUAL', 'DAILY'])
    .catch('MANUAL')
    .parse(process.env.SYNC_SCHEDULE),
});
