import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { z } from 'zod';
import { kv, Response } from 'twenty-sdk/logic-function';

import { SELECTION_KEY } from 'src/constants/plusvibe';
import { REQUEST_BACKFILL_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';
import { startImport } from 'src/logic-functions/utils/start-import';

export const requestBackfillHandler = async (event?: RoutePayload<unknown>) => {
  if (!(await canManageApplication()))
    return new Response(
      { error: 'Application management permission is required' },
      { status: 403 },
    );
  const input = z
    .object({
      workspaceIds: z
        .array(z.string().regex(/^[a-f\d]{24}$/i))
        .max(50)
        .optional(),
    })
    .safeParse(event?.body ?? {});
  if (!input.success)
    return new Response(
      { error: 'Invalid workspace selection' },
      { status: 400 },
    );
  const selected = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
  const workspaceIds = [...new Set(input.data.workspaceIds ?? selected)];
  if (workspaceIds.some((workspaceId) => !selected.includes(workspaceId)))
    return new Response(
      { error: 'Workspace is not selected' },
      { status: 400 },
    );
  for (const workspaceId of workspaceIds) await startImport(workspaceId);
  return { success: true };
};

export default defineLogicFunction({
  universalIdentifier: REQUEST_BACKFILL_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-request-backfill',
  timeoutSeconds: 60,
  handler: requestBackfillHandler,
  httpRouteTriggerSettings: {
    path: '/plusvibe/import',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
