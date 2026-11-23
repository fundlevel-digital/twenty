import { defineIndex } from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineIndex({
  universalIdentifier: '64281aef-bdc0-4c93-bea9-30fa77f11676',
  objectUniversalIdentifier: IDENTIFIERS.COMPANY_LINK,
  isUnique: true,
  fields: [
    {
      universalIdentifier: '8efeb672-596c-4a5d-a997-00b8970c7df3',
      fieldUniversalIdentifier: RELATION_FIELDS.company_githubProfile,
    },
    {
      universalIdentifier: '08186901-f500-4c3c-bfcf-e98ac35b5afc',
      fieldUniversalIdentifier: RELATION_FIELDS.company_company,
    },
  ],
});
