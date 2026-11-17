import { VIEW_FIELD_GQL_FIELDS } from 'test/integration/constants/view-gql-fields.constants';
import { createOneFieldMetadata } from 'test/integration/metadata/suites/field-metadata/utils/create-one-field-metadata.util';
import { deleteOneFieldMetadata } from 'test/integration/metadata/suites/field-metadata/utils/delete-one-field-metadata.util';
import { findManyFieldsMetadata } from 'test/integration/metadata/suites/field-metadata/utils/find-many-fields-metadata.util';
import { updateOneFieldMetadata } from 'test/integration/metadata/suites/field-metadata/utils/update-one-field-metadata.util';
import { createOneObjectMetadata } from 'test/integration/metadata/suites/object-metadata/utils/create-one-object-metadata.util';
import { deleteOneObjectMetadata } from 'test/integration/metadata/suites/object-metadata/utils/delete-one-object-metadata.util';
import { getMockCreateObjectInput } from 'test/integration/metadata/suites/object-metadata/utils/generate-mock-create-object-metadata-input';
import { updateOneObjectMetadata } from 'test/integration/metadata/suites/object-metadata/utils/update-one-object-metadata.util';
import { updateOneViewField } from 'test/integration/metadata/suites/view-field/utils/update-one-view-field.util';
import { createOneViewField } from 'test/integration/metadata/suites/view-field/utils/create-one-view-field.util';
import { findViewFields } from 'test/integration/metadata/suites/view-field/utils/find-view-fields.util';
import { createOneView } from 'test/integration/metadata/suites/view/utils/create-one-view.util';
import { FieldMetadataType, ViewType } from 'twenty-shared/types';
import { assertIsDefinedOrThrow } from 'twenty-shared/utils';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';

type FieldNode = {
  id: string;
  name: string;
  object?: { id: string };
};

const LOOKUP_VIEW_FIELD_GQL_FIELDS = `
  ${VIEW_FIELD_GQL_FIELDS}
  isCanonical
  relationTargetFieldMetadataId
  relationPathFieldMetadataIds
`;

const testContext = {
  dealObjectId: '',
  companyObjectId: '',
  ownerObjectId: '',
  dealCompanyFieldId: '',
  companyDealsFieldId: '',
  companyOwnerFieldId: '',
  companyIndustryFieldId: '',
  dealNextStepFieldId: '',
  ownerEmailFieldId: '',
  dealViewId: '',
  companyViewId: '',
  dealWidgetViewId: '',
};

const createTextField = async ({
  objectMetadataId,
  name,
}: {
  objectMetadataId: string;
  name: string;
}) => {
  const {
    data: {
      createOneField: { id },
    },
  } = await createOneFieldMetadata({
    expectToFail: false,
    input: {
      objectMetadataId,
      name,
      label: name,
      isLabelSyncedWithName: false,
      type: FieldMetadataType.TEXT,
    },
  });

  return id;
};

const createView = async (objectMetadataId: string, type?: ViewType) => {
  const {
    data: { createView },
  } = await createOneView({
    expectToFail: false,
    input: { name: 'Lookups', icon: 'IconTable', objectMetadataId, type },
  });

  return createView.id;
};

const createLookupViewField = ({
  viewId,
  fieldMetadataId,
  relationTargetFieldMetadataId,
  relationPathFieldMetadataIds,
  isCanonical = false,
  expectToFail,
}: {
  viewId: string;
  fieldMetadataId: string;
  relationTargetFieldMetadataId?: string;
  relationPathFieldMetadataIds?: string[];
  isCanonical?: boolean;
  expectToFail: boolean;
}) =>
  createOneViewField({
    expectToFail,
    gqlFields: LOOKUP_VIEW_FIELD_GQL_FIELDS,
    input: {
      viewId,
      fieldMetadataId,
      relationTargetFieldMetadataId,
      relationPathFieldMetadataIds,
      isCanonical,
      position: 1,
    },
  });

