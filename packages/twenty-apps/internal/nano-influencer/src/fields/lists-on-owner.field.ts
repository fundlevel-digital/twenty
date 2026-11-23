import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
export default defineField({
  universalIdentifier: IDENTIFIERS.ownerLists,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  name: 'nanoOwnedLists',
  label: 'Nano Lists',
  type: FieldType.RELATION,
  icon: 'IconList',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.list,
  relationTargetFieldMetadataUniversalIdentifier: IDENTIFIERS.listOwner,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
