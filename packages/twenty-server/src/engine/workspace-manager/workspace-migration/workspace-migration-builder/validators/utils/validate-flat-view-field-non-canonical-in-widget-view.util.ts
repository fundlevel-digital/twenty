import { msg, t } from '@lingui/core/macro';
import { ViewType } from 'twenty-shared/types';
import { isDefined, isWidgetViewType } from 'twenty-shared/utils';

import { ViewExceptionCode } from 'src/engine/metadata-modules/view/exceptions/view.exception';
import { type FlatEntityValidationError } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/types/failed-flat-entity-validation.type';
import { type UniversalFlatViewField } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-view-field.type';
import { type UniversalFlatView } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-view.type';

// Widget saves match plain columns by field, so the only extra columns they can tell apart
// are table widget lookup columns, which the upsert matches by id or by lookup path.
export const validateFlatViewFieldNonCanonicalInWidgetView = ({
  flatViewField,
  flatView,
}: {
  flatViewField: Pick<
    UniversalFlatViewField,
    'isCanonical' | 'relationTargetFieldMetadataUniversalIdentifier'
  >;
  flatView: Pick<UniversalFlatView, 'type'>;
}): FlatEntityValidationError<ViewExceptionCode>[] => {
  if (flatViewField.isCanonical || !isWidgetViewType(flatView.type)) {
    return [];
  }

  if (
    flatView.type === ViewType.TABLE_WIDGET &&
    isDefined(flatViewField.relationTargetFieldMetadataUniversalIdentifier)
  ) {
    return [];
  }

  return [
    {
      code: ViewExceptionCode.INVALID_VIEW_DATA,
      message: t`Non-canonical view fields are only supported in widget views as table lookup columns`,
      userFriendlyMessage: msg`Extra columns are not supported here`,
    },
  ];
};
