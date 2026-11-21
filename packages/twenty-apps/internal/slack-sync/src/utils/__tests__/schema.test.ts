import { describe, expect, it } from 'vitest';
import { SystemPermissionFlag } from 'twenty-sdk/define';
import functionRole from 'src/roles/default-function.role';
import channel from 'src/objects/slack-channel';
import messageId from 'src/fields/slack-message-id';
import threadId from 'src/fields/slack-thread-id';
import messageChannel from 'src/fields/slack-channel-on-message';
import threadChannel from 'src/fields/slack-channel-on-thread';
import replyTo from 'src/fields/slack-reply-to';
import replies from 'src/fields/slack-replies';
import replyId from 'src/fields/slack-reply-to-message-id';
import status from 'src/fields/slack-attachment-status';
import channelsView from 'src/views/channel';
import threadsView from 'src/views/thread';
import messagesView from 'src/views/message';
import folder from 'src/navigation-menu-items/folder';
import channelsNavigation from 'src/navigation-menu-items/channels';
import threadsNavigation from 'src/navigation-menu-items/threads';
import messagesNavigation from 'src/navigation-menu-items/messages';
import * as identifiers from 'src/constants/schema-identifiers';

describe('native Slack schema and navigation', () => {
  it('validates all app definitions against the published SDK', () => {
    for (const definition of [
      channel,
      functionRole,
      messageId,
      threadId,
      messageChannel,
      threadChannel,
      replyTo,
      replies,
      replyId,
      status,
      channelsView,
      threadsView,
      messagesView,
      folder,
      channelsNavigation,
      threadsNavigation,
      messagesNavigation,
    ])
      expect(definition.errors).toEqual([]);
  });
  it('permits native file uploads for Slack attachments', () => {
    expect(functionRole.config.permissionFlagUniversalIdentifiers).toContain(
      SystemPermissionFlag.UPLOAD_FILE,
    );
  });

  it('filters native message and thread views to Slack records', () => {
    expect(messagesView.config.filters).toContainEqual(
      expect.objectContaining({
        fieldMetadataUniversalIdentifier:
          identifiers.MESSAGE_SLACK_ID_UNIVERSAL_IDENTIFIER,
        operand: 'IS_NOT_EMPTY',
      }),
    );
    expect(threadsView.config.filters).toContainEqual(
      expect.objectContaining({
        fieldMetadataUniversalIdentifier:
          identifiers.THREAD_SLACK_ID_UNIVERSAL_IDENTIFIER,
        operand: 'IS_NOT_EMPTY',
      }),
    );
  });
  it('uses reciprocal parent and channel relations on existing native records', () => {
    expect(replyTo.config).toMatchObject({
      relationTargetFieldMetadataUniversalIdentifier:
        replies.config.universalIdentifier,
    });
    expect(replies.config).toMatchObject({
      relationTargetFieldMetadataUniversalIdentifier:
        replyTo.config.universalIdentifier,
    });
    expect(messageChannel.config).toMatchObject({
      relationTargetObjectMetadataUniversalIdentifier:
        channel.config.universalIdentifier,
    });
    expect(threadChannel.config).toMatchObject({
      relationTargetObjectMetadataUniversalIdentifier:
        channel.config.universalIdentifier,
    });
  });
  it('places all three views inside the Slack folder', () => {
    for (const item of [
      channelsNavigation,
      threadsNavigation,
      messagesNavigation,
    ])
      expect(item.config.folderUniversalIdentifier).toBe(
        folder.config.universalIdentifier,
      );
  });
});
