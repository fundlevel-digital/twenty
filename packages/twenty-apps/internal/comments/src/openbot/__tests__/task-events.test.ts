import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  graphql: vi.fn(),
  mutation: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', async (original) => ({
  ...(await original<typeof import('twenty-sdk/logic-function')>()),
  kv: { get: mocks.get, set: mocks.set },
}));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    mutation = mocks.mutation;
  },
}));
vi.mock('../../utils/graphql', () => ({ graphql: mocks.graphql }));
import {
  isCurrentTaskEvent,
  nextTaskWakeAt,
  processBotAssignedTask,
  taskEventsForBot,
  type BotAssignedTask,
} from '../task-events';
import { type OpenBotConnection } from '../types';
import { sendOverdueReminders } from '../../logic-functions/openbot-overdue-reminders';
const due = Date.parse('2026-11-22T12:00:00Z');
const bot: OpenBotConnection = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Research Bot',
  avatarUrl: null,
  webhookUrl: 'https://hooks.example.test',
  webhookSecret: 's'.repeat(40),
  taskPolicy: {
    onAssigned: true,
    onDue: true,
    warningMinutes: 30,
    overdueEveryMinutes: 60,
  },
};
const task: BotAssignedTask = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Review Acme',
  status: 'TODO',
  dueAt: new Date(due).toISOString(),
  updatedAt: '2026-11-21T12:00:00Z',
  openBotAssignees: [bot.id],
  assigneeId: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('OPENBOT_CONNECTIONS', JSON.stringify([bot]));
  vi.stubEnv(
    'OPENBOT_REPLY_URL',
    'https://crm.example.test/s/comments/openbot/reply',
  );
});
it('warns only inside the configured window and emits due when reached', () => {
  expect(taskEventsForBot(task, bot, due - 31 * 60000, false)).toEqual([]);
  expect(
    taskEventsForBot(task, bot, due - 30 * 60000, false).map(
      (event) => event.type,
    ),
  ).toEqual(['crm.task.due_soon']);
  expect(
    taskEventsForBot(task, bot, due, false).map((event) => event.type),
  ).toEqual(['crm.task.due']);
});
it('keeps one overdue event ID per interval, starting after a full interval', () => {
  const overdue = (minutes: number) =>
    taskEventsForBot(task, bot, due + minutes * 60000, false).find(
      (event) => event.type === 'crm.task.overdue',
    );
  expect(overdue(59)).toBeUndefined();
  expect(overdue(60)?.cycle).toBe(overdue(119)?.cycle);
  expect(overdue(120)?.cycle).not.toBe(overdue(60)?.cycle);
});
it('supports workflow intervals and suppresses completed, unassigned or unscheduled tasks', () => {
  expect(
    taskEventsForBot(task, bot, due + 20 * 60000, false, 20).map(
      (event) => event.type,
    ),
  ).toEqual(['crm.task.overdue']);
  expect(
    taskEventsForBot({ ...task, status: 'DONE' }, bot, due + 9999999, true),
  ).toEqual([]);
  expect(
    taskEventsForBot(
      { ...task, openBotAssignees: [] },
      bot,
      due + 9999999,
      true,
    ),
  ).toEqual([]);
  expect(taskEventsForBot({ ...task, dueAt: null }, bot, due, false)).toEqual(
    [],
  );
  expect(
    taskEventsForBot(
      task,
      { ...bot, taskPolicy: undefined },
      due + 9999999,
      true,
    ),
  ).toEqual([]);
});
it('does not queue an already accepted event on another tick', async () => {
  mocks.get.mockImplementation(async (key: string) =>
    key.includes('task-assignments')
      ? { versions: { [bot.id]: task.updatedAt } }
      : { status: 'accepted' },
  );
  expect(await processBotAssignedTask(task, due + 60000)).toBe(0);
  expect(mocks.mutation).toHaveBeenCalledTimes(1);
  expect(
    mocks.mutation.mock.calls[0][0].enqueueJobs.__args.input,
  ).toMatchObject({
    logicFunctionUniversalIdentifier: 'fa38b5fe-e378-4d4a-a777-8a834c9c2d1d',
    delayMs: 59 * 60000,
  });
  expect(mocks.graphql).not.toHaveBeenCalled();
});
it('cancels stale events on completion, unassignment, due change or bucket expiry', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(due + 61 * 60000);
  const event = taskEventsForBot(task, bot, Date.now(), false).find(
    (item) => item.type === 'crm.task.overdue',
  )!;
  for (const current of [
    { ...task, status: 'DONE' },
    { ...task, openBotAssignees: [] },
    { ...task, dueAt: new Date(due + 3600000).toISOString() },
  ]) {
    mocks.graphql.mockResolvedValue({ task: current });
    expect(await isCurrentTaskEvent(event, bot)).toBe(false);
  }
  mocks.graphql.mockResolvedValue({ task });
  expect(await isCurrentTaskEvent(event, bot)).toBe(true);
  expect(
    await isCurrentTaskEvent({ ...event, expiresAt: Date.now() - 1 }, bot),
  ).toBe(false);
  vi.restoreAllMocks();
});
it('ships the workflow node disarmed and rejects invalid intervals', async () => {
  const context = { workspaceMemberId: null } as Parameters<
    typeof sendOverdueReminders
  >[1];
  expect(
    await sendOverdueReminders({ enabled: false, intervalMinutes: 1 }, context),
  ).toMatchObject({ enabled: false, queued: 0 });
  await expect(
    sendOverdueReminders({ enabled: true, intervalMinutes: 0 }, context),
  ).rejects.toThrow('interval');
  expect(mocks.graphql).not.toHaveBeenCalled();
});

