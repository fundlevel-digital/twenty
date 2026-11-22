import { useRef, useState } from 'react';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { useTranslate } from 'twenty-sdk/front-component';
import { type CommentTarget, type Mention } from '../types';
import { Button, ComposerBox, Input, Row, Textarea } from './styles';

type CommentComposerProps = {
  target: CommentTarget;
  isReply?: boolean;
  disabled: boolean;
  onSubmit: (body: string, mentions: Mention[]) => Promise<boolean>;
};
export const CommentComposer = ({
  target,
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
      const matches = await new RestApiClient().post<Mention[]>('/s/comments', {
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
  return (
    <ComposerBox
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
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
      {picker === 'emoji' && (
        <Row aria-label={t('Emoji')}>
          {['😀', '👍', '❤️', '🎉', '👀', '🚀', '✅', '🙏', '🤔', '🔥'].map(
            (emoji) => (
              <Button type="button" key={emoji} onClick={() => insert(emoji)}>
                {emoji}
              </Button>
            ),
          )}
        </Row>
      )}
      {picker === 'mention' && (
        <div>
          <Input
            autoFocus
            aria-label={t('Search Users and Records')}
            placeholder={t('Search users and records…')}
            value={query}
            onChange={(event) => {
              void search(event.target.value);
            }}
          />
          {searching ? (
            <p role="status">{t('Searching…')}</p>
          ) : searchError ? (
            <p role="alert">{t('Search failed. Try again.')}</p>
          ) : results.length === 0 ? (
            <p>{t('No users or records found.')}</p>
          ) : (
            <Row>
              {results.map((mention) => (
                <Button
                  key={`${mention.objectName}:${mention.id}`}
                  type="button"
                  onClick={() => {
                    setMentions([
                      ...mentions.filter((item) => item.id !== mention.id),
                      mention,
                    ]);
                    insert(`@${mention.label} `);
                  }}
                >
                  {mention.label} ·{' '}
                  {mention.objectName === 'workspaceMember'
                    ? t('User')
                    : mention.objectName}
                </Button>
              ))}
            </Row>
          )}
        </div>
      )}
      <Row>
        <Button
          type="button"
          disabled={disabled}
          aria-label={t('Add Emoji')}
          onClick={() => setPicker(picker === 'emoji' ? null : 'emoji')}
        >
          ☺
        </Button>
        <Button
          type="button"
          disabled={disabled}
          aria-label={t('Mention a User or Record')}
          onClick={() => {
            setPicker(picker === 'mention' ? null : 'mention');
            void search('');
          }}
        >
          @
        </Button>
        <Button
          color="accent"
          variant="solid"
          type="submit"
          disabled={disabled || !body.trim()}
        >
          {isReply ? t('Reply') : t('Comment')}
        </Button>
      </Row>
    </ComposerBox>
  );
};
