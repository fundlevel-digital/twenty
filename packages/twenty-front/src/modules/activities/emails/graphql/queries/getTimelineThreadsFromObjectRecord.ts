import { timelineThreadWithTotalFragment } from '@/activities/emails/graphql/queries/fragments/timelineThreadWithTotalFragment';
import { gql } from '@apollo/client';

export const getTimelineThreadsFromObjectRecord = gql`
  query GetTimelineThreadsFromObjectRecord(
    $objectNameSingular: String!
    $recordId: UUID!
    $page: Int!
    $pageSize: Int!
    $channel: TimelineThreadChannelFilterInput
    $sourceFieldMetadataIdPaths: [[UUID!]!]
  ) {
    getTimelineThreadsFromObjectRecord(
      objectNameSingular: $objectNameSingular
      recordId: $recordId
      page: $page
      pageSize: $pageSize
      channel: $channel
      sourceFieldMetadataIdPaths: $sourceFieldMetadataIdPaths
    ) {
      ...TimelineThreadsWithTotalFragment
    }
  }
  ${timelineThreadWithTotalFragment}
`;
