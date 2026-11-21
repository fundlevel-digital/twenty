import styled from '@emotion/styled';
import { useState } from 'react';
import { t } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { IconRefresh } from 'twenty-ui/icon';
import { Button, Checkbox, Input } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import { type ConversationKind } from 'src/utils/conversation-label';
import { SlackPreferenceSelect } from 'src/front-components/components/SlackPreferenceSelect';

export type SlackSyncAccount = {
  id: string;
  name: string;
  history: '30_DAYS' | 'ALL';
  folders: {
    id: string;
    name: string;
    isSynced: boolean;
    kind: ConversationKind;
  }[];
  discovery?: { isRunning: boolean; updatedAt: number } | null;
};

type SlackConversationSettingsProps = {
  accounts: SlackSyncAccount[];
  disabled: boolean;
  isDiscovering: boolean;
  onSave: (
    selections: { connectedAccountId: string; conversationIds: string[] }[],
    history: '30_DAYS' | 'ALL',
  ) => Promise<boolean>;
  onRefresh: () => Promise<void>;
};

const StyledStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[3]};
`;
const StyledToolbar = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${() => themeCssVariables.spacing[2]};
`;
const StyledSearch = styled.div`
  flex: 1;
  min-width: 180px;
`;
const StyledSelect = styled.div`
  flex-shrink: 0;
  width: 200px;
`;
const StyledList = styled.div`
  max-height: 360px;
  overflow-y: auto;
`;
const StyledConversation = styled.label`
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: ${() => themeCssVariables.spacing[3]};
  min-height: 32px;
  padding: ${() => themeCssVariables.spacing[2]}
    ${() => themeCssVariables.spacing[3]};
  &:hover {
    background: ${() => themeCssVariables.background.transparent.light};
  }
`;
const StyledName = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const SlackConversationSettings = ({
  accounts,
  disabled,
  isDiscovering,
  onSave,
  onRefresh,
}: SlackConversationSettingsProps) => {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('ALL');
  const [history, setHistory] = useState<'30_DAYS' | 'ALL'>(
    accounts[0]?.history ?? '30_DAYS',
  );
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const conversations = accounts.flatMap((account) =>
    account.folders.map((folder) => ({
      ...folder,
      key: `${account.id}/${folder.id}`,
      accountId: account.id,
      accountName: account.name,
    })),
  );
  const selected = (conversation: (typeof conversations)[number]) =>
    draft[conversation.key] ?? conversation.isSynced;
  const visible = conversations
    .filter(
      (conversation) =>
        (kind === 'ALL' ||
          (kind === 'CHANNEL'
            ? conversation.kind === 'CHANNEL'
            : conversation.kind !== 'CHANNEL')) &&
        conversation.name
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
    )
    .sort((first, second) => first.name.localeCompare(second.name));
  const selectedCount = conversations.filter(selected).length;
  const hasChanges =
    conversations.some(
      (conversation) => selected(conversation) !== conversation.isSynced,
    ) || accounts.some((account) => account.history !== history);
  const setVisibleSelection = (isSelected: boolean) =>
    setDraft((previous) => ({
      ...previous,
      ...Object.fromEntries(
        visible.map((conversation) => [conversation.key, isSelected]),
      ),
    }));
  const save = async () => {
    if (
      await onSave(
        accounts.map((account) => ({
          connectedAccountId: account.id,
          conversationIds: conversations
            .filter(
              (conversation) =>
                conversation.accountId === account.id && selected(conversation),
            )
            .map((conversation) => conversation.id),
        })),
        history,
      )
    )
      setDraft({});
  };
  return (
    <Section.Root>
      <Section.Header
        title={t('Conversations to Sync')}
        description={t(
          'Select channels and direct messages together. Saving starts ongoing sync and imports the selected history automatically.',
        )}
        actions={
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onRefresh}
            startIcon={<IconRefresh size={14} />}
          >
            {t('Refresh')}
          </Button>
        }
      />
      <StyledStack>
        <StyledToolbar>
          <StyledSearch>
            <Input
              aria-label={t('Search Conversations')}
              placeholder={t('Search channels and people…')}
              value={search}
              onValueChange={setSearch}
            />
          </StyledSearch>
          <StyledSelect>
            <SlackPreferenceSelect
              label={t('Conversation Type')}
              value={kind}
              onChange={setKind}
              disabled={disabled}
              options={[
                { value: 'ALL', label: t('All Conversations') },
                { value: 'CHANNEL', label: t('Channels') },
                { value: 'DM', label: t('Direct Messages') },
              ]}
            />
          </StyledSelect>
        </StyledToolbar>
        <StyledToolbar>
          <Text size="sm" color="tertiary">
            {t('{selected} of {total} selected', {
              selected: selectedCount,
              total: conversations.length,
            })}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled || !visible.length}
            onClick={() => setVisibleSelection(true)}
          >
            {t('Select All Shown')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled || !visible.length}
            onClick={() => setVisibleSelection(false)}
          >
            {t('Clear Shown')}
          </Button>
        </StyledToolbar>
        <Card.Root fullWidth>
          <StyledList aria-label={t('Slack Conversations')}>
            {visible.map((conversation) => (
              <StyledConversation key={conversation.key}>
                <Checkbox
                  checked={selected(conversation)}
                  disabled={disabled}
                  aria-label={conversation.name}
                  onCheckedChange={(value) =>
                    setDraft((previous) => ({
                      ...previous,
                      [conversation.key]: value === true,
                    }))
                  }
                />
                <StyledName>
                  <Text color="primary">
                    {conversation.kind === 'CHANNEL'
                      ? `#${conversation.name.replace(/^#/, '')}`
                      : conversation.name}
                  </Text>
                </StyledName>
                <Text size="sm" color="tertiary">
                  {conversation.kind === 'CHANNEL'
                    ? t('Channel')
                    : conversation.kind === 'GROUP_DM'
                      ? t('Group DM')
                      : t('DM')}
                </Text>
                {accounts.length > 1 && (
                  <Text size="sm" color="tertiary">
                    {conversation.accountName}
                  </Text>
                )}
              </StyledConversation>
            ))}
            {!visible.length && (
              <Card.Content>
                <Text color="tertiary">
                  {!accounts.length
                    ? t('Connect Slack in General to choose conversations.')
                    : isDiscovering
                      ? t('Discovering conversations…')
                      : t(
                          'No matching conversations. Try Refresh to discover more.',
                        )}
                </Text>
              </Card.Content>
            )}
          </StyledList>
        </Card.Root>
        {isDiscovering && (
          <Text size="sm" color="tertiary">
            {t(
              'Discovering more conversations. This list updates automatically.',
            )}
          </Text>
        )}
        <StyledToolbar>
          <Text weight="medium">{t('Message History')}</Text>
          <StyledSelect>
            <SlackPreferenceSelect
              label={t('Message History')}
              value={history}
              onChange={(value) =>
                setHistory(value === 'ALL' ? 'ALL' : '30_DAYS')
              }
              disabled={disabled}
              options={[
                { value: '30_DAYS', label: t('Last 30 Days') },
                { value: 'ALL', label: t('All Available History') },
              ]}
            />
          </StyledSelect>
          <Button
            color="accent"
            disabled={disabled || !hasChanges}
            onClick={save}
          >
            {t('Save Sync Settings')}
          </Button>
        </StyledToolbar>
        <Text size="sm" color="tertiary">
          {t(
            'Unselected conversations stop syncing. Previously imported messages stay in the CRM. Slack may limit the history available to your account.',
          )}
        </Text>
      </StyledStack>
    </Section.Root>
  );
};
