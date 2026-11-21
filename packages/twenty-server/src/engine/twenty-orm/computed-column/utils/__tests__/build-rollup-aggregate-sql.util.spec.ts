import { buildRollupAggregateSql } from 'src/engine/twenty-orm/computed-column/utils/build-rollup-aggregate-sql.util';
import {
  buildColumn,
  buildQueryBuilder,
  personTableShape,
} from 'src/engine/twenty-orm/query-builder/__tests__/workspace-select-query-builder-test-shapes.util';
import { type WorkspaceTableShape } from 'src/engine/twenty-orm/table-shape/types/workspace-table-shape.type';

const RELATED_RECORD_ID_SQL = '"person"."id"';

const LATEST_SQL = buildRollupAggregateSql({
  operation: 'LATEST',
  expressionSql: '"person"."streak"',
  orderBySql: '"person"."score"',
  relatedRecordIdSql: RELATED_RECORD_ID_SQL,
});

describe('buildRollupAggregateSql', () => {
  it('reads the expression on the related record with the greatest order, skipping those without one and breaking ties by id', () => {
    expect(LATEST_SQL).toBe(
      '(ARRAY_AGG(("person"."streak") ORDER BY ("person"."score") DESC, "person"."id" DESC) FILTER (WHERE ("person"."score") IS NOT NULL))[1]',
    );
  });

  it.each([
    [
      'an expression',
      { expressionSql: undefined, orderBySql: '"person"."score"' },
    ],
    [
      'an orderBy',
      { expressionSql: '"person"."streak"', orderBySql: undefined },
    ],
  ])('has no LATEST without %s', (_, sqls) => {
    expect(
      buildRollupAggregateSql({
        operation: 'LATEST',
        relatedRecordIdSql: RELATED_RECORD_ID_SQL,
        ...sqls,
      }),
    ).toBeUndefined();
  });

  it.each([
    ['SUM', '"person"."streak"', 'SUM("person"."streak")'],
    ['MAX', '"person"."streak"', 'MAX("person"."streak")'],
    ['COUNT', undefined, 'COUNT(*)'],
  ] as const)(
    'aggregates %s with its function',
    (operation, expressionSql, sql) => {
      expect(
        buildRollupAggregateSql({
          operation,
          expressionSql,
          orderBySql: undefined,
          relatedRecordIdSql: RELATED_RECORD_ID_SQL,
        }),
      ).toBe(sql);
    },
  );

  it('is selected as written, and resolves the computed columns its order reads', () => {
    const tableShape: WorkspaceTableShape = {
      ...personTableShape,
      columnShapeByColumnName: {
        ...personTableShape.columnShapeByColumnName,
        streak: buildColumn('streak'),
        score: { ...buildColumn('score'), isComputed: true },
      },
      storedColumnNames: [...personTableShape.storedColumnNames, 'streak'],
      computedColumnNames: ['score'],
    };
    const { queryBuilder } = buildQueryBuilder({ tableShape });

    queryBuilder
      .select(LATEST_SQL ?? '', 'value')
      .where('"person"."companyId" = "company"."id"');

    expect(
      queryBuilder
        .getUnresolvedComputedColumns()
        .map(({ columnName }) => columnName),
    ).toEqual(['score']);

    queryBuilder.setComputedColumnSql({
      alias: 'person',
      columnName: 'score',
      computedColumnSql: { sql: '1', readComputedColumnNames: [] },
    });

    expect(queryBuilder.getQuery()).toContain(
      `SELECT ${LATEST_SQL} AS "value"`,
    );
  });
});
