import { defineNavigationMenuItem } from 'twenty-sdk/define';

import { TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: 'b984bbdb-bd96-42ff-8d91-f6e060b63d80',
  type: 'OBJECT',
  position: 10,
  targetObjectUniversalIdentifier: TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
});
