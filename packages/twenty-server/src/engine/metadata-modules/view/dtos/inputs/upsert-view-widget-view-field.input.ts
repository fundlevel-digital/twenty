import { Field, InputType } from '@nestjs/graphql';

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
import { AtLeastOneOf } from 'src/engine/metadata-modules/view-field-group/dtos/validators/at-least-one-of.validator';

@InputType()
@AtLeastOneOf(['viewFieldId', 'fieldMetadataId'])
export class UpsertViewWidgetViewFieldInput {
  @IsOptional()
  @IsUUID()
  @Field(() => UUIDScalarType, {
    nullable: true,
    description:
      'The id of an existing view field to update. For a new lookup column, the id to create it with.',
  })
  viewFieldId?: string;

  @IsOptional()
  @IsUUID()
  @Field(() => UUIDScalarType, {
    nullable: true,
    description:
      'The field metadata id. Used to create a new view field when viewFieldId is not provided.',
  })
  fieldMetadataId?: string;

  @IsBoolean()
  @Field()
  isVisible: boolean;

  @IsNumber()
  @Field()
  position: number;

  @IsOptional()
  @IsNumber()
  @Field({ nullable: true })
  size?: number;

  @IsOptional()
  @IsEnum(AggregateOperations)
  @Field(() => AggregateOperations, { nullable: true })
  aggregateOperation?: AggregateOperations | null;

  @IsOptional()
  @IsUUID()
  @Field(() => UUIDScalarType, {
    nullable: true,
    description:
      'Makes the column a lookup column showing this field of the related record(s). Lookup columns are extra (non-canonical) columns.',
  })
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
