import { type ValidationRuleExpressionToken } from 'twenty-shared/types';
import {
  isDefined,
  tokenizeValidationRuleExpression,
} from 'twenty-shared/utils';

import { type ExpressionEditorMode } from '@/validation-rules/types/ExpressionEditorMode';
import { getExpressionEditorSyntax } from '@/validation-rules/utils/getExpressionEditorSyntax';
import {
  type ValidationRuleExpressionHighlight,
  type ValidationRuleExpressionHighlightKind,
} from '@/validation-rules/types/ValidationRuleExpressionHighlight';

const OPERATOR_CHARACTERS = '=!<>+-*/%?:|&';

const getHighlightKind = (
  token: ValidationRuleExpressionToken,
  { functions, keywords }: ReturnType<typeof getExpressionEditorSyntax>,
): ValidationRuleExpressionHighlightKind | null => {
  switch (token.type) {
    case 'string':
    case 'unclosedString':
      return 'string';
    case 'number':
      return 'number';
    case 'path':
      if (functions.some(({ name }) => name === token.text)) {
        return 'function';
      }

      return keywords.some(({ name }) => name === token.text)
        ? 'keyword'
        : null;
    case 'symbol':
      return OPERATOR_CHARACTERS.includes(token.text) ? 'operator' : null;
    default:
      return null;
  }
};

export const computeValidationRuleExpressionHighlights = (
  expression: string,
  mode: ExpressionEditorMode = 'condition',
): ValidationRuleExpressionHighlight[] => {
  const syntax = getExpressionEditorSyntax(mode);

  return tokenizeValidationRuleExpression(expression).flatMap((token) => {
    const kind = getHighlightKind(token, syntax);

    return isDefined(kind)
      ? [{ kind, start: token.start, end: token.end }]
      : [];
  });
};
