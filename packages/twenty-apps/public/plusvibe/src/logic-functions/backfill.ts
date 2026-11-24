import { defineLogicFunction } from 'twenty-sdk/define';
import {
  kv,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';
import {
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
  type PlusvibeImportState,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { BACKFILL_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  getApiKeyFingerprint,
  plusvibeRequest,
} from 'src/logic-functions/utils/plusvibe-api';
import { enqueueImportPage } from 'src/logic-functions/utils/start-import';
import { CURSOR_PAGE_SCHEMA } from 'src/logic-functions/utils/page-schema';
import { findMailConnection } from 'src/logic-functions/utils/native-email';
import {
  enqueueSyncTasks,
  wakeSyncWorker,
  type SyncTask,
} from 'src/logic-functions/utils/sync-jobs';
import { recordId } from 'src/logic-functions/utils/record-id';

export const sourceIdentity = (source: unknown) => {
  const result = z
    .looseObject({
      id: z.string().nullish(),
      _id: z.string().nullish(),
      lead_id: z.string().nullish(),
    })
    .safeParse(source);
  return result.success
    ? (result.data.id ??
        result.data._id ??
        result.data.lead_id ??
        recordId('source', JSON.stringify(source)))
    : recordId('source', JSON.stringify(source));
};

export const IMPORT_PAGE_SCHEMA = z.object({
  workspaceId: z.string(),
  runId: z.string(),
  phase: z.enum(['campaigns', 'leads', 'emails', 'archivedEmails']),
  cursor: z.string().nullable(),
});

export const processImportPage = async (payload: unknown) => {
  const input = IMPORT_PAGE_SCHEMA.parse(payload);
  const { workspaceId, runId, phase, cursor } = input;
  if (!((await kv.get<string[]>(SELECTION_KEY)) ?? []).includes(workspaceId))
    return { skipped: true };
  const key = getImportKey(workspaceId);
  const state = await kv.get<PlusvibeImportState>(key);
  const registration = await kv.get<PlusvibeRegistration>(
    getRegistrationKey(workspaceId),
  );
  if (
    !state ||
    state.runId !== runId ||
    ['complete', 'awaitingConnection'].includes(state.phase) ||
    !registration
  )
    return { skipped: true };
  if (
    registration.apiKeyFingerprint !== (await getApiKeyFingerprint(workspaceId))
  )
    throw new Error('The workspace connection changed');
  if (state.phase === 'failed') return { skipped: true };
  if (state.phase !== phase || (state.cursor ?? null) !== cursor) {
    await enqueueImportPage(workspaceId, state);
    return { skipped: true };
  }
  if (
    ['emails', 'archivedEmails'].includes(phase) &&
    !(await findMailConnection(workspaceId))
  ) {
    await kv.set(key, {
      ...state,
      phase: 'awaitingConnection',
      resumePhase: phase,
      updatedAt: new Date().toISOString(),
    });
    return { waitingForConnection: true };
  }
  const isEmail = phase === 'emails' || phase === 'archivedEmails';
  const query: Record<string, string> = {
    workspace_id: workspaceId,
    ...(isEmail
      ? {
          starting_after: cursor ?? '',
          email_type: 'all',
          preview_only: 'false',
          ...(phase === 'archivedEmails' ? { is_archived: '1' } : {}),
        }
      : { limit: '100', ...(cursor ? { starting_after: cursor } : {}) }),
  };
  const page = await plusvibeRequest(
    phase === 'campaigns'
      ? '/campaign/list-all'
      : phase === 'leads'
        ? '/lead/workspace-leads'
        : '/unibox/emails',
    CURSOR_PAGE_SCHEMA,
    { query, retryRateLimits: true },
  );
  if (
    page.has_more &&
    (!page.next_starting_after ||
      page.next_starting_after === cursor ||
      (state.visitedCursors ?? []).includes(page.next_starting_after))
  )
    throw new Error('PlusVibe pagination did not advance');
  const tasks: SyncTask[] = page.data.map((source) => ({
    kind:
      phase === 'campaigns' ? 'CAMPAIGN' : phase === 'leads' ? 'LEAD' : 'EMAIL',
    workspaceId,
    runId,
    identity: [phase, sourceIdentity(source)],
    payload: { workspaceId, runId, source, origin: phase },
  }));
  await enqueueSyncTasks(tasks);
  const next: PlusvibeImportState = {
    ...state,
    version: state.version ?? 4,
    phase: page.has_more
      ? phase
      : phase === 'campaigns'
        ? 'leads'
        : phase === 'leads'
          ? 'emails'
          : phase === 'emails'
            ? 'archivedEmails'
            : 'complete',
    cursor: page.has_more ? (page.next_starting_after ?? undefined) : undefined,
    visitedCursors: page.has_more
      ? [...(state.visitedCursors ?? []), cursor ?? 'start']
      : [],
    processed: state.processed + page.data.length,
    updatedAt: new Date().toISOString(),
  };
  const current = await kv.get<PlusvibeImportState>(key);
  if (current?.runId !== runId) return { skipped: true };
  await kv.set(key, next);
  if (next.phase !== 'complete') await enqueueImportPage(workspaceId, next);
  return { success: true };
};

export const backfillHandler = async (
  payload: unknown,
  _context?: LogicFunctionExecutionContext,
) => {
  const input = IMPORT_PAGE_SCHEMA.parse(payload);
  await enqueueSyncTasks([
    {
      kind: 'IMPORT_PAGE',
      workspaceId: input.workspaceId,
      runId: input.runId,
      identity: [input.phase, input.cursor ?? 'start'],
      payload: input,
    },
  ]);
  await wakeSyncWorker();
  return { queued: true };
};

export default defineLogicFunction({
  universalIdentifier: BACKFILL_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-backfill',
  timeoutSeconds: 60,
  handler: backfillHandler,
});
