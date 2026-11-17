import { findManyObjectMetadata } from 'test/integration/metadata/suites/object-metadata/utils/find-many-object-metadata.util';
import { createOnePageLayoutTab } from 'test/integration/metadata/suites/page-layout-tab/utils/create-one-page-layout-tab.util';
import { destroyOnePageLayoutTab } from 'test/integration/metadata/suites/page-layout-tab/utils/destroy-one-page-layout-tab.util';
import { createOnePageLayoutWidget } from 'test/integration/metadata/suites/page-layout-widget/utils/create-one-page-layout-widget.util';
import { destroyOnePageLayoutWidget } from 'test/integration/metadata/suites/page-layout-widget/utils/destroy-one-page-layout-widget.util';
import { createOnePageLayout } from 'test/integration/metadata/suites/page-layout/utils/create-one-page-layout.util';
import { destroyOnePageLayout } from 'test/integration/metadata/suites/page-layout/utils/destroy-one-page-layout.util';
import { findViewFields } from 'test/integration/metadata/suites/view-field/utils/find-view-fields.util';
import { createOneView } from 'test/integration/metadata/suites/view/utils/create-one-view.util';
import { destroyOneView } from 'test/integration/metadata/suites/view/utils/destroy-one-view.util';
import { upsertViewWidget } from 'test/integration/metadata/suites/view/utils/upsert-view-widget.util';
import {
  PageLayoutTabLayoutMode,
  ViewType,
  WidgetType,
} from 'twenty-shared/types';
import { assertIsDefinedOrThrow } from 'twenty-shared/utils';
import { v4 as uuidv4 } from 'uuid';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';

const LOOKUP_VIEW_FIELD_GQL_FIELDS = `
  id
  fieldMetadataId
  position
  isVisible
  isCanonical
  relationTargetFieldMetadataId
  relationPathFieldMetadataIds
`;

type LookupViewField = {
  id: string;
  fieldMetadataId: string;
  position: number;
  isCanonical: boolean;
  relationTargetFieldMetadataId: string | null;
  relationPathFieldMetadataIds: string[] | null;
};

const findFieldIdOrThrow = (
  objects: {
    nameSingular: string;
    fieldsList?: { id: string; name: string }[];
  }[],
  objectNameSingular: string,
  fieldName: string,
) => {
  const field = objects
    .find((object) => object.nameSingular === objectNameSingular)
    ?.fieldsList?.find((fieldMetadata) => fieldMetadata.name === fieldName);

  assertIsDefinedOrThrow(field);

  return field.id;
};

