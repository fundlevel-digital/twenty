import { parseComputedFieldExpressionOrThrow } from 'twenty-shared/utils';

import { getComputedFieldExpressionResultTextLiterals } from 'src/engine/metadata-modules/computed-field/utils/get-computed-field-expression-result-text-literals.util';

const getResultTextLiterals = (expression: string) =>
  getComputedFieldExpressionResultTextLiterals(
    parseComputedFieldExpressionOrThrow(expression),
  );

describe('getComputedFieldExpressionResultTextLiterals', () => {
  it.each([
    ["'US'", ['US']],
    [
      "if(lastInboundAt > lastOutboundAt, 'THEM', if(isDefined(lastOutboundAt), 'US', 'NO_CONTACT'))",
      ['THEM', 'US', 'NO_CONTACT'],
    ],
    ["amount > 0 ? 'PAID' : 'UNPAID'", ['PAID', 'UNPAID']],
    ["coalesce(status, 'DRAFT')", ['DRAFT']],
    ["max('A', status)", ['A']],
  ])('returns the text literals %s can return', (expression, literals) => {
    expect(getResultTextLiterals(expression)).toEqual(literals);
  });

  it.each([
    'status',
    "concat('A', status)",
    "lower('DONE')",
    "status == 'DONE'",
  ])('ignores literals that %s does not return as they are', (expression) => {
    expect(getResultTextLiterals(expression)).toEqual([]);
  });

  it('ignores the condition of an if', () => {
    expect(
      getResultTextLiterals("if(status == 'LOST', 'CLOSED', status)"),
    ).toEqual(['CLOSED']);
  });
});
