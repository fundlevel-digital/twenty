import { defineLogicFunction } from 'twenty-sdk/define';
import { z } from 'zod';

import { IDENTIFY_ACCOUNT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  fingerprintApiKey,
  plusvibeRequest,
  WORKSPACES_SCHEMA,
} from 'src/logic-functions/utils/plusvibe-api';

export const identifyAccountHandler = async (payload: unknown) => {
  const { accessToken } = z
    .object({ accessToken: z.string().trim().min(1) })
    .parse(payload);
  const fingerprint = fingerprintApiKey(accessToken);
  await plusvibeRequest('/authenticate', WORKSPACES_SCHEMA, {
    apiKey: accessToken,
  });
  return { externalAccountId: fingerprint, handle: 'PlusVibe' };
};

export default defineLogicFunction({
  universalIdentifier: IDENTIFY_ACCOUNT_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-identify-account',
  timeoutSeconds: 30,
  handler: identifyAccountHandler,
});
