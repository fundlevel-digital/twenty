import { isDefined } from 'twenty-shared/utils';

import {
  collectStatementAliases,
  quoteQualifiedAliasReferences,
  type SelectStatementState,
  type WhereClause,
} from 'src/engine/twenty-orm/sql/utils/build-select-statement.util';

const collectWhereConditionExpressions = (clauses: WhereClause[]): string[] =>
  clauses.flatMap((clause) =>
    'clauses' in clause
      ? collectWhereConditionExpressions(clause.clauses)
      : [clause.sql],
  );

// Every clause that filters, joins, groups or hides rows and columns, as the statement will render it
export const collectStatementConditionExpressions = (
  state: SelectStatementState,
): string[] => {
  const aliases = [
    ...collectStatementAliases(state),
    ...state.existsFilterClauses.map(({ alias }) => alias),
  ];

  return [
    ...[
      ...collectWhereConditionExpressions(state.whereClauses),
      ...state.rowAccessConditions,
    ].map((expression) => quoteQualifiedAliasReferences(expression, aliases)),
    ...state.groupByExpressions,
    ...state.joinClauses.flatMap((joinClause) =>
      [
        joinClause.condition,
        joinClause.toManyPlainCondition,
        ...joinClause.additionalOnConditions,
      ].filter(isDefined),
    ),
    ...state.existsFilterClauses.flatMap((existsFilterClause) => [
      existsFilterClause.correlationCondition,
      ...collectWhereConditionExpressions(existsFilterClause.conditionClauses),
      ...existsFilterClause.additionalOnConditions,
    ]),
    ...[
      ...Object.values(state.unreadableColumnConditions),
      ...Object.values(state.unreadableRelationConditions),
    ].flatMap((unreadableConditionsByName) =>
      Object.values(unreadableConditionsByName).flat(),
    ),
  ];
};
