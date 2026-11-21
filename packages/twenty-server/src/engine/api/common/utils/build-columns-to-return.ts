import { buildColumnsToSelect } from 'src/engine/api/common/utils/build-columns-to-select';
import { getFlatFieldsFromFlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/utils/get-flat-fields-for-flat-object-metadata.util';
import { isComputedField } from 'twenty-shared/utils';

export const buildColumnsToReturn = (
  buildColumnsToSelectArguments: Parameters<typeof buildColumnsToSelect>[0],
): string[] => {
  const computedFieldNames = new Set(
    getFlatFieldsFromFlatObjectMetadata(
      buildColumnsToSelectArguments.flatObjectMetadata,
      buildColumnsToSelectArguments.flatFieldMetadataMaps,
    )
      .filter(isComputedField)
      .map(({ name }) => name),
  );

  return Object.keys(
    buildColumnsToSelect(buildColumnsToSelectArguments),
  ).filter((columnName) => !computedFieldNames.has(columnName));
};
