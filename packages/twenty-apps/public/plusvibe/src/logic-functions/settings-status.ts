import { getPreferences } from 'src/logic-functions/utils/preferences';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  getJobs,
  kv,
  listConnections,
  type LogicFunctionExecutionContext,
  Response,
} from 'twenty-sdk/logic-function';

import {
  ACCOUNT_PROVIDER_NAMES,
  getRegistrationKey,
  type PlusvibeRegistration,
  type PlusvibeAccountStatus,
  getEmailFailureKey,
  getImportKey,
  SELECTION_KEY,
  type PlusvibeImportState,
  type PlusvibeSettingsStatus,
  type PlusvibeWorkspace,
} from 'src/constants/plusvibe';
import { STATUS_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { listWorkspaces } from 'src/logic-functions/utils/plusvibe-api';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';
import { findMailConnection } from 'src/logic-functions/utils/native-email';

export const settingsStatusHandler = async (
  _event?: RoutePayload<unknown>,
  context?: Pick<LogicFunctionExecutionContext, 'userWorkspaceId'>,
) => {
  if (!context?.userWorkspaceId && !(await canManageApplication())) {
    return new Response(
      { error: 'Application management permission is required' },
      { status: 403 },
    );
  }
  let selectedWorkspaceIds = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
  const connections = (await listConnections({})).filter(
    (connection) =>
      ACCOUNT_PROVIDER_NAMES.includes(connection.providerName) &&
      (!context?.userWorkspaceId ||
        connection.userWorkspaceId === context.userWorkspaceId),
  );
  const registrations = await Promise.all(
    selectedWorkspaceIds.map(async (workspaceId) => ({
      workspaceId,
      registration: await kv.get<PlusvibeRegistration>(
        getRegistrationKey(workspaceId),
      ),
    })),
  );
  if (context?.userWorkspaceId)
    selectedWorkspaceIds = registrations
      .filter(({ registration }) =>
        connections.some((connection) =>
          registration?.accountConnectionId
            ? registration.accountConnectionId === connection.id
            : registration?.apiKeyFingerprint === connection.externalAccountId,
        ),
      )
      .map(({ workspaceId }) => workspaceId);
  const imports = Object.fromEntries(
    await Promise.all(
      selectedWorkspaceIds.map(async (workspaceId) => [
        workspaceId,
        await kv.get<PlusvibeImportState>(getImportKey(workspaceId)),
      ]),
    ),
  );
  const accounts: PlusvibeAccountStatus[] = await Promise.all(
    connections.map(async (connection) => {
      let workspaces: PlusvibeWorkspace[] = [];
      let hasAccountError = Boolean(connection.authFailedAt);
      let isMailConnected = false;
      if (!hasAccountError) {
        try {
          workspaces = await listWorkspaces(connection.id);
          isMailConnected = Boolean(
            await findMailConnection(undefined, connection.id),
          );
        } catch {
          hasAccountError = true;
        }
      }
      return {
        id: connection.id,
        preferences: await getPreferences(connection.id),
        name: connection.name || connection.handle || 'PlusVibe',
        hasAccountError,
        isMailConnected,
        workspaces,
        selectedWorkspaceIds: registrations
          .filter(({ registration }) =>
            registration?.accountConnectionId
              ? registration.accountConnectionId === connection.id
              : registration?.apiKeyFingerprint ===
                connection.externalAccountId,
          )
          .map(({ workspaceId }) => workspaceId),
      };
    }),
  );
  const isApiKeySet =
    connections.length > 0 ||
    (!context?.userWorkspaceId &&
      Boolean(process.env.PLUSVIBE_API_KEY?.trim()));
  let workspaces: PlusvibeWorkspace[] = accounts.flatMap(
    (account) => account.workspaces,
  );
  let hasAccountError = accounts.some((account) => account.hasAccountError);
  let isMailConnected = accounts.some((account) => account.isMailConnected);
  if (connections.length === 0 && isApiKeySet) {
    try {
      workspaces = await listWorkspaces();
      isMailConnected = Boolean(await findMailConnection());
    } catch {
      hasAccountError = true;
    }
  }
  const jobIds = Object.entries(imports).flatMap(([workspaceId, value]) => {
    const state = value as PlusvibeImportState | null;
    if (!state) return [];
    const phases = ['campaigns', 'leads', 'emails', 'archivedEmails'];
    return (
      state.phase === 'failed'
        ? phases
        : phases.filter((phase) => phase === state.phase)
    ).map(
      (phase) =>
        `plusvibe-${workspaceId}-${state.runId}-${phase}-${state.cursor ?? 'start'}`,
    );
  });
  const emailFailures: NonNullable<PlusvibeSettingsStatus['emailFailures']> =
    Object.fromEntries(
      await Promise.all(
        selectedWorkspaceIds.map(async (workspaceId) => [
          workspaceId,
          await kv.get<{ runId: string; failedAt: string; jobId?: string }>(
            getEmailFailureKey(workspaceId),
          ),
        ]),
      ),
    );
  for (const failure of Object.values(emailFailures)) {
    if (failure?.jobId) jobIds.push(failure.jobId);
  }
  const jobs = jobIds.length > 0 ? await getJobs(jobIds) : [];
  const status: PlusvibeSettingsStatus = {
    isApiKeySet,
    preferences: accounts[0]?.preferences ?? (await getPreferences()),
    accounts,
    accountConnectionId:
      connections.length === 1 ? connections[0].id : undefined,
    hasAccountError,
    isMailConnected,
    emailFailures,
    workspaces,
    selectedWorkspaceIds,
    imports,
    jobs,
  };
  return status;
};

export default defineLogicFunction({
  universalIdentifier: STATUS_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-settings-status',
  timeoutSeconds: 30,
  handler: settingsStatusHandler,
  httpRouteTriggerSettings: {
    path: '/plusvibe/status',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
