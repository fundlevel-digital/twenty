import { isString } from '@sniptt/guards';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { kv } from 'twenty-sdk/logic-function';
import { sourceKey, rememberRequest } from './messages';
import { IDENTIFIERS } from '../constants/identifiers';
import { graphql } from '../utils/graphql';
import { getOpenBotConnections } from './connections';
import { OPENBOT_DELIVER_FUNCTION_IDENTIFIER } from './constants';
import { openBotDeliveryKey } from './queue-comment';
import {
  getOpenBotDeliveryId,
  getOpenBotReplyId,
  type OpenBotDelivery,
} from './tasks';
import { DEFAULT_TASK_POLICY } from './task-policy';
import { type OpenBotConnection, type OpenBotTaskEvent } from './types';

export type BotAssignedTask = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  updatedAt: string;
  botAssignees: unknown;
  assigneeId: string | null;
  createdBy?: { workspaceMemberId?: string | null };
  bodyV2?: { markdown?: string | null } | null;
};
type AssignmentState = { versions: Record<string, string> };
export const taskAssignmentKey = (id: string) =>
  `openbot:task-assignments:${id}`;
export const botAssigneeIds = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter(isString))] : [];
const TASK_FIELDS =
  'id title status dueAt updatedAt botAssignees assigneeId bodyV2 { markdown } createdBy { workspaceMemberId }';
export const loadBotAssignedTask = async (id: string) => {
  const { task } = await graphql<{ task: BotAssignedTask | null }>(
    `query($id: UUID!) { task(filter: {id: {eq: $id}}) { ${TASK_FIELDS} } }`,
    { id },
    true,
  );
  return task;
};

export const taskEventsForBot = (
  task: BotAssignedTask,
  bot: OpenBotConnection,
  now: number,
  newlyAssigned: boolean,
  overdueInterval?: number,
): OpenBotTaskEvent[] => {
  if (
    task.status === 'DONE' ||
    !botAssigneeIds(task.botAssignees).includes(bot.id)
  )
    return [];
  const policy = bot.taskPolicy ?? DEFAULT_TASK_POLICY;
  const events: OpenBotTaskEvent[] = [];
  const base = { taskId: task.id, dueAt: task.dueAt };
  if (overdueInterval === undefined && newlyAssigned && policy.onAssigned)
    events.push({ ...base, type: 'crm.task.assigned', cycle: task.updatedAt });
  const due = task.dueAt ? Date.parse(task.dueAt) : NaN;
  if (!Number.isFinite(due)) return events;
  if (overdueInterval === undefined) {
    if (
      policy.warningMinutes &&
      now >= due - policy.warningMinutes * 60000 &&
      now < due
    )
      events.push({ ...base, type: 'crm.task.due_soon', cycle: task.dueAt! });
    if (policy.onDue && now >= due)
      events.push({ ...base, type: 'crm.task.due', cycle: task.dueAt! });
  }
  const intervalMinutes = overdueInterval ?? policy.overdueEveryMinutes;
  if (intervalMinutes && now >= due + intervalMinutes * 60000) {
    const bucket = Math.floor((now - due) / (intervalMinutes * 60000));
    events.push({
      ...base,
      type: 'crm.task.overdue',
      cycle: `${task.dueAt}:${intervalMinutes}:${bucket}`,
      expiresAt: due + (bucket + 1) * intervalMinutes * 60000,
      intervalMinutes,
      source: overdueInterval === undefined ? 'policy' : 'workflow',
    });
  }
  return events;
};

