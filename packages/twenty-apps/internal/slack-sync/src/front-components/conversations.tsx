import 'twenty-ui/style.css';
import 'twenty-ui/theme-dark.css';
import 'twenty-ui/theme-light.css';
import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  AppPath,
  openSidePanelPage,
  t,
  useColorScheme,
  useLocation,
  useSelectedObjectMetadata,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';
import {
  IconHash,
  IconMessage,
  IconChevronDown,
  IconChevronRight,
} from 'twenty-ui/icon';
import { Text } from 'twenty-ui/primitives/typography';
import {
  ThemeProvider,
  THEME_DARK,
  THEME_LIGHT,
  themeCssVariables,
} from 'twenty-ui/theme';
import {
  groupRecordConversations,
  loadRecordConversations,
  type SlackRecordThread,
} from 'src/utils/load-record-conversations';

const StyledList = styled.div`
  color: ${() => themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[4]};
  font: inherit;
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto;
  padding: ${() => themeCssVariables.spacing[4]};
`;
const StyledChannel = styled.section`
  border: 1px solid ${() => themeCssVariables.border.color.medium};
  border-radius: ${() => themeCssVariables.border.radius.md};
  overflow: hidden;
`;
const StyledChannelHeader = styled.button`
  align-items: center;
  background: ${() => themeCssVariables.background.secondary};
  border: 0;
  color: inherit;
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: ${() => themeCssVariables.spacing[2]};
  padding: ${() => themeCssVariables.spacing[3]};
  text-align: left;
  width: 100%;
`;
const StyledThread = styled.button`
  align-items: flex-start;
  background: ${() => themeCssVariables.background.primary};
  border: 0;
  border-top: 1px solid ${() => themeCssVariables.border.color.light};
  color: inherit;
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: ${() => themeCssVariables.spacing[3]};
  padding: ${() => themeCssVariables.spacing[3]};
  text-align: left;
  width: 100%;
  &[aria-current='true'] {
    background: ${() => themeCssVariables.accent.quaternary};
  }
  &:hover {
    background: ${() => themeCssVariables.background.transparent.light};
  }
  &:disabled {
    cursor: default;
  }
`;
const StyledThreadContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[1]};
  min-width: 0;
`;
const StyledTruncated = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const StyledStandaloneMessage = styled.div`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  white-space: pre-wrap;
`;
const StyledActions = styled.div`
  display: flex;
  gap: ${() => themeCssVariables.spacing[2]};
  button {
    background: ${() => themeCssVariables.background.primary};
    border: 1px solid ${() => themeCssVariables.border.color.medium};
    border-radius: ${() => themeCssVariables.border.radius.sm};
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: ${() => themeCssVariables.spacing[2]};
  }
