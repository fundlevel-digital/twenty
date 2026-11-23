import { enqueueJobs } from 'twenty-sdk/logic-function';

export const enqueue = async (
  logicFunctionUniversalIdentifier: string,
  payload: Record<string, unknown>,
  delayMs = 0,
) => {
  const result = await enqueueJobs({
    logicFunctionUniversalIdentifier,
    jobs: [{ payload }],
    retryLimit: 3,
    delayMs,
  });
  if (!result.enqueued)
    throw new Error(
      'NanoInfluencer job could not be queued. Retry the sync or resume the search.',
    );
};
