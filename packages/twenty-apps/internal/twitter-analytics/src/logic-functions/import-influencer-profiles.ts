import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { IMPORT_PROFILES_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { importInfluencerProfiles } from 'src/logic-functions/utils/import-influencer-profiles.util';
import { createWorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

export default defineLogicFunction({
  universalIdentifier: IMPORT_PROFILES_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'import-influencer-profiles',
  description:
    'Creates related Twitter Profiles from selected Influencers without calling TwitterAPI.io.',
  timeoutSeconds: 300,
  handler: (payload: RoutePayload<{ influencerIds?: string[] }>) => {
    const ids = payload.body?.influencerIds;
    if (
      !Array.isArray(ids) ||
      !ids.every((id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))
    )
      throw new Error('Select Influencers to import');
    return importInfluencerProfiles(createWorkspaceGraphqlClient(), [
      ...new Set(ids),
    ]);
  },
  httpRouteTriggerSettings: {
    path: '/twitter-analytics/import-influencers',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
