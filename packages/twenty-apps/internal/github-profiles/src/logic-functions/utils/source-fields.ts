import { z } from 'zod';
import {
  createWorkspaceClient,
  type WorkspaceClient,
} from 'src/logic-functions/utils/workspace-client';
import { normalizeGithubLogin } from 'src/logic-functions/utils/github-api';
import { type SourceType } from 'src/types/sync-settings';

export type SourceField = {
  name: string;
  label: string;
  type: 'TEXT' | 'LINKS';
  universalIdentifier: string;
};
export const listSourceFields = async (
  sourceType: SourceType,
  client = createWorkspaceClient('/metadata'),
): Promise<SourceField[]> => {
  let objectId: string | undefined;
  let objectCursor: string | null = null;
  do {
    const objects: {
      objects: {
        edges: { node: { id: string; nameSingular: string } }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await client.request(
      'query SourceObjects($after:ConnectionCursor){objects(paging:{first:100,after:$after}){edges{node{id nameSingular}}pageInfo{hasNextPage endCursor}}}',
      { after: objectCursor },
    );
    objectId = objects.objects.edges.find(
      ({ node }) => node.nameSingular === sourceType,
    )?.node.id;
    objectCursor = objects.objects.pageInfo.hasNextPage
      ? objects.objects.pageInfo.endCursor
      : null;
  } while (!objectId && objectCursor);
  if (!objectId) throw new Error('Source object is unavailable.');
  const fields: SourceField[] = [];
  let after: string | null = null;
  do {
    const response: {
      fields: {
        edges: {
          node: {
            name: string;
            label: string;
            type: string;
            universalIdentifier: string;
            settings?: unknown;
          };
        }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await client.request(
      'query($objectId:UUID!,$after:ConnectionCursor){fields(filter:{objectMetadataId:{eq:$objectId}},paging:{first:200,after:$after}){edges{node{name label type universalIdentifier settings}}pageInfo{hasNextPage endCursor}}}',
      { objectId, after },
    );
    for (const { node } of response.fields.edges)
      if (
        (node.type === 'TEXT' || node.type === 'LINKS') &&
        !z.object({ type: z.literal('domain') }).safeParse(node.settings)
          .success &&
        /^[a-zA-Z][a-zA-Z0-9]*$/.test(node.name) &&
        !['id', 'createdAt', 'updatedAt', 'deletedAt'].includes(node.name)
      )
        fields.push({ ...node, type: node.type });
    after = response.fields.pageInfo.hasNextPage
      ? response.fields.pageInfo.endCursor
      : null;
  } while (after);
  return fields;
};

const linksSchema = z.object({
  primaryLinkUrl: z.string().nullish(),
  secondaryLinks: z.array(z.object({ url: z.string() })).nullish(),
});
export const extractGithubLogins = (
  value: unknown,
): { logins: string[]; invalid: number } => {
  let values: string[] = [];
  if (typeof value === 'string')
    values = value.trim() ? value.trim().split(/[\s,;]+/) : [];
  else if (value !== null && value !== undefined) {
    const links = linksSchema.safeParse(value);
    if (!links.success) return { logins: [], invalid: 1 };
    values = [
      links.data.primaryLinkUrl ?? '',
      ...(links.data.secondaryLinks ?? []).map((link) => link.url),
    ].filter(Boolean);
  }
  const logins = new Map<string, string>();
  let invalid = 0;
  for (const raw of values) {
    try {
      const candidate = /^(?:www\.)?github\.com\//i.test(raw)
        ? `https://${raw.replace(/^www\./i, '')}`
        : raw;
      const login = normalizeGithubLogin(candidate);
      if (!logins.has(login.toLowerCase()))
        logins.set(login.toLowerCase(), login);
    } catch {
      invalid++;
    }
  }
  return { logins: [...logins.values()], invalid };
};
export const sourceSelection = (sourceType: SourceType, field: SourceField) =>
  `id name${sourceType === 'person' ? ' {firstName lastName}' : ''} ${field.name}${field.type === 'LINKS' ? ' {primaryLinkUrl secondaryLinks}' : ''}`;
export const readSourceRecord = async (
  sourceType: SourceType,
  recordId: string,
  field: SourceField,
  client: WorkspaceClient,
) => {
  const collection = sourceType === 'person' ? 'people' : 'companies';
  const result = await client.request<
    Record<string, { edges: { node: Record<string, unknown> }[] }>
  >(
    `query($id:UUID!){${collection}(filter:{id:{eq:$id}},first:1){edges{node{${sourceSelection(sourceType, field)}}}}}`,
    { id: recordId },
  );
  return result[collection].edges[0]?.node ?? null;
};
