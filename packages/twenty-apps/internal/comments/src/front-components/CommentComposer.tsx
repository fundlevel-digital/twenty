import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslate } from 'twenty-sdk/front-component';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { Text } from 'twenty-ui/primitives/typography';
import { IconAt, IconMoodSmile, IconSearch } from 'twenty-ui/icon';
import { type CommentTarget, type Mention } from '../types';
import { requestComments } from '../utils/request-comments';
import { OpenBotAvatar } from './OpenBotAvatar';
import {
  getMentionQuery,
  getMentionRanges,
  hasUnselectedMention,
  type MentionQuery,
} from '../utils/mention-draft';
import {
  Button,
  ComposerBox,
  ComposerFooter,
  ComposerInput,
  Row,
  Textarea,
} from './styles';

type CommentComposerProps = {
  target: CommentTarget;
  authorName: string;
  isReply?: boolean;
  disabled: boolean;
  onSubmit: (body: string, mentions: Mention[]) => Promise<boolean>;
};
export const CommentComposer = ({
  target,
  authorName,
  isReply = false,
  disabled,
  onSubmit,
}: CommentComposerProps) => {
  const { t } = useTranslate();
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [picker, setPicker] = useState<'mention' | 'emoji' | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Mention[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [typedMention, setTypedMention] = useState<MentionQuery | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchVersion = useRef(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  const pendingCaret = useRef<number | null>(null);
  const validationId = useId();
  const suggestionsId = useId();
  const invalidMention = hasUnselectedMention(body, mentions);
  useEffect(
    () => () => {
      searchVersion.current++;
    },
    [],
  );
  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    textarea.current?.focus();
    textarea.current?.setSelectionRange(
      pendingCaret.current,
      pendingCaret.current,
    );
    pendingCaret.current = null;
  }, [body]);
  const search = async (value: string) => {
    setQuery(value);
    setActiveIndex(0);
    const version = ++searchVersion.current;
    setSearching(true);
    setSearchError(false);
    await new Promise((resolve) => setTimeout(resolve, 180));
    if (version !== searchVersion.current) return;
    try {
      const matches = await requestComments<Mention[]>({
        ...target,
        action: 'search',
        query: value,
      });
      if (version === searchVersion.current) setResults(matches);
    } catch {
      if (version === searchVersion.current) setSearchError(true);
    } finally {
      if (version === searchVersion.current) setSearching(false);
    }
  };
  const insert = (text: string, range = selection.current) => {
    const { start, end } = range;
    setBody(body.slice(0, start) + text + body.slice(end));
    setPicker(null);
    setTypedMention(null);
    searchVersion.current++;
    const caret = start + text.length;
    selection.current = { start: caret, end: caret };
    pendingCaret.current = caret;
  };
  const selectMention = (mention: Mention) => {
    setMentions([
      ...mentions.filter(
        (item) =>
          item.id !== mention.id || item.objectName !== mention.objectName,
      ),
      mention,
    ]);
    const range = typedMention ?? selection.current;
    const separator =
      range.start > 0 && !/[\s([{]/.test(body[range.start - 1]) ? ' ' : '';
    insert(`${separator}@${mention.label} `, range);
  };
  const updateSelection = (input: HTMLTextAreaElement) => {
    selection.current = {
      start: input.selectionStart,
      end: input.selectionEnd,
    };
  };
  const updateDraft = (input: HTMLTextAreaElement) => {
    const value = input.value;
    updateSelection(input);
    setBody(value);
    const nextMention = getMentionQuery(value, input.selectionStart, mentions);
    setTypedMention(nextMention);
    if (nextMention) {
      setPicker('mention');
      void search(nextMention.query);
    } else if (picker === 'mention') {
      setPicker(null);
      searchVersion.current++;
    }
  };
  const submit = async () => {
    if (disabled || !body.trim() || invalidMention) return;
    const selectedMentions = [
      ...new Set(
        getMentionRanges(body, mentions).map(({ mention }) => mention),
      ),
    ];
    if (await onSubmit(body, selectedMentions)) {
      setBody('');
      setMentions([]);
      setPicker(null);
      setTypedMention(null);
      selection.current = { start: 0, end: 0 };
    }
  };
  const users = results.filter(
    (mention) => mention.objectName === 'workspaceMember',
  );
  const bots = results.filter((mention) =>
    ['bot', 'openbotAgent'].includes(mention.objectName),
  );
  const records = results.filter(
    (mention) =>
      !['workspaceMember', 'bot', 'openbotAgent'].includes(mention.objectName),
  );
  const orderedResults = [...users, ...bots, ...records];
  return (
    <ComposerBox
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <ComposerInput>
        <Avatar name={authorName} size="md" shape="circle" />
        <Textarea
          ref={textarea}
          aria-label={isReply ? t('Reply') : t('Comment')}
          placeholder={isReply ? t('Write a reply…') : t('Write a comment…')}
          value={body}
          aria-invalid={invalidMention || undefined}
          aria-describedby={invalidMention ? validationId : undefined}
          aria-controls={typedMention ? suggestionsId : undefined}
          aria-expanded={picker === 'mention'}
          aria-autocomplete="list"
          aria-keyshortcuts="Control+Enter Meta+Enter"
          aria-activedescendant={
            typedMention &&
            !searching &&
            !searchError &&
            orderedResults.length > 0
              ? `${suggestionsId}-${activeIndex}`
              : undefined
          }
          maxLength={10000}
          disabled={disabled}
          onChange={(event) => updateDraft(event.currentTarget)}
          onSelect={(event) => updateSelection(event.currentTarget)}
          onKeyUp={(event) => updateSelection(event.currentTarget)}
          onCompositionEnd={(event) => updateDraft(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void submit();
              return;
            }
            if (
              picker !== 'mention' ||
              !typedMention ||
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setPicker(null);
              setTypedMention(null);
            } else if (
              !searching &&
              !searchError &&
              orderedResults.length > 0
            ) {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                const nextIndex =
                  (activeIndex + direction + orderedResults.length) %
                  orderedResults.length;
                setActiveIndex(nextIndex);
                document
                  .getElementById(`${suggestionsId}-${nextIndex}`)
                  ?.scrollIntoView?.({ block: 'nearest' });
              } else if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                selectMention(orderedResults[activeIndex]);
              }
            }
          }}
        />
      </ComposerInput>
      {invalidMention && (
        <Text id={validationId} size="sm" color="secondary" role="status">
          {t(
            'Choose a user, bot, or record from the suggestions, or remove the @ mention.',
          )}
        </Text>
      )}
      <ComposerFooter>
        <Row>
          <Dropdown.Root
            type="picker"
            open={picker === 'emoji'}
            onOpenChange={(open) => setPicker(open ? 'emoji' : null)}
          >
            <Dropdown.Trigger
              render={
                <LightIconButton
                  type="button"
                  size="xs"
                  disabled={disabled}
                  aria-label={t('Add Emoji')}
                  tooltip={t('Add Emoji')}
                >
                  <IconMoodSmile size={16} stroke={1.6} />
                </LightIconButton>
              }
            />
            <Dropdown.Content align="start">
              <Dropdown.Section label={t('Emoji')} columns={5}>
                {[
                  '😀',
                  '👍',
                  '❤️',
                  '🎉',
                  '👀',
                  '🚀',
                  '✅',
                  '🙏',
                  '🤔',
                  '🔥',
                ].map((emoji) => (
                  <Dropdown.ActionItem
                    key={emoji}
                    onClick={() => insert(emoji)}
                  >
                    {emoji}
                  </Dropdown.ActionItem>
                ))}
              </Dropdown.Section>
            </Dropdown.Content>
          </Dropdown.Root>
          <Dropdown.Root
            type="picker"
            open={picker === 'mention'}
            onOpenChange={(open) => {
              setPicker(open ? 'mention' : null);
              setTypedMention(null);
              if (!open) searchVersion.current++;
              if (open) {
                const nextMention = getMentionQuery(
                  body,
                  selection.current.start,
                  mentions,
                );
                setTypedMention(nextMention);
                void search(nextMention?.query ?? '');
              }
            }}
            onInteractOutside={(event) => {
              if (typedMention && event.target === textarea.current)
                event.preventDefault();
            }}
          >
            <Dropdown.Trigger
              render={
                <LightIconButton
                  type="button"
                  size="xs"
                  disabled={disabled}
                  aria-label={t('Mention a User, Bot, or Record')}
                  tooltip={t('Mention a User, Bot, or Record')}
                >
                  <IconAt size={16} stroke={1.6} />
                </LightIconButton>
              }
            />
            <Dropdown.Content
              id={suggestionsId}
              align="start"
              initialFocus={typedMention ? false : undefined}
              finalFocus={false}
            >
              {!typedMention && (
                <Dropdown.Search
                  aria-label={t('Search Users, Bots, and Records')}
                  placeholder={t('Search users, bots, and records…')}
                  value={query}
                  onValueChange={(value) => {
                    void search(value);
                  }}
                />
              )}
              {searching ? (
                <Dropdown.Loading>{t('Searching…')}</Dropdown.Loading>
              ) : searchError ? (
                <Dropdown.Empty>
                  {t('Search failed. Try again.')}
                </Dropdown.Empty>
              ) : results.length === 0 ? (
                <Dropdown.Empty>
                  <IconSearch size={16} stroke={1.6} />
                  {t('No users, bots, or records found.')}
                </Dropdown.Empty>
              ) : (
                <Dropdown.Section scrollable>
                  {[
                    { label: t('Users'), values: users },
                    { label: t('Bots'), values: bots },
                    { label: t('Records'), values: records },
                  ]
                    .filter((group) => group.values.length)
                    .map((group) => (
                      <Dropdown.Section key={group.label} label={group.label}>
                        {group.values.map((mention) => (
                          <Dropdown.OptionItem
                            key={`${mention.objectName}:${mention.id}`}
                            id={`${suggestionsId}-${orderedResults.indexOf(mention)}`}
                            selected={
                              !!typedMention &&
                              orderedResults[activeIndex] === mention
                            }
                            indicator="none"
                            aria-label={`${mention.label} · ${mention.objectName === 'workspaceMember' ? t('User') : ['bot', 'openbotAgent'].includes(mention.objectName) ? t('Bot') : mention.objectName}`}
                            startIcon={
                              ['bot', 'openbotAgent'].includes(
                                mention.objectName,
                              ) ? (
                                <OpenBotAvatar
                                  name={mention.label}
                                  avatarUrl={mention.avatarUrl}
                                />
                              ) : (
                                <Avatar
                                  name={mention.label}
                                  size="xs"
                                  shape={
                                    mention.objectName === 'workspaceMember'
                                      ? 'circle'
                                      : 'rounded-square'
                                  }
                                />
                              )
                            }
                            onMouseDown={(event) => {
                              if (typedMention) event.preventDefault();
                            }}
                            onSelect={() => selectMention(mention)}
                          >
                            {mention.label}
                          </Dropdown.OptionItem>
                        ))}
                      </Dropdown.Section>
                    ))}
                </Dropdown.Section>
              )}
            </Dropdown.Content>
          </Dropdown.Root>
        </Row>
        <Button
          color="accent"
          variant="solid"
          size="sm"
          type="submit"
          disabled={disabled || !body.trim() || invalidMention}
        >
          {isReply ? t('Reply') : t('Comment')}
        </Button>
      </ComposerFooter>
    </ComposerBox>
  );
};
