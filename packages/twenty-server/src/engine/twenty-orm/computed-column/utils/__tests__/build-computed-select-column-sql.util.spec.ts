import { buildComputedSelectColumnSql } from 'src/engine/twenty-orm/computed-column/utils/build-computed-select-column-sql.util';

const buildSql = (optionValues: string[]) => {
  const parameters: Record<string, string> = {};

  const sql = buildComputedSelectColumnSql({
    valueSql: '"influencer"."handle"',
    optionValues,
    bindTextParameter: (text) => {
      const parameterName = `text${Object.keys(parameters).length}`;

      parameters[parameterName] = text;

      return parameterName;
    },
  });

  return { sql, parameters };
};

describe('buildComputedSelectColumnSql', () => {
  it('reads the value once as text, and as null when it is not an option value', () => {
    expect(buildSql(['US', 'THEM'])).toEqual({
      sql: 'CASE ("influencer"."handle")::text WHEN :text0::text THEN :text0::text WHEN :text1::text THEN :text1::text END',
      parameters: { text0: 'US', text1: 'THEM' },
    });
  });

  it('reads null when the select has no option', () => {
    expect(buildSql([])).toEqual({ sql: 'NULL::text', parameters: {} });
  });
});
