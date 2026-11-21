import {
  type FieldMetadataFormulaComputation,
  FieldMetadataType,
} from 'twenty-shared/types';

import { type ComputedFieldKindDescription } from 'src/engine/metadata-modules/computed-field/types/computed-field-kind-description.type';
import { assertComputedSelectValueFitsOptionsOrThrow } from 'src/engine/metadata-modules/computed-field/utils/assert-computed-select-value-fits-options-or-throw.util';
import { assertComputedValueFitsFieldTypeOrThrow } from 'src/engine/metadata-modules/computed-field/utils/assert-computed-value-fits-field-type-or-throw.util';

export const FORMULA_COMPUTED_FIELD_KIND_DESCRIPTION: ComputedFieldKindDescription<FieldMetadataFormulaComputation> =
  {
    readableShape: 'a formula with an expression',
    expressionSlots: [
      { property: 'expression', evaluatedOn: 'RECORD', isRequired: true },
    ],
    assertIsValidOrThrow: ({
      computation,
      fieldType,
      fieldOptionValues,
      valueTypeBySlotProperty,
    }) =>
      fieldType === FieldMetadataType.SELECT
        ? assertComputedSelectValueFitsOptionsOrThrow({
            expression: computation.expression,
            valueType: valueTypeBySlotProperty.expression,
            optionValues: fieldOptionValues,
          })
        : assertComputedValueFitsFieldTypeOrThrow({
            fieldType,
            valueType: valueTypeBySlotProperty.expression,
            otherFieldTypes: [FieldMetadataType.SELECT],
          }),
  };
