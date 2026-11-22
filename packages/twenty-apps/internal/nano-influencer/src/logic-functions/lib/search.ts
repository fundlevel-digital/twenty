import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { IDENTIFIERS } from '../../constants/identifiers';
import { creatorIdentity, saveCreator, toChannel } from './creators';
import { enqueue } from './jobs';
import { channelSchema, NanoClient } from './nano-client';
import { getNanoClient } from './credentials';
import { Workspace } from './workspace';

const rangeSchema = z
  .array(z.number().nonnegative())
  .min(1)
  .max(2)
  .refine(
    (range) => range.length === 1 || range[0] <= range[1],
    'Minimum must be at most maximum',
  );
export const searchInputSchema = z.object({
  creatorId: z.uuid(),
  connectionId: z.string().min(1).optional(),
  listId: z.uuid().optional(),
  requestId: z
    .uuid()
    .optional()
    .describe(
      'Reuse this ID when retrying a workflow to avoid submitting a second paid search.',
    ),
  filters: z
    .object({
      subs: rangeSchema.optional(),
      views: rangeSchema.optional(),
      posts: rangeSchema.optional(),
      lastPostDays: z.number().int().positive().optional(),
      email: z.boolean().optional(),
      country: z.array(z.string()).optional(),
    })
    .optional(),
});
export const pollInputSchema = z.object({
  searchId: z.uuid(),
  attempt: z.number().int().min(0).max(60).default(0),
});

export const startSearch = async (
  input: z.infer<typeof searchInputSchema>,
  workspace = new Workspace(),
  nanoOverride?: NanoClient,
) => {
  const requestId = input.requestId ?? randomUUID();
  const existing = await workspace.find(
    'Search',
    { externalKey: { eq: requestId } },
    'id jobId status',
  );
  if (existing.length)
    return {
      searchId: existing[0].id,
      jobId: existing[0].jobId,
      status: existing[0].status,
    };
  const seed = await workspace.get(
    'Creator',
    input.creatorId,
    'nanoId platform name emails',
  );
  const list = input.listId
    ? await workspace.get(
        'List',
        input.listId,
        'externalKey projectId connectionId',
      )
    : undefined;
  const connectionId = list?.connectionId || input.connectionId;
  const nano =
    nanoOverride ??
    (await getNanoClient(
      typeof connectionId === 'string' ? connectionId : undefined,
    ));
  if (list && !list.connectionId && nano.connectionId !== 'legacy')
    throw new Error(
      'Sync and bind this list to its Nano connection before searching within it.',
    );
  if (
    list?.connectionId &&
    input.connectionId &&
    list.connectionId !== input.connectionId
  )
    throw new Error('The search connection must match the selected list.');
  const projectId = list
    ? z
        .string()
        .regex(/^\d+$/)
        .parse(list.projectId || String(list.externalKey).split(':').pop())
    : undefined;
  let search;
  try {
    search = await workspace.create('Search', {
      externalKey: requestId,
      origin: 'TWENTY',
      name: `Lookalikes of ${seed.name}`,
      seedId: seed.id,
      connectionId: nano.connectionId,
      status: 'SUBMITTING',
      error: '',
    });
  } catch (error) {
    const winner = await workspace.find(
      'Search',
      { externalKey: { eq: requestId } },
      'id jobId status',
    );
    if (!winner.length) throw error;
    return {
      searchId: winner[0].id,
      jobId: winner[0].jobId,
      status: winner[0].status,
    };
  }
  let jobId: string;
  try {
    jobId = await nano.submit(toChannel(seed), input.filters ?? {}, projectId);
  } catch (error) {
    await workspace.update('Search', search.id, {
      status: 'SUBMISSION_UNKNOWN',
      error:
        'Submission was not confirmed. Check Nano before starting a new search; this request will not be resubmitted automatically.',
    });
    throw error;
  }
  await workspace.update('Search', search.id, { jobId, status: 'RUNNING' });
  try {
    await enqueue(IDENTIFIERS.poll, { searchId: search.id, attempt: 0 }, 10000);
  } catch {
    await workspace.update('Search', search.id, {
      error:
        'Search started in Nano. Use Resume Nano Search to collect results.',
    });
  }
  return { searchId: search.id, jobId, status: 'RUNNING' };
};

