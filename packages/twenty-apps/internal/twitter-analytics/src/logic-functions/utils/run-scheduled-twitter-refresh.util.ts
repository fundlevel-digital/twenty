import { isObject, isString } from '@sniptt/guards';
import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  getLatestTwitterRefreshSlot,
  getTwitterRefreshSchedule,
  getTwitterScheduleSignature,
  type TwitterRefreshSchedule,
} from 'src/utils/twitter-refresh-schedule.util';
import { createWorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

export const runScheduledTwitterRefresh = async <TResult>({
  refresh,
  schedule = getTwitterRefreshSchedule(process.env),
  previous = process.env.LAST_SCHEDULED_REFRESH_SLOT ?? '',
  now = new Date(),
  saveSlot = async (value: string) => {
    const metadata = createWorkspaceGraphqlClient('/metadata');
    const application = await metadata.request<{
      findOneApplication: { id: string } | null;
    }>(
      'query Application($identifier: UUID!) { findOneApplication(universalIdentifier: $identifier) { id } }',
      { identifier: APPLICATION_UNIVERSAL_IDENTIFIER },
    );
    if (!application.findOneApplication)
      throw new Error('Application unavailable');
    await metadata.request(
      'mutation SaveSlot($id: UUID!, $value: String!) { updateOneApplicationVariable(applicationId: $id, key: "LAST_SCHEDULED_REFRESH_SLOT", value: $value) }',
      { id: application.findOneApplication.id, value },
    );
  },
}: {
  refresh: () => Promise<TResult>;
  schedule?: TwitterRefreshSchedule;
  previous?: string;
  now?: Date;
  saveSlot?: (value: string) => Promise<void>;
}) => {
  const slot = getLatestTwitterRefreshSlot(schedule, now);
  if (!slot) return { skipped: true, reason: 'disabled' };
  const configuration = getTwitterScheduleSignature(schedule);
  const state: unknown = previous ? JSON.parse(previous) : null;
  const matches =
    isObject(state) &&
    'configuration' in state &&
    state.configuration === configuration;
  if (matches && (!('slot' in state) || !isString(state.slot)))
    throw new Error('Invalid previous refresh slot');
  if (matches && 'slot' in state && isString(state.slot)) {
    const previousTime = Date.parse(state.slot);
    if (!Number.isFinite(previousTime))
      throw new Error('Invalid previous refresh slot');
    if (previousTime >= slot.getTime())
      return { skipped: true, reason: 'not-due' };
  }
  // Claim before API work so later minute ticks do not restart an in-flight window.
  await saveSlot(JSON.stringify({ configuration, slot: slot.toISOString() }));
  if (!matches && now.getTime() - slot.getTime() >= 60_000)
    return { skipped: true, reason: 'schedule-initialized' };
  return refresh();
};
