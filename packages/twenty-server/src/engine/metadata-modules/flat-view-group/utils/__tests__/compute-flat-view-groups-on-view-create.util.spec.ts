import { FieldMetadataType } from 'twenty-shared/types';

import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { getFlatFieldMetadataMock } from 'src/engine/metadata-modules/flat-field-metadata/__mocks__/get-flat-field-metadata.mock';
import { computeFlatViewGroupsOnViewCreate } from 'src/engine/metadata-modules/flat-view-group/utils/compute-flat-view-groups-on-view-create.util';

const computedSelectField = getFlatFieldMetadataMock<FieldMetadataType.SELECT>({
  id: 'reply-status-id',
  universalIdentifier: 'reply-status',
  objectMetadataId: 'influencer-id',
  type: FieldMetadataType.SELECT,
  isNullable: true,
  computation: {
    kind: 'FORMULA',
    expression: "if(lastInboundAt > lastOutboundAt, 'THEM', 'US')",
  },
  options: ['US', 'THEM'].map((value, position) => ({
    id: `00000000-0000-0000-0000-00000000000${position}`,
    value,
    label: value,
    position,
    color: 'gray',
  })),
});

describe('computeFlatViewGroupsOnViewCreate', () => {
  it('creates a group per option of a computed select, and one for no value', () => {
    const flatViewGroups = computeFlatViewGroupsOnViewCreate({
      flatViewToCreateUniversalIdentifier: 'view',
      mainGroupByFieldMetadataId: computedSelectField.id,
      flatFieldMetadataMaps: {
        byUniversalIdentifier: {
          [computedSelectField.universalIdentifier]: computedSelectField,
        },
        universalIdentifierById: {
          [computedSelectField.id]: computedSelectField.universalIdentifier,
        },
        universalIdentifiersByApplicationId: {},
      },
      flatFieldMetadataOptionMaps: createEmptyFlatEntityMaps(),
    });

    expect(
      flatViewGroups.map(({ fieldValue, position }) => ({
        fieldValue,
        position,
      })),
    ).toEqual([
      { fieldValue: 'US', position: 0 },
      { fieldValue: 'THEM', position: 1 },
      { fieldValue: '', position: 2 },
    ]);
  });
});
