import 'twenty-ui/style.css';

import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import {
  AppPath,
  navigate,
  useLocation,
  useTranslate,
} from 'twenty-sdk/front-component';
import { LightIconButton } from 'twenty-ui/components/input';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { Input } from 'twenty-ui/primitives/input';
import { ListItem } from 'twenty-ui/primitives/navigation';
import { Text } from 'twenty-ui/primitives/typography';
import {
  IconArrowLeft,
  IconExternalLink,
  IconMessageCircle,
  IconRefresh,
} from 'twenty-ui/icon';
import { themeCssVariables as theme } from 'twenty-ui/theme';
import {
  type CommentDiscussion,
  type CommentInboxResponse,
  type CommentInboxTargetResponse,
  type CommentTarget,
} from '../types';
import { requestComments } from '../utils/request-comments';
import { RecordComments } from './Comments';
import { Button, Empty, Notice, Panel, Row, Toolbar } from './styles';

const Layout = styled.div`
  display: flex;
  height: 100%;
  min-height: 0;
  min-width: 0;
  color: ${() => theme.font.color.primary};
  background: ${() => theme.background.primary};
  font: ${() => theme.font.size.md} ${() => theme.font.family};
`;
const RecordList = styled.aside<{ selected: boolean }>`
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${() => theme.border.color.light};
  min-height: 0;
  @media (max-width: 700px) {
    display: ${({ selected }) => (selected ? 'none' : 'flex')};
    width: 100%;
  }
`;
const SearchBox = styled.div`
  display: flex;
  padding: ${() => theme.spacing[3]};
  gap: ${() => theme.spacing[2]};
`;
const Records = styled.div`
  overflow: auto;
  padding: 0 ${() => theme.spacing[2]} ${() => theme.spacing[2]};
`;
const RecordCopy = styled.span`
  display: flex;
  flex-direction: column;
  gap: ${() => theme.spacing[1]};
  min-width: 0;
  padding: ${() => theme.spacing[1]} 0;
`;
const DiscussionPane = styled.main<{ selected: boolean }>`
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  @media (max-width: 700px) {
    display: ${({ selected }) => (selected ? 'flex' : 'none')};
  }
`;
const DiscussionContent = styled.div`
  width: 100%;
  max-width: 840px;
  margin: 0 auto;
  flex: 1;
  min-height: 0;
`;
const EmptyDiscussion = styled(Empty)`
  flex: 1;
  justify-content: center;
`;

