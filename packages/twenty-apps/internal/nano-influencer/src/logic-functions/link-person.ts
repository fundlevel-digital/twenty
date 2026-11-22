import { defineLogicFunction } from 'twenty-sdk/define';
import { z } from 'zod';
import { IDENTIFIERS } from '../constants/identifiers';
import { linkCreatorPerson } from './lib/people';
import { enqueue } from './lib/jobs';
import { Workspace, WorkspaceRateLimitError } from './lib/workspace';
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.personLink,
  name: 'link-person',
  description:
    'Match creator emails to People and apply the configured creation policy',
  timeoutSeconds: 120,
  handler: async (payload: unknown) => {
    const input = z.object({ creatorId: z.uuid() }).parse(payload);
    try {
      return await linkCreatorPerson(input.creatorId);
    } catch (error) {
      if (error instanceof WorkspaceRateLimitError) {
        await enqueue(
          IDENTIFIERS.personLink,
          input,
          error.retryAfterMs + 2_000,
        );
        return { status: 'DEFERRED' };
      }
      await new Workspace().update('Creator', input.creatorId, {
        personLinkStatus: 'ERROR',
        personLinkError: 'Person matching failed. Sync the creator to retry.',
      });
      return { status: 'FAILED' };
    }
  },
});
