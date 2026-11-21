import { kv } from 'twenty-sdk/logic-function';

export const isLinkedinConnectionPrivacyReady = async (): Promise<boolean> =>
  (await kv.get<boolean>('linkedin-private-records-ready')) === true;
