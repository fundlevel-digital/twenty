import { isUserAuthContext } from 'src/engine/core-modules/auth/guards/is-user-auth-context.guard';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

export const buildProviderMessageVisibilityFilter = ({
  workspaceId,
  messageAlias,
  authContext,
}: {
  workspaceId: string;
  messageAlias: string;
  authContext: WorkspaceAuthContext;
}) => ({
  condition: `(
    "${messageAlias}"."providerMetadata"->>'deletedAt' IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM "${getWorkspaceSchemaName(workspaceId)}"."messageParticipant" "deletedMessageSender"
      WHERE "deletedMessageSender"."messageId" = "${messageAlias}"."id"
        AND "deletedMessageSender"."role" = 'FROM'
        AND "deletedMessageSender"."deletedAt" IS NULL
        AND "deletedMessageSender"."workspaceMemberId" IS NOT NULL
        AND "deletedMessageSender"."workspaceMemberId" IS DISTINCT FROM :providerDeletionViewerWorkspaceMemberId
    )
  )`,
  parameters: {
    providerDeletionViewerWorkspaceMemberId: isUserAuthContext(authContext)
      ? authContext.workspaceMemberId
      : null,
  },
});
