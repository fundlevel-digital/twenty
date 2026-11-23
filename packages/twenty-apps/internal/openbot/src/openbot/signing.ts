import { createHmac, timingSafeEqual } from 'node:crypto';

export const signOpenBotEvent = (
  secret: string,
  timestamp: string,
  deliveryId: string,
  body: string,
): string =>
  `sha256=${createHmac('sha256', secret)
    .update(`${timestamp}.${deliveryId}.${body}`)
    .digest('hex')}`;

export const verifyOpenBotReply = ({
  secret,
  timestamp,
  signature,
  body,
  now = Date.now(),
}: {
  secret: string;
  timestamp: string | undefined;
  signature: string | undefined;
  body: string;
  now?: number;
}): boolean => {
  if (
    !timestamp ||
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !signature ||
    !/^sha256=[0-9a-f]{64}$/.test(signature)
  )
    return false;
  const expected = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};
