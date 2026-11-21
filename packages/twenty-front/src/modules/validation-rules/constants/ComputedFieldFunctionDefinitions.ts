import { msg } from '@lingui/core/macro';
import { doNotTranslate } from 'twenty-shared/i18n';
import { type ComputedFieldExpressionFunctionName } from 'twenty-shared/types';

import { type ValidationRuleSyntaxDefinition } from '@/validation-rules/types/ValidationRuleSyntaxDefinition';

export const COMPUTED_FIELD_FUNCTION_DEFINITIONS = {
  if: {
    signature: doNotTranslate('if(condition, whenTrue, whenFalse)'),
    description: msg`Returns one value when the condition is true and another when it is false.`,
  },
  coalesce: {
    signature: doNotTranslate('coalesce(value, fallback, ...)'),
    description: msg`Returns the first value that is not null.`,
  },
  isDefined: {
    signature: doNotTranslate('isDefined(value)'),
    description: msg`True when the value is set, even to an empty text.`,
  },
  isEmpty: {
    signature: doNotTranslate('isEmpty(value)'),
    description: msg`True when the value is null or an empty text.`,
  },
  min: {
    signature: doNotTranslate('min(value, ...)'),
    description: msg`Returns the smallest value.`,
  },
  max: {
    signature: doNotTranslate('max(value, ...)'),
    description: msg`Returns the largest value.`,
  },
  round: {
    signature: doNotTranslate('round(number, decimals)'),
    description: msg`Rounds a number to the given number of decimal places. The default is zero decimal places.`,
  },
  abs: {
    signature: doNotTranslate('abs(number)'),
    description: msg`Returns the absolute value of a number.`,
  },
  ceil: {
    signature: doNotTranslate('ceil(number)'),
    description: msg`Rounds a number up to the nearest integer.`,
  },
  floor: {
    signature: doNotTranslate('floor(number)'),
    description: msg`Rounds a number down to the nearest integer.`,
  },
  trunc: {
    signature: doNotTranslate('trunc(number)'),
    description: msg`Removes the fractional part of a number.`,
  },
  concat: {
    signature: doNotTranslate('concat(value, ...)'),
    description: msg`Joins values into a text.`,
  },
  lower: {
    signature: doNotTranslate('lower(text)'),
    description: msg`Converts text to lowercase.`,
  },
  upper: {
    signature: doNotTranslate('upper(text)'),
    description: msg`Converts text to uppercase.`,
  },
  length: {
    signature: doNotTranslate('length(text)'),
    description: msg`Returns the number of characters in a text.`,
  },
  daysBetween: {
    signature: doNotTranslate('daysBetween(start, end)'),
    description: msg`Returns the number of days from the first date to the second.`,
  },
  daysSince: {
    signature: doNotTranslate('daysSince(date)'),
    description: msg`Returns the number of days from the date to today, in UTC.`,
  },
} satisfies Record<
  ComputedFieldExpressionFunctionName,
  Omit<ValidationRuleSyntaxDefinition, 'name'>
>;
