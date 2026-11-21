import { COMPUTED_FIELD_VALUE_TYPES } from 'twenty-shared/constants';
import { Text } from 'twenty-ui/primitives/typography';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { isOneToManyRelationField } from '@/object-metadata/utils/isOneToManyRelationField';
import { Select } from '@/ui/input/components/Select';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { useLingui } from '@lingui/react/macro';
import { Controller, useFormContext } from 'react-hook-form';
import { type FieldMetadataComputation } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { Field, Textarea } from 'twenty-ui/primitives/input';
import {
  FeatureFlagKey,
  FieldMetadataType,
} from '~/generated-metadata/graphql';

type SettingsDataModelFieldComputationFormProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  fieldType: FieldMetadataType;
  isCreationMode: boolean;
  disabled?: boolean;
};

const StyledFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

type ComputationFormValues = {
  computation?: FieldMetadataComputation | null;
};

export const SettingsDataModelFieldComputationForm = ({
  objectMetadataItem,
  fieldType,
  isCreationMode,
  disabled = false,
}: SettingsDataModelFieldComputationFormProps) => {
  const { t } = useLingui();
  const { control, watch } = useFormContext<ComputationFormValues>();
  const computation = watch('computation');
  const { objectMetadataItems } = useObjectMetadataItems();
  const isEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_COMPUTED_FIELDS_ENABLED,
  );
  const supportsComputation = [
    FieldMetadataType.NUMBER,
    FieldMetadataType.TEXT,
    FieldMetadataType.BOOLEAN,
    FieldMetadataType.DATE,
    FieldMetadataType.DATE_TIME,
    FieldMetadataType.SELECT,
  ].includes(fieldType);

  if (
    !isDefined(computation) &&
    (!isCreationMode || !isEnabled || !supportsComputation)
  ) {
    return null;
  }

  const relations = objectMetadataItem.fields.filter(
    (fieldMetadataItem) =>
      fieldMetadataItem.isActive && isOneToManyRelationField(fieldMetadataItem),
  );

  return (
    <Section.Root>
      <Section.Header
        title={t`Value Source`}
        description={t`Enter values manually or calculate them from your records.`}
      />
      <Controller
        name="computation"
        control={control}
        render={({
          field: { value, onChange, onBlur },
          fieldState: { error },
        }) => {
          const expressionInput = (
            property: 'expression' | 'filter' | 'orderBy',
            label: string,
            description: string,
          ) => {
            const sourceRelation =
              value?.kind === 'ROLLUP'
                ? relations.find(
                    (relation) => relation.name === value.relationFieldName,
                  )
                : undefined;
            const expressionObject =
              value?.kind === 'ROLLUP'
                ? objectMetadataItems.find(
                    (object) =>
                      object.id ===
                      sourceRelation?.relation?.targetObjectMetadata.id,
                  )
                : objectMetadataItem;
            const expression =
              value?.kind === 'FORMULA'
                ? value.expression
                : (value?.[property] ?? '');

            return (
              <Field.Root>
                <Field.Label>{label}</Field.Label>
                <Textarea
                  aria-label={label}
                  value={
                    value?.kind === 'FORMULA'
                      ? property === 'expression'
                        ? value.expression
                        : ''
                      : (value?.[property] ?? '')
                  }
                  disabled={disabled}
                  onBlur={onBlur}
                  rows={2}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      [property]:
                        property === 'filter' && !event.target.value
                          ? undefined
                          : event.target.value,
                    })
                  }
                />
                <Select
                  dropdownId={`field-computation-insert-${property}`}
                  value=""
                  disabled={disabled}
                  options={[
                    { value: '', label: t`Insert Field` },
                    ...(expressionObject?.fields ?? [])
                      .filter(
                        (field) =>
                          field.isActive &&
                          (field.type === FieldMetadataType.SELECT ||
                            field.type === FieldMetadataType.UUID ||
                            COMPUTED_FIELD_VALUE_TYPES.some(
                              (type) => type === field.type,
                            )),
                      )
                      .map((field) => ({
                        value: field.name,
                        label: field.label,
                      })),
                  ]}
                  onChange={(fieldName) => {
                    if (fieldName) {
                      onChange({
                        ...value,
                        [property]: `${expression}${fieldName}`,
                      });
                    }
                  }}
                />
                <Field.Description>{description}</Field.Description>
              </Field.Root>
            );
          };

          return (
            <StyledFields>
              <Field.Root>
                <Field.Label>{t`Calculation`}</Field.Label>
                <Select
                  dropdownId="field-computation-kind"
                  value={value?.kind ?? 'STORED'}
                  disabled={disabled || (!isEnabled && !isDefined(value))}
                  options={[
                    ...(isCreationMode
                      ? [{ value: 'STORED', label: t`Manual Entry` }]
                      : []),
                    { value: 'FORMULA', label: t`Formula` },
                    ...(fieldType !== FieldMetadataType.SELECT
                      ? [
                          {
                            value: 'ROLLUP',
                            label: t`Rollup`,
                            disabled: relations.length === 0,
                          },
                        ]
                      : []),
                  ]}
                  onChange={(kind) =>
                    onChange(
                      kind === 'STORED'
                        ? null
                        : kind === 'FORMULA'
                          ? { kind, expression: '' }
                          : {
                              kind,
                              relationFieldName: relations[0]?.name ?? '',
                              operation:
                                fieldType === FieldMetadataType.NUMBER
                                  ? 'COUNT'
                                  : 'LATEST',
                            },
                    )
                  }
                />
              </Field.Root>
              {value?.kind === 'FORMULA' &&
                expressionInput(
                  'expression',
                  t`Formula`,
                  t`Use field names, related fields such as company.name, and functions such as if, round, concat and daysSince.`,
                )}
              {value?.kind === 'ROLLUP' && (
                <>
                  <Field.Root>
                    <Field.Label>{t`Related Records`}</Field.Label>
                    <Select
                      dropdownId="field-computation-relation"
                      value={value.relationFieldName}
                      disabled={disabled}
                      options={relations.map((relation) => ({
                        value: relation.name,
                        label: relation.label,
                      }))}
                      onChange={(relationFieldName) =>
                        onChange({
                          kind: 'ROLLUP',
                          relationFieldName,
                          operation: value.operation,
                        })
                      }
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>{t`Operation`}</Field.Label>
                    <Select
                      dropdownId="field-computation-operation"
                      value={value.operation}
                      disabled={disabled}
                      options={[
                        ...(fieldType === FieldMetadataType.NUMBER
                          ? [
                              { value: 'COUNT', label: t`Count` },
                              { value: 'SUM', label: t`Sum` },
                              { value: 'AVG', label: t`Average` },
                            ]
                          : []),
                        ...(fieldType !== FieldMetadataType.BOOLEAN
                          ? [
                              { value: 'MIN', label: t`Minimum` },
                              { value: 'MAX', label: t`Maximum` },
                            ]
                          : []),
                        { value: 'LATEST', label: t`Latest Value` },
                      ]}
                      onChange={(operation) =>
                        onChange({
                          ...value,
                          operation,
                          expression:
                            operation === 'COUNT'
                              ? undefined
                              : value.expression,
                          orderBy:
                            operation === 'LATEST' ? value.orderBy : undefined,
                        })
                      }
                    />
                  </Field.Root>
                  {value.operation !== 'COUNT' &&
                    expressionInput(
                      'expression',
                      t`Value`,
                      t`Enter a field name or expression from the related records.`,
                    )}
                  {value.operation === 'LATEST' &&
                    expressionInput(
                      'orderBy',
                      t`Latest By`,
                      t`Enter the related date or number field used to find the latest record.`,
                    )}
                  {expressionInput(
                    'filter',
                    t`Condition (Optional)`,
                    t`Include only matching related records, such as status != 'DONE'.`,
                  )}
                </>
              )}
              {isDefined(value) && (
                <Text
                  size="sm"
                  color="secondary"
                >{t`Calculated values update when read and cannot be edited on records.`}</Text>
              )}
              {isDefined(error) && (
                <Field.Root invalid>
                  <Field.Error
                    match={true}
                  >{t`Check the calculation, required values and expression syntax.`}</Field.Error>
                </Field.Root>
              )}
            </StyledFields>
          );
        }}
      />
    </Section.Root>
  );
};
