import { defineLogicFunction } from 'twenty-sdk/define';
import { z } from 'zod';
import { IDENTIFIERS } from '../constants/identifiers';
import { buildNanoAvatarUpdate } from './lib/avatar';
import { Workspace, WorkspaceRateLimitError } from './lib/workspace';
import { enqueue } from './lib/jobs';

export const syncAvatar = async (
  input: { creatorId: string; avatarUrl: string },
  workspace = new Workspace(),
) => {
  try {
    const creator = await workspace.get(
      'Creator',
      input.creatorId,
      'avatarUrl avatarFile { fileId }',
    );
    const fields = await buildNanoAvatarUpdate({
      entry: {
        avatarUrl: creator.avatarUrl,
        hasAvatar:
          Array.isArray(creator.avatarFile) && creator.avatarFile.length > 0,
      },
      avatarUrl: input.avatarUrl,
    });
    if (Object.keys(fields).length)
      await workspace.update('Creator', input.creatorId, {
        ...fields,
        avatarError: '',
      });
    return { status: 'SYNCED' };
  } catch (error) {
    if (error instanceof WorkspaceRateLimitError) {
      await enqueue(IDENTIFIERS.avatarSync, input, error.retryAfterMs + 2_000);
      return { status: 'DEFERRED' };
    }
    await workspace.update('Creator', input.creatorId, {
      avatarError:
        error instanceof Error && error.message.startsWith('Avatar ')
          ? error.message
          : 'The Nano avatar could not be imported. Refresh the creator to retry.',
    });
    return { status: 'FAILED' };
  }
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.avatarSync,
  name: 'sync-avatar',
  description: 'Import Nano creator pictures into native Twenty files',
  timeoutSeconds: 90,
  handler: (payload: unknown) =>
    syncAvatar(
      z.object({ creatorId: z.uuid(), avatarUrl: z.url() }).parse(payload),
    ),
});
