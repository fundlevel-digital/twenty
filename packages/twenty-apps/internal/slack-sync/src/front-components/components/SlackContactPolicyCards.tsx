import styled from '@emotion/styled';
import { useId } from 'react';
import { t } from 'twenty-sdk/front-component';
import { Radio, RadioGroup } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import { type ContactPreferences } from 'src/types/contact-preferences.type';
import { SlackContactPolicyIcon } from 'src/front-components/components/SlackContactPolicyIcon';

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${() => themeCssVariables.spacing[4]};
`;
const StyledLabels = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[2]};
  min-width: 0;
`;

type SlackContactPolicyCardsProps = {
  value: ContactPreferences['policy'];
  disabled: boolean;
  onChange: (policy: ContactPreferences['policy']) => void;
};

export const SlackContactPolicyCards = ({
  value,
  disabled,
  onChange,
}: SlackContactPolicyCardsProps) => {
  const groupId = useId();
  const options = [
    {
      value: 'SENT_AND_RECEIVED' as const,
      title: t('Sent and received'),
      description: t(
        'People in conversations you send or receive messages in.',
      ),
      isSentActive: true,
      isReceivedActive: true,
    },
    {
      value: 'SENT' as const,
      title: t('Sent'),
      description: t('People in conversations where you send a message.'),
      isSentActive: true,
      isReceivedActive: false,
    },
    {
      value: 'NONE' as const,
      title: t('None'),
      description: t('Only link existing contacts. Don’t create new ones.'),
      isSentActive: false,
      isReceivedActive: false,
    },
  ];
  return (
    <RadioGroup
      aria-label={t('Contact auto-creation')}
      value={value}
      disabled={disabled}
      onValueChange={onChange}
    >
      <Card.Root fullWidth>
        {options.map((option, index) => {
          const radioId = `${groupId}-${option.value}`;
          return (
            <Card.Content
              key={option.value}
              divider={index < options.length - 1}
            >
              <Card.Action
                disabled={disabled}
                render={
                  <label
                    htmlFor={radioId}
                    aria-labelledby={`${radioId}-title`}
                  />
                }
              />
              <StyledRow>
                <SlackContactPolicyIcon
                  isSentActive={option.isSentActive}
                  isReceivedActive={option.isReceivedActive}
                />
                <StyledLabels>
                  <Text id={`${radioId}-title`} weight="medium" color="primary">
                    {option.title}
                  </Text>
                  <Text
                    id={`${radioId}-description`}
                    size="sm"
                    color="tertiary"
                  >
                    {option.description}
                  </Text>
                </StyledLabels>
                <Card.Control>
                  <Radio
                    id={radioId}
                    value={option.value}
                    aria-labelledby={`${radioId}-title`}
                    aria-describedby={`${radioId}-description`}
                  />
                </Card.Control>
              </StyledRow>
            </Card.Content>
          );
        })}
      </Card.Root>
    </RadioGroup>
  );
};
