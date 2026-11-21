import shortcodes from 'emojibase-data/en/shortcodes/iamcal.json';

const EMOJI_BY_SHORTCODE = new Map(
  Object.entries(shortcodes).flatMap(([hexcode, names]) => {
    const emoji = String.fromCodePoint(
      ...hexcode.split('-').map((codePoint) => Number.parseInt(codePoint, 16)),
    );

    return (Array.isArray(names) ? names : [names]).map(
      (name) => [name, emoji] as const,
    );
  }),
);

export const getSlackReactionEmoji = (name: string): string =>
  EMOJI_BY_SHORTCODE.get(name) ?? `:${name}:`;
