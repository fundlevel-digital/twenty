import { type FieldMetadataRollupOperation } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { ROLLUP_SQL_FUNCTION_BY_OPERATION } from 'src/engine/metadata-modules/computed-field/constants/rollup-sql-function-by-operation.constant';

// LATEST skips the related records without an order, and the related record id breaks ties so the value is stable
export const buildRollupAggregateSql = ({
  operation,
  expressionSql,
  orderBySql,
  relatedRecordIdSql,
}: {
  operation: FieldMetadataRollupOperation;
  expressionSql: string | undefined;
  orderBySql: string | undefined;
  relatedRecordIdSql: string;
}): string | undefined => {
  if (operation === 'LATEST') {
    if (!isDefined(expressionSql) || !isDefined(orderBySql)) {
      return undefined;
    }

    return `(ARRAY_AGG((${expressionSql}) ORDER BY (${orderBySql}) DESC, ${relatedRecordIdSql} DESC) FILTER (WHERE (${orderBySql}) IS NOT NULL))[1]`;
  }

  return isDefined(expressionSql)
    ? `${ROLLUP_SQL_FUNCTION_BY_OPERATION[operation]}(${expressionSql})`
    : 'COUNT(*)';
};
