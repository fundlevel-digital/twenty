import { ViewType } from 'twenty-shared/types';

import { validateFlatViewFieldNonCanonicalInWidgetView } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/validators/utils/validate-flat-view-field-non-canonical-in-widget-view.util';

const validate = ({
  isCanonical,
  relationTargetFieldMetadataUniversalIdentifier,
  viewType,
}: {
  isCanonical: boolean;
  relationTargetFieldMetadataUniversalIdentifier: string | null;
  viewType: ViewType;
}) =>
  validateFlatViewFieldNonCanonicalInWidgetView({
    flatViewField: {
      isCanonical,
      relationTargetFieldMetadataUniversalIdentifier,
    },
    flatView: { type: viewType },
  });

describe('validateFlatViewFieldNonCanonicalInWidgetView', () => {
  it('accepts a lookup column in a table widget view', () => {
    expect(
      validate({
        isCanonical: false,
        relationTargetFieldMetadataUniversalIdentifier: 'subject-field',
        viewType: ViewType.TABLE_WIDGET,
      }),
    ).toEqual([]);
  });

  it('accepts a plain extra column outside widget views', () => {
    expect(
      validate({
        isCanonical: false,
        relationTargetFieldMetadataUniversalIdentifier: null,
        viewType: ViewType.TABLE,
      }),
    ).toEqual([]);
  });

  it('accepts a canonical column in a widget view', () => {
    expect(
      validate({
        isCanonical: true,
        relationTargetFieldMetadataUniversalIdentifier: null,
        viewType: ViewType.KANBAN_WIDGET,
      }),
    ).toEqual([]);
  });

  it.each([
    {
      title: 'a plain extra column in a table widget view',
      relationTargetFieldMetadataUniversalIdentifier: null,
      viewType: ViewType.TABLE_WIDGET,
    },
    {
      title: 'a lookup column in a kanban widget view',
      relationTargetFieldMetadataUniversalIdentifier: 'subject-field',
      viewType: ViewType.KANBAN_WIDGET,
    },
    {
      title: 'a lookup column in a fields widget view',
      relationTargetFieldMetadataUniversalIdentifier: 'subject-field',
      viewType: ViewType.FIELDS_WIDGET,
    },
  ])(
    'rejects $title',
    ({ relationTargetFieldMetadataUniversalIdentifier, viewType }) => {
      expect(
        validate({
          isCanonical: false,
          relationTargetFieldMetadataUniversalIdentifier,
          viewType,
        }),
      ).toHaveLength(1);
    },
  );
});
