import { Injectable, type OnModuleInit } from '@nestjs/common';

import { FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED } from 'twenty-shared/constants';
import { type ObjectRecord } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { In } from 'typeorm';

import { CommonRecordVisibilityService } from 'src/engine/api/common/common-record-visibility/common-record-visibility.service';
import { type RecordVisibilityRestrictionHandler } from 'src/engine/api/common/common-record-visibility/types/record-visibility-restriction-handler.type';
import { isSystemAuthContext } from 'src/engine/core-modules/auth/guards/is-system-auth-context.guard';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { ApplyMessagesVisibilityRestrictionsService } from 'src/modules/messaging/common/query-hooks/message/apply-messages-visibility-restrictions.service';
import { type MessageWorkspaceEntity } from 'src/modules/messaging/common/standard-objects/message.workspace-entity';

@Injectable()
export class ApplyMessageThreadsVisibilityRestrictionsService
  implements RecordVisibilityRestrictionHandler, OnModuleInit
{
  constructor(
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    private readonly commonRecordVisibilityService: CommonRecordVisibilityService,
    private readonly applyMessagesVisibilityRestrictionsService: ApplyMessagesVisibilityRestrictionsService,
  ) {}

  onModuleInit() {
    this.commonRecordVisibilityService.registerHandler({
      objectNameSingular: 'messageThread',
      handler: this,
    });
  }

  async applyVisibilityRestrictions({
    records,
    authContext,
  }: {
    records: ObjectRecord[];
    authContext: WorkspaceAuthContext;
  }): Promise<void> {
    const threads = records.filter((record) => 'subject' in record);

    if (threads.length === 0 || isSystemAuthContext(authContext)) {
      return;
    }

    const messages = await this.workspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.workspaceOrmManager
          .getRepositoryWithoutPermissionChecks<MessageWorkspaceEntity>(
            'message',
          )
          .find({
            where: { messageThreadId: In(threads.map(({ id }) => id)) },
            select: { id: true, messageThreadId: true },
          }),
      buildSystemAuthContext(authContext.workspace.id),
      { lite: true },
    );

    const { fullyVisibleMessageIds, subjectVisibleMessageIds } =
      await this.applyMessagesVisibilityRestrictionsService.findVisibleMessageIds(
        {
          messageIds: messages.map(({ id }) => id),
          authContext,
        },
      );
    const subjectVisibleThreadIds = new Set(
      messages
        .filter(
          ({ id }) =>
            fullyVisibleMessageIds.has(id) || subjectVisibleMessageIds.has(id),
        )
        .map(({ messageThreadId }) => messageThreadId)
        .filter(isDefined),
    );

    for (const thread of threads) {
      if (!subjectVisibleThreadIds.has(thread.id)) {
        thread.subject = FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED;
      }
    }
  }
}
