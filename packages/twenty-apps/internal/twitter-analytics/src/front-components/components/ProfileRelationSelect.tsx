import { isString } from '@sniptt/guards';
import { useRef } from 'react';
import { Select } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

type ProfileRelationSelectProps = {
  id: string;
  label: string;
  descriptionId: string;
  value: string;
  disabled: boolean;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
};

export const ProfileRelationSelect = ({
  id,
  label,
  descriptionId,
  value,
  disabled,
  options,
  onValueChange,
}: ProfileRelationSelectProps) => {
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={portalContainerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: themeCssVariables.spacing[4],
        position: 'relative',
      }}
    >
      <Select.Root
        items={options}
        value={value}
        disabled={disabled}
        onValueChange={(nextValue) => {
          if (isString(nextValue)) onValueChange(nextValue);
        }}
      >
        <Select.Label>{label}</Select.Label>
        <Select.Trigger
          id={id}
          aria-describedby={descriptionId}
          style={{ width: '100%' }}
        >
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Portal container={portalContainerRef}>
          <Select.Positioner align="start" alignItemWithTrigger={false}>
            <Select.Popup>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  onClick={(event) => {
                    // Older embedded hosts omit this alias on keyboard-generated clicks.
                    if (!event.nativeEvent)
                      Object.defineProperty(event, 'nativeEvent', {
                        value: event,
                      });
                  }}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};
