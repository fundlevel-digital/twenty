import { enqueueJobs } from 'twenty-sdk/logic-function';
export const enqueue = async (
  logicFunctionUniversalIdentifier: string,
  payload: Record<string, unknown>,
) => {
  const result = await enqueueJobs({
    logicFunctionUniversalIdentifier,
    payloads: [payload],
    retryLimit: 5,
  });
  if (!result.enqueued)
    throw new Error('Cal.com sync could not be queued. Retry shortly.');
};
