import addressParser from 'addressparser';
import { convert } from 'html-to-text';
import {
  type GoogleMessage,
  type MessagePart,
} from 'src/logic-functions/utils/google';
import { type GroupSettings } from 'src/types/settings';

export const getHeader = (message: GoogleMessage, name: string): string =>
  message.payload.headers
    ?.filter((header) => header.name.toLowerCase() === name.toLowerCase())
    .map((header) => header.value)
    .join(', ') ?? '';
export const parseAddresses = (
  value: string,
): { address: string; name: string }[] =>
  addressParser(value)
    .flatMap((entry) => entry.group ?? [entry])
    .filter((entry) => entry.address)
    .map((entry) => ({
      address: entry.address.toLowerCase(),
      name: entry.name,
    }));

export const senderAddresses = (message: GoogleMessage) => {
  const original = parseAddresses(getHeader(message, 'x-original-sender'));
  return original.length === 1
    ? original
    : parseAddresses(getHeader(message, 'from'));
};

export const matchingGroups = (
  message: GoogleMessage,
  groups: GroupSettings[],
): GroupSettings[] => {
  if (
    message.labelIds?.some((label) =>
      ['SPAM', 'TRASH', 'DRAFT'].includes(label),
    )
  )
    return [];
  const addresses = new Set(
    ['to', 'cc', 'bcc', 'from', 'delivered-to', 'x-original-to']
      .flatMap((name) => parseAddresses(getHeader(message, name)))
      .map((entry) => entry.address),
  );
  const listId = getHeader(message, 'list-id')
    .match(/<([^>]+)>/)?.[1]
    ?.toLowerCase();
  return groups.filter(
    (group) =>
      group.enabled &&
      (addresses.has(group.email) || listId === group.email.replace('@', '.')),
  );
};

const textParts = (part: MessagePart, mimeType: string): string[] => [
  ...(part.mimeType === mimeType && !part.filename && part.body?.data
    ? [
        new TextDecoder(
          part.headers
            ?.find((header) => header.name.toLowerCase() === 'content-type')
            ?.value.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1] ?? 'utf-8',
        ).decode(Buffer.from(part.body.data, 'base64url')),
      ]
    : []),
  ...(part.parts ?? []).flatMap((child) => textParts(child, mimeType)),
];
export const extractText = (message: GoogleMessage): string => {
  const plainText = textParts(message.payload, 'text/plain').join('\n');
  return (
    plainText ||
    convert(textParts(message.payload, 'text/html').join('\n'), {
      wordwrap: false,
    })
  ).slice(0, 262144);
};
export const attachmentParts = (part: MessagePart): MessagePart[] => [
  ...(part.filename && part.body ? [part] : []),
  ...(part.parts ?? []).flatMap(attachmentParts),
];

export const buildBackfillQuery = (
  groups: GroupSettings[],
  historyDays: string,
  now: number,
): string => {
  const addresses = groups
    .filter((group) => group.enabled)
    .map((group) => group.email);
  if (!addresses.length)
    throw new Error('Enable at least one Group before syncing.');
  const terms = addresses.flatMap((email) => [
    `to:${email}`,
    `cc:${email}`,
    `bcc:${email}`,
    `from:${email}`,
    `list:${email}`,
  ]);
  return `{${terms.join(' ')}} -in:spam -in:trash -in:drafts${historyDays === 'all' ? '' : ` after:${Math.floor(now / 1000) - Number(historyDays) * 86400}`}`;
};
