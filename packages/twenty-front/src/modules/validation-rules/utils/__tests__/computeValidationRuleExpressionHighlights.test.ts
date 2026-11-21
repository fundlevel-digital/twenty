import { computeValidationRuleExpressionHighlights } from '@/validation-rules/utils/computeValidationRuleExpressionHighlights';

describe('computeValidationRuleExpressionHighlights', () => {
  it('should colour functions, keywords, strings, numbers and operators but not fields', () => {
    const expression = 'isDefined(amount) and stage != "WON" or employees > 3';

    expect(
      computeValidationRuleExpressionHighlights(expression).map(
        ({ kind, start, end }) => `${kind}:${expression.slice(start, end)}`,
      ),
    ).toEqual([
      'function:isDefined',
      'keyword:and',
      'operator:!',
      'operator:=',
      'string:"WON"',
      'keyword:or',
      'operator:>',
      'number:3',
    ]);
  });

  it('highlights calculation functions and constants without treating field paths as functions', () => {
    const expression =
      'round(amount.amountMicros / 1000000, 2) + daysSince(today)';

    expect(
      computeValidationRuleExpressionHighlights(expression, 'calculation').map(
        ({ kind, start, end }) => `${kind}:${expression.slice(start, end)}`,
      ),
    ).toEqual([
      'function:round',
      'operator:/',
      'number:1000000',
      'number:2',
      'operator:+',
      'function:daysSince',
      'keyword:today',
    ]);
  });
});
