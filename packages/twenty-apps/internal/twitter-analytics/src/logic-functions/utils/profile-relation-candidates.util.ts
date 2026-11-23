import { isNonEmptyString, isObject } from '@sniptt/guards';
import {
  type ProfileRelationKind,
  type RelationSourceField,
} from 'src/logic-functions/utils/profile-relations.util';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

export type RelationSourceRecord = { id: string; [key: string]: unknown };
export type RelationSourceConnection = {
  edges: { node: RelationSourceRecord }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

const MANAGED_CURSOR_PREFIX = 'managed:';
type ManagedCursor = { after?: string; lastSourceId?: string };

export const createManagedRelationCursor = (cursor: ManagedCursor = {}) =>
  `${MANAGED_CURSOR_PREFIX}${Buffer.from(JSON.stringify(cursor)).toString('base64url')}`;

export const isManagedRelationCursor = (cursor?: string): cursor is string =>
  cursor?.startsWith(MANAGED_CURSOR_PREFIX) === true;

const hasRelationSourceValue = (value: unknown) =>
  isNonEmptyString(value) ||
  (isObject(value) &&
    (('primaryLinkUrl' in value && isNonEmptyString(value.primaryLinkUrl)) ||
      ('secondaryLinks' in value &&
        Array.isArray(value.secondaryLinks) &&
        value.secondaryLinks.length > 0)));

export const populatedRelationSourceFilter = (field: RelationSourceField) =>
  field.type === 'LINKS'
    ? {
        or: [
          {
            and: [
              { [field.name]: { primaryLinkUrl: { is: 'NOT_NULL' } } },
              { [field.name]: { primaryLinkUrl: { neq: '' } } },
            ],
          },
          {
            and: [
              { [field.name]: { secondaryLinks: { is: 'NOT_NULL' } } },
              { not: { [field.name]: { secondaryLinks: { like: '[]' } } } },
            ],
          },
        ],
      }
    : {
        and: [
          { [field.name]: { is: 'NOT_NULL' } },
          { [field.name]: { neq: '' } },
        ],
      };

export const getClearedManagedRelationSources = async ({
  client,
  kind,
  sourceField,
  selection,
  cursor,
}: {
  client: WorkspaceGraphqlClient;
  kind: ProfileRelationKind;
  sourceField: RelationSourceField;
  selection: string;
  cursor: string;
}): Promise<{ records: RelationSourceRecord[]; nextCursor: string | null }> => {
  const decoded: unknown = JSON.parse(
    Buffer.from(
      cursor.slice(MANAGED_CURSOR_PREFIX.length),
      'base64url',
    ).toString(),
  );
  if (
    !isObject(decoded) ||
    ('after' in decoded && typeof decoded.after !== 'string') ||
    ('lastSourceId' in decoded && typeof decoded.lastSourceId !== 'string')
  )
    throw new Error('Invalid managed relation cursor');
  const previous = decoded as ManagedCursor;
  const joins =
    kind === 'company' ? 'twitterProfileCompanies' : 'twitterProfilePeople';
  const response = await client.request<{
    [key: string]: {
      edges: { node: { [key: string]: RelationSourceRecord | null } }[];
      pageInfo: RelationSourceConnection['pageInfo'];
    };
  }>(
    `query ManagedSources($after: String) { ${joins}(first: 100, after: $after, filter: {automaticallyManaged: {eq: true}, ${kind}Id: {is: NOT_NULL}}, orderBy: [{${kind}Id: AscNullsLast}, {id: AscNullsLast}]) { edges { node { ${kind} { id ${selection} } } } pageInfo { hasNextPage endCursor } } }`,
    { after: previous.after },
  );
  const connection = response[joins];
  const seen = new Set(previous.lastSourceId ? [previous.lastSourceId] : []);
  const records: RelationSourceRecord[] = [];
  let lastSourceId = previous.lastSourceId;
  for (const { node } of connection.edges) {
    const record = node[kind];
    if (!record || seen.has(record.id)) continue;
    seen.add(record.id);
    lastSourceId = record.id;
    // Populated fields were processed in the source pass; only cleared fields need cleanup.
    if (!hasRelationSourceValue(record[sourceField.name])) records.push(record);
  }
  const next = connection.pageInfo.hasNextPage
    ? connection.pageInfo.endCursor
    : null;
  if (connection.pageInfo.hasNextPage && (!next || next === previous.after))
    throw new Error('Managed relation pagination did not advance');
  return {
    records,
    nextCursor: next
      ? createManagedRelationCursor({ after: next, lastSourceId })
      : null,
  };
};
