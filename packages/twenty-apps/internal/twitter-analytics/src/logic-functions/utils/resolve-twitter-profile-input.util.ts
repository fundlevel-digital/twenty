import { type TwitterProfileRecordIdentity } from 'src/logic-functions/types/twitter-profile-record-identity.type';

export const resolveTwitterProfileInput = (
  identity: TwitterProfileRecordIdentity,
): { kind: 'handle'; value: string } | null => {
  let handle = identity.twitterHandle?.trim().replace(/^@/, '');
  if (!handle && identity.twitterUrl) {
    try {
      const url = new URL(identity.twitterUrl);
      if (
        !['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(
          url.hostname.toLowerCase(),
        )
      )
        return null;
      handle = url.pathname.split('/').filter(Boolean)[0];
    } catch {
      return null;
    }
  }
  if (
    !handle ||
    !/^[a-zA-Z0-9_]{1,15}$/.test(handle) ||
    [
      'home',
      'search',
      'intent',
      'i',
      'explore',
      'settings',
      'messages',
    ].includes(handle.toLowerCase())
  )
    return null;
  return { kind: 'handle', value: handle };
};
