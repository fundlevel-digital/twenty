import { defineLogicFunction } from 'twenty-sdk/define';
import { z } from 'zod';
import { setFlags } from './lib/flags';
import { unwrapInput } from './lib/unwrap-input';
import { Workspace } from './lib/workspace';

const inputSchema = z.object({
  membershipIds: z.array(z.uuid()).min(1).max(20),
  flag: z.enum(['fav', 'hide', 'del']),
});

export default defineLogicFunction({
  universalIdentifier: 'ac32905e-3903-4ccb-b1f3-e030c26e94b5',
  name: 'membership-state',
  timeoutSeconds: 360,
  httpRouteTriggerSettings: {
    path: '/nano-influencer/membership-state',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
  handler: async (payload: unknown) => {
    const input = inputSchema.parse(unwrapInput(payload));
    const workspace = new Workspace();
    const updated: string[] = [];
    const failed: { creatorId: string; error: string }[] = [];
    for (const id of [...new Set(input.membershipIds)]) {
      const membership = await workspace.get(
        'Membership',
        id,
        'creatorId listId',
      );
      const result = await setFlags(
        {
          creatorIds: [z.uuid().parse(membership.creatorId)],
          listId: z.uuid().parse(membership.listId),
          flag: input.flag,
        },
        workspace,
      );
      updated.push(...result.updated);
      failed.push(...result.failed);
    }
    return { updated, failed };
  },
});
