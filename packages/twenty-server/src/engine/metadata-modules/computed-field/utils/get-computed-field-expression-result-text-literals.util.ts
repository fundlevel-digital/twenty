import { type ComputedFieldExpressionNode } from 'twenty-shared/types';

const FUNCTIONS_RETURNING_AN_ARGUMENT = ['coalesce', 'min', 'max'];

// The text literals the expression can return as they are: other text it returns is only known when read
export const getComputedFieldExpressionResultTextLiterals = (
  expression: ComputedFieldExpressionNode,
): string[] => {
  switch (expression.kind) {
    case 'textLiteral':
      return [expression.value];
    case 'conditional':
      return [expression.whenTrue, expression.whenFalse].flatMap(
        getComputedFieldExpressionResultTextLiterals,
      );
    case 'functionCall':
      if (expression.name === 'if') {
        return expression.functionArguments
          .slice(1)
          .flatMap(getComputedFieldExpressionResultTextLiterals);
      }

      return FUNCTIONS_RETURNING_AN_ARGUMENT.includes(expression.name)
        ? expression.functionArguments.flatMap(
            getComputedFieldExpressionResultTextLiterals,
          )
        : [];
    default:
      return [];
  }
};
