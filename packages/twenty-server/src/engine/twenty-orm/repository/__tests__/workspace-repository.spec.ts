import { getFlatMessagingProviderMock } from 'src/engine/metadata-modules/flat-messaging-provider/__mocks__/get-flat-messaging-provider.mock';
import { type FlatMessagingProviderMaps } from 'src/engine/metadata-modules/flat-messaging-provider/types/flat-messaging-provider-maps.type';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { FeatureFlagKey, FieldMetadataType } from 'twenty-shared/types';
import { DataSource } from 'typeorm';

import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { getFlatFieldMetadataMock } from 'src/engine/metadata-modules/flat-field-metadata/__mocks__/get-flat-field-metadata.mock';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { getFlatObjectMetadataMock } from 'src/engine/metadata-modules/flat-object-metadata/__mocks__/get-flat-object-metadata.mock';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type CompiledStatement } from 'src/engine/workspace-query-executor/utils/compile-named-parameters.util';
import { NO_RECORD_READ_RESTRICTIONS } from 'src/engine/permissions/constants/no-record-read-restrictions.constant';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace-repository';
import { type WorkspaceTableShape } from 'src/engine/twenty-orm/table-shape/types/workspace-table-shape.type';

const OBJECT_METADATA_ID = 'delivery-object-id';

const buildField = (name: string, type: FieldMetadataType) =>
  getFlatFieldMetadataMock({
    id: `field-${name}`,
    universalIdentifier: `field-${name}`,
    objectMetadataId: OBJECT_METADATA_ID,
    name,
    type,
  });

const FIELDS = [
  buildField('id', FieldMetadataType.UUID),
  buildField('state', FieldMetadataType.TEXT),
  buildField('attachments', FieldMetadataType.FILES),
  buildField('updatedAt', FieldMetadataType.DATE_TIME),
  buildField('deletedAt', FieldMetadataType.DATE_TIME),
];

const flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata> = {
  byUniversalIdentifier: Object.fromEntries(
    FIELDS.map((field) => [field.universalIdentifier, field]),
  ),
  universalIdentifierById: Object.fromEntries(
    FIELDS.map((field) => [field.id, field.universalIdentifier]),
  ),
  universalIdentifiersByApplicationId: {},
};

const flatObjectMetadata = getFlatObjectMetadataMock({
  id: OBJECT_METADATA_ID,
  universalIdentifier: OBJECT_METADATA_ID,
  nameSingular: 'delivery',
  namePlural: 'deliveries',
  isSystem: true,
  fieldIds: FIELDS.map((field) => field.id),
});

const flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata> = {
  byUniversalIdentifier: { [OBJECT_METADATA_ID]: flatObjectMetadata },
  universalIdentifierById: { [OBJECT_METADATA_ID]: OBJECT_METADATA_ID },
  universalIdentifiersByApplicationId: {},
};

const tableShape: WorkspaceTableShape = {
  objectMetadataId: OBJECT_METADATA_ID,
  nameSingular: 'delivery',
  schemaName: 'workspace_1wgvd1injqtife6y4rvfbu3h5',
  tableName: 'delivery',
  columnShapeByColumnName: Object.fromEntries(
    FIELDS.map((field) => [
      field.name,
      {
        columnName: field.name,
        fieldMetadataId: field.id,
        fieldName: field.name,
        fieldMetadataType: field.type,
      },
    ]),
  ),
  storedColumnNames: FIELDS.map((field) => field.name),
  computedColumnNames: [],
  relationShapeByFieldName: {},
  hasDeletedAtColumn: true,
};

const DISABLED_FEATURE_FLAGS_MAP = Object.values(FeatureFlagKey).reduce<
  Record<string, boolean>
>((featureFlagsMap, featureFlagKey) => {
  featureFlagsMap[featureFlagKey] = false;

  return featureFlagsMap;
}, {});
const API_KEY_ID = 'api-key-id';
const ROLE_ID = 'role-id';

