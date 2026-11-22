export const SOCIAL_PROVIDERS = [
  'bluesky',
  'facebook',
  'generic',
  'hometown',
  'instagram',
  'linkedin',
  'mastodon',
  'npm',
  'reddit',
  'threads',
  'twitch',
  'twitter',
  'youtube',
] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];
