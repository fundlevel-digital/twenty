import { defineObject, FieldType, RelationType } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineObject({
  universalIdentifier: 'c998e4e3-c344-598a-b252-5853aaac3fb7',
  nameSingular: 'nanoDiscovery',
  namePlural: 'nanoDiscoveries',
  labelSingular: 'Nano Search Result',
  labelPlural: 'Nano Search Results',
  icon: 'IconUserSearch',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier:
    '57e3eb72-3fcb-59d5-b911-92508755c1ff',
  fields: [
    {
      universalIdentifier: IDENTIFIERS.discoveryRawResult,
      name: 'rawNanoResult',
      label: 'Raw Nano Result',
      type: FieldType.RAW_JSON,
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: '57e3eb72-3fcb-59d5-b911-92508755c1ff',
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier: '8a017371-9a26-5c97-9d77-5adc12fa3d89',
      name: 'externalKey',
      isUIEditable: false,
      label: 'Discovery ID',
      type: FieldType.TEXT,
      icon: 'IconAbc',
      isNullable: true,
      isUnique: true,
    },
    {
      universalIdentifier: '2f849835-5562-5c30-8e07-8f68b9534a84',
      name: 'creator',
      label: 'Creator',
      type: FieldType.RELATION,
      isNullable: true,
      relationTargetObjectMetadataUniversalIdentifier:
        '60893d01-3a14-5663-a7b2-679ee538a60e',
      relationTargetFieldMetadataUniversalIdentifier:
        'c1197593-e4eb-5ca8-85ae-f47f470e4879',
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        joinColumnName: 'creatorId',
      },
    },
    {
      universalIdentifier: '59920c57-a393-508f-9212-47a93a2dfcd1',
      name: 'nanoSearch',
      label: 'Search',
      type: FieldType.RELATION,
      isNullable: true,
      relationTargetObjectMetadataUniversalIdentifier:
        '38ce9e86-d7bb-5021-b9e2-5171186935ba',
      relationTargetFieldMetadataUniversalIdentifier:
        '5ceeec83-0b14-5bd4-b5e5-271a0fa82f25',
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        joinColumnName: 'nanoSearchId',
      },
    },
  ],
});
