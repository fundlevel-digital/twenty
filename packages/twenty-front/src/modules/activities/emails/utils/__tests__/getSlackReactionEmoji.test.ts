import { getSlackReactionEmoji } from '@/activities/emails/utils/getSlackReactionEmoji';

describe('getSlackReactionEmoji', () => {
  it.each([
    ['thumbsup', '👍'],
    ['+1', '👍'],
    ['tada', '🎉'],
    ['unknown_custom_emoji', ':unknown_custom_emoji:'],
  ])('renders %s as %s', (name, emoji) => {
    expect(getSlackReactionEmoji(name)).toBe(emoji);
  });
});
