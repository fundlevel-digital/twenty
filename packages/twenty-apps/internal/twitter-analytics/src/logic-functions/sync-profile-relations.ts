import { defineLogicFunction } from 'twenty-sdk/define';
import { PROFILE_RELATION_IDENTIFIERS } from 'src/constants/profile-relation-identifiers';
import { runProfileRelationJob } from 'src/logic-functions/utils/profile-relation-jobs.util';
import { createWorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

export default defineLogicFunction({
  universalIdentifier: PROFILE_RELATION_IDENTIFIERS.syncFunction,
  name: 'sync-profile-relations',
  description:
    'Relates Company and Person X links using the saved creation preferences.',
  timeoutSeconds: 300,
  workflowActionTriggerSettings: {
    label: 'Relate Twitter Profiles',
    icon: 'IconBrandTwitter',
  },
  handler: (payload: { kind: string; recordId: string }) => {
    if (
      (payload.kind !== 'company' && payload.kind !== 'person') ||
      !/^[0-9a-f-]{36}$/i.test(payload.recordId)
    )
      throw new Error('Invalid profile relation record');
    return runProfileRelationJob({
      kind: payload.kind,
      recordId: payload.recordId,
      client: createWorkspaceGraphqlClient(),
      metadata: createWorkspaceGraphqlClient('/metadata'),
    });
  },
});
