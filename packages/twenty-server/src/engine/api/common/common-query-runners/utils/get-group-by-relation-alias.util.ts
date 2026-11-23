import { createHash } from 'crypto';

import { type OrmFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/orm-flat-field-metadata.type';

export const getGroupByRelationAlias = (
  path: Pick<OrmFlatFieldMetadata, 'id' | 'name'>[],
  objectAlias?: string,
) =>
  path.length === 1 && path[0].name !== objectAlias
    ? path[0].name
    : `group_by_${createHash('sha256')
        .update(path.map((field) => field.id).join('.'))
        .digest('hex')
        .slice(0, 16)}`;
