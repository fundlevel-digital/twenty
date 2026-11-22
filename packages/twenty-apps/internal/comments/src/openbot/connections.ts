import { isNonEmptyString, isString, isObject } from '@sniptt/guards';
import { isDefined } from 'twenty-sdk/utils';

import { type OpenBotAgent, type OpenBotConnection } from './types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const parseOpenBotConnections = (
  configuration: string | undefined,
): OpenBotConnection[] => {
  if (!isNonEmptyString(configuration)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(configuration);
  } catch {
    throw new Error('OpenBot connections must be valid JSON');
  }
  if (!Array.isArray(parsed) || parsed.length > 64) {
    throw new Error('Configure up to 64 OpenBot agents');
  }
  const identifiers = new Set<string>();
  return parsed.map((value: unknown) => {
    if (
      !isObject<Record<string, unknown>, unknown>(value) ||
      !isString(value.id) ||
      !UUID_PATTERN.test(value.id) ||
      !isNonEmptyString(value.name) ||
      !value.name.trim() ||
      value.name.length > 80 ||
      !isNonEmptyString(value.webhookUrl) ||
      !isNonEmptyString(value.webhookSecret) ||
      value.webhookSecret.length < 32 ||
      (isDefined(value.avatarUrl) && !isString(value.avatarUrl))
    ) {
      throw new Error('Invalid OpenBot agent configuration');
    }
    const webhookUrl = new URL(value.webhookUrl);
    if (
      webhookUrl.protocol !== 'https:' ||
      webhookUrl.username ||
      webhookUrl.password
    ) {
      throw new Error(
        'OpenBot webhook URLs must use HTTPS without URL credentials',
      );
    }
    if (
      isString(value.avatarUrl) &&
      value.avatarUrl.length > 0 &&
      new URL(value.avatarUrl).protocol !== 'https:'
    ) {
      throw new Error('OpenBot avatars must use HTTPS');
    }
    if (identifiers.has(value.id.toLowerCase()))
      throw new Error('OpenBot agent IDs must be unique');
    identifiers.add(value.id.toLowerCase());
    return {
      id: value.id.toLowerCase(),
      name: value.name.trim(),
      avatarUrl: isNonEmptyString(value.avatarUrl) ? value.avatarUrl : null,
      webhookUrl: webhookUrl.href,
      webhookSecret: value.webhookSecret,
    };
  });
};

export const getOpenBotConnections = (): OpenBotConnection[] =>
  parseOpenBotConnections(process.env.OPENBOT_CONNECTIONS);

export const publicOpenBotAgent = ({
  id,
  name,
  avatarUrl,
}: OpenBotConnection): OpenBotAgent => ({ id, name, avatarUrl });
