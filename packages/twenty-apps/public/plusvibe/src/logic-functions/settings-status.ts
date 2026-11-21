import { defineLogicFunction } from 'twenty-sdk/define';
import { getJobs, kv, Response } from 'twenty-sdk/logic-function';

import {
  getEmailFailureKey,
  getImportKey,
  SELECTION_KEY,
  type PlusvibeImportState,
  type PlusvibeSettingsStatus,
  type PlusvibeWorkspace,
} from 'src/constants/plusvibe';
import { STATUS_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  getAccountConnection,
  listWorkspaces,
} from 'src/logic-functions/utils/plusvibe-api';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';
import { findMailConnection } from 'src/logic-functions/utils/native-email';

export const settingsStatusHandler = async () => {
  if (!(await canManageApplication())) {
    return new Response(
      { error: 'Application management permission is required' },
      { status: 403 },
    );
  }
  const selectedWorkspaceIds = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
  const imports = Object.fromEntries(
    await Promise.all(
      selectedWorkspaceIds.map(async (workspaceId) => [
        workspaceId,
        await kv.get<PlusvibeImportState>(getImportKey(workspaceId)),
      ]),
    ),
  );
  const accountConnection = await getAccountConnection();
  const isApiKeySet = accountConnection
    ? accountConnection.authFailedAt === null
    : Boolean(process.env.PLUSVIBE_API_KEY?.trim());
  let workspaces: PlusvibeWorkspace[] = [];
  let hasAccountError = Boolean(accountConnection?.authFailedAt);
  if (isApiKeySet) {
    try {
      workspaces = await listWorkspaces();
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
    accountConnectionId: accountConnection?.id,
    hasAccountError,
    isMailConnected:
      isApiKeySet && !hasAccountError && Boolean(await findMailConnection()),
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
