import { ApplicationKeyValueService } from './application-key-value.service';
import { AppKeyValueScope } from '../enums/app-key-value-scope.enum';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';

it('prevents an app from overwriting a native assistant identity or reply grant through general KV writes', async () => {
  const upsert = jest.fn();
  const service = new ApplicationKeyValueService(
    ...([{ upsert }, {}, {}] as unknown as ConstructorParameters<
      typeof ApplicationKeyValueService
    >),
  );
  for (const key of [
    'external-assistant:profile:bot',
    'external-assistant:request:grant',
  ])
    {await expect(
      service.set({
        application: { id: 'app' } as FlatApplication,
        workspaceId: 'workspace',
        key,
        value: { threadId: 'arbitrary' },
        scope: AppKeyValueScope.WORKSPACE,
      }),
    ).rejects.toThrow('managed by the native assistant API');}
  expect(upsert).not.toHaveBeenCalled();
});
