import {
  defineObject,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineObject({
  universalIdentifier: IDENTIFIERS.PERSON_LINK,
  nameSingular: 'githubPersonLink',
  namePlural: 'githubPersonLinks',
  labelSingular: 'GitHub Profile Person Relation',
  labelPlural: 'GitHub Profile Person Relations',
  icon: 'IconUser',
  labelIdentifierFieldMetadataUniversalIdentifier: RELATION_FIELDS.person_name,
  fields: [
    {
      universalIdentifier: RELATION_FIELDS.person_name,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_FIELDS.person_linkKey,
      name: 'linkKey',
      label: 'Relation Key',
      type: FieldType.TEXT,
      isNullable: true,
      isUnique: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: RELATION_FIELDS.person_sourceField,
      name: 'sourceField',
      label: 'Source Field',
      type: FieldType.TEXT,
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: RELATION_FIELDS.person_githubProfile,
      name: 'githubProfile',
      label: 'GitHub Profile',
      type: FieldType.RELATION,
      icon: 'IconBrandGithub',
      isNullable: false,
      relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.PROFILE,
      relationTargetFieldMetadataUniversalIdentifier:
        IDENTIFIERS.PROFILE_PEOPLE,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.CASCADE,
        joinColumnName: 'githubProfileId',
      },
    },
    {
      universalIdentifier: RELATION_FIELDS.person_person,
      name: 'person',
      label: 'Person',
      type: FieldType.RELATION,
      icon: 'IconUser',
      isNullable: false,
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        IDENTIFIERS.PERSON_REVERSE,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.CASCADE,
        joinColumnName: 'personId',
      },
    },
  ],
});