const buildRepository = ({
  shouldBypassPermissionChecks = true,
  shouldSkipEventEmission,
  objectNameSingular = 'delivery',
  hasProviderMetadata = false,
  withMessagingRelation = false,
  authContext,
  flatMessagingProviderMaps = createEmptyFlatEntityMaps(),
}: {
  shouldBypassPermissionChecks?: boolean;
  shouldSkipEventEmission: boolean;
  objectNameSingular?: string;
  hasProviderMetadata?: boolean;
  withMessagingRelation?: boolean;
  authContext?: WorkspaceAuthContext;
  flatMessagingProviderMaps?: FlatMessagingProviderMaps;
}) => {
  const executedStatements: CompiledStatement[] = [];
  const repositoryObjectMetadata = {
    ...flatObjectMetadata,
    nameSingular: objectNameSingular,
  };
  const repositoryTableShape: WorkspaceTableShape = {
    ...tableShape,
    nameSingular: objectNameSingular,
    tableName: objectNameSingular,
    relationShapeByFieldName: withMessagingRelation
      ? {
          reply: {
            fieldName: 'reply',
            fieldMetadataId: 'reply-field-id',
            relationType: RelationType.MANY_TO_ONE,
            targetObjectMetadataId: OBJECT_METADATA_ID,
            targetFieldMetadataId: 'replies-field-id',
            joinColumnName: 'replyId',
          },
        }
      : {},
  };
  const providerMetadata = getFlatFieldMetadataMock({
    name: 'providerMetadata',
    universalIdentifier:
      STANDARD_OBJECTS.message.fields.providerMetadata.universalIdentifier,
    type: FieldMetadataType.RAW_JSON,
    objectMetadataId: OBJECT_METADATA_ID,
  });

  const repository = new WorkspaceRepository({
    tableShape: repositoryTableShape,
    flatObjectMetadata: repositoryObjectMetadata,
    internalContext: {
      workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
      featureFlagsMap: DISABLED_FEATURE_FLAGS_MAP,
      billingEntitlements: {},
      flatObjectMetadataMaps,
      flatFieldMetadataMaps: {
        ...flatFieldMetadataMaps,
        byUniversalIdentifier: {
          ...flatFieldMetadataMaps.byUniversalIdentifier,
          ...(hasProviderMetadata
            ? { [providerMetadata.universalIdentifier]: providerMetadata }
            : {}),
        },
      },
      flatIndexMaps: createEmptyFlatEntityMaps(),
      flatMessagingProviderMaps,
      permissionsPrincipals: undefined,
      recordPermissions: {
        isReadDisabled: jest.fn().mockResolvedValue(false),
        assertCanRunOperationOrThrow: jest.fn(),
        buildReadRecordsAccessSQLCondition: jest.fn().mockResolvedValue(true),
        buildWriteRecordsAccessSQLCondition: jest.fn().mockResolvedValue(true),
        assertCreatedRecordsMatchRowLevelPermissionsOrThrow: jest.fn(),
        assertUpdatesKeepRecordAccessOrThrow: jest.fn(),
      },
      recordFieldPermissions: {
        buildUnreadableFieldsSQLConditions: jest.fn().mockResolvedValue([]),
      },
      recordAccessGroupWrite: {
        isWriteTransactionRequired: jest.fn().mockResolvedValue(false),
        isRecordsBeforeWriteRequired: jest.fn().mockResolvedValue(false),
        findRelatedRecordsBeforeDelete: jest.fn().mockResolvedValue([]),
        recomputeAfterWrite: jest.fn().mockResolvedValue([]),
      },
      recordAccessGroupQueue: { queueRecompute: jest.fn() },
      recordStock: {
        assertRecordStockAvailable: jest.fn(),
        acquireRecordStock: jest.fn(),
        releaseRecordStock: jest.fn(),
      },
      objectIdByNameSingular: { delivery: OBJECT_METADATA_ID },
      eventEmitterService: { emitDatabaseBatchEvent: jest.fn() },
      coreDataSource: new DataSource({ type: 'postgres' }),
      recordReadRestrictions: NO_RECORD_READ_RESTRICTIONS,
    },
    authContext:
      authContext ??
      ({
        type: 'apiKey',
        apiKey: { id: API_KEY_ID },
        workspace: { id: '20202020-1c25-4d02-bf25-6aeccf7ea419' },
      } as WorkspaceAuthContext),
    executor: {
      execute: async (statement: CompiledStatement) => {
        executedStatements.push(statement);

        return [];
      },
    },
    permissionsPrincipals: {
      workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
      mainPrincipal: {
        type: 'apiKey',
        apiKeyId: 'api-key-id',
        roleId: ROLE_ID,
      },
      applicationPrincipal: { type: 'customApplication' },
    },
    shouldBypassPermissionChecks,
    shouldSkipEventEmission,
    tableShapeByObjectMetadataId: () => repositoryTableShape,
    flatObjectMetadataByObjectMetadataId: () => repositoryObjectMetadata,
    getRepositoryForObjectMetadataId: jest.fn(),
    isTransactional: false,
    runInNewTransaction: jest.fn(),
  });

  const getExecutedStatementKinds = () =>
    executedStatements.map((statement) => statement.text.split(' ')[0]);

  return { repository, getExecutedStatementKinds, executedStatements };
};

