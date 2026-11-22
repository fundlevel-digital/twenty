import { Injectable } from '@nestjs/common';
import { isDefined } from 'twenty-shared/utils';

import { WorkspaceMigrationRunnerActionHandler } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/interfaces/workspace-migration-runner-action-handler-service.interface';

import { findFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { findFlatEntityByUniversalIdentifierOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier-or-throw.util';
import { findManyFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-many-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { isCompositeFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-composite-flat-field-metadata.util';
import { isEnumFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-enum-flat-field-metadata.util';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { WorkspaceSchemaManagerService } from 'src/engine/twenty-orm/workspace-schema-manager/workspace-schema-manager.service';
import {
  type FlatDeleteObjectAction,
  type UniversalDeleteObjectAction,
} from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/object/types/workspace-migration-object-action.type';
import {
  type WorkspaceMigrationActionRunnerArgs,
  type WorkspaceMigrationActionRunnerContext,
} from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/types/workspace-migration-action-runner-args.type';
import { getWorkspaceSchemaContextForMigration } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/utils/get-workspace-schema-context-for-migration.util';
import {
  collectEnumOperationsForObject,
  EnumOperation,
  executeBatchEnumOperations,
} from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/utils/workspace-schema-enum-operations.util';

@Injectable()
export class DeleteObjectActionHandlerService extends WorkspaceMigrationRunnerActionHandler(
  'delete',
  'objectMetadata',
) {
  constructor(
    private readonly workspaceSchemaManagerService: WorkspaceSchemaManagerService,
  ) {
    super();
  }

  override async transpileUniversalActionToFlatAction(
    context: WorkspaceMigrationActionRunnerArgs<UniversalDeleteObjectAction>,
  ): Promise<FlatDeleteObjectAction> {
    const { action, allFlatEntityMaps } = context;

    const flatObjectMetadata = findFlatEntityByUniversalIdentifierOrThrow({
      flatEntityMaps: allFlatEntityMaps.flatObjectMetadataMaps,
      universalIdentifier: action.universalIdentifier,
    });

    return {
      type: 'delete',
      metadataName: 'objectMetadata',
      entityId: flatObjectMetadata.id,
    };
  }

  async executeForMetadata(
    context: WorkspaceMigrationActionRunnerContext<FlatDeleteObjectAction>,
  ): Promise<void> {
    const { flatAction, queryRunner } = context;

    const objectMetadataRepository =
      queryRunner.manager.getRepository<ObjectMetadataEntity>(
        ObjectMetadataEntity,
      );

    await objectMetadataRepository.delete(flatAction.entityId);
  }

  async executeForWorkspaceSchema(
    context: WorkspaceMigrationActionRunnerContext<FlatDeleteObjectAction>,
  ): Promise<void> {
    const {
      flatAction,
      queryRunner,
      allFlatEntityMaps: { flatObjectMetadataMaps, flatFieldMetadataMaps },
      workspaceId,
    } = context;

    const flatObjectMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
      flatEntityMaps: flatObjectMetadataMaps,
      flatEntityId: flatAction.entityId,
    });

    const { schemaName, tableName } = getWorkspaceSchemaContextForMigration({
      workspaceId,
      objectMetadata: flatObjectMetadata,
    });

    if (flatObjectMetadata.description?.startsWith('better-lists:v1:')) {
      const parentName = flatObjectMetadata.description
        .slice('better-lists:v1:'.length)
        .split('|')[0];
      const parent = Object.values(
        flatObjectMetadataMaps.byUniversalIdentifier,
      ).find((objectMetadata) => objectMetadata?.nameSingular === parentName);
      const membershipField = Object.values(
        flatFieldMetadataMaps.byUniversalIdentifier,
      ).find(
        (fieldMetadata) =>
          fieldMetadata?.objectMetadataId === parent?.id &&
          fieldMetadata?.name === 'betterListEntries',
      );
      if (isDefined(parent) && isDefined(membershipField)) {
        const parentContext = getWorkspaceSchemaContextForMigration({
          workspaceId,
          objectMetadata: parent,
        });
        const escape = (identifier: string) =>
          queryRunner.connection.driver.escape(identifier);
        await queryRunner.query(
          `UPDATE ${escape(parentContext.schemaName)}.${escape(parentContext.tableName)} SET "betterListEntries" = array_remove("betterListEntries", $1) WHERE $1 = ANY("betterListEntries")`,
          [`LIST_${flatObjectMetadata.id.replace(/-/g, '').toUpperCase()}`],
        );
      }
    }

    await this.workspaceSchemaManagerService.tableManager.dropTable({
      queryRunner,
      schemaName,
      tableName,
      cascade: true,
    });

    const objectFlatFieldMetadatas =
      findManyFlatEntityByIdInFlatEntityMapsOrThrow({
        flatEntityMaps: flatFieldMetadataMaps,
        flatEntityIds: flatObjectMetadata.fieldIds,
      });

    const enumOrCompositeFlatFieldMetadatas = objectFlatFieldMetadatas.filter(
      (flatFieldMetadata) =>
        isEnumFlatFieldMetadata(flatFieldMetadata) ||
        isCompositeFlatFieldMetadata(flatFieldMetadata),
    );

    const enumOperations = collectEnumOperationsForObject({
      flatFieldMetadatas: enumOrCompositeFlatFieldMetadatas,
      tableName,
      operation: EnumOperation.DROP,
    });

    await executeBatchEnumOperations({
      enumOperations,
      queryRunner,
      schemaName,
      workspaceSchemaManagerService: this.workspaceSchemaManagerService,
    });
  }
}
