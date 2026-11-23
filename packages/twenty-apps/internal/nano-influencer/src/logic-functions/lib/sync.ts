import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getNanoPreferences } from '../../utils/preferences';
import { queuePersonLink } from './people';
import { IDENTIFIERS } from '../../constants/identifiers';
import { creatorIdentity, saveCreator } from './creators';
import { enqueue } from './jobs';
import { NanoClient, NanoHttpError, NanoTransportError } from './nano-client';
import { getNanoClient, getNanoClients } from './credentials';
import { saveMembership } from './memberships';
import { Workspace, WorkspaceRateLimitError } from './workspace';
import {
  membershipGroupValuesSchema,
  saveDecisionMaker,
} from './grouped-views';

export const syncInputSchema = z.object({
  listIds: z.array(z.uuid()).max(50).optional(),
  connectionId: z.string().min(1).optional(),
});
export const syncPageSchema = z.object({
  listId: z.uuid(),
  projectId: z.string().regex(/^\d+$/),
  run: z.uuid(),
  flag: z.enum(['fav', 'hide', 'reconcile']),
  page: z.number().int().min(1).max(10000),
  channelOffset: z.number().int().min(0).max(30).optional(),
  groupValues: membershipGroupValuesSchema.optional(),
  readRetryAttempt: z.number().int().min(0).max(3).optional(),
});

export const startSync = async (
  input: z.infer<typeof syncInputSchema>,
  workspace = new Workspace(),
  nanoOverride?: NanoClient,
) => {
  const lists: { id: string; projectId: string; connectionId: string }[] = [];
  const failed: { connectionId: string; message: string }[] = [];
  if (input.listIds?.length) {
    for (const id of input.listIds) {
      const list = await workspace.get(
        'List',
        id,
        'externalKey projectId connectionId',
      );
      const connectionId = z
        .string()
        .optional()
        .parse(input.connectionId ?? list.connectionId ?? undefined);
      const client =
        nanoOverride ?? (await getNanoClient(connectionId || undefined));
      if (!connectionId && client.connectionId !== 'legacy')
        throw new Error(
          'Bind this legacy list to its Nano API connection using the Sync Nano Lists workflow action with connectionId.',
        );
      const projectId = z
        .string()
        .regex(/^\d+$/)
        .parse(list.projectId || String(list.externalKey).split(':').pop());
      await workspace.update('List', id, {
        connectionId: client.connectionId,
        projectId,
        externalKey:
          client.connectionId === 'legacy'
            ? projectId
            : `${client.connectionId}:${projectId}`,
      });
      lists.push({ id, projectId, connectionId: client.connectionId });
    }
  } else {
    const clients = nanoOverride
      ? [nanoOverride]
      : input.connectionId
        ? [await getNanoClient(input.connectionId)]
        : await getNanoClients();
    for (const client of clients) {
      let projects;
      try {
        projects = await client.projects();
      } catch (error) {
        failed.push({
          connectionId: client.connectionId,
          message:
            error instanceof Error
              ? error.message
              : 'Could not read Nano lists.',
        });
        continue;
      }
      for (const project of projects) {
        const externalKey =
          client.connectionId === 'legacy'
            ? project.id
            : `${client.connectionId}:${project.id}`;
        const list = await workspace.upsert('List', externalKey, {
          name: project.title ?? `Nano List ${project.id}`,
          projectId: project.id,
          connectionId: client.connectionId,
          ...(project.rawNanoList ? { rawNanoList: project.rawNanoList } : {}),
        });
        lists.push({
          id: list.id,
          projectId: project.id,
          connectionId: client.connectionId,
        });
      }
      const currentProjects = new Set(projects.map((project) => project.id));
      const previousLists = await workspace.findAll(
        'List',
        { connectionId: { eq: client.connectionId } },
        'id projectId',
      );
      for (const previous of previousLists) {
        if (
          typeof previous.projectId !== 'string' ||
          currentProjects.has(previous.projectId)
        )
          continue;
        await workspace.update('List', previous.id, {
          syncStatus: 'REMOVED',
          syncError: '',
        });
        if (getNanoPreferences().removedListPolicy === 'TRASH')
          await enqueue(IDENTIFIERS.cleanupList, { listId: previous.id });
      }
    }
  }
  if (failed.length && !lists.length)
    throw new Error(
      `No Nano lists could be read. ${failed.map(({ message }) => message).join(' ')}`,
    );
  for (const list of lists) {
    const run = randomUUID();
    await workspace.update('List', list.id, {
      syncRun: run,
      syncStatus: 'QUEUED',
      syncError: '',
    });
    try {
      await enqueue(
        IDENTIFIERS.syncPage,
        {
          listId: list.id,
          projectId: list.projectId,
          run,
          flag: 'fav',
          page: 1,
        },
        30_000,
      );
    } catch (error) {
      await workspace.update('List', list.id, {
        syncStatus: 'FAILED',
        syncError: 'Could not queue list sync. Run Sync Nano Lists again.',
      });
      throw error;
    }
  }
  return { queued: lists.length, ...(failed.length ? { failed } : {}) };
};

