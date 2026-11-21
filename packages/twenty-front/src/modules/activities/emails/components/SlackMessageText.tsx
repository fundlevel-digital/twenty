import { styled } from '@linaria/react';
import Linkify from 'linkify-react';
import { Fragment, type ReactNode } from 'react';
import { getSafeUrl, isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';

import { type EmailThreadMessageParticipant } from '@/activities/emails/types/EmailThreadMessageParticipant';
import { getSlackReactionEmoji } from '@/activities/emails/utils/getSlackReactionEmoji';

const StyledMention = styled.span`
  background: ${themeCssVariables.accent.quaternary};
  border-radius: ${themeCssVariables.border.radius.smRound};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const StyledCode = styled.code`
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.smRound};
  font-family: ${themeCssVariables.code.font.family};
  padding: 0 ${themeCssVariables.spacing[1]};
  white-space: pre-wrap;
`;

const StyledCodeBlock = styled.pre`
  margin: ${themeCssVariables.spacing[1]} 0;
  white-space: pre-wrap;
`;

type SlackMessageTextProps = {
  text: string;
  participants: Pick<EmailThreadMessageParticipant, 'handle' | 'displayName'>[];
};

const decodeSlackText = (text: string) =>
  text.replace(/&lt;|&gt;|&amp;/g, (entity) =>
    entity === '&lt;' ? '<' : entity === '&gt;' ? '>' : '&',
  );

const renderSlackText = (
  text: string,
  participants: SlackMessageTextProps['participants'],
  depth = 0,
): ReactNode => {
  if (depth > 4) {
    return decodeSlackText(text);
  }

  const tokens = text.split(
    /(```[\s\S]*?```|`[^`\n]+`|<[^<>\n]+>|:[\w+-]+:|(?<!\w)\*[^*\n]+\*(?!\w)|(?<!\w)_[^_\n]+_(?!\w)|(?<!\w)~[^~\n]+~(?!\w))/g,
  );

  return tokens.map((token, index) => {
    let content: ReactNode;
    const marker = token[0];

    if (index % 2 === 0) {
      content = (
        <Linkify options={{ target: '_blank', rel: 'noopener noreferrer' }}>
          {decodeSlackText(token)}
        </Linkify>
      );
    } else if (token.startsWith('```')) {
      content = (
        <StyledCodeBlock>
          <StyledCode>{decodeSlackText(token.slice(3, -3))}</StyledCode>
        </StyledCodeBlock>
      );
    } else if (marker === '`') {
      content = <StyledCode>{decodeSlackText(token.slice(1, -1))}</StyledCode>;
    } else if (marker === '<' && token.endsWith('>')) {
      const [reference, ...labelParts] = token.slice(1, -1).split('|');
      const label = labelParts.length
        ? decodeSlackText(labelParts.join('|'))
        : undefined;
      if (reference.startsWith('@')) {
        const userId = reference.slice(1);
        const participant = participants.find(({ handle }) =>
          handle.endsWith(`:${userId}`),
        );
        content = (
          <StyledMention>
            @{participant?.displayName || label || userId}
          </StyledMention>
        );
      } else if (reference.startsWith('#')) {
        content = <StyledMention>#{label || reference.slice(1)}</StyledMention>;
      } else if (reference.startsWith('!')) {
        content = (
          <StyledMention>{label || `@${reference.slice(1)}`}</StyledMention>
        );
      } else {
        const url = /^(https?:\/\/|mailto:)/i.test(reference)
          ? getSafeUrl(decodeSlackText(reference))
          : undefined;
        content = isDefined(url) ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {label || decodeSlackText(reference)}
          </a>
        ) : (
          label || decodeSlackText(token)
        );
      }
    } else if (marker === ':' && token.endsWith(':')) {
      content = getSlackReactionEmoji(token.slice(1, -1));
    } else if (['*', '_', '~'].includes(marker) && token.endsWith(marker)) {
      const children = renderSlackText(
        token.slice(1, -1),
        participants,
        depth + 1,
      );
      content =
        marker === '*' ? (
          <strong>{children}</strong>
        ) : marker === '_' ? (
          <em>{children}</em>
        ) : (
          <s>{children}</s>
        );
    } else {
      content = decodeSlackText(token);
    }

    return <Fragment key={index}>{content}</Fragment>;
  });
};

export const SlackMessageText = ({
  text,
  participants,
}: SlackMessageTextProps) => renderSlackText(text, participants);