it('schedules the next configured boundary and stops waking completed tasks', () => {
  expect(nextTaskWakeAt(task, [bot], due - 31 * 60000)).toBe(due - 30 * 60000);
  expect(nextTaskWakeAt(task, [bot], due - 15 * 60000)).toBe(due);
  expect(nextTaskWakeAt(task, [bot], due + 61 * 60000)).toBe(due + 120 * 60000);
  expect(nextTaskWakeAt({ ...task, status: 'DONE' }, [bot], due)).toBeNull();
  expect(nextTaskWakeAt(task, [], due)).toBeNull();
});
it('recovers an enqueue failure using the same source comment and delivery ID', async () => {
  const values = new Map<string, unknown>();
  mocks.get.mockImplementation(async (key: string) => values.get(key) ?? null);
  mocks.set.mockImplementation(async (key: string, value: unknown) => {
    values.set(key, value);
  });
  let createdId: string | undefined;
  mocks.graphql.mockImplementation(
    async (query: string, variables: Record<string, unknown>) => {
      if (query.startsWith('mutation')) {
        const data = variables.data as {
          id: string;
          authorKind: string;
          mentions: string;
        };
        createdId = data.id;
        expect(data.authorKind).toBe('SYSTEM');
        expect(JSON.parse(data.mentions)).toEqual([
          { id: bot.id, label: bot.name, objectName: 'openbotAgent' },
        ]);
        return { createRecordComment: { id: createdId } };
      }
      return {
        recordComments: {
          edges: createdId ? [{ node: { id: createdId } }] : [],
        },
      };
    },
  );
  mocks.mutation
    .mockRejectedValueOnce(new Error('Queue unavailable'))
    .mockResolvedValue({});
  const undated = { ...task, dueAt: null };
  await expect(processBotAssignedTask(undated, due)).rejects.toThrow(
    'Queue unavailable',
  );
  expect(await processBotAssignedTask(undated, due)).toBe(1);
  const first =
    mocks.mutation.mock.calls[0][0].enqueueJobs.__args.input.jobs[0];
  const second =
    mocks.mutation.mock.calls[1][0].enqueueJobs.__args.input.jobs[0];
  expect(second).toEqual(first);
  expect(
    mocks.graphql.mock.calls.filter(([query]) => query.startsWith('mutation')),
  ).toHaveLength(1);
});
