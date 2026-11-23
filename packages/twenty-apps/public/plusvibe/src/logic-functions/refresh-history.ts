import { defineLogicFunction } from 'twenty-sdk/define';
import { kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { SELECTION_KEY } from 'src/constants/plusvibe';
import { CURSOR_PAGE_SCHEMA } from 'src/logic-functions/utils/page-schema';
import { plusvibeRequest } from 'src/logic-functions/utils/plusvibe-api';
import { syncNativeEmail } from 'src/logic-functions/utils/native-email';
import { mapEmail } from 'src/logic-functions/utils/map-email';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';

export const refreshHistoryHandler = async (payload: unknown) => {
  if (!(await canManageApplication()))
    throw new Error('Application management permission is required');
  const input = z
    .object({ workspaceId: z.string(), cursor: z.string().optional() })
    .parse(payload);
  if (
    !((await kv.get<string[]>(SELECTION_KEY)) ?? []).includes(input.workspaceId)
  )
    throw new Error('Workspace is not selected');
  const page = await plusvibeRequest('/unibox/emails', CURSOR_PAGE_SCHEMA, {
    query: {
      workspace_id: input.workspaceId,
      starting_after: input.cursor ?? '',
      email_type: 'all',
      preview_only: 'false',
    },
    retryRateLimits: true,
  });
  let imported = 0;
  const failures: { index: number; error: string }[] = [];
  for (const [index, source] of page.data.entries()) {
    try {
      await syncNativeEmail(mapEmail(source, input.workspaceId, ''));
      imported++;
    } catch (error) {
      failures.push({
        index,
        error: error instanceof Error ? error.message : 'Email import failed',
      });
    }
  }
  if (
    page.has_more &&
    (!page.next_starting_after || page.next_starting_after === input.cursor)
  )
    throw new Error('PlusVibe pagination did not advance');
  return {
    imported,
    failures,
    nextCursor: page.has_more ? page.next_starting_after : null,
  };
};

export default defineLogicFunction({
  universalIdentifier: 'df624373-421b-47b3-b111-09af5c00d701',
  name: 'plusvibe-refresh-history',
  timeoutSeconds: 300,
  handler: refreshHistoryHandler,
});
