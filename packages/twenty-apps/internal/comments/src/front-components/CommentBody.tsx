import { navigate, AppPath } from 'twenty-sdk/front-component';
import { type Mention, type RecordComment } from '../types';
import { Body, Button, InlineMention } from './styles';
export const CommentBody = ({ comment }: { comment: RecordComment }) => {
  const mentions = JSON.parse(comment.mentions || '[]') as Mention[];
  const fragments: (string | Mention)[] = [comment.body];
  for (const mention of mentions) {
    for (let index = fragments.length - 1; index >= 0; index--) {
      const fragment = fragments[index];
      if (typeof fragment !== 'string') continue;
      const parts = fragment.split(`@${mention.label}`);
      fragments.splice(
        index,
        1,
        ...parts.flatMap((part, position) =>
          position ? [mention, part] : [part],
        ),
      );
    }
  }
  return (
    <Body>
      {fragments.map((fragment, index) =>
        typeof fragment === 'string' ? (
          fragment
        ) : ['workspaceMember', 'openbotAgent'].includes(
            fragment.objectName,
          ) ? (
          <InlineMention key={index}>@{fragment.label}</InlineMention>
        ) : (
          <Button
            variant="link"
            size="sm"
            key={index}
            onClick={() => {
              void navigate(AppPath.RecordShowPage, {
                objectNameSingular: fragment.objectName,
                objectRecordId: fragment.id,
              });
            }}
          >
            @{fragment.label}
          </Button>
        ),
      )}
    </Body>
  );
};
