import { SettingsDataModelFieldComputationForm } from '@/settings/data-model/fields/forms/components/SettingsDataModelFieldComputationForm';
import { settingsFieldComputationSchema } from '@/settings/data-model/fields/forms/validation-schemas/settingsFieldComputationSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import { FormProvider, useForm } from 'react-hook-form';
import { type FieldMetadataComputation } from 'twenty-shared/types';
import { z } from 'zod';
import { FieldMetadataType } from '~/generated-metadata/graphql';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';

jest.mock('@/workspace/hooks/useIsFeatureEnabled', () => ({
  useIsFeatureEnabled: jest.fn(() => true),
}));

jest.mock('@/object-metadata/hooks/useObjectMetadataItems', () => ({
  useObjectMetadataItems: () => ({
    objectMetadataItems: getTestEnrichedObjectMetadataItemsMock(),
  }),
}));

type TestFormValues = { computation: FieldMetadataComputation | null };
type TestFormProps = {
  onSave: (values: TestFormValues) => void;
  initialComputation?: FieldMetadataComputation;
  isCreationMode?: boolean;
};

const TestForm = ({
  onSave,
  initialComputation,
  isCreationMode = true,
}: TestFormProps) => {
  const form = useForm<TestFormValues>({
    defaultValues: { computation: initialComputation ?? null },
    resolver: zodResolver(
      z.object({ computation: settingsFieldComputationSchema.nullable() }),
    ),
  });

  return (
    <Provider store={createStore()}>
      {/* oxlint-disable-next-line react/jsx-props-no-spreading */}
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSave)}>
          <SettingsDataModelFieldComputationForm
            objectMetadataItem={getMockObjectMetadataItemOrThrow('company')}
            fieldType={FieldMetadataType.NUMBER}
            isCreationMode={isCreationMode}
          />
          <button type="submit">Save</button>
        </form>
      </FormProvider>
    </Provider>
  );
};

describe('SettingsDataModelFieldComputationForm', () => {
  beforeEach(() => jest.mocked(useIsFeatureEnabled).mockReturnValue(true));

  it('lets a member choose a formula, enter an expression and save it', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(<TestForm onSave={onSave} />);

    await user.click(screen.getByText('Manual Entry'));
    await user.click(await screen.findByText('Formula'));
    await user.type(
      screen.getByRole('textbox', { name: 'Formula' }),
      'employees * 2',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave.mock.calls[0][0]).toEqual({
      computation: { kind: 'FORMULA', expression: 'employees * 2' },
    });
  });

  it('hides calculation creation when the feature is disabled', () => {
    jest.mocked(useIsFeatureEnabled).mockReturnValue(false);
    render(<TestForm onSave={jest.fn()} />);

    expect(screen.queryByText('Value Source')).not.toBeInTheDocument();
  });

  it('lets a member configure a filtered latest-value rollup', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(<TestForm onSave={onSave} />);

    await user.click(screen.getByText('Manual Entry'));
    await user.click(await screen.findByText('Rollup'));
    await user.click(screen.getByText('Count'));
    await user.click(await screen.findByText('Latest Value'));
    await user.type(screen.getByRole('textbox', { name: 'Value' }), 'name');
    await user.type(
      screen.getByRole('textbox', { name: 'Latest By' }),
      'createdAt',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Condition (Optional)' }),
      "name != ''",
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave.mock.calls[0][0]).toMatchObject({
      computation: {
        kind: 'ROLLUP',
        operation: 'LATEST',
        expression: 'name',
        orderBy: 'createdAt',
        filter: "name != ''",
      },
    });
  });

  it('prevents saving an invalid formula and shows an error', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(
      <TestForm
        onSave={onSave}
        initialComputation={{ kind: 'FORMULA', expression: 'employees + (' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Check the calculation, required values and expression syntax.',
      ),
    ).toBeVisible();
  });

  it('keeps an existing formula editable when creation is disabled', async () => {
    jest.mocked(useIsFeatureEnabled).mockReturnValue(false);
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(
      <TestForm
        onSave={onSave}
        isCreationMode={false}
        initialComputation={{ kind: 'FORMULA', expression: 'employees * 2' }}
      />,
    );

    expect(screen.queryByText('Manual Entry')).not.toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Formula' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Formula' }),
      'employees * 3',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave.mock.calls[0][0]).toEqual({
      computation: { kind: 'FORMULA', expression: 'employees * 3' },
    });
  });
});
