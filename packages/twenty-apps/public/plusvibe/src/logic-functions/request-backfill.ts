import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { z } from 'zod';
import {
  kv,
  listConnections,
  type LogicFunctionExecutionContext,
  Response,
} from 'twenty-sdk/logic-function';

import {
  ACCOUNT_PROVIDER_NAMES,
  getRegistrationKey,
  type PlusvibeRegistration,
  type PlusvibeImportState,
  getImportKey,
  SELECTION_KEY,
} from 'src/constants/plusvibe';
import { REQUEST_BACKFILL_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';
import { retryFailedSyncJobs } from 'src/logic-functions/utils/sync-jobs';
import { startImport } from 'src/logic-functions/utils/start-import';

export const requestBackfillHandler = async (
  event?: RoutePayload<unknown>,
  context?: Pick<LogicFunctionExecutionContext, 'userWorkspaceId'>,
) => {
  if (!context?.userWorkspaceId && !(await canManageApplication()))
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
  if (context?.userWorkspaceId) {
    const connections = (await listConnections({})).filter(
      (connection) =>
        ACCOUNT_PROVIDER_NAMES.includes(connection.providerName) &&
        connection.userWorkspaceId === context.userWorkspaceId,
    );
    for (const workspaceId of workspaceIds) {
      const registration = await kv.get<PlusvibeRegistration>(
        getRegistrationKey(workspaceId),
      );
      if (
        !connections.some((connection) =>
          registration?.accountConnectionId
            ? connection.id === registration.accountConnectionId
            : connection.externalAccountId === registration?.apiKeyFingerprint,
        )
      )
        return new Response(
          { error: 'This workspace belongs to another member’s connection' },
          { status: 403 },
        );
    }
  }
  for (const workspaceId of workspaceIds) {
    const key = getImportKey(workspaceId);
    const state = await kv.get<PlusvibeImportState>(key);
    if (state?.version === 5) {
      await retryFailedSyncJobs(workspaceId, state.runId);
      if (
        state.phase === 'failed' &&
        ['campaigns', 'leads', 'emails', 'archivedEmails'].includes(
          state.failedPhase ?? '',
        )
      ) {
        await kv.set(key, {
          ...state,
          phase: state.failedPhase,
          failedPhase: undefined,
          error: undefined,
          updatedAt: new Date().toISOString(),
        });
      }
      await retryFailedSyncJobs(workspaceId, 'webhook');
    }
    await startImport(workspaceId);
  }
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
