require('reflect-metadata');
const { join } = require('node:path');
const { NestFactory } = require('@nestjs/core');
const { DataSource } = require('typeorm');
const moduleAt = (path) => require(join(process.cwd(), 'dist', path));
const { AppModule } = moduleAt('app.module');
const { WorkspaceCacheService } = moduleAt(
  'engine/workspace-cache/services/workspace-cache.service',
);
const { PrivateRecordSystemWriteService } = moduleAt(
  'engine/permissions/private-record/services/private-record-system-write.service',
);
const { RecordShareSystemWriteService } = moduleAt(
  'engine/permissions/record-share/services/record-share-system-write.service',
);
const { KeyValuePairService } = moduleAt(
  'engine/core-modules/key-value-pair/key-value-pair.service',
);
const { computeObjectTargetTable } = moduleAt(
  'engine/utils/compute-object-target-table.util',
);
const { escapeIdentifier } = moduleAt(
  'engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util',
);
const APPLICATION_IDENTIFIER = '52d88794-a0fa-4e26-bbbe-8efe622efb52';
const OBJECT_NAMES = [
  'linkedinAccount',
  'linkedinConnection',
  'linkedinSyncLease',
  'linkedinChat',
  'linkedinMessage',
];
const main = async () => {
  const workspaceId = process.argv[1];
  if (!/^[0-9a-f-]{36}$/.test(workspaceId ?? ''))
    throw new Error('A workspace UUID is required.');
  const isApplying = process.argv.includes('--apply');
  const application = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const database = application.get(DataSource);
    const cache = application.get(WorkspaceCacheService);
    const maps = await cache.getOrRecompute(workspaceId, [
      'flatObjectMetadataMaps',
      'flatRoleMaps',
      'featureFlagsMap',
    ]);
    if (!maps.featureFlagsMap.IS_PRIVATE_RECORDS_ENABLED)
      throw new Error('Enable native private records in this workspace first.');
    const [installed] = await database.query(
      'SELECT id,"defaultRoleId" FROM core.application WHERE "workspaceId"=$1 AND "universalIdentifier"=$2',
      [workspaceId, APPLICATION_IDENTIFIER],
    );
    const [grant] = await database.query(
      'SELECT "roleId" FROM core."roleTarget" WHERE "workspaceId"=$1 AND "targetApplicationId"=$2',
      [workspaceId, installed?.id],
    );
    if (!grant?.roleId || !installed?.defaultRoleId)
      throw new Error('Install LinkedIn Sync before configuring privacy.');
    const runtimeRoleId = installed.defaultRoleId;
    installed.defaultRoleId = grant.roleId;
    const [workspace] = await database.query(
      'SELECT "databaseSchema" FROM core.workspace WHERE id=$1',
      [workspaceId],
    );
    const objects = Object.values(
      maps.flatObjectMetadataMaps.byUniversalIdentifier,
    )
      .filter(Boolean)
      .filter(
        (object) =>
          OBJECT_NAMES.includes(object.nameSingular) &&
          object.applicationId === installed.id,
      );
    const schemaName = workspace.databaseSchema;
    const tableFor = (object) =>
      `${escapeIdentifier(schemaName)}.${escapeIdentifier(computeObjectTargetTable(object))}`;
    const plans = [];
    for (const object of objects) {
      const hasOwner = ['linkedinAccount', 'linkedinConnection'].includes(
        object.nameSingular,
      );
      const accountObject = objects.find(
        (candidate) => candidate.nameSingular === 'linkedinAccount',
      );
      const records =
        object.nameSingular === 'linkedinConnection'
          ? await database.query(
              `SELECT records.id, COALESCE(records."ownerId",account."ownerId") AS "ownerId",records.visibility FROM ${tableFor(object)} records LEFT JOIN ${tableFor(accountObject)} account ON account.id=records."accountId"`,
            )
          : await database.query(
              `SELECT id,${hasOwner ? '"ownerId"' : 'NULL::uuid AS "ownerId"'},NULL::text AS visibility FROM ${tableFor(object)}`,
            );
      const shares = await database.query(
        `SELECT "recordId","principalId","principalType","accessLevel" FROM ${escapeIdentifier(schemaName)}."recordShare" WHERE "objectMetadataId"=$1 AND "deletedAt" IS NULL`,
        [object.id],
      );
      const recordsById = new Map(records.map((record) => [record.id, record]));
      for (const share of shares) {
        const record = recordsById.get(share.recordId);
        if (!record) continue;
        if (
          share.accessLevel !== 'FULL' ||
          !(
            (share.principalType === 'ROLE' &&
              [installed.defaultRoleId, runtimeRoleId].includes(
                share.principalId,
              )) ||
            (share.principalType === 'WORKSPACE_MEMBER' &&
              share.principalId === record.ownerId)
          )
        )
          throw new Error(
            `Review existing shares on ${object.nameSingular} before configuring privacy.`,
          );
      }
      const creators = await database.query(
        `SELECT count(*)::integer AS count FROM ${tableFor(object)} WHERE "createdByWorkspaceMemberId" IS NOT NULL${hasOwner ? ' AND "createdByWorkspaceMemberId" IS DISTINCT FROM "ownerId"' : ''}`,
      );
      if (creators[0].count)
        throw new Error(
          `Review non-owner record creators on ${object.nameSingular} before configuring privacy.`,
        );
      plans.push({ object, records });
    }
    console.log(
      JSON.stringify(
        plans.map(({ object, records }) => ({
          object: object.nameSingular,
          records: records.length,
          private:
            object.nameSingular !== 'linkedinConnection'
              ? records.length
              : records.filter((record) => record.visibility === 'OWNER')
                  .length,
        })),
      ),
    );
    if (!isApplying) {
      console.log(
        'Preview only. Pass --apply to configure native record sharing.',
      );
      return;
    }
    const shares = application.get(RecordShareSystemWriteService);
    const privacy = application.get(PrivateRecordSystemWriteService);
    await database.transaction(async (manager) => {
      const transactionScope = {
        workspaceId,
        executeRawQuery: (sql, parameters) => manager.query(sql, parameters),
      };
      for (const { object, records } of plans) {
        for (let offset = 0; offset < records.length; offset += 200) {
          const batch = records.slice(offset, offset + 200);
          if (object.nameSingular === 'linkedinConnection') {
            for (const record of batch.filter((record) => record.ownerId)) {
              await manager.query(
                `UPDATE ${tableFor(object)} SET "ownerId"=$1 WHERE id=$2 AND "ownerId" IS NULL`,
                [record.ownerId, record.id],
              );
            }
          }
          const recordShares = batch.flatMap((record) => [
            {
              recordId: record.id,
              objectMetadataId: object.id,
              principalType: 'ROLE',
              principalId: installed.defaultRoleId,
              accessLevel: 'FULL',
              rowCause: 'MANUAL',
              sourceId: record.id,
            },
            ...(record.ownerId
              ? [
                  {
                    recordId: record.id,
                    objectMetadataId: object.id,
                    principalType: 'WORKSPACE_MEMBER',
                    principalId: record.ownerId,
                    accessLevel: 'FULL',
                    rowCause: 'MANUAL',
                    sourceId: record.id,
                  },
                ]
              : []),
          ]);
          await shares.insertRecordShares({
            workspaceId,
            recordShares,
            transactionScope,
          });
          for (const isPrivate of [true, false]) {
            const targetIds = batch
              .filter(
                (record) =>
                  (object.nameSingular !== 'linkedinConnection' ||
                    record.visibility === 'OWNER') === isPrivate,
              )
              .map((record) => record.id);
            if (targetIds.length)
              await privacy.setRecordsPrivacy({
                workspaceId,
                objectMetadataId: object.id,
                recordIds: targetIds,
                isPrivate,
                transactionScope,
              });
          }
        }
      }
    });
    await application.get(KeyValuePairService).set({
      workspaceId,
      applicationId: installed.id,
      type: 'APPLICATION_VARIABLE',
      key: 'linkedin-private-records-role-id',
      value: installed.defaultRoleId,
    });
    const connectionObject = objects.find(
      (object) => object.nameSingular === 'linkedinConnection',
    );
    if (connectionObject)
      await application.get(KeyValuePairService).set({
        workspaceId,
        applicationId: installed.id,
        type: 'APPLICATION_VARIABLE',
        key: 'linkedin-private-records-connection-object-id',
        value: connectionObject.id,
      });
    console.log(
      'Native privacy and application/owner grants configured. Verify two-member reads before enabling CONNECTION_PRIVACY_READY.',
    );
  } finally {
    await application.close();
  }
};
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
