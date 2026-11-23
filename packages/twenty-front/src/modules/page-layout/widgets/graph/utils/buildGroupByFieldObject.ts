import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { isCompositeFieldType } from '@/object-record/object-filter-dropdown/utils/isCompositeFieldType';
import { isFieldMorphRelation } from '@/object-record/record-field/ui/types/guards/isFieldMorphRelation';
import { isFieldRelation } from '@/object-record/record-field/ui/types/guards/isFieldRelation';
import {
  CalendarStartDay,
  GROUP_BY_DATE_GRANULARITY_THAT_REQUIRE_TIME_ZONE,
} from 'twenty-shared/constants';
import {
  FirstDayOfTheWeek,
  ObjectRecordGroupByDateGranularity,
} from 'twenty-shared/types';
import {
  convertCalendarStartDayNonIsoNumberToFirstDayOfTheWeek,
  isDefined,
  isFieldMetadataDateKind,
} from 'twenty-shared/utils';
import { doNotTranslate } from 'twenty-shared/i18n';

const GRAPH_DEFAULT_DATE_GRANULARITY = ObjectRecordGroupByDateGranularity.DAY;

export type GroupByFieldObject = {
  [key: string]: boolean | string | GroupByFieldObject;
};

type BuildGroupByFieldObjectParams = {
  field: FieldMetadataItem;
  subFieldName?: string | null;
  dateGranularity?: ObjectRecordGroupByDateGranularity;
  firstDayOfTheWeek?: CalendarStartDay | null;
  isNestedDateField?: boolean;
  timeZone?: string;
};

export const buildGroupByFieldObject = ({
  field,
  subFieldName,
  dateGranularity,
  firstDayOfTheWeek,
  isNestedDateField,
  timeZone,
}: BuildGroupByFieldObjectParams): GroupByFieldObject => {
  if (field.relatedGroupBy) {
    const { fields, subFieldName: nestedSubFieldName } = field.relatedGroupBy;
    const leaf = fields[fields.length - 1];
    const nested = isFieldRelation(leaf)
      ? { [leaf.name]: { id: true } }
      : buildGroupByFieldObject({
          field: leaf,
          subFieldName: nestedSubFieldName,
          dateGranularity,
          firstDayOfTheWeek,
          timeZone: timeZone ?? field.relatedGroupBy.timeZone ?? 'UTC',
        });
    return fields
      .slice(0, -1)
      .reduceRight<GroupByFieldObject>(
        (inner, relation) => ({ [relation.name]: inner }),
        nested,
      );
  }

  const isRelation = isFieldRelation(field) || isFieldMorphRelation(field);
  const isComposite = isCompositeFieldType(field.type);
  const isDateField = isFieldMetadataDateKind(field.type);

  if (isRelation) {
    if (!isDefined(subFieldName)) {
      return { [doNotTranslate(`${field.name}Id`)]: true };
    }

    const parts = subFieldName.split('.');
    const usedDateGranularity =
      dateGranularity ?? GRAPH_DEFAULT_DATE_GRANULARITY;
    const leaf: boolean | GroupByFieldObject = isNestedDateField
      ? {
          granularity: usedDateGranularity,
          ...(GROUP_BY_DATE_GRANULARITY_THAT_REQUIRE_TIME_ZONE.includes(
            usedDateGranularity,
          )
            ? { timeZone: timeZone ?? 'UTC' }
            : {}),
        }
      : true;
    const nested = parts.reduceRight<boolean | GroupByFieldObject>(
      (inner, name) => ({ [name]: inner }),
      leaf,
    );
    return { [field.name]: nested };
  }

  if (isComposite) {
    if (!isDefined(subFieldName)) {
      throw new Error(
        doNotTranslate(
          `Composite field ${field.name} requires a subfield to be specified`,
        ),
      );
    }

    return {
      [field.name]: {
        [subFieldName]: true,
      },
    };
  }

  if (isDateField) {
    const usedDateGranularity =
      dateGranularity ?? GRAPH_DEFAULT_DATE_GRANULARITY;

    const shouldHaveTimeZone =
      GROUP_BY_DATE_GRANULARITY_THAT_REQUIRE_TIME_ZONE.includes(
        usedDateGranularity,
      );

    const timeZoneIsNotProvided = !isDefined(timeZone);

    const result: Record<string, string> = { granularity: usedDateGranularity };

    if (shouldHaveTimeZone) {
      if (timeZoneIsNotProvided) {
        throw new Error(
          doNotTranslate(`Date order by should have a time zone.`),
        );
      } else {
        result.timeZone = timeZone;
      }
    }

    if (
      usedDateGranularity === ObjectRecordGroupByDateGranularity.WEEK &&
      isDefined(firstDayOfTheWeek) &&
      firstDayOfTheWeek !== CalendarStartDay.SYSTEM
    ) {
      const weekStartDay =
        convertCalendarStartDayNonIsoNumberToFirstDayOfTheWeek(
          firstDayOfTheWeek,
          FirstDayOfTheWeek.MONDAY,
        );

      result.weekStartDay = weekStartDay;
    }

    return { [field.name]: result };
  }

  return { [field.name]: true };
};
