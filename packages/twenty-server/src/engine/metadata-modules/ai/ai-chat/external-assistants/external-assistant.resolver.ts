import { AiGraphqlApiExceptionInterceptor } from '../../interceptors/ai-graphql-api-exception.interceptor';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { PermissionFlagType } from 'twenty-shared/constants';
import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { AuthApplication } from 'src/engine/decorators/auth/auth-application.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AccessPolicyGuard } from 'src/engine/guards/access-policy.guard';
import {
  ExternalAssistantDTO,
  ExternalAssistantRequestDTO,
} from './external-assistant.dto';
import { ExternalAssistantService } from './external-assistant.service';

const EXTERNAL_ASSISTANT_APPLICATION_ACCESS_POLICY = {
  authPrincipals: {
    userSession: false,
    apiKey: false,
    oauthClient: false,
    application: true,
  },
  requiredPermissionFlags: [PermissionFlagType.AI],
};

@UseInterceptors(AiGraphqlApiExceptionInterceptor)
@MetadataResolver()
export class ExternalAssistantResolver {
  constructor(private readonly service: ExternalAssistantService) {}

  @Query(() => [ExternalAssistantDTO])
  @UseGuards(
    AccessPolicyGuard({
      authPrincipals: {
        userSession: true,
        apiKey: false,
        oauthClient: false,
        application: true,
      },
      requiredPermissionFlags: [PermissionFlagType.AI],
    }),
  )
  async externalAssistants(@AuthWorkspace() workspace: FlatWorkspace) {
    return this.service.list(workspace.id);
  }

  @Query(() => [ExternalAssistantDTO])
  @UseGuards(AccessPolicyGuard(EXTERNAL_ASSISTANT_APPLICATION_ACCESS_POLICY))
  async ownExternalAssistants(
    @AuthWorkspace() workspace: FlatWorkspace,
    @AuthApplication() application: FlatApplication,
  ) {
    return this.service.list(workspace.id, application.id);
  }

  @Mutation(() => ExternalAssistantDTO)
  @UseGuards(AccessPolicyGuard(EXTERNAL_ASSISTANT_APPLICATION_ACCESS_POLICY))
  async registerExternalAssistant(
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @AuthWorkspace() workspace: FlatWorkspace,
    @AuthApplication() application: FlatApplication,
  ) {
    return this.service.register(workspace.id, application, input);
  }

  @Query(() => ExternalAssistantRequestDTO)
  @UseGuards(AccessPolicyGuard(EXTERNAL_ASSISTANT_APPLICATION_ACCESS_POLICY))
  async externalAssistantRequest(
    @Args('requestId', { type: () => UUIDScalarType }) requestId: string,
    @AuthWorkspace() workspace: FlatWorkspace,
    @AuthApplication() application: FlatApplication,
  ) {
    return this.service.request(workspace.id, application.id, requestId);
  }

  @Mutation(() => Boolean)
  @UseGuards(AccessPolicyGuard(EXTERNAL_ASSISTANT_APPLICATION_ACCESS_POLICY))
  async replyToExternalAssistant(
    @Args('requestId', { type: () => UUIDScalarType }) requestId: string,
    @Args('text') text: string,
    @AuthWorkspace() workspace: FlatWorkspace,
    @AuthApplication() application: FlatApplication,
  ) {
    return this.service.reply(workspace.id, application.id, requestId, text);
  }
}
