import { isNonEmptyString } from '@sniptt/guards';

import { ANALYTICS_ENTRIES_PAGE_SIZE } from 'src/logic-functions/constants/analytics-entries-page-size.constant';
import { type AnalyticsEntry } from 'src/logic-functions/types/analytics-entry.type';
import { type AnalyticsEntrySelection } from 'src/logic-functions/types/analytics-entry-selection.type';
import { normalizeOptionalText } from 'src/logic-functions/utils/normalize-optional-text.util';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';
import { isDefined } from 'src/utils/is-defined';

type AnalyticsEntryNode = {
  id?: unknown;
  name?: unknown;
  twitterId?: unknown;
  twitterHandle?: unknown;
  twitterUrl?: unknown;
  avatarUrl?: unknown;
  avatarFile?: { fileId: string }[] | null;
};

type AnalyticsEntriesQueryResult = {
  twitterProfiles?: {
    edges?: { node?: AnalyticsEntryNode }[];
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
  };
};

const LIST_ANALYTICS_ENTRIES_QUERY = `
  query ListTwitterProfiles(
    $filter: TwitterProfileFilterInput
    $first: Int
    $after: String
  ) {
    twitterProfiles(filter: $filter, first: $first, after: $after) {
      edges {
        node {
          id
          name
          twitterId
          twitterHandle
          twitterUrl
          avatarUrl
          avatarFile { fileId }
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

  return selection.profileIds.length > 0
    ? { id: { in: selection.profileIds } }
    : null;
};

const toAnalyticsEntry = (node: AnalyticsEntryNode): AnalyticsEntry | null => {
  if (!isNonEmptyString(node.id)) {
    return null;
  }

  return {
    id: node.id,
    name: normalizeOptionalText(node.name),
    twitterId: normalizeOptionalText(node.twitterId),
    twitterHandle: normalizeOptionalText(node.twitterHandle),
    twitterUrl: normalizeOptionalText(node.twitterUrl),
    avatarUrl: normalizeOptionalText(node.avatarUrl),
    hasAvatar: (node.avatarFile?.length ?? 0) > 0,
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

    const connection = result?.twitterProfiles;

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
