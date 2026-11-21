import { createHmac, timingSafeEqual } from 'node:crypto';
export const verifySignature = (
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean => {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
};
