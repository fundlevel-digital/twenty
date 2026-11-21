import { isNonEmptyString, isObject } from '@sniptt/guards';
import { type CronPayload, type RoutePayload } from 'twenty-sdk/define';

import { type AnalyticsEntrySelection } from 'src/logic-functions/types/analytics-entry-selection.type';
import { type RefreshYoutubeAnalyticsRouteBody } from 'src/logic-functions/types/refresh-youtube-analytics-route-body.type';

export type RefreshYoutubeAnalyticsPayload =
  | CronPayload
  | RoutePayload<RefreshYoutubeAnalyticsRouteBody>;

const isRoutePayload = (
  payload: RefreshYoutubeAnalyticsPayload,
): payload is RoutePayload<RefreshYoutubeAnalyticsRouteBody> =>
  isObject(payload) && 'requestContext' in payload;

const toIds = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter(isNonEmptyString))] : [];

// The cron trigger refreshes every enabled entry; the command menu names its records.
export const toAnalyticsEntrySelection = (
  payload: RefreshYoutubeAnalyticsPayload,
): AnalyticsEntrySelection => {
  if (!isRoutePayload(payload)) {
    return { kind: 'calculationsEnabled' };
  }

  return { kind: 'records', channelIds: toIds(payload.body?.channelIds) };
};
