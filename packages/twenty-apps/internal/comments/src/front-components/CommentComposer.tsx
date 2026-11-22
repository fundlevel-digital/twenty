import { useRef, useState } from 'react';
import { useTranslate } from 'twenty-sdk/front-component';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { IconAt, IconMoodSmile, IconSearch } from 'twenty-ui/icon';
import { type CommentTarget, type Mention } from '../types';
import { requestComments } from '../utils/request-comments';
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
  const searchVersion = useRef(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const search = async (value: string) => {
    setQuery(value);
    const version = ++searchVersion.current;
    setSearching(true);
    setSearchError(false);
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
  const insert = (text: string) => {
    const start = textarea.current?.selectionStart ?? body.length;
    const end = textarea.current?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + text + body.slice(end));
    setPicker(null);
    textarea.current?.focus();
  };
  const submit = async () => {
    if (disabled || !body.trim()) return;
    if (await onSubmit(body, mentions)) {
      setBody('');
      setMentions([]);
      setPicker(null);
    }
  };
  const users = results.filter(
    (mention) => mention.objectName === 'workspaceMember',
  );
  const records = results.filter(
    (mention) => mention.objectName !== 'workspaceMember',
  );
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
          maxLength={10000}
          disabled={disabled}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
        />
      </ComposerInput>
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
              if (open) void search('');
            }}
          >
            <Dropdown.Trigger
              render={
                <LightIconButton
                  type="button"
                  size="xs"
                  disabled={disabled}
                  aria-label={t('Mention a User or Record')}
                  tooltip={t('Mention a User or Record')}
                >
                  <IconAt size={16} stroke={1.6} />
                </LightIconButton>
              }
            />
            <Dropdown.Content align="start">
              <Dropdown.Search
                aria-label={t('Search Users and Records')}
                placeholder={t('Search users and records…')}
                value={query}
                onValueChange={(value) => {
                  void search(value);
                }}
              />
              {searching ? (
                <Dropdown.Loading>{t('Searching…')}</Dropdown.Loading>
              ) : searchError ? (
                <Dropdown.Empty>
                  {t('Search failed. Try again.')}
                </Dropdown.Empty>
              ) : results.length === 0 ? (
                <Dropdown.Empty>
                  <IconSearch size={16} stroke={1.6} />
                  {t('No users or records found.')}
                </Dropdown.Empty>
              ) : (
                <>
                  {[
                    { label: t('Users'), values: users },
                    { label: t('Records'), values: records },
                  ]
                    .filter((group) => group.values.length)
                    .map((group) => (
                      <Dropdown.Section
                        key={group.label}
                        label={group.label}
                        scrollable
                      >
                        {group.values.map((mention) => (
                          <Dropdown.ActionItem
                            key={`${mention.objectName}:${mention.id}`}
                            aria-label={`${mention.label} · ${mention.objectName === 'workspaceMember' ? t('User') : mention.objectName}`}
                            startIcon={
                              <Avatar
                                name={mention.label}
                                size="xs"
                                shape={
                                  mention.objectName === 'workspaceMember'
                                    ? 'circle'
                                    : 'rounded-square'
                                }
                              />
                            }
                            onClick={() => {
                              setMentions([
                                ...mentions.filter(
                                  (item) => item.id !== mention.id,
                                ),
                                mention,
                              ]);
                              insert(`@${mention.label} `);
                            }}
                          >
                            {mention.label}
                          </Dropdown.ActionItem>
                        ))}
                      </Dropdown.Section>
                    ))}
                </>
              )}
            </Dropdown.Content>
          </Dropdown.Root>
        </Row>
        <Button
          color="accent"
          variant="solid"
          size="sm"
          type="submit"
          disabled={disabled || !body.trim()}
        >
          {isReply ? t('Reply') : t('Comment')}
        </Button>
      </ComposerFooter>
    </ComposerBox>
  );
};
