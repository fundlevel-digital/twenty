import { Field, ObjectType } from '@nestjs/graphql';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('ExternalAssistant')
export class ExternalAssistantDTO {
  @Field(() => UUIDScalarType) id: string;
  @Field(() => UUIDScalarType) applicationId: string;
  @Field() name: string;
  @Field() applicationName: string;
  @Field(() => String, { nullable: true }) avatarUrl: string | null;
  @Field() enabled: boolean;
}
@ObjectType('ExternalAssistantRequest')
export class ExternalAssistantRequestDTO {
  @Field(() => UUIDScalarType) id: string;
  @Field(() => UUIDScalarType) assistantId: string;
  @Field(() => UUIDScalarType) threadId: string;
  @Field(() => UUIDScalarType) messageId: string;
  @Field(() => UUIDScalarType) workspaceMemberId: string;
  @Field() text: string;
}
