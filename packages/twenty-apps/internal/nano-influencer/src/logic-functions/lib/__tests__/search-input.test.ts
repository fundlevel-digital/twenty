import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSearchFilters,
  searchInputSchema,
} from '../../../utils/search-input';
import { SEARCH_INPUT_PROPERTIES } from '../../../utils/search-fields';
import { COUNTRIES } from '../../../utils/countries';
import { NanoClient } from '../nano-client';
import { startSearch } from '../search';
import { Workspace } from '../workspace';

vi.mock('twenty-sdk/logic-function', () => ({
  enqueueJobs: vi.fn().mockResolvedValue({}),
}));
const CREATOR_ID = '11111111-1111-4111-8111-111111111111';
const SEARCH_ID = '22222222-2222-4222-8222-222222222222';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const parse = (options: Record<string, unknown>) =>
  searchInputSchema.parse({ creatorId: CREATOR_ID, ...options });

describe('Nano search inputs', () => {
  it('converts all five min/max metric ranges to Nano ranges', () => {
    const input = parse({
      filters: {
        subs: { min: 100, max: 10000 },
        views: { max: 5000 },
        posts: { min: 5 },
        er: { min: 0, max: 20 },
        vr: [1, 200],
      },
    });
    expect(getSearchFilters(input.filters)).toEqual({
      subs: [100, 10000],
      views: [0, 5000],
      posts: [5],
      er: [0, 20],
      vr: [1, 200],
    });
  });
  it('accepts country names, ISO alpha-2 and numeric codes and sends numeric codes', () => {
    const input = parse({ filters: { country: ['United States', 'GB', 124] } });
    expect(getSearchFilters(input.filters).country).toEqual([840, 826, 124]);
    for (const country of COUNTRIES)
      expect(
        parse({ filters: { country: [country.value] } }).filters?.country?.[0],
      ).toEqual(expect.any(Number));
  });
  it('rejects conflicting countries and invalid ranges or options', () => {
    for (const filters of [
      { country: ['US'], excludeCountry: ['CA'] },
      { country: ['Made Up Country'] },
      { subs: { min: 100, max: 1 } },
      { er: { min: -1 } },
      { lastPostDays: 0 },
      { igender: ['invented'] },
      { unknownFilter: 1 },
    ])
      expect(() => parse({ filters })).toThrow();
  });
  it('omits empty workflow controls while retaining explicit false, zero and maximum-only limits', () => {
    const input = parse({
      keyword: null,
      listId: null,
      requestId: null,
      filterFavor: false,
      useRecentDedup: null,
      pagination: { nextToken: null, nextIds: [], excludeIds: [] },
      filters: {
        subs: { min: null, max: 100 },
        er: { min: 0, max: null },
        vr: { min: null, max: null },
        email: 'ANY',
        country: [],
      },
    });
    expect(input.filterFavor).toBe(false);
    expect(input.pagination).toBeUndefined();
    expect(getSearchFilters(input.filters)).toEqual({
      subs: [0, 100],
      er: [0],
    });
  });
  it.each([
    ['AVAILABLE', true],
    ['DEEP', 'deep'],
    [true, true],
    ['deep', 'deep'],
  ])('maps email %s to Nano email depth', (email, expected) => {
    expect(getSearchFilters(parse({ filters: { email } }).filters).email).toBe(
      expected,
    );
  });
  it('omits unrestricted email and passes personas, excluded countries, activity and sales', () => {
    expect(
      getSearchFilters(
        parse({
          filters: {
            email: 'ANY',
            igender: ['female', 'org'],
            excludeCountry: ['United States'],
            lastPostDays: 45,
            shopSales: true,
          },
        }).filters,
      ),
    ).toEqual({
      igender: ['female', 'org'],
      excludeCountry: [840],
      lastPostDays: 45,
      shopSales: true,
    });
  });
  it('exposes readable labels, help and country/persona multiselects through the shared command/workflow definition', () => {
    expect(SEARCH_INPUT_PROPERTIES.creatorId.label).toBe('Lookalike Seed');
    expect(SEARCH_INPUT_PROPERTIES.requestId.hidden).toBe(true);
    expect(
      SEARCH_INPUT_PROPERTIES.connectionId.connectionProvider?.providerName,
    ).toBe('nano-influencer');
    const country = SEARCH_INPUT_PROPERTIES.filters.properties?.country.items;
    expect(country?.enumLabels?.US).toBe('United States');
    expect(country?.enum).toContain('US');
    expect(
      SEARCH_INPUT_PROPERTIES.filters.properties?.igender.items?.enumLabels
        ?.org,
    ).toBe('Organization');
  });
});

