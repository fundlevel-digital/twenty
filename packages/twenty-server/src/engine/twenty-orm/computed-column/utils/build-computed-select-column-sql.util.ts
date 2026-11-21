import { isNonEmptyArray } from 'twenty-shared/utils';

// A computed select has no enum of its own: it reads as text, and as null when the value is not an option.
// The simple CASE evaluates the value once, however costly its subqueries
export const buildComputedSelectColumnSql = ({
  valueSql,
  optionValues,
  bindTextParameter,
}: {
  valueSql: string;
  optionValues: string[];
  bindTextParameter: (text: string) => string;
}): string => {
  if (!isNonEmptyArray(optionValues)) {
    return 'NULL::text';
  }

  const whenClauses = optionValues.map((optionValue) => {
    const parameter = `:${bindTextParameter(optionValue)}::text`;

    return `WHEN ${parameter} THEN ${parameter}`;
  });

  return `CASE (${valueSql})::text ${whenClauses.join(' ')} END`;
};
