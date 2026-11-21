import { BOOKING_FIELDS, IDENTIFIERS } from 'src/constants/identifiers';
import { createWorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-client';
import { type MappingField } from 'src/types/connection-settings';
export const listMappingFields = async (): Promise<MappingField[]> => {
  const client = createWorkspaceGraphqlClient('/metadata');
  const result = await client.request<{
    objects: { edges: { node: { id: string } }[] };
  }>(
    `query MappingObject($identifier: UUID!) { objects(filter:{universalIdentifier:{eq:$identifier}},paging:{first:1}){edges{node{id}}} }`,
    { identifier: IDENTIFIERS.BOOKING },
  );
  const objectId = result.objects.edges[0]?.node.id;
  if (!objectId) return [];
  const fields: MappingField[] = [];
  let after: string | null = null;
  do {
    const result: {
      fields: {
        edges: {
          node: {
            name: string;
            label: string;
            type: string;
            isUnique: boolean;
            isUIEditable: boolean;
            universalIdentifier: string;
          };
        }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await client.request(
      `query MappingFields($objectId: UUID!, $after: ConnectionCursor) { fields(filter:{objectMetadataId:{eq:$objectId}},paging:{first:200,after:$after}){edges{node{name label type isUnique isUIEditable universalIdentifier}}pageInfo{hasNextPage endCursor}} }`,
      { objectId, after },
    );
    for (const { node } of result.fields.edges)
      if (
        node.type === 'TEXT' &&
        node.isUIEditable &&
        !node.isUnique &&
        !Object.values(BOOKING_FIELDS).includes(
          node.universalIdentifier as typeof BOOKING_FIELDS.name,
        ) &&
        !['id', 'createdAt', 'updatedAt', 'deletedAt'].includes(node.name)
      )
        fields.push({ name: node.name, label: node.label });
    after = result.fields.pageInfo.hasNextPage
      ? result.fields.pageInfo.endCursor
      : null;
  } while (after !== null);
  return fields;
};
