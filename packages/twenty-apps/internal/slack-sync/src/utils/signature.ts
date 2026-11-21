import { createHmac, timingSafeEqual } from 'node:crypto';

export const verifySignature = ({
  rawBody,
  timestamp,
  signature,
  secret,
  now = Date.now(),
}: {
  rawBody?: string;
  timestamp?: string;
  signature?: string;
  secret: string;
  now?: number;
}): boolean => {
  if (
    !rawBody ||
    !timestamp ||
    !signature ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    return false;
  const expected = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${rawBody}`).digest('hex')}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
};
