import {
  type ObjectRecordEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { type ObjectRecord } from 'twenty-shared/types';

import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { ObjectRecordEventPublisher } from 'src/engine/subscriptions/object-record-event/object-record-event-publisher';
import { type EventStreamData } from 'src/engine/subscriptions/types/event-stream-data.type';
import { type EventStreamPayload } from 'src/engine/subscriptions/types/event-stream-payload.type';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';

jest.mock(
  'src/engine/api/common/common-computed-fields-loader/load-computed-fields.helper',
  () => ({ LoadComputedFieldsHelper: class {} }),
);
jest.mock(
  'src/engine/api/common/common-nested-relations-processor/process-nested-relations.helper',
  () => ({ ProcessNestedRelationsHelper: class {} }),
);
jest.mock(
  'src/engine/api/common/common-select-fields/common-select-fields-builder',
  () => ({ CommonSelectFieldsBuilder: class {} }),
);
jest.mock(
  'src/engine/core-modules/user-workspace/services/user-workspace-auth-context.service',
  () => ({ UserWorkspaceAuthContextService: class {} }),
);
jest.mock(
  'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service',
  () => ({ WorkspaceManyOrAllFlatEntityMapsCacheService: class {} }),
);
jest.mock(
  'src/engine/permissions/record-event-permissions-read.service',
  () => ({ RecordEventPermissionsReadService: class {} }),
);
jest.mock('src/engine/subscriptions/event-stream.service', () => ({
  EventStreamService: class {},
}));
jest.mock('src/engine/subscriptions/subscription.service', () => ({
  SubscriptionService: class {},
}));
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
jest.mock(
  'src/engine/workspace-cache/services/workspace-cache.service',
  () => ({ WorkspaceCacheService: class {} }),
);
jest.mock(
  'src/engine/api/graphql/graphql-query-runner/graphql-query-parsers/graphql-query.parser',
  () => ({
    GraphqlQueryParser: class {
      parseSelectedFields() {
        return { select: {}, relations: {} };
      }
    },
  }),
);

const createStream = (
  workspaceMemberId: string,
  objectNameSingular: string,
): EventStreamData => ({
  authContext: { userWorkspaceId: workspaceMemberId, workspaceMemberId },
  workspaceId: 'workspace-id',
  queries: { messages: { objectNameSingular, variables: {} } },
  createdAt: 0,
});

const createFixture = ({
  objectNameSingular = 'message',
  hasProviderMetadata = true,
  declaresChannelObject = false,
  isDeletionTransition = false,
}: {
  objectNameSingular?: string;
  hasProviderMetadata?: boolean;
  declaresChannelObject?: boolean;
  isDeletionTransition?: boolean;
} = {}) => {
  const objectMetadata = {
    id: 'message-object-id',
    nameSingular: objectNameSingular,
    universalIdentifier: 'message-object',
  } as FlatObjectMetadata;
  const flatObjectMetadataMaps = {
    byUniversalIdentifier: { 'message-object': objectMetadata },
  };
  const streams = new Map([
    ['other-stream', createStream('other-member', objectNameSingular)],
    ['sender-stream', createStream('sender-member', objectNameSingular)],
  ]);
  const batch: WorkspaceEventBatch<ObjectRecordUpdateEvent<ObjectRecord>> = {
    name: `${objectNameSingular}.updated`,
    workspaceId: 'workspace-id',
    objectMetadata,
    events: [
      {
        recordId: 'message-id',
        properties: {
          before: {
            id: 'message-id',
            text: 'Private original',
            messageThreadId: 'thread-id',
            providerMetadata: isDeletionTransition
              ? null
              : { deletedAt: '2026-11-20T00:00:00Z' },
          },
          after: {
            id: 'message-id',
            text: 'Private edit',
            messageThreadId: 'thread-id',
            providerMetadata: { deletedAt: '2026-11-21T00:00:00Z' },
          },
          diff: { text: { before: 'Private original', after: 'Private edit' } },
          updatedFields: ['text', 'providerMetadata'],
        },
      },
    ],
  };
  const publishToEventStream = jest.fn<
    Promise<void>,
    [
      {
        workspaceId: string;
        eventStreamChannelId: string;
        payload: EventStreamPayload;
      },
    ]
  >();
  const visibility = jest.fn(
    async ({
      records,
      authContext,
    }: {
      records: ObjectRecord[];
      authContext: WorkspaceAuthContext;
    }) => {
      if (
        authContext.type === 'user' &&
        authContext.workspaceMemberId === 'sender-member'
      ) {
        return;
      }
      for (const record of records) {
        record.text = '[restricted]';
        record.providerMetadata = { hidden: true };
      }
    },
  );
  const contextFor = ({ userWorkspaceId }: { userWorkspaceId: string }) => ({
    type: 'user',
    workspace: { id: 'workspace-id' },
    workspaceMemberId: userWorkspaceId,
  });
  const findVisibleRecords = jest.fn(async () => [{ id: 'message-id' }]);
  const getRepository = jest.fn(() => ({ find: findVisibleRecords }));
  const executeInWorkspaceContext = jest.fn(
    async (
      handler: () => Promise<unknown>,
      _authContext: WorkspaceAuthContext,
    ) => handler(),
  );
  const dependencies = [
    { publishToEventStream },
    {
      getActiveStreamIds: jest.fn(async () => [...streams.keys()]),
      getStreamsData: jest.fn(async () => streams),
      removeFromActiveStreams: jest.fn(),
    },
    {
      getOrRecompute: jest.fn(async () => ({
        flatObjectMetadataMaps,
        flatFieldMetadataMaps: {
          byUniversalIdentifier: hasProviderMetadata
            ? {
                [STANDARD_OBJECTS.message.fields.providerMetadata
                  .universalIdentifier]: {},
              }
            : {},
        },
        flatMessagingProviderMaps: {
          byUniversalIdentifier: declaresChannelObject
            ? {
                'provider-id': {
                  channelObjectUniversalIdentifier: 'message-object',
                },
              }
            : {},
        },
        flatWorkspaceMemberMaps: { byId: {} },
      })),
    },
    { processNestedRelations: jest.fn() },
    { loadMissingComputedFields: jest.fn() },
    {
      getOrRecomputeManyOrAllFlatEntityMaps: jest.fn(async () => ({
        flatObjectMetadataMaps,
        flatFieldMetadataMaps: {},
      })),
    },
    {
      findObjectSelectionMetadataIdsOrThrow: jest.fn(async () => ({
        readableObjectMetadataIds: new Set([objectMetadata.id]),
        unreadableFieldMetadataIds: new Set(),
      })),
      buildFromDepth: jest.fn(() => ({ selectedFields: {} })),
    },
    { filterReadableEvents: jest.fn(async () => batch.events) },
    {
      executeInWorkspaceContext,
      getRepository,
    },
    {
      resolve: jest.fn(async (args: { userWorkspaceId: string }) =>
        contextFor(args),
      ),
    },
    { applyVisibilityRestrictions: visibility },
  ] as unknown as ConstructorParameters<typeof ObjectRecordEventPublisher>;

  return {
    publisher: new ObjectRecordEventPublisher(...dependencies),
    batch,
    visibility,
    publishToEventStream,
    findVisibleRecords,
    getRepository,
    executeInWorkspaceContext,
  };
};

const getUpdateProperties = (event: ObjectRecordEvent) => {
  if (!('diff' in event.properties)) {
    throw new Error('Expected an update event');
  }

  return event.properties;
};

describe('ObjectRecordEventPublisher subscriber visibility', () => {
  it('redacts both snapshots and diffs without affecting the sender or shared event batch', async () => {
    const { publisher, batch, visibility, publishToEventStream } =
      createFixture();

    await publisher.publish(batch);

    expect(visibility).toHaveBeenCalledTimes(2);
    expect(publishToEventStream).toHaveBeenCalledTimes(2);
    const otherPayload = publishToEventStream.mock.calls[0][0].payload;
    const senderPayload = publishToEventStream.mock.calls[1][0].payload;
    const otherProperties = getUpdateProperties(
      otherPayload.objectRecordEventsWithQueryIds[0].objectRecordEvent,
    );
    const senderProperties = getUpdateProperties(
      senderPayload.objectRecordEventsWithQueryIds[0].objectRecordEvent,
    );

    expect(otherProperties.before).toEqual({
      id: 'message-id',
      messageThreadId: 'thread-id',
    });
    expect(otherProperties.after).toEqual({
      id: 'message-id',
      messageThreadId: 'thread-id',
      providerMetadata: { hidden: true },
    });
    expect(otherProperties.diff).toEqual({
      providerMetadata: { before: undefined, after: { hidden: true } },
    });
    expect(JSON.stringify(otherProperties)).not.toContain('Private');
    expect(senderProperties.before).toMatchObject({ text: 'Private original' });
    expect(senderProperties.after).toMatchObject({ text: 'Private edit' });
    expect(senderProperties.diff).toEqual({
      text: { before: 'Private original', after: 'Private edit' },
    });
    expect(batch.events[0].properties.after).toMatchObject({
      text: 'Private edit',
    });
  });

  it('does not broadcast a stream when visibility enforcement fails', async () => {
    const { publisher, batch, visibility, publishToEventStream } =
      createFixture();
    visibility.mockRejectedValueOnce(new Error('Visibility unavailable'));

    await publisher.publish(batch);

    expect(publishToEventStream).toHaveBeenCalledTimes(1);
    expect(publishToEventStream.mock.calls[0][0].eventStreamChannelId).toBe(
      'sender-stream',
    );
    expect(
      getUpdateProperties(
        publishToEventStream.mock.calls[0][0].payload
          .objectRecordEventsWithQueryIds[0].objectRecordEvent,
      ).after,
    ).toMatchObject({ text: 'Private edit' });
  });

  it.each(['message', 'messageThread', 'slackConversation'])(
    'omits inaccessible %s rows using the subscriber repository before publication',
    async (objectNameSingular) => {
      const {
        publisher,
        batch,
        findVisibleRecords,
        getRepository,
        executeInWorkspaceContext,
        publishToEventStream,
      } = createFixture({
        objectNameSingular,
        declaresChannelObject: objectNameSingular === 'slackConversation',
      });
      findVisibleRecords.mockResolvedValueOnce([]);

      await publisher.publish(batch);

      expect(getRepository).toHaveBeenCalledWith(objectNameSingular);
      expect(findVisibleRecords).toHaveBeenCalledWith({
        where: {
          id: expect.objectContaining({ _type: 'in', _value: ['message-id'] }),
        },
        select: { id: true },
        withDeleted: true,
      });
      expect(executeInWorkspaceContext.mock.calls[0][1]).toMatchObject({
        type: 'user',
        workspaceMemberId: 'other-member',
      });
      expect(publishToEventStream).toHaveBeenCalledTimes(1);
      expect(publishToEventStream.mock.calls[0][0].eventStreamChannelId).toBe(
        'sender-stream',
      );
    },
  );

  it.each([
    { objectNameSingular: 'message', hasProviderMetadata: false },
    { objectNameSingular: 'unrelatedObject', hasProviderMetadata: true },
  ])(
    'keeps row filtering scoped to opted-in messaging objects: %j',
    async (options) => {
      const { publisher, batch, getRepository, publishToEventStream } =
        createFixture(options);

      await publisher.publish(batch);

      expect(getRepository).not.toHaveBeenCalled();
      expect(publishToEventStream).toHaveBeenCalledTimes(2);
    },
  );

  it('does not publish to a subscriber when row visibility lookup fails', async () => {
    const { publisher, batch, findVisibleRecords, publishToEventStream } =
      createFixture();
    findVisibleRecords.mockRejectedValueOnce(
      new Error('Row visibility unavailable'),
    );

    await publisher.publish(batch);

    expect(publishToEventStream).toHaveBeenCalledTimes(1);
    expect(publishToEventStream.mock.calls[0][0].eventStreamChannelId).toBe(
      'sender-stream',
    );
  });

  it('invalidates cached content when an authorized message becomes hidden after deletion', async () => {
    const { publisher, batch, findVisibleRecords, publishToEventStream } =
      createFixture({ isDeletionTransition: true });
    findVisibleRecords.mockResolvedValueOnce([]);

    await publisher.publish(batch);

    expect(publishToEventStream).toHaveBeenCalledTimes(2);
    const event =
      publishToEventStream.mock.calls[0][0].payload
        .objectRecordEventsWithQueryIds[0].objectRecordEvent;
    expect(event).toEqual({
      action: 'updated',
      objectNameSingular: 'message',
      recordId: 'message-id',
      properties: {
        before: { id: 'message-id', messageThreadId: 'thread-id' },
        after: {
          id: 'message-id',
          messageThreadId: 'thread-id',
          providerMetadata: { hidden: true },
        },
        updatedFields: ['providerMetadata'],
        diff: {
          providerMetadata: { before: undefined, after: { hidden: true } },
        },
      },
    });
    expect(JSON.stringify(event)).not.toContain('Private');
    expect(event.properties).not.toHaveProperty('text');
  });
});
