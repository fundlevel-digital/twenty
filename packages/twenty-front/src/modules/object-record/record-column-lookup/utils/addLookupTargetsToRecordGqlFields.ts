import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getImageIdentifierFieldMetadataItem } from '@/object-metadata/utils/getImageIdentifierFieldMetadataItem';
import { getLabelIdentifierFieldMetadataItem } from '@/object-metadata/utils/getLabelIdentifierFieldMetadataItem';
import { getLookupSourceHopIndex } from '@/object-record/record-column-lookup/utils/getLookupSourceHopIndex';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type RecordGqlFields } from 'twenty-shared/types';
import { isDefined, isPlainObject } from 'twenty-shared/utils';

type LookupTargetGqlFieldsInput = {
  relationFieldName: string;
  lookupTargetFieldMetadataItem: Pick<FieldMetadataItem, 'name'>;
  relationHops?: {
    relationFieldMetadataItem: Pick<FieldMetadataItem, 'name'> &
      Partial<Pick<FieldMetadataItem, 'id' | 'settings'>>;
    isOneToMany?: boolean;
    targetObjectMetadataItem?: EnrichedObjectMetadataItem;
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
}): RecordGqlFields => {
  const sourceHopIndex = relationHops.some(({ isOneToMany }) => isOneToMany)
    ? getLookupSourceHopIndex(relationHops)
    : -1;
  let nestedGqlFields: RecordGqlFields = {
    id: true,
    [lookupTargetFieldMetadataItem.name]: true,
  };

  for (let hopIndex = relationHops.length - 1; hopIndex >= 0; hopIndex--) {
    const { targetObjectMetadataItem } = relationHops[hopIndex];
    if (hopIndex === sourceHopIndex && isDefined(targetObjectMetadataItem)) {
      const identifierFields = [
        getLabelIdentifierFieldMetadataItem(targetObjectMetadataItem),
        getImageIdentifierFieldMetadataItem(targetObjectMetadataItem),
      ]
        .filter(isDefined)
        .filter((field) =>
          targetObjectMetadataItem.readableFields.some(
            ({ id }) => id === field.id,
          ),
        );
      nestedGqlFields = mergeRecordGqlFields(
        nestedGqlFields,
        Object.fromEntries(identifierFields.map(({ name }) => [name, true])),
      );
    }
    if (hopIndex > 0) {
      nestedGqlFields = {
        id: true,
        [relationHops[hopIndex].relationFieldMetadataItem.name]:
          nestedGqlFields,
      };
    }
  }
  return nestedGqlFields;
};

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
