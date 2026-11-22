import { getSyncSettings } from 'src/logic-functions/utils/sync-settings';
import { kv } from 'twenty-sdk/logic-function';
import {
  type SourceType,
  type SyncMode,
  type SyncSettings,
} from 'src/types/sync-settings';
import {
  createWorkspaceClient,
  type WorkspaceClient,
} from 'src/logic-functions/utils/workspace-client';
import {
  extractGithubLogins,
  listSourceFields,
  readSourceRecord,
  type SourceField,
} from 'src/logic-functions/utils/source-fields';
import { synchronizeGithubProfile } from 'src/logic-functions/utils/synchronize-github-profile';

export type SyncSourceInput = {
  sourceType: SourceType;
  recordId: string;
  automatic?: boolean;
  mode?: SyncMode;
  expectedLogins?: string[];
};
export type SyncSourceResult = {
  status: 'SKIPPED' | 'SYNCED';
  linked: number;
  removed: number;
  invalid: number;
  reason?: string;
};

export const syncSourceRecord = async (
  input: SyncSourceInput,
  dependencies: {
    client?: WorkspaceClient;
    settings?: SyncSettings;
    fields?: SourceField[];
    synchronize?: typeof synchronizeGithubProfile;
    store?: Pick<typeof kv, 'get' | 'set'>;
  } = {},
): Promise<SyncSourceResult> => {
  const client = dependencies.client ?? createWorkspaceClient();
  const settings = dependencies.settings ?? (await getSyncSettings());
  const store = dependencies.store ?? kv;
  const configuration = settings[input.sourceType];
  const skipped = (reason: string): SyncSourceResult => ({
    status: 'SKIPPED',
    linked: 0,
    removed: 0,
    invalid: 0,
    reason,
  });
  if (input.automatic && !configuration.enabled)
    return skipped('Automatic sync is disabled.');
  if (!configuration.fieldUniversalIdentifier)
    return skipped('Choose a GitHub source field first.');
  const field = (
    dependencies.fields ?? (await listSourceFields(input.sourceType))
  ).find(
    (field) =>
      field.universalIdentifier === configuration.fieldUniversalIdentifier,
  );
  if (!field)
    throw new Error(
      'The selected source field is unavailable. Choose another field in Sync Settings.',
    );
  const record = await readSourceRecord(
    input.sourceType,
    input.recordId,
    field,
    client,
  );
  if (!record) return skipped('Source record no longer exists.');
  const extracted = extractGithubLogins(record[field.name]);
  if (
    input.expectedLogins &&
    JSON.stringify(
      input.expectedLogins.map((login) => login.toLowerCase()).sort(),
    ) !==
      JSON.stringify(
        extracted.logins.map((login) => login.toLowerCase()).sort(),
      )
  )
    return skipped('GitHub links changed since the backfill preview.');
  const mode = input.mode ?? configuration.mode;
  const signature = JSON.stringify([
    field.universalIdentifier,
    mode,
    configuration.removeStaleLinks,
    extracted.logins.map((login) => login.toLowerCase()).sort(),
    extracted.invalid,
  ]);
  const stateKey = `source-sync:${input.sourceType}:${input.recordId}`;
  if (input.automatic && (await store.get<string>(stateKey)) === signature)
    return skipped('GitHub links have not changed.');
  const linkObject =
    input.sourceType === 'person' ? 'GithubPersonLink' : 'GithubCompanyLink';
  const linkCollection =
    input.sourceType === 'person' ? 'githubPersonLinks' : 'githubCompanyLinks';
  const nameValue = record.name;
  const name =
    typeof nameValue === 'string'
      ? nameValue
      : nameValue &&
          typeof nameValue === 'object' &&
          'firstName' in nameValue &&
          'lastName' in nameValue
        ? `${nameValue.firstName ?? ''} ${nameValue.lastName ?? ''}`.trim()
        : input.sourceType === 'person'
          ? 'Person'
          : 'Company';
  const activeProfileIds: string[] = [];
  let linked = 0;
  for (const login of extracted.logins) {
    const existing = await client.request<{
      githubProfiles: { edges: { node: { id: string; login: string } }[] };
    }>(
      'query($login:String!){githubProfiles(filter:{login:{ilike:$login}},first:1){edges{node{id login}}}}',
      { login },
    );
    let profile = existing.githubProfiles.edges[0]?.node;
    if (!profile && mode === 'LINK_ONLY') continue;
    if (!profile || mode === 'REFRESH') {
      const response = await (
        dependencies.synchronize ?? synchronizeGithubProfile
      )({ username: login }, { client });
      profile = { id: response.githubProfileId, login: response.login };
    }
    activeProfileIds.push(profile.id);
    const key = `${profile.id}:${input.recordId}`;
    const current = await client.request<
      Record<string, { edges: { node: { id: string } }[] }>
    >(
      `query($sourceId:UUID!,$profileId:UUID!){${linkCollection}(filter:{${input.sourceType}Id:{eq:$sourceId},githubProfileId:{eq:$profileId}},first:1){edges{node{id}}}}`,
      { sourceId: input.recordId, profileId: profile.id },
    );
    if (current[linkCollection].edges.length) continue;
    const deleted = await client.request<
      Record<string, { edges: { node: { id: string } }[] }>
    >(
      `query($sourceId:UUID!,$profileId:UUID!){${linkCollection}(filter:{${input.sourceType}Id:{eq:$sourceId},githubProfileId:{eq:$profileId},deletedAt:{is:NOT_NULL}},first:1){edges{node{id}}}}`,
      { sourceId: input.recordId, profileId: profile.id },
    );
    const deletedLink = deleted[linkCollection].edges[0]?.node;
    if (deletedLink) {
      await client.request(
        `mutation($id:UUID!){restore${linkObject}(id:$id){id}}`,
        { id: deletedLink.id },
      );
      linked++;
      continue;
    }
    try {
      await client.request(
        `mutation($data:${linkObject}CreateInput!){create${linkObject}(data:$data){id}}`,
        {
          data: {
            name: `${name} · ${profile.login}`,
            linkKey: key,
            sourceField: field.universalIdentifier,
            githubProfileId: profile.id,
            [`${input.sourceType}Id`]: input.recordId,
          },
        },
      );
      linked++;
    } catch (error) {
      const duplicate = await client.request<
        Record<string, { edges: { node: { id: string } }[] }>
      >(
        `query($key:String!){${linkCollection}(filter:{linkKey:{eq:$key}},first:1){edges{node{id}}}}`,
        { key },
      );
      if (!duplicate[linkCollection].edges.length) throw error;
    }
  }
  let removed = 0;
  if (configuration.removeStaleLinks && extracted.invalid === 0) {
    let after: string | null = null;
    do {
      const old: Record<
        string,
        {
          edges: {
            node: {
              id: string;
              githubProfileId: string;
              sourceField: string | null;
            };
          }[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        }
      > = await client.request(
        `query($id:UUID!,$after:String){${linkCollection}(filter:{${input.sourceType}Id:{eq:$id}},first:100,after:$after){edges{node{id githubProfileId sourceField}}pageInfo{hasNextPage endCursor}}}`,
        { id: input.recordId, after },
      );
      for (const { node } of old[linkCollection].edges)
        if (
          node.sourceField &&
          !activeProfileIds.includes(node.githubProfileId)
        ) {
          await client.request(
            `mutation($id:UUID!){delete${linkObject}(id:$id){id}}`,
            { id: node.id },
          );
          removed++;
        }
      after = old[linkCollection].pageInfo.hasNextPage
        ? old[linkCollection].pageInfo.endCursor
        : null;
    } while (after);
  }
  await store.set(stateKey, signature);
  return { status: 'SYNCED', linked, removed, invalid: extracted.invalid };
};
