import { Temporal } from 'temporal-polyfill';
import {
  FieldMetadataType,
  type RecordGqlOperationFilter,
} from 'twenty-shared/types';
import { buildDateFilterForDayGranularity } from '@/page-layout/widgets/graph/utils/buildDateFilterForDayGranularity';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { getFieldMetadataItemGqlFieldName } from '@/object-metadata/utils/getFieldMetadataItemGqlFieldName';
import { isDefined } from 'twenty-shared/utils';

export const buildRecordTableGroupByFilter = ({
  fields,
  subFieldName,
  value,
  timeZone = 'UTC',
}: {
  timeZone?: string;
  fields: FieldMetadataItem[];
  subFieldName?: string | null;
  value: string | number | boolean | null;
}): RecordGqlOperationFilter => {
  const leaf = fields.at(-1);
  if (!isDefined(leaf)) {
    return {};
  }
  const relations = fields.slice(0, -1);
  const wrap = (
    filter: RecordGqlOperationFilter,
    length = relations.length,
  ): RecordGqlOperationFilter =>
    relations
      .slice(0, length)
      .reduceRight<RecordGqlOperationFilter>(
        (inner, field) => ({ [field.name]: inner }),
        filter,
      );
  const comparison = value === null ? { is: 'NULL' } : { eq: value };
  let leafFilter: RecordGqlOperationFilter;
  if (
    value !== null &&
    [FieldMetadataType.DATE, FieldMetadataType.DATE_TIME].includes(leaf.type)
  ) {
    const day = Temporal.PlainDate.from(
      String(value).slice(0, 10),
    ).toZonedDateTime(timeZone);
    const dateFilters = buildDateFilterForDayGranularity(
      day,
      leaf.type,
      leaf.name,
    );
    leafFilter = {
      [leaf.name]:
        leaf.type === FieldMetadataType.DATE
          ? { eq: dateFilters[0].value }
          : { gte: dateFilters[0].value, lt: dateFilters[1].value },
    };
  } else {
    leafFilter = {
      [getFieldMetadataItemGqlFieldName(leaf)]: isDefined(subFieldName)
        ? { [subFieldName]: comparison }
        : comparison,
    };
  }
  if (value !== null || relations.length === 0) {
    return wrap(leafFilter);
  }
  return {
    or: [
      wrap(leafFilter),
      ...relations.map((field, index) =>
        wrap(
          { [getFieldMetadataItemGqlFieldName(field)]: { is: 'NULL' } },
          index,
        ),
      ),
    ],
  };
};
