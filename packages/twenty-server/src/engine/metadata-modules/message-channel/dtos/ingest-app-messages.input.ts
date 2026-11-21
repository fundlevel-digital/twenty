import GraphQLJSON from 'graphql-type-json';
import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsInt,
  IsObject,
  IsISO8601,
  Min,
  Max,
  IsUUID,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MAX_APP_MESSAGE_ATTACHMENTS_PER_MESSAGE } from 'twenty-shared/application';
import { MessageParticipantRole } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// the role is a SELECT on messageParticipant, so this is the first surface exposing it as a GraphQL enum
registerEnumType(MessageParticipantRole, { name: 'MessageParticipantRole' });

// one request runs in a single transaction and logic-function timeout, so provider backfills must page
export const INGEST_APP_MESSAGES_MAX_BATCH_SIZE = 100;

// above a long plain-text message, well below what would strain a full batch's transaction
export const MAX_APP_MESSAGE_TEXT_LENGTH = 262_144;

export const MAX_APP_MESSAGE_FOLDERS_PER_MESSAGE = 32;

@InputType('AppMessageParticipantInput')
export class AppMessageParticipantInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @Field(() => MessageParticipantRole)
  @IsEnum(MessageParticipantRole)
  @IsNotEmpty()
  role: MessageParticipantRole;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  handle: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  // a non-email handle cannot be matched to a Person, so the caller links it here or the thread reaches no record page
  @Field(() => UUIDScalarType, { nullable: true })
  @IsOptional()
  @IsUUID()
  personId?: string;

  // attribution only: thread targets come from personId alone, as for email
  @Field(() => UUIDScalarType, { nullable: true })
  @IsOptional()
  @IsUUID()
  workspaceMemberId?: string;
}

@InputType('AppMessageAttachmentInput')
export class AppMessageAttachmentInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  fileId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;
}

@InputType('AppMessageReactionInput')
export class AppMessageReactionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(1000000)
  count: number;

  @Field(() => [String])
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  users: string[];
}

@InputType('AppMessageMetadataInput')
export class AppMessageMetadataInput {
  @Field()
  @IsISO8601()
  updatedAt: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  permalink?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsISO8601()
  editedAt?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsISO8601()
  deletedAt?: string;

  @Field(() => [AppMessageReactionInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AppMessageReactionInput)
  reactions?: AppMessageReactionInput[];
}

@InputType('AppMessageApplicationFieldsInput')
export class AppMessageApplicationFieldsInput {
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsObject()
  message?: Record<string, string | null>;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsObject()
  thread?: Record<string, string | null>;
}

@InputType('AppMessageInput')
export class AppMessageInput {
  @Field(() => AppMessageApplicationFieldsInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AppMessageApplicationFieldsInput)
  applicationFields?: AppMessageApplicationFieldsInput;

  @Field(() => AppMessageMetadataInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AppMessageMetadataInput)
  providerMetadata?: AppMessageMetadataInput;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  externalId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  threadExternalId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(998)
  subject?: string;

  // unlike email import, nothing upstream caps this
  @Field()
  @IsString()
  @MaxLength(MAX_APP_MESSAGE_TEXT_LENGTH)
  text: string;

  // GraphQL's DateTime scalar already yields a Date; this covers other scalar modes and non-GraphQL callers
  @Field(() => Date)
  @Type(() => Date)
  @IsDate()
  receivedAt: Date;

  @Field(() => [AppMessageParticipantInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(256)
  @ValidateNested({ each: true })
  @Type(() => AppMessageParticipantInput)
  participants: AppMessageParticipantInput[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_APP_MESSAGE_FOLDERS_PER_MESSAGE)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(512, { each: true })
  folderExternalIds?: string[];

  @Field(() => [AppMessageAttachmentInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_APP_MESSAGE_ATTACHMENTS_PER_MESSAGE)
  @ValidateNested({ each: true })
  @Type(() => AppMessageAttachmentInput)
  attachments?: AppMessageAttachmentInput[];
}

@InputType('IngestAppMessagesInput')
export class IngestAppMessagesInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  @IsNotEmpty()
  messageChannelId: string;

  @Field(() => [AppMessageInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(INGEST_APP_MESSAGES_MAX_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => AppMessageInput)
  messages: AppMessageInput[];
}

@InputType('UpdateAppMessageInput')
export class UpdateAppMessageInput {
  @Field(() => AppMessageApplicationFieldsInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AppMessageApplicationFieldsInput)
  applicationFields?: AppMessageApplicationFieldsInput;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  externalId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_APP_MESSAGE_TEXT_LENGTH)
  text?: string;

  @Field(() => AppMessageMetadataInput)
  @ValidateNested()
  @Type(() => AppMessageMetadataInput)
  providerMetadata: AppMessageMetadataInput;
}

@InputType('UpdateAppMessagesInput')
export class UpdateAppMessagesInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  messageChannelId: string;

  @Field(() => [UpdateAppMessageInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(INGEST_APP_MESSAGES_MAX_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => UpdateAppMessageInput)
  messages: UpdateAppMessageInput[];
}
