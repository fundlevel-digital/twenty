import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { Tag } from 'twenty-ui/primitives/data-display';
import { IconTrash } from 'twenty-ui/icon';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';

import { type MessageProviderMetadata } from '@/activities/emails/types/MessageProviderMetadata';
import { isSlackMessagePermalink } from '@/activities/emails/utils/isSlackMessagePermalink';

const StyledMetadata = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledPermalink = styled.a`
  color: ${themeCssVariables.font.color.tertiary};
  text-decoration: underline;
`;

type ChatThreadMessageProviderMetadataProps = {
  metadata: MessageProviderMetadata;
};

export const ChatThreadMessageProviderMetadata = ({
  metadata,
}: ChatThreadMessageProviderMetadataProps) => {
  const permalink = isSlackMessagePermalink(metadata.permalink)
    ? metadata.permalink
    : undefined;

  return (
    <StyledMetadata>
      {isNonEmptyString(metadata.deletedAt) ? (
        <Tag color="amber" startIcon={<IconTrash size={12} />}>
          <Trans>Deleted</Trans>
        </Tag>
      ) : (
        isNonEmptyString(metadata.editedAt) && (
          <Text size="sm" color="tertiary">
            <Trans>Edited</Trans>
          </Text>
        )
      )}
      {isDefined(permalink) && (
        <Text
          size="sm"
          color="tertiary"
          render={
            <StyledPermalink
              href={permalink}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <Trans>Open in Slack</Trans>
        </Text>
      )}
    </StyledMetadata>
  );
};
