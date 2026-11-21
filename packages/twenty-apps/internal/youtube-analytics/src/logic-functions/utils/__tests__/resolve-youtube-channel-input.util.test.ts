import { describe, expect, it } from 'vitest';

import { resolveYoutubeChannelInput } from 'src/logic-functions/utils/resolve-youtube-channel-input.util';

const CHANNEL_ID = 'UC_zBdZ0_H_jn41FDRG7q4Tw';

const buildIdentity = (
  overrides: Partial<Parameters<typeof resolveYoutubeChannelInput>[0]>,
) => ({
  recordId: 'channel-record-1',
  youtubeId: null,
  youtubeHandle: null,
  youtubeUrl: null,
  ...overrides,
});

describe('resolveYoutubeChannelInput', () => {
  it('prefers a stored channel id', () => {
    expect(
      resolveYoutubeChannelInput(
        buildIdentity({ youtubeId: CHANNEL_ID, youtubeHandle: '@creator' }),
      ),
    ).toEqual({ kind: 'id', value: CHANNEL_ID });
  });

  it('reads the channel id from a channel URL', () => {
    expect(
      resolveYoutubeChannelInput(
        buildIdentity({
          youtubeId: 'not-a-channel-id',
          youtubeUrl: `https://www.youtube.com/channel/${CHANNEL_ID}`,
        }),
      ),
    ).toEqual({ kind: 'id', value: CHANNEL_ID });
  });

  it('strips the @ from a stored handle', () => {
    expect(
      resolveYoutubeChannelInput(buildIdentity({ youtubeHandle: '@vimjoyer' })),
    ).toEqual({ kind: 'handle', value: 'vimjoyer' });
  });

  it('falls back to the handle in a URL', () => {
    expect(
      resolveYoutubeChannelInput(
        buildIdentity({ youtubeUrl: 'https://www.youtube.com/@jvscholz?si=1' }),
      ),
    ).toEqual({ kind: 'handle', value: 'jvscholz' });
  });

  it('returns null without any identity', () => {
    expect(resolveYoutubeChannelInput(buildIdentity({}))).toBeNull();
  });
});
