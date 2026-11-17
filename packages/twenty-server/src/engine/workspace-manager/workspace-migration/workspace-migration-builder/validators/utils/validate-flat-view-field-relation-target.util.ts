import { type MessageDescriptor } from '@lingui/core';
import { msg, t } from '@lingui/core/macro';
import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { isRelationUniversalFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-relation-universal-flat-field-metadata-of-type.util';
import { VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS } from 'src/engine/metadata-modules/flat-view-field/constants/view-field-lookup-max-relation-hops.constant';
import { resolveEffectiveUniversalFlatEntityProperty } from 'src/engine/metadata-modules/overrides/utils/resolve-effective-universal-flat-entity-property.util';
import { ViewExceptionCode } from 'src/engine/metadata-modules/view/exceptions/view.exception';
import { isMorphOrRelationFieldMetadataType } from 'src/engine/utils/is-morph-or-relation-field-metadata-type.util';
import { type FlatEntityValidationError } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/types/failed-flat-entity-validation.type';
import { type AllUniversalFlatEntityMaps } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/all-universal-flat-entity-maps.type';
import { type UniversalFlatViewField } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-view-field.type';
import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';

const isLookupHopFlatFieldMetadata = (
  flatFieldMetadata: UniversalFlatFieldMetadata,
): boolean =>
  flatFieldMetadata.type === FieldMetadataType.RELATION &&
  [RelationType.MANY_TO_ONE, RelationType.ONE_TO_MANY].some((relationType) =>
    isRelationUniversalFlatFieldMetadataOfType({
      flatFieldMetadata,
      relationType,
    }),
  );

const isActiveFlatFieldMetadata = (
  flatFieldMetadata: UniversalFlatFieldMetadata,
): boolean =>
  resolveEffectiveUniversalFlatEntityProperty({
    metadataName: 'fieldMetadata',
    universalFlatEntity: flatFieldMetadata,
    property: 'isActive',
  });

const buildError = (
  message: string,
  userFriendlyMessage: MessageDescriptor,
): FlatEntityValidationError<ViewExceptionCode>[] => [
  {
    code: ViewExceptionCode.INVALID_VIEW_DATA,
    message,
    userFriendlyMessage,
  },
];

export const validateFlatViewFieldRelationTarget = ({
  flatViewField: {
    isCanonical,
    relationTargetFieldMetadataUniversalIdentifier,
    universalRelationPathFieldMetadataIds,
  },
  flatFieldMetadata,
  flatFieldMetadataMaps,
}: {
  flatViewField: Pick<
    UniversalFlatViewField,
    | 'isCanonical'
    | 'relationTargetFieldMetadataUniversalIdentifier'
    | 'universalRelationPathFieldMetadataIds'
  >;
  flatFieldMetadata: UniversalFlatFieldMetadata;
  flatFieldMetadataMaps: AllUniversalFlatEntityMaps['flatFieldMetadataMaps'];
}): FlatEntityValidationError<ViewExceptionCode>[] => {
  const relationPathFieldMetadataUniversalIdentifiers =
    universalRelationPathFieldMetadataIds ?? [];

  if (!isDefined(relationTargetFieldMetadataUniversalIdentifier)) {
    return relationPathFieldMetadataUniversalIdentifiers.length > 0
      ? buildError(
          t`A relation path needs a related record field to show`,
          msg`Pick the field to show at the end of the relation path`,
        )
      : [];
  }

  if (isCanonical) {
    return buildError(
      t`Only non-canonical view fields can show a related record field`,
      msg`Only added columns can show a field of the related record`,
    );
  }

  if (
    relationPathFieldMetadataUniversalIdentifiers.length + 1 >
    VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS
  ) {
    return buildError(
      t`A related record field can be at most ${VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS} relations away`,
      msg`This field is too many relations away to be shown in a column`,
    );
  }

  if (!isLookupHopFlatFieldMetadata(flatFieldMetadata)) {
    return buildError(
      t`A related record field can only be shown on a many-to-one or one-to-many relation field`,
      msg`Only a column linking to other records can show a field of those records`,
    );
  }

  let previousHopFlatFieldMetadata = flatFieldMetadata;
  const hopFlatFieldMetadatas: UniversalFlatFieldMetadata[] = [
    flatFieldMetadata,
  ];

  for (const hopUniversalIdentifier of relationPathFieldMetadataUniversalIdentifiers) {
    const hopFlatFieldMetadata = isDefined(hopUniversalIdentifier)
      ? findFlatEntityByUniversalIdentifier({
          universalIdentifier: hopUniversalIdentifier,
          flatEntityMaps: flatFieldMetadataMaps,
        })
      : undefined;

    if (
      !isDefined(hopFlatFieldMetadata) ||
      hopFlatFieldMetadata.objectMetadataUniversalIdentifier !==
        previousHopFlatFieldMetadata.relationTargetObjectMetadataUniversalIdentifier
    ) {
      return buildError(
        t`Each relation path field must belong to the object the previous relation points to`,
        msg`The relation path does not connect these objects`,
      );
    }

    if (!isLookupHopFlatFieldMetadata(hopFlatFieldMetadata)) {
      return buildError(
        t`Each relation path field must be a many-to-one or one-to-many relation field`,
        msg`A relation path can only follow relations to other records`,
      );
    }

    if (!isActiveFlatFieldMetadata(hopFlatFieldMetadata)) {
      return buildError(
        t`Each relation path field must be active`,
        msg`A relation path cannot go through a deactivated field`,
      );
    }

    hopFlatFieldMetadatas.push(hopFlatFieldMetadata);
    previousHopFlatFieldMetadata = hopFlatFieldMetadata;
  }

  // The record API rejects a one-to-many relation nested in another one-to-many relation
  if (
    hopFlatFieldMetadatas.filter((hopFlatFieldMetadata) =>
      isRelationUniversalFlatFieldMetadataOfType({
        flatFieldMetadata: hopFlatFieldMetadata,
        relationType: RelationType.ONE_TO_MANY,
      }),
    ).length > 1
  ) {
    return buildError(
      t`A relation path can follow at most one one-to-many relation`,
      msg`A relation path can go through only one list of related records`,
    );
  }

  const relationTargetFlatFieldMetadata = findFlatEntityByUniversalIdentifier({
    universalIdentifier: relationTargetFieldMetadataUniversalIdentifier,
    flatEntityMaps: flatFieldMetadataMaps,
  });

  if (
    !isDefined(relationTargetFlatFieldMetadata) ||
    relationTargetFlatFieldMetadata.objectMetadataUniversalIdentifier !==
      previousHopFlatFieldMetadata.relationTargetObjectMetadataUniversalIdentifier
  ) {
    return buildError(
      t`The related record field must belong to the relation target object`,
      msg`The field must belong to the related object`,
    );
  }

  if (!isActiveFlatFieldMetadata(relationTargetFlatFieldMetadata)) {
    return buildError(
      t`The related record field must be active`,
      msg`A deactivated field cannot be shown in a column`,
    );
  }

  if (
    isMorphOrRelationFieldMetadataType(relationTargetFlatFieldMetadata.type)
  ) {
    return buildError(
      t`The related record field cannot be a relation`,
      msg`A related record's relation cannot be shown in a column`,
    );
  }

  return [];
};
