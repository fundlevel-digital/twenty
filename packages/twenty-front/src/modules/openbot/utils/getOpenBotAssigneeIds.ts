import { isString } from '@sniptt/guards';

export const getOpenBotAssigneeIds = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter(isString))] : [];
