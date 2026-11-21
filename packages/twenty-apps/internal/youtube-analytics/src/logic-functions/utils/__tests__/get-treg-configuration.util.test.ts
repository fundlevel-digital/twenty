import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTregConfiguration } from 'src/logic-functions/utils/get-treg-configuration.util';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getTregConfiguration', () => {
  it('falls back to the default key tools when none are configured', () => {
    vi.stubEnv('TREG_TOKEN', ' treg-token ');
    vi.stubEnv('TREG_YOUTUBE_KEY_TOOLS', '');

    expect(getTregConfiguration()).toEqual({
      tregToken: 'treg-token',
      keyToolNames: ['yt-key-fundlevel-internal', 'yt-key-scheduler-zero'],
    });
  });

  it('reads the configured key tools in order without blanks or duplicates', () => {
    vi.stubEnv('TREG_TOKEN', 'treg-token');
    vi.stubEnv('TREG_YOUTUBE_KEY_TOOLS', ' key-b, ,key-a,key-b ');

    expect(getTregConfiguration().keyToolNames).toEqual(['key-b', 'key-a']);
  });

  it('throws when the treg token is missing', () => {
    vi.stubEnv('TREG_TOKEN', '   ');

    expect(() => getTregConfiguration()).toThrow('TREG_TOKEN is not set');
  });
});
