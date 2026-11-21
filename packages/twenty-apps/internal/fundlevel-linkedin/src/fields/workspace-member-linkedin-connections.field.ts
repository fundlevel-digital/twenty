import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { OBJECT, REBUILD } from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: REBUILD.MEMBER_CONNECTIONS,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'ownedLinkedinConnections',
  label: 'Owned LinkedIn Connections',
  icon: 'IconUsers',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.CONNECTION,
  relationTargetFieldMetadataUniversalIdentifier: REBUILD.CONNECTION_OWNER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