describe('WorkspaceRepository mutations', () => {
  describe('on a repository that bypasses permission checks and skips events', () => {
    it('should update without reading a before-image', async () => {
      const { repository, getExecutedStatementKinds } = buildRepository({
        shouldSkipEventEmission: true,
      });

      await repository.update({ id: 'delivery-id' }, { state: 'SENT' });

      expect(getExecutedStatementKinds()).toEqual(['UPDATE']);
    });

    it.each([
      ['delete', 'DELETE'],
      ['softDelete', 'UPDATE'],
      ['restore', 'UPDATE'],
    ] as const)(
      'should %s without reading a before-image',
      async (method, statementKind) => {
        const { repository, getExecutedStatementKinds } = buildRepository({
          shouldSkipEventEmission: true,
        });

        await repository[method]({ id: 'delivery-id' });

        expect(getExecutedStatementKinds()).toEqual([statementKind]);
      },
    );

    it('should still read the before-image when an update touches a files field', async () => {
      const { repository, getExecutedStatementKinds } = buildRepository({
        shouldSkipEventEmission: true,
      });

      await expect(
        repository.update({ id: 'delivery-id' }, { attachments: [] }),
      ).rejects.toThrow('Cannot update multiple records with files field');

      expect(getExecutedStatementKinds()).toEqual(['SELECT']);
    });
  });

  describe('on a repository that emits events', () => {
    it('should read the before- and after-image around an update', async () => {
      const { repository, getExecutedStatementKinds } = buildRepository({
        shouldSkipEventEmission: false,
      });

      await repository.update({ id: 'delivery-id' }, { state: 'SENT' });

      expect(getExecutedStatementKinds()).toEqual([
        'SELECT',
        'UPDATE',
        'SELECT',
      ]);
    });

    it('should read the before-image before a delete', async () => {
      const { repository, getExecutedStatementKinds } = buildRepository({
        shouldSkipEventEmission: false,
      });

      await repository.delete({ id: 'delivery-id' });

      expect(getExecutedStatementKinds()).toEqual(['SELECT', 'DELETE']);
    });
  });

  describe('on a permission-scoped repository that skips events', () => {
    it('should read the before-image before an update', async () => {
      const { repository, getExecutedStatementKinds } = buildRepository({
        shouldBypassPermissionChecks: false,
        shouldSkipEventEmission: true,
      });

      await repository.update({ id: 'delivery-id' }, { state: 'SENT' });

      expect(getExecutedStatementKinds()).toEqual(['SELECT', 'UPDATE']);
    });

    it('should read the before-image before a delete', async () => {
      const { repository, getExecutedStatementKinds } = buildRepository({
        shouldBypassPermissionChecks: false,
        shouldSkipEventEmission: true,
      });

      await repository.delete({ id: 'delivery-id' });

      expect(getExecutedStatementKinds()).toEqual(['SELECT', 'DELETE']);
    });
  });
});

