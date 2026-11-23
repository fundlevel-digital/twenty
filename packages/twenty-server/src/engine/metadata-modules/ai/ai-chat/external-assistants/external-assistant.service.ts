import { createHash } from 'node:crypto';
import { readAgentChatAssistantReplyContext } from '../utils/read-agent-chat-assistant-reply-context.util';
import { ApplicationState } from 'src/engine/core-modules/application/enums/application-state.enum';
import { msg } from '@lingui/core/macro';
import { doNotTranslate } from 'twenty-shared/i18n';
import { AiException, AiExceptionCode } from '../../ai.exception';
import { getWorkspaceAgentHistoryTable } from 'src/engine/metadata-modules/ai/ai-history/utils/get-workspace-agent-history-table.util';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isString } from '@sniptt/guards';
import { IsNull, Like, Repository } from 'typeorm';
import { v5, validate } from 'uuid';
import {
  AgentChatThreadConversationType,
  parseChatReferences,
} from 'twenty-shared/ai';
import { isPlainObject } from 'twenty-shared/utils';
import {
  KeyValuePairEntity,
  KeyValuePairType,
} from 'src/engine/core-modules/key-value-pair/key-value-pair.entity';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { LogicFunctionExecutorService } from 'src/engine/core-modules/logic-function/logic-function-executor/logic-function-executor.service';
import { LogicFunctionEntity } from 'src/engine/metadata-modules/logic-function/logic-function.entity';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import { InjectAgentHistoryRepository } from 'src/engine/metadata-modules/ai/ai-history/repositories/inject-agent-history-repository.decorator';
import { AgentHistoryRepository } from 'src/engine/metadata-modules/ai/ai-history/repositories/agent-history-repository';
import { AgentMessageWorkspaceEntity } from 'src/engine/metadata-modules/ai/ai-history/standard-objects/agent-message.workspace-entity';
import { AgentMessagePartWorkspaceEntity } from 'src/engine/metadata-modules/ai/ai-history/standard-objects/agent-message-part.workspace-entity';
import { AgentConversationWriterService } from 'src/engine/metadata-modules/ai/ai-history/services/agent-conversation-writer.service';
import { AgentMessageRole } from 'src/engine/metadata-modules/ai/ai-history/enums/agent-message-role.enum';
import { AgentTurnStatus } from 'src/engine/metadata-modules/ai/ai-history/enums/agent-turn-status.enum';
import { AgentChatThreadService } from '../services/agent-chat-thread.service';
import { AgentChatEventPublisherService } from '../services/agent-chat-event-publisher.service';
import { type AgentChatMemberMessageActor } from '../types/agent-chat-member-message-actor.type';
import {
  type ExternalAssistant,
  type ExternalAssistantRequest,
  type ExternalAssistantGrant,
} from './external-assistant.types';

const PROFILE_PREFIX = 'external-assistant:profile:';
const REQUEST_PREFIX = 'external-assistant:request:';
const getMessageDigest = (text: string) =>
  createHash('sha256').update(text).digest('hex');

@Injectable()
export class ExternalAssistantService {
  private readonly logger = new Logger(ExternalAssistantService.name);
  constructor(
    @InjectRepository(UserWorkspaceEntity)
    private readonly memberships: Repository<UserWorkspaceEntity>,
    @InjectRepository(KeyValuePairEntity)
    private readonly registry: Repository<KeyValuePairEntity>,
    @InjectWorkspaceScopedRepository(LogicFunctionEntity)
    private readonly functions: WorkspaceScopedRepository<LogicFunctionEntity>,
    private readonly executor: LogicFunctionExecutorService,
    private readonly threads: AgentChatThreadService,
    private readonly writer: AgentConversationWriterService,
    private readonly events: AgentChatEventPublisherService,
    @InjectAgentHistoryRepository('agentMessage')
    private readonly messages: AgentHistoryRepository<AgentMessageWorkspaceEntity>,
    @InjectAgentHistoryRepository('agentMessagePart')
    private readonly parts: AgentHistoryRepository<AgentMessagePartWorkspaceEntity>,
  ) {}