const createManyToOneRelationField = async ({
  objectMetadataId,
  targetObjectMetadataId,
  name,
}: {
  objectMetadataId: string;
  targetObjectMetadataId: string;
  name: string;
}) => {
  const {
    data: {
      createOneField: { id },
    },
  } = await createOneFieldMetadata({
    expectToFail: false,
    input: {
      objectMetadataId,
      name,
      label: name,
      isLabelSyncedWithName: false,
      type: FieldMetadataType.RELATION,
      relationCreationPayload: {
        targetFieldLabel: `${name} of`,
        type: RelationType.MANY_TO_ONE,
        targetObjectMetadataId,
        targetFieldIcon: 'IconBuilding',
      },
    },
  });

  return id;
};

describe('View field showing a field of the related record', () => {
  beforeAll(async () => {
    const {
      data: {
        createOneObject: { id: dealObjectId },
      },
    } = await createOneObjectMetadata({
      input: getMockCreateObjectInput({
        namePlural: 'lookupDeals',
        nameSingular: 'lookupDeal',
      }),
    });

    const {
      data: {
        createOneObject: { id: companyObjectId },
      },
    } = await createOneObjectMetadata({
      input: getMockCreateObjectInput({
        namePlural: 'lookupCompanies',
        nameSingular: 'lookupCompany',
      }),
    });

    const {
      data: {
        createOneField: { id: dealCompanyFieldId },
      },
    } = await createOneFieldMetadata({
      expectToFail: false,
      input: {
        objectMetadataId: dealObjectId,
        name: 'company',
        label: 'Company',
        isLabelSyncedWithName: false,
        type: FieldMetadataType.RELATION,
        relationCreationPayload: {
          targetFieldLabel: 'Deals',
          type: RelationType.MANY_TO_ONE,
          targetObjectMetadataId: companyObjectId,
          targetFieldIcon: 'IconMoneybag',
        },
      },
    });

    const { fields } = await findManyFieldsMetadata({
      input: { filter: {}, paging: { first: 1000 } },
      gqlFields: `
        id
        name
        object {
          id
        }
      `,
    });

    testContext.dealObjectId = dealObjectId;
    testContext.companyObjectId = companyObjectId;
    testContext.dealCompanyFieldId = dealCompanyFieldId;
    const companyDealsField = fields
      .map(({ node }: { node: FieldNode }) => node)
      .find(
        (field: FieldNode) =>
          field.object?.id === companyObjectId && field.name === 'deals',
      );

    assertIsDefinedOrThrow(companyDealsField);

    testContext.companyDealsFieldId = companyDealsField.id;
    testContext.companyIndustryFieldId = await createTextField({
      objectMetadataId: companyObjectId,
      name: 'industry',
    });
    testContext.dealNextStepFieldId = await createTextField({
      objectMetadataId: dealObjectId,
      name: 'nextStep',
    });
    testContext.dealViewId = await createView(dealObjectId);
    testContext.companyViewId = await createView(companyObjectId);
    testContext.dealWidgetViewId = await createView(
      dealObjectId,
      ViewType.TABLE_WIDGET,
    );

    const {
      data: {
        createOneObject: { id: ownerObjectId },
      },
    } = await createOneObjectMetadata({
      input: getMockCreateObjectInput({
        namePlural: 'lookupOwners',
        nameSingular: 'lookupOwner',
      }),
    });

    testContext.ownerObjectId = ownerObjectId;
    testContext.companyOwnerFieldId = await createManyToOneRelationField({
      objectMetadataId: companyObjectId,
      targetObjectMetadataId: ownerObjectId,
      name: 'owner',
    });
    testContext.ownerEmailFieldId = await createTextField({
      objectMetadataId: ownerObjectId,
      name: 'contactEmail',
    });
  });

  afterAll(async () => {
    for (const objectMetadataId of [
      testContext.dealObjectId,
      testContext.companyObjectId,
      testContext.ownerObjectId,
    ]) {
      await updateOneObjectMetadata({
        expectToFail: false,
        input: {
          idToUpdate: objectMetadataId,
          updatePayload: { isActive: false },
        },
      });
      await deleteOneObjectMetadata({
        input: { idToDelete: objectMetadataId },
      });
    }
  });

  it('shows a field of the related record on an added column', async () => {
    expect(testContext.companyDealsFieldId).not.toBe('');

    const {
      data: { createViewField },
    } = await createLookupViewField({
      viewId: testContext.dealViewId,
      fieldMetadataId: testContext.dealCompanyFieldId,
      relationTargetFieldMetadataId: testContext.companyIndustryFieldId,
      expectToFail: false,
    });

    expect(createViewField.relationTargetFieldMetadataId).toBe(
      testContext.companyIndustryFieldId,
    );
  });

  it.each([
    {
      title: 'is canonical',
      isCanonical: true,
      expectedMessage: 'Only non-canonical view fields',
    },
    {
      title: 'is not a relation',
      getFieldId: () => testContext.dealNextStepFieldId,
      expectedMessage: 'many-to-one or one-to-many relation field',
    },
    {
      title: 'targets a field of another object',
      getTargetFieldId: () => testContext.dealNextStepFieldId,
      expectedMessage: 'must belong to the relation target object',
    },
    {
      title: 'targets a relation',
      getTargetFieldId: () => testContext.companyDealsFieldId,
      expectedMessage: 'cannot be a relation',
    },
  ])(
    'rejects a column that $title',
    async ({
      isCanonical = false,
      getFieldId = () => testContext.dealCompanyFieldId,
      getTargetFieldId = () => testContext.companyIndustryFieldId,
      expectedMessage,
    }) => {
      const response = await createLookupViewField({
        viewId: testContext.dealViewId,
        fieldMetadataId: getFieldId(),
        relationTargetFieldMetadataId: getTargetFieldId(),
        isCanonical,
        expectToFail: true,
      });

      expect(JSON.stringify(response.errors)).toContain(expectedMessage);
    },
  );

  it('shows a field of the related records of a one-to-many relation', async () => {
    const {
      data: { createViewField },
    } = await createLookupViewField({
      viewId: testContext.companyViewId,
      fieldMetadataId: testContext.companyDealsFieldId,
      relationTargetFieldMetadataId: testContext.dealNextStepFieldId,
      expectToFail: false,
    });

    expect(createViewField.relationTargetFieldMetadataId).toBe(
      testContext.dealNextStepFieldId,
    );
  });

  it('shows a field several relations away', async () => {
    const {
      data: { createViewField },
    } = await createLookupViewField({
      viewId: testContext.dealViewId,
      fieldMetadataId: testContext.dealCompanyFieldId,
      relationPathFieldMetadataIds: [testContext.companyOwnerFieldId],
      relationTargetFieldMetadataId: testContext.ownerEmailFieldId,
      expectToFail: false,
    });

    expect(createViewField.relationPathFieldMetadataIds).toEqual([
      testContext.companyOwnerFieldId,
    ]);
    expect(createViewField.relationTargetFieldMetadataId).toBe(
      testContext.ownerEmailFieldId,
    );
  });

  it('follows a one-to-many relation in the middle of the path', async () => {
    const {
      data: { createViewField },
    } = await createLookupViewField({
      viewId: testContext.dealViewId,
      fieldMetadataId: testContext.dealCompanyFieldId,
      relationPathFieldMetadataIds: [testContext.companyDealsFieldId],
      relationTargetFieldMetadataId: testContext.dealNextStepFieldId,
      expectToFail: false,
    });

    expect(createViewField.relationPathFieldMetadataIds).toEqual([
      testContext.companyDealsFieldId,
    ]);
  });

  it.each([
    {
      title: 'a path that does not connect the objects',
      getPath: () => [testContext.dealCompanyFieldId],
      getTargetFieldId: (): string | undefined => testContext.ownerEmailFieldId,
      expectedMessage: 'object the previous relation points to',
    },
    {
      title: 'a field off the end of the path',
      getPath: () => [testContext.companyOwnerFieldId],
      getTargetFieldId: (): string | undefined =>
        testContext.companyIndustryFieldId,
      expectedMessage: 'must belong to the relation target object',
    },
    {
      title: 'a path without a related record field',
      getPath: () => [testContext.companyOwnerFieldId],
      getTargetFieldId: (): string | undefined => undefined,
      expectedMessage: 'needs a related record field',
    },
  ])(
    'rejects $title',
    async ({ getPath, getTargetFieldId, expectedMessage }) => {
      const response = await createLookupViewField({
        viewId: testContext.dealViewId,
        fieldMetadataId: testContext.dealCompanyFieldId,
        relationPathFieldMetadataIds: getPath(),
        relationTargetFieldMetadataId: getTargetFieldId(),
        expectToFail: true,
      });

      expect(JSON.stringify(response.errors)).toContain(expectedMessage);
    },
  );

  it('changes and clears the path of a lookup column', async () => {
    const {
      data: { createViewField },
    } = await createLookupViewField({
      viewId: testContext.dealViewId,
      fieldMetadataId: testContext.dealCompanyFieldId,
      relationPathFieldMetadataIds: [testContext.companyOwnerFieldId],
      relationTargetFieldMetadataId: testContext.ownerEmailFieldId,
      expectToFail: false,
    });

    const {
      data: { updateViewField },
    } = await updateOneViewField({
      expectToFail: false,
      gqlFields: LOOKUP_VIEW_FIELD_GQL_FIELDS,
      input: {
        id: createViewField.id,
        update: {
          relationPathFieldMetadataIds: null,
          relationTargetFieldMetadataId: testContext.companyIndustryFieldId,
        },
      },
    });

    expect(updateViewField.relationPathFieldMetadataIds).toBeNull();
    expect(updateViewField.relationTargetFieldMetadataId).toBe(
      testContext.companyIndustryFieldId,
    );
  });

  it('accepts a lookup column in a table widget view', async () => {
    const {
      data: { createViewField },
    } = await createLookupViewField({
      viewId: testContext.dealWidgetViewId,
      fieldMetadataId: testContext.dealCompanyFieldId,
      relationPathFieldMetadataIds: [testContext.companyOwnerFieldId],
      relationTargetFieldMetadataId: testContext.ownerEmailFieldId,
      expectToFail: false,
    });

    expect(createViewField.isCanonical).toBe(false);
  });

  it('rejects a plain extra column in a table widget view', async () => {
    const response = await createLookupViewField({
      viewId: testContext.dealWidgetViewId,
      fieldMetadataId: testContext.dealNextStepFieldId,
      expectToFail: true,
    });

    expect(JSON.stringify(response.errors)).toContain(
      'only supported in widget views as table lookup columns',
    );
  });

  it('removes the column when the related record field is deleted', async () => {
    const tierFieldId = await createTextField({
      objectMetadataId: testContext.companyObjectId,
      name: 'tier',
    });

    const {
      data: { createViewField },
    } = await createLookupViewField({
      viewId: testContext.dealViewId,
      fieldMetadataId: testContext.dealCompanyFieldId,
      relationTargetFieldMetadataId: tierFieldId,
      expectToFail: false,
    });

    await updateOneFieldMetadata({
      expectToFail: false,
      input: { idToUpdate: tierFieldId, updatePayload: { isActive: false } },
    });
    await deleteOneFieldMetadata({
      expectToFail: false,
      input: { idToDelete: tierFieldId },
    });

    const {
      data: { getViewFields },
    } = await findViewFields({
      viewId: testContext.dealViewId,
      gqlFields: LOOKUP_VIEW_FIELD_GQL_FIELDS,
      expectToFail: false,
    });

    expect(
      getViewFields.map((viewField: { id: string }) => viewField.id),
    ).not.toContain(createViewField.id);
  });

  it('removes the column when a relation of its path is deleted', async () => {
    const {
      data: { createViewField },
    } = await createLookupViewField({
      viewId: testContext.dealViewId,
      fieldMetadataId: testContext.dealCompanyFieldId,
      relationPathFieldMetadataIds: [testContext.companyOwnerFieldId],
      relationTargetFieldMetadataId: testContext.ownerEmailFieldId,
      expectToFail: false,
    });

    await updateOneFieldMetadata({
      expectToFail: false,
      input: {
        idToUpdate: testContext.companyOwnerFieldId,
        updatePayload: { isActive: false },
      },
    });
    await deleteOneFieldMetadata({
      expectToFail: false,
      input: { idToDelete: testContext.companyOwnerFieldId },
    });

    const {
      data: { getViewFields },
    } = await findViewFields({
      viewId: testContext.dealViewId,
      gqlFields: LOOKUP_VIEW_FIELD_GQL_FIELDS,
      expectToFail: false,
    });

    expect(
      getViewFields.map((viewField: { id: string }) => viewField.id),
    ).not.toContain(createViewField.id);
  });
});
