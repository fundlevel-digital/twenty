import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';
import {
  WEBHOOK_UNIVERSAL_IDENTIFIER,
  EVENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/identifiers';
import { variable, type SlackMessage } from 'src/utils/slack';
import { verifySignature } from 'src/utils/signature';
import { enqueue } from 'src/utils/queue';

export type SlackEvent = {
  type: string;
  channel?: string;
  ts?: string;
  event_ts?: string;
  subtype?: string;
  deleted_ts?: string;
  message?: SlackMessage;
  previous_message?: SlackMessage;
  item?: { type: string; channel: string; ts: string };
} & Partial<SlackMessage>;
export type SlackEnvelope = {
  type: string;
  challenge?: string;
  team_id?: string;
  event_id?: string;
  event?: SlackEvent;
};
export const webhook = async (payload: RoutePayload<SlackEnvelope>) => {
  if (
    !verifySignature({
      rawBody: payload.rawBody,
      timestamp: payload.headers['x-slack-request-timestamp'],
      signature: payload.headers['x-slack-signature'],
      secret: variable('SLACK_SIGNING_SECRET'),
    })
  )
    return new Response({ error: 'Invalid Slack signature' }, { status: 401 });
  const envelope = payload.body;
  if (envelope?.type === 'url_verification')
    return new Response({ challenge: envelope.challenge });
  if (
    envelope?.type === 'event_callback' &&
    envelope.team_id &&
    envelope.event_id &&
    envelope.event
  )
    await enqueue(
      EVENT_UNIVERSAL_IDENTIFIER,
      envelope,
      `slack-event:${envelope.team_id}:${envelope.event_id}`,
    );
  return new Response({ ok: true });
};
export default defineLogicFunction({
  universalIdentifier: WEBHOOK_UNIVERSAL_IDENTIFIER,
  name: 'slack-events',
  timeoutSeconds: 10,
  handler: webhook,
  httpRouteTriggerSettings: {
    path: '/webhook/slack-sync',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['x-slack-request-timestamp', 'x-slack-signature'],
  },
});
