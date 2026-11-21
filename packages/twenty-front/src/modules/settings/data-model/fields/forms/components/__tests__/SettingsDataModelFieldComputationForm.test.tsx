import { SettingsDataModelFieldComputationForm } from '@/settings/data-model/fields/forms/components/SettingsDataModelFieldComputationForm';
import { settingsFieldComputationSchema } from '@/settings/data-model/fields/forms/validation-schemas/settingsFieldComputationSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { ValidationRuleExpressionEditor } from '@/validation-rules/components/ValidationRuleExpressionEditor';
import { render, screen, waitFor } from '@testing-library/react';
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
  disabled?: boolean;
};

const TestForm = ({
  onSave,
  initialComputation,
  isCreationMode = true,
  disabled = false,
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
            storedComputation={initialComputation}
            disabled={disabled}
          />
          <button type="submit">Save</button>
        </form>
      </FormProvider>
    </Provider>
  );
};

describe('SettingsDataModelFieldComputationForm', () => {
  const scrollIntoView = HTMLElement.prototype.scrollIntoView;
  const elementFromPoint = document.elementFromPoint;
  const getClientRects = Range.prototype.getClientRects;
  const getBoundingClientRect = Range.prototype.getBoundingClientRect;

  beforeAll(() => {
    // jsdom lacks the layout APIs used by ProseMirror selection.
    HTMLElement.prototype.scrollIntoView = jest.fn();
    document.elementFromPoint = jest.fn(() => null);
    Object.defineProperty(Range.prototype, 'getClientRects', {
      configurable: true,
      writable: true,
      value: jest.fn(() => []),
    });
    Range.prototype.getBoundingClientRect = jest.fn(() => new DOMRect());
  });

  afterAll(() => {
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    document.elementFromPoint = elementFromPoint;
    Range.prototype.getClientRects = getClientRects;
    Range.prototype.getBoundingClientRect = getBoundingClientRect;
  });

  beforeEach(() => jest.mocked(useIsFeatureEnabled).mockReturnValue(true));

  it('lets a member choose a formula, enter an expression and save it', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(<TestForm onSave={onSave} />);

    await user.click(screen.getByText('Manual Entry'));
    await user.click(await screen.findByText('Formula'));
    await user.type(
      screen.getByRole('textbox', { name: 'Formula' }),
      'round(employees * 2, 0)',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave.mock.calls[0][0]).toEqual({
      computation: { kind: 'FORMULA', expression: 'round(employees * 2, 0)' },
    });
  });

  it('hides calculation creation when the feature is disabled', () => {
    jest.mocked(useIsFeatureEnabled).mockReturnValue(false);
    render(<TestForm onSave={jest.fn()} />);

    expect(screen.queryByText('Value Source')).not.toBeInTheDocument();
  });

  it('saves a suggested field chip using its API name', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(
      <TestForm
        onSave={onSave}
        initialComputation={{ kind: 'FORMULA', expression: '' }}
      />,
    );

    await user.click(screen.getByRole('option', { name: 'Employees' }));
    await user.paste(' * 2');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave.mock.calls[0][0]).toEqual({
      computation: { kind: 'FORMULA', expression: 'employees * 2' },
    });
  });

  it('inserts a suggested function with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <TestForm
        onSave={jest.fn()}
        initialComputation={{ kind: 'FORMULA', expression: '' }}
      />,
    );
    const editor = screen.getByRole('textbox', { name: 'Formula' });

    await user.type(editor, 'rou');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'round' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.keyboard('{Enter}');

    expect(editor).toHaveTextContent('round()');
  });

  it('suggests the numeric amount inside a currency field', async () => {
    const user = userEvent.setup();
    render(
      <TestForm
        onSave={jest.fn()}
        initialComputation={{ kind: 'FORMULA', expression: '' }}
      />,
    );

    await user.type(
      screen.getByRole('textbox', { name: 'Formula' }),
      'annualRecurringRevenue.',
    );

    expect(screen.getByRole('option', { name: 'Amount' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'Currency' })).toBeVisible();
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

  it('keeps app-owned calculations read-only and hides insertion controls', () => {
    render(
      <TestForm
        onSave={jest.fn()}
        initialComputation={{ kind: 'FORMULA', expression: 'employees * 2' }}
        isCreationMode={false}
        disabled
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Formula' })).toHaveAttribute(
      'contenteditable',
      'false',
    );
    expect(
      screen.queryByRole('listbox', { name: 'Suggestions' }),
    ).not.toBeInTheDocument();
  });

  it('updates editor access when saving disables the form', async () => {
    const onSave = jest.fn();
    const initialComputation = {
      kind: 'FORMULA',
      expression: 'employees * 2',
    } as const;
    const { rerender } = render(
      <TestForm onSave={onSave} initialComputation={initialComputation} />,
    );

    rerender(
      <TestForm
        onSave={onSave}
        initialComputation={initialComputation}
        disabled
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Formula' })).toHaveAttribute(
        'contenteditable',
        'false',
      ),
    );

    rerender(
      <TestForm onSave={onSave} initialComputation={initialComputation} />,
    );

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Formula' })).toHaveAttribute(
        'contenteditable',
        'true',
      ),
    );
  });

  it('shows refreshed formula values without marking the expression as edited', async () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <ValidationRuleExpressionEditor
        mode="calculation"
        label="Formula"
        value="1 + 2"
        editorFields={[]}
        onChange={onChange}
      />,
    );

    rerender(
      <ValidationRuleExpressionEditor
        mode="calculation"
        label="Formula"
        value="3 + 4"
        editorFields={[]}
        onChange={onChange}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'Formula' }),
      ).toHaveTextContent('3 + 4'),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('loads refreshed metadata into an unchanged form', async () => {
    const onSave = jest.fn();
    const { rerender } = render(
      <TestForm
        onSave={onSave}
        isCreationMode={false}
        initialComputation={{ kind: 'FORMULA', expression: '1 + 2' }}
      />,
    );

    rerender(
      <TestForm
        onSave={onSave}
        isCreationMode={false}
        initialComputation={{ kind: 'FORMULA', expression: '3 + 4' }}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'Formula' }),
      ).toHaveTextContent('3 + 4'),
    );
  });

  it('keeps a draft when background metadata refreshes', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <TestForm
        onSave={onSave}
        isCreationMode={false}
        initialComputation={{ kind: 'FORMULA', expression: '1 + 2' }}
      />,
    );
    const editor = screen.getByRole('textbox', { name: 'Formula' });
    await user.clear(editor);
    await user.type(editor, '5 + 6');

    rerender(
      <TestForm
        onSave={onSave}
        isCreationMode={false}
        initialComputation={{ kind: 'FORMULA', expression: '3 + 4' }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave.mock.calls[0][0]).toEqual({
      computation: { kind: 'FORMULA', expression: '5 + 6' },
    });
  });
});
