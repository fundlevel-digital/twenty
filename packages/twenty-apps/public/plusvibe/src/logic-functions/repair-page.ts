import { retryFailedSyncJobs } from 'src/logic-functions/utils/sync-jobs';
import { defineLogicFunction } from 'twenty-sdk/define';
import { kv } from 'twenty-sdk/logic-function';
import { RestApiClientError } from 'twenty-client-sdk/rest';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {
  SELECTION_KEY,
  getImportKey,
  getEmailFailureKey,
  type PlusvibeImportState,
} from 'src/constants/plusvibe';
import {
  startImport,
  enqueueImportPage,
} from 'src/logic-functions/utils/start-import';
import { enqueueLeadEmails } from 'src/logic-functions/lead-emails';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';
import { plusvibeRequest } from 'src/logic-functions/utils/plusvibe-api';
import { CURSOR_PAGE_SCHEMA } from 'src/logic-functions/utils/page-schema';
import { LEAD_SCHEMA } from 'src/logic-functions/utils/normalize-event';
import { mapEmail } from 'src/logic-functions/utils/map-email';
import {
  prepareNativeEmailChannel,
  prepareUnresolvedHistoryChannel,
  syncNativeEmail,
} from 'src/logic-functions/utils/native-email';
import { syncPerson } from 'src/logic-functions/utils/sync-records';
import { getOwnedInboxesKey } from 'src/logic-functions/utils/verify-owned-inbox';

