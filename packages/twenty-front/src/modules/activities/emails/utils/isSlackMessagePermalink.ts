import { isNonEmptyString } from '@sniptt/guards';

export const isSlackMessagePermalink = (
  permalink: unknown,
): permalink is string => {
  if (!isNonEmptyString(permalink)) {
    return false;
  }

  try {
    const url = new URL(permalink);

    return (
      url.protocol === 'https:' &&
      (url.hostname === 'slack.com' || url.hostname.endsWith('.slack.com'))
    );
  } catch {
    return false;
  }
};
