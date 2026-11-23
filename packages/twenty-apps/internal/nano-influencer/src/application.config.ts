import { defineApplication, FieldType } from 'twenty-sdk/define';
import { IDENTIFIERS } from './constants/identifiers';
import { preferenceDefinitions } from './utils/preferences';

export default defineApplication({
  universalIdentifier: IDENTIFIERS.application,
  displayName: 'NanoInfluencer',
  logo: 'public/nano-influencer.jpeg',
  author: 'Fundlevel',
  category: 'Enrichment',
  description:
    'Sync Nano lists and creators, manage favourites and hides, and find lookalike creators.',
  applicationVariables: {
    ...Object.fromEntries(
      preferenceDefinitions.map((preference, index) => [
        preference.key,
        {
          universalIdentifier: [
            IDENTIFIERS.personCreationVariable,
            IDENTIFIERS.removedEntryVariable,
            IDENTIFIERS.removedListVariable,
            IDENTIFIERS.syncScheduleVariable,
          ][index],
          label: preference.label,
          description: preference.description,
          type: FieldType.SELECT,
          options: [...preference.options],
          value: preference.defaultValue,
          isSecret: false,
        },
      ]),
    ),
    NANOINFLUENCER_API_TOKEN: {
      universalIdentifier: '0c412729-1e8f-57bb-9f65-672c18cb38a2',
      label: 'Legacy NanoInfluencer Session Token',
      description:
        'The raw __Secure-next-auth.session-token cookie value from NanoInfluencer.',
      isSecret: true,
      isRequired: false,
    },
  },
});
