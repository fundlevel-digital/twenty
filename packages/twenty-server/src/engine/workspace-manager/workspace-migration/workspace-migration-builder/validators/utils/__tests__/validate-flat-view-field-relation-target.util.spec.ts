import { FieldMetadataType, RelationType } from 'twenty-shared/types';

import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';
import { validateFlatViewFieldRelationTarget } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/validators/utils/validate-flat-view-field-relation-target.util';

const buildRelationField = ({
  universalIdentifier,
  objectMetadataUniversalIdentifier,
  relationTargetObjectMetadataUniversalIdentifier,
  relationType,
  type = FieldMetadataType.RELATION,
  isActive = true,
}: {
  universalIdentifier: string;
  objectMetadataUniversalIdentifier: string;
  relationTargetObjectMetadataUniversalIdentifier: string;
  relationType: RelationType;
  type?: FieldMetadataType;
  isActive?: boolean;
}) =>
  ({
    universalIdentifier,
    type,
    isActive,
    universalSettings: { relationType },
    objectMetadataUniversalIdentifier,
    relationTargetObjectMetadataUniversalIdentifier,
  }) as UniversalFlatFieldMetadata;

const buildScalarField = ({
  universalIdentifier,
  objectMetadataUniversalIdentifier,
  isActive = true,
}: {
  universalIdentifier: string;
  objectMetadataUniversalIdentifier: string;
  isActive?: boolean;
}) =>
  ({
    universalIdentifier,
    type: FieldMetadataType.TEXT,
    isActive,
    objectMetadataUniversalIdentifier,
  }) as UniversalFlatFieldMetadata;

// production > influencer > contactLinks > person > lastEmail > subject
const productionInfluencerField = buildRelationField({
  universalIdentifier: 'production-influencer',
  objectMetadataUniversalIdentifier: 'production',
  relationTargetObjectMetadataUniversalIdentifier: 'influencer',
  relationType: RelationType.MANY_TO_ONE,
});
const influencerContactLinksField = buildRelationField({
  universalIdentifier: 'influencer-contact-links',
  objectMetadataUniversalIdentifier: 'influencer',
  relationTargetObjectMetadataUniversalIdentifier: 'influencer-contact',
  relationType: RelationType.ONE_TO_MANY,
});
const influencerContactPersonField = buildRelationField({
  universalIdentifier: 'influencer-contact-person',
  objectMetadataUniversalIdentifier: 'influencer-contact',
  relationTargetObjectMetadataUniversalIdentifier: 'person',
  relationType: RelationType.MANY_TO_ONE,
});
const personLastEmailField = buildRelationField({
  universalIdentifier: 'person-last-email',
  objectMetadataUniversalIdentifier: 'person',
  relationTargetObjectMetadataUniversalIdentifier: 'message',
  relationType: RelationType.MANY_TO_ONE,
});
const messageSubjectField = buildScalarField({
  universalIdentifier: 'message-subject',
  objectMetadataUniversalIdentifier: 'message',
});
const influencerNameField = buildScalarField({
  universalIdentifier: 'influencer-name',
  objectMetadataUniversalIdentifier: 'influencer',
});
const influencerContactRoleField = buildScalarField({
  universalIdentifier: 'influencer-contact-role',
  objectMetadataUniversalIdentifier: 'influencer-contact',
});
const personInactiveCompanyField = buildRelationField({
  universalIdentifier: 'person-inactive-company',
  objectMetadataUniversalIdentifier: 'person',
  relationTargetObjectMetadataUniversalIdentifier: 'company',
  relationType: RelationType.MANY_TO_ONE,
  isActive: false,
});
const personMorphTargetField = buildRelationField({
  universalIdentifier: 'person-morph-target',
  objectMetadataUniversalIdentifier: 'person',
  relationTargetObjectMetadataUniversalIdentifier: 'message',
  relationType: RelationType.MANY_TO_ONE,
  type: FieldMetadataType.MORPH_RELATION,
});
const influencerProductionsField = buildRelationField({
  universalIdentifier: 'influencer-productions',
  objectMetadataUniversalIdentifier: 'influencer',
  relationTargetObjectMetadataUniversalIdentifier: 'production',
  relationType: RelationType.ONE_TO_MANY,
});

const flatFieldMetadataMaps = {
  byUniversalIdentifier: Object.fromEntries(
    [
      productionInfluencerField,
      influencerContactLinksField,
      influencerContactPersonField,
      personLastEmailField,
      messageSubjectField,
      influencerNameField,
      influencerContactRoleField,
      personInactiveCompanyField,
      personMorphTargetField,
      influencerProductionsField,
    ].map((flatFieldMetadata) => [
      flatFieldMetadata.universalIdentifier,
      flatFieldMetadata,
    ]),
  ),
};

const validate = ({
  flatFieldMetadata = productionInfluencerField,
  isCanonical = false,
  relationTargetFieldMetadataUniversalIdentifier = 'message-subject',
  universalRelationPathFieldMetadataIds = [
    'influencer-contact-links',
    'influencer-contact-person',
    'person-last-email',
  ],
}: {
  flatFieldMetadata?: UniversalFlatFieldMetadata;
  isCanonical?: boolean;
  relationTargetFieldMetadataUniversalIdentifier?: string | null;
  universalRelationPathFieldMetadataIds?: (string | null)[] | null;
}) =>
  validateFlatViewFieldRelationTarget({
    flatViewField: {
      isCanonical,
      relationTargetFieldMetadataUniversalIdentifier,
      universalRelationPathFieldMetadataIds,
    },
    flatFieldMetadata,
    flatFieldMetadataMaps,
  });

