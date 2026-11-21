import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type MetadataUniversalFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/metadata-universal-flat-entity.type';
import {
  type BuildSideEffectsArgs,
  MetadataSideEffectHandler,
} from 'src/engine/metadata-modules/metadata-side-effect/interfaces/base-metadata-side-effect-handler.service';
import { getUniversalFlatViewFieldLookupFieldMetadataUniversalIdentifiers } from 'src/engine/metadata-modules/metadata-side-effect/handlers/utils/get-universal-flat-view-field-lookup-field-metadata-universal-identifiers.util';
import { type MetadataSideEffectResult } from 'src/engine/metadata-modules/metadata-side-effect/types/metadata-side-effect-result.type';

@Injectable()
export class FieldLookupViewFieldsOnDeleteSideEffectHandlerService extends MetadataSideEffectHandler(
  {
    operation: 'delete',
    metadataName: 'fieldMetadata',
    name: 'fieldLookupViewFieldsOnDelete',
    description:
      'When a field is deleted, delete every lookup view field whose relation path goes through it or whose shown related field it is. The path is stored as jsonb, so no foreign key cascades it.',
  },
) {
  buildSideEffects({
    flatEntity: flatFieldMetadata,
    relatedFlatEntityMaps,
  }: BuildSideEffectsArgs<'fieldMetadata'>): MetadataSideEffectResult {
    const viewFieldsToDelete: Record<
      string,
      MetadataUniversalFlatEntity<'viewField'>
    > = {};

    for (const flatViewField of Object.values(
      relatedFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )) {
      if (
        isDefined(flatViewField) &&
        getUniversalFlatViewFieldLookupFieldMetadataUniversalIdentifiers(
          flatViewField,
        ).includes(flatFieldMetadata.universalIdentifier)
      ) {
        viewFieldsToDelete[flatViewField.universalIdentifier] = flatViewField;
      }
    }

    if (Object.keys(viewFieldsToDelete).length === 0) {
      return { status: 'noop' };
    }

    return {
      status: 'success',
      operations: {
        viewField: { flatEntityToDelete: viewFieldsToDelete },
      },
    };
  }
}
