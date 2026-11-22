import { z } from 'zod';
import { type SearchInput } from '../../utils/search-input';

export const platformSchema = z.enum(['ytb', 'twt', 'ins', 'tik']);
export const channelSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  platform: platformSchema,
  name: z.string().optional(),
  icon: z.string().nullish().optional(),
  username: z.string().optional(),
  desc: z.string().optional(),
  country: z
    .string()
    .nullable()
    .transform((value) => value ?? undefined)
    .optional(),
  subsCount: z.union([z.number(), z.string()]).optional(),
  email: z
    .array(
      z.union([
        z.string(),
        z.object({ value: z.string() }).transform(({ value }) => value),
      ]),
    )
    .transform((emails) => [
      ...new Set(
        emails
          .map((email) => email.trim())
          .filter(
            (email) =>
              !email.includes('*') && z.email().safeParse(email).success,
          ),
      ),
    ])
    .optional(),
  links: z.array(z.unknown()).optional(),
  labels: z.array(z.string()).optional(),
  note: z.string().optional(),
});
export type NanoChannel = z.infer<typeof channelSchema> & {
  rawNanoListData?: Record<string, unknown>;
  rawNanoProfile?: Record<string, unknown>;
  enrichmentResults?: Record<string, unknown>;
};
export type NanoProject = {
  id: string;
  title?: string;
  rawNanoList?: Record<string, unknown>;
};

export class NanoHttpError extends Error {
  constructor(readonly status: number) {
    super(
      `NanoInfluencer returned HTTP ${status}${[401, 403].includes(status) ? '; refresh the session token' : ''}.`,
    );
  }
}

export class NanoTransportError extends Error {}

export class NanoClient {
  constructor(
    private readonly token = process.env.NANOINFLUENCER_API_TOKEN,
    readonly connectionId = 'legacy',
  ) {}

  async request(path: string, body?: unknown, task = false): Promise<unknown> {
    if (!this.token?.trim())
      throw new Error(
        'Configure the NanoInfluencer Session Token in application settings.',
      );
    let response: Response;
    try {
      response = await fetch(
        `${task ? 'https://api.nanoinfluencer.ai' : 'https://www.nanoinfluencer.ai'}${path}`,
        {
          method: body === undefined ? 'GET' : 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Cookie: `__Secure-next-auth.session-token=${this.token}`,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
          redirect: 'error',
        },
      );
    } catch {
      throw new NanoTransportError(
        'NanoInfluencer request failed or timed out. Retry reads; check Nano before repeating a search submission.',
      );
    }
    if (!response.ok) throw new NanoHttpError(response.status);
    try {
      return await response.json();
    } catch {
      throw new Error(
        'NanoInfluencer returned an invalid JSON response; check the session token.',
      );
    }
  }

  async projects(): Promise<NanoProject[]> {
    const response = z
      .object({ data: z.array(z.record(z.string(), z.unknown())) })
      .parse(await this.request('/api/project'));
    return response.data.map((rawNanoList) => ({
      ...z
        .object({
          id: z.union([z.string(), z.number()]).transform(String),
          title: z.string().optional(),
        })
        .parse(rawNanoList),
      rawNanoList,
    }));
  }

  async history(page: number) {
    return z
      .object({
        logs: z.array(z.record(z.string(), z.unknown())),
        totalCount: z.number().int().nonnegative(),
      })
      .parse(await this.request(`/api/task/logs?page=${page}&pageSize=30`));
  }

  async profile(channel: NanoChannel): Promise<NanoChannel> {
    const enrichmentResults = z
      .record(z.string(), z.unknown())
      .parse(
        await this.request(
          `/api/profile/${channel.platform}/${encodeURIComponent(channel.id)}`,
        ),
      );
    const rawNanoProfile = z
      .record(z.string(), z.unknown())
      .parse(enrichmentResults.data ?? enrichmentResults);
    return {
      ...channelSchema.parse({
        ...channel,
        ...rawNanoProfile,
        id: channel.id,
        platform: channel.platform,
      }),
      rawNanoProfile,
      enrichmentResults,
    };
  }

  async lookup(url: string): Promise<NanoChannel> {
    const profileUrl = z.url().parse(url);
    const enrichmentResults = z
      .record(z.string(), z.unknown())
      .parse(await this.request('/api/profile', { url: profileUrl }));
    const rawNanoProfile = z
      .record(z.string(), z.unknown())
      .parse(enrichmentResults.data ?? enrichmentResults);
    return {
      ...channelSchema.parse(rawNanoProfile),
      rawNanoProfile,
      enrichmentResults,
    };
  }

