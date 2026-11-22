import { z } from 'zod';
import { creatorIdentity, toChannel } from './creators';
import { NanoClient } from './nano-client';
import { getNanoClient } from './credentials';
import { saveMembership } from './memberships';
import { Workspace } from './workspace';

export const flagInputSchema = z.object({
  listId: z.uuid(),
  creatorIds: z.array(z.uuid()).min(1).max(20),
  flag: z.enum(['fav', 'hide', 'del']),
});

export const setFlags = async (
  input: z.infer<typeof flagInputSchema>,
  workspace = new Workspace(),
  nanoOverride?: NanoClient,
) => {
  const list = await workspace.get(
    'List',
    input.listId,
    'externalKey projectId connectionId',
  );
  const nano =
    nanoOverride ??
    (await getNanoClient(
      typeof list.connectionId === 'string' ? list.connectionId : undefined,
    ));
  if (!list.connectionId && nano.connectionId !== 'legacy')
    throw new Error(
      'Sync and bind this list to its original Nano connection before changing membership.',
    );
  const projectId = z
    .string()
    .regex(/^\d+$/)
    .parse(list.projectId || String(list.externalKey).split(':').pop());
  const updated: string[] = [];
  const failed: { creatorId: string; error: string }[] = [];
  for (const creatorId of [...new Set(input.creatorIds)]) {
    try {
      const creator = await workspace.get(
        'Creator',
        creatorId,
        'nanoId platform name emails',
      );
      const channel = toChannel(creator);
      await nano.setFlag(projectId, channel, input.flag);
      await saveMembership(
        workspace,
        list.id,
        creatorId,
        creatorIdentity(channel),
        {
          name: creator.name,
          creatorId,
          listId: list.id,
          flag:
            input.flag === 'fav'
              ? 'FAVOURITE'
              : input.flag === 'hide'
                ? 'HIDDEN'
                : 'REMOVED',
          syncedAt: new Date().toISOString(),
        },
      );
      updated.push(creatorId);
    } catch (error) {
      failed.push({
        creatorId,
        error:
          error instanceof Error
            ? error.message
            : 'Could not update Nano. Pull the list again before retrying.',
      });
    }
  }
  return { updated, failed };
};
