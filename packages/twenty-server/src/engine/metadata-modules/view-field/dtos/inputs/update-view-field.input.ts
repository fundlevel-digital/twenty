import { Field, InputType } from '@nestjs/graphql';

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { AggregateOperations } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS } from 'src/engine/metadata-modules/flat-view-field/constants/view-field-lookup-max-relation-hops.constant';

@InputType()
class UpdateViewFieldInputUpdates {
  @IsOptional()
  @IsBoolean()
  @Field({ nullable: true })
  isVisible?: boolean;

  @IsOptional()
  @IsNumber()
  @Field({ nullable: true })
  size?: number;

  @IsOptional()
  @IsNumber()
  @Field({ nullable: true })
  position?: number;

  @IsOptional()
  @IsEnum(AggregateOperations)
  @Field(() => AggregateOperations, { nullable: true })
  aggregateOperation?: AggregateOperations;

  @IsOptional()
  @IsUUID()
  @Field(() => UUIDScalarType, { nullable: true })
  viewFieldGroupId?: string | null;

  @IsOptional()
  @IsUUID()
  @Field(() => UUIDScalarType, { nullable: true })
  relationTargetFieldMetadataId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(VIEW_FIELD_LOOKUP_MAX_RELATION_HOPS - 1)
  @IsUUID('all', { each: true })
  @Field(() => [UUIDScalarType], {
    nullable: true,
    description:
      'Relation fields followed, in order, between fieldMetadataId and relationTargetFieldMetadataId. Empty or null for a one-hop lookup.',
  })
  relationPathFieldMetadataIds?: string[] | null;
}

@InputType()
export class UpdateViewFieldInput {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType, {
    description: 'The id of the view field to update',
  })
  id: string;

  @Type(() => UpdateViewFieldInputUpdates)
  @ValidateNested()
  @Field(() => UpdateViewFieldInputUpdates, {
    description: 'The view field to update',
  })
  update: UpdateViewFieldInputUpdates;
}
