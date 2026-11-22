import 'twenty-ui/style.css';

import { useEffect, useState } from 'react';
import {
  copyToClipboard,
  openCommandConfirmationModal,
  useFrontComponentExecutionContext,
  useLocation,
  useTranslate,
} from 'twenty-sdk/front-component';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import { Text } from 'twenty-ui/primitives/typography';
import {
  IconCheck,
  IconFilter,
  IconMessageCircle,
  IconRefresh,
} from 'twenty-ui/icon';
import {
  type CommentRecordRequest,
  type CommentResponse,
  type CommentTarget,
  type RecordComment,
} from '../types';
import { filterThreads } from '../utils/filter-threads';
import { requestComments } from '../utils/request-comments';
import { CommentComposer } from './CommentComposer';
import { CommentMessage } from './CommentMessage';
import {
  Button,
  Content,
  Empty,
  Notice,
  Panel,
  Reply,
  Row,
  Thread,
  Toolbar,
} from './styles';

export const Comments = () => {
  const { t } = useTranslate();
  const recordId = useFrontComponentExecutionContext(
    (context) =>
      context.recordId ??
      (context.selectedRecordIds.length === 1
        ? context.selectedRecordIds[0]
        : null),
  );
  const objectName = useFrontComponentExecutionContext(
    (context) => context.selectedObjectMetadata?.nameSingular,
  );
  if (!recordId || !objectName)
    return (
      <Panel>
        <Empty>
          <IconMessageCircle size={24} stroke={1.6} />
          <Text>{t('Select a record to view its comments.')}</Text>
        </Empty>
      </Panel>
    );
  return (
    <RecordComments
      key={`${objectName}:${recordId}`}
      target={{ objectName, recordId }}
    />
  );
};
type RecordCommentsProps = {
  target: CommentTarget;
  onChange?: (data: CommentResponse) => void;
};

