require('reflect-metadata');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const { NestFactory } = require('@nestjs/core');
const { DataSource, In } = require('typeorm');
const { v5: uuidV5, validate: uuidValidate } = require('uuid');
const moduleAt = (path) => require(join(process.cwd(), 'dist', path));
const { AppModule } = moduleAt('app.module');
const { WorkspaceOrmManager } = moduleAt(
  'engine/twenty-orm/workspace-orm.manager',
);
const { buildSystemAuthContext } = moduleAt(
  'engine/twenty-orm/utils/build-system-auth-context.util',
);
const { ApplicationEntity } = moduleAt(
  'engine/core-modules/application/application.entity',
);
const { ApplicationKeyValueService } = moduleAt(
  'engine/core-modules/application/application-key-value/services/application-key-value.service',
);
const { ConnectedAccountEntity } = moduleAt(
  'engine/metadata-modules/connected-account/entities/connected-account.entity',
);
const { MessageChannelEntity } = moduleAt(
  'engine/metadata-modules/message-channel/entities/message-channel.entity',
);
const { ApplicationMessageChannelsService } = moduleAt(
  'engine/metadata-modules/message-channel/services/application-message-channels.service',
);
const APPLICATION_IDENTIFIER = 'ace9b30a-2b95-4b80-b275-34cf62d730b6';
const messageDigest = (messages) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        messages
          .map((message) => [
            message.id,
            message.messageThreadId,
            message.subject,
            message.text,
            message.receivedAt,
            message.plusvibeExternalId,
          ])
          .sort((left, right) => left[0].localeCompare(right[0])),
      ),
    )
    .digest('hex');
const recordId = (...parts) =>
  uuidV5(JSON.stringify(parts), APPLICATION_IDENTIFIER);
