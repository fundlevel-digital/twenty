import {
  MessageChannelContactAutoCreationPolicy,
  MessageParticipantRole,
} from 'twenty-shared/types';
import { ApplicationMessageContactCreationService } from '../application-message-contact-creation.service';

type ResolveInput = Parameters<
  ApplicationMessageContactCreationService['resolve']
>[0];
type Dependencies = ConstructorParameters<
  typeof ApplicationMessageContactCreationService
>;

describe('application message contact creation', () => {
  const create = jest.fn();
  const getMany = jest.fn();
  const find = jest.fn();
  const queryBuilder = {
    where: jest.fn(),
    withDeleted: jest.fn(),
    orWhere: jest.fn(),
    getMany,
  };
  for (const method of [
    queryBuilder.where,
    queryBuilder.withDeleted,
    queryBuilder.orWhere,
  ]) {
    method.mockReturnValue(queryBuilder);
  }
  const service = new ApplicationMessageContactCreationService(
    {
      createCompaniesAndPeopleAndUpdateParticipants: create,
    } as unknown as Dependencies[0],
    {
      executeInWorkspaceContext: (callback: () => Promise<unknown>) =>
        callback(),
      getRepositoryWithoutPermissionChecks: () => ({
        find,
        createQueryBuilder: () => queryBuilder,
      }),
    } as unknown as Dependencies[1],
  );
  const input = (
    policy = MessageChannelContactAutoCreationPolicy.SENT_AND_RECEIVED,
  ): ResolveInput => ({
    workspaceId: 'workspace',
    connectedAccount: {} as ResolveInput['connectedAccount'],
    messageChannel: {
      handle: 'T:OWNER',
      isContactAutoCreationEnabled: true,
      contactAutoCreationPolicy: policy,
      excludeGroupEmails: true,
      excludeNonProfessionalEmails: true,
    } as ResolveInput['messageChannel'],
    messages: [
      {
        externalId: 'one',
        threadExternalId: 'root',
        text: 'Hello',
        receivedAt: new Date(),
        participants: [
          {
            role: MessageParticipantRole.FROM,
            handle: 'T:LEAD',
            contactEmail: 'lead@customer.example',
            displayName: 'Lead',
          },
          { role: MessageParticipantRole.TO, handle: 'T:OWNER' },
        ],
      },
    ],
  });
  beforeEach(() => {
    jest.clearAllMocks();
    find.mockResolvedValue([]);
    getMany.mockResolvedValue([]);
  });

  it('creates through the email company/person pipeline and links the resulting person to the Slack handle', async () => {
    getMany.mockResolvedValue([
      { id: 'person', emails: { primaryEmail: 'lead@customer.example' } },
    ]);
    const result = await service.resolve(input());
    expect(create).toHaveBeenCalledWith(
      {},
      [{ handle: 'lead@customer.example', displayName: 'Lead' }],
      'workspace',
      'API',
    );
    expect(result[0].participants[0]).toMatchObject({
      handle: 'T:LEAD',
      personId: 'person',
    });
  });
  it('honors none and disabled creation while still matching existing additional emails', async () => {
    getMany.mockResolvedValue([
      {
        id: 'existing',
        emails: {
          primaryEmail: 'other@customer.example',
          additionalEmails: ['lead@customer.example'],
        },
      },
    ]);
    const request = input(MessageChannelContactAutoCreationPolicy.NONE);
    expect((await service.resolve(request))[0].participants[0].personId).toBe(
      'existing',
    );
    request.messageChannel.contactAutoCreationPolicy =
      MessageChannelContactAutoCreationPolicy.SENT_AND_RECEIVED;
    request.messageChannel.isContactAutoCreationEnabled = false;
    await service.resolve(request);
    expect(create).not.toHaveBeenCalled();
  });
  it('honors sent-only using the connected Slack identity', async () => {
    const request = input(MessageChannelContactAutoCreationPolicy.SENT);
    await service.resolve(request);
    expect(create).not.toHaveBeenCalled();
    request.messages[0].participants[0].role = MessageParticipantRole.TO;
    request.messages[0].participants[1].role = MessageParticipantRole.FROM;
    await service.resolve(request);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('excludes workspace employees and group/personal addresses', async () => {
    const request = input();
    find.mockResolvedValue([{ userEmail: 'LEAD@customer.example' }]);
    request.messages[0].participants.push(
      {
        role: MessageParticipantRole.TO,
        handle: 'T:GROUP',
        contactEmail: 'support@customer.example',
      },
      {
        role: MessageParticipantRole.TO,
        handle: 'T:PERSONAL',
        contactEmail: 'someone@gmail.com',
      },
      {
        role: MessageParticipantRole.TO,
        handle: 'T:MEMBER',
        contactEmail: 'member@elsewhere.example',
        workspaceMemberId: 'member',
      },
    );
    await service.resolve(request);
    expect(create).not.toHaveBeenCalled();
    request.messageChannel.excludeGroupEmails = false;
    request.messageChannel.excludeNonProfessionalEmails = false;
    await service.resolve(request);
    expect(
      create.mock.calls[0][1].map(({ handle }: { handle: string }) => handle),
    ).toEqual(['support@customer.example', 'someone@gmail.com']);
  });
  it('does not link ambiguous matches or create from deleted messages', async () => {
    const request = input();
    request.messages[0].providerMetadata = {
      deletedAt: '2026-11-21T12:00:00.000Z',
      updatedAt: '2026-11-21T12:00:00.000Z',
    };
    getMany.mockResolvedValue(
      ['one', 'two'].map((id) => ({
        id,
        emails: { primaryEmail: 'lead@customer.example' },
      })),
    );
    expect(
      (await service.resolve(request))[0].participants[0].personId,
    ).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });
});
