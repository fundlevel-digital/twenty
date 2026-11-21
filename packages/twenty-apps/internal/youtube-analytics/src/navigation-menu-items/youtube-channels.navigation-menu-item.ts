import { defineNavigationMenuItem } from 'twenty-sdk/define';

import { YOUTUBE_CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: 'b1369d12-bb56-4401-b27e-bbffc2609e10',
  type: 'OBJECT',
  position: 10,
  targetObjectUniversalIdentifier: YOUTUBE_CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
});