export const CommentsInbox = () => {
  const { t } = useTranslate();
  const location = useLocation();
  const notificationId = new URLSearchParams(location?.search).get(
    'notification',
  );
  const [discussions, setDiscussions] = useState<CommentDiscussion[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<CommentTarget | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    let active = true;
    setBusy(true);
    requestComments<CommentInboxResponse>({ action: 'inbox' })
      .then((result) => {
        if (!active) return;
        setDiscussions(result.discussions);
        setCursor(result.cursor);
      })
      .catch(() => {
        if (active) setError(t('Discussions couldn’t load. Try again.'));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (!notificationId) return;
    let active = true;
    setNotificationError('');
    requestComments<CommentInboxTargetResponse>({
      action: 'inbox-target',
      notificationId,
    })
      .then(({ target }) => {
        if (active) setSelected(target);
      })
      .catch(() => {
        if (active)
          setNotificationError(
            t('This discussion is unavailable or you no longer have access.'),
          );
      });
    return () => {
      active = false;
    };
  }, [notificationId, t]);

  const load = async (more = false) => {
    setBusy(true);
    setError('');
    try {
      const result = await requestComments<CommentInboxResponse>({
        action: 'inbox',
        cursor: more ? (cursor ?? undefined) : undefined,
      });
      setDiscussions((previous) => {
        const merged = new Map<string, CommentDiscussion>();
        for (const discussion of [
          ...(more ? previous : []),
          ...result.discussions,
        ]) {
          const key = `${discussion.objectName}:${discussion.recordId}`;
          if (!merged.has(key)) merged.set(key, discussion);
        }
        return [...merged.values()];
      });
      setCursor(result.cursor);
    } catch {
      setError(t('Discussions couldn’t load. Try again.'));
    } finally {
      setBusy(false);
    }
  };
  const matching = discussions.filter(
    ({ recordLabel, objectLabel, latestComment }) =>
      `${recordLabel} ${objectLabel} ${latestComment.body}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const selection = discussions.find(
    (discussion) =>
      discussion.objectName === selected?.objectName &&
      discussion.recordId === selected.recordId,
  );

  return (
    <Layout>
      <RecordList selected={!!selected} aria-label={t('Record Discussions')}>
        <SearchBox>
          <Input
            type="search"
            aria-label={t('Search Discussions')}
            placeholder={t('Search discussions…')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <LightIconButton
            size="sm"
            disabled={busy}
            aria-label={t('Refresh Discussions')}
            tooltip={t('Refresh')}
            onClick={() => {
              void load();
            }}
          >
            <IconRefresh size={16} stroke={1.6} />
          </LightIconButton>
        </SearchBox>
        <Records>
          {error && (
            <Notice role="alert">
              <Text>{error}</Text>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => {
                  void load();
                }}
              >
                {t('Try Again')}
              </Button>
            </Notice>
          )}
          {matching.map((discussion) => (
            <ListItem
              key={`${discussion.objectName}:${discussion.recordId}`}
              render={<button type="button" />}
              selected={discussion === selection}
              aria-label={`${discussion.recordLabel} · ${discussion.objectLabel}`}
              startIcon={
                <Avatar
                  name={discussion.recordLabel}
                  size="md"
                  shape="rounded-square"
                />
              }
              onClick={() =>
                setSelected({
                  objectName: discussion.objectName,
                  recordId: discussion.recordId,
                })
              }
            >
              <RecordCopy>
                <Text weight="medium" truncate>
                  {discussion.recordLabel}
                </Text>
                <Text size="sm" color="tertiary" truncate>
                  {discussion.objectLabel}
                </Text>
                <Text size="sm" color="secondary" truncate>
                  {discussion.latestComment.authorName}:{' '}
                  {discussion.latestComment.body}
                </Text>
              </RecordCopy>
            </ListItem>
          ))}
          {!busy && !error && matching.length === 0 && (
            <Empty>
              <IconMessageCircle size={24} stroke={1.6} />
              <Text>
                {query ? t('No Matching Discussions') : t('No Discussions Yet')}
              </Text>
              <Text size="sm" color="tertiary">
                {query
                  ? t('Try another search or load older discussions.')
                  : t('Comments on records you can access appear here.')}
              </Text>
            </Empty>
          )}
          {busy && (
            <Empty role="status">
              <Text color="tertiary">{t('Loading discussions…')}</Text>
            </Empty>
          )}
          {cursor && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                void load(true);
              }}
            >
              {t('Load Older Discussions')}
            </Button>
          )}
        </Records>
      </RecordList>
      <DiscussionPane selected={!!selected} aria-label={t('Discussion')}>
        {notificationError && (
          <Notice role="alert">
            <Text>{notificationError}</Text>
          </Notice>
        )}
        {selected ? (
          <>
            <Toolbar>
              <Row>
                <LightIconButton
                  size="sm"
                  aria-label={t('Back to Discussions')}
                  tooltip={t('Back')}
                  onClick={() => setSelected(null)}
                >
                  <IconArrowLeft size={16} stroke={1.6} />
                </LightIconButton>
                <Text weight="medium" truncate>
                  {selection?.recordLabel ?? t('Record Discussion')}
                </Text>
              </Row>
              <Button
                size="sm"
                onClick={() => {
                  void navigate(AppPath.RecordShowPage, {
                    objectNameSingular: selected.objectName,
                    objectRecordId: selected.recordId,
                  });
                }}
              >
                <IconExternalLink size={14} stroke={1.6} />
                {t('Open Record')}
              </Button>
            </Toolbar>
            <DiscussionContent>
              <RecordComments
                key={`${selected.objectName}:${selected.recordId}`}
                target={selected}
                onChange={(data) => {
                  const latestComment = data.comments
                    .filter((comment) => !comment.deleted)
                    .sort((left, right) =>
                      right.createdAt.localeCompare(left.createdAt),
                    )[0];
                  setDiscussions((previous) => {
                    const remaining = previous.filter(
                      (discussion) =>
                        discussion.objectName !== selected.objectName ||
                        discussion.recordId !== selected.recordId,
                    );
                    const next = latestComment
                      ? [
                          ...remaining,
                          {
                            ...selected,
                            recordLabel: data.recordLabel,
                            objectLabel:
                              data.objectLabel ?? selected.objectName,
                            latestComment,
                          },
                        ]
                      : remaining;
                    return next.sort((left, right) =>
                      right.latestComment.createdAt.localeCompare(
                        left.latestComment.createdAt,
                      ),
                    );
                  });
                }}
              />
            </DiscussionContent>
          </>
        ) : (
          <Panel>
            <EmptyDiscussion>
              <IconMessageCircle size={32} stroke={1.6} />
              <Text weight="medium">{t('Your Record Discussions')}</Text>
              <Text color="tertiary">
                {t('Choose a record to read comments and reply to your team.')}
              </Text>
            </EmptyDiscussion>
          </Panel>
        )}
      </DiscussionPane>
    </Layout>
  );
};
