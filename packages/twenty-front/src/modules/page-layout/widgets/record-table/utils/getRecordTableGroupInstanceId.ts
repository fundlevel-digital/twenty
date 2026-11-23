import { Buffer } from 'buffer';
import { base64UrlEncode } from 'twenty-shared/utils';

export const getRecordTableGroupInstanceId = (
  value: string | number | boolean | null,
) => base64UrlEncode(Buffer.from(JSON.stringify(value), 'utf-8'));
