import { RecordTableFieldsDropdownRelatedFieldsContent } from '@/side-panel/pages/page-layout/components/record-table-settings/RecordTableFieldsDropdownRelatedFieldsContent';
import { RECORD_TABLE_FIELDS_DROPDOWN_PAGE } from '@/side-panel/pages/page-layout/components/record-table-settings/constants/RecordTableFieldsDropdownPage';
import { currentRecordFieldsComponentState } from '@/object-record/record-field/states/currentRecordFieldsComponentState';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown } from 'twenty-ui/components/navigation';
import { getJestMetadataAndApolloMocksWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksWrapper';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';
import { getMockFieldMetadataItemOrThrow } from '~/testing/utils/getMockFieldMetadataItemOrThrow';

it('adds an attribute of an already visible relation through the native picker', async () => {
  const user = userEvent.setup();
  const company = getMockObjectMetadataItemOrThrow('company');
  const workspaceMember = getMockObjectMetadataItemOrThrow('workspaceMember');
  const accountOwner = getMockFieldMetadataItemOrThrow({
    objectMetadataItem: company,
    fieldName: 'accountOwner',
  });
  const name = getMockFieldMetadataItemOrThrow({
    objectMetadataItem: workspaceMember,
    fieldName: 'name',
  });
  const onFieldCreated = jest.fn();
  const Wrapper = getJestMetadataAndApolloMocksWrapper({
    apolloMocks: [],
    onInitializeJotaiStore: (store) =>
      store.set(
        currentRecordFieldsComponentState.atomFamily({
          instanceId: 'instanceId',
        }),
        [
          {
            id: 'owner-column',
            fieldMetadataItemId: accountOwner.id,
            isVisible: true,
            position: 0,
            size: 100,
          },
        ],
      ),
  });

  render(
    <Wrapper>
      <DropdownRoot dropdownId="fields" type="panel">
        <Dropdown.Trigger>Fields</Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Page id="root">
            <Dropdown.ActionItem
              page={RECORD_TABLE_FIELDS_DROPDOWN_PAGE.RELATED_FIELDS}
            >
              Related Fields
            </Dropdown.ActionItem>
          </Dropdown.Page>
          <RecordTableFieldsDropdownRelatedFieldsContent
            objectMetadataId={company.id}
            recordIndexId="instanceId"
            onFieldCreated={onFieldCreated}
          />
        </Dropdown.Content>
      </DropdownRoot>
    </Wrapper>,
  );

  await user.click(screen.getByRole('button', { name: 'Fields' }));
  await user.click(await screen.findByText('Related Fields'));
  await user.click(await screen.findByText(accountOwner.label));
  await user.click(await screen.findByText(name.label));
  expect(onFieldCreated).toHaveBeenCalledWith(
    expect.objectContaining({
      fieldMetadataItemId: accountOwner.id,
      relationTargetFieldMetadataId: name.id,
      isCanonical: false,
      isVisible: true,
    }),
  );
});
