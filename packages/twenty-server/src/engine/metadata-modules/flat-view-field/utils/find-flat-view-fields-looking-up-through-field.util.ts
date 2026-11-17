import { isDefined } from 'twenty-shared/utils';

import { type FlatViewFieldMaps } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field-maps.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';

// The lookup target and path have no inverse relation on field metadata, so they are scanned
export const findFlatViewFieldsLookingUpThroughField = ({
  fieldMetadataId,
  flatViewFieldMaps,
}: {
  fieldMetadataId: string;
  flatViewFieldMaps: FlatViewFieldMaps;
}): FlatViewField[] =>
  Object.values(flatViewFieldMaps.byUniversalIdentifier).filter(
    (flatViewField): flatViewField is FlatViewField =>
      isDefined(flatViewField) &&
      (flatViewField.relationTargetFieldMetadataId === fieldMetadataId ||
        (flatViewField.relationPathFieldMetadataIds ?? []).includes(
          fieldMetadataId,
        )),
  );
