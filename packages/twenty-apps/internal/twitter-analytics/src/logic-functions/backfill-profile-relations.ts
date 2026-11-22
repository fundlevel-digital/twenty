import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { PROFILE_RELATION_IDENTIFIERS } from 'src/constants/profile-relation-identifiers';
import { runProfileRelationJob } from 'src/logic-functions/utils/profile-relation-jobs.util';
import { createWorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

export default defineLogicFunction({
  universalIdentifier: PROFILE_RELATION_IDENTIFIERS.backfillFunction,
  name: 'backfill-profile-relations',
  description:
    'Previews or applies one page of Company or Person profile relations without external API calls.',
  timeoutSeconds: 900,
  httpRouteTriggerSettings: {
    path: '/twitter-analytics/backfill-relations',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
  handler: (
    payload: RoutePayload<{
      kind: string;
      mode: string;
      dryRun: boolean;
      after?: string;
    }>,
  ) => {
    const body = payload.body;
    if (
      !body ||
      (body.kind !== 'company' && body.kind !== 'person') ||
      (body.mode !== 'LINK_EXISTING' && body.mode !== 'CREATE_MISSING') ||
      typeof body.dryRun !== 'boolean' ||
      (body.after !== undefined && typeof body.after !== 'string')
    )
      throw new Error('Invalid profile backfill options');
    return runProfileRelationJob({
      kind: body.kind,
      mode: body.mode,
      dryRun: body.dryRun,
      after: body.after,
      client: createWorkspaceGraphqlClient(),
      metadata: createWorkspaceGraphqlClient('/metadata'),
    });
  },
});