describe('WorkspaceRepository messaging privacy', () => {
  const buildMessageRepository = (options = {}) =>
    buildRepository({
      shouldSkipEventEmission: true,
      shouldBypassPermissionChecks: false,
      objectNameSingular: 'message',
      hasProviderMetadata: true,
      ...options,
    });

  it('filters deleted internal messages before search, pagination, and count', async () => {
    const { repository, executedStatements } = buildMessageRepository();
    const queryBuilder = repository.createQueryBuilder('message');

    queryBuilder
      .where('"message"."state" ILIKE :search', { search: '%client%' })
      .orWhere('"message"."id" = :id', { id: 'known-id' })
      .take(10);
    await queryBuilder.getMany();
    await queryBuilder.getCount();

    for (const statement of executedStatements) {
      expect(statement.text).toContain(
        '("message"."state" ILIKE $1) OR ("message"."id" = $2)',
      );
      expect(statement.text).toContain(
        `"providerMetadata"->>'deletedAt' IS NULL`,
      );
      expect(statement.text).toContain(
        '"deletedMessageSender"."workspaceMemberId" IS DISTINCT FROM $3',
      );
      expect(statement.values.slice(0, 3)).toEqual([
        '%client%',
        'known-id',
        null,
      ]);
    }
    expect(
      executedStatements[0].text.indexOf('"providerMetadata"'),
    ).toBeLessThan(executedStatements[0].text.indexOf('LIMIT'));
    expect(executedStatements[1].text).toContain('COUNT(');
  });

  it('filters a nested message relation in its join condition', async () => {
    const { repository, executedStatements } = buildMessageRepository({
      withMessagingRelation: true,
    });
    await repository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.reply', 'reply')
      .getMany();
    const statement = executedStatements[0].text;
    const joinCondition = statement.slice(statement.indexOf('LEFT JOIN'));
    expect(joinCondition).toContain(
      `"reply"."providerMetadata"->>'deletedAt' IS NULL`,
    );
    expect(joinCondition).toContain(
      '"deletedMessageSender"."messageId" = "reply"."id"',
    );
    expect(statement).toContain(
      `"message"."providerMetadata"->>'deletedAt' IS NULL`,
    );
  });

  it('uses the authenticated viewer for the sender exception', async () => {
    const { repository, executedStatements } = buildMessageRepository({
      authContext: {
        type: 'user',
        workspace: { id: '20202020-1c25-4d02-bf25-6aeccf7ea419' },
        workspaceMemberId: 'sender-id',
      } as WorkspaceAuthContext,
    });
    await repository.find({ select: { id: true } });
    expect(executedStatements[0].values).toContain('sender-id');
  });

  it.each([
    { hasProviderMetadata: false },
    { shouldBypassPermissionChecks: true },
    { objectNameSingular: 'delivery' },
  ])(
    'preserves pre-upgrade, system ingestion, and other object reads: %j',
    async (options) => {
      const { repository, executedStatements } =
        buildMessageRepository(options);
      await repository.find({ select: { id: true } });
      expect(executedStatements[0].text).not.toContain('deletedMessageSender');
    },
  );

  it('omits threads with only hidden messages in list and count', async () => {
    const { repository, executedStatements } = buildMessageRepository({
      objectNameSingular: 'messageThread',
    });
    await repository.find({ select: { id: true }, take: 5 });
    await repository.count();
    for (const { text } of executedStatements) {
      expect(text).toContain(
        '"providerVisibleThreadMessage"."messageThreadId" = "messageThread"."id"',
      );
      expect(text).toContain('"providerAnyThreadMessage"."deletedAt" IS NULL');
      expect(text).toContain('deletedMessageSender');
    }
  });
});

describe('WorkspaceRepository app conversation privacy', () => {
  const provider = getFlatMessagingProviderMock({
    applicationId: flatObjectMetadata.applicationId,
    channelObjectUniversalIdentifier: OBJECT_METADATA_ID,
  });
  const buildConversationRepository = (authContext?: WorkspaceAuthContext) =>
    buildRepository({
      shouldSkipEventEmission: true,
      shouldBypassPermissionChecks: false,
      objectNameSingular: 'conversation',
      withMessagingRelation: true,
      authContext,
      flatMessagingProviderMaps: {
        byUniversalIdentifier: { [provider.universalIdentifier]: provider },
        universalIdentifierById: {
          [provider.id]: provider.universalIdentifier,
        },
        universalIdentifiersByApplicationId: {},
      },
    });

  it('restricts custom channel lists and counts before pagination', async () => {
    const { repository, executedStatements } = buildConversationRepository();
    await repository.find({ select: { id: true }, take: 5 });
    await repository.count();
    for (const { text, values } of executedStatements) {
      expect(text).toContain(
        '"appConversationFolder"."applicationRecordId" = "conversation"."id"',
      );
      expect(text).toContain('"appConversationAccount"."applicationId" =');
      expect(values).toContainEqual([provider.universalIdentifier]);
      expect(values).toContain(provider.applicationId);
    }
    expect(
      executedStatements[0].text.indexOf('applicationRecordId'),
    ).toBeLessThan(executedStatements[0].text.indexOf('LIMIT'));
  });

  it('restricts custom channels reached through a nested relation', async () => {
    const { repository, executedStatements } = buildConversationRepository();
    await repository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.reply', 'nestedChannel')
      .getMany();
    expect(executedStatements[0].text).toContain(
      '"appConversationFolder"."applicationRecordId" = "nestedChannel"."id"',
    );
  });

  it('lets the background owning app read unbound channels for synchronization', async () => {
    const { repository, executedStatements } = buildConversationRepository({
      type: 'application',
      application: { id: provider.applicationId },
      workspace: { id: provider.workspaceId },
    } as WorkspaceAuthContext);
    await repository.find({ select: { id: true } });
    expect(executedStatements[0].text).not.toContain('appConversationFolder');
  });
});
