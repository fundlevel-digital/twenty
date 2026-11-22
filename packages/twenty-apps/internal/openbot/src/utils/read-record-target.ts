import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { type RecordTarget } from '../types';

export const getRecordObjects = async () => {
  const { objects } = await new MetadataApiClient().query({
    objects: {
      __args: { filter: {}, paging: { first: 1000 } },
      edges: {
        node: { nameSingular: true, namePlural: true, labelPlural: true },
      },
    },
  });
  return objects.edges.map(({ node }) => node);
};

export const readRecordTarget = async (
  target: RecordTarget,
  objects: Awaited<ReturnType<typeof getRecordObjects>>,
) => {
  if (
    !/^[a-zA-Z][a-zA-Z0-9]*$/.test(target.objectName) ||
    !/^[0-9a-f-]{36}$/i.test(target.recordId)
  )
    throw new Error('Select a record');
  const objectMetadata = objects.find(
    (object) => object.nameSingular === target.objectName,
  );
  if (!objectMetadata || target.objectName === 'recordComment')
    throw new Error('Object unavailable');
  // Comment storage privileges never substitute for the caller's record access.
  const { data } = await new RestApiClient().get<{
    data: Record<
      string,
      { id: string; name?: string | { firstName?: string; lastName?: string } }
    >;
  }>(`/rest/${objectMetadata.namePlural}/${target.recordId}`);
  const record = data[target.objectName];
  if (!record?.id) throw new Error('Record unavailable');
  const recordLabel =
    typeof record.name === 'string'
      ? record.name
      : record.name
        ? `${record.name.firstName ?? ''} ${record.name.lastName ?? ''}`.trim()
        : target.objectName;
  return {
    recordLabel,
    objectLabel: objectMetadata.labelPlural ?? objectMetadata.namePlural,
  };
};
