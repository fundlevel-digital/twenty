import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
export default defineField({
  universalIdentifier: IDENTIFIERS.personCreators,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'nanoCreators',
  label: 'Nano Creators',
  type: FieldType.RELATION,
  icon: 'IconUser',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.creator,
  relationTargetFieldMetadataUniversalIdentifier: IDENTIFIERS.creatorPerson,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
