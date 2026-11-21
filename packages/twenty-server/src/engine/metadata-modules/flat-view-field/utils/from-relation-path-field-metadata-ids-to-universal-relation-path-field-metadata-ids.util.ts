import { isNonEmptyArray } from 'twenty-shared/utils';

import { type UniversalFlatViewField } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-view-field.type';

// An unknown id maps to null so the view field validator can reject the path with a clear error
export const fromRelationPathFieldMetadataIdsToUniversalRelationPathFieldMetadataIds =
  ({
    relationPathFieldMetadataIds,
    fieldMetadataUniversalIdentifierById,
  }: {
    relationPathFieldMetadataIds: string[] | null | undefined;
    fieldMetadataUniversalIdentifierById: Partial<Record<string, string>>;
  }): UniversalFlatViewField['universalRelationPathFieldMetadataIds'] => {
    if (!isNonEmptyArray(relationPathFieldMetadataIds)) {
      return null;
    }

    return relationPathFieldMetadataIds.map(
      (fieldMetadataId) =>
        fieldMetadataUniversalIdentifierById[fieldMetadataId] ?? null,
    );
  };
