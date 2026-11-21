import { defineApplication } from 'twenty-sdk/define';

import { DEFAULT_TREG_YOUTUBE_KEY_TOOLS } from 'src/constants/default-treg-youtube-key-tools.constant';
import { TREG_TOKEN_VARIABLE_KEY } from 'src/constants/treg-token-variable-key.constant';
import { TREG_YOUTUBE_KEY_TOOLS_VARIABLE_KEY } from 'src/constants/treg-youtube-key-tools-variable-key.constant';
import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  TREG_TOKEN_VARIABLE_UNIVERSAL_IDENTIFIER,
  TREG_YOUTUBE_KEY_TOOLS_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'YouTube Analytics',
  description:
    'Refreshes influencer YouTube analytics entries (views, engagement, view rate and posting cadence) from the YouTube Data API every day at 05:00 UTC.',
  author: 'Fundlevel',
  category: 'Enrichment',
  applicationVariables: {
    [TREG_TOKEN_VARIABLE_KEY]: {
      universalIdentifier: TREG_TOKEN_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'treg token',
      description:
        'Token sent as X-Treg-Token on every YouTube Data API call proxied through treg.to.',
      isSecret: true,
    },
    [TREG_YOUTUBE_KEY_TOOLS_VARIABLE_KEY]: {
      universalIdentifier: TREG_YOUTUBE_KEY_TOOLS_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'treg YouTube key tools',
      description:
        'Comma-separated treg tool names that each hold a YouTube Data API key. A run moves to the next tool when one runs out of quota.',
      isSecret: false,
      value: DEFAULT_TREG_YOUTUBE_KEY_TOOLS,
    },
  },
});
