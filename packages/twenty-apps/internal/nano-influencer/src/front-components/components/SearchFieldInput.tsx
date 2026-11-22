import { useState } from 'react';
import { isObject, isString } from '@sniptt/guards';
import { useTranslate } from 'twenty-sdk/front-component';
import { Dropdown } from 'twenty-ui/components/navigation';
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import { type SearchField } from '../../utils/search-fields';

export type SearchOption = { value: string; label: string };
type SearchFieldInputProps = {
  field: SearchField;
  value: unknown;
  onChange: (value: unknown) => void;
  options?: SearchOption[];
  disabled?: boolean;
};

export const SearchFieldInput = ({
  field,
  value,
  onChange,
  options,
  disabled,
}: SearchFieldInputProps) => {
  const { t } = useTranslate();
  const [query, setQuery] = useState('');
  const enumField = field.type === 'array' ? field.items : field;
  const selectOptions =
    options ??
    enumField?.enum?.map((option) => ({
      value: option,
      label: enumField.enumLabels?.[option] ?? option,
    }));
  const selectedValues = Array.isArray(value) ? value.filter(isString) : [];
  const selectionLabel = selectedValues
    .map(
      (selected) =>
        selectOptions?.find((option) => option.value === selected)?.label ??
        selected,
    )
    .join(', ');
  const selectedValue = isString(value) ? value : '';
  const renderSelect = (
    items: SearchOption[],
    current: string,
    handleChange: (value: string) => void,
  ) => (
    <Select.Root
      items={items}
      value={current}
      onValueChange={(next) => {
        if (isString(next)) handleChange(next);
      }}
      disabled={disabled}
    >
      <Select.Trigger aria-label={t(field.label)}>
        <Select.Value placeholder={t('Select')} />
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            {items.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                <Select.ItemText>{t(option.label)}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );

  if (field.type === 'object') {
    const values: Record<string, unknown> = isObject(value) ? { ...value } : {};
    return (
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: themeCssVariables.spacing[3],
        }}
      >
        <Text weight="semibold">{t(field.label)}</Text>
        <Text size="sm" color="secondary">
          {t(field.description)}
        </Text>
        {Object.entries(field.properties ?? {}).map(([key, child]) => (
          <SearchFieldInput
            key={key}
            field={child}
            value={values[key]}
            onChange={(next) => onChange({ ...values, [key]: next })}
            disabled={disabled}
          />
        ))}
      </section>
    );
  }

  return (
    <Field.Root disabled={disabled}>
      <Field.Label>{t(field.label)}</Field.Label>
      <Field.Description>{t(field.description)}</Field.Description>
      {field.type === 'array' && selectOptions ? (
        <Dropdown.Root type="picker">
          <Dropdown.Trigger
            render={<Button disabled={disabled} />}
            aria-label={t(field.label)}
          >
            {selectionLabel || t('Select')}
          </Dropdown.Trigger>
          <Dropdown.Content aria-label={t(field.label)}>
            <Dropdown.Header>
              <Dropdown.Search
                placeholder={t('Search Options')}
                value={query}
                onValueChange={setQuery}
              />
            </Dropdown.Header>
            <Dropdown.SelectionGroup
              multiple
              value={selectedValues}
              onValueChange={(next) => onChange(next)}
            >
              {selectOptions
                .filter((option) =>
                  option.label.toLowerCase().includes(query.toLowerCase()),
                )
                .map((option) => (
                  <Dropdown.OptionItem
                    key={option.value}
                    value={option.value}
                    indicator="checkbox"
                  >
                    {t(option.label)}
                  </Dropdown.OptionItem>
                ))}
            </Dropdown.SelectionGroup>
          </Dropdown.Content>
        </Dropdown.Root>
      ) : field.type === 'boolean' ? (
        renderSelect(
          [
            { value: '', label: 'Use Nano Default' },
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ],
          typeof value === 'boolean' ? String(value) : '',
          (next) => onChange(next === '' ? undefined : next === 'true'),
        )
      ) : selectOptions ? (
        renderSelect(
          [
            {
              value: '',
              label:
                field.type === 'record' || field.connectionProvider
                  ? 'Select'
                  : 'Use Nano Default',
            },
            ...selectOptions,
          ],
          selectedValue,
          (next) => onChange(next || undefined),
        )
      ) : field.type === 'array' ? (
        <Textarea
          aria-label={t(field.label)}
          value={selectedValues.join('\n')}
          placeholder={t('One Item Per Line')}
          onValueChange={(next) => onChange(next.split('\n'))}
        />
      ) : (
        <Input
          aria-label={t(field.label)}
          type={field.type === 'number' ? 'number' : 'text'}
          min={field.type === 'number' ? 0 : undefined}
          value={
            typeof value === 'number' || isString(value) ? String(value) : ''
          }
          onValueChange={(next) =>
            onChange(
              field.type === 'number'
                ? next === ''
                  ? undefined
                  : Number(next)
                : next,
            )
          }
        />
      )}
    </Field.Root>
  );
};
