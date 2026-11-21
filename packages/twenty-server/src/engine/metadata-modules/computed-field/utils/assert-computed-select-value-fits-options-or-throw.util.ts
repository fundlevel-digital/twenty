import {
  type ComputedFieldValueType,
  FieldMetadataType,
} from 'twenty-shared/types';
import {
  ComputedFieldExpressionError,
  isNonEmptyArray,
  parseComputedFieldExpressionOrThrow,
} from 'twenty-shared/utils';

import { assertComputedFieldValueTypeOrThrow } from 'src/engine/metadata-modules/computed-field/utils/assert-computed-field-value-type-or-throw.util';
import { getComputedFieldExpressionResultTextLiterals } from 'src/engine/metadata-modules/computed-field/utils/get-computed-field-expression-result-text-literals.util';

export const assertComputedSelectValueFitsOptionsOrThrow = ({
  expression,
  valueType,
  optionValues,
}: {
  expression: string;
  valueType: ComputedFieldValueType | undefined;
  optionValues: string[];
}): void => {
  assertComputedFieldValueTypeOrThrow({
    valueType,
    expectedTypes: [FieldMetadataType.TEXT],
    subject: 'The computed value of a select',
  });

  if (!isNonEmptyArray(optionValues)) {
    throw new ComputedFieldExpressionError(
      'a computed select needs options to return',
    );
  }

  const unknownValues = getComputedFieldExpressionResultTextLiterals(
    parseComputedFieldExpressionOrThrow(expression),
  ).filter((value) => !optionValues.includes(value));

  if (isNonEmptyArray(unknownValues)) {
    throw new ComputedFieldExpressionError(
      `it returns ${unknownValues.map((value) => `"${value}"`).join(', ')}, which ${unknownValues.length === 1 ? 'is not an option value' : 'are not option values'} (${optionValues.join(', ')})`,
    );
  }
};
