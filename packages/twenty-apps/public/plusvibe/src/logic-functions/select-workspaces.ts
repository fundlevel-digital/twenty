import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  kv,
  listConnections,
  type LogicFunctionExecutionContext,
  Response,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';

import {
  getRegistrationKey,
  ACCOUNT_PROVIDER_NAMES,
  SELECTION_KEY,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { SELECT_WORKSPACES_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { startImport } from 'src/logic-functions/utils/start-import';
import {
  getAccountConnection,
  listWorkspaces,
} from 'src/logic-functions/utils/plusvibe-api';
import { registerWorkspace } from 'src/logic-functions/utils/register-workspace';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';
import { findMailConnection } from 'src/logic-functions/utils/native-email';
import { syncWorkspace } from 'src/logic-functions/utils/sync-workspace';

export const selectWorkspacesHandler = async (
  event: RoutePayload<unknown>,
  context?: Pick<LogicFunctionExecutionContext, 'userWorkspaceId'>,
) => {
  if (!context?.userWorkspaceId && !(await canManageApplication())) {
    return new Response(
      { error: 'Application management permission is required' },
      { status: 403 },
    );
  }
  const input = z
    .object({
      accountConnectionId: z.uuid().optional(),
      workspaceIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(50),
    })
    .safeParse(event.body);
  if (!input.success) {
    return new Response(
      { error: 'Invalid workspace selection' },
      { status: 400 },
    );
  }
  const connectionId = input.data.accountConnectionId;
  if (context?.userWorkspaceId) {
    const connections = await listConnections({});
    if (
      !connections.some(
        (connection) =>
          ACCOUNT_PROVIDER_NAMES.includes(connection.providerName) &&
          connection.id === connectionId &&
          connection.userWorkspaceId === context.userWorkspaceId,
      )
    )
      return new Response(
        { error: 'Select one of your PlusVibe connections' },
        { status: 403 },
      );
  }
  const previousSelection = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
  const registrations = await Promise.all(
    previousSelection.map(async (workspaceId) => ({
      workspaceId,
      registration: await kv.get<PlusvibeRegistration>(
        getRegistrationKey(workspaceId),
      ),
    })),
  );
  const requestedWorkspaceIds = [...new Set(input.data.workspaceIds)];
  const connection = connectionId
    ? await getAccountConnection(undefined, connectionId).catch(
        (error: unknown) => {
          if (requestedWorkspaceIds.length > 0) throw error;
          return undefined;
        },
      )
    : undefined;
  const fingerprint = connection?.externalAccountId;
  const otherWorkspaceIds = connectionId
    ? registrations
        .filter(({ registration }) =>
          registration?.accountConnectionId
            ? registration.accountConnectionId !== connectionId
            : !fingerprint || registration?.apiKeyFingerprint !== fingerprint,
        )
        .map(({ workspaceId }) => workspaceId)
    : [];
  if (requestedWorkspaceIds.some((id) => otherWorkspaceIds.includes(id)))
    return new Response(
      {
        error:
          'This workspace is already synced through another PlusVibe connection',
      },
      { status: 400 },
    );
  const selectedWorkspaceIds = [...otherWorkspaceIds, ...requestedWorkspaceIds];
  const disableRemovedWorkspaces = async () => {
    for (const workspaceId of previousSelection.filter(
      (id) => !selectedWorkspaceIds.includes(id),
    )) {
      const registration = await kv.get<PlusvibeRegistration>(
        getRegistrationKey(workspaceId),
      );
      if (registration)
        await syncWorkspace(
          { _id: workspaceId, name: registration.workspaceName },
          false,
        );
    }
  };
  if (requestedWorkspaceIds.length === 0) {
    await kv.set(SELECTION_KEY, selectedWorkspaceIds);
    await disableRemovedWorkspaces();
    return { success: true };
  }
  if (!(await findMailConnection(undefined, connectionId)))
    return new Response(
      { error: 'Connect PlusVibe before enabling sync' },
      { status: 400 },
    );
  const workspaces = await listWorkspaces(connectionId);
  if (
    requestedWorkspaceIds.some(
      (id) => !workspaces.some((workspace) => workspace._id === id),
    )
  ) {
    return new Response(
      { error: 'A selected workspace is inaccessible' },
      { status: 400 },
    );
  }
  for (const workspace of workspaces.filter((workspace) =>
    requestedWorkspaceIds.includes(workspace._id),
  )) {
    await registerWorkspace(workspace, connectionId);
  }
  await kv.set(SELECTION_KEY, selectedWorkspaceIds);
  await disableRemovedWorkspaces();
  for (const workspace of workspaces.filter((workspace) =>
    requestedWorkspaceIds.includes(workspace._id),
  ))
    await syncWorkspace(workspace, true);
  for (const workspaceId of selectedWorkspaceIds.filter(
    (id) => !previousSelection.includes(id),
  )) {
    await startImport(workspaceId);
  }
  return { success: true };
};

export default defineLogicFunction({
  universalIdentifier: SELECT_WORKSPACES_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-select-workspaces',
  timeoutSeconds: 300,
  handler: selectWorkspacesHandler,
  httpRouteTriggerSettings: {
    path: '/plusvibe/workspaces',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