  async page(projectId: string, flag: 'fav' | 'hide', page: number) {
    const query = new URLSearchParams({
      group_id: projectId,
      flag,
      platform: 'all',
      page: String(page),
      page_size: '30',
    });
    const response = z
      .object({
        data: z.object({
          channels: z.array(z.record(z.string(), z.unknown())),
          op_users: z
            .record(z.string(), z.record(z.string(), z.unknown()))
            .optional(),
          total_pages: z.number().nullable().optional(),
          labels: z.array(z.string()).optional(),
        }),
      })
      .parse(await this.request(`/api/flag?${query}`)).data;
    return {
      ...response,
      channels: response.channels.map(
        (rawNanoListData): NanoChannel => ({
          ...channelSchema.parse(rawNanoListData),
          rawNanoListData,
        }),
      ),
    };
  }

  async setFlag(
    projectId: string,
    channel: NanoChannel,
    flag: 'fav' | 'hide' | 'del',
  ) {
    const response = await this.request('/api/flag', {
      group_id: Number(projectId),
      override: true,
      channels: [
        {
          id: channel.id,
          platform: channel.platform,
          name: channel.name,
          email: channel.email ?? [],
          flag,
        },
      ],
    });
    // A successful HTTP response alone does not prove Nano accepted the write.
    z.object({ data: z.object({ channels: z.array(z.unknown()) }) }).parse(
      response,
    );
  }

  async submit(
    channel: NanoChannel,
    filters: Record<string, unknown>,
    projectId?: string,
    options: Partial<SearchInput> = {},
    beforeSubmit?: (request: {
      path: string;
      body: Record<string, unknown>;
    }) => Promise<void>,
  ) {
    if (options.useShortsSearch && channel.platform !== 'ytb')
      throw new Error(
        'Shorts Search is available for YouTube lookalike seeds only.',
      );
    if (filters.shopSales && channel.platform !== 'tik')
      throw new Error(
        'Shop Sales is available for TikTok lookalike seeds only.',
      );
    const raw = await this.request(
      `/api/profile/${channel.platform}/${encodeURIComponent(channel.id)}`,
    );
    const envelope = z
      .object({ data: z.record(z.string(), z.unknown()).optional() })
      .parse(raw);
    const profile = z
      .object({
        id: z.union([z.string(), z.number()]).transform(String).optional(),
        name: z.string().optional(),
        icon: z.string().nullish(),
        topic_terms: z
          .array(
            z
              .object({ topic: z.string(), terms: z.array(z.string()) })
              .passthrough(),
          )
          .optional(),
      })
      .parse(envelope.data ?? raw);
    const negativeTopics = new Set(options.negativeTopics ?? []);
    const topics = (profile.topic_terms ?? []).map((topic) =>
      negativeTopics.has(topic.topic) ? { ...topic, neg: true } : topic,
    );
    const body = {
      cid: profile.id ?? channel.id,
      baseChannel: {
        id: profile.id ?? channel.id,
        platform: channel.platform,
        name: profile.name ?? channel.name,
        icon: profile.icon ?? channel.icon,
      },
      keyword: options.keyword ?? '',
      searchTopics: topics,
      useTopic: topics.length > 0,
      filterFavor: options.filterFavor ?? true,
      useRecentDedup: options.useRecentDedup ?? true,
      filters,
      ...(options.posTags?.length ? { posTags: options.posTags } : {}),
      ...(options.negTags?.length ? { negTags: options.negTags } : {}),
      ...(options.useShortsSearch ? { useShortsSearch: true } : {}),
      ...(projectId ? { group_id: Number(projectId) } : {}),
      ...(options.pagination
        ? {
            more: true,
            nextToken: options.pagination.nextToken,
            nextIds: options.pagination.nextIds,
            exclude_cids: options.pagination.excludeIds,
          }
        : {}),
    };
    const path = `/api/search/${channel.platform}`;
    await beforeSubmit?.({ path, body });
    const response = await this.request(path, body);
    const job = z
      .object({
        job_id: z.string().optional(),
        jobId: z.string().optional(),
        data: z
          .object({
            job_id: z.string().optional(),
            jobId: z.string().optional(),
          })
          .optional(),
      })
      .parse(response);
    const jobId =
      job.job_id ?? job.jobId ?? job.data?.job_id ?? job.data?.jobId;
    if (!jobId)
      throw new Error(
        'NanoInfluencer did not return a search job ID. Check Nano before submitting again.',
      );
    return jobId;
  }

  async poll(jobId: string) {
    return z
      .object({
        data: z.object({
          status: z.string(),
          data: z
            .object({
              channels: z.array(z.record(z.string(), z.unknown())).optional(),
              nextToken: z.string().nullable().optional(),
              nextIds: z.array(z.string()).optional(),
            })
            .nullable()
            .optional(),
        }),
      })
      .parse(
        await this.request(
          `/nano-api/search/task/${encodeURIComponent(jobId)}`,
          { channelIds: [] },
          true,
        ),
      ).data;
  }
}