export const pollSearch = async (
  input: z.infer<typeof pollInputSchema>,
  workspace = new Workspace(),
  nanoOverride?: NanoClient,
) => {
  const search = await workspace.get(
    'Search',
    input.searchId,
    'jobId status seedId resultIds error importedCount connectionId',
  );
  if (search.status === 'FINISHED')
    return {
      searchId: search.id,
      status: 'FINISHED',
      creatorIds: search.resultIds,
    };
  const nano =
    nanoOverride ??
    (await getNanoClient(
      typeof search.connectionId === 'string' ? search.connectionId : undefined,
    ));
  if (!search.connectionId && nano.connectionId !== 'legacy')
    throw new Error(
      'This legacy search has no account binding. Restore its legacy credential before resuming; a different account will not be used.',
    );
  const jobId = z.string().min(1).parse(search.jobId);
  const seed = await workspace.get(
    'Creator',
    z.uuid().parse(search.seedId),
    'platform',
  );
  try {
    const result = await nano.poll(jobId);
    if (['failed', 'error', 'cancelled', 'canceled'].includes(result.status)) {
      await workspace.update('Search', search.id, {
        status: 'FAILED',
        error: 'NanoInfluencer reported a failed search.',
      });
      return { searchId: search.id, status: 'FAILED' };
    }
    if (result.status !== 'finished') {
      const status = input.attempt >= 60 ? 'WAITING' : 'RUNNING';
      await workspace.update('Search', search.id, {
        status,
        error:
          status === 'WAITING'
            ? 'Still running in Nano. Use Resume Nano Search to check again.'
            : '',
      });
      if (status === 'RUNNING')
        await enqueue(
          IDENTIFIERS.poll,
          { searchId: search.id, attempt: input.attempt + 1 },
          10000,
        );
      return { searchId: search.id, status };
    }
    const creatorIds = z.array(z.string()).parse(search.resultIds ?? []);
    const channels = result.data?.channels ?? [];
    const offset = z
      .number()
      .int()
      .nonnegative()
      .parse(search.importedCount ?? 0);
    for (const raw of channels.slice(offset, offset + 20)) {
      const channel = channelSchema.parse({
        ...raw,
        platform: raw.platform ?? seed.platform,
      });
      const creator = await saveCreator(workspace, channel);
      if (!creatorIds.includes(creator.id)) creatorIds.push(creator.id);
      await workspace.upsert(
        'Discovery',
        `${search.id}:${creatorIdentity(channel)}`,
        {
          name: channel.name ?? channel.id,
          nanoSearchId: search.id,
          creatorId: creator.id,
          rawNanoResult: raw,
        },
      );
    }
    if (offset + 20 < channels.length) {
      await workspace.update('Search', search.id, {
        status: 'IMPORTING',
        importedCount: offset + 20,
        resultIds: creatorIds,
        error: '',
      });
      await enqueue(IDENTIFIERS.poll, { searchId: search.id, attempt: 0 });
      return { searchId: search.id, status: 'IMPORTING', creatorIds };
    }
    await workspace.update('Search', search.id, {
      status: 'FINISHED',
      resultIds: creatorIds,
      nextToken: result.data?.nextToken ?? '',
      nextIds: result.data?.nextIds ?? [],
      error: '',
      finishedAt: new Date().toISOString(),
    });
    return { searchId: search.id, status: 'FINISHED', creatorIds };
  } catch (error) {
    await workspace.update('Search', search.id, {
      status: 'WAITING',
      error:
        error instanceof Error
          ? error.message
          : 'Could not collect search results. Resume this search to retry.',
    });
    throw error;
  }
};
