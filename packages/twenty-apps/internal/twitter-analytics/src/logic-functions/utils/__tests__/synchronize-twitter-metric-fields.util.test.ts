import { expect, it, vi } from 'vitest';
import {
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS,
  TWITTER_PROFILE_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { TWITTER_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/twitter-analytics-sync-options.constant';
import { synchronizeTwitterMetricFields } from 'src/logic-functions/utils/synchronize-twitter-metric-fields.util';
import {
  getTwitterMetricFields,
  TWITTER_METRIC_FIELD_DESCRIPTION,
} from 'src/logic-functions/utils/twitter-metric-fields.util';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

const OPTIONS = {
  ...TWITTER_ANALYTICS_SYNC_OPTIONS,
  metricFormat: 'PERCENTAGES' as const,
  timeframeDays: [7],
  numberTimeframeDays: [7],
  percentageTimeframeDays: [7],
};
const fieldDefinitions = getTwitterMetricFields(OPTIONS);
const buildFields = () =>
  fieldDefinitions.map((definition, index) => ({
    id: `field-${index}`,
    name: definition.name,
    label: definition.label,
    description: TWITTER_METRIC_FIELD_DESCRIPTION,
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
      TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageViews,
  });
  fields.push({
    id: 'retired',
    name: 'twitterAnalyticsAverageViewsLast3Days',
    label: 'Average Views (Last 3 Days)',
    description: TWITTER_METRIC_FIELD_DESCRIPTION,
    type: 'NUMBER',
    universalIdentifier: 'old-identifier',
  });
  const request = vi.fn(async (query: string) => {
    if (query.includes('TwitterProfileObject'))
      return { objects: { edges: [{ node: { id: 'profile-object' } }] } };
    if (query.includes('TwitterProfileFields'))
      return {
        fields: {
          edges: fields.map((node) => ({ node })),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
    if (query.includes('TwitterProfileViews'))
      return {
        getViews: [
          {
            id: 'table',
            universalIdentifier: TWITTER_PROFILE_VIEW_UNIVERSAL_IDENTIFIER,
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
  await synchronizeTwitterMetricFields({
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
    expect.stringContaining('UpdateTwitterMetricVisibility'),
    { input: { id: 'old-column', update: { isVisible: false } } },
  );
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining('AddTwitterMetricColumns'),
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
    if (query.includes('TwitterProfileObject'))
      return { objects: { edges: [{ node: { id: 'profile-object' } }] } };
    if (query.includes('TwitterProfileFields'))
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
          universalIdentifier: TWITTER_PROFILE_VIEW_UNIVERSAL_IDENTIFIER,
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
  await synchronizeTwitterMetricFields({
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
    query.includes('TwitterProfileObject')
      ? { objects: { edges: [{ node: { id: 'profile-object' } }] } }
      : {
          fields: {
            edges: fields.map((node) => ({ node })),
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
  );
  await expect(
    synchronizeTwitterMetricFields({
      client: { request: request as WorkspaceGraphqlClient['request'] },
      options: OPTIONS,
    }),
  ).rejects.toThrow('conflicting field');
  expect(request.mock.calls.some(([query]) => query.includes('mutation'))).toBe(
    false,
  );
});
