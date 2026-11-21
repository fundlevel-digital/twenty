import { isNonEmptyString } from '@sniptt/guards';

import { DEFAULT_TREG_YOUTUBE_KEY_TOOLS } from 'src/constants/default-treg-youtube-key-tools.constant';
import { TREG_TOKEN_VARIABLE_KEY } from 'src/constants/treg-token-variable-key.constant';
import { TREG_YOUTUBE_KEY_TOOLS_VARIABLE_KEY } from 'src/constants/treg-youtube-key-tools-variable-key.constant';
import { type TregConfiguration } from 'src/logic-functions/types/treg-configuration.type';

const parseKeyToolNames = (value: string): string[] => [
  ...new Set(
    value
      .split(',')
      .map((name) => name.trim())
      .filter(isNonEmptyString),
  ),
];

export const getTregConfiguration = (): TregConfiguration => {
  const tregToken = process.env[TREG_TOKEN_VARIABLE_KEY]?.trim();

  if (!isNonEmptyString(tregToken)) {
    throw new Error(
      `${TREG_TOKEN_VARIABLE_KEY} is not set. Set it in Settings -> Applications -> YouTube Analytics.`,
    );
  }

  const configuredKeyToolNames = parseKeyToolNames(
    process.env[TREG_YOUTUBE_KEY_TOOLS_VARIABLE_KEY] ?? '',
  );

  return {
    tregToken,
    keyToolNames:
      configuredKeyToolNames.length > 0
        ? configuredKeyToolNames
        : parseKeyToolNames(DEFAULT_TREG_YOUTUBE_KEY_TOOLS),
  };
};
