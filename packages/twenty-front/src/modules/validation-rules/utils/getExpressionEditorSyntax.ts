import { msg } from '@lingui/core/macro';
import { COMPUTED_FIELD_EXPRESSION_FUNCTION_NAMES } from 'twenty-shared/constants';

import { COMPUTED_FIELD_FUNCTION_DEFINITIONS } from '@/validation-rules/constants/ComputedFieldFunctionDefinitions';
import { VALIDATION_RULE_KEYWORDS } from '@/validation-rules/constants/ValidationRuleKeywords';
import { type ExpressionEditorMode } from '@/validation-rules/types/ExpressionEditorMode';
import { type ValidationRuleSyntaxDefinition } from '@/validation-rules/types/ValidationRuleSyntaxDefinition';
import { getValidationRuleFunctionDefinitions } from '@/validation-rules/utils/getValidationRuleFunctionDefinitions';

export const getExpressionEditorSyntax = (
  mode: ExpressionEditorMode,
): {
  functions: ValidationRuleSyntaxDefinition[];
  keywords: ValidationRuleSyntaxDefinition[];
} =>
  mode === 'condition'
    ? {
        functions: getValidationRuleFunctionDefinitions(),
        keywords: VALIDATION_RULE_KEYWORDS,
      }
    : {
        functions: COMPUTED_FIELD_EXPRESSION_FUNCTION_NAMES.map((name) => ({
          name,
          ...COMPUTED_FIELD_FUNCTION_DEFINITIONS[name],
        })),
        keywords: [
          ...VALIDATION_RULE_KEYWORDS.filter(({ name }) =>
            ['and', 'or', 'not', 'true', 'false'].includes(name),
          ),
          {
            name: 'now',
            signature: 'now',
            description: msg`The current date and time.`,
          },
          {
            name: 'today',
            signature: 'today',
            description: msg`The current date in UTC.`,
          },
        ],
      };
