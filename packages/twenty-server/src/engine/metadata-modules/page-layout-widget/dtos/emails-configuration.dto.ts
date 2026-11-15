import { Field, ObjectType } from '@nestjs/graphql';

import { IsArray, IsIn, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { type EmailsConfiguration } from 'twenty-shared/types';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';

@ObjectType('EmailsConfiguration')
export class EmailsConfigurationDTO implements EmailsConfiguration {
  @Field(() => WidgetConfigurationType)
  @IsIn([WidgetConfigurationType.EMAILS])
  @IsNotEmpty()
  configurationType: WidgetConfigurationType.EMAILS;

  // Each path chains relation field ids from the record's object to person
  @Field(() => [[String]], { nullable: true })
  @IsOptional()
  @IsArray()
  sourceFieldMetadataIdPaths?: string[][] | null;

  // Dashboards have no page record, so the widget names the record it shows
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  targetRecordId?: string | null;
}
