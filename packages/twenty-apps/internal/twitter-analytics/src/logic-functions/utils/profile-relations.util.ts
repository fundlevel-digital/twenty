import { isNonEmptyString } from '@sniptt/guards';
import { PROFILE_RELATION_IDENTIFIERS } from 'src/constants/profile-relation-identifiers';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';
import { resolveTwitterProfileInput } from 'src/logic-functions/utils/resolve-twitter-profile-input.util';

export type ProfileRelationKind = 'company' | 'person';
export type ProfileCreationMode = 'OFF' | 'LINK_EXISTING' | 'CREATE_MISSING';
export type ProfileRelationSettings = {
  sourceField: string;
  autoMode: ProfileCreationMode;
  linkMode: 'ADD_ONLY' | 'SYNC_MANAGED';
};
export type RelationSourceField = { name: string; label: string; type: string };
export type ProfileRelationResult = {
  scanned: number;
  profilesCreated: number;
  relationsCreated: number;
  relationsRemoved: number;
  existing: number;
  skipped: number;
  invalid: number;
  plannedProfileHandles: string[];
};
export const emptyProfileRelationResult = (): ProfileRelationResult => ({
  scanned: 0,
  profilesCreated: 0,
  relationsCreated: 0,
  relationsRemoved: 0,
  existing: 0,
  skipped: 0,
  invalid: 0,
  plannedProfileHandles: [],
});

export const getProfileRelationSettings = (
  kind: ProfileRelationKind,
): ProfileRelationSettings => {
  const prefix = kind.toUpperCase();
  const autoMode = process.env[`${prefix}_AUTO_MODE`] ?? 'OFF';
  const linkMode = process.env[`${prefix}_LINK_MODE`] ?? 'ADD_ONLY';
  if (
    !['OFF', 'LINK_EXISTING', 'CREATE_MISSING'].includes(autoMode) ||
    !['ADD_ONLY', 'SYNC_MANAGED'].includes(linkMode)
  )
    throw new Error('Invalid profile relation preferences');
  return {
    sourceField: process.env[`${prefix}_SOURCE_FIELD`] ?? '',
    autoMode: autoMode as ProfileCreationMode,
    linkMode: linkMode as ProfileRelationSettings['linkMode'],
  };
};

