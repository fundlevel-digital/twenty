import { isNonEmptyString, isObject } from '@sniptt/guards';

import { ANALYTICS_ENTRIES_PAGE_SIZE } from 'src/logic-functions/constants/analytics-entries-page-size.constant';
import { type AnalyticsEntry } from 'src/logic-functions/types/analytics-entry.type';
import { type AnalyticsEntrySelection } from 'src/logic-functions/types/analytics-entry-selection.type';
import { normalizeOptionalText } from 'src/logic-functions/utils/normalize-optional-text.util';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';
import { isDefined } from 'src/utils/is-defined';

type AnalyticsEntryNode = {
  id?: unknown;
  name?: unknown;
  influencer?: {
    id?: unknown;
    name?: unknown;
    youtubeId?: unknown;
    youtubeHandle?: unknown;
    youtubeUrl?: unknown;
  } | null;
};

type AnalyticsEntriesQueryResult = {
  influencerAnalyticsEntries?: {
    edges?: { node?: AnalyticsEntryNode }[];
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
  };
};

const LIST_ANALYTICS_ENTRIES_QUERY = `
  query ListInfluencerAnalyticsEntries(
    $filter: InfluencerAnalyticsEntryFilterInput
    $first: Int
    $after: String
  ) {
    influencerAnalyticsEntries(filter: $filter, first: $first, after: $after) {
      edges {
        node {
          id
          name
          influencer {
            id
            name
            youtubeId
            youtubeHandle
            youtubeUrl
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const buildFilter = (
  selection: AnalyticsEntrySelection,
): Record<string, unknown> | null => {
  if (selection.kind === 'calculationsEnabled') {
    return { calculationsEnabled: { eq: true } };
  }

  const conditions = [
    ...(selection.entryIds.length > 0
      ? [{ id: { in: selection.entryIds } }]
      : []),
    ...(selection.influencerIds.length > 0
      ? [{ influencerId: { in: selection.influencerIds } }]
      : []),
  ];

  return conditions.length > 0 ? { or: conditions } : null;
};

const toAnalyticsEntry = (node: AnalyticsEntryNode): AnalyticsEntry | null => {
  if (!isNonEmptyString(node.id)) {
    return null;
  }

  const influencer = node.influencer;

  return {
    id: node.id,
    name: normalizeOptionalText(node.name),
    influencer:
      isObject(influencer) && isNonEmptyString(influencer.id)
        ? {
            influencerId: influencer.id,
            name: normalizeOptionalText(influencer.name),
            youtubeId: normalizeOptionalText(influencer.youtubeId),
            youtubeHandle: normalizeOptionalText(influencer.youtubeHandle),
            youtubeUrl: normalizeOptionalText(influencer.youtubeUrl),
          }
        : null,
  };
};

export const listAnalyticsEntries = async ({
  client,
  selection,
}: {
  client: WorkspaceGraphqlClient;
  selection: AnalyticsEntrySelection;
}): Promise<AnalyticsEntry[]> => {
  const filter = buildFilter(selection);

  if (!isDefined(filter)) {
    return [];
  }

  const entries: AnalyticsEntry[] = [];
  let cursor: string | null = null;

  while (true) {
    const result: AnalyticsEntriesQueryResult =
      await client.request<AnalyticsEntriesQueryResult>(
        LIST_ANALYTICS_ENTRIES_QUERY,
        {
          filter,
          first: ANALYTICS_ENTRIES_PAGE_SIZE,
          ...(isNonEmptyString(cursor) ? { after: cursor } : {}),
        },
      );

    const connection = result?.influencerAnalyticsEntries;

    for (const edge of connection?.edges ?? []) {
      const entry = isDefined(edge.node) ? toAnalyticsEntry(edge.node) : null;

      if (isDefined(entry)) {
        entries.push(entry);
      }
    }

    const endCursor = connection?.pageInfo?.endCursor;

    if (
      connection?.pageInfo?.hasNextPage !== true ||
      !isNonEmptyString(endCursor)
    ) {
      return entries;
    }

    cursor = endCursor;
  }
};
