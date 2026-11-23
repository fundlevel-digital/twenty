import { defineLogicFunction } from 'twenty-sdk/define';
import { kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { SELECTION_KEY } from 'src/constants/plusvibe';
import { LEAD_SCHEMA } from 'src/logic-functions/utils/normalize-event';
import { CURSOR_PAGE_SCHEMA } from 'src/logic-functions/utils/page-schema';
import { plusvibeRequest } from 'src/logic-functions/utils/plusvibe-api';
import { syncPerson } from 'src/logic-functions/utils/sync-records';
import { AmbiguousPersonMatchError } from 'src/logic-functions/errors/ambiguous-person-match.error';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';

export const refreshLeadsHandler = async (payload: unknown) => {
  if (!(await canManageApplication()))
    throw new Error('Application management permission is required');
  const input = z
    .object({
      workspaceId: z.string().min(1),
      emails: z.array(z.email()).min(1).max(10),
    })
    .parse(payload);
  if (
    !((await kv.get<string[]>(SELECTION_KEY)) ?? []).includes(input.workspaceId)
  )
    throw new Error('Workspace is not selected');
  let imported = 0;
  for (const email of new Set(
    input.emails.map((value) => value.trim().toLowerCase()),
  )) {
    let cursor: string | undefined;
    do {
      const page = await plusvibeRequest(
        '/lead/workspace-leads',
        CURSOR_PAGE_SCHEMA,
        {
          query: {
            workspace_id: input.workspaceId,
            email,
            limit: '100',
            ...(cursor ? { starting_after: cursor } : {}),
          },
          retryRateLimits: true,
        },
      );
      for (const value of page.data) {
        const lead = LEAD_SCHEMA.parse(value);
        if (lead.email?.trim().toLowerCase() !== email) continue;
        if (lead.workspace_id && lead.workspace_id !== input.workspaceId)
          throw new Error('PlusVibe returned a foreign workspace lead');
        try {
          await syncPerson(lead, input.workspaceId, { isFullLeadRecord: true });
        } catch (error) {
          if (!(error instanceof AmbiguousPersonMatchError)) throw error;
        }
        imported++;
      }
      if (!page.has_more) break;
      if (!page.next_starting_after || page.next_starting_after === cursor)
        throw new Error('PlusVibe pagination did not advance');
      cursor = page.next_starting_after;
    } while (cursor);
  }
  return { imported };
};

export default defineLogicFunction({
  universalIdentifier: '47f8b89e-4cf1-4464-b0b5-b8a369a721bb',
  name: 'plusvibe-refresh-leads',
  timeoutSeconds: 300,
  handler: refreshLeadsHandler,
});