export const getSourceFields = async (
  metadata: WorkspaceGraphqlClient,
  objectIdentifier: string,
): Promise<RelationSourceField[]> => {
  const result = await metadata.request<{
    objects: { edges: { node: { id: string } }[] };
  }>(
    'query SourceObject($identifier: UUID!) { objects(filter: {universalIdentifier: {eq: $identifier}}, paging: {first: 1}) { edges { node { id } } } }',
    {
      identifier: objectIdentifier,
    },
  );
  const objectId = result.objects.edges[0]?.node.id;
  if (!objectId) throw new Error('The source object is unavailable');
  const fields: RelationSourceField[] = [];
  let cursor: string | undefined;
  do {
    const response: {
      fields: {
        edges: { node: RelationSourceField }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    } = await metadata.request(
      'query SourceFields($objectId: UUID!, $after: ConnectionCursor) { fields(filter: {objectMetadataId: {eq: $objectId}}, paging: {first: 200, after: $after}) { edges { node { name label type } } pageInfo { hasNextPage endCursor } } }',
      { objectId, after: cursor },
    );
    fields.push(
      ...response.fields.edges
        .map(({ node }) => node)
        .filter(({ type }) => type === 'TEXT' || type === 'LINKS'),
    );
    const nextCursor = response.fields.pageInfo.hasNextPage
      ? response.fields.pageInfo.endCursor
      : undefined;
    if (nextCursor && nextCursor === cursor)
      throw new Error('Source field pagination repeated');
    cursor = nextCursor;
  } while (cursor);
  return fields;
};

export const getRelationSourceFields = (
  metadata: WorkspaceGraphqlClient,
  kind: ProfileRelationKind,
) => getSourceFields(metadata, PROFILE_RELATION_IDENTIFIERS[kind].sourceObject);

export const chooseRelationSourceField = (
  fields: RelationSourceField[],
  sourceField: string,
): RelationSourceField | undefined => {
  if (sourceField) {
    const field = fields.find(({ name }) => name === sourceField);
    if (!field)
      throw new Error(
        'The configured X link field is unavailable. Update Profile Relations preferences.',
      );
    return field;
  }
  return [
    'xLink',
    'pdlTwitterUrl',
    'twitterLink',
    'twitterUrl',
    'xUrl',
    'twitterHandle',
    'xHandle',
    'twitter',
  ]
    .map((name) => fields.find((field) => field.name === name))
    .find(Boolean);
};

export const extractTwitterHandles = (
  value: unknown,
): { handles: string[]; invalid: number } => {
  const values: unknown[] = typeof value === 'string' ? [value] : [];
  if (value && typeof value === 'object' && 'primaryLinkUrl' in value)
    values.push(value.primaryLinkUrl);
  if (
    value &&
    typeof value === 'object' &&
    'secondaryLinks' in value &&
    Array.isArray(value.secondaryLinks)
  ) {
    for (const link of value.secondaryLinks)
      if (link && typeof link === 'object' && 'url' in link)
        values.push(link.url);
  }
  const handles = new Set<string>();
  let invalid = 0;
  for (const text of values) {
    if (!isNonEmptyString(text) || !text.trim()) continue;
    const input = resolveTwitterProfileInput({
      recordId: '',
      twitterId: null,
      twitterHandle: /^https?:\/\//i.test(text) ? null : text,
      twitterUrl: /^https?:\/\//i.test(text) ? text : null,
    });
    if (input) handles.add(input.value.toLowerCase());
    else invalid++;
  }
  return { handles: [...handles], invalid };
};

type RelatedProfile = { id: string; twitterHandle: string };
const findProfile = async (
  client: WorkspaceGraphqlClient,
  handle: string,
): Promise<RelatedProfile | undefined> => {
  const pattern = handle.replace(/_/g, '\\_');
  const result = await client.request<{
    twitterProfiles: { edges: { node: RelatedProfile }[] };
  }>(
    'query RelatedProfile($plain: String!, $handle: String!) { twitterProfiles(first: 2, filter: {or: [{twitterHandle: {ilike: $plain}}, {twitterHandle: {ilike: $handle}}]}) { edges { node { id twitterHandle } } } }',
    { plain: pattern, handle: `@${pattern}` },
  );
  if (result.twitterProfiles.edges.length > 1)
    throw new Error(
      'Multiple Twitter Profiles match a handle; resolve duplicates before relating',
    );
  return result.twitterProfiles.edges[0]?.node;
};

export const relateSourceRecords = async ({
  client,
  kind,
  sourceField,
  settings,
  mode,
  dryRun,
  records,
}: {
  client: WorkspaceGraphqlClient;
  kind: ProfileRelationKind;
  sourceField: RelationSourceField;
  settings: ProfileRelationSettings;
  mode: Exclude<ProfileCreationMode, 'OFF'>;
  dryRun: boolean;
  records: { id: string; name?: unknown; [key: string]: unknown }[];
}): Promise<ProfileRelationResult> => {
  const result = emptyProfileRelationResult();
  const label = kind === 'company' ? 'Company' : 'Person';
  const join = `twitterProfile${label}`;
  const joins =
    kind === 'company' ? 'twitterProfileCompanies' : 'twitterProfilePeople';
  const plannedProfiles = new Set<string>();
  for (const record of records) {
    const sourceName = record.name;
    const displayName =
      typeof sourceName === 'string'
        ? sourceName
        : sourceName && typeof sourceName === 'object'
          ? ['firstName', 'lastName']
              .flatMap((key) =>
                key in sourceName &&
                typeof sourceName[key as keyof typeof sourceName] === 'string'
                  ? [sourceName[key as keyof typeof sourceName]]
                  : [],
              )
              .join(' ')
          : '';
    result.scanned++;
    const { handles, invalid } = extractTwitterHandles(
      record[sourceField.name],
    );
    result.invalid += invalid;
    if (handles.length === 0 && settings.linkMode === 'ADD_ONLY') {
      result.skipped++;
      continue;
    }
    const existing = await client.request<{
      [key: string]: {
        edges: {
          node: {
            id: string;
            twitterProfileId: string;
            automaticallyManaged: boolean;
          };
        }[];
      };
    }>(
      `query ExistingRelations($id: UUID!) { ${joins}(first: 1000, filter: {${kind}Id: {eq: $id}}) { edges { node { id twitterProfileId automaticallyManaged } } } }`,
      { id: record.id },
    );
    const edges = existing[joins].edges.map(({ node }) => node);
    if (edges.length >= 1000)
      throw new Error(
        'Too many existing profile relations to synchronize safely',
      );
    const wanted = new Set<string>();
    for (const handle of handles) {
      let profile = await findProfile(client, handle);
      if (!profile && mode === 'LINK_EXISTING') {
        result.skipped++;
        continue;
      }
      if (!profile) {
        if (!plannedProfiles.has(handle)) result.profilesCreated++;
        plannedProfiles.add(handle);
        if (!dryRun) {
          try {
            const created = await client.request<{
              createTwitterProfile: RelatedProfile;
            }>(
              'mutation CreateRelatedProfile($data: TwitterProfileCreateInput!) { createTwitterProfile(data: $data) { id twitterHandle } }',
              {
                data: {
                  name: `@${handle}`,
                  twitterHandle: `@${handle}`,
                  twitterUrl: `https://x.com/${handle}`,
                  calculationsEnabled: false,
                },
              },
            );
            profile = created.createTwitterProfile;
          } catch (error) {
            profile = await findProfile(client, handle);
            if (!profile) throw error;
            result.profilesCreated--;
          }
        }
      }
      if (profile) wanted.add(profile.id);
      if (
        profile &&
        edges.some(({ twitterProfileId }) => twitterProfileId === profile.id)
      ) {
        result.existing++;
        continue;
      }
      let removedRelation:
        { id: string; automaticallyManaged: boolean } | undefined;
      if (profile) {
        const removed = await client.request<{
          [key: string]: {
            edges: { node: { id: string; automaticallyManaged: boolean } }[];
          };
        }>(
          `query RemovedRelation($targetId: UUID!, $profileId: UUID!) { ${joins}(first: 1, filter: {${kind}Id: {eq: $targetId}, twitterProfileId: {eq: $profileId}, deletedAt: {is: NOT_NULL}}) { edges { node { id automaticallyManaged } } } }`,
          { targetId: record.id, profileId: profile.id },
        );
        removedRelation = removed?.[joins]?.edges[0]?.node;
      }
      if (removedRelation && !removedRelation.automaticallyManaged) {
        result.skipped++;
        continue;
      }
      result.relationsCreated++;
      if (!dryRun && profile) {
        if (removedRelation) {
          await client.request(
            `mutation RestoreRelation($id: UUID!) { restore${join[0].toUpperCase()}${join.slice(1)}(id: $id) { id } }`,
            { id: removedRelation.id },
          );
          continue;
        }
        try {
          await client.request(
            `mutation CreateRelation($data: ${join[0].toUpperCase()}${join.slice(1)}CreateInput!) { create${join[0].toUpperCase()}${join.slice(1)}(data: $data) { id } }`,
            {
              data: {
                name: displayName
                  ? `${displayName} · ${profile.twitterHandle}`
                  : profile.twitterHandle,
                twitterProfileId: profile.id,
                [`${kind}Id`]: record.id,
                automaticallyManaged: true,
              },
            },
          );
        } catch (error) {
          const concurrent = await client.request<{
            [key: string]: { edges: { node: { id: string } }[] };
          }>(
            `query ConcurrentRelation($targetId: UUID!, $profileId: UUID!) { ${joins}(first: 1, filter: {${kind}Id: {eq: $targetId}, twitterProfileId: {eq: $profileId}}) { edges { node { id } } } }`,
            { targetId: record.id, profileId: profile.id },
          );
          if (concurrent[joins].edges.length === 0) throw error;
          result.relationsCreated--;
          result.existing++;
        }
      }
    }
    const obsoleteRelations =
      settings.linkMode === 'SYNC_MANAGED' && invalid === 0
        ? edges.filter(
            (edge) =>
              edge.automaticallyManaged && !wanted.has(edge.twitterProfileId),
          )
        : [];
    for (const edge of obsoleteRelations) {
      result.relationsRemoved++;
      if (!dryRun)
        await client.request(
          `mutation RemoveRelation($id: UUID!) { delete${join[0].toUpperCase()}${join.slice(1)}(id: $id) { id } }`,
          { id: edge.id },
        );
    }
    if (handles.length === 0 && obsoleteRelations.length === 0)
      result.skipped++;
  }
  result.plannedProfileHandles = [...plannedProfiles];
  return result;
};
