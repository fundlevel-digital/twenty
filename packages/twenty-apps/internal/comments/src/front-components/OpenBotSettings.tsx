import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import { useEffect, useRef, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import {
  AppPath,
  navigate,
  openCommandConfirmationModal,
  useColorScheme,
  useLocation,
  useTranslate,
} from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { Button, Input, Switch } from 'twenty-ui/primitives/input';
import { ListItemButton } from 'twenty-ui/components/navigation';
import { Text } from 'twenty-ui/primitives/typography';
import { ThemeProvider } from 'twenty-ui/theme';
import { IconArrowLeft, IconPlus, IconRefresh } from 'twenty-ui/icon';
import { DEFAULT_TASK_POLICY } from '../openbot/task-policy';
import { type OpenBotTaskPolicy } from '../openbot/types';
import { OpenBotAvatar } from './OpenBotAvatar';
import { Content, Notice, Panel, Row } from './styles';

type BotConfiguration = {
  id: string;
  name: string;
  avatarUrl: string | null;
  webhookUrl: string;
  hasSecret: boolean;
  enabled: boolean;
  taskPolicy: OpenBotTaskPolicy;
};
type BotDraft = BotConfiguration & { webhookSecret: string };
type Configuration = {
  revision: string;
  replyUrl: string;
  bots: BotConfiguration[];
};

export const invokeBotConfiguration = async <TResult,>(
  input: Record<string, unknown>,
): Promise<TResult> => {
  const client = new MetadataApiClient();
  const { findManyLogicFunctions } = await client.query({
    findManyLogicFunctions: { id: true, universalIdentifier: true },
  });
  const logicFunction = findManyLogicFunctions.find(
    (item) =>
      item.universalIdentifier === '0a0fe957-56bf-4379-a6f0-c76996121c35',
  );
  if (!logicFunction)
    throw new Error('Bot settings unavailable. Reload the app.');
  const { executeOneLogicFunction: result } = await client.mutation({
    executeOneLogicFunction: {
      __args: { input: { id: logicFunction.id, payload: input } },
      status: true,
      data: true,
      error: true,
    },
  });
  if (result.status !== 'SUCCESS') {
    const error = result.error as { errorMessage?: string } | null;
    throw new Error(error?.errorMessage ?? 'Bot settings request failed');
  }
  return result.data as TResult;
};

const emptyDraft = (): BotDraft => ({
  id: '',
  name: '',
  avatarUrl: null,
  webhookUrl: '',
  webhookSecret: '',
  hasSecret: false,
  enabled: true,
  taskPolicy: { ...DEFAULT_TASK_POLICY },
});

export const OpenBotSettings = () => {
  const { t } = useTranslate();
  const scheme = useColorScheme();
  const location = useLocation();
  const parameters = new URLSearchParams(location?.search);
  const botId = parameters.get('openBotId');
  const loadVersion = useRef(0);
  const [configuration, setConfiguration] = useState<Configuration | null>(
    null,
  );
  const [loadedBotId, setLoadedBotId] = useState<string | null | undefined>(
    undefined,
  );
  const [draft, setDraft] = useState<BotDraft>(emptyDraft);
  const [saved, setSaved] = useState('');
  const [replyUrl, setReplyUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => {
    const version = ++loadVersion.current;
    setBusy(true);
    setError('');
    try {
      const result = await invokeBotConfiguration<Configuration>({
        action: 'list',
      });
      if (version !== loadVersion.current) return;
      setConfiguration(result);
      setReplyUrl(result.replyUrl);
      const existing = result.bots.find((bot) => bot.id === botId);
      if (botId && botId !== 'new' && !existing)
        throw new Error(t('Bot not found. Return to the directory.'));
      const next = existing ? { ...existing, webhookSecret: '' } : emptyDraft();
      setDraft(next);
      setSaved(JSON.stringify(next));
      setLoadedBotId(botId);
    } catch (failure) {
      if (version !== loadVersion.current) return;
      setError(
        failure instanceof Error ? failure.message : t('Could not load bots.'),
      );
    } finally {
      if (version === loadVersion.current) setBusy(false);
    }
  };
  useEffect(() => {
    void load();
    return () => {
      loadVersion.current++;
    };
  }, [botId]);
  const goToBot = async (id: string | null, skipDirtyCheck = false) => {
    if (!skipDirtyCheck && botId && JSON.stringify(draft) !== saved) {
      const decision = await openCommandConfirmationModal({
        title: t('Discard Changes?'),
        subtitle: t('Your unsaved bot settings will be lost.'),
        confirmButtonText: t('Discard Changes'),
        confirmButtonAccent: 'danger',
      });
      if (decision !== 'confirm') return;
    }
    if (!skipDirtyCheck) setNotice('');
    const query = Object.fromEntries(parameters.entries());
    if (id) query.openBotId = id;
    else delete query.openBotId;
    const search = new URLSearchParams(query).toString();
    const path = (location?.pathname ?? '/settings').replace(
      /^\/settings\/?/,
      '',
    );
    // The SDK has no hash option; keep the native app settings tab in the target URL.
    await navigate(AppPath.SettingsCatchAll, {
      '*': `${path}${search ? `?${search}` : ''}${location?.hash ?? ''}`,
    });
  };
  const saveBot = async () => {
    if (!configuration) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await invokeBotConfiguration<{ id: string }>({
        action: 'save',
        revision: configuration.revision,
        bot: draft,
      });
      setNotice(t('Bot Saved'));
      if (result.id === botId) await load();
      else await goToBot(result.id, true);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : t('Could not save bot.'),
      );
    } finally {
      setBusy(false);
    }
  };
  const removeBot = async () => {
    if (!configuration) return;
    const decision = await openCommandConfirmationModal({
      title: t('Remove Bot?'),
      subtitle: t(
        'Past comments and assignments are kept. New requests and replies will be blocked.',
      ),
      confirmButtonText: t('Remove Bot'),
      confirmButtonAccent: 'danger',
    });
    if (decision !== 'confirm') return;
    setBusy(true);
    setError('');
    try {
      await invokeBotConfiguration({
        action: 'remove',
        revision: configuration.revision,
        bot: { id: draft.id },
      });
      await goToBot(null, true);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : t('Could not remove bot.'),
      );
    } finally {
      setBusy(false);
    }
  };
  const updateDraft = (patch: Partial<BotDraft>) =>
    setDraft((previous) => ({ ...previous, ...patch }));
  const updatePolicy = (policy: Partial<OpenBotTaskPolicy>) =>
    setDraft((previous) => ({
      ...previous,
      taskPolicy: { ...previous.taskPolicy, ...policy },
    }));
  const isCurrentConfiguration = loadedBotId === botId;
  return (
    <ThemeProvider colorScheme={scheme} applyToRoot={false}>
      <Panel aria-label={t('OpenBot Settings')}>
        <Content>
          <Section.Root>
            <Section.Header
              title={
                botId
                  ? botId === 'new'
                    ? t('Add Bot')
                    : (isCurrentConfiguration && draft.name) ||
                      t('Bot Configuration')
                  : t('Bots')
              }
              description={t(
                'Configure CRM bot profiles and the webhook routines you create in OpenBot. Saving settings does not contact OpenBot.',
              )}
              actions={
                <Row>
                  {botId ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        void goToBot(null);
                      }}
                      startIcon={<IconArrowLeft size={16} />}
                    >
                      {t('All Bots')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        void goToBot('new');
                      }}
                      startIcon={<IconPlus size={16} />}
                    >
                      {t('Add Bot')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={busy}
                    aria-label={t('Refresh Bots')}
                    onClick={() => {
                      void load();
                    }}
                    startIcon={<IconRefresh size={16} />}
                  >
                    {t('Refresh')}
                  </Button>
                </Row>
              }
            />
          </Section.Root>
          {error && (
            <Notice role="alert">
              <Text>{error}</Text>
            </Notice>
          )}
          {notice && <Text role="status">{notice}</Text>}
          {(!configuration || !isCurrentConfiguration) && !error && (
            <Text role="status">{t('Loading Bots…')}</Text>
          )}
          {configuration && isCurrentConfiguration && !botId && (
            <>
              <Section.Root>
                <Section.Header
                  title={t('Bot Directory')}
                  description={t(
                    'Open a bot to edit its profile, webhook and task notification settings.',
                  )}
                />
                {configuration.bots.length === 0 && (
                  <Text color="secondary">{t('No Bots Yet')}</Text>
                )}
                {configuration.bots.map((bot) => (
                  <ListItemButton
                    key={bot.id}
                    disabled={busy}
                    onClick={() => {
                      void goToBot(bot.id);
                    }}
                    startIcon={
                      <OpenBotAvatar
                        name={bot.name}
                        avatarUrl={bot.avatarUrl}
                      />
                    }
                    description={bot.enabled ? t('Enabled') : t('Disabled')}
                    descriptionPlacement="end"
                  >
                    {bot.name}
                  </ListItemButton>
                ))}
              </Section.Root>
              <Section.Root>
                <Section.Header
                  title={t('Reply URL')}
                  description={t(
                    'OpenBot routines send signed answers to this CRM endpoint.',
                  )}
                />
                <Input
                  disabled={busy}
                  aria-label={t('Reply URL')}
                  value={replyUrl}
                  onChange={(event) => setReplyUrl(event.currentTarget.value)}
                  placeholder="https://crm.example.com/s/comments/openbot/reply"
                />
                <Button
                  size="sm"
                  disabled={busy || replyUrl === configuration.replyUrl}
                  onClick={() => {
                    setBusy(true);
                    setError('');
                    void invokeBotConfiguration({
                      action: 'reply-url',
                      revision: configuration.revision,
                      replyUrl,
                    })
                      .then(() => {
                        setNotice(t('Reply URL Saved'));
                        return load();
                      })
                      .catch((failure) =>
                        setError(
                          failure instanceof Error
                            ? failure.message
                            : t('Could not save reply URL.'),
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  {t('Save Reply URL')}
                </Button>
              </Section.Root>
            </>
          )}
          {configuration && isCurrentConfiguration && botId && (
            <>
              <Section.Root>
                <Section.Header
                  title={t('Bot Profile')}
                  actions={
                    <Switch
                      disabled={busy}
                      checked={draft.enabled}
                      aria-label={t('Bot Enabled')}
                      onCheckedChange={(enabled) =>
                        setDraft((previous) => ({ ...previous, enabled }))
                      }
                    />
                  }
                />
                <Section.Root>
                  <Section.Header title={t('Name')} />
                  <Input
                    disabled={busy}
                    aria-label={t('Bot Name')}
                    value={draft.name}
                    maxLength={80}
                    onChange={(event) =>
                      updateDraft({ name: event.currentTarget.value })
                    }
                  />
                </Section.Root>
                <Section.Root>
                  <Section.Header title={t('Avatar URL')} />
                  <Input
                    disabled={busy}
                    aria-label={t('Avatar URL')}
                    value={draft.avatarUrl ?? ''}
                    onChange={(event) =>
                      updateDraft({ avatarUrl: event.currentTarget.value })
                    }
                  />
                </Section.Root>
                {draft.id && (
                  <Text color="secondary">
                    {t('Bot ID')}: {draft.id}
                  </Text>
                )}
              </Section.Root>
              <Section.Root>
                <Section.Header
                  title={t('Webhook')}
                  description={t(
                    'Use the URL and signing secret from your manually configured OpenBot routine.',
                  )}
                />
                <Section.Root>
                  <Section.Header title={t('Webhook URL')} />
                  <Input
                    disabled={busy}
                    aria-label={t('Webhook URL')}
                    value={draft.webhookUrl}
                    onChange={(event) =>
                      updateDraft({ webhookUrl: event.currentTarget.value })
                    }
                  />
                </Section.Root>
                <Section.Root>
                  <Section.Header
                    title={t('Signing Secret')}
                    description={
                      draft.hasSecret
                        ? t(
                            'A secret is configured. Leave blank to keep it, or enter a replacement.',
                          )
                        : t('Enter a signing secret of at least 32 characters.')
                    }
                  />
                  <Input
                    disabled={busy}
                    type="password"
                    autoComplete="new-password"
                    aria-label={t('Webhook Secret')}
                    value={draft.webhookSecret}
                    onChange={(event) =>
                      updateDraft({ webhookSecret: event.currentTarget.value })
                    }
                  />
                </Section.Root>
              </Section.Root>
              <Section.Root>
                <Section.Header
                  title={t('Task Notifications')}
                  description={t(
                    'Only enabled notifications are sent. Completed tasks do not receive due or overdue reminders.',
                  )}
                />
                <Section.Root>
                  <Section.Header
                    title={t('When Assigned')}
                    actions={
                      <Switch
                        disabled={busy}
                        checked={draft.taskPolicy.onAssigned}
                        aria-label={t('Notify When Assigned')}
                        onCheckedChange={(onAssigned) =>
                          updatePolicy({ onAssigned })
                        }
                      />
                    }
                  />
                </Section.Root>
                <Section.Root>
                  <Section.Header
                    title={t('When Due')}
                    actions={
                      <Switch
                        disabled={busy}
                        checked={draft.taskPolicy.onDue}
                        aria-label={t('Notify When Due')}
                        onCheckedChange={(onDue) => updatePolicy({ onDue })}
                      />
                    }
                  />
                </Section.Root>
                <Section.Root>
                  <Section.Header
                    title={t('Before Due')}
                    description={t(
                      'Send one warning this many minutes before the due time.',
                    )}
                    actions={
                      <Switch
                        disabled={busy}
                        checked={draft.taskPolicy.warningMinutes !== null}
                        aria-label={t('Enable Due Warning')}
                        onCheckedChange={(enabled) =>
                          updatePolicy({ warningMinutes: enabled ? 60 : null })
                        }
                      />
                    }
                  />
                  {draft.taskPolicy.warningMinutes !== null && (
                    <Input
                      disabled={busy}
                      type="number"
                      min={1}
                      max={525600}
                      aria-label={t('Warning Minutes')}
                      value={String(draft.taskPolicy.warningMinutes)}
                      onChange={(event) =>
                        updatePolicy({
                          warningMinutes: Number(event.currentTarget.value),
                        })
                      }
                    />
                  )}
                </Section.Root>
                <Section.Root>
                  <Section.Header
                    title={t('Overdue Reminders')}
                    description={t(
                      'Repeat at this interval while the task remains overdue and assigned. Disable this if a custom workflow handles reminders.',
                    )}
                    actions={
                      <Switch
                        disabled={busy}
                        checked={draft.taskPolicy.overdueEveryMinutes !== null}
                        aria-label={t('Enable Overdue Reminders')}
                        onCheckedChange={(enabled) =>
                          updatePolicy({
                            overdueEveryMinutes: enabled ? 60 : null,
                          })
                        }
                      />
                    }
                  />
                  {draft.taskPolicy.overdueEveryMinutes !== null && (
                    <Input
                      disabled={busy}
                      type="number"
                      min={1}
                      max={525600}
                      aria-label={t('Overdue Interval Minutes')}
                      value={String(draft.taskPolicy.overdueEveryMinutes)}
                      onChange={(event) =>
                        updatePolicy({
                          overdueEveryMinutes: Number(
                            event.currentTarget.value,
                          ),
                        })
                      }
                    />
                  )}
                </Section.Root>
              </Section.Root>
              <Row>
                <Button
                  disabled={busy || JSON.stringify(draft) === saved}
                  onClick={() => {
                    void saveBot();
                  }}
                >
                  {busy ? t('Saving…') : t('Save Bot')}
                </Button>
                {draft.id && (
                  <Button
                    color="danger"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      void removeBot();
                    }}
                  >
                    {t('Remove Bot')}
                  </Button>
                )}
              </Row>
            </>
          )}
        </Content>
      </Panel>
    </ThemeProvider>
  );
};
