import { Injectable } from '@nestjs/common';
import { type ObjectRecordEvent } from 'twenty-shared/database-events';
import { isDefined } from 'twenty-shared/utils';
import { type ObjectRecord } from 'twenty-shared/types';

import { OnDatabaseBatchEvent } from 'src/engine/workspace-event-emitter/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/workspace-event-emitter/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const BETTER_LIST_PREFIX = 'better-lists:v1:';

type ListEntry = ObjectRecord & { parentRecordId: string | null };
type ParentRecord = ObjectRecord & { betterListEntries: string[] | null };

@Injectable()
export class BetterListsListener {
  constructor(private readonly workspaceOrmManager: WorkspaceOrmManager) {}

  @OnDatabaseBatchEvent('*', DatabaseEventAction.CREATED)
  @OnDatabaseBatchEvent('*', DatabaseEventAction.UPDATED)
  @OnDatabaseBatchEvent('*', DatabaseEventAction.DELETED)
  @OnDatabaseBatchEvent('*', DatabaseEventAction.DESTROYED)
  @OnDatabaseBatchEvent('*', DatabaseEventAction.RESTORED)
  @OnDatabaseBatchEvent('*', DatabaseEventAction.UPSERTED)
  async synchronizeMembership(
    payload: WorkspaceEventBatch<ObjectRecordEvent<ListEntry>>,
  ) {
    const description = payload.objectMetadata.description;
    if (!description?.startsWith(BETTER_LIST_PREFIX)) {
      return;
    }
    const parentObjectName = description
      .slice(BETTER_LIST_PREFIX.length)
      .split('|')[0];
    if (!parentObjectName) {
      return;
    }
    const parentIds = new Set<string>();
    for (const event of payload.events) {
      for (const record of [
        'before' in event.properties ? event.properties.before : undefined,
        'after' in event.properties ? event.properties.after : undefined,
      ]) {
        if (isDefined(record?.parentRecordId)) {
          parentIds.add(record.parentRecordId);
        }
      }
    }
    await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
      for (const parentId of [...parentIds].sort()) {
        await this.workspaceOrmManager.runInWorkspaceTransaction(
          async (transaction) => {
            // Serialize memberships from different lists to avoid lost multi-select updates.
            await transaction.executeRawQuery(
              'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
              [`${payload.workspaceId}:${parentId}`],
            );
            const parentRepository =
              transaction.getRepositoryWithoutPermissionChecks<ParentRecord>(
                parentObjectName,
                { shouldSkipEventEmission: true },
              );
            const parent = await parentRepository.findOne({
              where: { id: parentId },
            });
            if (!isDefined(parent)) {
              return;
            }
            const entryRepository =
              transaction.getRepositoryWithoutPermissionChecks<ListEntry>(
                payload.objectMetadata.nameSingular,
              );
            const hasMembership = await entryRepository.exists({
              where: { parentRecordId: parentId },
            });
            const memberships = new Set(parent.betterListEntries ?? []);
            const membershipValue = `LIST_${payload.objectMetadata.id.replace(/-/g, '').toUpperCase()}`;
            if (hasMembership) {
              memberships.add(membershipValue);
            } else {
              memberships.delete(membershipValue);
            }
            await parentRepository.update(parentId, {
              betterListEntries: [...memberships],
            });
          },
        );
      }
    }, buildSystemAuthContext(payload.workspaceId));
  }
}
