import { getSyncSettings } from 'src/logic-functions/utils/sync-settings';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  RetryableLogicFunctionError,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { sourceTypeSchema } from 'src/types/sync-settings';
import { syncSourceRecord } from 'src/logic-functions/utils/source-sync';
import { GithubRateLimitError } from 'src/logic-functions/utils/github-client';
import {
  backfillSummary,
  loadBackfill,
  queueSyncJob,
  saveBackfill,
  scanBackfillPage,
} from 'src/logic-functions/utils/backfill';

const inputSchema = z.union([
  z.object({ backfillId: z.string().uuid() }),
  z.object({
    sourceType: sourceTypeSchema,
    recordId: z.string().uuid(),
    automatic: z.boolean().optional(),
    deferrals: z.number().int().min(0).max(24).default(0),
  }),
]);
export const githubSyncWorker = async (
  parameters: unknown,
  context: LogicFunctionExecutionContext,
) => {
  const input = inputSchema.parse(parameters);
  if ('backfillId' in input) {
    const plan = await loadBackfill(input.backfillId);
    if (!plan || !['RUNNING', 'SCANNING'].includes(plan.status))
      return { skipped: true };
    if (
      plan.signature !==
      JSON.stringify((await getSyncSettings())[plan.sourceType])
    ) {
      plan.status = 'PAUSED';
      plan.error = 'Sync settings changed. Preview a new backfill.';
      await saveBackfill(plan);
      return backfillSummary(plan);
    }
    if (plan.status === 'SCANNING') {
      try {
        const scanned = await scanBackfillPage(plan);
        if (scanned.status === 'SCANNING')
          await queueSyncJob({ backfillId: plan.id }, 250);
        return backfillSummary(scanned);
      } catch (error) {
        plan.error =
          error instanceof Error ? error.message : 'Backfill preview failed.';
        if (context.retryCount < context.maxRetries)
          throw new RetryableLogicFunctionError(plan.error);
        plan.status = 'FAILED';
        await saveBackfill(plan);
        throw error;
      }
    }
    if (plan.next >= plan.records.length) {
      plan.status = 'COMPLETED';
      await saveBackfill(plan);
      return backfillSummary(plan);
    }
    const current = plan.records[plan.next];
    try {
      const result = await syncSourceRecord({
        sourceType: plan.sourceType,
        recordId: current.id,
        mode: plan.mode,
        expectedLogins: current.logins,
      });
      const latest = (await loadBackfill(plan.id)) ?? plan;
      if (latest.next === plan.next) {
        latest.next++;
        latest.linked += result.linked;
        latest.removed += result.removed;
        if (latest.next >= latest.records.length && latest.status === 'RUNNING')
          latest.status = 'COMPLETED';
        delete latest.retryAt;
        delete latest.error;
        await saveBackfill(latest);
      }
      if (latest.status === 'RUNNING')
        await queueSyncJob({ backfillId: plan.id }, 1000);
      return backfillSummary(latest);
    } catch (error) {
      const latest = (await loadBackfill(plan.id)) ?? plan;
      latest.error =
        error instanceof Error ? error.message : 'GitHub sync failed.';
      if (error instanceof GithubRateLimitError) {
        latest.retryAt = error.retryAt;
        await saveBackfill(latest);
        if (latest.status === 'RUNNING')
          await queueSyncJob(
            { backfillId: plan.id },
            Math.max(1000, error.retryAt - Date.now()),
          );
        return backfillSummary(latest);
      }
      if (context.retryCount < context.maxRetries) {
        await saveBackfill(latest);
        throw new RetryableLogicFunctionError(latest.error);
      }
      latest.status = 'FAILED';
      latest.failed++;
      await saveBackfill(latest);
      throw error;
    }
  }
  try {
    return await syncSourceRecord(input);
  } catch (error) {
    if (error instanceof GithubRateLimitError && input.deferrals < 24) {
      await queueSyncJob(
        { ...input, deferrals: input.deferrals + 1 },
        Math.max(1000, error.retryAt - Date.now()),
      );
      return { deferredUntil: new Date(error.retryAt).toISOString() };
    }
    if (error instanceof GithubRateLimitError) throw error;
    throw new RetryableLogicFunctionError(
      error instanceof Error ? error.message : 'GitHub sync failed.',
    );
  }
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.SYNC_WORKER,
  name: 'github-profile-sync-worker',
  description:
    'Processes queued record syncs and checkpointed backfills, deferring rate-limited work.',
  timeoutSeconds: 60,
  handler: githubSyncWorker,
});
