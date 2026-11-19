import { describe, expect, it } from 'vitest';

import { buildRefreshSnackbarParams } from 'src/front-components/utils/build-refresh-snackbar-params.util';
import { type RefreshYoutubeAnalyticsResult } from 'src/logic-functions/types/refresh-youtube-analytics-result.type';

const buildResult = (
  overrides: Partial<RefreshYoutubeAnalyticsResult>,
): RefreshYoutubeAnalyticsResult => ({
  startedAt: '2026-08-28T05:00:00.000Z',
  finishedAt: '2026-08-28T05:00:01.000Z',
  entriesSelected: 2,
  entriesWritten: 2,
  entriesFailed: 0,
  missingIdentity: 0,
  channelsNotFound: 0,
  quota: { channelsList: 1, playlistItemsList: 2, videosList: 2, total: 5 },
  exhaustedKeyTools: [],
  failures: [],
  ...overrides,
});

const failure = {
  entryId: 'entry-1',
  influencerId: 'influencer-1',
  reason: 'YouTube channel not found',
};

describe('buildRefreshSnackbarParams', () => {
  it('reports success', () => {
    expect(buildRefreshSnackbarParams(buildResult({}))).toEqual({
      message: 'Refreshed YouTube analytics for 2 entries.',
      variant: 'success',
    });
  });

  it('reports a partial failure with the first reason', () => {
    expect(
      buildRefreshSnackbarParams(
        buildResult({
          entriesWritten: 1,
          entriesFailed: 1,
          failures: [failure],
        }),
      ),
    ).toEqual({
      message: 'Could not refresh 1 of 2 YouTube analytics entries.',
      variant: 'warning',
      detailedMessage: 'YouTube channel not found',
    });
  });

  it('reports a complete failure', () => {
    expect(
      buildRefreshSnackbarParams(
        buildResult({
          entriesSelected: 1,
          entriesWritten: 0,
          entriesFailed: 1,
          failures: [failure],
        }),
      ),
    ).toMatchObject({ variant: 'error', detailedMessage: failure.reason });
  });

  it('warns when the selection has no analytics entries', () => {
    expect(
      buildRefreshSnackbarParams(
        buildResult({ entriesSelected: 0, entriesWritten: 0 }),
      ),
    ).toMatchObject({ variant: 'warning' });
  });
});
