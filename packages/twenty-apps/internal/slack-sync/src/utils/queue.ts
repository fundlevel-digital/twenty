import { createHash } from 'node:crypto';
import { enqueueJobs } from 'twenty-sdk/logic-function';

export const enqueue = async (
  universalIdentifier: string,
  payload: Record<string, unknown>,
  jobId?: string,
  delayMs?: number,
) => {
  const result = await enqueueJobs({
    logicFunctionUniversalIdentifier: universalIdentifier,
    jobs: [
      {
        payload,
        ...(jobId
          ? {
              jobId: `slack-${createHash('sha256').update(jobId).digest('hex')}`,
            }
          : {}),
      },
    ],
    retryLimit: 5,
    ...(delayMs ? { delayMs } : {}),
  });
  if (!result.enqueued) throw new Error('Slack job was not queued');
};
