import { type BuildSideEffectsArgs } from 'src/engine/metadata-modules/metadata-side-effect/interfaces/base-metadata-side-effect-handler.service';
import { FieldLookupViewFieldsOnDeleteSideEffectHandlerService } from 'src/engine/metadata-modules/metadata-side-effect/handlers/field-metadata/services/field-lookup-view-fields-on-delete-side-effect-handler.service';

const buildLookupViewField = ({
  universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier,
  universalRelationPathFieldMetadataIds,
}: {
  universalIdentifier: string;
  relationTargetFieldMetadataUniversalIdentifier: string | null;
  universalRelationPathFieldMetadataIds: string[] | null;
}) => ({
  universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier,
  universalRelationPathFieldMetadataIds,
});

const lookupThroughHop = buildLookupViewField({
  universalIdentifier: 'lookup-through-hop',
  relationTargetFieldMetadataUniversalIdentifier: 'subject-field',
  universalRelationPathFieldMetadataIds: ['contact-links-field', 'hop-field'],
});
const lookupOnTarget = buildLookupViewField({
  universalIdentifier: 'lookup-on-target',
  relationTargetFieldMetadataUniversalIdentifier: 'hop-field',
  universalRelationPathFieldMetadataIds: null,
});
const unrelatedLookup = buildLookupViewField({
  universalIdentifier: 'unrelated-lookup',
  relationTargetFieldMetadataUniversalIdentifier: 'subject-field',
  universalRelationPathFieldMetadataIds: ['contact-links-field'],
});
const plainViewField = buildLookupViewField({
  universalIdentifier: 'plain-view-field',
  relationTargetFieldMetadataUniversalIdentifier: null,
  universalRelationPathFieldMetadataIds: null,
});

const buildSideEffects = (fieldUniversalIdentifier: string) =>
  new FieldLookupViewFieldsOnDeleteSideEffectHandlerService().buildSideEffects({
    flatEntity: { universalIdentifier: fieldUniversalIdentifier },
    relatedFlatEntityMaps: {
      flatViewFieldMaps: {
        byUniversalIdentifier: Object.fromEntries(
          [
            lookupThroughHop,
            lookupOnTarget,
            unrelatedLookup,
            plainViewField,
          ].map((viewField) => [viewField.universalIdentifier, viewField]),
        ),
      },
    },
  } as unknown as BuildSideEffectsArgs<'fieldMetadata'>);

describe('FieldLookupViewFieldsOnDeleteSideEffectHandlerService', () => {
  it('deletes lookup columns whose path or shown field is the deleted field', () => {
    const result = buildSideEffects('hop-field');

    expect(result.status).toBe('success');
    expect(
      result.status === 'success'
        ? Object.keys(result.operations.viewField?.flatEntityToDelete ?? {})
        : [],
    ).toEqual(['lookup-through-hop', 'lookup-on-target']);
  });

  it('does nothing when no lookup column uses the deleted field', () => {
    expect(buildSideEffects('unused-field')).toEqual({ status: 'noop' });
  });
});
