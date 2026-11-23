import { getWorkflowCodeFieldsEnumSelectOptions } from '@/workflow/workflow-steps/workflow-actions/code-action/utils/getWorkflowCodeFieldsEnumSelectOptions';

describe('getWorkflowCodeFieldsEnumSelectOptions', () => {
  it('should build select options from schema enum', () => {
    expect(
      getWorkflowCodeFieldsEnumSelectOptions({
        type: 'string',
        enum: ['plain', 'markdown'],
      }),
    ).toEqual([
      { value: 'plain', label: 'plain' },
      { value: 'markdown', label: 'markdown' },
    ]);
  });

  it('displays human-readable enum labels without changing saved values', () => {
    expect(
      getWorkflowCodeFieldsEnumSelectOptions({
        type: 'string',
        enum: ['US', 'GB', 'CA'],
        enumLabels: { US: 'United States', GB: 'United Kingdom' },
      }),
    ).toEqual([
      { value: 'US', label: 'United States' },
      { value: 'GB', label: 'United Kingdom' },
      { value: 'CA', label: 'CA' },
    ]);
  });

  it('should return empty array when property has no enum', () => {
    expect(getWorkflowCodeFieldsEnumSelectOptions({ type: 'string' })).toEqual(
      [],
    );
    expect(getWorkflowCodeFieldsEnumSelectOptions(undefined)).toEqual([]);
  });
});