const queueTaskEvent = async (
  task: BotAssignedTask,
  bot: OpenBotConnection,
  event: OpenBotTaskEvent,
) => {
  const commentId = getOpenBotReplyId(
    `task-event:${task.id}:${bot.id}:${event.type}:${event.cycle}`,
  );
  const deliveryId = getOpenBotDeliveryId(commentId, bot.id);
  const existing = await kv.get<OpenBotDelivery>(
    openBotDeliveryKey(deliveryId),
  );
  if (existing && ['accepted', 'replied', 'failed'].includes(existing.status))
    return false;
  const replyUrl = process.env.OPENBOT_REPLY_URL;
  if (!replyUrl || new URL(replyUrl).protocol !== 'https:')
    throw new Error('Configure an HTTPS OpenBot reply URL');
  const labels = {
    'crm.task.assigned': 'Task Assigned',
    'crm.task.due': 'Task Due',
    'crm.task.due_soon': 'Task Due Soon',
    'crm.task.overdue': 'Task Overdue',
  };
  const text =
    `${labels[event.type]}: ${task.title}${task.dueAt ? ` · Due ${task.dueAt}` : ''}${task.bodyV2?.markdown ? `\n\n${task.bodyV2.markdown}` : ''}`.slice(
      0,
      9500,
    );
  if (!(await kv.get(sourceKey(commentId))))
    await kv.set(sourceKey(commentId), {
      id: commentId,
      name: text.slice(0, 80),
      body: text,
      authorId: IDENTIFIERS.application,
      authorName: 'Task Automation',
      authorKind: 'SYSTEM',
      targetObject: 'task',
      targetRecordId: task.id,
      parentId: null,
      mentions: JSON.stringify([
        { id: bot.id, label: bot.name, objectName: 'openbotAgent' },
      ]),
      deleted: false,
      resolved: false,
      createdAt: new Date().toISOString(),
    });
  const delivery: OpenBotDelivery = existing ?? {
    id: deliveryId,
    status: 'pending',
    expiresAt: Date.now() + 7 * 86400000,
    task: {
      agentId: bot.id,
      commentId,
      threadId: commentId,
      objectName: 'task',
      recordId: task.id,
      recordLabel: task.title,
      requestedBy: task.assigneeId ?? task.createdBy?.workspaceMemberId ?? null,
      text,
      replyUrl,
      taskEvent: event,
    },
  };
  if (!existing) await kv.set(openBotDeliveryKey(deliveryId), delivery);
  await rememberRequest(delivery);
  await new MetadataApiClient({ runAs: 'application' }).mutation({
    enqueueJobs: {
      __args: {
        input: {
          logicFunctionUniversalIdentifier: OPENBOT_DELIVER_FUNCTION_IDENTIFIER,
          jobs: [
            {
              jobId: `openbot-${deliveryId.replaceAll(':', '-')}`,
              payload: { deliveryId },
            },
          ],
          retryLimit: 10,
        },
      },
      enqueued: true,
    },
  });
  return true;
};

export const nextTaskWakeAt = (
  task: BotAssignedTask,
  bots: OpenBotConnection[],
  now: number,
): number | null => {
  if (task.status === 'DONE' || !task.dueAt) return null;
  const due = Date.parse(task.dueAt);
  if (!Number.isFinite(due)) return null;
  const times: number[] = [];
  for (const bot of bots) {
    const policy = bot.taskPolicy ?? DEFAULT_TASK_POLICY;
    if (policy.warningMinutes) times.push(due - policy.warningMinutes * 60000);
    if (policy.onDue) times.push(due);
    if (policy.overdueEveryMinutes) {
      const interval = policy.overdueEveryMinutes * 60000;
      times.push(
        due + Math.max(1, Math.floor((now - due) / interval) + 1) * interval,
      );
    }
  }
  const future = times.filter((time) => time > now);
  return future.length ? Math.min(...future) : null;
};

