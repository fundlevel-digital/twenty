import { describe, expect, it } from 'vitest';

import { buildRefreshSnackbarParams } from 'src/front-components/utils/build-refresh-snackbar-params.util';
import { type RefreshTwitterAnalyticsResult } from 'src/logic-functions/types/refresh-twitter-analytics-result.type';

const buildResult = (
  overrides: Partial<RefreshTwitterAnalyticsResult>,
): RefreshTwitterAnalyticsResult => ({
  startedAt: '2026-08-28T05:00:00.000Z',
  finishedAt: '2026-08-28T05:00:01.000Z',
  entriesSelected: 2,
  entriesWritten: 2,
  entriesFailed: 0,
  missingIdentity: 0,
  profilesNotFound: 0,
  quota: { profilesList: 1, postsList: 2, total: 3 },
  unavailableCredentialIds: [],
  failures: [],
  ...overrides,
});

const failure = {
  entryId: 'entry-1',
  reason: 'Twitter profile not found',
};

describe('buildRefreshSnackbarParams', () => {
  it('reports success', () => {
    expect(buildRefreshSnackbarParams(buildResult({}))).toEqual({
      message: 'Refreshed Twitter analytics for 2 profiles.',
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
      message: 'Could not refresh 1 of 2 Twitter profiles.',
      variant: 'warning',
      detailedMessage: 'Twitter profile not found',
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
