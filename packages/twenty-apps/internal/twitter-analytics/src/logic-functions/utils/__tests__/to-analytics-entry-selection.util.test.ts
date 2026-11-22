import { expect, it } from 'vitest';
import { toAnalyticsEntrySelection } from 'src/logic-functions/utils/to-analytics-entry-selection.util';

it('keeps workflow-selected IDs independent of enrollment', () => {
  expect(
    toAnalyticsEntrySelection({ profileIds: ['one', 'one', 'two'] }),
  ).toEqual({ kind: 'records', profileIds: ['one', 'two'] });
});
it('never treats an explicitly empty workflow selection as all enrolled profiles', () => {
  expect(toAnalyticsEntrySelection({ profileIds: [] })).toEqual({
    kind: 'records',
    profileIds: [],
  });
});
it('uses enrollment for cron payloads only', () => {
  expect(toAnalyticsEntrySelection({})).toEqual({
    kind: 'calculationsEnabled',
  });
});
