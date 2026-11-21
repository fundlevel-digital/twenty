import { Field, HideField, InputType } from '@nestjs/graphql';

import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { AggregateOperations } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS } from 'src/engine/metadata-modules/flat-view-field/constants/view-field-lookup-max-relation-hops.constant';

@InputType()
export class CreateViewFieldInput {
  @IsOptional()
  @IsUUID()
  @Field(() => UUIDScalarType, { nullable: true })
  id?: string;

  @IsUUID()
  @Field(() => UUIDScalarType, { nullable: false })
  fieldMetadataId: string;

  @IsUUID()
  @Field(() => UUIDScalarType, { nullable: false })
  viewId: string;

  @IsOptional()
  @IsBoolean()
  @Field({ nullable: true, defaultValue: true })
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  @Field({ nullable: true, defaultValue: true })
  isCanonical?: boolean;

  @IsOptional()
  @IsNumber()
  @Field({ nullable: true, defaultValue: 0 })
  size?: number;

  @IsOptional()
  @IsNumber()
  @Field({ nullable: true, defaultValue: 0 })
  position?: number;

  @IsOptional()
  @IsEnum(AggregateOperations)
  @Field(() => AggregateOperations, { nullable: true })
  aggregateOperation?: AggregateOperations;

  @IsOptional()
  @IsUUID()
  @Field(() => UUIDScalarType, { nullable: true })
  viewFieldGroupId?: string;

  @IsOptional()
  @IsUUID()
  @Field(() => UUIDScalarType, { nullable: true })
  relationTargetFieldMetadataId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS - 1)
  @IsUUID('all', { each: true })
  @Field(() => [UUIDScalarType], {
    nullable: true,
    description:
      'Relation fields followed, in order, between fieldMetadataId and relationTargetFieldMetadataId. Empty or null for a one-hop lookup.',
  })
  relationPathFieldMetadataIds?: string[];

  @HideField()
  universalIdentifier?: string;

  @HideField()
  applicationId?: string;
}
