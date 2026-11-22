import { createHash, randomUUID } from 'node:crypto';
import { isNonEmptyString, isObject, isString } from '@sniptt/guards';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { defineLogicFunction } from 'twenty-sdk/define';
import { type LogicFunctionExecutionContext } from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from '../constants/identifiers';
import { parseOpenBotConnections } from '../openbot/connections';
import { requireBotAdmin } from '../openbot/require-bot-admin';
import { parseTaskPolicy } from '../openbot/task-policy';

export const OPENBOT_CONFIG_FUNCTION_ID =
  '0a0fe957-56bf-4379-a6f0-c76996121c35';
const revision = (value: string | undefined) =>
  createHash('sha256')
    .update(value ?? '')
    .digest('hex');

export const openBotConfigHandler = async (
  input: unknown,
  context: LogicFunctionExecutionContext,
) => {
  await requireBotAdmin(context);
  const client = new MetadataApiClient();
  if (
    !isObject<Record<string, unknown>, unknown>(input) ||
    !isString(input.action)
  )
    throw new Error('Invalid bot configuration request');
  const raw = process.env.OPENBOT_CONNECTIONS;
  const connections = parseOpenBotConnections(raw);
  const result = () => ({
    revision: revision(raw),
    replyUrl: process.env.OPENBOT_REPLY_URL ?? '',
    bots: connections.map(({ webhookSecret, ...bot }) => ({
      ...bot,
      hasSecret: Boolean(webhookSecret),
    })),
  });
  if (input.action === 'list') return result();
  if (input.revision !== revision(raw))
    throw new Error('Bot settings changed. Reload before saving.');
  const { findOneApplication: application } = await client.query({
    findOneApplication: {
      __args: { universalIdentifier: IDENTIFIERS.application },
      id: true,
    },
  });
  if (!application) throw new Error('Comments application unavailable');
  if (input.action === 'reply-url') {
    if (!isString(input.replyUrl)) throw new Error('Enter an HTTPS reply URL');
    const url = new URL(input.replyUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash)
      throw new Error(
        'Use an HTTPS reply URL without credentials or a fragment',
      );
    await client.mutation({
      updateOneApplicationVariable: {
        __args: {
          applicationId: application.id,
          key: 'OPENBOT_REPLY_URL',
          value: url.href,
        },
      },
    });
    return { saved: true };
  }
  if (!['save', 'remove'].includes(input.action))
    throw new Error('Unsupported bot action');
  const draft = input.bot;
  if (!isObject<Record<string, unknown>, unknown>(draft))
    throw new Error('Select a bot');
  const id = isNonEmptyString(draft.id) ? draft.id.toLowerCase() : randomUUID();
  const existing = connections.find((bot) => bot.id === id);
  if (input.action === 'remove') {
    if (!existing) throw new Error('Bot unavailable');
    connections.splice(connections.indexOf(existing), 1);
  } else {
    const [next] = parseOpenBotConnections(
      JSON.stringify([
        {
          id,
          name: draft.name,
          avatarUrl: draft.avatarUrl || null,
          webhookUrl: draft.webhookUrl,
          webhookSecret: isNonEmptyString(draft.webhookSecret)
            ? draft.webhookSecret
            : existing?.webhookSecret,
          enabled: draft.enabled !== false,
          taskPolicy: parseTaskPolicy(draft.taskPolicy),
        },
      ]),
    );
    if (existing) connections.splice(connections.indexOf(existing), 1, next);
    else connections.push(next);
    if (connections.length > 64) throw new Error('Configure up to 64 bots');
  }
  await client.mutation({
    updateOneApplicationVariable: {
      __args: {
        applicationId: application.id,
        key: 'OPENBOT_CONNECTIONS',
        value: JSON.stringify(connections),
      },
    },
  });
  return { saved: true, id };
};

export default defineLogicFunction({
  universalIdentifier: OPENBOT_CONFIG_FUNCTION_ID,
  name: 'openbot-config',
  description:
    'Manage bot profiles and encrypted webhook credentials with native Apps permission.',
  handler: openBotConfigHandler,
  timeoutSeconds: 30,
});
