import { describe, expect, it, vi } from 'vitest';
import { enqueue } from 'src/utils/queue';
const mocks = vi.hoisted(() => ({
  enqueueJobs: vi.fn().mockResolvedValue({ enqueued: true }),
}));
vi.mock('twenty-sdk/logic-function', () => mocks);
describe('Slack job identities', () => {
  it('hashes external identities to the backend job-id alphabet', async () => {
    await enqueue('function', {}, 'slack-event:T1:Ev1:connection');
    const jobId =
      mocks.enqueueJobs.mock.calls[mocks.enqueueJobs.mock.calls.length - 1][0]
        .jobs[0].jobId;
    expect(jobId).toMatch(/^[\w.-]+$/);
    expect(jobId).toHaveLength(70);
  });
  it('deduplicates repeated deliveries with the same stable identity', async () => {
    await enqueue('function', {}, 'slack-event:T1:Ev1:connection');
    await enqueue('function', {}, 'slack-event:T1:Ev1:connection');
    const calls = mocks.enqueueJobs.mock.calls.slice(-2);
    expect(calls[0][0].jobs[0].jobId).toBe(calls[1][0].jobs[0].jobId);
  });
});
