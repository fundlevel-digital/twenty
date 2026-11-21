import { expect, it, vi } from 'vitest';
import {
  YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS,
  YOUTUBE_CHANNEL_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { YOUTUBE_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/youtube-analytics-sync-options.constant';
import { synchronizeYoutubeMetricFields } from 'src/logic-functions/utils/synchronize-youtube-metric-fields.util';
import {
  getYoutubeMetricFields,
  YOUTUBE_METRIC_FIELD_DESCRIPTION,
} from 'src/logic-functions/utils/youtube-metric-fields.util';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

const OPTIONS = {
  ...YOUTUBE_ANALYTICS_SYNC_OPTIONS,
  metricFormat: 'PERCENTAGES' as const,
  timeframeDays: [7],
  numberTimeframeDays: [7],
  percentageTimeframeDays: [7],
};
const fieldDefinitions = getYoutubeMetricFields(OPTIONS);
const buildFields = () =>
  fieldDefinitions.map((definition, index) => ({
    id: `field-${index}`,
    name: definition.name,
    label: definition.label,
    description: YOUTUBE_METRIC_FIELD_DESCRIPTION,
    type: 'NUMBER',
    universalIdentifier: `identifier-${index}`,
  }));

it('updates visibility without deleting fields, values, or filters, and leaves unrelated views alone', async () => {
  const fields = buildFields();
  fields.push({
    id: 'old',
    name: 'averageViews',
    label: 'Average Views',
    description: '',
    type: 'NUMBER',
    universalIdentifier:
      YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.averageViews,
  });
  fields.push({
    id: 'retired',
    name: 'youtubeAnalyticsAverageViewsLast3Days',
    label: 'Average Views (Last 3 Days)',
    description: YOUTUBE_METRIC_FIELD_DESCRIPTION,
    type: 'NUMBER',
    universalIdentifier: 'old-identifier',
  });
  const request = vi.fn(async (query: string) => {
    if (query.includes('YoutubeChannelObject'))
      return { objects: { edges: [{ node: { id: 'channel-object' } }] } };
    if (query.includes('YoutubeChannelFields'))
      return {
        fields: {
          edges: fields.map((node) => ({ node })),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
    if (query.includes('YoutubeChannelViews'))
      return {
        getViews: [
          {
            id: 'table',
            universalIdentifier: YOUTUBE_CHANNEL_VIEW_UNIVERSAL_IDENTIFIER,
            type: 'TABLE',
            viewFields: [
              {
                id: 'old-column',
                fieldMetadataId: 'old',
                isVisible: true,
                position: 0,
              },
              {
                id: 'retired-column',
                fieldMetadataId: 'retired',
                isVisible: true,
                position: 1,
              },
            ],
          },
          {
            id: 'unrelated',
            universalIdentifier: 'other-view',
            type: 'TABLE',
            viewFields: [
              {
                id: 'custom-column',
                fieldMetadataId: 'old',
                isVisible: true,
                position: 0,
              },
            ],
          },
        ],
      };
    return {};
  });
  await synchronizeYoutubeMetricFields({
    client: { request: request as WorkspaceGraphqlClient['request'] },
    options: OPTIONS,
  });
  expect(
    request.mock.calls.filter(
      ([query]) => query.includes('delete') || query.includes('destroy'),
    ),
  ).toEqual([]);
  const mutations = request.mock.calls.filter(([query]) =>
    query.startsWith('mutation'),
  );
  expect(mutations).toHaveLength(3);
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining('UpdateYoutubeMetricVisibility'),
    { input: { id: 'old-column', update: { isVisible: false } } },
  );
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining('AddYoutubeMetricColumns'),
    {
      inputs: expect.arrayContaining([
        expect.objectContaining({
          viewId: 'table',
          fieldMetadataId: 'field-0',
          isVisible: true,
        }),
      ]),
    },
  );
  expect(JSON.stringify(request.mock.calls)).not.toContain('custom-column"');
});
it('does not mutate an already synchronized schema', async () => {
  const fields = buildFields();
  const request = vi.fn(async (query: string) => {
    if (query.includes('YoutubeChannelObject'))
      return { objects: { edges: [{ node: { id: 'channel-object' } }] } };
    if (query.includes('YoutubeChannelFields'))
      return {
        fields: {
          edges: fields.map((node) => ({ node })),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
    return {
      getViews: [
        {
          id: 'view',
          universalIdentifier: YOUTUBE_CHANNEL_VIEW_UNIVERSAL_IDENTIFIER,
          type: 'TABLE',
          viewFields: fields.map(({ id }, position) => ({
            id: `view-${id}`,
            fieldMetadataId: id,
            isVisible: true,
            position,
          })),
        },
      ],
    };
  });
  await synchronizeYoutubeMetricFields({
    client: { request: request as WorkspaceGraphqlClient['request'] },
    options: OPTIONS,
  });
  expect(request.mock.calls.some(([query]) => query.includes('mutation'))).toBe(
    false,
  );
});
it('refuses to overwrite a conflicting user field', async () => {
  const fields = buildFields();
  fields[0].description = 'User owned';
  const request = vi.fn(async (query: string) =>
    query.includes('YoutubeChannelObject')
      ? { objects: { edges: [{ node: { id: 'channel-object' } }] } }
      : {
          fields: {
            edges: fields.map((node) => ({ node })),
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
  );
  await expect(
    synchronizeYoutubeMetricFields({
      client: { request: request as WorkspaceGraphqlClient['request'] },
      options: OPTIONS,
    }),
  ).rejects.toThrow('conflicting field');
  expect(request.mock.calls.some(([query]) => query.includes('mutation'))).toBe(
    false,
  );
});
