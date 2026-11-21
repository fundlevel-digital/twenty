import { Injectable } from '@nestjs/common';
import {
  FieldActorSource,
  MessageChannelContactAutoCreationPolicy,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { type AppMessageInput } from 'src/engine/metadata-modules/message-channel/dtos/ingest-app-messages.input';
import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { resolveAppMessageDirection } from 'src/engine/metadata-modules/message-channel/utils/resolve-app-message-direction.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { CreateCompanyAndPersonService } from 'src/modules/contact-creation-manager/services/create-company-and-contact.service';
import { addPersonEmailFiltersToQueryBuilder } from 'src/modules/match-participant/utils/add-person-email-filters-to-query-builder';
import { MessageDirection } from 'src/modules/messaging/common/enums/message-direction.enum';
import { isGroupEmail } from 'src/modules/messaging/message-import-manager/utils/is-group-email';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { isWorkEmail } from 'src/utils/is-work-email';

@Injectable()
export class ApplicationMessageContactCreationService {
  constructor(
    private readonly createCompanyAndPersonService: CreateCompanyAndPersonService,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
  ) {}

  async resolve({
    messages,
    messageChannel,
    connectedAccount,
    workspaceId,
  }: {
    messages: AppMessageInput[];
    messageChannel: MessageChannelEntity;
    connectedAccount: ConnectedAccountEntity;
    workspaceId: string;
  }): Promise<AppMessageInput[]> {
    const emails = [
      ...new Set(
        messages.flatMap(({ participants }) =>
          participants.flatMap(({ contactEmail, workspaceMemberId }) =>
            contactEmail && !workspaceMemberId
              ? [contactEmail.toLowerCase()]
              : [],
          ),
        ),
      ),
    ];
    if (emails.length === 0) {
      return messages;
    }

    const authContext = buildSystemAuthContext(workspaceId);
    const workspaceMemberEmails =
      await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
        const repository =
          this.workspaceOrmManager.getRepositoryWithoutPermissionChecks(
            WorkspaceMemberWorkspaceEntity,
          );
        return new Set(
          (await repository.find()).flatMap(({ userEmail }) =>
            isDefined(userEmail) ? [userEmail.toLowerCase()] : [],
          ),
        );
      }, authContext);
    const contacts = new Map<string, { handle: string; displayName: string }>();
    for (const message of messages) {
      const policyAllowsCreation =
        !message.providerMetadata?.deletedAt &&
        messageChannel.isContactAutoCreationEnabled &&
        (messageChannel.contactAutoCreationPolicy ===
          MessageChannelContactAutoCreationPolicy.SENT_AND_RECEIVED ||
          (messageChannel.contactAutoCreationPolicy ===
            MessageChannelContactAutoCreationPolicy.SENT &&
            resolveAppMessageDirection({
              participants: message.participants,
              channelHandle: messageChannel.handle,
            }) === MessageDirection.OUTGOING));
      if (!policyAllowsCreation) {
        continue;
      }
      for (const participant of message.participants) {
        const email = participant.contactEmail?.toLowerCase();
        if (
          !email ||
          participant.personId ||
          participant.workspaceMemberId ||
          workspaceMemberEmails.has(email) ||
          (messageChannel.excludeGroupEmails && isGroupEmail(email)) ||
          (messageChannel.excludeNonProfessionalEmails && !isWorkEmail(email))
        ) {
          continue;
        }
        contacts.set(email, {
          handle: email,
          displayName: participant.displayName ?? '',
        });
      }
    }
    if (contacts.size > 0) {
      await this.createCompanyAndPersonService.createCompaniesAndPeopleAndUpdateParticipants(
        connectedAccount,
        [...contacts.values()],
        workspaceId,
        FieldActorSource.API,
      );
    }
    const people = await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const repository =
          this.workspaceOrmManager.getRepositoryWithoutPermissionChecks(
            PersonWorkspaceEntity,
          );
        return addPersonEmailFiltersToQueryBuilder({
          queryBuilder: repository.createQueryBuilder('person'),
          emails,
        }).getMany<PersonWorkspaceEntity>();
      },
      authContext,
    );
    return messages.map((message) => ({
      ...message,
      participants: message.participants.map((participant) => {
        const email = participant.contactEmail?.toLowerCase();
        if (
          !email ||
          participant.personId ||
          participant.workspaceMemberId ||
          workspaceMemberEmails.has(email)
        ) {
          return participant;
        }
        const matches = people.filter(
          (person) =>
            !person.deletedAt &&
            [
              person.emails?.primaryEmail,
              ...(person.emails?.additionalEmails ?? []),
            ].some((value) => value?.toLowerCase() === email),
        );
        return matches.length === 1
          ? { ...participant, personId: matches[0].id }
          : participant;
      }),
    }));
  }
}
