import { expect, it } from 'vitest';
import {
  getMentionQuery,
  getMentionRanges,
  hasUnselectedMention,
} from '../utils/mention-draft';

const taylor = {
  id: 'taylor',
  label: 'Taylor Smith',
  objectName: 'workspaceMember',
};
it('matches complete selected names rather than similarly prefixed names', () => {
  expect(hasUnselectedMention('@Taylor Smithson', [taylor])).toBe(true);
  expect(hasUnselectedMention('@Taylor Smith.', [taylor])).toBe(false);
  expect(getMentionRanges('Hello @Taylor Smith', [taylor])).toHaveLength(1);
});
it('ignores email addresses and already selected mentions when querying', () => {
  expect(getMentionQuery('alex@example.test', 17, [])).toBeNull();
  expect(hasUnselectedMention('alex@example.test', [])).toBe(false);
  expect(getMentionQuery('@Taylor Smith ', 14, [taylor])).toBeNull();
  expect(getMentionQuery('@Taylor Sm', 10, [])).toEqual({
    start: 0,
    end: 10,
    query: 'Taylor Sm',
  });
});
it('validates repeated mentions and an unfinished @', () => {
  expect(
    hasUnselectedMention('@Taylor Smith and @Taylor Smith', [taylor]),
  ).toBe(false);
  expect(hasUnselectedMention('Hello @', [])).toBe(true);
});
