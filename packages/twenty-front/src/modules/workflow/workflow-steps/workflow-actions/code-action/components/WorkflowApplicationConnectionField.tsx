import { useQuery } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';

import { FIND_ONE_APPLICATION_BY_UNIVERSAL_IDENTIFIER } from '@/applications/graphql/queries/findOneApplicationByUniversalIdentifier';
import { FormSelectFieldInput } from '@/object-record/record-field/ui/form-types/components/FormSelectFieldInput';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { getWorkflowConnectionSelectOptions } from '@/workflow/workflow-steps/workflow-actions/code-action/utils/getWorkflowConnectionSelectOptions';
import { type InputSchemaProperty } from 'twenty-shared/workflow';
import { type FindOneApplicationByUniversalIdentifierQuery } from '~/generated-metadata/graphql';
import { useApplicationConnectedAccounts } from '~/pages/settings/applications/hooks/useApplicationConnectedAccounts';
import { useFindApplicationConnectionProviders } from '~/pages/settings/applications/hooks/useFindApplicationConnectionProviders';

type WorkflowApplicationConnectionFieldProps = {
  label: string;
  inputValue: unknown;
  connectionProvider: NonNullable<InputSchemaProperty['connectionProvider']>;
  readonly?: boolean;
  onChange: (value: unknown) => void;
  VariablePicker?: VariablePickerComponent;
};

export const WorkflowApplicationConnectionField = ({
  label,
  inputValue,
  connectionProvider,
  readonly,
  onChange,
  VariablePicker,
}: WorkflowApplicationConnectionFieldProps) => {
  const { t } = useLingui();
  const {
    data,
    loading: applicationLoading,
    error,
  } = useQuery<FindOneApplicationByUniversalIdentifierQuery>(
    FIND_ONE_APPLICATION_BY_UNIVERSAL_IDENTIFIER,
    {
      variables: {
        universalIdentifier: connectionProvider.applicationUniversalIdentifier,
      },
    },
  );
  const applicationId = data?.findOneApplication?.id ?? '';
  const { connectionProviders, loading: providersLoading } =
    useFindApplicationConnectionProviders(applicationId);
  const { accounts, loading: accountsLoading } =
    useApplicationConnectedAccounts(applicationId);
  const providerIds = new Set(
    connectionProviders
      .filter(
        (provider) =>
          provider.name === connectionProvider.providerName &&
          provider.scope === connectionProvider.scope,
      )
      .map((provider) => provider.id),
  );
  const options = getWorkflowConnectionSelectOptions({
    accounts,
    providerIds,
    fallbackLabel: t`Connection`,
    reconnectLabel: (name) => t`${name} (Reconnect Required)`,
  });
  const loading = applicationLoading || providersLoading || accountsLoading;

  return (
    <FormSelectFieldInput
      label={label}
      defaultValue={isNonEmptyString(inputValue) ? inputValue : undefined}
      options={options}
      readonly={readonly || loading || !!error}
      placeholder={
        loading
          ? t`Loading Connections…`
          : error
            ? t`Could Not Load Connections`
            : t`Select A Connection`
      }
      onChange={onChange}
      VariablePicker={VariablePicker}
      isNullable
    />
  );
};
