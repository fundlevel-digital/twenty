import { useTranslate } from 'twenty-sdk/front-component';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { Text } from 'twenty-ui/primitives/typography';
import {
  IconArrowBackUp,
  IconCheck,
  IconDotsVertical,
  IconLink,
  IconTrash,
} from 'twenty-ui/icon';
import { type RecordComment } from '../types';
import { CommentBody } from './CommentBody';
import { Actions, MessageBody, MessageHeader } from './styles';

type CommentMessageProps = {
  comment: RecordComment;
  isOwn: boolean;
  busy: boolean;
  onReply?: () => void;
  onResolve?: () => void;
  onCopy: () => void;
  onDelete: () => void;
};
export const CommentMessage = ({
  comment,
  isOwn,
  busy,
  onReply,
  onResolve,
  onCopy,
  onDelete,
}: CommentMessageProps) => {
  const { t, locale } = useTranslate();
  const minutes = Math.floor(
    (Date.now() - new Date(comment.createdAt).getTime()) / 60000,
  );
  const relativeTime =
    minutes < 1
      ? t('Just now')
      : new Intl.RelativeTimeFormat(locale, {
          style: 'narrow',
          numeric: 'auto',
        }).format(
          -Math.floor(
            minutes < 60
              ? minutes
              : minutes < 1440
                ? minutes / 60
                : minutes / 1440,
          ),
          minutes < 60 ? 'minute' : minutes < 1440 ? 'hour' : 'day',
        );
  return (
    <>
      <MessageHeader>
        <Avatar name={comment.authorName} size="md" shape="circle" />
        <Text weight="medium" truncate>
          {comment.authorName}
        </Text>
        <Text size="sm" color="tertiary">
          <time dateTime={comment.createdAt}>{relativeTime}</time>
        </Text>
        <Actions data-comment-actions>
          {onReply && (
            <LightIconButton
              size="xs"
              aria-label={t('Reply to Thread')}
              tooltip={t('Reply')}
              disabled={busy}
              onClick={onReply}
            >
              <IconArrowBackUp size={14} stroke={1.6} />
            </LightIconButton>
          )}
          {onResolve && (
            <LightIconButton
              size="xs"
              aria-label={comment.resolved ? t('Reopen') : t('Resolve')}
              tooltip={comment.resolved ? t('Reopen') : t('Resolve')}
              disabled={busy}
              onClick={onResolve}
            >
              <IconCheck size={14} stroke={1.6} />
            </LightIconButton>
          )}
          {!comment.deleted && (
            <Dropdown.Root type="menu">
              <Dropdown.Trigger
                render={
                  <LightIconButton
                    size="xs"
                    aria-label={t('Comment Options')}
                    tooltip={t('Options')}
                    disabled={busy}
                  >
                    <IconDotsVertical size={14} stroke={1.6} />
                  </LightIconButton>
                }
              />
              <Dropdown.Content align="end">
                <Dropdown.Section>
                  <Dropdown.ActionItem
                    startIcon={<IconLink size={14} stroke={1.6} />}
                    onClick={onCopy}
                  >
                    {t('Copy Link')}
                  </Dropdown.ActionItem>
                  {isOwn && (
                    <Dropdown.ActionItem
                      color="danger"
                      startIcon={<IconTrash size={14} stroke={1.6} />}
                      onClick={onDelete}
                    >
                      {t('Delete Comment')}
                    </Dropdown.ActionItem>
                  )}
                </Dropdown.Section>
              </Dropdown.Content>
            </Dropdown.Root>
          )}
        </Actions>
      </MessageHeader>
      <MessageBody>
        {comment.deleted ? (
          <Text color="tertiary">{t('Comment deleted')}</Text>
        ) : (
          <CommentBody comment={comment} />
        )}
      </MessageBody>
    </>
  );
};
