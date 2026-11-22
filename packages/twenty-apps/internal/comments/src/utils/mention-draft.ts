import { type Mention } from '../types';

export type MentionQuery = { start: number; end: number; query: string };

export const getMentionRanges = (body: string, mentions: Mention[]) => {
  const ranges: { start: number; end: number; mention: Mention }[] = [];
  for (const mention of [...mentions].sort(
    (left, right) => right.label.length - left.label.length,
  )) {
    const text = `@${mention.label}`;
    let start = body.indexOf(text);
    while (start !== -1) {
      const end = start + text.length;
      if (
        !/[\p{L}\p{N}_]/u.test(body[end] ?? '') &&
        !ranges.some((range) => start < range.end && end > range.start)
      )
        ranges.push({ start, end, mention });
      start = body.indexOf(text, start + text.length);
    }
  }
  return ranges.sort((left, right) => left.start - right.start);
};

export const hasUnselectedMention = (body: string, mentions: Mention[]) => {
  const ranges = getMentionRanges(body, mentions);
  return [...body.matchAll(/(^|[\s([{])@/g)].some((match) => {
    const start = match.index + match[1].length;
    return !ranges.some((range) => range.start === start);
  });
};

export const getMentionQuery = (
  body: string,
  caret: number,
  mentions: Mention[],
): MentionQuery | null => {
  const start = body.lastIndexOf('@', caret - 1);
  if (
    start === -1 ||
    start >= caret ||
    (start > 0 && /[\p{L}\p{N}_]/u.test(body[start - 1])) ||
    getMentionRanges(body, mentions).some((range) => start === range.start)
  )
    return null;
  const query = body.slice(start + 1, caret);
  return query.length <= 100 && !/[\n@]/.test(query)
    ? { start, end: caret, query }
    : null;
};
