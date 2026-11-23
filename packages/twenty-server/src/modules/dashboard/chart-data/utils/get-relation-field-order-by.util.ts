import {
  type ObjectRecordGroupByDateGranularity,
  type ObjectRecordOrderByForRelationField,
  type ObjectRecordOrderByForScalarField,
  type ObjectRecordOrderByWithGroupByDateField,
  type OrderByDirection,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { GRAPH_DEFAULT_DATE_GRANULARITY } from 'src/modules/dashboard/chart-data/constants/graph-default-date-granularity.constant';
import { getBareRelationOrderBy } from 'src/modules/dashboard/chart-data/utils/get-bare-relation-order-by.util';

export const getRelationFieldOrderBy = ({
  groupByFieldMetadata,
  groupBySubFieldName,
  direction,
  dateGranularity,
  isNestedDateField,
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
}: {
  groupByFieldMetadata: FlatFieldMetadata;
  groupBySubFieldName: string | null | undefined;
  direction: OrderByDirection;
  dateGranularity?: ObjectRecordGroupByDateGranularity;
  isNestedDateField?: boolean;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
}): Array<
  ObjectRecordOrderByForScalarField | ObjectRecordOrderByForRelationField
> => {
  if (!isDefined(groupBySubFieldName)) {
    return getBareRelationOrderBy({
      groupByFieldMetadata,
      direction,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
    });
  }

  const parts = groupBySubFieldName.split('.');
  const leafFieldName = parts.pop();
  if (!leafFieldName) {
    return [];
  }
  let nested:
    | ObjectRecordOrderByForScalarField
    | ObjectRecordOrderByForRelationField
    | ObjectRecordOrderByWithGroupByDateField =
    isNestedDateField === true || isDefined(dateGranularity)
      ? {
          [leafFieldName]: {
            orderBy: direction,
            granularity: dateGranularity ?? GRAPH_DEFAULT_DATE_GRANULARITY,
          },
        }
      : { [leafFieldName]: direction };
  for (const name of parts.reverse()) {
    nested = { [name]: nested };
  }
  return [{ [groupByFieldMetadata.name]: nested }];
};
