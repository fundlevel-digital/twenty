import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { buildProviderMessageVisibilityFilter } from 'src/engine/core-modules/messaging/utils/build-provider-message-visibility-filter.util';
import { type SQLCondition } from 'src/engine/permissions/types/sql-condition.type';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';

export const buildMessagingReadCondition = ({
  objectNameSingular,
  alias,
  workspaceId,
  authContext,
}: {
  objectNameSingular: string;
  alias: string;
  workspaceId: string;
  authContext: WorkspaceAuthContext;
}): SQLCondition | undefined => {
  if (objectNameSingular === 'message') {
    const { condition, parameters } = buildProviderMessageVisibilityFilter({
      workspaceId,
      messageAlias: alias,
      authContext,
    });

    return { sql: condition, parameters };
  }

  if (objectNameSingular !== 'messageThread') {
    return undefined;
  }

  const visibleMessageAlias = 'providerVisibleThreadMessage';
  const { condition, parameters } = buildProviderMessageVisibilityFilter({
    workspaceId,
    messageAlias: visibleMessageAlias,
    authContext,
  });
  const table = `${escapeIdentifier(getWorkspaceSchemaName(workspaceId))}."message"`;
  const threadColumn = `${escapeIdentifier(alias)}."id"`;

  return {
    sql: `(
      NOT EXISTS (
        SELECT 1 FROM ${table} "providerAnyThreadMessage"
        WHERE "providerAnyThreadMessage"."messageThreadId" = ${threadColumn}
          AND "providerAnyThreadMessage"."deletedAt" IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM ${table} "${visibleMessageAlias}"
        WHERE "${visibleMessageAlias}"."messageThreadId" = ${threadColumn}
          AND "${visibleMessageAlias}"."deletedAt" IS NULL
          AND ${condition}
      )
    )`,
    parameters,
  };
};
