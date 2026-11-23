import { z } from 'zod';
import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  googleRequestWithToken,
  googleProfileSchema,
} from 'src/logic-functions/utils/google';

export const identifyAccount = async (payload: unknown) => {
  const { accessToken } = z
    .object({ accessToken: z.string().min(1) })
    .parse(payload);
  const profile = await googleRequestWithToken(
    accessToken,
    '/profile',
    googleProfileSchema,
  );
  return {
    externalAccountId: profile.emailAddress.toLowerCase(),
    handle: profile.emailAddress.toLowerCase(),
  };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.IDENTIFY,
  name: 'google-groups-identify',
  handler: identifyAccount,
});
