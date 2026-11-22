import {
  TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  TWITTER_PROFILE_VIEW_UNIVERSAL_IDENTIFIER,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/constants/universal-identifiers';
import { type TwitterAnalyticsSyncOptions } from 'src/logic-functions/types/twitter-analytics-sync-options.type';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';
import {
  getTwitterMetricFields,
  TWITTER_METRIC_FIELD_DESCRIPTION,
  TWITTER_METRIC_FIELD_PREFIX,
} from 'src/logic-functions/utils/twitter-metric-fields.util';
import { isDefined } from 'src/utils/is-defined';

type FieldMetadata = {
  id: string;
  name: string;
  label: string;
  type: string;
  description: string | null;
  universalIdentifier: string;
};
type FieldConnection = {
  edges: { node: FieldMetadata }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};
type ViewField = {
  id: string;
  fieldMetadataId: string;
  isVisible: boolean;
  position: number;
};
type View = {
  id: string;
  universalIdentifier: string;
  type: string;
  viewFields: ViewField[];
};

const LEGACY_METRIC_FIELD_IDENTIFIERS = new Set<string>([
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageViews,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.medianViews,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageEngagementPercentage,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.medianEngagementPercentage,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageViewRate,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageViews60d,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.medianViews60d,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageEngagementPercentage60d,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.medianEngagementPercentage60d,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageViewRate60d,
]);

export const synchronizeTwitterMetricFields = async ({
  client,
  options,
}: {
  client: WorkspaceGraphqlClient;
  options: TwitterAnalyticsSyncOptions;
}): Promise<void> => {
  const result = await client.request<{
    objects: { edges: { node: { id: string } }[] };
  }>(
    `
    query TwitterProfileObject($identifier: UUID!) {
      objects(filter: {universalIdentifier: {eq: $identifier}}, paging: {first: 1}) {edges {node {id}}}
    }`,
    { identifier: TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER },
  );
  const objectMetadataId = result.objects.edges[0]?.node.id;
  if (!isDefined(objectMetadataId))
    throw new Error('Twitter Profiles object is not installed.');

  const fields: FieldMetadata[] = [];
  let after: string | null = null;
  do {
    const result: { fields: FieldConnection } = await client.request(
      `
      query TwitterProfileFields($objectId: UUID!, $after: ConnectionCursor) {
        fields(filter: {objectMetadataId: {eq: $objectId}}, paging: {first: 200, after: $after}) {
          edges {node {id name label type description universalIdentifier}}
          pageInfo {hasNextPage endCursor}
        }
      }`,
      { objectId: objectMetadataId, after },
    );
    fields.push(...result.fields.edges.map(({ node }) => node));
    after = result.fields.pageInfo.hasNextPage
      ? result.fields.pageInfo.endCursor
      : null;
  } while (after !== null);
  const fieldsByName = new Map(fields.map((field) => [field.name, field]));
  const definitions = getTwitterMetricFields(options);
  const activeFieldIds = new Set<string>();

  for (const definition of definitions) {
    let field = fieldsByName.get(definition.name);
    if (
      isDefined(field) &&
      (field.description !== TWITTER_METRIC_FIELD_DESCRIPTION ||
        field.type !== 'NUMBER')
    ) {
      throw new Error(
        `A conflicting field already exists: ${definition.name}. No existing field was overwritten.`,
      );
    }
    if (!isDefined(field)) {
      const result = await client.request<{ createOneField: FieldMetadata }>(
        `
        mutation CreateTwitterMetricField($field: CreateFieldInput!) {
          createOneField(input: {field: $field}) {id name label type description universalIdentifier}
        }`,
        {
          field: {
            objectMetadataId,
            name: definition.name,
            label: definition.label,
            description: TWITTER_METRIC_FIELD_DESCRIPTION,
            type: 'NUMBER',
            icon: definition.icon,
            isNullable: true,
            settings: {
              type: definition.format,
              decimals: definition.format === 'percentage' ? 2 : 0,
            },
          },
        },
      );
      field = result.createOneField;
      fields.push(field);
      fieldsByName.set(field.name, field);
    }
    activeFieldIds.add(field.id);
  }

  const managedFields = new Map(
    fields
      .filter(
        (field) =>
          LEGACY_METRIC_FIELD_IDENTIFIERS.has(field.universalIdentifier) ||
          (field.name.startsWith(TWITTER_METRIC_FIELD_PREFIX) &&
            field.description === TWITTER_METRIC_FIELD_DESCRIPTION),
      )
      .map((field) => [field.id, field]),
  );
  const { getViews: views } = await client.request<{ getViews: View[] }>(
    `
    query TwitterProfileViews($objectId: String!) {
      getViews(objectMetadataId: $objectId) {id universalIdentifier type viewFields {id fieldMetadataId isVisible position}}
    }`,
    { objectId: objectMetadataId },
  );
  const orderedFieldIds = definitions
    .map(({ name }) => fieldsByName.get(name)?.id)
    .filter(isDefined);
  for (const view of views.filter(
    (view) =>
      view.universalIdentifier === TWITTER_PROFILE_VIEW_UNIVERSAL_IDENTIFIER ||
      view.type === 'FIELDS_WIDGET',
  )) {
    for (const viewField of view.viewFields) {
      if (!managedFields.has(viewField.fieldMetadataId)) continue;
      const isVisible = activeFieldIds.has(viewField.fieldMetadataId);
      if (viewField.isVisible !== isVisible) {
        await client.request(
          `mutation UpdateTwitterMetricVisibility($input: UpdateViewFieldInput!) {
          updateViewField(input: $input) {id}
        }`,
          { input: { id: viewField.id, update: { isVisible } } },
        );
      }
    }
    const existingFieldIds = new Set(
      view.viewFields.map(({ fieldMetadataId }) => fieldMetadataId),
    );
    const nextPosition =
      Math.max(0, ...view.viewFields.map(({ position }) => position)) + 1;
    const inputs = orderedFieldIds
      .filter((id) => !existingFieldIds.has(id))
      .map((fieldMetadataId, index) => ({
        viewId: view.id,
        fieldMetadataId,
        isVisible: true,
        size: 260,
        position: nextPosition + index,
      }));
    if (inputs.length > 0) {
      await client.request(
        `mutation AddTwitterMetricColumns($inputs: [CreateViewFieldInput!]!) {
        createManyViewFields(inputs: $inputs) {id}
      }`,
        { inputs },
      );
    }
  }
};
