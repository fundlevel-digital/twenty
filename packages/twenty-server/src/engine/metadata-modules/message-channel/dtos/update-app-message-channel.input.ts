import { Field, InputType } from '@nestjs/graphql';

import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  MessageChannelVisibility,
  MessageChannelContactAutoCreationPolicy,
} from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType('UpdateAppMessageChannelInput')
export class UpdateAppMessageChannelInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isContactAutoCreationEnabled?: boolean;

  @Field(() => MessageChannelContactAutoCreationPolicy, { nullable: true })
  @IsOptional()
  @IsEnum(MessageChannelContactAutoCreationPolicy)
  contactAutoCreationPolicy?: MessageChannelContactAutoCreationPolicy;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  excludeGroupEmails?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  excludeNonProfessionalEmails?: boolean;
  @Field(() => UUIDScalarType)
  @IsUUID()
  @IsNotEmpty()
  id: string;

  // An omitted displayName leaves the current one untouched; an explicit null clears it
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string | null;

  @Field(() => MessageChannelVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(MessageChannelVisibility)
  visibility?: MessageChannelVisibility;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isSyncEnabled?: boolean;

  @Field(() => UUIDScalarType, { nullable: true })
  @IsOptional()
  @IsUUID()
  messagingProviderUniversalIdentifier?: string | null;
}
