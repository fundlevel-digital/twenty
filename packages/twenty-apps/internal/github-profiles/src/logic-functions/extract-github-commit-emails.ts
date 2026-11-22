import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { IDENTIFIERS } from 'src/constants/identifiers';
import {
  commitEmailInputSchema,
  extractCommitEmails,
} from 'src/logic-functions/utils/extract-commit-emails';
import { createWorkspaceClient } from 'src/logic-functions/utils/workspace-client';

const INPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    githubProfileId: {
      type: 'string' as const,
      description: 'Existing GitHub Profile record ID.',
    },
    username: {
      type: 'string' as const,
      description:
        'Optional username or profile URL of a profile already saved in the CRM.',
    },
    maxPages: {
      type: 'number' as const,
      description:
        '1–10 pages of 100 public commit results. Defaults to 10; GitHub caps each search at 1,000 results.',
    },
  },
  additionalProperties: false,
};
export const extractGithubCommitEmails = async (parameters: unknown) => {
  const route = z
    .object({ body: commitEmailInputSchema })
    .safeParse(parameters);
  const input = commitEmailInputSchema.parse(
    route.success ? route.data.body : parameters,
  );
  return extractCommitEmails(input, { client: createWorkspaceClient() });
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.EXTRACT_COMMIT_EMAILS,
  name: 'extract-github-commit-emails',
  description:
    'Finds public commit author emails missing from profile data and stores them separately with source commits and search completeness.',
  timeoutSeconds: 120,
  handler: extractGithubCommitEmails,
  httpRouteTriggerSettings: {
    path: '/github-profiles/commit-emails',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
  toolTriggerSettings: { inputSchema: INPUT_SCHEMA },
  workflowActionTriggerSettings: {
    label: 'Extract GitHub Commit Emails',
    inputSchema: jsonSchemaToInputSchema(INPUT_SCHEMA),
    outputSchema: [
      {
        type: 'object',
        properties: {
          githubProfileId: { type: 'string' },
          login: { type: 'string' },
          status: { type: 'string' },
          emails: { type: 'array', items: { type: 'string' } },
          newEmails: { type: 'array', items: { type: 'string' } },
          scannedCommits: { type: 'number' },
          totalCommits: { type: 'number' },
          skippedUnattributed: { type: 'number' },
          skippedInvalidEmails: { type: 'number' },
          note: { type: 'string' },
        },
      },
    ],
  },
});
