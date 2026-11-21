import { COMPUTED_FIELD_VALUE_TYPES } from 'twenty-shared/constants';
import {
  type ComputedFieldValueType,
  FieldMetadataType,
} from 'twenty-shared/types';
import { ComputedFieldExpressionError, isDefined } from 'twenty-shared/utils';

import { assertComputedFieldValueTypeOrThrow } from 'src/engine/metadata-modules/computed-field/utils/assert-computed-field-value-type-or-throw.util';

const { NUMBER, TEXT, BOOLEAN, DATE, DATE_TIME } = FieldMetadataType;

// Any value reads as text, and a date and a date and time convert into each other
const ASSIGNABLE_VALUE_TYPES_BY_FIELD_TYPE: Record<
  ComputedFieldValueType,
  ComputedFieldValueType[]
> = {
  [NUMBER]: [NUMBER],
  [BOOLEAN]: [BOOLEAN],
  [DATE]: [DATE, DATE_TIME],
  [DATE_TIME]: [DATE, DATE_TIME],
  [TEXT]: [...COMPUTED_FIELD_VALUE_TYPES],
};

// `otherFieldTypes`: the types a kind of computation supports through its own rules, named in the error
export const assertComputedValueFitsFieldTypeOrThrow = ({
  fieldType,
  valueType,
  otherFieldTypes = [],
}: {
  fieldType: FieldMetadataType;
  valueType: ComputedFieldValueType | undefined;
  otherFieldTypes?: FieldMetadataType[];
}): void => {
  const fieldValueType = COMPUTED_FIELD_VALUE_TYPES.find(
    (computedFieldValueType) => computedFieldValueType === fieldType,
  );

  if (!isDefined(fieldValueType)) {
    throw new ComputedFieldExpressionError(
      `A computed field must be of type ${[...COMPUTED_FIELD_VALUE_TYPES, ...otherFieldTypes].join(', ')}`,
    );
  }

  assertComputedFieldValueTypeOrThrow({
    valueType,
    expectedTypes: ASSIGNABLE_VALUE_TYPES_BY_FIELD_TYPE[fieldValueType],
    subject: 'The computed value',
  });
};
