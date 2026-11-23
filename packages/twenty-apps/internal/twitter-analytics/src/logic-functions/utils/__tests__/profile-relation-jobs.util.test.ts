import { afterEach, describe, expect, it, vi } from 'vitest';
import { runProfileRelationJob } from 'src/logic-functions/utils/profile-relation-jobs.util';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

const connection = (nodes: unknown[], endCursor: string | null = null) => ({
  edges: nodes.map((node) => ({ node })),
  pageInfo: { hasNextPage: endCursor !== null, endCursor },
});
const sourceField = { name: 'xLink', type: 'LINKS', label: 'X Link' };
const metadataClient = (field = sourceField): WorkspaceGraphqlClient => ({
  request: vi
    .fn()
    .mockImplementation(async (query: string) =>
      query.includes('SourceObject')
        ? { objects: connection([{ id: 'source-object' }]) }
        : { fields: connection([field]) },
    ),
});
const clearedRecord = { id: 'company-1', xLink: null };

afterEach(() => vi.unstubAllEnvs());

describe('Twitter profile relation backfill selection', () => {
  it('filters empty primary and secondary links before reading a source page', async () => {
    vi.stubEnv('COMPANY_SOURCE_FIELD', 'xLink');
    const request = vi.fn().mockResolvedValue({ companies: connection([]) });
    const result = await runProfileRelationJob({
      client: { request },
      metadata: metadataClient(),
      kind: 'company',
      mode: 'CREATE_MISSING',
      dryRun: true,
    });
    expect(result).toMatchObject({ scanned: 0, nextCursor: null });
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1].filter).toEqual({
      or: [
        {
          and: [
            { xLink: { primaryLinkUrl: { is: 'NOT_NULL' } } },
            { xLink: { primaryLinkUrl: { neq: '' } } },
          ],
        },
        {
          and: [
            { xLink: { secondaryLinks: { is: 'NOT_NULL' } } },
            { not: { xLink: { secondaryLinks: { like: '[]' } } } },
          ],
        },
      ],
    });
  });

  it('uses the selected text field and advances through filtered People pages', async () => {
    vi.stubEnv('PERSON_SOURCE_FIELD', 'twitter');
    const request = vi
      .fn()
      .mockResolvedValueOnce({ people: connection([], 'next-people-page') })
      .mockResolvedValueOnce({ people: connection([]) });
    const options = {
      client: { request },
      metadata: metadataClient({ name: 'twitter', type: 'TEXT', label: 'X' }),
      kind: 'person' as const,
      mode: 'LINK_EXISTING' as const,
      dryRun: true,
    };
    const first = await runProfileRelationJob(options);
    const second = await runProfileRelationJob({
      ...options,
      after: first.nextCursor ?? undefined,
    });
    expect(second.nextCursor).toBeNull();
    expect(request.mock.calls[1][1]).toEqual({
      after: 'next-people-page',
      filter: {
        and: [{ twitter: { is: 'NOT_NULL' } }, { twitter: { neq: '' } }],
      },
    });
  });

  it('checks cleared fields only through managed relations, preserving manual relations', async () => {
    vi.stubEnv('COMPANY_LINK_MODE', 'SYNC_MANAGED');
    const request = vi
      .fn()
      .mockResolvedValueOnce({ companies: connection([]) })
      .mockResolvedValueOnce({
        twitterProfileCompanies: connection([
          { company: clearedRecord },
          { company: clearedRecord },
          { company: null },
          {
            company: {
              id: 'populated',
              xLink: { secondaryLinks: [{ url: 'https://x.com/acme' }] },
            },
          },
          { company: { id: 'invalid', xLink: 'https://example.com' } },
        ]),
      })
      .mockResolvedValueOnce({
        twitterProfileCompanies: connection([
          {
            id: 'automatic',
            twitterProfileId: 'p1',
            automaticallyManaged: true,
          },
          { id: 'manual', twitterProfileId: 'p2', automaticallyManaged: false },
        ]),
      })
      .mockResolvedValueOnce({});
    const options = {
      client: { request },
      metadata: metadataClient(),
      kind: 'company' as const,
      mode: 'LINK_EXISTING' as const,
    };
    const first = await runProfileRelationJob(options);
    const cleanup = await runProfileRelationJob({
      ...options,
      after: first.nextCursor ?? undefined,
    });
    expect(cleanup).toMatchObject({
      scanned: 1,
      relationsRemoved: 1,
      nextCursor: null,
    });
    const mutations = request.mock.calls.filter(([query]) =>
      query.includes('mutation'),
    );
    expect(mutations).toHaveLength(1);
    expect(mutations[0][1]).toEqual({ id: 'automatic' });
    expect(request.mock.calls[1][0]).toContain(
      'automaticallyManaged: {eq: true}',
    );
  });

  it('counts a cleared record once when its managed relations span pages', async () => {
    vi.stubEnv('COMPANY_LINK_MODE', 'SYNC_MANAGED');
    const request = vi
      .fn()
      .mockResolvedValueOnce({ companies: connection([]) })
      .mockResolvedValueOnce({
        twitterProfileCompanies: connection(
          [{ company: clearedRecord }],
          'next-managed-page',
        ),
      })
      .mockResolvedValueOnce({
        twitterProfileCompanies: connection([
          {
            id: 'automatic',
            twitterProfileId: 'p1',
            automaticallyManaged: true,
          },
        ]),
      })
      .mockResolvedValueOnce({
        twitterProfileCompanies: connection([{ company: clearedRecord }]),
      });
    const options = {
      client: { request },
      metadata: metadataClient(),
      kind: 'company' as const,
      mode: 'LINK_EXISTING' as const,
      dryRun: true,
    };
    const sources = await runProfileRelationJob(options);
    const cleanup = await runProfileRelationJob({
      ...options,
      after: sources.nextCursor ?? undefined,
    });
    const continuation = await runProfileRelationJob({
      ...options,
      after: cleanup.nextCursor ?? undefined,
    });
    expect(cleanup).toMatchObject({ scanned: 1, relationsRemoved: 1 });
    expect(continuation).toMatchObject({ scanned: 0, nextCursor: null });
    expect(request.mock.calls[3][1]).toEqual({ after: 'next-managed-page' });
    expect(
      request.mock.calls.every(([query]) => !query.includes('mutation')),
    ).toBe(true);
  });

  it('still reads an emptied field for an individual synchronization event', async () => {
    vi.stubEnv('COMPANY_AUTO_MODE', 'LINK_EXISTING');
    vi.stubEnv('COMPANY_LINK_MODE', 'SYNC_MANAGED');
    const request = vi
      .fn()
      .mockResolvedValueOnce({ companies: connection([clearedRecord]) })
      .mockResolvedValueOnce({ twitterProfileCompanies: connection([]) });
    const result = await runProfileRelationJob({
      client: { request },
      metadata: metadataClient(),
      kind: 'company',
      recordId: clearedRecord.id,
    });
    expect(result.nextCursor).toBeNull();
    expect(request.mock.calls[0][1].filter).toEqual({
      id: { eq: clearedRecord.id },
    });
  });
});
