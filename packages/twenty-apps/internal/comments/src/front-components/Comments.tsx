import { useEffect, useState } from 'react';
import { RestApiClient } from 'twenty-client-sdk/rest';
import {
  copyToClipboard,
  useFrontComponentExecutionContext,
  useLocation,
  useTranslate,
} from 'twenty-sdk/front-component';
import {
  type CommentRequest,
  type CommentResponse,
  type CommentTarget,
  type RecordComment,
} from '../types';
import { filterThreads } from '../utils/filter-threads';
import { CommentComposer } from './CommentComposer';
import { Body, Button, Muted, Panel, Reply, Row, Thread } from './styles';
import { CommentBody } from './CommentBody';

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
    return <Panel>{t('Select one record to view its comments.')}</Panel>;
  return (
    <RecordComments
      key={`${objectName}:${recordId}`}
      target={{ objectName, recordId }}
    />
  );
};
const RecordComments = ({ target }: { target: CommentTarget }) => {
  const { t } = useTranslate();
  const location = useLocation();
  const linkedId = new URLSearchParams(location?.search).get('comment');
  const [data, setData] = useState<CommentResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showResolved, setShowResolved] = useState(!!linkedId);
  const [onlyMine, setOnlyMine] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(linkedId);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const request = (input: Omit<CommentRequest, 'objectName' | 'recordId'>) =>
    new RestApiClient().post<CommentResponse>('/s/comments', {
      ...target,
      ...input,
    });
  useEffect(() => {
    let active = true;
    request({ action: 'list' })
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError(t('Could not load comments. Try again.'));
      });
    return () => {
      active = false;
    };
  }, [target.objectName, target.recordId, t]);
  const run = async (
    input: Omit<CommentRequest, 'objectName' | 'recordId'>,
  ) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request(input);
      setData(result);
      if (result.notificationFailed)
        setNotice(
          t(
            'Comment saved, but the Inbox notification could not be delivered.',
          ),
        );
      return true;
    } catch {
      setError(t('Could not save your changes. Try again.'));
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
  const renderComment = (comment: RecordComment) => (
    <>
      <Row>
        <strong>{comment.authorName}</strong>
        <Muted>
          <time dateTime={comment.createdAt}>
            {new Date(comment.createdAt).toLocaleString()}
          </time>
        </Muted>
      </Row>
      {comment.deleted ? (
        <Muted>{t('Comment deleted')}</Muted>
      ) : (
        <CommentBody comment={comment} />
      )}
      {!comment.deleted && (
        <Row>
          <Button
            disabled={busy}
            onClick={() => {
              void copyLink(comment);
            }}
          >
            {t('Copy Link')}
          </Button>
          {comment.authorId === data?.memberId && (
            <Button disabled={busy} onClick={() => setDeleteId(comment.id)}>
              {t('Delete')}
            </Button>
          )}
          {deleteId === comment.id && (
            <>
              <span>{t('Delete this comment?')}</span>
              <Button
                disabled={busy}
                onClick={async () => {
                  if (await run({ action: 'delete', id: comment.id }))
                    setDeleteId(null);
                }}
              >
                {t('Confirm Delete')}
              </Button>
              <Button onClick={() => setDeleteId(null)}>{t('Cancel')}</Button>
            </>
          )}
        </Row>
      )}
    </>
  );
  return (
    <Panel aria-label={t('Comments')}>
      <Row>
        <strong>{t('Comments')}</strong>
        <Muted>{data?.recordLabel}</Muted>
      </Row>
      <Row>
        <label>
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(event) => setShowResolved(event.target.checked)}
          />
          {t('Show Resolved Comments')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(event) => setOnlyMine(event.target.checked)}
          />
          {t('Only My Threads')}
        </label>
        <Button
          disabled={busy}
          onClick={() => {
            void run({ action: 'list' });
          }}
        >
          {t('Refresh')}
        </Button>
      </Row>
      {error && <Body role="alert">{error}</Body>}
      {notice && <Body role="status">{notice}</Body>}
      {!data ? (
        !error && <Muted role="status">{t('Loading comments…')}</Muted>
      ) : (
        <>
          <CommentComposer
            target={target}
            disabled={busy}
            onSubmit={(body, mentions) =>
              run({ action: 'create', body, mentions })
            }
          />
          {filterThreads(data.comments, data.memberId, showResolved, onlyMine)
            .length === 0 && (
            <Muted>{t('No comments match these filters.')}</Muted>
          )}
          {filterThreads(
            data.comments,
            data.memberId,
            showResolved,
            onlyMine,
          ).map((thread) => {
            const replies = data.comments.filter(
              (comment) => comment.parentId === thread.id && !comment.deleted,
            );
            return (
              <Thread id={`comment-${thread.id}`} key={thread.id}>
                {thread.resolved && <Muted>{t('Resolved')}</Muted>}
                {renderComment(thread)}
                <Row>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      void run({
                        action: 'resolve',
                        id: thread.id,
                        resolved: !thread.resolved,
                      });
                    }}
                  >
                    {thread.resolved ? t('Reopen') : t('Resolve')}
                  </Button>
                  <Button
                    aria-expanded={expanded === thread.id}
                    onClick={() =>
                      setExpanded(expanded === thread.id ? null : thread.id)
                    }
                  >
                    {t('Replies')} · {replies.length}
                  </Button>
                </Row>
                {expanded === thread.id && (
                  <>
                    {replies.map((reply) => (
                      <Reply key={reply.id}>{renderComment(reply)}</Reply>
                    ))}
                    {!thread.resolved && (
                      <CommentComposer
                        target={target}
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
      )}
    </Panel>
  );
};
