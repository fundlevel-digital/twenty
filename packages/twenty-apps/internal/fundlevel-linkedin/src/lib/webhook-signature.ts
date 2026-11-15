// Unipile webhook signature check. Adapted from Twenty's LinkedIn app (MIT):
// packages/twenty-apps/public/linkedin/src/unipile/utils/verify-unipile-webhook-signature.util.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

const TOLERANCE_SECONDS = 5 * 60;

const parseHeader = (header: string) => {
  const parts = new Map(
    header.split(',').map((part) => {
      const separator = part.indexOf('=');
      return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()] as const;
    }),
  );
  return { timestamp: parts.get('t'), signature: parts.get('v0') };
};

// Header format: "t=<unix seconds>,v0=<hex HMAC-SHA256 of `${t}.${rawBody}`>".
export const verifyUnipileSignature = ({
  header,
  rawBody,
  secret,
  nowInSeconds = Math.floor(Date.now() / 1000),
}: {
  header: string | undefined;
  rawBody: string | undefined;
  secret: string;
  nowInSeconds?: number;
}): boolean => {
  if (!header || rawBody === undefined || !secret) return false;
  const { timestamp, signature } = parseHeader(header);
  if (!timestamp || !signature) return false;
  const at = Number(timestamp);
  if (!Number.isFinite(at) || Math.abs(nowInSeconds - at) > TOLERANCE_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
};
