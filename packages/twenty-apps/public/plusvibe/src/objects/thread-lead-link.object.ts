import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  THREAD_LEAD_LINK_NAME_UNIVERSAL_IDENTIFIER,
  THREAD_LEAD_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineObject({
  universalIdentifier: THREAD_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeThreadLead',
  namePlural: 'plusvibeThreadLeads',
  labelSingular: 'PlusVibe Thread Lead',
  labelPlural: 'PlusVibe Thread Leads',
  icon: 'IconArrowsShuffle',
  isSearchable: false,
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    THREAD_LEAD_LINK_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: THREAD_LEAD_LINK_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
      isUIEditable: false,
    },
  ],
});
