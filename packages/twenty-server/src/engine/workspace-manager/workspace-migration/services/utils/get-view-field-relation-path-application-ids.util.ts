import { isDefined } from 'twenty-shared/utils';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';

type ViewFieldRelationPathCandidate = {
  universalRelationPathFieldMetadataIds?: (string | null)[] | null;
};

// A relation path is no foreign key, so the applications owning its hop fields are not found through relations
export const getViewFieldRelationPathApplicationIds = ({
  flatFieldMetadataMaps,
  viewFieldOperations,
}: {
  flatFieldMetadataMaps:
    | {
        byUniversalIdentifier: Partial<
          Record<string, Pick<FlatFieldMetadata, 'applicationId'>>
        >;
      }
    | undefined;
  viewFieldOperations:
    | {
        flatEntityToCreate: Partial<
          Record<string, ViewFieldRelationPathCandidate>
        >;
        flatEntityToUpdate: Partial<
          Record<string, ViewFieldRelationPathCandidate>
        >;
      }
    | undefined;
}): string[] => {
  if (!isDefined(flatFieldMetadataMaps) || !isDefined(viewFieldOperations)) {
    return [];
  }

  const applicationIds = new Set<string>();

  for (const viewField of [
    ...Object.values(viewFieldOperations.flatEntityToCreate),
    ...Object.values(viewFieldOperations.flatEntityToUpdate),
  ]) {
    for (const hopUniversalIdentifier of viewField?.universalRelationPathFieldMetadataIds ??
      []) {
      if (!isDefined(hopUniversalIdentifier)) {
        continue;
      }

      const hopField =
        flatFieldMetadataMaps.byUniversalIdentifier[hopUniversalIdentifier];

      if (isDefined(hopField)) {
        applicationIds.add(hopField.applicationId);
      }
    }
  }

  return [...applicationIds];
};
