import { beforeEach, expect, it, vi } from 'vitest';
import { refreshTwitterAnalyticsHandler } from 'src/logic-functions/handlers/refresh-twitter-analytics.handler';
import { refreshWorkflowProfile } from 'src/logic-functions/workflow-refresh-twitter-profile';
import { type RefreshTwitterAnalyticsResult } from 'src/logic-functions/types/refresh-twitter-analytics-result.type';
vi.mock(
  'src/logic-functions/handlers/refresh-twitter-analytics.handler',
  () => ({ refreshTwitterAnalyticsHandler: vi.fn() }),
);
beforeEach(() => vi.clearAllMocks());
const refreshed: RefreshTwitterAnalyticsResult = {
  startedAt: '2026-11-22T05:00:00Z',
  finishedAt: '2026-11-22T05:00:01Z',
  entriesSelected: 1,
  entriesWritten: 1,
  entriesFailed: 0,
  missingIdentity: 0,
  profilesNotFound: 0,
  quota: { profilesList: 1, postsList: 1, total: 2 },
  unavailableCredentialIds: [],
  failures: [],
};
it('requires an explicit selected profile before any API work', async () => {
  await expect(refreshWorkflowProfile({})).rejects.toThrow(
    'Select a Twitter Profile',
  );
  expect(refreshTwitterAnalyticsHandler).not.toHaveBeenCalled();
});
it('refreshes exactly the selected profile', async () => {
  vi.mocked(refreshTwitterAnalyticsHandler).mockResolvedValue(refreshed);
  await refreshWorkflowProfile({ profileId: 'profile' });
  expect(refreshTwitterAnalyticsHandler).toHaveBeenCalledWith({
    profileIds: ['profile'],
  });
});
it('fails the workflow rather than continuing with stale data after a failed refresh', async () => {
  vi.mocked(refreshTwitterAnalyticsHandler).mockResolvedValue({
    ...refreshed,
    entriesWritten: 0,
    entriesFailed: 1,
    failures: [{ entryId: 'profile', reason: 'Profile unavailable' }],
  });
  await expect(
    refreshWorkflowProfile({ profileId: 'profile' }),
  ).rejects.toThrow('Profile unavailable');
});
