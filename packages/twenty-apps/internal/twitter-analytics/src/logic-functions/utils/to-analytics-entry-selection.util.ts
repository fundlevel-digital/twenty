import { isNonEmptyString, isObject } from '@sniptt/guards';
import { type CronPayload, type RoutePayload } from 'twenty-sdk/define';

import { type AnalyticsEntrySelection } from 'src/logic-functions/types/analytics-entry-selection.type';
import { type RefreshTwitterAnalyticsRouteBody } from 'src/logic-functions/types/refresh-twitter-analytics-route-body.type';

export type RefreshTwitterAnalyticsPayload =
  | CronPayload
  | RoutePayload<RefreshTwitterAnalyticsRouteBody>;

const isRoutePayload = (
  payload: RefreshTwitterAnalyticsPayload,
): payload is RoutePayload<RefreshTwitterAnalyticsRouteBody> =>
  isObject(payload) && 'requestContext' in payload;

const toIds = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter(isNonEmptyString))] : [];

// The cron trigger refreshes every enabled entry; the command menu names its records.
export const toAnalyticsEntrySelection = (
  payload: RefreshTwitterAnalyticsPayload,
): AnalyticsEntrySelection => {
  if (!isRoutePayload(payload)) {
    return { kind: 'calculationsEnabled' };
  }

  return { kind: 'records', profileIds: toIds(payload.body?.profileIds) };
};
