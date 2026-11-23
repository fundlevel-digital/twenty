import { defineIndex } from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineIndex({
  universalIdentifier: 'e6216550-6e74-4f40-afdf-d31d7fdf774e',
  objectUniversalIdentifier: IDENTIFIERS.PERSON_LINK,
  isUnique: true,
  fields: [
    {
      universalIdentifier: '19580707-5b5f-4ec5-8cea-d408ac26c9ff',
      fieldUniversalIdentifier: RELATION_FIELDS.person_githubProfile,
    },
    {
      universalIdentifier: '0597ab3b-e699-4227-9f33-dc147ab98a20',
      fieldUniversalIdentifier: RELATION_FIELDS.person_person,
    },
  ],
});
