import { v4 as uuidv4 } from 'uuid';
import camelCase from 'lodash.camelcase';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { isDefined } from 'twenty-sdk/utils';
import { isObject } from '@sniptt/guards';
import {
  type ListObject,
  type ListConfiguration,
  type NavigationItem,
} from 'src/types/list-metadata';

const client = () => new RestApiClient({ runAs: 'user' });

type GraphqlResponse<TData> = { data?: TData; errors?: { message: string }[] };
export const metadataRequest = async <TData>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<TData> => {
  const response = await client().post<GraphqlResponse<TData>>('/metadata', {
    query,
    variables,
  });
  if (response.errors?.length || !isDefined(response.data)) {
    throw new Error(
      response.errors?.map((error) => error.message).join('; ') ||
        'The metadata request failed.',
    );
  }
  return response.data;
};

export const parseList = (
  description: string | null,
): ListConfiguration | null => {
  if (!description?.startsWith('better-lists:v1:')) return null;
  const [parentObjectName, emoji, slug] = description
    .slice('better-lists:v1:'.length)
    .split('|');
  return parentObjectName && emoji && slug
    ? { parentObjectName, emoji, slug }
    : null;
};

export const loadObjects = async (): Promise<ListObject[]> => {
  const objects: ListObject[] = [];
  let after: string | null = null;
  do {
    const data: {
      objects: {
        edges: { node: ListObject }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await metadataRequest(
      'query($after:ConnectionCursor){objects(paging:{first:200,after:$after}){edges{node{id nameSingular namePlural labelPlural description icon isActive isSystem fieldsList{id name type options}}} pageInfo{hasNextPage endCursor}}}',
      { after },
    );
    objects.push(...data.objects.edges.map((edge) => edge.node));
    after = data.objects.pageInfo.hasNextPage
      ? data.objects.pageInfo.endCursor
      : null;
  } while (after);
  return objects;
};

const updateMembershipOptions = async (id: string, options: unknown[]) =>
  metadataRequest(
    'mutation($id:UUID!,$update:UpdateFieldInput!){updateOneField(input:{id:$id,update:$update}){id}}',
    { id, update: { options } },
  );

export const createList = async ({
  name,
  emoji,
  parent,
  objects,
}: {
  name: string;
  emoji: string;
  parent: ListObject;
  objects: ListObject[];
}): Promise<ListObject> => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  if (
    !slug ||
    objects.some((object) => parseList(object.description)?.slug === slug)
  )
    throw new Error('Choose a unique list name.');
  if (!emoji.trim() || emoji.includes('|')) throw new Error('Choose an emoji.');
  const identifier = camelCase(`betterList${uuidv4().replace(/-/g, '')}`);
  // Publish the managed marker after setup so rollback never casts a missing membership enum.
  const { createOneObject: list } = await metadataRequest<{
    createOneObject: ListObject;
  }>(
    'mutation($input:CreateOneObjectInput!){createOneObject(input:$input){id nameSingular namePlural labelPlural description icon isActive isSystem fieldsList{id name type options}}}',
    {
      input: {
        object: {
          nameSingular: identifier,
          namePlural: camelCase(`${identifier}Entries`),
          labelSingular: `${name.trim()} Entry`,
          labelPlural: name.trim(),
          icon: 'IconListDetails',
          color: 'gray',
          isLabelSyncedWithName: false,
          description: 'List setup in progress.',
        },
      },
    },
  );
  const field = parent.fieldsList.find(
    (field) => field.name === 'betterListEntries',
  );
  const value = `LIST_${list.id.replace(/-/g, '').toUpperCase()}`;
  let membershipInstalled = false;
  try {
    if (field && field.type !== 'MULTI_SELECT')
      throw new Error('The parent has an incompatible List Entries field.');
    const option = {
      id: uuidv4(),
      value,
      label: name.trim(),
      position: field?.options?.length ?? 0,
      color: 'gray',
    };
    const options = [...(field?.options ?? []), option].map(
      (option, position) => ({ ...option, position }),
    );
    if (field) await updateMembershipOptions(field.id, options);
    else
      await metadataRequest(
        'mutation($input:CreateOneFieldMetadataInput!){createOneField(input:$input){id}}',
        {
          input: {
            field: {
              objectMetadataId: parent.id,
              name: 'betterListEntries',
              label: 'List Entries',
              type: 'MULTI_SELECT',
              icon: 'IconListDetails',
              isNullable: true,
              options,
            },
          },
        },
      );
    membershipInstalled = true;
    await metadataRequest(
      'mutation($input:CreateOneFieldMetadataInput!){createOneField(input:$input){id}}',
      {
        input: {
          field: {
            objectMetadataId: list.id,
            name: 'parentRecord',
            label: 'Parent Record',
            type: 'RELATION',
            icon: parent.icon ?? 'IconAddressBook',
            isNullable: false,
            relationCreationPayload: {
              type: 'MANY_TO_ONE',
              targetObjectMetadataId: parent.id,
              targetFieldLabel: `${name.trim()} Entries`,
              targetFieldIcon: 'IconListDetails',
            },
          },
        },
      },
    );
    const description = `better-lists:v1:${parent.nameSingular}|${emoji.trim()}|${slug}`;
    await metadataRequest(
      'mutation($id:UUID!,$update:UpdateObjectPayload!){updateOneObject(input:{id:$id,update:$update}){id}}',
      { id: list.id, update: { description } },
    );
    const { navigationMenuItems: items } = await metadataRequest<{
      navigationMenuItems: NavigationItem[];
    }>(
      '{navigationMenuItems{id type name parentId targetObjectMetadataId userWorkspaceId position}}',
    );
    const workspaceItems = items.filter((item) => !item.userWorkspaceId);
    const listIds = new Set(
      objects
        .filter((object) => parseList(object.description))
        .map((object) => object.id),
    );
    let folder =
      workspaceItems.find(
        (item) =>
          item.type === 'FOLDER' &&
          workspaceItems.some(
            (child) =>
              child.parentId === item.id &&
              child.targetObjectMetadataId &&
              listIds.has(child.targetObjectMetadataId),
          ),
      ) ??
      workspaceItems.find(
        (item) => item.type === 'FOLDER' && item.name === 'Lists',
      );
    if (!folder) {
      const data = await metadataRequest<{
        createManyNavigationMenuItems: NavigationItem[];
      }>(
        'mutation($inputs:[CreateNavigationMenuItemInput!]!){createManyNavigationMenuItems(inputs:$inputs){id type name parentId targetObjectMetadataId userWorkspaceId position}}',
        {
          inputs: [
            {
              id: uuidv4(),
              type: 'FOLDER',
              name: 'Lists',
              icon: 'IconFolder',
              position:
                Math.max(0, ...workspaceItems.map((item) => item.position)) + 1,
            },
          ],
        },
      );
      folder = data.createManyNavigationMenuItems[0];
    }
    if (!folder) throw new Error('Could not create the Lists folder.');
    const position =
      Math.max(
        -1,
        ...workspaceItems
          .filter((item) => item.parentId === folder.id)
          .map((item) => item.position),
      ) + 1;
    const entry = workspaceItems.find(
      (item) =>
        item.type === 'OBJECT' && item.targetObjectMetadataId === list.id,
    );
    if (entry)
      await metadataRequest(
        'mutation($inputs:[UpdateOneNavigationMenuItemInput!]!){updateManyNavigationMenuItems(inputs:$inputs){id}}',
        {
          inputs: [{ id: entry.id, update: { parentId: folder.id, position } }],
        },
      );
    else
      await metadataRequest(
        'mutation($inputs:[CreateNavigationMenuItemInput!]!){createManyNavigationMenuItems(inputs:$inputs){id}}',
        {
          inputs: [
            {
              id: uuidv4(),
              type: 'OBJECT',
              parentId: folder.id,
              position,
              targetObjectMetadataId: list.id,
            },
          ],
        },
      );
    return { ...list, description };
  } catch (error) {
    await metadataRequest(
      'mutation($id:UUID!){deleteOneObject(input:{id:$id}){id}}',
      { id: list.id },
    );
    if (membershipInstalled && field)
      await updateMembershipOptions(field.id, field.options ?? []);
    throw error;
  }
};

export const addRecordsToList = async ({
  list,
  parent,
  recordIds,
}: {
  list: ListObject;
  parent: ListObject;
  recordIds: string[];
}) => {
  if (parseList(list.description)?.parentObjectName !== parent.nameSingular)
    throw new Error('This list has a different parent object.');
  const addedIds: string[] = [];
  const failedIds: string[] = [];
  for (const recordId of [...new Set(recordIds)]) {
    try {
      const response = await client().get<{
        data: Record<string, Record<string, unknown>>;
      }>(`/rest/${parent.namePlural}/${encodeURIComponent(recordId)}`);
      const record = Object.values(response.data)[0];
      const name = record?.name;
      const label =
        typeof name === 'string'
          ? name
          : isObject(name)
            ? [
                'firstName' in name ? name.firstName : undefined,
                'lastName' in name ? name.lastName : undefined,
              ]
                .filter((value) => typeof value === 'string')
                .join(' ')
            : parent.labelPlural;
      await client().post(`/rest/${list.namePlural}`, {
        parentRecordId: recordId,
        name: label || parent.labelPlural,
      });
      addedIds.push(recordId);
    } catch {
      failedIds.push(recordId);
    }
  }
  return { addedIds, failedIds };
};