export const RecordComments = ({ target, onChange }: RecordCommentsProps) => {
  const { t } = useTranslate();
  const location = useLocation();
  const linkedId = new URLSearchParams(location?.search).get('comment');
  const [data, setData] = useState<CommentResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showResolved, setShowResolved] = useState(!!linkedId);
  const [onlyMine, setOnlyMine] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(linkedId);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    requestComments({ ...target, action: 'list' })
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError(t('We couldn’t load the comments. Try again.'));
      });
    return () => {
      active = false;
    };
  }, [target.objectName, target.recordId, t]);
  const run = async (
    input: Omit<CommentRecordRequest, 'objectName' | 'recordId'>,
  ) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await requestComments({ ...target, ...input });
      setData(result);
      onChange?.(result);
      if (result.notificationFailed)
        setNotice(
          t(
            'Comment saved, but the Inbox notification could not be delivered.',
          ),
        );
      return true;
    } catch {
      setError(
        input.action === 'list'
          ? t('We couldn’t load the comments. Try again.')
          : t('Your changes weren’t saved. Try again.'),
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  const copyLink = async (comment: RecordComment) => {
    if (!location) return;
    try {
      const url = new URL(
        `/object/${target.objectName}/${target.recordId}`,
        location.origin,
      );
      url.searchParams.set('comment', comment.parentId ?? comment.id);
      await copyToClipboard(url.toString());
      setNotice(t('Record link copied. Open Comments to view this thread.'));
    } catch {
      setError(t('Could not copy the link. Try again.'));
    }
  };
  const threads = data
    ? filterThreads(data.comments, data.memberId, showResolved, onlyMine)
    : [];
  const authorName =
    data?.comments.find((comment) => comment.authorId === data.memberId)
      ?.authorName ?? t('You');
  const message = (comment: RecordComment, root = false) => (
    <CommentMessage
      comment={comment}
      isOwn={comment.authorId === data?.memberId}
      busy={busy}
      onReply={
        root && !comment.resolved
          ? () => setExpanded(expanded === comment.id ? null : comment.id)
          : undefined
      }
      onResolve={
        root
          ? () => {
              void run({
                action: 'resolve',
                id: comment.id,
                resolved: !comment.resolved,
              });
            }
          : undefined
      }
      onCopy={() => {
        void copyLink(comment);
      }}
      onDelete={() => {
        void openCommandConfirmationModal({
          title: t('Delete Comment'),
          subtitle: t('This removes the comment. Replies are kept.'),
          confirmButtonText: t('Delete Comment'),
          confirmButtonAccent: 'danger',
        }).then((result) => {
          if (result === 'confirm')
            void run({ action: 'delete', id: comment.id });
        });
      }}
    />
  );
  return (
    <Panel aria-label={t('Comments')}>
      <Toolbar>
        <Text weight="medium">
          {showResolved ? t('All Comments') : t('Open Comments')}
        </Text>
        <Row>
          <LightIconButton
            size="sm"
            aria-label={t('Refresh Comments')}
            tooltip={t('Refresh')}
            disabled={busy}
            onClick={() => {
              void run({ action: 'list' });
            }}
          >
            <IconRefresh size={16} stroke={1.6} />
          </LightIconButton>
          <Dropdown.Root type="picker">
            <Dropdown.Trigger
              render={
                <LightIconButton
                  size="sm"
                  aria-label={t('Filter Comments')}
                  tooltip={t('Filter Comments')}
                >
                  <IconFilter size={16} stroke={1.6} />
                </LightIconButton>
              }
            />
            <Dropdown.Content align="end">
              <Dropdown.Section>
                <Dropdown.OptionItem
                  selected={showResolved}
                  indicator="checkbox"
                  closeOnSelect={false}
                  onSelect={() => setShowResolved(!showResolved)}
                >
                  {t('Show Resolved Comments')}
                </Dropdown.OptionItem>
                <Dropdown.OptionItem
                  selected={onlyMine}
                  indicator="checkbox"
                  closeOnSelect={false}
                  onSelect={() => setOnlyMine(!onlyMine)}
                >
                  {t('Only My Threads')}
                </Dropdown.OptionItem>
              </Dropdown.Section>
            </Dropdown.Content>
          </Dropdown.Root>
        </Row>
      </Toolbar>
      <Content>
        {error && (
          <Notice role="alert">
            <Text weight="medium">
              {data ? t('Something Went Wrong') : t('Comments Couldn’t Load')}
            </Text>
            <Text color="secondary">{error}</Text>
            <Row>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => {
                  void run({ action: 'list' });
                }}
              >
                {t('Try Again')}
              </Button>
            </Row>
          </Notice>
        )}
        {notice && (
          <Notice role="status">
            <Text color="secondary">{notice}</Text>
          </Notice>
        )}
        {data ? (
          <>
            <Row>
              <Text size="sm" color="tertiary">
                {t('Comments on')}
              </Text>
              <Text size="sm" weight="medium" truncate>
                {data.recordLabel}
              </Text>
              {data.objectLabel && (
                <>
                  <Text size="sm" color="tertiary">
                    ·
                  </Text>
                  <Text size="sm" color="tertiary" truncate>
                    {data.objectLabel}
                  </Text>
                </>
              )}
            </Row>
            <CommentComposer
              target={target}
              authorName={authorName}
              disabled={busy}
              onSubmit={(body, mentions) =>
                run({ action: 'create', body, mentions })
              }
            />
            {threads.length === 0 && (
              <Empty>
                <IconMessageCircle size={24} stroke={1.6} />
                <Text weight="medium">
                  {data.comments.some((comment) => !comment.deleted)
                    ? t('No Matching Comments')
                    : t('No Comments Yet')}
                </Text>
                <Text size="sm" color="tertiary">
                  {data.comments.some((comment) => !comment.deleted)
                    ? t('Try changing your filters.')
                    : t('Start a conversation or mention a teammate.')}
                </Text>
              </Empty>
            )}
            {threads.map((thread) => {
              const replies = data.comments.filter(
                (comment) => comment.parentId === thread.id && !comment.deleted,
              );
              const isExpanded = expanded === thread.id;
              return (
                <Thread id={`comment-${thread.id}`} key={thread.id}>
                  {thread.resolved && (
                    <Row>
                      <IconCheck size={14} stroke={1.6} />
                      <Text size="sm" color="tertiary">
                        {t('Resolved')}
                      </Text>
                    </Row>
                  )}
                  {message(thread, true)}
                  {replies.length > 0 && (
                    <Row>
                      <Button
                        size="sm"
                        variant="link"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpanded(isExpanded ? null : thread.id)
                        }
                      >
                        {t('Replies')} · {replies.length}
                      </Button>
                    </Row>
                  )}
                  {isExpanded && (
                    <>
                      {replies.map((reply) => (
                        <Reply key={reply.id}>{message(reply)}</Reply>
                      ))}
                      {!thread.resolved && (
                        <CommentComposer
                          target={target}
                          authorName={authorName}
                          isReply
                          disabled={busy}
                          onSubmit={(body, mentions) =>
                            run({
                              action: 'create',
                              parentId: thread.id,
                              body,
                              mentions,
                            })
                          }
                        />
                      )}
                    </>
                  )}
                </Thread>
              );
            })}
          </>
        ) : (
          !error && (
            <Empty role="status">
              <Text color="tertiary">{t('Loading comments…')}</Text>
            </Empty>
          )
        )}
      </Content>
    </Panel>
  );
};