  async register(
    workspaceId: string,
    application: FlatApplication,
    input: unknown,
  ): Promise<ExternalAssistant> {
    if (
      !isPlainObject(input) ||
      !isString(input.id) ||
      !validate(input.id) ||
      !isString(input.name) ||
      !input.name.trim() ||
      input.name.length > 80 ||
      !isString(input.handlerUniversalIdentifier) ||
      !validate(input.handlerUniversalIdentifier) ||
      typeof input.enabled !== 'boolean'
    ) {
      throw new AiException(
        doNotTranslate(
          'Provide an assistant ID, name, handler and enabled state',
        ),
        AiExceptionCode.INVALID_AGENT_INPUT,
        {
          userFriendlyMessage: msg`Provide an assistant ID, name, handler and enabled state`,
        },
      );
    }
    let avatarUrl: string | null = null;
    if (
      input.avatarUrl !== null &&
      input.avatarUrl !== undefined &&
      input.avatarUrl !== ''
    ) {
      if (!isString(input.avatarUrl) || !URL.canParse(input.avatarUrl)) {
        throw new AiException(
          doNotTranslate('Use an HTTPS avatar URL'),
          AiExceptionCode.INVALID_AGENT_INPUT,
          { userFriendlyMessage: msg`Use an HTTPS avatar URL` },
        );
      }
      const url = new URL(input.avatarUrl);
      if (url.protocol !== 'https:' || url.username || url.password) {
        throw new AiException(
          doNotTranslate('Use an HTTPS avatar URL without credentials'),
          AiExceptionCode.INVALID_AGENT_INPUT,
          {
            userFriendlyMessage: msg`Use an HTTPS avatar URL without credentials`,
          },
        );
      }
      avatarUrl = url.href;
    }
    const profile: ExternalAssistant = {
      id: input.id.toLowerCase(),
      applicationId: application.id,
      applicationName: application.name,
      name: input.name.trim(),
      avatarUrl,
      handlerUniversalIdentifier: input.handlerUniversalIdentifier,
      enabled: input.enabled,
    };
    await this.findHandler(workspaceId, profile);
    await this.registry.manager.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`${workspaceId}:${profile.id}`],
      );
      const repository = manager.getRepository(KeyValuePairEntity);
      const existing = await repository.findOne({
        where: {
          workspaceId,
          key: PROFILE_PREFIX + profile.id,
          type: KeyValuePairType.CONFIG_VARIABLE,
        },
      });
      if (existing && existing.applicationId !== application.id) {
        throw new AiException(
          doNotTranslate('Assistant belongs to another application'),
          AiExceptionCode.THREAD_NOT_FOUND,
          {
            userFriendlyMessage: msg`Assistant belongs to another application`,
          },
        );
      }
      // Native registry records use a different type from app-writable KV values.
      await repository.upsert(
        {
          workspaceId,
          applicationId: application.id,
          userId: null,
          type: KeyValuePairType.CONFIG_VARIABLE,
          key: PROFILE_PREFIX + profile.id,
          value: profile as unknown as KeyValuePairEntity['value'],
        },
        {
          conflictPaths: ['key', 'applicationId'],
          indexPredicate:
            '"applicationId" IS NOT NULL AND "workspaceId" IS NOT NULL',
        },
      );
    });
    return profile;
  }

  async list(
    workspaceId: string,
    applicationId?: string,
  ): Promise<ExternalAssistant[]> {
    const rows = await this.registry.find({
      where: {
        workspaceId,
        key: Like(PROFILE_PREFIX + '%'),
        type: KeyValuePairType.CONFIG_VARIABLE,
      },
      relations: { application: true },
    });
    return rows
      .flatMap((row) => {
        const application = row.application;
        if (
          !application ||
          application.deletedAt ||
          application.state === ApplicationState.UNINSTALLING ||
          row.deletedAt
        ) {
          return [];
        }
        return [
          {
            ...(row.value as unknown as ExternalAssistant),
            applicationName: application.name,
          },
        ];
      })
      .filter((profile) =>
        applicationId
          ? profile.applicationId === applicationId
          : profile.enabled,
      );
  }

  async ownedIdentity(workspaceId: string, applicationId: string, id: string) {
    const profile = (await this.list(workspaceId)).find(
      (profile) => profile.id === id && profile.applicationId === applicationId,
    );
    if (!profile) {
      throw new AiException(
        doNotTranslate('Assistant is not enrolled by this application'),
        AiExceptionCode.INVALID_AGENT_INPUT,
        {
          userFriendlyMessage: msg`Assistant is not enrolled by this application`,
        },
      );
    }
    return {
      id: profile.id,
      applicationId: profile.applicationId,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    };
  }

  mentionedIds(text: string): string[] {
    return [
      ...new Set(
        parseChatReferences(text).flatMap((reference) =>
          reference.kind === 'record' &&
          reference.objectNameSingular === 'externalAssistant'
            ? [reference.recordId]
            : [],
        ),
      ),
    ];
  }

  async validateMentions(
    workspaceId: string,
    text: string,
    selectedIds: string[] = [],
  ): Promise<ExternalAssistant[]> {
    const ids = [...new Set(selectedIds)];
    const references = this.mentionedIds(text);
    if (ids.some((id) => !references.includes(id))) {
      throw new AiException(
        doNotTranslate('Select an assistant mention in the message'),
        AiExceptionCode.INVALID_AGENT_INPUT,
        {
          userFriendlyMessage: msg`Select an assistant mention in the message`,
        },
      );
    }
    if (ids.length > 5) {
      throw new AiException(
        doNotTranslate('Mention up to five external assistants'),
        AiExceptionCode.INVALID_AGENT_INPUT,
        { userFriendlyMessage: msg`Mention up to five external assistants` },
      );
    }
    if (!ids.length) {
      return [];
    }
    if (text.length > 10000) {
      throw new AiException(
        doNotTranslate(
          'Write up to 10,000 characters when mentioning assistants',
        ),
        AiExceptionCode.INVALID_AGENT_INPUT,
        {
          userFriendlyMessage: msg`Write up to 10,000 characters when mentioning assistants`,
        },
      );
    }
    const directory = await this.list(workspaceId);
    const profiles = ids.map((id) =>
      directory.find((profile) => profile.id === id),
    );
    if (profiles.some((profile) => !profile)) {
      throw new AiException(
        doNotTranslate('An assistant is disabled or unavailable'),
        AiExceptionCode.INVALID_AGENT_INPUT,
        { userFriendlyMessage: msg`An assistant is disabled or unavailable` },
      );
    }
    return profiles.filter(
      (profile): profile is ExternalAssistant => profile !== undefined,
    );
  }

  async dispatch(
    actor: AgentChatMemberMessageActor,
    threadId: string,
    messageId: string,
  ): Promise<boolean> {
    const sourcePart = await this.parts.findOne(actor.workspaceId, {
      where: { messageId, type: 'text' },
    });
    const sourceText = sourcePart?.textContent;
    if (!sourceText) {
      return true;
    }
    const selectedIds =
      readAgentChatAssistantReplyContext(sourcePart ? [sourcePart] : [])
        ?.mentionedExternalAssistantIds ?? [];
    const profiles = await this.validateMentions(
      actor.workspaceId,
      sourceText,
      selectedIds,
    );
    if (!profiles.length) {
      return true;
    }
    const membership = await this.memberships.findOne({
      where: { id: actor.userWorkspaceId, workspaceId: actor.workspaceId },
    });
    if (!membership) {
      throw new AiException(
        doNotTranslate('Workspace member unavailable'),
        AiExceptionCode.THREAD_NOT_FOUND,
        { userFriendlyMessage: msg`Workspace member unavailable` },
      );
    }
    let delivered = true;
    for (const profile of profiles) {
      const id = v5(`${messageId}:${profile.id}`, v5.URL);
      const request: ExternalAssistantGrant = {
        id,
        assistantId: profile.id,
        threadId,
        messageId,
        workspaceMemberId: actor.workspaceMemberId,
        textDigest: getMessageDigest(sourceText),
        expiresAt: Date.now() + 7 * 86400000,
      };
      await this.registry
        .createQueryBuilder()
        .insert()
        .values({
          workspaceId: actor.workspaceId,
          applicationId: profile.applicationId,
          userId: null,
          type: KeyValuePairType.CONFIG_VARIABLE,
          key: REQUEST_PREFIX + id,
          value: request as unknown as KeyValuePairEntity['value'],
        })
        .orIgnore()
        .execute();
      try {
        const handler = await this.findHandler(actor.workspaceId, profile);
        const result = await this.executor.execute({
          workspaceId: actor.workspaceId,
          logicFunctionId: handler.id,
          userWorkspaceId: actor.userWorkspaceId,
          userId: membership.userId,
          payload: { requestId: id },
        });
        if (result.error) {
          throw new Error('Assistant handler failed');
        }
      } catch {
        delivered = false;
        this.logger.warn(
          `External assistant delivery failed for request ${id}`,
        );
      }
    }
    return delivered;
  }

  async request(
    workspaceId: string,
    applicationId: string,
    requestId: string,
  ): Promise<ExternalAssistantRequest> {
    const row = await this.registry.findOne({
      where: {
        workspaceId,
        applicationId,
        key: REQUEST_PREFIX + requestId,
        type: KeyValuePairType.CONFIG_VARIABLE,
      },
    });
    if (!row) {
      throw new AiException(
        doNotTranslate('Assistant request unavailable'),
        AiExceptionCode.THREAD_NOT_FOUND,
        { userFriendlyMessage: msg`Assistant request unavailable` },
      );
    }
    const request = row.value as unknown as ExternalAssistantGrant;
    if (request.expiresAt < Date.now()) {
      throw new AiException(
        doNotTranslate('Assistant request expired'),
        AiExceptionCode.THREAD_NOT_FOUND,
        { userFriendlyMessage: msg`Assistant request expired` },
      );
    }
    const profile = (await this.list(workspaceId)).find(
      (profile) =>
        profile.id === request.assistantId &&
        profile.applicationId === applicationId,
    );
    if (!profile) {
      throw new AiException(
        doNotTranslate('Assistant unavailable'),
        AiExceptionCode.THREAD_NOT_FOUND,
        { userFriendlyMessage: msg`Assistant unavailable` },
      );
    }
    const thread = await this.threads.getWritableThread({
      workspaceId,
      workspaceMemberId: request.workspaceMemberId,
      threadId: request.threadId,
    });
    if (
      thread.deletedAt ||
      thread.conversationType === AgentChatThreadConversationType.DIRECT_MESSAGE
    ) {
      throw new AiException(
        doNotTranslate('Original conversation unavailable'),
        AiExceptionCode.THREAD_NOT_FOUND,
        { userFriendlyMessage: msg`Original conversation unavailable` },
      );
    }
    const source = await this.messages.findOne(workspaceId, {
      where: {
        id: request.messageId,
        threadId: request.threadId,
        senderWorkspaceMemberId: request.workspaceMemberId,
        role: AgentMessageRole.USER,
      },
    });
    if (!source || source.deletedAt) {
      throw new AiException(
        doNotTranslate('Original message unavailable'),
        AiExceptionCode.THREAD_NOT_FOUND,
        { userFriendlyMessage: msg`Original message unavailable` },
      );
    }
    const part = await this.parts.findOne(workspaceId, {
      where: { messageId: request.messageId, type: 'text' },
    });
    const addressed =
      readAgentChatAssistantReplyContext(part ? [part] : [])
        ?.mentionedExternalAssistantIds ?? [];
    if (
      !part?.textContent ||
      getMessageDigest(part.textContent) !== request.textDigest ||
      !addressed.includes(request.assistantId)
    ) {
      throw new AiException(
        doNotTranslate('Original assistant mention changed'),
        AiExceptionCode.THREAD_NOT_FOUND,
        { userFriendlyMessage: msg`Original assistant mention changed` },
      );
    }
    return { ...request, text: part.textContent };
  }

  async reply(
    workspaceId: string,
    applicationId: string,
    requestId: string,
    text: string,
  ): Promise<boolean> {
    if (!text.trim() || text.length > 10000) {
      throw new AiException(
        doNotTranslate('Write a reply of up to 10,000 characters'),
        AiExceptionCode.INVALID_AGENT_INPUT,
        { userFriendlyMessage: msg`Write a reply of up to 10,000 characters` },
      );
    }
    const request = await this.request(workspaceId, applicationId, requestId);
    const profile = (await this.list(workspaceId)).find(
      (profile) =>
        profile.id === request.assistantId &&
        profile.applicationId === applicationId,
    );
    if (!profile) {
      throw new AiException(
        doNotTranslate('Assistant unavailable'),
        AiExceptionCode.THREAD_NOT_FOUND,
        { userFriendlyMessage: msg`Assistant unavailable` },
      );
    }
    const id = v5(`reply:${requestId}`, v5.URL);
    const written = await this.writer.runInTransaction({
      workspaceId,
      threadId: request.threadId,
      work: async (scope) => {
        await scope.executeRawQuery(
          'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
          [`${workspaceId}:${requestId}`],
        );
        const table = getWorkspaceAgentHistoryTable(workspaceId);
        const existing = await scope.executeRawQuery(
          `SELECT "textContent" FROM ${table('agentMessagePart')} WHERE "messageId" = $1 AND "type" = 'text'`,
          [id],
        );
        if (existing.length) {
          if (existing[0].textContent !== text.trim()) {
            throw new AiException(
              doNotTranslate('This request already has a different reply'),
              AiExceptionCode.INVALID_AGENT_INPUT,
              {
                userFriendlyMessage: msg`This request already has a different reply`,
              },
            );
          }
          return false;
        }
        const turnId = await this.writer.insertTurn({
          workspaceId,
          threadId: request.threadId,
          agentId: null,
          status: AgentTurnStatus.COMPLETED,
          scope,
        });
        await this.writer.insertMessage({
          workspaceId,
          id,
          threadId: request.threadId,
          turnId,
          role: AgentMessageRole.ASSISTANT,
          agentId: null,
          senderUserWorkspaceId: null,
          senderApplicationId: applicationId,
          parts: [
            {
              type: 'text',
              text: text.trim(),
              providerMetadata: {
                externalAssistant: {
                  id: profile.id,
                  name: profile.name,
                  avatarUrl: profile.avatarUrl,
                  applicationId,
                },
              },
            },
          ],
          scope,
        });
        return true;
      },
    });
    if (written) {
      await this.events.publish({
        workspaceId,
        threadId: request.threadId,
        event: { type: 'message-added', messageId: id },
      });
      await this.threads.recordThreadActivity({
        workspaceId,
        threadId: request.threadId,
        text: text.trim(),
      });
    }
    return true;
  }

  private async findHandler(workspaceId: string, profile: ExternalAssistant) {
    const handler = await this.functions.findOne(workspaceId, {
      where: {
        applicationId: profile.applicationId,
        universalIdentifier: profile.handlerUniversalIdentifier,
        deletedAt: IsNull(),
      },
    });
    if (!handler) {
      throw new AiException(
        doNotTranslate('Select a logic function owned by this application'),
        AiExceptionCode.INVALID_AGENT_INPUT,
        {
          userFriendlyMessage: msg`Select a logic function owned by this application`,
        },
      );
    }
    return handler;
  }
}
