import { Injectable } from '@nestjs/common';
import { EXTERNAL_APPLICATION_AGENT_MODEL_ID } from 'twenty-shared/ai';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';
import { fromCreateAgentInputToFlatAgent } from 'src/engine/metadata-modules/ai/ai-agent/utils/from-create-agent-input-to-flat-agent.util';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { resolveEffectiveAgent } from 'src/engine/metadata-modules/flat-agent/utils/resolve-effective-agent.util';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';
import { WorkspaceMigrationBuilderException } from 'src/engine/workspace-manager/workspace-migration/exceptions/workspace-migration-builder-exception';

@Injectable()
export class NativeApplicationAgentService {
  constructor(
    private readonly cache: WorkspaceCacheService,
    private readonly migrations: WorkspaceMigrationValidateBuildAndRunService,
  ) {}

  async find(workspaceId: string, id: string) {
    const { flatAgentMaps } = await this.cache.getOrRecompute(workspaceId, [
      'flatAgentMaps',
    ]);
    const agent = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: id,
      flatEntityMaps: flatAgentMaps,
    });
    return agent ? resolveEffectiveAgent(agent) : undefined;
  }

  async ensure(
    workspaceId: string,
    application: FlatApplication,
    profile: { id: string; name: string; enabled: boolean },
  ) {
    const { flatAgentMaps, flatRoleMaps } = await this.cache.getOrRecompute(
      workspaceId,
      ['flatAgentMaps', 'flatRoleMaps'],
    );
    const existing = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: profile.id,
      flatEntityMaps: flatAgentMaps,
    });
    if (
      existing &&
      (existing.applicationId !== application.id ||
        existing.modelId !== EXTERNAL_APPLICATION_AGENT_MODEL_ID)
    ) {
      throw new AiException(
        'Agent identity is already owned',
        AiExceptionCode.INVALID_AGENT_INPUT,
      );
    }
    if (
      existing &&
      existing.label === profile.name &&
      existing.isActive === profile.enabled
    ) {
      return;
    }
    const { flatAgentToCreate } = fromCreateAgentInputToFlatAgent({
      createAgentInput: {
        name: `externalAgent${profile.id.replace(/-/g, '')}`,
        label: profile.name,
        description: `Executed by ${application.name}. Configure this agent in the application settings.`,
        prompt:
          'Execution is delegated to the owning application. No native model is invoked.',
        modelId: EXTERNAL_APPLICATION_AGENT_MODEL_ID,
        avatarColor: 'blue',
        avatarShape: 'circle',
      },
      isSystem: false,
      workspaceId,
      userWorkspaceId: undefined,
      flatApplication: application,
      flatRoleMaps,
    });
    const agent = {
      ...(existing ?? flatAgentToCreate),
      id: profile.id,
      universalIdentifier: existing?.universalIdentifier ?? profile.id,
      label: profile.name,
      isActive: profile.enabled,
    };
    const result = await this.migrations.validateBuildAndRunWorkspaceMigration({
      workspaceId,
      isSystemBuild: false,
      applicationUniversalIdentifier: application.universalIdentifier,
      allFlatEntityOperationByMetadataName: {
        agent: {
          flatEntityToCreate: existing ? [] : [agent],
          flatEntityToUpdate: existing ? [agent] : [],
          flatEntityToDelete: [],
        },
      },
    });
    if (result.status === 'fail') {
      throw new WorkspaceMigrationBuilderException(
        result,
        'Could not synchronize native application agent',
      );
    }
  }
}
