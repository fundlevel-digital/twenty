import { EXTERNAL_APPLICATION_AGENT_MODEL_ID } from 'twenty-shared/ai';
import { NativeApplicationAgentService } from './native-application-agent.service';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { type FlatAgent } from 'src/engine/metadata-modules/flat-agent/types/flat-agent.type';
import { canManifestExpressFlatEntity } from 'src/engine/core-modules/application/application-manifest/utils/can-manifest-express-flat-entity.util';
const application = {
  id: 'app',
  universalIdentifier: 'app-uid',
  name: 'OpenBot',
} as FlatApplication;
const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Research Bot',
  enabled: true,
};
const agents: Record<string, FlatAgent> = {};
const cache = { getOrRecompute: jest.fn() };
const migrations = { validateBuildAndRunWorkspaceMigration: jest.fn() };
const service = new NativeApplicationAgentService(
  cache as never,
  migrations as never,
);
beforeEach(() => {
  jest.resetAllMocks();
  for (const id of Object.keys(agents)) {
    delete agents[id];
  }
  cache.getOrRecompute.mockImplementation(async () => ({
    flatAgentMaps: {
      byUniversalIdentifier: agents,
      universalIdentifierById: Object.fromEntries(
        Object.values(agents).map((agent) => [
          agent.id,
          agent.universalIdentifier,
        ]),
      ),
    },
    flatRoleMaps: {},
  }));
  migrations.validateBuildAndRunWorkspaceMigration.mockImplementation(
    async ({ allFlatEntityOperationByMetadataName: { agent } }) => {
      for (const row of [
        ...agent.flatEntityToCreate,
        ...agent.flatEntityToUpdate,
      ]) {
        agents[row.universalIdentifier] = row;
      }
      return { status: 'success' };
    },
  );
});
it('enrolls a real app-owned native Agent with a stable identity and external execution', async () => {
  await service.ensure('workspace', application, profile);
  const agent = await service.find('workspace', profile.id);
  expect(agent).toMatchObject({
    id: profile.id,
    label: profile.name,
    applicationId: application.id,
    modelId: EXTERNAL_APPLICATION_AGENT_MODEL_ID,
    isActive: true,
  });
  expect(migrations.validateBuildAndRunWorkspaceMigration).toHaveBeenCalledWith(
    expect.objectContaining({
      applicationUniversalIdentifier: application.universalIdentifier,
    }),
  );
  await service.ensure('workspace', application, profile);
  expect(
    migrations.validateBuildAndRunWorkspaceMigration,
  ).toHaveBeenCalledTimes(1);
  await service.ensure('workspace', application, {
    ...profile,
    name: 'Renamed',
    enabled: false,
  });
  expect(await service.find('workspace', profile.id)).toMatchObject({
    id: profile.id,
    label: 'Renamed',
    isActive: false,
  });
});
it('does not claim another app’s identity or replace a native model agent', async () => {
  await service.ensure('workspace', application, profile);
  await expect(
    service.ensure('workspace', { ...application, id: 'other' }, profile),
  ).rejects.toThrow('already owned');
  agents[profile.id] = { ...agents[profile.id]!, modelId: 'native-model' };
  await expect(
    service.ensure('workspace', application, profile),
  ).rejects.toThrow('already owned');
});
it('keeps runtime-enrolled Agents out of inferred manifest deletions', () => {
  expect(
    canManifestExpressFlatEntity({
      metadataName: 'agent',
      flatEntity: {
        universalIdentifier: profile.id,
        modelId: EXTERNAL_APPLICATION_AGENT_MODEL_ID,
      },
    }),
  ).toBe(false);
  expect(
    canManifestExpressFlatEntity({
      metadataName: 'agent',
      flatEntity: { universalIdentifier: profile.id, modelId: 'model' },
    }),
  ).toBe(true);
});
