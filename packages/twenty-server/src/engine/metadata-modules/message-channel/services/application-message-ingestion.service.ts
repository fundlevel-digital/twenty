import { ApplicationMessageContactCreationService } from 'src/engine/metadata-modules/message-channel/services/application-message-contact-creation.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { resolveAppMessageFieldWrites } from 'src/engine/metadata-modules/message-channel/utils/resolve-app-message-field-writes.util';
import { Injectable } from '@nestjs/common';

import { FeatureFlagKey, MessageParticipantRole } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { In } from 'typeorm';

import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { APP_INGESTION_LOCK_OPTIONS } from 'src/engine/metadata-modules/message-channel/constants/app-ingestion-lock-options.constant';
import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import {
  type AppMessageInput,
  type UpdateAppMessageInput,
} from 'src/engine/metadata-modules/message-channel/dtos/ingest-app-messages.input';
import { type IngestAppMessagesOutput } from 'src/engine/metadata-modules/message-channel/dtos/ingest-app-messages.output';
import {
  MessageChannelException,
  MessageChannelExceptionCode,
} from 'src/engine/metadata-modules/message-channel/message-channel.exception';
import { ApplicationMessageChannelsService } from 'src/engine/metadata-modules/message-channel/services/application-message-channels.service';
import { mergeAppMessageUpdate } from 'src/engine/metadata-modules/message-channel/utils/merge-app-message-update.util';
import { buildAppIngestionLockKey } from 'src/engine/metadata-modules/message-channel/utils/build-app-ingestion-lock-key.util';
import { buildAppMessageHeaderMessageId } from 'src/engine/metadata-modules/message-channel/utils/build-app-message-header-message-id.util';
import { resolveAppMessageDirection } from 'src/engine/metadata-modules/message-channel/utils/resolve-app-message-direction.util';
import { withCanonicalParticipantHandlesOrThrow } from 'src/engine/metadata-modules/message-channel/utils/with-canonical-participant-handles-or-throw.util';
import { MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import { type MessageWorkspaceEntity } from 'src/modules/messaging/common/standard-objects/message.workspace-entity';
import { type MessageChannelMessageAssociationWorkspaceEntity } from 'src/modules/messaging/common/standard-objects/message-channel-message-association.workspace-entity';
import { type AttachmentWorkspaceEntity } from 'src/modules/attachment/standard-objects/attachment.workspace-entity';
import { PersonHandleFieldService } from 'src/modules/match-participant/person-handle-field/person-handle-field.service';
import { type PersonHandleField } from 'src/modules/match-participant/person-handle-field/types/person-handle-field.type';
import { MessagingSaveMessagesAndEnqueueContactCreationService } from 'src/modules/messaging/message-import-manager/services/messaging-save-messages-and-enqueue-contact-creation.service';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';

type IngestArgs = {
  applicationId: string;
  workspaceId: string;
  // same gate as the channel API so one member's run cannot write into another's private channel
  requestUserWorkspaceId: string | null;
  messageChannelId: string;
  messages: AppMessageInput[];
};

@Injectable()
export class ApplicationMessageIngestionService {
  constructor(
    private readonly applicationMessageChannelsService: ApplicationMessageChannelsService,
    private readonly saveMessagesService: MessagingSaveMessagesAndEnqueueContactCreationService,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    private readonly cacheLockService: CacheLockService,
    private readonly personHandleFieldService: PersonHandleFieldService,
    @InjectWorkspaceScopedRepository(MessageFolderEntity)
    private readonly messageFolderRepository: WorkspaceScopedRepository<MessageFolderEntity>,
    private readonly featureFlagService: FeatureFlagService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly applicationMessageContactCreationService: ApplicationMessageContactCreationService,
  ) {}

  async ingest({
    applicationId,
    workspaceId,
    requestUserWorkspaceId,
    messageChannelId,
    messages,
  }: IngestArgs): Promise<IngestAppMessagesOutput> {
    const { messageChannel, connectedAccount } =
      await this.applicationMessageChannelsService.findOwnedOrThrow({
        applicationId,
        workspaceId,
        requestUserWorkspaceId,
        id: messageChannelId,
      });

    if (!messageChannel.isSyncEnabled) {
      throw new MessageChannelException(
        `Message channel ${messageChannelId} has sync disabled`,
        MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
      );
    }

    this.assertEachMessageHasOneSender(messages);
    this.assertExternalIdsAreUnique(messages);
    await this.assertReferencedIdentitiesExist({ messages, workspaceId });

    const personHandleField = await this.findPersonHandleFieldOrThrow({
      workspaceId,
      participantHandleFieldUniversalIdentifier:
        messageChannel.participantHandleFieldUniversalIdentifier,
    });

    const deduplicateAcrossConnections =
      await this.applicationMessageChannelsService.deduplicatesAcrossConnections(
        {
          applicationId,
          workspaceId,
          messageChannel,
          connectedAccount,
        },
      );

    const applicationFieldWrites = await this.validateApplicationFields({
      applicationId,
      workspaceId,
      messages,
    });

    // save reads before writing and headerMessageId has no unique index, so concurrent redeliveries would duplicate
    const savedMessages = await this.cacheLockService.withLock(
      async () => {
        const resolvedMessages =
          await this.applicationMessageContactCreationService.resolve({
            messages,
            messageChannel,
            connectedAccount,
            workspaceId,
          });
        const messagesToSave = resolvedMessages.map((message) =>
          this.toMessageWithParticipants({
            message: isDefined(personHandleField)
              ? withCanonicalParticipantHandlesOrThrow({
                  message,
                  personHandleField,
                })
              : message,
            applicationId,
            messageChannel,
            deduplicateAcrossConnections,
          }),
        );
        const result =
          await this.saveMessagesService.saveMessagesAndEnqueueContactCreation({
            messagesToSave: await this.withMessageFolderIdsOrThrow({
              workspaceId,
              messageChannelId,
              messages: messagesToSave,
            }),
            messageChannel,
            connectedAccount,
            workspaceId,
            folderLinkUpdate: 'add',
            personHandleField: personHandleField ?? undefined,
          });
        if (!isDefined(result)) {
          throw new MessageChannelException(
            `Ingestion into message channel ${messageChannelId} did not persist`,
            MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
          );
        }
        if (applicationFieldWrites.length > 0) {
          await this.workspaceOrmManager.executeInWorkspaceContext(
            async () => {
              for (const write of applicationFieldWrites) {
                const id =
                  write.objectName === 'message'
                    ? result.messageExternalIdsAndIdsMap.get(write.externalId)
                    : result.messageExternalIdToMessageThreadIdMap.get(
                        write.externalId,
                      );
                if (!isDefined(id)) {
                  throw new Error('Application field target was not persisted');
                }
                await this.workspaceOrmManager
                  .getRepositoryWithoutPermissionChecks(write.objectName)
                  .update(id, write.patch);
              }
            },
            buildSystemAuthContext(workspaceId),
            { lite: true },
          );
        }
        await this.applyUpdates({
          workspaceId,
          applicationId,
          messageChannelId,
          deduplicateAcrossConnections,
          messages: messages.flatMap((message) =>
            isDefined(message.providerMetadata)
              ? [
                  {
                    externalId: message.externalId,
                    text: message.text,
                    providerMetadata: message.providerMetadata,
                  },
                ]
              : [],
          ),
        });
        return result;
      },
      buildAppIngestionLockKey({
        workspaceId,
        messageChannelId,
        applicationId,
        deduplicateAcrossConnections,
      }),
      APP_INGESTION_LOCK_OPTIONS,
    );

    if (!isDefined(savedMessages)) {
      throw new MessageChannelException(
        `Ingestion into message channel ${messageChannelId} did not persist`,
        MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
      );
    }

    const {
      messageExternalIdsAndIdsMap,
      messageExternalIdToMessageThreadIdMap,
    } = savedMessages;

    const messageIdsWithAttachments = await this.findMessageIdsWithAttachments({
      workspaceId,
      messageIds: [...new Set(messageExternalIdsAndIdsMap.values())],
    });

    // never drop a row: the app would see success with nothing to retry
    return {
      messages: messages.map((message) => {
        const messageId = messageExternalIdsAndIdsMap.get(message.externalId);
        const messageThreadId = messageExternalIdToMessageThreadIdMap.get(
          message.externalId,
        );

        if (!isDefined(messageId) || !isDefined(messageThreadId)) {
          throw new MessageChannelException(
            `Message ${message.externalId} was not persisted by the save path`,
            MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
          );
        }

        return {
          externalId: message.externalId,
          messageId,
          messageThreadId,
          hasAttachments: messageIdsWithAttachments.has(messageId),
        };
      }),
    };
  }

  private async validateApplicationFields({
    applicationId,
    workspaceId,
    messages,
  }: {
    applicationId: string;
    workspaceId: string;
    messages: Pick<AppMessageInput, 'externalId' | 'applicationFields'>[];
  }): Promise<
    {
      externalId: string;
      objectName: 'message' | 'messageThread';
      patch: Record<string, string | null>;
    }[]
  > {
    if (!messages.some((message) => isDefined(message.applicationFields))) {
      return [];
    }
    const { flatFieldMetadataMaps, flatObjectMetadataMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatFieldMetadataMaps',
        'flatObjectMetadataMaps',
      ]);
    const writes: {
      externalId: string;
      objectName: 'message' | 'messageThread';
      patch: Record<string, string | null>;
    }[] = [];
    await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        for (const message of messages) {
          for (const [key, objectName] of [
            ['message', 'message'],
            ['thread', 'messageThread'],
          ] as const) {
            const values = message.applicationFields?.[key];
            if (!isDefined(values)) {
              continue;
            }
            const { patch, references } = resolveAppMessageFieldWrites({
              applicationId,
              objectName,
              values,
              fields: Object.values(
                flatFieldMetadataMaps.byUniversalIdentifier,
              ),
              objects: Object.values(
                flatObjectMetadataMaps.byUniversalIdentifier,
              ),
            });
            for (const reference of references) {
              const record = await this.workspaceOrmManager
                .getRepositoryWithoutPermissionChecks(reference.objectName)
                .findOne({ where: { id: reference.id } });
              if (
                !isDefined(record) ||
                (reference.objectName === 'message' &&
                  (typeof record.headerMessageId !== 'string' ||
                    !record.headerMessageId.startsWith(
                      `app:${applicationId}:`,
                    )))
              ) {
                throw new MessageChannelException(
                  'Application field relation target is not owned by this application',
                  MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
                );
              }
            }
            if (Object.keys(patch).length > 0) {
              writes.push({
                externalId: message.externalId,
                objectName,
                patch,
              });
            }
          }
        }
      },
      buildSystemAuthContext(workspaceId),
      { lite: true },
    );
    return writes;
  }

  async update(
    args: Omit<IngestArgs, 'messages'> & {
      messages: UpdateAppMessageInput[];
    },
  ): Promise<boolean> {
    const { applicationId, workspaceId, messageChannelId } = args;
    const { messageChannel, connectedAccount } =
      await this.applicationMessageChannelsService.findOwnedOrThrow({
        ...args,
        id: messageChannelId,
      });
    if (!messageChannel.isSyncEnabled) {
      throw new MessageChannelException(
        `Message channel ${messageChannelId} has sync disabled`,
        MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
      );
    }
    const deduplicateAcrossConnections =
      await this.applicationMessageChannelsService.deduplicatesAcrossConnections(
        {
          applicationId,
          workspaceId,
          messageChannel,
          connectedAccount,
        },
      );
    const updated = await this.cacheLockService.withLock(
      async () => {
        await this.applyUpdates({ ...args, deduplicateAcrossConnections });
        return true;
      },
      buildAppIngestionLockKey({
        workspaceId,
        applicationId,
        messageChannelId,
        deduplicateAcrossConnections,
      }),
      APP_INGESTION_LOCK_OPTIONS,
    );
    if (!isDefined(updated)) {
      throw new MessageChannelException(
        'Message update lock could not be acquired',
        MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
      );
    }
    return true;
  }

  private async applyUpdates({
    applicationId,
    workspaceId,
    messageChannelId,
    deduplicateAcrossConnections,
    messages,
  }: {
    applicationId: string;
    workspaceId: string;
    messageChannelId: string;
    deduplicateAcrossConnections: boolean;
    messages: UpdateAppMessageInput[];
  }): Promise<void> {
    if (messages.length === 0) {
      return;
    }
    const fieldWrites = await this.validateApplicationFields({
      applicationId,
      workspaceId,
      messages,
    });
    await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const associationRepository =
          this.workspaceOrmManager.getRepositoryWithoutPermissionChecks<MessageChannelMessageAssociationWorkspaceEntity>(
            'messageChannelMessageAssociation',
          );
        const messageRepository =
          this.workspaceOrmManager.getRepositoryWithoutPermissionChecks<MessageWorkspaceEntity>(
            'message',
          );
        const associations = await associationRepository.find({
          where: {
            messageChannelId,
            messageExternalId: In(messages.map(({ externalId }) => externalId)),
          },
        });
        if (associations.length === 0) {
          return;
        }
        const storedMessages = await messageRepository.find({
          where: { id: In(associations.map(({ messageId }) => messageId)) },
        });
        for (const update of messages) {
          const association = associations.find(
            ({ messageExternalId }) => messageExternalId === update.externalId,
          );
          const storedMessage = storedMessages.find(
            ({ id }) => id === association?.messageId,
          );
          const expectedHeader = buildAppMessageHeaderMessageId({
            applicationId,
            messageChannelId,
            externalId: update.externalId,
            deduplicateAcrossConnections,
          });
          if (
            !isDefined(storedMessage) ||
            storedMessage.headerMessageId !== expectedHeader
          ) {
            continue;
          }
          for (const write of fieldWrites.filter(
            (write) => write.externalId === update.externalId,
          )) {
            const id =
              write.objectName === 'message'
                ? storedMessage.id
                : storedMessage.messageThreadId;
            if (!isDefined(id)) {
              continue;
            }
            await this.workspaceOrmManager
              .getRepositoryWithoutPermissionChecks(write.objectName)
              .update(id, write.patch);
          }
          const patch = mergeAppMessageUpdate({
            previousMetadata: storedMessage.providerMetadata,
            providerMetadata: update.providerMetadata,
            text: update.text,
          });
          if (!isDefined(patch)) {
            continue;
          }
          await messageRepository.update(storedMessage.id, patch);
          Object.assign(storedMessage, patch);
        }
      },
      buildSystemAuthContext(workspaceId),
      { lite: true },
    );
  }

  private async findMessageIdsWithAttachments({
    workspaceId,
    messageIds,
  }: {
    workspaceId: string;
    messageIds: string[];
  }): Promise<Set<string>> {
    if (messageIds.length === 0) {
      return new Set();
    }

    const isMessageAttachmentEnabled =
      await this.featureFlagService.isFeatureEnabled(
        FeatureFlagKey.IS_MESSAGE_ATTACHMENT_ENABLED,
        workspaceId,
      );

    if (!isMessageAttachmentEnabled) {
      return new Set();
    }

    const attachments =
      await this.workspaceOrmManager.executeInWorkspaceContext(
        async () =>
          this.workspaceOrmManager
            .getRepositoryWithoutPermissionChecks<AttachmentWorkspaceEntity>(
              'attachment',
            )
            .find({
              where: { targetMessageId: In(messageIds) },
              select: { targetMessageId: true },
            }),
        buildSystemAuthContext(workspaceId),
        { lite: true },
      );

    return new Set(
      attachments
        .map(({ targetMessageId }) => targetMessageId)
        .filter(isDefined),
    );
  }

  private toMessageWithParticipants({
    message,
    applicationId,
    messageChannel,
    deduplicateAcrossConnections,
  }: {
    message: AppMessageInput;
    applicationId: string;
    messageChannel: MessageChannelEntity;
    deduplicateAcrossConnections: boolean;
  }): MessageWithParticipants {
    return {
      headerMessageId: buildAppMessageHeaderMessageId({
        applicationId,
        messageChannelId: messageChannel.id,
        externalId: message.externalId,
        deduplicateAcrossConnections,
      }),
      ...(isDefined(message.providerMetadata)
        ? { providerMetadata: message.providerMetadata }
        : {}),
      ...(deduplicateAcrossConnections
        ? { sharedThreadApplicationId: applicationId }
        : {}),
      subject: message.subject ?? null,
      text: message.text,
      receivedAt: message.receivedAt,
      isDraft: false,
      externalId: message.externalId,
      messageThreadExternalId: message.threadExternalId,
      messageFolderExternalIds: [...new Set(message.folderExternalIds ?? [])],
      direction: resolveAppMessageDirection({
        participants: message.participants,
        channelHandle: messageChannel.handle,
      }),
      attachments: [],
      attachmentFiles: message.attachments ?? [],
      participants: message.participants.map((participant) => ({
        role: participant.role,
        handle: participant.handle,
        displayName: participant.displayName ?? '',
        personId: participant.personId ?? null,
        workspaceMemberId: participant.workspaceMemberId ?? null,
      })),
    };
  }

  private async withMessageFolderIdsOrThrow({
    workspaceId,
    messageChannelId,
    messages,
  }: {
    workspaceId: string;
    messageChannelId: string;
    messages: MessageWithParticipants[];
  }): Promise<MessageWithParticipants[]> {
    const folderExternalIds = [
      ...new Set(
        messages.flatMap((message) => message.messageFolderExternalIds ?? []),
      ),
    ];

    if (folderExternalIds.length === 0) {
      return messages;
    }

    const messageFolders = await this.messageFolderRepository.find(
      workspaceId,
      {
        where: { messageChannelId, externalId: In(folderExternalIds) },
        select: { id: true, externalId: true },
      },
    );

    const messageFolderIdByExternalId = new Map(
      messageFolders.map((messageFolder) => [
        messageFolder.externalId,
        messageFolder.id,
      ]),
    );

    const unknownFolderExternalIds = folderExternalIds.filter(
      (folderExternalId) => !messageFolderIdByExternalId.has(folderExternalId),
    );

    if (unknownFolderExternalIds.length > 0) {
      throw new MessageChannelException(
        `Unknown folder externalId(s) on message channel ${messageChannelId}: ${unknownFolderExternalIds.join(', ')}. Declare them with syncAppMessageFolders first`,
        MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
      );
    }

    return messages.map((message) => ({
      ...message,
      messageFolderIds: (message.messageFolderExternalIds ?? [])
        .map((folderExternalId) =>
          messageFolderIdByExternalId.get(folderExternalId),
        )
        .filter(isDefined),
    }));
  }

  // raw handles would mix with the canonical ones already stored and stop matching the channel's own handle
  private async findPersonHandleFieldOrThrow({
    workspaceId,
    participantHandleFieldUniversalIdentifier,
  }: {
    workspaceId: string;
    participantHandleFieldUniversalIdentifier: string | null;
  }): Promise<PersonHandleField | null> {
    if (!isDefined(participantHandleFieldUniversalIdentifier)) {
      return null;
    }

    const personHandleField =
      await this.personHandleFieldService.findByUniversalIdentifier({
        workspaceId,
        fieldUniversalIdentifier: participantHandleFieldUniversalIdentifier,
      });

    if (!isDefined(personHandleField)) {
      throw new MessageChannelException(
        `The person field ${participantHandleFieldUniversalIdentifier} this channel matches participants on no longer exists or is inactive`,
        MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
      );
    }

    return personHandleField;
  }

  // checked up front so the app gets an error rather than a dangling link that never renders
  private async assertReferencedIdentitiesExist({
    messages,
    workspaceId,
  }: {
    messages: AppMessageInput[];
    workspaceId: string;
  }): Promise<void> {
    const personIds = new Set<string>();
    const workspaceMemberIds = new Set<string>();

    for (const message of messages) {
      for (const participant of message.participants) {
        if (isDefined(participant.personId)) {
          personIds.add(participant.personId);
        }

        if (isDefined(participant.workspaceMemberId)) {
          workspaceMemberIds.add(participant.workspaceMemberId);
        }
      }
    }

    if (personIds.size === 0 && workspaceMemberIds.size === 0) {
      return;
    }

    const authContext = buildSystemAuthContext(workspaceId);

    await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        await this.assertRecordsExist({
          objectMetadataName: 'person',
          ids: personIds,
        });
        await this.assertRecordsExist({
          objectMetadataName: 'workspaceMember',
          ids: workspaceMemberIds,
        });
      },
      authContext,
      { lite: true },
    );
  }

  private async assertRecordsExist({
    objectMetadataName,
    ids,
  }: {
    objectMetadataName: 'person' | 'workspaceMember';
    ids: Set<string>;
  }): Promise<void> {
    if (ids.size === 0) {
      return;
    }

    const repository =
      this.workspaceOrmManager.getRepositoryWithoutPermissionChecks(
        objectMetadataName,
      );

    const found = await repository.find({
      where: { id: In([...ids]) },
      select: { id: true },
    });
    const foundIds = new Set(found.map((record) => record.id));
    const missingIds = [...ids].filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new MessageChannelException(
        `Unknown ${objectMetadataName} id(s) on ingested participants: ${missingIds.join(', ')}`,
        MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
      );
    }
  }

  // direction, thread sender and timeline preview all read the single FROM participant
  private assertEachMessageHasOneSender(messages: AppMessageInput[]): void {
    for (const message of messages) {
      const senderCount = message.participants.filter(
        (participant) => participant.role === MessageParticipantRole.FROM,
      ).length;

      if (senderCount !== 1) {
        throw new MessageChannelException(
          `Message ${message.externalId} must have exactly one FROM participant, got ${senderCount}`,
          MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
        );
      }
    }
  }

  // the save transaction keys its accumulator on externalId
  private assertExternalIdsAreUnique(messages: AppMessageInput[]): void {
    const externalIds = new Set<string>();

    for (const message of messages) {
      if (externalIds.has(message.externalId)) {
        throw new MessageChannelException(
          `Message externalId ${message.externalId} appears more than once in the same batch`,
          MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
        );
      }

      externalIds.add(message.externalId);
    }
  }
}
