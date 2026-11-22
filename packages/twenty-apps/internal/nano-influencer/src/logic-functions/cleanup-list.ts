import { defineLogicFunction } from 'twenty-sdk/define';
import { z } from 'zod';
import { IDENTIFIERS } from '../constants/identifiers';
import { getNanoPreferences } from '../utils/preferences';
import { enqueue } from './lib/jobs';
import { Workspace, WorkspaceRateLimitError } from './lib/workspace';
export const cleanupList = async (
  listId: string,
  workspace = new Workspace(),
) => {
  if (getNanoPreferences().removedListPolicy !== 'TRASH')
    return { status: 'KEPT' };
  const list = await workspace.get('List', listId, 'syncStatus');
  if (list.syncStatus !== 'REMOVED') return { status: 'KEPT' };
  const memberships = await workspace.find(
    'Membership',
    { listId: { eq: listId } },
    'id',
    25,
  );
  for (const membership of memberships)
    await workspace.trash('Membership', membership.id);
  if (memberships.length === 25) {
    await enqueue(IDENTIFIERS.cleanupList, { listId }, 2_000);
    return { status: 'SYNCING' };
  }
  await workspace.trash('List', listId);
  return { status: 'TRASHED' };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.cleanupList,
  name: 'cleanup-list',
  description:
    'Apply opt-in Trash policy to a Nano list that is no longer available',
  timeoutSeconds: 120,
  handler: async (payload: unknown) => {
    const input = z.object({ listId: z.uuid() }).parse(payload);
    try {
      return await cleanupList(input.listId);
    } catch (error) {
      if (error instanceof WorkspaceRateLimitError) {
        await enqueue(
          IDENTIFIERS.cleanupList,
          input,
          error.retryAfterMs + 2_000,
        );
        return { status: 'DEFERRED' };
      }
      throw error;
    }
  },
});
