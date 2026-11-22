import { MetadataApiClient } from 'twenty-client-sdk/metadata';

export const canAttachRecordToInbox = async (objectName: string) => {
  const client = new MetadataApiClient({ runAs: 'application' });
  const { objects } = await client.query({
    objects: {
      __args: { filter: {}, paging: { first: 1000 } },
      edges: { node: { id: true, nameSingular: true } },
    },
  });
  const target = objects.edges.find(
    ({ node }) => node.nameSingular === 'agentChatThreadTarget',
  )?.node;
  if (!target) return false;
  const { object } = await client.query({
    object: {
      __args: { id: target.id },
      fields: {
        __args: { filter: {}, paging: { first: 1000 } },
        edges: {
          node: {
            relation: { targetObjectMetadata: { nameSingular: true } },
            morphRelations: { targetObjectMetadata: { nameSingular: true } },
          },
        },
      },
    },
  });
  return object.fields.edges.some(
    ({ node: field }) =>
      field.relation?.targetObjectMetadata?.nameSingular === objectName ||
      field.morphRelations?.some(
        (relation) =>
          relation.targetObjectMetadata?.nameSingular === objectName,
      ),
  );
};
