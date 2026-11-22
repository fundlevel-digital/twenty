import { getSyncSettings } from 'src/logic-functions/utils/sync-settings';
import { defineLogicFunction } from 'twenty-sdk/define';
import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';
import { z } from 'zod';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { sourceTypeSchema, syncModeSchema } from 'src/types/sync-settings';
import { listSourceFields } from 'src/logic-functions/utils/source-fields';
import {
  backfillSummary,
  loadBackfill,
  planBackfill,
  queueSyncJob,
  saveBackfill,
} from 'src/logic-functions/utils/backfill';

const inputSchema = z.object({
  action: z.enum([
    'fields',
    'latest',
    'plan',
    'start',
    'pause',
    'resume',
    'cancel',
    'status',
  ]),
  sourceType: sourceTypeSchema.optional(),
  mode: syncModeSchema.default('CREATE_MISSING'),
  limit: z.number().int().min(1).max(5000).nullable().default(500),
  planId: z.string().uuid().optional(),
});
export const manageGithubBackfill = async (payload: unknown) => {
  const route = z.object({ body: inputSchema }).safeParse(payload);
  const input = inputSchema.parse(route.success ? route.data.body : payload);
  const permission = await new RestApiClient({ runAs: 'user' })
    .post<{
      data?: {
        currentUser: { currentUserWorkspace: { permissionFlags: string[] } };
      };
      errors?: unknown[];
    }>('/metadata', {
      query: '{currentUser{currentUserWorkspace{permissionFlags}}}',
    })
    .catch((error) => {
      if (error instanceof RestApiClientError) {
        const detail = z
          .object({ errors: z.array(z.object({ message: z.string() })) })
          .safeParse(error.body);
        if (detail.success)
          throw new Error(
            detail.data.errors.map((item) => item.message).join('; '),
          );
      }
      throw error;
    });
  if (
    !permission.data?.currentUser.currentUserWorkspace.permissionFlags.includes(
      'APPLICATIONS',
    )
  )
    throw new Error(
      'Application settings permission is required to manage backfills.',
    );
  if (input.action === 'fields')
    return {
      person: await listSourceFields('person'),
      company: await listSourceFields('company'),
      oauthCallbackUrl: new URL(
        '/auth/apps/callback',
        process.env.TWENTY_API_URL,
      ).toString(),
    };
  if (input.action === 'latest') {
    const { kv } = await import('twenty-sdk/logic-function');
    const id = await kv.get<string>(
      `backfill-latest:${input.sourceType ?? 'person'}`,
    );
    const plan = id ? await loadBackfill(id) : null;
    return plan ? backfillSummary(plan) : null;
  }
  if (input.action === 'plan') {
    if (!input.sourceType) throw new Error('Choose People or Companies.');
    return planBackfill(input.sourceType, input.mode, input.limit);
  }
  if (!input.planId) throw new Error('Preview a backfill first.');
  const plan = await loadBackfill(input.planId);
  if (!plan) throw new Error('Backfill plan was not found.');
  if (input.action === 'status') return backfillSummary(plan);
  if (input.action === 'pause') {
    if (plan.status === 'RUNNING') plan.status = 'PAUSED';
    await saveBackfill(plan);
    return backfillSummary(plan);
  }
  if (input.action === 'cancel') {
    plan.status = 'CANCELLED';
    await saveBackfill(plan);
    return backfillSummary(plan);
  }
  if (
    plan.signature !==
    JSON.stringify((await getSyncSettings())[plan.sourceType])
  )
    throw new Error(
      'Sync settings changed. Preview a new backfill before running it.',
    );
  if (!['PLANNED', 'PAUSED', 'FAILED'].includes(plan.status))
    throw new Error('This backfill cannot be started again.');
  plan.status = 'RUNNING';
  delete plan.error;
  await saveBackfill(plan);
  try {
    await queueSyncJob({ backfillId: plan.id });
  } catch (error) {
    plan.status = 'FAILED';
    await saveBackfill(plan);
    throw error;
  }
  return backfillSummary(plan);
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.BACKFILL,
  name: 'manage-github-backfill',
  description:
    'Previews and controls GitHub profile backfills without running one automatically.',
  timeoutSeconds: 60,
  handler: manageGithubBackfill,
  httpRouteTriggerSettings: {
    path: '/github-profiles/backfill',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
