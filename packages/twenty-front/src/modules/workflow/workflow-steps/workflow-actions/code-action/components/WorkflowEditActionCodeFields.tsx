import { FormNestedFieldInputContainer } from '@/object-record/record-field/ui/form-types/components/FormNestedFieldInputContainer';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { WorkflowEditActionCodeFieldLeaf } from '@/workflow/workflow-steps/workflow-actions/code-action/components/WorkflowEditActionCodeFieldLeaf';
import { getInputSchemaPropertyAtPath } from '@/workflow/workflow-steps/workflow-actions/code-action/utils/getInputSchemaPropertyAtPath';
import { getWorkflowCodeFieldsLeafKind } from '@/workflow/workflow-steps/workflow-actions/code-action/utils/getWorkflowCodeFieldsLeafKind';
import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { isPlainObject } from 'twenty-shared/utils';
import { type FunctionInput, type InputSchema } from 'twenty-shared/workflow';
import { themeCssVariables } from 'twenty-ui/theme';
import { Text } from 'twenty-ui/primitives/typography';

const StyledField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledContainer = styled.div<{ fullWidth?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};

  > * {
    flex: 1;
    min-width: ${({ fullWidth }) => (fullWidth ? '100%' : '200px')};
  }
`;

type WorkflowEditActionCodeFieldsProps = {
  functionInput: FunctionInput;
  path?: string[];
  readonly?: boolean;
  onInputChange?: (value: unknown, path: string[]) => void | Promise<void>;
  VariablePicker?: VariablePickerComponent;
  fullWidth?: boolean;
  inputSchema?: InputSchema;
};

export const WorkflowEditActionCodeFields = ({
  functionInput,
  path = [],
  readonly,
  onInputChange,
  VariablePicker,
  fullWidth,
  inputSchema,
}: WorkflowEditActionCodeFieldsProps) => {
  return (
    <StyledContainer fullWidth={fullWidth}>
      {Object.entries(functionInput ?? {}).map(([inputKey, inputValue]) => {
        const currentPath = [...path, inputKey];
        const pathKey = currentPath.join('.');

        const schemaProperty = getInputSchemaPropertyAtPath(
          inputSchema,
          currentPath,
        );
        if (schemaProperty?.hidden === true) return null;

        const displayLabel = isNonEmptyString(schemaProperty?.label)
          ? schemaProperty.label
          : inputKey;

        const leafKind = getWorkflowCodeFieldsLeafKind(schemaProperty);
        const isNestedObject =
          isPlainObject(inputValue) &&
          leafKind !== 'record' &&
          leafKind !== 'record-array';

        if (isNestedObject) {
          return (
            <StyledField key={pathKey}>
              <InputLabel>{displayLabel}</InputLabel>
              {isNonEmptyString(schemaProperty?.description) && (
                <Text size="sm" color="secondary">
                  {schemaProperty.description}
                </Text>
              )}
              <FormNestedFieldInputContainer>
                <WorkflowEditActionCodeFields
                  functionInput={inputValue}
                  path={currentPath}
                  readonly={readonly}
                  onInputChange={onInputChange}
                  VariablePicker={VariablePicker}
                  fullWidth={fullWidth}
                  inputSchema={inputSchema}
                />
              </FormNestedFieldInputContainer>
            </StyledField>
          );
        }

        return (
          <StyledField key={pathKey}>
            <WorkflowEditActionCodeFieldLeaf
              label={displayLabel}
              inputValue={inputValue}
              schemaProperty={schemaProperty}
              readonly={readonly}
              onChange={(value) => onInputChange?.(value, currentPath)}
              VariablePicker={VariablePicker}
            />
            {isNonEmptyString(schemaProperty?.description) && (
              <Text size="sm" color="secondary">
                {schemaProperty.description}
              </Text>
            )}
          </StyledField>
        );
      })}
    </StyledContainer>
  );
};
