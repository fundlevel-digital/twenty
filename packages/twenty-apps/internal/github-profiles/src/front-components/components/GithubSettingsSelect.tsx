import { useId, useRef } from 'react';
import { Field, Select } from 'twenty-ui/primitives/input';

type GithubSettingsSelectProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
};
export const GithubSettingsSelect = ({
  label,
  value,
  options,
  disabled,
  onChange,
}: GithubSettingsSelectProps) => {
  const selectId = `github-profiles-${useId()}`;
  const portalContainer = useRef<HTMLDivElement>(null);
  return (
    <div ref={portalContainer} style={{ position: 'relative' }}>
      <Field.Root>
        <Field.Label id={`${selectId}-label`}>{label}</Field.Label>
        <Select.Root
          id={selectId}
          value={
            options.some((option) => option.value === value) ? value : null
          }
          items={options}
          disabled={disabled}
          onValueChange={(value) => {
            if (typeof value === 'string') onChange(value);
          }}
        >
          <Select.Trigger
            id={selectId}
            aria-label={label}
            aria-labelledby={`${selectId}-label`}
          >
            <Select.Value placeholder={label} />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal container={portalContainer}>
            <Select.Positioner
              align="start"
              sideOffset={4}
              alignItemWithTrigger={false}
            >
              <Select.Popup id={`${selectId}-listbox`} aria-label={label}>
                {options.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </Field.Root>
    </div>
  );
};
