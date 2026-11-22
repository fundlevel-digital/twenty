import { z } from 'zod';
import { IDENTIFIERS } from '../../constants/identifiers';
import { getNanoClient, getNanoClients } from './credentials';
import { creatorIdentity, saveCreator } from './creators';
import { enqueue } from './jobs';
import { channelSchema, NanoClient, NanoHttpError } from './nano-client';
import { Workspace, WorkspaceRateLimitError } from './workspace';

export const historyInputSchema = z.object({
  connectionId: z.string().min(1),
  page: z.number().int().min(1).max(10000).default(1),
  offset: z.number().int().nonnegative().default(0),
});
export const historyResultsInputSchema = z.object({
  searchId: z.uuid(),
  page: z.number().int().min(1).max(10000).default(1),
  offset: z.number().int().nonnegative().default(0),
});
const historyLogSchema = z.object({
  taskId: z.string().min(1),
  type: z.string(),
  platform: z.string(),
  cid: z.union([z.string(), z.number()]).transform(String).optional(),
  title: z.string().optional(),
  created: z.number().optional(),
  updated: z.number().optional(),
  status: z.string(),
  kwSearch: z.boolean().optional(),
  useremail: z.string().optional(),
});
const timestamp = (value: number | undefined) =>
  value ? new Date(value < 1e12 ? value * 1000 : value).toISOString() : null;
const mapHistoryStatus = (status: string) =>
  status === 'SUCC'
    ? 'FINISHED'
    : ['FAIL', 'FAILED', 'CANCELED', 'CANCELLED'].includes(status)
      ? 'FAILED'
      : 'RUNNING';

export const startHistorySync = async (
  connectionId?: string,
  clientsOverride?: NanoClient[],
) => {
  const clients =
    clientsOverride ??
    (connectionId
      ? [await getNanoClient(connectionId)]
      : await getNanoClients());
  const failed: { connectionId: string; message: string }[] = [];
  let queued = 0;
  let totalCount = 0;
  for (const client of clients) {
    try {
      const page = await client.history(1);
      await enqueue(IDENTIFIERS.importHistory, {
        connectionId: client.connectionId,
        page: 1,
        offset: 0,
      });
      totalCount += page.totalCount;
      queued++;
    } catch (error) {
      failed.push({
        connectionId: client.connectionId,
        message:
          error instanceof Error
            ? error.message
            : 'Nano history could not be read.',
      });
    }
  }
  if (!queued)
    throw new Error(
      failed[0]?.message ?? 'No Nano history connections are available.',
    );
  return { queued, totalCount, failed };
};

const defer = async (
  error: unknown,
  functionId: string,
  payload: Record<string, unknown>,
) => {
  if (
    !(error instanceof WorkspaceRateLimitError) &&
    !(error instanceof NanoHttpError && error.status === 429)
  )
    return false;
  await enqueue(
    functionId,
    payload,
    (error instanceof WorkspaceRateLimitError ? error.retryAfterMs : 60_000) +
      2_000,
  );
  return true;
};

export const importHistory = async (
  input: z.infer<typeof historyInputSchema>,
  workspace = new Workspace(),
  clientOverride?: NanoClient,
) => {
  let offset = input.offset;
  try {
    const client = clientOverride ?? (await getNanoClient(input.connectionId));
    const page = await client.history(input.page);
    for (const raw of page.logs.slice(offset, offset + 5)) {
      const log = historyLogSchema.parse(raw);
      const existing = await workspace.find(
        'Search',
        {
          and: [
            { jobId: { eq: log.taskId } },
            { connectionId: { eq: input.connectionId } },
          ],
        },
        'id historyImportStatus origin',
        1,
      );
      const data = {
        name: log.title || `Nano Search ${log.taskId}`,
        jobId: log.taskId,
        connectionId: input.connectionId,
        origin: existing[0]?.origin === 'TWENTY' ? 'TWENTY' : 'NANO',
        status: mapHistoryStatus(log.status),
        startedAt: timestamp(log.created),
        finishedAt: log.status === 'SUCC' ? timestamp(log.updated) : null,
        searchedBy: {
          primaryEmail: z.email().safeParse(log.useremail).success
            ? log.useremail
            : '',
          additionalEmails: [],
        },
        rawNanoSearch: raw,
      };
      const seed =
        !log.kwSearch && log.cid
          ? channelSchema.safeParse({
              id: log.cid,
              platform: log.platform,
              name: log.title,
            })
          : undefined;
      let seedId: string | undefined;
      if (seed?.success) {
        const creators = await workspace.find(
          'Creator',
          { externalKey: { eq: creatorIdentity(seed.data) } },
          'id',
          1,
        );
        seedId =
          creators[0]?.id ?? (await saveCreator(workspace, seed.data)).id;
      }
      const fields = { ...data, ...(seedId ? { seedId } : {}) };
      const search = existing[0]
        ? await workspace.update(
            'Search',
            existing[0].id,
            fields,
            'id historyImportStatus',
          )
        : await workspace.upsert(
            'Search',
            `${input.connectionId}:${log.taskId}`,
            fields,
            'id historyImportStatus',
          );
      if (
        log.type === 'search' &&
        log.status === 'SUCC' &&
        !['QUEUED', 'IMPORTING', 'IMPORTED'].includes(
          String(search.historyImportStatus),
        )
      ) {
        await enqueue(IDENTIFIERS.importHistoryResults, {
          searchId: search.id,
          offset: 0,
        });
        await workspace.update('Search', search.id, {
          historyImportStatus: 'QUEUED',
        });
      } else if (log.type !== 'search') {
        await workspace.update('Search', search.id, {
          historyImportStatus: 'UNAVAILABLE',
          error:
            'Search metadata was imported. This Nano task type does not use the supported saved-results reader.',
        });
      }
      offset++;
    }
    const hasMoreRows = offset < page.logs.length;
    const hasMorePages = input.page * 30 < page.totalCount;
    if (hasMoreRows || hasMorePages) {
      if (!hasMoreRows && input.page === 10000)
        throw new Error('Nano history exceeded the page limit.');
      await enqueue(IDENTIFIERS.importHistory, {
        ...input,
        page: hasMoreRows ? input.page : input.page + 1,
        offset: hasMoreRows ? offset : 0,
      });
    }
    return {
      status: hasMoreRows || hasMorePages ? 'IMPORTING' : 'IMPORTED',
      totalCount: page.totalCount,
    };
  } catch (error) {
    if (await defer(error, IDENTIFIERS.importHistory, { ...input, offset }))
      return { status: 'DEFERRED' };
    throw error;
  }
};

