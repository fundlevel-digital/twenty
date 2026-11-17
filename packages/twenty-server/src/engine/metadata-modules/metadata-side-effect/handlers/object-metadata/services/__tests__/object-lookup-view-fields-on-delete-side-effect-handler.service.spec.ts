import { type BuildSideEffectsArgs } from 'src/engine/metadata-modules/metadata-side-effect/interfaces/base-metadata-side-effect-handler.service';
import { ObjectLookupViewFieldsOnDeleteSideEffectHandlerService } from 'src/engine/metadata-modules/metadata-side-effect/handlers/object-metadata/services/object-lookup-view-fields-on-delete-side-effect-handler.service';

const flatFieldMetadatas = [
  {
    universalIdentifier: 'contact-links-field',
    objectMetadataUniversalIdentifier: 'influencer',
    relationTargetObjectMetadataUniversalIdentifier: 'influencer-contact',
  },
  {
    universalIdentifier: 'person-field',
    objectMetadataUniversalIdentifier: 'influencer-contact',
    relationTargetObjectMetadataUniversalIdentifier: 'person',
  },
  {
    universalIdentifier: 'job-title-field',
    objectMetadataUniversalIdentifier: 'person',
    relationTargetObjectMetadataUniversalIdentifier: null,
  },
  {
    universalIdentifier: 'name-field',
    objectMetadataUniversalIdentifier: 'influencer-contact',
    relationTargetObjectMetadataUniversalIdentifier: null,
  },
];

const viewFields = [
  {
    universalIdentifier: 'lookup-through-person',
    relationTargetFieldMetadataUniversalIdentifier: 'job-title-field',
    universalRelationPathFieldMetadataIds: [
      'contact-links-field',
      'person-field',
    ],
  },
  {
    universalIdentifier: 'lookup-before-person',
    relationTargetFieldMetadataUniversalIdentifier: 'name-field',
    universalRelationPathFieldMetadataIds: ['contact-links-field'],
  },
  {
    universalIdentifier: 'lookup-with-missing-hop',
    relationTargetFieldMetadataUniversalIdentifier: 'name-field',
    universalRelationPathFieldMetadataIds: [null],
  },
];

const buildSideEffects = (objectUniversalIdentifier: string) =>
  new ObjectLookupViewFieldsOnDeleteSideEffectHandlerService().buildSideEffects(
    {
      flatEntity: { universalIdentifier: objectUniversalIdentifier },
      relatedFlatEntityMaps: {
        flatFieldMetadataMaps: {
          byUniversalIdentifier: Object.fromEntries(
            flatFieldMetadatas.map((flatFieldMetadata) => [
              flatFieldMetadata.universalIdentifier,
              flatFieldMetadata,
            ]),
          ),
        },
        flatViewFieldMaps: {
          byUniversalIdentifier: Object.fromEntries(
            viewFields.map((viewField) => [
              viewField.universalIdentifier,
              viewField,
            ]),
          ),
        },
      },
    } as unknown as BuildSideEffectsArgs<'objectMetadata'>,
  );

describe('ObjectLookupViewFieldsOnDeleteSideEffectHandlerService', () => {
  it('deletes lookup columns going through the deleted object and those with a missing hop', () => {
    const result = buildSideEffects('person');

    expect(result.status).toBe('success');
    expect(
      result.status === 'success'
        ? Object.keys(result.operations.viewField?.flatEntityToDelete ?? {})
        : [],
    ).toEqual(['lookup-through-person', 'lookup-with-missing-hop']);
  });
});
