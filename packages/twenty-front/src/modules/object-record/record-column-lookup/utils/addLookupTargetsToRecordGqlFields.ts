import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type RecordGqlFields } from 'twenty-shared/types';
import { isPlainObject } from 'twenty-shared/utils';

type LookupTargetGqlFieldsInput = {
  relationFieldName: string;
  lookupTargetFieldMetadataItem: Pick<FieldMetadataItem, 'name'>;
  relationHops?: {
    relationFieldMetadataItem: Pick<FieldMetadataItem, 'name'>;
  }[];
};

const mergeRecordGqlFields = (
  recordGqlFields: RecordGqlFields,
  recordGqlFieldsToAdd: RecordGqlFields,
): RecordGqlFields =>
  Object.entries(recordGqlFieldsToAdd).reduce<RecordGqlFields>(
    (mergedGqlFields, [fieldName, gqlFieldToAdd]) => {
      const existingGqlField = mergedGqlFields[fieldName];

      return {
        ...mergedGqlFields,
        [fieldName]:
          isPlainObject(existingGqlField) && isPlainObject(gqlFieldToAdd)
            ? mergeRecordGqlFields(existingGqlField, gqlFieldToAdd)
            : isPlainObject(gqlFieldToAdd)
              ? gqlFieldToAdd
              : (existingGqlField ?? gqlFieldToAdd),
      };
    },
    recordGqlFields,
  );

// The record query generator adds the connection shape of one-to-many hops and leaves out unreadable fields
const buildLookupPathGqlFields = ({
  relationHops,
  lookupTargetFieldMetadataItem,
}: {
  relationHops: NonNullable<LookupTargetGqlFieldsInput['relationHops']>;
  lookupTargetFieldMetadataItem: Pick<FieldMetadataItem, 'name'>;
}): RecordGqlFields =>
  relationHops.slice(1).reduceRight<RecordGqlFields>(
    (nestedGqlFields, { relationFieldMetadataItem }) => ({
      id: true,
      [relationFieldMetadataItem.name]: nestedGqlFields,
    }),
    { id: true, [lookupTargetFieldMetadataItem.name]: true },
  );

export const addLookupTargetsToRecordGqlFields = ({
  recordGqlFields,
  lookupTargets,
}: {
  recordGqlFields: RecordGqlFields;
  lookupTargets: LookupTargetGqlFieldsInput[];
}) =>
  lookupTargets.reduce<RecordGqlFields>(
    (
      gqlFields,
      { relationFieldName, lookupTargetFieldMetadataItem, relationHops = [] },
    ) => {
      const relationGqlFields = gqlFields[relationFieldName];

      if (!isPlainObject(relationGqlFields)) {
        return gqlFields;
      }

      return {
        ...gqlFields,
        [relationFieldName]: mergeRecordGqlFields(
          relationGqlFields,
          buildLookupPathGqlFields({
            relationHops,
            lookupTargetFieldMetadataItem,
          }),
        ),
      };
    },
    recordGqlFields,
  );
