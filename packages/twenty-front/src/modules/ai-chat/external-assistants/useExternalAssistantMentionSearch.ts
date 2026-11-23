import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { type MentionSearchResult } from '@/mention/types/MentionSearchResult';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { FeatureFlagKey } from '~/generated-metadata/graphql';

const EXTERNAL_ASSISTANTS = gql`
  query ExternalAssistantDirectory {
    externalAssistants {
      id
      name
      applicationName
      avatarUrl
      enabled
    }
  }
`;

export const useExternalAssistantMentionSearch = () => {
  const { t } = useLingui();
  const enabled = useIsFeatureEnabled(FeatureFlagKey.IS_AI_CHAT_INBOX_ENABLED);
  const { data } = useQuery<{
    externalAssistants: {
      id: string;
      name: string;
      applicationName: string;
      avatarUrl: string | null;
      enabled: boolean;
    }[];
  }>(EXTERNAL_ASSISTANTS, {
    skip: !enabled,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60000,
  });
  return (query: string): MentionSearchResult[] =>
    (data?.externalAssistants ?? [])
      .filter(
        (assistant) =>
          assistant.enabled &&
          assistant.name
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      )
      .map((assistant) => ({
        recordId: assistant.id,
        objectNameSingular: 'externalAssistant',
        objectLabelSingular: t`Assistant · ${assistant.applicationName}`,
        objectLabelPlural: t`Teammates`,
        label: assistant.name,
        imageUrl: assistant.avatarUrl ?? '',
      }));
};
