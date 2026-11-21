import styled from '@emotion/styled';
import { t } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { SettingsRow } from 'twenty-ui/components/settings';
import {
  IconEye,
  IconEyeOff,
  IconFileText,
  IconUserPlus,
} from 'twenty-ui/icon';
import { Radio, RadioGroup } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';

import { type PlusvibePreferences as PlusvibePreferencesValues } from 'src/constants/preferences';

const StyledOptionContent = styled.span`
  color: ${() => themeCssVariables.font.color.secondary};
  display: grid;
  gap: ${() => themeCssVariables.spacing[2]};
  min-width: 0;
  padding-inline-end: ${() => themeCssVariables.spacing[6]};
`;

const StyledNote = styled.div`
  margin-top: ${() => themeCssVariables.spacing[2]};
`;

type PlusvibePreferencesProps = {
  preferences: PlusvibePreferencesValues;
  disabled: boolean;
  onChange: (preferences: PlusvibePreferencesValues) => void;
};

export const PlusvibePreferences = ({
  preferences,
  disabled,
  onChange,
}: PlusvibePreferencesProps) => {
  const visibilityOptions = [
    {
      value: 'METADATA',
      label: t('Metadata Only'),
      description: t('Participants and dates.'),
      Icon: IconEyeOff,
    },
    {
      value: 'SUBJECT',
      label: t('Subject'),
      description: t('Includes the subject.'),
      Icon: IconFileText,
    },
    {
      value: 'SHARE_EVERYTHING',
      label: t('Everything'),
      description: t('Full message content.'),
      Icon: IconEye,
    },
  ] as const;

  return (
    <>
      <Section.Root>
        <Section.Header
          title={t('People')}
          description={t('Choose how PlusVibe leads become People.')}
        />
        <Card.Root>
          <Card.Content>
            <SettingsRow
              checked={preferences.autoCreatePeople}
              disabled={disabled}
              startElement={
                <IconUserPlus size={themeCssVariables.icon.size.md} />
              }
              onCheckedChange={(checked) =>
                onChange({ ...preferences, autoCreatePeople: checked })
              }
            >
              {t('Create People Automatically')}
            </SettingsRow>
          </Card.Content>
        </Card.Root>
        <StyledNote>
          <Text size="sm" color="secondary">
            {t(
              'When off, existing People still match by email. Unmatched leads stay in PlusVibe Leads.',
            )}
          </Text>
        </StyledNote>
      </Section.Root>
      <Section.Root>
        <Section.Header
          title={t('Unibox Sharing')}
          description={t('Choose what other members can see in your Unibox.')}
        />
        <RadioGroup
          aria-label={t('Unibox Sharing')}
          layout="grid"
          disabled={disabled}
          value={preferences.uniboxVisibility}
          onValueChange={(value) =>
            onChange({ ...preferences, uniboxVisibility: value })
          }
        >
          {visibilityOptions.map(({ value, label, description, Icon }) => (
            <Radio key={value} variant="card" value={value} aria-label={label}>
              <StyledOptionContent>
                <Icon size={themeCssVariables.icon.size.md} />
                <Text render={<span />} weight="medium">
                  {label}
                </Text>
                <Text render={<span />} size="sm" color="secondary">
                  {description}
                </Text>
              </StyledOptionContent>
            </Radio>
          ))}
        </RadioGroup>
        <StyledNote>
          <Text size="sm" color="secondary">
            {t(
              'You keep full access. Campaign outreach is always shared with your team.',
            )}
          </Text>
        </StyledNote>
      </Section.Root>
    </>
  );
};
