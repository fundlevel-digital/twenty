import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  refreshInputSchema,
  synchronizeGithubProfile,
} from 'src/logic-functions/utils/synchronize-github-profile';
import { createWorkspaceClient } from 'src/logic-functions/utils/workspace-client';

const INPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    username: {
      type: 'string' as const,
      description:
        'GitHub username or profile URL. Required when no GitHub Profile ID is supplied.',
    },
    githubProfileId: {
      type: 'string' as const,
      description: 'Existing GitHub Profile record ID to refresh.',
    },
    influencerId: {
      type: 'string' as const,
      description:
        'Optional influencer record ID. Omitting this preserves an existing relation.',
    },
  },
  additionalProperties: false,
};

export const refreshGithubProfile = async (parameters: unknown) => {
  const route = z.object({ body: z.unknown() }).safeParse(parameters);
  const input = refreshInputSchema.parse(
    route.success ? route.data.body : parameters,
  );
  return synchronizeGithubProfile(input, { client: createWorkspaceClient() });
};

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.REFRESH,
  name: 'fetch-github-profile',
  description:
    'Fetches both GitHub API responses and saves profile fields, social URLs, raw JSON and avatar on a GitHub Profile.',
  timeoutSeconds: 60,
  handler: refreshGithubProfile,
  httpRouteTriggerSettings: {
    path: '/github-profiles/fetch',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
  toolTriggerSettings: { inputSchema: INPUT_SCHEMA },
  workflowActionTriggerSettings: {
    label: 'Fetch GitHub Profile',
    inputSchema: jsonSchemaToInputSchema(INPUT_SCHEMA),
    outputSchema: [
      {
        type: 'object',
        properties: {
          githubProfileId: { type: 'string' },
          login: { type: 'string' },
          profile: {
            type: 'object',
            properties: {
              login: { type: 'string' },
              id: { type: 'number' },
              node_id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              hireable: { type: 'boolean' },
              bio: { type: 'string' },
              location: { type: 'string' },
              company: { type: 'string' },
              blog: { type: 'string' },
              twitter_username: { type: 'string' },
              site_admin: { type: 'boolean' },
              type: { type: 'string' },
              public_repos: { type: 'number' },
              public_gists: { type: 'number' },
              followers: { type: 'number' },
              following: { type: 'number' },
              created_at: { type: 'string' },
              updated_at: { type: 'string' },
              avatar_url: { type: 'string' },
              gravatar_id: { type: 'string' },
              html_url: { type: 'string' },
              url: { type: 'string' },
            },
          },
          socialAccounts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                provider: { type: 'string' },
                url: { type: 'string' },
              },
            },
          },
        },
      },
    ],
  },
});