describe('Nano request parity and input audit', () => {
  it('captures the exact request before submission and carries every supported search option', async () => {
    const nano = new NanoClient('private-fixture');
    const request = vi
      .spyOn(nano, 'request')
      .mockResolvedValueOnce({
        data: {
          id: 'UCresolved',
          name: 'Example',
          icon: 'https://example.com/avatar.png',
          topic_terms: [
            { topic: 'Gaming', terms: ['games'], weight: 3 },
            { topic: 'Tech', terms: ['software'] },
          ],
        },
      })
      .mockResolvedValueOnce({ job_id: 'example-job' });
    const capture = vi.fn(async () => {
      expect(request).toHaveBeenCalledTimes(1);
    });
    const input = parse({
      keyword: 'technology',
      posTags: ['tutorials'],
      negTags: ['promotions'],
      negativeTopics: ['Gaming'],
      useShortsSearch: true,
      filterFavor: false,
      useRecentDedup: false,
      pagination: {
        nextToken: 'next',
        nextIds: ['next-id'],
        excludeIds: ['old-id'],
      },
      filters: {
        subs: { min: 10, max: 100 },
        views: { min: 1 },
        posts: { max: 50 },
        er: { min: 2 },
        vr: { max: 500 },
        email: 'DEEP',
        country: ['US'],
        igender: ['org'],
        lastPostDays: 30,
      },
    });
    expect(
      await nano.submit(
        { id: 'old-id', platform: 'ytb' },
        getSearchFilters(input.filters),
        '7',
        input,
        capture,
      ),
    ).toBe('example-job');
    const body = {
      cid: 'UCresolved',
      baseChannel: {
        id: 'UCresolved',
        platform: 'ytb',
        name: 'Example',
        icon: 'https://example.com/avatar.png',
      },
      keyword: 'technology',
      searchTopics: [
        { topic: 'Gaming', terms: ['games'], weight: 3, neg: true },
        { topic: 'Tech', terms: ['software'] },
      ],
      useTopic: true,
      filterFavor: false,
      useRecentDedup: false,
      useShortsSearch: true,
      filters: {
        subs: [10, 100],
        views: [1],
        posts: [0, 50],
        er: [2],
        vr: [0, 500],
        email: 'deep',
        country: [840],
        igender: ['org'],
        lastPostDays: 30,
      },
      posTags: ['tutorials'],
      negTags: ['promotions'],
      group_id: 7,
      more: true,
      nextToken: 'next',
      nextIds: ['next-id'],
      exclude_cids: ['old-id'],
    };
    expect(capture).toHaveBeenCalledWith({ path: '/api/search/ytb', body });
    expect(request).toHaveBeenLastCalledWith('/api/search/ytb', body);
    expect(JSON.stringify(capture.mock.calls)).not.toContain('private-fixture');
  });
  it('does not submit if saving the input audit fails', async () => {
    const nano = new NanoClient('fixture');
    const request = vi.spyOn(nano, 'request').mockResolvedValue({ data: {} });
    await expect(
      nano.submit(
        { id: 'seed', platform: 'ytb' },
        {},
        undefined,
        {},
        async () => {
          throw new Error('Save failed');
        },
      ),
    ).rejects.toThrow('Save failed');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rejects incompatible platform options before any request', async () => {
    const nano = new NanoClient('fixture');
    const request = vi.spyOn(nano, 'request');
    await expect(
      nano.submit({ id: 'seed', platform: 'ins' }, {}, undefined, {
        useShortsSearch: true,
      }),
    ).rejects.toThrow('YouTube');
    await expect(
      nano.submit({ id: 'seed', platform: 'ytb' }, { shopSales: true }),
    ).rejects.toThrow('TikTok');
    expect(request).not.toHaveBeenCalled();
  });
  it('stores chosen inputs and the wire request on the search record before the mutation', async () => {
    const workspace = new Workspace();
    const nano = new NanoClient('fixture', 'connection');
    vi.spyOn(workspace, 'find').mockResolvedValue([]);
    vi.spyOn(workspace, 'get').mockResolvedValue({
      id: CREATOR_ID,
      nanoId: 'seed',
      platform: 'ytb',
      name: 'Example',
    });
    const create = vi
      .spyOn(workspace, 'create')
      .mockResolvedValue({ id: SEARCH_ID });
    const update = vi
      .spyOn(workspace, 'update')
      .mockResolvedValue({ id: SEARCH_ID });
    const request = vi
      .spyOn(nano, 'request')
      .mockResolvedValueOnce({ data: {} })
      .mockImplementationOnce(async () => {
        expect(update).toHaveBeenCalledWith('Search', SEARCH_ID, {
          searchInput: expect.objectContaining({
            nanoRequest: expect.objectContaining({ path: '/api/search/ytb' }),
          }),
        });
        return { job_id: 'job' };
      });
    await startSearch(parse({ keyword: 'example' }), workspace, nano);
    expect(create).toHaveBeenCalledWith(
      'Search',
      expect.objectContaining({
        searchInput: {
          input: expect.objectContaining({ keyword: 'example' }),
          nanoRequest: null,
        },
      }),
    );
    expect(request).toHaveBeenCalledTimes(2);
  });
});
