import { Workspace } from './workspace';

export const saveMembership = async (
  workspace: Workspace,
  listId: string,
  creatorId: string,
  identity: string,
  data: Record<string, unknown>,
) => {
  const externalKey = `${listId}:${identity}`;
  const existing = await workspace.find(
    'Membership',
    {
      and: [{ listId: { eq: listId } }, { creatorId: { eq: creatorId } }],
    },
    'id',
    1,
  );
  if (existing.length)
    return workspace.update('Membership', existing[0].id, {
      ...data,
      externalKey,
    });
  return workspace.upsert('Membership', externalKey, data);
};
