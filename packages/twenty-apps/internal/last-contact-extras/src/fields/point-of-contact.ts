import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: '49188aa9-e6f1-4ab0-b495-6cc74e75b8ec',
  name: 'pointOfContact',
  label: 'Point of Contact',
  type: FieldType.RELATION,
  icon: 'IconUser',
  isNullable: true,
  isUIEditable: false,
  isAuditLogged: false,
  description:
    'The latest contacted person linked to this production’s influencer.',
  objectUniversalIdentifier: '61612428-29da-427b-9a0b-249ca77c2439',
  relationTargetObjectMetadataUniversalIdentifier:
    '20202020-e674-48e5-a542-72570eee7213',
  relationTargetFieldMetadataUniversalIdentifier:
    '50617f6b-fe33-43a7-82be-5956c2bd3e34',
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'pointOfContactId',
  },
});
