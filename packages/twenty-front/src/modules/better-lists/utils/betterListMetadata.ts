import { isDefined } from 'twenty-shared/utils';

export const BETTER_LIST_PREFIX = 'better-lists:v1:';

export type BetterListConfiguration = {
  parentObjectName: string;
  emoji: string;
  slug: string;
};

export const parseBetterList = (
  description: string | null | undefined,
): BetterListConfiguration | undefined => {
  if (!description?.startsWith(BETTER_LIST_PREFIX)) {
    return undefined;
  }
  const [parentObjectName, emoji, slug] = description
    .slice(BETTER_LIST_PREFIX.length)
    .split('|');
  if (!isDefined(parentObjectName) || !isDefined(emoji) || !isDefined(slug)) {
    return undefined;
  }
  return { parentObjectName, emoji, slug };
};

export const serializeBetterList = ({
  parentObjectName,
  emoji,
  slug,
}: BetterListConfiguration) =>
  `${BETTER_LIST_PREFIX}${parentObjectName}|${emoji}|${slug}`;
