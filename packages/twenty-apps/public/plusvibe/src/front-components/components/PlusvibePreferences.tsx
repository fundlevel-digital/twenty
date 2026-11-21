import { useState } from 'react';
import styled from '@emotion/styled';
import { t } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { SettingsRow } from 'twenty-ui/components/settings';
import {
  IconEye,
  IconEyeOff,
  IconFileText,
  IconUserOff,
  IconMail,
  IconSend,
} from 'twenty-ui/icon';
import {
  Button,
  Field,
  Input,
  Radio,
  RadioGroup,
} from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';

import {
  INTERNAL_DOMAIN_SCHEMA,
  type PlusvibePreferences as PlusvibePreferencesValues,
} from 'src/constants/preferences';

const StyledOptionContent = styled.span`
  color: ${() => themeCssVariables.font.color.secondary};
  display: grid;
  gap: ${() => themeCssVariables.spacing[2]};
  min-width: 0;
  padding-inline-end: ${() => themeCssVariables.spacing[6]};
`;

const StyledDomainRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${() => themeCssVariables.spacing[2]};
  margin-top: ${() => themeCssVariables.spacing[2]};
`;

const StyledNote = styled.div`
  margin-top: ${() => themeCssVariables.spacing[2]};
`;

type PlusvibePreferencesProps = {
  preferences: PlusvibePreferencesValues;
  disabled: boolean;
  onChange: (preferences: PlusvibePreferencesValues) => Promise<boolean>;
};

export const PlusvibePreferences = ({
  preferences,
  disabled,
  onChange,
}: PlusvibePreferencesProps) => {
  const [domainText, setDomainText] = useState(
    preferences.internalDomains.join(', '),
  );
  const [domainError, setDomainError] = useState<string>();
  const creationOptions = [
    {
      value: 'SENT_AND_RECEIVED',
      label: t('Sent and Received'),
      description: t('People you email and hear from.'),
      Icon: IconMail,
    },
    {
      value: 'SENT',
      label: t('Sent'),
      description: t('People you have emailed.'),
      Icon: IconSend,
    },
    {
      value: 'NONE',
      label: t('None'),
      description: t('Only match existing People.'),
      Icon: IconUserOff,
    },
  ] as const;
  const saveDomains = async () => {
    const domains = [
      ...new Set(
        domainText
          .split(/[,;\s]+/)
          .filter(Boolean)
          .map((domain) => domain.trim().toLowerCase()),
      ),
    ];
    if (
      domains.length > 50 ||
      domains.some(
        (domain) => !INTERNAL_DOMAIN_SCHEMA.safeParse(domain).success,
      )
    ) {
      setDomainError(t('Enter valid domains separated by commas.'));
      return;
    }
    setDomainError(undefined);
    if (await onChange({ ...preferences, internalDomains: domains }))
      setDomainText(domains.join(', '));
    else setDomainText(preferences.internalDomains.join(', '));
  };
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
          title={t('People Auto-Creation')}
          description={t(
            'Create People from email activity, just like your connected email accounts.',
          )}
        />
        <RadioGroup
          aria-label={t('People Auto-Creation')}
          layout="grid"
          disabled={disabled}
          value={preferences.contactAutoCreationPolicy}
          onValueChange={(value) =>
            onChange({ ...preferences, contactAutoCreationPolicy: value })
          }
        >
          {creationOptions.map(({ value, label, description, Icon }) => (
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
              'The lead directory stays in PlusVibe Leads. Existing People still match by email with any policy.',
            )}
          </Text>
        </StyledNote>
      </Section.Root>
      <Section.Root>
        <Section.Header
          title={t('Internal Employees')}
          description={t(
            'Keep your own team out of automatic contact creation.',
          )}
        />
        <Card.Root>
          <Card.Content>
            <SettingsRow
              checked={preferences.excludeInternalPeople}
              disabled={disabled}
              startElement={
                <IconUserOff size={themeCssVariables.icon.size.md} />
              }
              onCheckedChange={(checked) =>
                onChange({ ...preferences, excludeInternalPeople: checked })
              }
            >
              {t('Exclude Internal Employees')}
            </SettingsRow>
          </Card.Content>
        </Card.Root>
        <StyledNote>
          <Text size="sm" color="secondary">
            {t(
              'Workspace members and sending addresses are always excluded. When enabled, coworkers on the same business domains are excluded too.',
            )}
          </Text>
        </StyledNote>
        <StyledNote>
          <Field.Root>
            <Field.Label>{t('Internal Domains')}</Field.Label>
            <StyledDomainRow>
              <Input
                aria-label={t('Internal Domains')}
                value={domainText}
                placeholder="acme.com, team.acme.com"
                disabled={disabled}
                onValueChange={(value) => {
                  setDomainText(value);
                  setDomainError(undefined);
                }}
              />
              <Button disabled={disabled} onClick={saveDomains}>
                {t('Save Domains')}
              </Button>
            </StyledDomainRow>
            <Field.Description>
              {t(
                'Additional employee domains, including their subdomains. Separate with commas.',
              )}
            </Field.Description>
            {domainError && <Text size="sm">{domainError}</Text>}
          </Field.Root>
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
