import { RecordTableGroupByPathPicker } from '@/side-panel/pages/page-layout/components/record-table-settings/RecordTableGroupByPathPicker';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown } from 'twenty-ui/components/navigation';
import { getJestMetadataAndApolloMocksWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksWrapper';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';
import { getMockFieldMetadataItemOrThrow } from '~/testing/utils/getMockFieldMetadataItemOrThrow';

it('navigates single-record relations and selects a nested record as the grouping value', async () => {
  const user = userEvent.setup();
  const person = getMockObjectMetadataItemOrThrow('person');
  const company = getMockObjectMetadataItemOrThrow('company');
  const member = getMockObjectMetadataItemOrThrow('workspaceMember');
  const companyField = getMockFieldMetadataItemOrThrow({
    objectMetadataItem: person,
    fieldName: 'company',
  });
  const ownerField = getMockFieldMetadataItemOrThrow({
    objectMetadataItem: company,
    fieldName: 'accountOwner',
  });
  const onSelect = jest.fn();
  const Wrapper = getJestMetadataAndApolloMocksWrapper({ apolloMocks: [] });
  render(
    <Wrapper>
      <DropdownRoot dropdownId="grouping-test" type="picker">
        <Dropdown.Trigger>Group By</Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Page id="root">
            <Dropdown.ActionItem page="group-by-path-">
              Related Fields
            </Dropdown.ActionItem>
          </Dropdown.Page>
          <RecordTableGroupByPathPicker
            object={person}
            objects={[person, company, member]}
            onSelect={onSelect}
          />
        </Dropdown.Content>
      </DropdownRoot>
    </Wrapper>,
  );
  await user.click(screen.getByRole('button', { name: 'Group By' }));
  await user.click(await screen.findByText('Related Fields'));
  await user.click(await screen.findByText(companyField.label));
  const people = screen
    .getByText(
      getMockFieldMetadataItemOrThrow({
        objectMetadataItem: company,
        fieldName: 'people',
      }).label,
    )
    .closest('button');
  expect(people).toBeDisabled();
  await user.click(await screen.findByText(ownerField.label));
  await user.click(await screen.findByText(member.labelSingular));
  expect(onSelect).toHaveBeenCalledWith([companyField.id, ownerField.id]);
});
