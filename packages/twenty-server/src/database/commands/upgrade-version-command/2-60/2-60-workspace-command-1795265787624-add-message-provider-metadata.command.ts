import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { type CreateFieldInput } from 'src/engine/metadata-modules/field-metadata/dtos/create-field.input';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

const MESSAGE_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.message.universalIdentifier;

const PROVIDER_METADATA_FIELD_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.message.fields.providerMetadata.universalIdentifier;

@RegisteredWorkspaceCommand('2.60.0', 1795265787624)
@Command({
  name: 'upgrade:2-60:add-message-provider-metadata',
  description: 'Add provider message metadata to existing workspaces.',
})
export class AddMessageProviderMetadataCommand extends ProvisionedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly fieldMetadataService: FieldMetadataService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatObjectMetadataMaps',
        'flatFieldMetadataMaps',
      ]);

    const messageObject =
      findFlatEntityByUniversalIdentifier<FlatObjectMetadata>({
        flatEntityMaps: flatObjectMetadataMaps,
        universalIdentifier: MESSAGE_UNIVERSAL_IDENTIFIER,
      });

    if (!isDefined(messageObject)) {
      this.logger.log(
        `message object not found for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const existingProviderMetadataField =
      findFlatEntityByUniversalIdentifier<FlatFieldMetadata>({
        flatEntityMaps: flatFieldMetadataMaps,
        universalIdentifier: PROVIDER_METADATA_FIELD_UNIVERSAL_IDENTIFIER,
      });

    if (isDefined(existingProviderMetadataField)) {
      this.logger.log(
        `providerMetadata field already present on message for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const createFieldInput: Omit<CreateFieldInput, 'workspaceId'> = {
      objectMetadataId: messageObject.id,
      name: 'providerMetadata',
      type: FieldMetadataType.RAW_JSON,
      label: 'Provider metadata',
      description:
        'Provider message reactions, link, edits and deletion state',
      icon: 'IconMessage',
      isNullable: true,
      isUIReadOnly: true,
      isSystem: true,
      isActive: true,
      universalIdentifier: PROVIDER_METADATA_FIELD_UNIVERSAL_IDENTIFIER,
    };

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would create providerMetadata field on message for workspace ${workspaceId}`,
      );

      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    try {
      await this.fieldMetadataService.createManyFields({
        shouldDeferActions: false,
        createFieldInputs: [createFieldInput],
        workspaceId,
        ownerFlatApplication: twentyStandardFlatApplication,
        isSystemBuild: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to add providerMetadata field on message for workspace ${workspaceId}:\n${
          error instanceof Error ? error.stack : JSON.stringify(error, null, 2)
        }`,
      );
      throw error;
    }

    this.logger.log(
      `Added providerMetadata field on message for workspace ${workspaceId}`,
    );
  }
}
