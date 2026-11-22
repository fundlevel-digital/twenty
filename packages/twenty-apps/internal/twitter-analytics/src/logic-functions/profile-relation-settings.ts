import { defineLogicFunction } from 'twenty-sdk/define';
import { PROFILE_RELATION_IDENTIFIERS } from 'src/constants/profile-relation-identifiers';
import {
  getProfileRelationSettings,
  getRelationSourceFields,
} from 'src/logic-functions/utils/profile-relations.util';
import { createWorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

export default defineLogicFunction({
  universalIdentifier: PROFILE_RELATION_IDENTIFIERS.settingsFunction,
  name: 'profile-relation-settings',
  timeoutSeconds: 30,
  httpRouteTriggerSettings: {
    path: '/twitter-analytics/relation-settings',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
  handler: async () => {
    const metadata = createWorkspaceGraphqlClient('/metadata');
    const [companyFields, personFields] = await Promise.all([
      getRelationSourceFields(metadata, 'company'),
      getRelationSourceFields(metadata, 'person'),
    ]);
    return {
      company: {
        ...getProfileRelationSettings('company'),
        fields: companyFields,
      },
      person: { ...getProfileRelationSettings('person'), fields: personFields },
    };
  },
});