export const importHistoryResults = async (
  input: z.infer<typeof historyResultsInputSchema>,
  workspace = new Workspace(),
  clientOverride?: NanoClient,
) => {
  let offset = input.offset;
  let rawResults: Record<string, unknown> | undefined;
  try {
    const search = await workspace.get(
      'Search',
      input.searchId,
      'jobId connectionId rawNanoSearch rawNanoSearchResults resultIds importedCount',
    );
    const client =
      clientOverride ??
      (await getNanoClient(z.string().parse(search.connectionId)));
    const rawSearch = z
      .record(z.string(), z.unknown())
      .parse(search.rawNanoSearch);
    const isKeyword = rawSearch.kwSearch === true;
    const envelope = z
      .record(z.string(), z.unknown())
      .parse(
        await client.request(
          isKeyword
            ? `/api/kw/task/${encodeURIComponent(z.string().min(1).parse(rawSearch.rootJobId))}`
            : `/api/task/${encodeURIComponent(z.string().parse(search.jobId))}`,
          isKeyword ? { page: input.page, pageSize: 20 } : { channelIds: [] },
        ),
      );
    const savedPages = z
      .record(z.string(), z.unknown())
      .catch({})
      .parse(search.rawNanoSearchResults);
    rawResults = isKeyword
      ? { ...savedPages, [String(input.page)]: envelope }
      : envelope;
    const keywordResults = isKeyword
      ? z
          .object({
            channels: z.array(z.record(z.string(), z.unknown())),
            totalPages: z.number().int().nonnegative().default(1),
            platform: z.string().optional(),
          })
          .parse(envelope)
      : undefined;
    const result = !isKeyword
      ? z
          .object({
            data: z.object({
              status: z.string(),
              data: z
                .object({
                  channels: z
                    .array(z.record(z.string(), z.unknown()))
                    .optional(),
                })
                .nullable()
                .optional(),
            }),
          })
          .parse(envelope).data
      : undefined;
    if (result && result.status.toLowerCase() !== 'finished')
      throw new Error(
        'Nano no longer provides finished results for this saved search.',
      );
    const channels = keywordResults?.channels ?? result?.data?.channels;
    if (!channels)
      throw new Error(
        'Nano did not return a saved results collection for this search.',
      );
    const creatorIds = z.array(z.string()).catch([]).parse(search.resultIds);
    for (const raw of channels.slice(offset, offset + 10)) {
      const channel = channelSchema.parse({
        ...raw,
        id: raw.id ?? raw.uid ?? raw.cid,
        subsCount: raw.subsCount ?? raw.subs,
        country: raw.country ?? raw.countryName ?? raw.countryCode,
        email:
          typeof raw.email === 'string'
            ? [raw.email]
            : (raw.email ?? undefined),
        platform:
          raw.platform ?? keywordResults?.platform ?? rawSearch.platform,
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
      await workspace.update('Search', search.id, {
        historyImportStatus: 'IMPORTING',
        importedCount: (isKeyword ? (input.page - 1) * 20 : 0) + offset + 1,
        resultIds: creatorIds,
        error: '',
      });
      offset++;
    }
    const hasMoreRows = offset < channels.length;
    const hasMorePages = keywordResults
      ? input.page < keywordResults.totalPages
      : false;
    const hasMore = hasMoreRows || hasMorePages;
    const importedCount = (isKeyword ? (input.page - 1) * 20 : 0) + offset;
    await workspace.update('Search', search.id, {
      rawNanoSearchResults: rawResults,
      historyImportStatus: hasMore ? 'IMPORTING' : 'IMPORTED',
      importedCount,
      resultIds: creatorIds,
      error: '',
    });
    if (hasMore)
      await enqueue(IDENTIFIERS.importHistoryResults, {
        searchId: search.id,
        page: hasMoreRows ? input.page : input.page + 1,
        offset: hasMoreRows ? offset : 0,
      });
    return {
      status: hasMore ? 'IMPORTING' : 'IMPORTED',
      importedCount,
    };
  } catch (error) {
    if (
      await defer(error, IDENTIFIERS.importHistoryResults, { ...input, offset })
    )
      return { status: 'DEFERRED' };
    await workspace.update('Search', input.searchId, {
      historyImportStatus: 'UNAVAILABLE',
      ...(rawResults ? { rawNanoSearchResults: rawResults } : {}),
      error:
        error instanceof Error
          ? error.message
          : 'Saved Nano results could not be read.',
    });
    return { status: 'UNAVAILABLE' };
  }
};
