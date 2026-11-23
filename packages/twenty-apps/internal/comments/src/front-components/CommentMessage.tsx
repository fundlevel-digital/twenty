import { useTranslate } from 'twenty-sdk/front-component';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import { Avatar, Tag } from 'twenty-ui/primitives/data-display';
import { Text } from 'twenty-ui/primitives/typography';
import {
  IconArrowBackUp,
  IconCheck,
  IconDotsVertical,
  IconLink,
  IconTrash,
} from 'twenty-ui/icon';
import { type OpenBotAgent } from '../openbot/types';
import { type OpenBotDeliveryStatus } from '../openbot/delivery-status';
import { OpenBotAvatar } from './OpenBotAvatar';
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
  openBotAgents?: OpenBotAgent[];
  openBotDeliveries?: OpenBotDeliveryStatus[];
};
export const CommentMessage = ({
  comment,
  isOwn,
  busy,
  onReply,
  onResolve,
  onCopy,
  onDelete,
  openBotAgents,
  openBotDeliveries,
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
        {comment.authorKind === 'BOT' ? (
          <OpenBotAvatar
            name={comment.authorName}
            avatarUrl={
              openBotAgents?.find(({ id }) => id === comment.authorId)
                ?.avatarUrl
            }
          />
        ) : (
          <Avatar name={comment.authorName} size="md" shape="circle" />
        )}
        {comment.authorKind === 'BOT' && <Tag color="gray">{t('Bot')}</Tag>}
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
        {openBotDeliveries
          ?.filter(({ commentId }) => commentId === comment.id)
          .map((delivery) => (
            <Text
              key={delivery.agentId}
              size="sm"
              color="tertiary"
              role="status"
            >
              {openBotAgents?.find(({ id }) => id === delivery.agentId)?.name ??
                t('Bot')}
              {' · '}
              {delivery.status === 'pending'
                ? t('Queued')
                : delivery.status === 'accepted'
                  ? t('Sent to OpenBot')
                  : delivery.status === 'retrying'
                    ? t('Retrying Delivery')
                    : delivery.status === 'failed'
                      ? t('Delivery Failed')
                      : t('Replied')}
            </Text>
          ))}
      </MessageBody>
    </>
  );
};