const main = async () => {
  const workspaceId = process.argv[2];
  if (!uuidValidate(workspaceId ?? ''))
    throw new Error(
      'Pass a workspace UUID and optionally --apply. Run inside the Twenty server working directory.',
    );
  const isApplying = process.argv.includes('--apply');
  const application = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const database = application.get(DataSource);
    const orm = application.get(WorkspaceOrmManager);
    const installed = await database
      .getRepository(ApplicationEntity)
      .findOneByOrFail({
        workspaceId,
        universalIdentifier: APPLICATION_IDENTIFIER,
      });
    const accounts = await database
      .getRepository(ConnectedAccountEntity)
      .find({ where: { workspaceId, applicationId: installed.id } });
    const channels = accounts.length
      ? await database.getRepository(MessageChannelEntity).find({
          where: {
            workspaceId,
            connectedAccountId: In(accounts.map((account) => account.id)),
          },
        })
      : [];
    const channelById = new Map(
      channels.map((channel) => [channel.id, channel]),
    );
    const keyValue = application.get(ApplicationKeyValueService);
    const preferences = async (connectionId) => {
      const read = async (key) =>
        (
          await keyValue.get({
            application: installed,
            workspaceId,
            key,
            scope: 'WORKSPACE',
          })
        )?.value;
      return (
        (await read(`plusvibe:preferences:${connectionId}`)) ??
        (await read('plusvibe:preferences')) ??
        {}
      );
    };
    await orm.executeInWorkspaceContext(async () => {
      const repository = (name) =>
        orm.getRepositoryWithoutPermissionChecks(name, {
          shouldSkipEventEmission: true,
        });
      const messages = await repository('message').find({
        where: { source: 'PLUSVIBE' },
      });
      const originalMessageDigest = messageDigest(messages);
      const associations = messages.length
        ? await repository('messageChannelMessageAssociation').find({
            where: { messageId: In(messages.map((message) => message.id)) },
          })
        : [];
      const plans = messages.map((message) => {
        const owned = associations.filter(
          (association) =>
            association.messageId === message.id &&
            channelById.has(association.messageChannelId),
        );
        if (
          owned.length !== 1 ||
          !message.plusvibeWorkspaceId ||
          !message.plusvibeSender
        )
          throw new Error(
            'Review missing or ambiguous legacy message ownership before migrating.',
          );
        const association = owned[0],
          channel = channelById.get(association.messageChannelId);
        const sender = message.plusvibeSender.trim().toLowerCase();
        const kind =
          association.direction === 'OUTGOING' && message.plusvibeCampaignId
            ? 'outreach'
            : 'unibox';
        return {
          message,
          association,
          channel,
          sender,
          handle: `plusvibe:${kind}:${sender}`,
          kind,
        };
      });
      console.log(
        JSON.stringify({
          isApplying,
          messages: messages.length,
          conversations: new Set(
            messages.map((message) => message.messageThreadId),
          ).size,
          associationsToMove: plans.filter(
            (plan) => plan.channel.handle !== plan.handle,
          ).length,
          messagesWithoutProviderThread: messages.filter(
            (message) => !message.plusvibeThreadId,
          ).length,
        }),
      );
      if (!isApplying) return;
      const channelService = application.get(ApplicationMessageChannelsService);
      const destinations = new Map();
      for (const plan of plans) {
        const key = `${plan.channel.connectedAccountId}:${plan.handle}`;
        if (destinations.has(key)) continue;
        const saved = await preferences(plan.channel.connectedAccountId);
        const visibility =
          plan.kind === 'outreach'
            ? 'SHARE_EVERYTHING'
            : (saved.uniboxVisibility ?? 'METADATA');
        const scope = {
          applicationId: installed.id,
          workspaceId,
          requestUserWorkspaceId: null,
        };
        if (
          !plan.channel.handle.startsWith('plusvibe:') &&
          plan.channel.visibility !== (saved.uniboxVisibility ?? 'METADATA')
        )
          await channelService.update({
            ...scope,
            id: plan.channel.id,
            visibility: saved.uniboxVisibility ?? 'METADATA',
          });
        let destination = channels.find(
          (channel) =>
            channel.connectedAccountId === plan.channel.connectedAccountId &&
            channel.handle === plan.handle,
        );
        if (!destination)
          destination = await channelService.create({
            ...scope,
            connectedAccountId: plan.channel.connectedAccountId,
            handle: plan.handle,
            displayName: plan.sender,
            visibility,
            messagingProviderUniversalIdentifier:
              plan.channel.messagingProviderUniversalIdentifier,
          });
        else if (destination.visibility !== visibility)
          destination = await channelService.update({
            ...scope,
            id: destination.id,
            visibility,
          });
        destinations.set(key, destination);
      }
      await orm.runInWorkspaceTransaction(async (transaction) => {
        const table = (name) =>
          transaction.getRepositoryWithoutPermissionChecks(name, {
            shouldSkipEventEmission: true,
          });
        const known = new Map();
        const ensure = async (name, id, data) => {
          const key = `${name}:${id}`;
          if (known.has(key)) return;
          if (!(await table(name).findOne({ where: { id } })))
            await table(name).insert({ id, ...data });
          known.set(key, true);
        };
        const link = (object, left, leftId, right, rightId, name) =>
          ensure(object, recordId('link', `${object}s`, leftId, rightId), {
            name,
            [`${left}Id`]: leftId,
            [`${right}Id`]: rightId,
          });
        for (const plan of plans) {
          const { message, association, sender } = plan;
          const senderId = recordId(
            'sender',
            message.plusvibeWorkspaceId,
            sender,
          );
          await ensure('plusvibeSender', senderId, {
            name: sender,
            emails: { primaryEmail: sender, additionalEmails: [] },
            workspaceRecordId: message.plusvibeWorkspaceRecordId,
          });
          const updates = { plusvibeSenderRecordId: senderId };
          await link(
            'plusvibeConversationSender',
            'conversation',
            message.messageThreadId,
            'sender',
            senderId,
            sender,
          );
          if (message.plusvibeThreadId) {
            const threadId = recordId(
              'thread',
              message.plusvibeWorkspaceId,
              message.plusvibeThreadId,
            );
            await ensure('plusvibeThread', threadId, {
              name: message.plusvibeThreadId,
              externalId: message.plusvibeThreadId,
              workspaceRecordId: message.plusvibeWorkspaceRecordId,
            });
            updates.plusvibeThreadRecordId = threadId;
            await link(
              'plusvibeThreadConversation',
              'thread',
              threadId,
              'conversation',
              message.messageThreadId,
              message.plusvibeThreadId,
            );
            await link(
              'plusvibeThreadSender',
              'thread',
              threadId,
              'sender',
              senderId,
              sender,
            );
          }
          if (
            Object.entries(updates).some(
              ([key, value]) => message[key] !== value,
            )
          )
            await table('message').update({ id: message.id }, updates);
          const destination = destinations.get(
            `${plan.channel.connectedAccountId}:${plan.handle}`,
          );
          if (association.messageChannelId !== destination.id)
            await table('messageChannelMessageAssociation').update(
              { id: association.id },
              { messageChannelId: destination.id },
            );
        }
      });
      const after = await repository('message').find({
        where: { source: 'PLUSVIBE' },
      });
      const originalIds = new Set(messages.map((message) => message.id));
      if (messageDigest(after) !== originalMessageDigest)
        throw new Error('Message content reconciliation failed.');
      if (
        after.length !== messages.length ||
        after.some((message) => !originalIds.has(message.id))
      )
        throw new Error('Message identity reconciliation failed.');
      console.log(
        JSON.stringify({
          verifiedMessages: after.length,
          destinationChannels: destinations.size,
          legacyFieldsPreserved: true,
        }),
      );
    }, buildSystemAuthContext(workspaceId));
  } finally {
    await application.close();
  }
};
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