describe('validateFlatViewFieldRelationTarget', () => {
  it('accepts a path across many-to-one and one-to-many relations', () => {
    expect(validate({})).toEqual([]);
  });

  it('accepts a one-hop lookup on a many-to-one relation', () => {
    expect(
      validate({
        relationTargetFieldMetadataUniversalIdentifier: 'influencer-name',
        universalRelationPathFieldMetadataIds: null,
      }),
    ).toEqual([]);
  });

  it('accepts a one-hop lookup on a one-to-many relation', () => {
    expect(
      validate({
        flatFieldMetadata: influencerContactLinksField,
        relationTargetFieldMetadataUniversalIdentifier:
          'influencer-contact-role',
        universalRelationPathFieldMetadataIds: [],
      }),
    ).toEqual([]);
  });

  it('accepts a view field without lookup', () => {
    expect(
      validate({
        isCanonical: true,
        relationTargetFieldMetadataUniversalIdentifier: null,
        universalRelationPathFieldMetadataIds: null,
      }),
    ).toEqual([]);
  });

  it.each([
    {
      title: 'a path without a related record field',
      args: { relationTargetFieldMetadataUniversalIdentifier: null },
      expectedMessage: 'needs a related record field',
    },
    {
      title: 'a canonical column',
      args: { isCanonical: true },
      expectedMessage: 'Only non-canonical view fields',
    },
    {
      title: 'more than five relations',
      args: {
        relationTargetFieldMetadataUniversalIdentifier: 'influencer-name',
        universalRelationPathFieldMetadataIds: [
          'influencer-productions',
          'production-influencer',
          'influencer-productions',
          'production-influencer',
          'influencer-productions',
        ],
      },
      expectedMessage: 'at most 5 relations away',
    },
    {
      title: 'a column on a non-relation field',
      args: { flatFieldMetadata: influencerNameField },
      expectedMessage: 'many-to-one or one-to-many relation field',
    },
    {
      title: 'a path field missing from the workspace',
      args: {
        universalRelationPathFieldMetadataIds: [
          'influencer-contact-links',
          null,
          'person-last-email',
        ],
      },
      expectedMessage: 'object the previous relation points to',
    },
    {
      title: 'a path field on another object',
      args: {
        universalRelationPathFieldMetadataIds: [
          'influencer-contact-person',
          'person-last-email',
        ],
      },
      expectedMessage: 'object the previous relation points to',
    },
    {
      title: 'a morph relation in the path',
      args: {
        universalRelationPathFieldMetadataIds: [
          'influencer-contact-links',
          'influencer-contact-person',
          'person-morph-target',
        ],
      },
      expectedMessage: 'must be a many-to-one or one-to-many relation field',
    },
    {
      title: 'a deactivated path field',
      args: {
        relationTargetFieldMetadataUniversalIdentifier: 'influencer-name',
        universalRelationPathFieldMetadataIds: [
          'influencer-contact-links',
          'influencer-contact-person',
          'person-inactive-company',
        ],
      },
      expectedMessage: 'Each relation path field must be active',
    },
    {
      title: 'a path through two one-to-many relations',
      args: {
        relationTargetFieldMetadataUniversalIdentifier:
          'influencer-contact-role',
        universalRelationPathFieldMetadataIds: [
          'influencer-productions',
          'production-influencer',
          'influencer-contact-links',
        ],
      },
      expectedMessage: 'at most one one-to-many relation',
    },
    {
      title: 'a related record field off the end of the path',
      args: {
        relationTargetFieldMetadataUniversalIdentifier: 'influencer-name',
      },
      expectedMessage: 'must belong to the relation target object',
    },
    {
      title: 'a related record field that is a relation',
      args: {
        relationTargetFieldMetadataUniversalIdentifier: 'person-last-email',
        universalRelationPathFieldMetadataIds: [
          'influencer-contact-links',
          'influencer-contact-person',
        ],
      },
      expectedMessage: 'cannot be a relation',
    },
  ])('rejects $title', ({ args, expectedMessage }) => {
    expect(validate(args)).toMatchObject([
      { message: expect.stringContaining(expectedMessage) },
    ]);
  });

  it('rejects a deactivated related record field', () => {
    expect(
      validateFlatViewFieldRelationTarget({
        flatViewField: {
          isCanonical: false,
          relationTargetFieldMetadataUniversalIdentifier: 'inactive-name',
          universalRelationPathFieldMetadataIds: null,
        },
        flatFieldMetadata: productionInfluencerField,
        flatFieldMetadataMaps: {
          byUniversalIdentifier: {
            'inactive-name': buildScalarField({
              universalIdentifier: 'inactive-name',
              objectMetadataUniversalIdentifier: 'influencer',
              isActive: false,
            }),
          },
        },
      }),
    ).toMatchObject([{ message: expect.stringContaining('must be active') }]);
  });
});
