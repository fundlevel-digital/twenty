import {
  type ComputedFieldValueType,
  type FieldMetadataRollupComputation,
  type FieldMetadataRollupOperation,
  FieldMetadataType,
} from 'twenty-shared/types';
import { ComputedFieldExpressionError, isDefined } from 'twenty-shared/utils';

import { assertComputedFieldValueTypeOrThrow } from 'src/engine/metadata-modules/computed-field/utils/assert-computed-field-value-type-or-throw.util';

const { NUMBER, TEXT, BOOLEAN, DATE, DATE_TIME } = FieldMetadataType;

const EXPRESSION_VALUE_TYPES_BY_OPERATION: Record<
  Exclude<FieldMetadataRollupOperation, 'COUNT'>,
  ComputedFieldValueType[]
> = {
  SUM: [NUMBER],
  AVG: [NUMBER],
  MIN: [NUMBER, TEXT, DATE, DATE_TIME],
  MAX: [NUMBER, TEXT, DATE, DATE_TIME],
  LATEST: [NUMBER, TEXT, BOOLEAN, DATE, DATE_TIME],
};

export const getRollupComputedValueTypeOrThrow = ({
  computation: { operation, expression, orderBy },
  expressionValueType,
}: {
  computation: FieldMetadataRollupComputation;
  expressionValueType: ComputedFieldValueType | undefined;
}): ComputedFieldValueType | undefined => {
  if (operation !== 'LATEST' && isDefined(orderBy)) {
    throw new ComputedFieldExpressionError(
      `${operation} does not order the related records and takes no orderBy; only LATEST does`,
    );
  }

  if (operation === 'COUNT') {
    if (isDefined(expression)) {
      throw new ComputedFieldExpressionError(
        'COUNT counts the related records and takes no expression; use the filter to count some of them',
      );
    }

    return NUMBER;
  }

  if (!isDefined(expression)) {
    throw new ComputedFieldExpressionError(
      operation === 'LATEST'
        ? 'LATEST needs the expression to read on the latest related record'
        : `${operation} needs the expression to aggregate`,
    );
  }

  if (operation === 'LATEST' && !isDefined(orderBy)) {
    throw new ComputedFieldExpressionError(
      'LATEST needs an orderBy, a number or date of each related record, to know which one is the latest',
    );
  }

  assertComputedFieldValueTypeOrThrow({
    valueType: expressionValueType,
    expectedTypes: EXPRESSION_VALUE_TYPES_BY_OPERATION[operation],
    subject: `The expression of ${operation}`,
  });

  return expressionValueType;
};
