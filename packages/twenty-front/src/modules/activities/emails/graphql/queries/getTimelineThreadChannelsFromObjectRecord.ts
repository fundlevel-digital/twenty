import { gql } from '@apollo/client';

export const getTimelineThreadChannelsFromObjectRecord = gql`
  query GetTimelineThreadChannelsFromObjectRecord(
    $objectNameSingular: String!
    $recordId: UUID!
    $sourceFieldMetadataIdPaths: [[UUID!]!]
  ) {
    getTimelineThreadChannelsFromObjectRecord(
      objectNameSingular: $objectNameSingular
      recordId: $recordId
      sourceFieldMetadataIdPaths: $sourceFieldMetadataIdPaths
    ) {
      type
      provider
      applicationId
    }
  }
`;
