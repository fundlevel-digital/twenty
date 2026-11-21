import { MessageChannelVisibility } from 'twenty-shared/types';

import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { buildAppConversationRecordVisibilityFilter } from 'src/engine/core-modules/messaging/utils/build-app-conversation-record-visibility-filter.util';
import { getFlatMessagingProviderMock } from 'src/engine/metadata-modules/flat-messaging-provider/__mocks__/get-flat-messaging-provider.mock';

const OBJECT_METADATA = {
  id: '20202020-1c25-4d02-bf25-6aeccf7ea416',
  universalIdentifier: '20202020-1c25-4d02-bf25-6aeccf7ea417',
  applicationId: '20202020-1c25-4d02-bf25-6aeccf7ea413',
};
const PROVIDER = getFlatMessagingProviderMock({
  channelObjectUniversalIdentifier: OBJECT_METADATA.universalIdentifier,
});
const AUTH_CONTEXT = {
  type: 'user',
  workspace: { id: PROVIDER.workspaceId },
  userWorkspaceId: 'viewer-user-workspace-id',
} as WorkspaceAuthContext;

const buildFilter = ({
  provider = PROVIDER,
  authContext = AUTH_CONTEXT,
} = {}) =>
  buildAppConversationRecordVisibilityFilter({
    workspaceId: PROVIDER.workspaceId,
    recordAlias: 'channel',
    objectMetadata: OBJECT_METADATA,
    flatMessagingProviderMaps: {
      byUniversalIdentifier: { [provider.universalIdentifier]: provider },
    },
    authContext,
  });

describe('buildAppConversationRecordVisibilityFilter', () => {
  it('requires a binding in this workspace and provider application before ownership or sharing', () => {
    const filter = buildFilter();
    expect(filter?.condition).toContain(
      '"appConversationFolder"."applicationRecordId" = "channel"."id"',
    );
    expect(filter?.condition).toContain(
      '"appConversationFolder"."workspaceId" =',
    );
    expect(filter?.condition).toContain(
      '"appConversationChannel"."workspaceId" =',
    );
    expect(filter?.condition).toContain(
      '"appConversationAccount"."workspaceId" =',
    );
    expect(filter?.condition).toContain(
      '"appConversationChannel"."messagingProviderUniversalIdentifier" = ANY(',
    );
    expect(filter?.condition).toContain(
      '"appConversationAccount"."applicationId" =',
    );
    expect(Object.values(filter?.parameters ?? {})).toEqual(
      expect.arrayContaining([
        PROVIDER.workspaceId,
        PROVIDER.applicationId,
        [PROVIDER.universalIdentifier],
        'viewer-user-workspace-id',
        [
          MessageChannelVisibility.SUBJECT,
          MessageChannelVisibility.SHARE_EVERYTHING,
        ],
      ]),
    );
    expect(filter?.condition).not.toContain('isSynced');
  });

  it.each([
    { channelObjectUniversalIdentifier: null },
    { channelObjectUniversalIdentifier: 'another-object' },
    { applicationId: 'another-app' },
  ])(
    'preserves objects without a matching owned provider declaration: %j',
    (overrides) => {
      expect(
        buildFilter({ provider: { ...PROVIDER, ...overrides } }),
      ).toBeUndefined();
    },
  );

  it('lets the owning application synchronize records before binding their folders', () => {
    expect(
      buildFilter({
        authContext: {
          type: 'application',
          workspace: { id: PROVIDER.workspaceId },
          application: { id: PROVIDER.applicationId },
        } as WorkspaceAuthContext,
      }),
    ).toBeUndefined();
  });

  it('keeps an owning application acting as a user subject to user visibility', () => {
    expect(
      buildFilter({
        authContext: {
          ...AUTH_CONTEXT,
          application: { id: PROVIDER.applicationId },
        } as WorkspaceAuthContext,
      }),
    ).toBeDefined();
  });

  it.each([
    { type: 'apiKey', apiKey: { id: 'api-key-id' } },
    { type: 'application', application: { id: 'another-app' } },
  ])('grants no connection-owner exception to %j', (authContext) => {
    const filter = buildFilter({
      authContext: {
        ...authContext,
        workspace: { id: PROVIDER.workspaceId },
      } as WorkspaceAuthContext,
    });
    expect(filter).toBeDefined();
    expect(Object.values(filter?.parameters ?? {})).toContain(null);
    expect(Object.values(filter?.parameters ?? {})).not.toContain(
      'viewer-user-workspace-id',
    );
  });
});
