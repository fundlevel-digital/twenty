import { useId, useState } from 'react';
import { useTranslate } from 'twenty-sdk/front-component';
import { Chip } from 'twenty-ui/primitives/data-display';
import { Button, Input } from 'twenty-ui/primitives/input';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconX } from 'twenty-ui/icon';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';

import { MAX_YOUTUBE_TIMEFRAMES } from 'src/constants/youtube-timeframe-limits.constant';
import { parseYoutubeTimeframe } from 'src/utils/parse-youtube-timeframe.util';

type TimeframeTagsProps = {
  label: string;
  description: string;
  values: number[];
  disabled: boolean;
  onChange: (values: number[]) => void;
  onDraftChange: (value: string) => void;
};

export const TimeframeTags = ({
  label,
  description,
  values,
  disabled,
  onChange,
  onDraftChange,
}: TimeframeTagsProps) => {
  const { t } = useTranslate();
  const inputId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const addDay = () => {
    const days = parseYoutubeTimeframe(draft);
    if (days === null) {
      setError(t('Enter a whole number from 1 to 366.'));
      return;
    }
    if (values.includes(days)) {
      setError(t('This timeframe is already added.'));
      return;
    }
    if (values.length >= MAX_YOUTUBE_TIMEFRAMES) {
      setError(t('Add up to 10 timeframes.'));
      return;
    }
    onChange([...values, days]);
    setDraft('');
    onDraftChange('');
    setError(null);
  };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: themeCssVariables.spacing[2],
      }}
    >
      <Text
        size="xs"
        weight="medium"
        color="secondary"
        render={<label htmlFor={inputId} />}
      >
        {label}
      </Text>
      <Text size="sm" color="secondary">
        {description}
      </Text>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: themeCssVariables.spacing[2],
        }}
      >
        {values.map((days) => (
          <Chip
            key={days}
            size="md"
            variant="outline"
            shape="round"
            truncate={false}
            endElement={
              <LightIconButton
                size="xs"
                type="button"
                aria-label={t('Remove {days} Days From {label}', {
                  days,
                  label,
                })}
                disabled={disabled}
                onClick={() => {
                  onChange(values.filter((value) => value !== days));
                  setError(null);
                }}
              >
                <IconX size={16} />
              </LightIconButton>
            }
          >
            {t(days === 1 ? '{days} Day' : '{days} Days', { days })}
          </Chip>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          gap: themeCssVariables.spacing[2],
          alignItems: 'center',
        }}
      >
        <Input
          id={inputId}
          inputMode="numeric"
          placeholder={t('Days')}
          value={draft}
          disabled={disabled || values.length >= MAX_YOUTUBE_TIMEFRAMES}
          aria-invalid={error !== null}
          aria-describedby={error !== null ? errorId : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            onDraftChange(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              addDay();
            }
          }}
        />
        <Button
          type="button"
          disabled={disabled || values.length >= MAX_YOUTUBE_TIMEFRAMES}
          onClick={addDay}
        >
          {t('Add')}
        </Button>
      </div>
      {error !== null && (
        <Text
          id={errorId}
          role="alert"
          style={{ color: themeCssVariables.font.color.danger }}
        >
          {error}
        </Text>
      )}
      {values.length === 0 && (
        <Text style={{ color: themeCssVariables.font.color.danger }}>
          {t('Add at least one timeframe.')}
        </Text>
      )}
    </div>
  );
};
