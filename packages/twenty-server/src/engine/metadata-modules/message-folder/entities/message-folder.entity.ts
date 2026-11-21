import { registerEnumType } from '@nestjs/graphql';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { MessageFolderPendingSyncAction } from 'twenty-shared/types';

import { ADD_APP_CONVERSATION_BINDINGS_UPGRADE_COMMAND_NAME } from 'src/database/commands/upgrade-version-command/2-61/add-app-conversation-bindings-upgrade-command-name.constant';
import { WasIntroducedInUpgrade } from 'src/engine/core-modules/upgrade/decorators/was-introduced-in-upgrade.decorator';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity.type';

registerEnumType(MessageFolderPendingSyncAction, {
  name: 'MessageFolderPendingSyncAction',
});

@Entity({ name: 'messageFolder', schema: 'core' })
@Index('IDX_MESSAGE_FOLDER_MESSAGE_CHANNEL_ID', ['messageChannelId'])
@Index('IDX_MESSAGE_FOLDER_WORKSPACE_ID', ['workspaceId'])
export class MessageFolderEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  syncCursor: string | null;

  @Column({ type: 'boolean', nullable: false })
  isSentFolder: boolean;

  @Column({ type: 'boolean', nullable: false })
  isSynced: boolean;

  @Column({ type: 'varchar', nullable: true })
  parentFolderId: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalId: string | null;

  @WasIntroducedInUpgrade({
    upgradeCommandName: ADD_APP_CONVERSATION_BINDINGS_UPGRADE_COMMAND_NAME,
  })
  @Column({ type: 'uuid', nullable: true })
  applicationRecordId: string | null;

  @Column({
    type: 'enum',
    enum: MessageFolderPendingSyncAction,
    nullable: false,
    default: MessageFolderPendingSyncAction.NONE,
  })
  pendingSyncAction: MessageFolderPendingSyncAction;

  @Column({ type: 'uuid', nullable: false })
  messageChannelId: string;

  @ManyToOne(
    () => MessageChannelEntity,
    (messageChannel) => messageChannel.messageFolders,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'messageChannelId' })
  messageChannel: Relation<MessageChannelEntity>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
