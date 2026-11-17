import { isDefined } from 'twenty-shared/utils';

import { type UniversalFlatViewField } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-view-field.type';

// A null path entry is a hop field that no longer exists
export const getUniversalFlatViewFieldLookupFieldMetadataUniversalIdentifiers =
  (
    universalFlatViewField: Pick<
      UniversalFlatViewField,
      | 'relationTargetFieldMetadataUniversalIdentifier'
      | 'universalRelationPathFieldMetadataIds'
    >,
  ): (string | null)[] =>
    isDefined(
      universalFlatViewField.relationTargetFieldMetadataUniversalIdentifier,
    )
      ? [
          ...(universalFlatViewField.universalRelationPathFieldMetadataIds ??
            []),
          universalFlatViewField.relationTargetFieldMetadataUniversalIdentifier,
        ]
      : [];