`;

const SlackConversationList = ({
  recordId,
  objectNameSingular,
}: {
  recordId: string;
  objectNameSingular: string;
}) => {
  const location = useLocation();
  const panelPath = new URLSearchParams(location?.search ?? '').get('panel');
  const activeThreadId = panelPath?.match(
    /^\/object\/messageThread\/([^/?#]+)/,
  )?.[1];
  const [threads, setThreads] = useState<SlackRecordThread[]>([]);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    loadRecordConversations({ recordId, objectNameSingular, page: 1 })
      .then((result) => {
        if (cancelled) return;
        setThreads(result.threads);
        setHasMore(result.hasMore);
        setNextPage(2);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recordId, objectNameSingular]);

  const loadMore = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await loadRecordConversations({
        recordId,
        objectNameSingular,
        page: nextPage,
      });
      setThreads((previous) => [
        ...new Map(
          [...previous, ...result.threads].map((thread) => [thread.id, thread]),
        ).values(),
      ]);
      setHasMore(result.hasMore);
      setNextPage(nextPage + 1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  const refresh = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await loadRecordConversations({
        recordId,
        objectNameSingular,
        page: 1,
      });
      setThreads(result.threads);
      setHasMore(result.hasMore);
      setNextPage(2);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  const groups = groupRecordConversations(threads);
  return (
    <StyledList>
      <StyledActions>
        <button type="button" disabled={loading} onClick={refresh}>
          {t('Refresh')}
        </button>
      </StyledActions>
      <Text size="sm" color="tertiary">
        {t('Slack conversations with this record, grouped by channel.')}
      </Text>
      {groups.map((group) => (
        <StyledChannel key={group.id}>
          <StyledChannelHeader
            type="button"
            aria-expanded={!collapsed.has(group.id)}
            onClick={() =>
              setCollapsed((previous) => {
                const next = new Set(previous);
                if (next.has(group.id)) next.delete(group.id);
                else next.add(group.id);
                return next;
              })
            }
          >
            {collapsed.has(group.id) ? (
              <IconChevronRight size={14} />
            ) : (
              <IconChevronDown size={14} />
            )}
            <IconHash size={14} />
            <Text weight="medium">
              {group.name?.replace(/^#/, '') ?? t('Private channel')}
            </Text>
            <Text size="sm" color="tertiary">
              {group.threadCount > 0 &&
                (group.threadCount === 1
                  ? t('{count} thread', { count: group.threadCount })
                  : t('{count} threads', { count: group.threadCount }))}
              {group.threadCount > 0 &&
                group.standaloneMessageCount > 0 &&
                ' · '}
              {group.standaloneMessageCount > 0 &&
                (group.standaloneMessageCount === 1
                  ? t('{count} message', {
                      count: group.standaloneMessageCount,
                    })
                  : t('{count} messages', {
                      count: group.standaloneMessageCount,
                    }))}
            </Text>
          </StyledChannelHeader>
          {!collapsed.has(group.id) &&
            group.threads.map((thread) => (
              <StyledThread
                key={thread.id}
                type="button"
                aria-current={activeThreadId === thread.id ? 'true' : undefined}
                disabled={thread.visibility !== 'SHARE_EVERYTHING'}
                onClick={() =>
                  void openSidePanelPage({
                    to: AppPath.RecordShowPage,
                    params: {
                      objectNameSingular: 'messageThread',
                      objectRecordId: thread.id,
                    },
                  })
                }
              >
                <IconMessage size={14} />
                <StyledThreadContent>
                  {thread.numberOfMessagesInThread === 1 &&
                  thread.visibility === 'SHARE_EVERYTHING' ? (
                    <StyledStandaloneMessage>
                      <Text>{thread.lastMessageBody || t('Message')}</Text>
                    </StyledStandaloneMessage>
                  ) : (
                    <StyledTruncated>
                      <Text weight="medium">
                        {thread.visibility === 'METADATA'
                          ? thread.numberOfMessagesInThread === 1
                            ? t('Private message')
                            : t('Private thread')
                          : thread.subject?.split(' · ').slice(1).join(' · ') ||
                            thread.subject ||
                            t('Thread')}
                      </Text>
                    </StyledTruncated>
                  )}
                  {(thread.numberOfMessagesInThread !== 1 ||
                    thread.visibility !== 'SHARE_EVERYTHING') && (
                    <StyledTruncated>
                      <Text size="sm" color="secondary">
                        {thread.visibility === 'SHARE_EVERYTHING'
                          ? thread.lastMessageBody
                          : t('Message content is not shared')}
                      </Text>
                    </StyledTruncated>
                  )}
                  <Text size="sm" color="tertiary">
                    {thread.numberOfMessagesInThread === 1
                      ? t('1 message')
                      : thread.numberOfMessagesInThread === 2
                        ? t('1 reply')
                        : t('{count} replies', {
                            count: thread.numberOfMessagesInThread - 1,
                          })}
                  </Text>
                </StyledThreadContent>
              </StyledThread>
            ))}
        </StyledChannel>
      ))}
      {loading && <Text color="tertiary">{t('Loading conversations…')}</Text>}
      {!loading && !error && !hasMore && threads.length === 0 && (
        <Text color="secondary">{t('No Slack conversations yet.')}</Text>
      )}
      {error && (
        <Text color="secondary">
          {t('Unable to load conversations. Try again.')}
        </Text>
      )}
      {(hasMore || error) && (
        <StyledActions>
          <button type="button" disabled={loading} onClick={loadMore}>
            {error ? t('Try again') : t('Load more threads')}
          </button>
        </StyledActions>
      )}
    </StyledList>
  );
};

export const SlackRecordConversations = () => {
  const colorScheme = useColorScheme();
  const [recordId] = useSelectedRecordIds();
  const objectMetadata = useSelectedObjectMetadata();
  return (
    <ThemeProvider
      colorScheme={colorScheme}
      theme={colorScheme === 'dark' ? THEME_DARK : THEME_LIGHT}
    >
      {recordId && objectMetadata && (
        <SlackConversationList
          key={`${objectMetadata.nameSingular}:${recordId}`}
          recordId={recordId}
          objectNameSingular={objectMetadata.nameSingular}
        />
      )}
    </ThemeProvider>
  );
};

export default defineFrontComponent({
  universalIdentifier: 'bb0cd2da-0d74-4ab9-82f9-25eae2b06f67',
  name: 'slack-record-conversations',
  component: SlackRecordConversations,
});
