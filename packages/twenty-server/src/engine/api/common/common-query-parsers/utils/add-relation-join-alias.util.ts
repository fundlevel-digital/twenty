import { type WorkspaceSelectQueryBuilder } from 'src/engine/twenty-orm/query-builder/workspace-select-query-builder';

type AddRelationJoinAliasToQueryBuilderArgs = {
  queryBuilder: WorkspaceSelectQueryBuilder;
  parentAlias: string;
  relationName: string;
  alias?: string;
};

export const addRelationJoinAliasToQueryBuilder = ({
  queryBuilder,
  parentAlias,
  relationName,
  alias = relationName,
}: AddRelationJoinAliasToQueryBuilderArgs): void => {
  const alreadyJoined = queryBuilder
    .getJoinAliases()
    .some((joinAlias) => joinAlias.name === alias);

  if (alreadyJoined) {
    return;
  }

  queryBuilder.leftJoin(`${parentAlias}.${relationName}`, alias);
};