export const repairPageHandler = async (payload: unknown) => {
  if (!(await canManageApplication()))
    throw new Error('Application management permission is required');
  const input = z
    .object({
      workspaceId: z.string().min(1),
      operation: z.enum([
        'diagnose-leads',
        'source-leads',
        'source-emails',
        'source-accounts',
        'prepare-channels',
        'prepare-unresolved-channel',
        'register-owned-inboxes',
        'ingest-emails',
        'restart-import',
        'resume-history',
        'retry-history-page',
        'enqueue-lead-history',
      ]),
      cursor: z.string().optional(),
      archived: z.boolean().optional(),
      sources: z.array(z.unknown()).max(30).optional(),
      ownedInboxes: z.array(z.email()).max(1000).optional(),
      expectedRunId: z.string().optional(),
      leadEmails: z.array(z.email()).max(100).optional(),
      processed: z.number().int().nonnegative().optional(),
      delayMilliseconds: z.number().int().min(2000).max(86400000).optional(),
    })
    .parse(payload);
  if (
    !((await kv.get<string[]>(SELECTION_KEY)) ?? []).includes(input.workspaceId)
  )
    throw new Error('Workspace is not selected');
  if (
    input.operation === 'restart-import' ||
    input.operation === 'resume-history' ||
    input.operation === 'retry-history-page' ||
    input.operation === 'enqueue-lead-history'
  ) {
    const key = getImportKey(input.workspaceId);
    const current = await kv.get<PlusvibeImportState>(key);
    if (!current || current.runId !== input.expectedRunId)
      throw new Error('Import run changed; inspect the current checkpoint');
    if (input.operation === 'restart-import') {
      await kv.set(`${key}:before-restart:${current.runId}`, current);
      await startImport(input.workspaceId, true);
      return kv.get<PlusvibeImportState>(key);
    }
    if (input.operation === 'retry-history-page') {
      if (
        current.phase !== 'failed' ||
        (current.failedPhase !== 'emails' &&
          current.failedPhase !== 'archivedEmails')
      )
        throw new Error('Only a failed history page can be retried');
      await kv.set(`${key}:before-page-retry:${current.runId}`, current);
      const state: PlusvibeImportState = {
        ...current,
        phase: current.failedPhase,
        failedPhase: undefined,
        error: undefined,
        updatedAt: new Date().toISOString(),
      };
      await kv.set(key, state);
      try {
        await retryFailedSyncJobs(input.workspaceId, current.runId);
        await enqueueImportPage(input.workspaceId, state);
      } catch (error) {
        await kv.set(key, current);
        throw error;
      }
      return state;
    }
    if (input.operation === 'enqueue-lead-history') {
      const emails = [...new Set(input.leadEmails ?? [])];
      for (const [index, leadEmail] of emails.entries())
        await enqueueLeadEmails(
          { workspaceId: input.workspaceId, runId: current.runId, leadEmail },
          (input.delayMilliseconds ?? 2000) + index * 3000,
        );
      return { queued: emails.length, runId: current.runId };
    }
    await kv.set(`${key}:before-repair:${current.runId}`, current);
    const state: PlusvibeImportState = {
      version: 4,
      runId: randomUUID(),
      phase: 'emails',
      processed: input.processed ?? current.processed,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(key, state);
    await kv.delete(getEmailFailureKey(input.workspaceId));
    await enqueueImportPage(input.workspaceId, state);
    return state;
  }
  if (input.operation === 'register-owned-inboxes') {
    const addresses = [
      ...new Set(
        (input.ownedInboxes ?? []).map((address) => address.toLowerCase()),
      ),
    ];
    await kv.set(getOwnedInboxesKey(input.workspaceId), addresses);
    return { registered: addresses.length };
  }
  if (input.operation === 'prepare-unresolved-channel')
    return prepareUnresolvedHistoryChannel(input.workspaceId);
  if (
    input.operation === 'prepare-channels' ||
    input.operation === 'ingest-emails'
  ) {
    const results = [];
    const failures = [];
    for (const [index, source] of (input.sources ?? []).entries()) {
      try {
        const email = mapEmail(source, input.workspaceId, '');
        if (input.operation === 'prepare-channels') {
          const channel = await prepareNativeEmailChannel(email);
          results.push({
            index,
            id: channel.id,
            handle: channel.handle,
            sender: email.sender,
          });
        } else {
          const message = await syncNativeEmail(email);
          results.push({
            index,
            messageId: message.messageId,
            messageThreadId: message.messageThreadId,
          });
        }
      } catch (error) {
        failures.push({
          index,
          error: error instanceof Error ? error.message : 'Email repair failed',
        });
      }
    }
    return { results, failures };
  }
  const query: Record<string, string> = { workspace_id: input.workspaceId };
  if (input.cursor) query.starting_after = input.cursor;
  if (input.operation === 'source-emails') {
    query.starting_after = input.cursor ?? '';
    query.email_type = 'all';
    query.preview_only = 'false';
    if (input.archived) query.is_archived = '1';
  } else query.limit = input.operation === 'diagnose-leads' ? '10' : '100';
  if (input.operation === 'source-accounts') {
    const response = await plusvibeRequest('/account/list', z.unknown(), {
      query,
      retryRateLimits: true,
    });
    const body = Array.isArray(response)
      ? {}
      : z.record(z.string(), z.unknown()).parse(response);
    const values = Array.isArray(response)
      ? response
      : (Object.values(body).find(Array.isArray) ?? []);
    const accounts = values.flatMap((value: unknown) => {
      const account = z
        .looseObject({
          email: z.string().optional(),
          email_account_name: z.string().optional(),
          _id: z.string().optional(),
          id: z.string().optional(),
        })
        .safeParse(value);
      if (!account.success) return [];
      const email = account.data.email ?? account.data.email_account_name;
      return email ? [{ id: account.data._id ?? account.data.id, email }] : [];
    });
    return {
      data: accounts,
      responseKeys: Object.keys(body),
      has_more: body.has_more === true,
      next_starting_after: body.next_starting_after,
    };
  }
  const page = await plusvibeRequest(
    input.operation === 'source-emails'
      ? '/unibox/emails'
      : '/lead/workspace-leads',
    CURSOR_PAGE_SCHEMA,
    { query, retryRateLimits: true },
  );
  if (input.operation !== 'diagnose-leads') return page;
  const failures = [];
  let imported = 0;
  for (const [index, value] of page.data.entries()) {
    try {
      await syncPerson(LEAD_SCHEMA.parse(value), input.workspaceId, {
        isFullLeadRecord: true,
      });
      imported++;
    } catch (error) {
      failures.push({
        index,
        message: error instanceof Error ? error.message : 'Lead import failed',
        ...(error instanceof RestApiClientError
          ? { status: error.status, diagnostic: error.body }
          : {}),
      });
    }
  }
  return {
    imported,
    failures,
    hasMore: page.has_more,
    nextCursor: page.next_starting_after,
  };
};

export default defineLogicFunction({
  universalIdentifier: 'e4a0491a-e66e-4fb9-b20d-b84dcf1c258d',
  name: 'plusvibe-repair-page',
  timeoutSeconds: 300,
  handler: repairPageHandler,
});
