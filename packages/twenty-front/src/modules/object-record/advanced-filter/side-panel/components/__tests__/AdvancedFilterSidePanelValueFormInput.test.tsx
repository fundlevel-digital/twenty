import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';

import { isManyToOneRelationField } from '@/object-metadata/utils/isManyToOneRelationField';
import { AdvancedFilterSidePanelValueFormInput } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelValueFormInput';
import { AdvancedFilterContext } from '@/object-record/advanced-filter/states/context/AdvancedFilterContext';
import { getAdvancedFilterObjectFilterDropdownComponentInstanceId } from '@/object-record/advanced-filter/utils/getAdvancedFilterObjectFilterDropdownComponentInstanceId';
import { ObjectFilterDropdownComponentInstanceContext } from '@/object-record/object-filter-dropdown/states/contexts/ObjectFilterDropdownComponentInstanceContext';
import type * as FormMultiRecordPickerDraftValueModule from '@/object-record/record-field/ui/form-types/utils/getFormMultiRecordPickerDraftValue';
import { fieldMetadataItemIdUsedInDropdownComponentState } from '@/object-record/object-filter-dropdown/states/fieldMetadataItemIdUsedInDropdownComponentState';
import { objectFilterDropdownCurrentRecordFilterComponentState } from '@/object-record/object-filter-dropdown/states/objectFilterDropdownCurrentRecordFilterComponentState';
import { RecordFiltersComponentInstanceContext } from '@/object-record/record-filter/states/context/RecordFiltersComponentInstanceContext';
import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { type RecordFilter } from '@/object-record/record-filter/types/RecordFilter';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { FieldMetadataType, ViewFilterOperand } from 'twenty-shared/types';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';
import { getJestMetadataAndApolloMocksWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksWrapper';

jest.mock('@/object-record/record-field/ui/components/FormFieldInput', () => ({
  FormFieldInput: () => <div data-testid="form-field-input" />,
}));

jest.mock(
  '@/object-record/record-field/ui/form-types/components/FormMultiRecordPicker',
  () => ({
    FormMultiRecordPicker: ({
      defaultValue,
      onChange,
    }: {
      defaultValue: string[] | string;
      onChange: (value: string[]) => void;
    }) => {
      const { getFormMultiRecordPickerDraftValue } = jest.requireActual<
        typeof FormMultiRecordPickerDraftValueModule
      >(
        '@/object-record/record-field/ui/form-types/utils/getFormMultiRecordPickerDraftValue',
      );
      const draftValue = getFormMultiRecordPickerDraftValue(defaultValue);

      return (
        <select
          aria-label="Related Records"
          multiple
          value={draftValue.type === 'static' ? draftValue.value : []}
          onChange={(event) =>
            onChange(
              [...event.target.selectedOptions].map((option) => option.value),
            )
          }
        >
          <option value="20202020-aaaa-4bbb-8ccc-111111111111">Acme</option>
          <option value="20202020-aaaa-4bbb-8ccc-222222222222">Example</option>
        </select>
      );
    },
  }),
);

jest.mock(
  '@/object-record/record-field/ui/form-types/components/FormMultiSelectFieldInput',
  () => ({
    FormMultiSelectFieldInput: ({
      options,
    }: {
      options: { value: string }[];
    }) => <div data-testid="multiselect-options-count">{options.length}</div>,
  }),
);

jest.mock(
  '@/object-record/record-field/ui/form-types/components/FormWorkspaceMemberFilterValueInput',
  () => ({
    FormWorkspaceMemberFilterValueInput: () => (
      <div data-testid="workspace-member-filter-input" />
    ),
  }),
);

const INSTANCE_ID = 'advanced-filter-value-test';
const FILTER_ID = 'relation-select-filter';
const RELATED_RECORD_IDS = [
  '20202020-aaaa-4bbb-8ccc-111111111111',
  '20202020-aaaa-4bbb-8ccc-222222222222',
];

const opportunity = getMockObjectMetadataItemOrThrow('opportunity');

const relationField = opportunity.fields.find(
  (field) => field.type === FieldMetadataType.RELATION,
);

const selectField = opportunity.fields.find(
  (field) =>
    field.type === FieldMetadataType.SELECT && (field.options?.length ?? 0) > 0,
);

const workspaceMemberRelationField = opportunity.fields.find(
  (field) =>
    isManyToOneRelationField(field) &&
    field.relation.targetObjectMetadata.nameSingular === 'workspaceMember',
);

const nonWorkspaceMemberRelationField = opportunity.fields.find(
  (field) =>
    isManyToOneRelationField(field) &&
    field.relation.targetObjectMetadata.nameSingular !== 'workspaceMember',
);

if (
  !relationField ||
  !selectField ||
  !workspaceMemberRelationField ||
  !nonWorkspaceMemberRelationField
) {
  throw new Error('Missing expected fields in opportunity mock');
}

const relationToSelectFilter: RecordFilter = {
  id: FILTER_ID,
  fieldMetadataId: relationField.id,
  relationTargetFieldMetadataId: selectField.id,
  type: FieldMetadataType.SELECT,
  operand: ViewFilterOperand.IS,
  value: '',
  displayValue: '',
  label: `${relationField.label} → ${selectField.label}`,
};

const workspaceMemberRelationFilter: RecordFilter = {
  id: FILTER_ID,
  fieldMetadataId: workspaceMemberRelationField.id,
  relationTargetFieldMetadataId: null,
  type: FieldMetadataType.RELATION,
  operand: ViewFilterOperand.IS,
  value: '',
  displayValue: '',
  label: workspaceMemberRelationField.label,
};

const nonWorkspaceMemberRelationFilter: RecordFilter = {
  id: FILTER_ID,
  fieldMetadataId: nonWorkspaceMemberRelationField.id,
  relationTargetFieldMetadataId: null,
  type: FieldMetadataType.RELATION,
  operand: ViewFilterOperand.IS,
  value: '',
  displayValue: '',
  label: nonWorkspaceMemberRelationField.label,
};

const BaseWrapper = getJestMetadataAndApolloMocksWrapper({ apolloMocks: [] });

const Seed = ({
  recordFilter,
  dropdownFieldMetadataId,
  children,
}: {
  recordFilter: RecordFilter;
  dropdownFieldMetadataId: string;
  children: React.ReactNode;
}) => {
  const setCurrentRecordFilters = useSetAtomComponentState(
    currentRecordFiltersComponentState,
  );
  const setFieldMetadataItemIdUsedInDropdown = useSetAtomComponentState(
    fieldMetadataItemIdUsedInDropdownComponentState,
    getAdvancedFilterObjectFilterDropdownComponentInstanceId(FILTER_ID),
  );

  const [isSeeded, setIsSeeded] = useState(false);
  const setObjectFilterDropdownCurrentRecordFilter = useSetAtomComponentState(
    objectFilterDropdownCurrentRecordFilterComponentState,
  );
  const currentRecordFilters = useAtomComponentStateValue(
    currentRecordFiltersComponentState,
  );

  useEffect(() => {
    setCurrentRecordFilters([recordFilter]);
    setObjectFilterDropdownCurrentRecordFilter(recordFilter);
    setFieldMetadataItemIdUsedInDropdown(dropdownFieldMetadataId);
    setIsSeeded(true);
  }, [
    recordFilter,
    dropdownFieldMetadataId,
    setCurrentRecordFilters,
    setObjectFilterDropdownCurrentRecordFilter,
    setFieldMetadataItemIdUsedInDropdown,
  ]);

  return isSeeded ? (
    <>
      {children}
      <output aria-label="Saved Filter">
        {currentRecordFilters[0]?.value}
      </output>
    </>
  ) : null;
};

const renderValueInput = ({
  recordFilter,
  dropdownFieldMetadataId,
}: {
  recordFilter: RecordFilter;
  dropdownFieldMetadataId: string;
}) => {
  return render(
    <BaseWrapper>
      <AdvancedFilterContext.Provider
        value={{
          objectMetadataItem: opportunity,
          isWorkflowFindRecords: false,
        }}
      >
        <RecordFiltersComponentInstanceContext.Provider
          value={{ instanceId: INSTANCE_ID }}
        >
          <ObjectFilterDropdownComponentInstanceContext.Provider
            value={{
              instanceId:
                getAdvancedFilterObjectFilterDropdownComponentInstanceId(
                  FILTER_ID,
                ),
            }}
          >
            <Seed
              recordFilter={recordFilter}
              dropdownFieldMetadataId={dropdownFieldMetadataId}
            >
              <AdvancedFilterSidePanelValueFormInput
                recordFilterId={FILTER_ID}
              />
            </Seed>
          </ObjectFilterDropdownComponentInstanceContext.Provider>
        </RecordFiltersComponentInstanceContext.Provider>
      </AdvancedFilterContext.Provider>
    </BaseWrapper>,
  );
};

describe('AdvancedFilterSidePanelValueFormInput', () => {
  it('resolves select options from the relation target field for a relation-traversal filter', async () => {
    const { getByTestId } = renderValueInput({
      recordFilter: relationToSelectFilter,
      dropdownFieldMetadataId: relationField.id,
    });

    await waitFor(() => {
      expect(getByTestId('multiselect-options-count').textContent).toBe(
        String(selectField.options?.length),
      );
    });
  });

  it('renders the workspace member "Me" picker for a direct relation-to-workspaceMember filter', async () => {
    const { getByTestId } = renderValueInput({
      recordFilter: workspaceMemberRelationFilter,
      dropdownFieldMetadataId: workspaceMemberRelationField.id,
    });

    await waitFor(() => {
      expect(getByTestId('workspace-member-filter-input')).toBeInTheDocument();
    });
  });

  it.each([
    ['a saved ID array', JSON.stringify(RELATED_RECORD_IDS)],
    [
      'a saved relation object',
      JSON.stringify({ selectedRecordIds: RELATED_RECORD_IDS }),
    ],
  ])('reopens %s without dropping any selected records', async (_, value) => {
    const { findByRole } = renderValueInput({
      recordFilter: { ...nonWorkspaceMemberRelationFilter, value },
      dropdownFieldMetadataId: nonWorkspaceMemberRelationField.id,
    });

    expect(
      await findByRole('listbox', { name: 'Related Records' }),
    ).toHaveValue(RELATED_RECORD_IDS);
  });

  it('selects records of a related relation and preserves the selection on reopen', async () => {
    const user = userEvent.setup();
    const company = getMockObjectMetadataItemOrThrow('company');
    const sourceRelation = opportunity.fields.find(
      (field) =>
        isManyToOneRelationField(field) &&
        field.relation.targetObjectMetadata.id === company.id,
    );
    const targetRelation = company.fields.find((field) =>
      isManyToOneRelationField(field),
    );
    if (!sourceRelation || !targetRelation) {
      throw new Error('Missing related relation fixture');
    }
    const { findByRole, getByRole } = renderValueInput({
      recordFilter: {
        ...nonWorkspaceMemberRelationFilter,
        fieldMetadataId: sourceRelation.id,
        relationTargetFieldMetadataId: targetRelation.id,
        value: JSON.stringify(RELATED_RECORD_IDS),
      },
      dropdownFieldMetadataId: sourceRelation.id,
    });
    const picker = await findByRole('listbox', { name: 'Related Records' });
    expect(picker).toHaveValue(RELATED_RECORD_IDS);
    await user.deselectOptions(picker, RELATED_RECORD_IDS[0]);
    expect(getByRole('status', { name: 'Saved Filter' }).textContent).toBe(
      JSON.stringify([RELATED_RECORD_IDS[1]]),
    );
  });

  it('saves added and removed relation selections as an ID array', async () => {
    const user = userEvent.setup();
    const { findByRole, getByRole } = renderValueInput({
      recordFilter: {
        ...nonWorkspaceMemberRelationFilter,
        value: RELATED_RECORD_IDS[0],
      },
      dropdownFieldMetadataId: nonWorkspaceMemberRelationField.id,
    });

    const picker = await findByRole('listbox', { name: 'Related Records' });
    expect(picker).toHaveValue([RELATED_RECORD_IDS[0]]);

    await user.selectOptions(picker, RELATED_RECORD_IDS[1]);
    expect(getByRole('status', { name: 'Saved Filter' }).textContent).toBe(
      JSON.stringify(RELATED_RECORD_IDS),
    );

    await user.deselectOptions(picker, RELATED_RECORD_IDS);
    expect(getByRole('status', { name: 'Saved Filter' }).textContent).toBe(
      '[]',
    );
  });
});
