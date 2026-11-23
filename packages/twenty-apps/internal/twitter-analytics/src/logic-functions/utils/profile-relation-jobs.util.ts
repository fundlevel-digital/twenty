import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';
import {
  createManagedRelationCursor,
  getClearedManagedRelationSources,
  isManagedRelationCursor,
  populatedRelationSourceFilter,
  type RelationSourceConnection,
} from 'src/logic-functions/utils/profile-relation-candidates.util';
import {
  chooseRelationSourceField,
  emptyProfileRelationResult,
  getProfileRelationSettings,
  getRelationSourceFields,
  relateSourceRecords,
  type ProfileRelationKind,
  type ProfileCreationMode,
} from 'src/logic-functions/utils/profile-relations.util';

export const runProfileRelationJob = async ({
  client,
  metadata,
  kind,
  recordId,
  after,
  mode,
  dryRun = false,
}: {
  client: WorkspaceGraphqlClient;
  metadata: WorkspaceGraphqlClient;
  kind: ProfileRelationKind;
  recordId?: string;
  after?: string;
  mode?: Exclude<ProfileCreationMode, 'OFF'>;
  dryRun?: boolean;
}) => {
  const settings = getProfileRelationSettings(kind);
  const selectedMode = mode ?? settings.autoMode;
  if (selectedMode === 'OFF')
    return { ...emptyProfileRelationResult(), nextCursor: null };
  const sourceField = chooseRelationSourceField(
    await getRelationSourceFields(metadata, kind),
    settings.sourceField,
  );
  if (!sourceField) {
    if (recordId)
      return { ...emptyProfileRelationResult(), skipped: 1, nextCursor: null };
    throw new Error(
      'Select an existing X link field in Profile Relations preferences',
    );
  }
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(sourceField.name))
    throw new Error('Unsupported source field name');
  const plural = kind === 'company' ? 'companies' : 'people';
  const selection =
    sourceField.type === 'LINKS'
      ? `${sourceField.name} { primaryLinkUrl secondaryLinks }`
      : sourceField.name;
  const nameSelection =
    kind === 'person' ? 'name { firstName lastName }' : 'name';
  if (!recordId && isManagedRelationCursor(after)) {
    if (settings.linkMode !== 'SYNC_MANAGED')
      throw new Error(
        'Relation preferences changed. Preview the backfill again.',
      );
    const page = await getClearedManagedRelationSources({
      client,
      kind,
      sourceField,
      selection: `${nameSelection} ${selection}`,
      cursor: after,
    });
    return {
      ...(await relateSourceRecords({
        client,
        kind,
        sourceField,
        settings,
        mode: selectedMode,
        dryRun,
        records: page.records,
      })),
      nextCursor: page.nextCursor,
    };
  }
  const populated = populatedRelationSourceFilter(sourceField);
  const response = await client.request<{
    [key: string]: RelationSourceConnection;
  }>(
    `query SourceRecords($after: String, $filter: ${kind === 'person' ? 'Person' : 'Company'}FilterInput) { ${plural}(first: 100, after: $after, filter: $filter) { edges { node { id ${nameSelection} ${selection} } } pageInfo { hasNextPage endCursor } } }`,
    {
      after,
      filter: recordId
        ? settings.linkMode === 'SYNC_MANAGED'
          ? { id: { eq: recordId } }
          : { and: [{ id: { eq: recordId } }, populated] }
        : populated,
    },
  );
  const connection = response[plural];
  const result = await relateSourceRecords({
    client,
    kind,
    sourceField,
    settings,
    mode: selectedMode,
    dryRun,
    records: connection.edges.map(({ node }) => node),
  });
  const nextCursor =
    !recordId && connection.pageInfo.hasNextPage
      ? connection.pageInfo.endCursor
      : null;
  if (
    !recordId &&
    connection.pageInfo.hasNextPage &&
    (!nextCursor || nextCursor === after)
  )
    throw new Error('Source record pagination did not advance');
  return {
    ...result,
    nextCursor:
      !recordId && !nextCursor && settings.linkMode === 'SYNC_MANAGED'
        ? createManagedRelationCursor()
        : nextCursor,
  };
};