export const syncPage = async (
  input: z.infer<typeof syncPageSchema>,
  workspace = new Workspace(),
  nanoOverride?: NanoClient,
) => {
  let channelOffset = input.channelOffset ?? 0;
  const groupValues = [...(input.groupValues ?? [])];
  try {
    const list = await workspace.get(
      'List',
      input.listId,
      'syncRun connectionId',
    );
    if (list.syncRun !== input.run) return { status: 'SUPERSEDED' };
    await workspace.update('List', input.listId, {
      syncStatus: 'SYNCING',
      syncError: '',
    });
    let next: z.infer<typeof syncPageSchema> | undefined;
    if (input.flag === 'reconcile') {
      const stale = await workspace.find('Membership', {
        and: [
          { listId: { eq: input.listId } },
          ...(getNanoPreferences().removedEntryPolicy === 'KEEP'
            ? [{ flag: { neq: 'REMOVED' } }]
            : []),
          {
            or: [{ seenRun: { neq: input.run } }, { seenRun: { is: 'NULL' } }],
          },
        ],
      });
      for (const row of stale) {
        if (getNanoPreferences().removedEntryPolicy === 'TRASH')
          await workspace.trash('Membership', row.id);
        else
          await workspace.update('Membership', row.id, {
            flag: 'REMOVED',
            syncedAt: new Date().toISOString(),
          });
      }
      if (stale.length === 100) next = input;
    } else {
      const nano =
        nanoOverride ??
        (await getNanoClient(
          typeof list.connectionId === 'string' ? list.connectionId : undefined,
        ));
      if (!list.connectionId && nano.connectionId !== 'legacy')
        throw new Error(
          'Bind this list to its original Nano connection before syncing.',
        );
      const page = await nano.page(input.projectId, input.flag, input.page);
      const decisionMakers = new Map<string, string>();
      for (const [channelIndex, channel] of page.channels.entries()) {
        if (channelIndex < channelOffset) continue;
        const creator = await saveCreator(workspace, channel);
        const operatorId = channel.rawNanoListData?.op_uid;
        const operatorKey =
          typeof operatorId === 'string' || typeof operatorId === 'number'
            ? String(operatorId)
            : '';
        const operator = page.op_users?.[operatorKey];
        let decisionMakerId = decisionMakers.get(operatorKey) ?? null;
        if (!decisionMakerId && operatorKey && operator) {
          const actor = await saveDecisionMaker(
            workspace,
            operatorKey,
            operator,
            nano.connectionId,
          );
          decisionMakerId = actor.id;
          decisionMakers.set(operatorKey, actor.id);
        }
        await saveMembership(
          workspace,
          input.listId,
          creator.id,
          creatorIdentity(channel),
          {
            name: channel.name ?? channel.id,
            creatorId: creator.id,
            listId: input.listId,
            flag: input.flag === 'fav' ? 'FAVOURITE' : 'HIDDEN',
            labels: channel.labels ?? [],
            note: channel.note ?? '',
            seenRun: input.run,
            syncedAt: new Date().toISOString(),
            ...(channel.rawNanoListData
              ? { rawNanoMembership: channel.rawNanoListData }
              : {}),
            nanoOperatorId: operatorKey,
            decisionMakerId,
            nanoOperatorName:
              typeof operator?.name === 'string' ? operator.name : operatorKey,
            nanoOperatorEmail: {
              primaryEmail:
                typeof operator?.email === 'string' ? operator.email : '',
              additionalEmails: [],
            },
          },
        );
        if (
          !groupValues.some(
            (value) =>
              value.creatorId === creator.id && value.listId === input.listId,
          )
        )
          groupValues.push({
            creatorId: creator.id,
            listId: input.listId,
            decisionMakerId,
          });
        await queuePersonLink(creator, channel);
        channelOffset = channelIndex + 1;
      }
      if (groupValues.length) {
        await enqueue(IDENTIFIERS.refreshGroups, { records: [...groupValues] });
        groupValues.length = 0;
      }
      if (page.op_users)
        await workspace.update('List', input.listId, {
          nanoUsers: page.op_users,
        });
      if (page.labels)
        await workspace.update('List', input.listId, { labels: page.labels });
      const hasMore =
        page.total_pages != null
          ? input.page < page.total_pages
          : page.channels.length === 30;
      if (hasMore && input.page === 10000)
        throw new Error(
          'Nano list exceeded the page limit. Sync was not completed.',
        );
      next = hasMore
        ? {
            ...input,
            page: input.page + 1,
            channelOffset: 0,
            groupValues: [],
            readRetryAttempt: 0,
          }
        : {
            ...input,
            page: 1,
            channelOffset: 0,
            groupValues: [],
            readRetryAttempt: 0,
            flag: input.flag === 'fav' ? 'hide' : 'reconcile',
          };
    }
    if (next) await enqueue(IDENTIFIERS.syncPage, next);
    else
      await workspace.update('List', input.listId, {
        syncStatus: 'SYNCED',
        syncedAt: new Date().toISOString(),
        syncError: '',
      });
    return { status: next ? 'SYNCING' : 'SYNCED' };
  } catch (error) {
    if (
      (error instanceof NanoTransportError ||
        (error instanceof NanoHttpError && error.status >= 500)) &&
      (input.readRetryAttempt ?? 0) < 3
    ) {
      await enqueue(
        IDENTIFIERS.syncPage,
        {
          ...input,
          channelOffset,
          groupValues,
          readRetryAttempt: (input.readRetryAttempt ?? 0) + 1,
        },
        60_000,
      );
      return { status: 'DEFERRED' };
    }
    if (
      error instanceof WorkspaceRateLimitError ||
      (error instanceof NanoHttpError && error.status === 429)
    ) {
      const retryAfterMs =
        error instanceof WorkspaceRateLimitError ? error.retryAfterMs : 60_000;
      await enqueue(
        IDENTIFIERS.syncPage,
        { ...input, channelOffset, groupValues },
        retryAfterMs + 1_000 + Math.floor(Math.random() * 5_000),
      );
      return { status: 'DEFERRED' };
    }
    await workspace.update('List', input.listId, {
      syncStatus: 'FAILED',
      syncError: error instanceof Error ? error.message : 'List sync failed.',
    });
    throw error;
  }
};