const scheduleTaskWake = async (
  task: BotAssignedTask,
  bots: OpenBotConnection[],
  now: number,
) => {
  const next = nextTaskWakeAt(task, bots, now);
  if (next === null) return;
  // Revisit distant tasks daily without creating another delayed job on each scan.
  const wakeAt = Math.min(next, (Math.floor(now / 86400000) + 1) * 86400000);
  await new MetadataApiClient({ runAs: 'application' }).mutation({
    enqueueJobs: {
      __args: {
        input: {
          logicFunctionUniversalIdentifier:
            '6ea334d0-242c-5ba4-8a3d-1af3d3592520',
          jobs: [
            {
              jobId: `openbot-task-wake-${task.id}-${wakeAt}`,
              payload: { taskId: task.id },
            },
          ],
          delayMs: Math.max(0, wakeAt - now),
          retryLimit: 10,
        },
      },
      enqueued: true,
    },
  });
};

export const processBotAssignedTask = async (
  task: BotAssignedTask,
  now = Date.now(),
  overdueInterval?: number,
  newlyAssignedIds: string[] = [],
) => {
  const key = taskAssignmentKey(task.id);
  const previous = await kv.get<AssignmentState>(key);
  const ids = botAssigneeIds(task.botAssignees);
  const versions = Object.fromEntries(
    ids.map((id) => [
      id,
      newlyAssignedIds.includes(id)
        ? task.updatedAt
        : (previous?.versions[id] ?? task.updatedAt),
    ]),
  );
  if (overdueInterval === undefined) await kv.set(key, { versions });
  let queued = 0;
  const bots = getOpenBotConnections().filter((bot) => ids.includes(bot.id));
  for (const bot of bots) {
    for (const event of taskEventsForBot(
      task,
      bot,
      now,
      true,
      overdueInterval,
    )) {
      if (event.type === 'crm.task.assigned') event.cycle = versions[bot.id];
      if (await queueTaskEvent(task, bot, event)) queued++;
    }
  }
  if (overdueInterval === undefined) await scheduleTaskWake(task, bots, now);
  return queued;
};

export const isCurrentTaskEvent = async (
  event: OpenBotTaskEvent,
  bot: OpenBotConnection,
): Promise<boolean> => {
  const task = await loadBotAssignedTask(event.taskId);
  if (
    !task ||
    task.status === 'DONE' ||
    !botAssigneeIds(task.botAssignees).includes(bot.id)
  )
    return false;
  const policy = bot.taskPolicy ?? DEFAULT_TASK_POLICY;
  if (event.type === 'crm.task.assigned') {
    const state = await kv.get<AssignmentState>(taskAssignmentKey(task.id));
    return (
      policy.onAssigned && (!state || state.versions[bot.id] === event.cycle)
    );
  }
  if (task.dueAt !== event.dueAt) return false;
  if (event.type === 'crm.task.due_soon')
    return (
      policy.warningMinutes !== null && Date.parse(task.dueAt!) > Date.now()
    );
  if (event.type === 'crm.task.due') return policy.onDue;
  return (
    (event.source === 'workflow' ||
      policy.overdueEveryMinutes === event.intervalMinutes) &&
    (event.expiresAt ?? 0) > Date.now()
  );
};

export const scanBotAssignedTasks = async (overdueInterval?: number) => {
  const cursorKey = `openbot:task-scan:${overdueInterval ?? 'policy'}`;
  const after = await kv.get<string>(cursorKey);
  const { tasks } = await graphql<{
    tasks: {
      edges: { node: BotAssignedTask }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  }>(
    `query($after: String) { tasks(first: 100, after: $after, filter: {botAssignees: {is: NOT_NULL}}, orderBy: [{id: AscNullsLast}]) { edges { node { ${TASK_FIELDS} } } pageInfo { hasNextPage endCursor } } }`,
    { after: after ?? null },
    true,
  );
  let queued = 0;
  for (const { node } of tasks.edges)
    queued += await processBotAssignedTask(node, Date.now(), overdueInterval);
  await kv.set(
    cursorKey,
    tasks.pageInfo.hasNextPage ? tasks.pageInfo.endCursor : null,
  );
  return {
    queued,
    scanned: tasks.edges.length,
    hasMore: tasks.pageInfo.hasNextPage,
  };
};
