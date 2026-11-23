import { EXTERNAL_APPLICATION_AGENT_MODEL_ID } from 'twenty-shared/ai';
import { type AgentEntity } from 'src/engine/metadata-modules/ai/ai-agent/entities/agent.entity';
import { type OverridableFlatEntity } from 'src/engine/metadata-modules/overrides/utils/resolve-effective-flat-entity-property.util';
import { resolveEffectiveFlatEntity } from 'src/engine/metadata-modules/overrides/utils/resolve-effective-flat-entity.util';

// The upgrade-aware adapter hides isActive until its 2.53 instance command runs, and agents stay usable meanwhile
export const resolveEffectiveAgent = <
  TAgent extends OverridableFlatEntity &
    Partial<Pick<AgentEntity, 'isActive' | 'modelId'>>,
>(
  agent: TAgent,
): TAgent => {
  const effective = resolveEffectiveFlatEntity({
    metadataName: 'agent',
    flatEntity: { ...agent, isActive: agent.isActive ?? true },
  });
  return agent.modelId === EXTERNAL_APPLICATION_AGENT_MODEL_ID
    ? { ...effective, modelId: agent.modelId }
    : effective;
};
