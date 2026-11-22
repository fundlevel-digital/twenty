import { isObject } from '@sniptt/guards';
import { type OpenBotTaskPolicy } from './types';

export const DEFAULT_TASK_POLICY: OpenBotTaskPolicy = {
  onAssigned: false,
  onDue: false,
  warningMinutes: null,
  overdueEveryMinutes: null,
};

export const parseTaskPolicy = (input: unknown): OpenBotTaskPolicy => {
  if (input === undefined) return { ...DEFAULT_TASK_POLICY };
  if (!isObject<Record<string, unknown>, unknown>(input))
    throw new Error('Invalid task notification policy');
  const policy = { ...DEFAULT_TASK_POLICY, ...input };
  if (
    typeof policy.onAssigned !== 'boolean' ||
    typeof policy.onDue !== 'boolean'
  )
    throw new Error('Invalid task notification policy');
  for (const value of [policy.warningMinutes, policy.overdueEveryMinutes]) {
    if (
      value !== null &&
      (typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < 1 ||
        value > 525600)
    )
      throw new Error('Use a reminder interval from 1 to 525,600 minutes');
  }
  return {
    onAssigned: policy.onAssigned,
    onDue: policy.onDue,
    warningMinutes: policy.warningMinutes,
    overdueEveryMinutes: policy.overdueEveryMinutes,
  };
};
