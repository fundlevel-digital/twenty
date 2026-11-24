import { RestApiClientError } from 'twenty-client-sdk/rest';
import { isObject } from '@sniptt/guards';
import { z } from 'zod';
import { SyncHttpError, SyncYieldError } from './sync-context';

export const describeSyncFailure = (error: unknown, attempts: number) => {
  const status =
    error instanceof RestApiClientError || error instanceof SyncHttpError
      ? error.status
      : error instanceof Error
        ? Number(error.message.match(/(?:status|HTTP)[ :]*(\d{3})\b/i)?.[1]) ||
          undefined
        : undefined;
  const fields = new Set<string>(
    error instanceof SyncHttpError ? error.rejectedFields : [],
  );
  const codes = new Set<string>();
  const constraints = new Set<string>();
  const inspect = (value: unknown, depth = 0) => {
    if (depth > 8) return;
    if (typeof value === 'string') {
      for (const match of value.matchAll(
        /\b(?:field|property|column)\s+["']?([a-zA-Z_][a-zA-Z0-9_]{0,79})/g,
      ))
        fields.add(match[1]);
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 50).forEach((item) => inspect(item, depth + 1));
    } else if (isObject(value)) {
      for (const [key, item] of Object.entries(value)) {
        if (key === 'constraints' && isObject(item)) {
          for (const name of Object.keys(item))
            if (/^is[A-Z][a-zA-Z0-9]{0,79}$/.test(name)) constraints.add(name);
        }
        if (
          ['property', 'field'].includes(key) &&
          typeof item === 'string' &&
          /^[a-zA-Z][a-zA-Z0-9_.]{0,79}$/.test(item)
        )
          fields.add(item);
        if (
          key === 'code' &&
          typeof item === 'string' &&
          /^[A-Z_0-9]{1,80}$/.test(item)
        )
          codes.add(item);
        if (
          [
            'errors',
            'error',
            'details',
            'extensions',
            'children',
            'messages',
            'message',
            'validationErrors',
          ].includes(key)
        )
          inspect(item, depth + 1);
      }
    }
  };
  if (error instanceof RestApiClientError) inspect(error.body);
  if (error instanceof z.ZodError)
    error.issues.forEach((issue) => {
      fields.add(
        issue.path.filter((part) => typeof part === 'string').join('.'),
      );
      codes.add(issue.code);
    });
  const reasons: Record<string, string> = {
    'PlusVibe pagination did not advance': 'SOURCE_CURSOR_DID_NOT_ADVANCE',
    'PlusVibe campaign email pagination did not advance':
      'SOURCE_CURSOR_DID_NOT_ADVANCE',
    'PlusVibe rejected the request': 'PROVIDER_REJECTED_REQUEST',
    'Saved sync input is missing': 'SAVED_INPUT_MISSING',
    'Workspace connection changed': 'CONNECTION_CHANGED',
    'The workspace connection changed': 'CONNECTION_CHANGED',
    'Source identity did not match the imported record':
      'RECEIPT_IDENTITY_MISMATCH',
  };
  const reason = error instanceof Error ? reasons[error.message] : undefined;
  if (reason) codes.add(reason);
  const yielded = error instanceof SyncYieldError;
  const transient =
    yielded ||
    (error instanceof Error &&
      error.message ===
        'PlusVibe thread metadata changed concurrently; retry the delivery') ||
    status === 429 ||
    (status !== undefined && status >= 500) ||
    (error instanceof Error &&
      ['AbortError', 'TimeoutError'].includes(error.name)) ||
    (error instanceof TypeError &&
      /fetch failed|network|socket/i.test(error.message));
  const delay = yielded
    ? 2000
    : Math.min(900_000, 30_000 * 2 ** Math.min(attempts, 5));
  return {
    retryable: transient,
    delayMilliseconds: Math.max(
      delay,
      error instanceof SyncHttpError ? error.retryAfterMilliseconds : 0,
    ),
    diagnostic: {
      type: error instanceof Error ? error.name : 'UnknownError',
      status,
      fields: [...fields].filter(Boolean),
      codes: [...codes],
      constraints: [...constraints],
      retryable: transient,
    },
  };
};
