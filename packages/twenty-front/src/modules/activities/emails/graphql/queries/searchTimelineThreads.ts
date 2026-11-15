import { timelineThreadFragment } from '@/activities/emails/graphql/queries/fragments/timelineThreadFragment';
import { gql } from '@apollo/client';

export const searchTimelineThreads = gql`
  query SearchTimelineThreads(
    $objectNameSingular: String!
    $recordId: UUID!
    $searchInput: String
    $sourceFieldMetadataIdPaths: [[UUID!]!]
  ) {
    searchTimelineThreads(
      objectNameSingular: $objectNameSingular
      recordId: $recordId
      searchInput: $searchInput
      sourceFieldMetadataIdPaths: $sourceFieldMetadataIdPaths
    ) {
      recordTimelineThreads {
        ...TimelineThreadFragment
      }
      otherTimelineThreads {
        ...TimelineThreadFragment
      }
    }
  }
  ${timelineThreadFragment}
`;
