import {
  defineObject,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS, RELATION_FIELDS } from 'src/constants/identifiers';
export default defineObject({
  universalIdentifier: IDENTIFIERS.COMPANY_LINK,
  nameSingular: 'githubCompanyLink',
  namePlural: 'githubCompanyLinks',
  labelSingular: 'GitHub Profile Company Relation',
  labelPlural: 'GitHub Profile Company Relations',
  icon: 'IconBuildingSkyscraper',
  labelIdentifierFieldMetadataUniversalIdentifier: RELATION_FIELDS.company_name,
  fields: [
    {
      universalIdentifier: RELATION_FIELDS.company_name,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_FIELDS.company_linkKey,
      name: 'linkKey',
      label: 'Relation Key',
      type: FieldType.TEXT,
      isNullable: true,
      isUnique: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: RELATION_FIELDS.company_sourceField,
      name: 'sourceField',
      label: 'Source Field',
      type: FieldType.TEXT,
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: RELATION_FIELDS.company_githubProfile,
      name: 'githubProfile',
      label: 'GitHub Profile',
      type: FieldType.RELATION,
      icon: 'IconBrandGithub',
      isNullable: false,
      relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.PROFILE,
      relationTargetFieldMetadataUniversalIdentifier:
        IDENTIFIERS.PROFILE_COMPANIES,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.CASCADE,
        joinColumnName: 'githubProfileId',
      },
    },
    {
      universalIdentifier: RELATION_FIELDS.company_company,
      name: 'company',
      label: 'Company',
      type: FieldType.RELATION,
      icon: 'IconBuildingSkyscraper',
      isNullable: false,
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        IDENTIFIERS.COMPANY_REVERSE,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.CASCADE,
        joinColumnName: 'companyId',
      },
    },
  ],
});
