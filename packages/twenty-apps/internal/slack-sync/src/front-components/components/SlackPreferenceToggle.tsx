import styled from '@emotion/styled';
import { useId } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { Switch } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledRow = styled.div`
  align-items: center;
  color: ${() => themeCssVariables.font.color.tertiary};
  display: flex;
  gap: ${() => themeCssVariables.spacing[3]};
`;
const StyledLabels = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[1]};
  min-width: 0;
`;

type SlackPreferenceToggleProps = {
  title: string;
  description: string;
  Icon: IconComponent;
  checked: boolean;
  disabled: boolean;
  divider?: boolean;
  onChange: (checked: boolean) => void;
};

export const SlackPreferenceToggle = ({
  title,
  description,
  Icon,
  checked,
  disabled,
  divider,
  onChange,
}: SlackPreferenceToggleProps) => {
  const switchId = useId();
  return (
    <Card.Content divider={divider}>
      <Card.Action
        disabled={disabled}
        render={
          <label htmlFor={switchId} aria-labelledby={`${switchId}-title`} />
        }
      />
      <StyledRow>
        <Icon size={16} />
        <StyledLabels>
          <Text id={`${switchId}-title`} weight="medium" color="primary">
            {title}
          </Text>
          <Text id={`${switchId}-description`} size="sm" color="tertiary">
            {description}
          </Text>
        </StyledLabels>
        <Card.Control>
          <Switch
            id={switchId}
            checked={checked}
            disabled={disabled}
            onCheckedChange={onChange}
            size="sm"
            aria-labelledby={`${switchId}-title`}
            aria-describedby={`${switchId}-description`}
          />
        </Card.Control>
      </StyledRow>
    </Card.Content>
  );
};
