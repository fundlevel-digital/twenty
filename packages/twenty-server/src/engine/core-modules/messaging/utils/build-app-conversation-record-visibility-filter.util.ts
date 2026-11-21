import { MessageChannelVisibility } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { isApplicationAuthContext } from 'src/engine/core-modules/auth/guards/is-application-auth-context.guard';
import { isUserAuthContext } from 'src/engine/core-modules/auth/guards/is-user-auth-context.guard';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type FlatMessagingProviderMaps } from 'src/engine/metadata-modules/flat-messaging-provider/types/flat-messaging-provider-maps.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type SQLCondition } from 'src/engine/permissions/types/sql-condition.type';
import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';

export const buildAppConversationRecordVisibilityFilter = ({
  workspaceId,
  recordAlias,
  objectMetadata,
  flatMessagingProviderMaps,
  authContext,
}: {
  workspaceId: string;
  recordAlias: string;
  objectMetadata: Pick<
    FlatObjectMetadata,
    'id' | 'universalIdentifier' | 'applicationId'
  >;
  flatMessagingProviderMaps: Pick<
    FlatMessagingProviderMaps,
    'byUniversalIdentifier'
  >;
  authContext: WorkspaceAuthContext;
}):
  | { condition: string; parameters: SQLCondition['parameters'] }
  | undefined => {
  const providers = Object.values(
    flatMessagingProviderMaps.byUniversalIdentifier,
  )
    .filter(isDefined)
    .filter(
      (provider) =>
        provider.channelObjectUniversalIdentifier ===
          objectMetadata.universalIdentifier &&
        provider.applicationId === objectMetadata.applicationId,
    );

  if (
    providers.length === 0 ||
    (isApplicationAuthContext(authContext) &&
      authContext.application.id === objectMetadata.applicationId)
  ) {
    return undefined;
  }

  const parameterPrefix = `appConversation_${objectMetadata.id.replace(/-/g, '_')}`;
  const workspaceIdParameter = `${parameterPrefix}WorkspaceId`;
  const applicationIdParameter = `${parameterPrefix}ApplicationId`;
  const providerIdsParameter = `${parameterPrefix}ProviderIds`;
  const viewerParameter = `${parameterPrefix}ViewerUserWorkspaceId`;
  const visibilityParameter = `${parameterPrefix}Visibilities`;

  return {
    condition: `EXISTS (
      SELECT 1 FROM "core"."messageFolder" "appConversationFolder"
      INNER JOIN "core"."messageChannel" "appConversationChannel"
        ON "appConversationChannel"."id" = "appConversationFolder"."messageChannelId"
      INNER JOIN "core"."connectedAccount" "appConversationAccount"
        ON "appConversationAccount"."id" = "appConversationChannel"."connectedAccountId"
      WHERE "appConversationFolder"."applicationRecordId" = ${escapeIdentifier(recordAlias)}."id"
        AND "appConversationFolder"."workspaceId" = :${workspaceIdParameter}
        AND "appConversationChannel"."workspaceId" = :${workspaceIdParameter}
        AND "appConversationAccount"."workspaceId" = :${workspaceIdParameter}
        AND "appConversationChannel"."messagingProviderUniversalIdentifier" = ANY(:${providerIdsParameter})
        AND "appConversationAccount"."applicationId" = :${applicationIdParameter}
        AND (
          "appConversationAccount"."userWorkspaceId" = :${viewerParameter}
          OR "appConversationChannel"."visibility" IN (:...${visibilityParameter})
        )
    )`,
    parameters: {
      [workspaceIdParameter]: workspaceId,
      [applicationIdParameter]: objectMetadata.applicationId,
      [providerIdsParameter]: providers.map(
        ({ universalIdentifier }) => universalIdentifier,
      ),
      [viewerParameter]: isUserAuthContext(authContext)
        ? authContext.userWorkspaceId
        : null,
      [visibilityParameter]: [
        MessageChannelVisibility.SUBJECT,
        MessageChannelVisibility.SHARE_EVERYTHING,
      ],
    },
  };
};