describe('upsertViewWidget lookup columns', () => {
  const context = {
    pageLayoutId: '',
    pageLayoutTabId: '',
    widgetId: '',
    viewId: '',
    personCompanyFieldId: '',
    companyNameFieldId: '',
    companyPeopleFieldId: '',
    personJobTitleFieldId: '',
  };
  const companyNameLookupViewFieldId = uuidv4();

  const getViewFields = async (): Promise<LookupViewField[]> => {
    const {
      data: { getViewFields },
    } = await findViewFields({
      viewId: context.viewId,
      gqlFields: LOOKUP_VIEW_FIELD_GQL_FIELDS,
      expectToFail: false,
    });

    return getViewFields;
  };

  const buildViewFieldsInput = (positionOffset = 0) => [
    {
      fieldMetadataId: context.personCompanyFieldId,
      isVisible: true,
      position: 1,
    },
    {
      viewFieldId: companyNameLookupViewFieldId,
      fieldMetadataId: context.personCompanyFieldId,
      relationTargetFieldMetadataId: context.companyNameFieldId,
      isVisible: true,
      position: 2 + positionOffset,
    },
    {
      fieldMetadataId: context.personCompanyFieldId,
      relationPathFieldMetadataIds: [context.companyPeopleFieldId],
      relationTargetFieldMetadataId: context.personJobTitleFieldId,
      isVisible: true,
      position: 3,
    },
  ];

  beforeAll(async () => {
    const { objects } = await findManyObjectMetadata({
      expectToFail: false,
      input: { filter: {}, paging: { first: 100 } },
      gqlFields: `
        id
        nameSingular
        fieldsList {
          id
          name
        }
      `,
    });

    const personObject = objects.find(
      (object) => object.nameSingular === 'person',
    );

    assertIsDefinedOrThrow(personObject);

    context.personCompanyFieldId = findFieldIdOrThrow(
      objects,
      'person',
      'company',
    );
    context.companyNameFieldId = findFieldIdOrThrow(objects, 'company', 'name');
    context.companyPeopleFieldId = findFieldIdOrThrow(
      objects,
      'company',
      'people',
    );
    context.personJobTitleFieldId = findFieldIdOrThrow(
      objects,
      'person',
      'jobTitle',
    );

    const { data: layoutData } = await createOnePageLayout({
      expectToFail: false,
      input: { name: 'Lookup Columns Dashboard' },
    });

    context.pageLayoutId = layoutData.createPageLayout.id;

    const { data: tabData } = await createOnePageLayoutTab({
      expectToFail: false,
      input: {
        title: 'Lookup Columns Tab',
        pageLayoutId: context.pageLayoutId,
      },
    });

    context.pageLayoutTabId = tabData.createPageLayoutTab.id;

    const { data: viewData } = await createOneView({
      expectToFail: false,
      input: {
        name: 'Lookup Columns Widget View',
        objectMetadataId: personObject.id,
        icon: 'IconTable',
        type: ViewType.TABLE_WIDGET,
      },
    });

    context.viewId = viewData.createView.id;

    const { data: widgetData } = await createOnePageLayoutWidget({
      expectToFail: false,
      input: {
        title: 'Lookup Columns Table',
        type: WidgetType.RECORD_TABLE,
        pageLayoutTabId: context.pageLayoutTabId,
        objectMetadataId: personObject.id,
        position: {
          layoutMode: PageLayoutTabLayoutMode.GRID,
          row: 0,
          column: 0,
          rowSpan: 1,
          columnSpan: 1,
        },
        configuration: {
          configurationType: WidgetConfigurationType.RECORD_TABLE,
          viewId: context.viewId,
        },
      },
    });

    context.widgetId = widgetData.createPageLayoutWidget.id;
  });

  afterAll(async () => {
    await destroyOnePageLayoutWidget({
      expectToFail: false,
      input: { id: context.widgetId },
    });
    await destroyOneView({ expectToFail: false, viewId: context.viewId });
    await destroyOnePageLayoutTab({
      expectToFail: false,
      input: { id: context.pageLayoutTabId },
    });
    await destroyOnePageLayout({
      expectToFail: false,
      input: { id: context.pageLayoutId },
    });
  });

  it('creates lookup columns next to the plain relation column', async () => {
    await upsertViewWidget({
      expectToFail: false,
      input: { widgetId: context.widgetId, viewFields: buildViewFieldsInput() },
    });

    const viewFieldsOnCompany = (await getViewFields()).filter(
      (viewField) => viewField.fieldMetadataId === context.personCompanyFieldId,
    );

    expect(viewFieldsOnCompany).toHaveLength(3);
    expect(viewFieldsOnCompany).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          isCanonical: true,
          relationTargetFieldMetadataId: null,
        }),
        expect.objectContaining({
          id: companyNameLookupViewFieldId,
          isCanonical: false,
          relationTargetFieldMetadataId: context.companyNameFieldId,
          relationPathFieldMetadataIds: null,
        }),
        expect.objectContaining({
          isCanonical: false,
          relationTargetFieldMetadataId: context.personJobTitleFieldId,
          relationPathFieldMetadataIds: [context.companyPeopleFieldId],
        }),
      ]),
    );
  });

  it('matches existing lookup columns on a repeated save instead of duplicating them', async () => {
    await upsertViewWidget({
      expectToFail: false,
      input: {
        widgetId: context.widgetId,
        viewFields: buildViewFieldsInput(10),
      },
    });

    const viewFieldsOnCompany = (await getViewFields()).filter(
      (viewField) => viewField.fieldMetadataId === context.personCompanyFieldId,
    );

    expect(viewFieldsOnCompany).toHaveLength(3);
    expect(
      viewFieldsOnCompany.find(
        (viewField) => viewField.id === companyNameLookupViewFieldId,
      )?.position,
    ).toBe(12);
  });
});
