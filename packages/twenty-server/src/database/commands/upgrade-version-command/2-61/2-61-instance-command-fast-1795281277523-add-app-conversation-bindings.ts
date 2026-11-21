import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.61.0', 1795281277523)
export class AddAppConversationBindingsFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "core"."messagingProvider" ADD "channelObjectUniversalIdentifier" uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."messageFolder" ADD "applicationRecordId" uuid',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "core"."messageFolder" DROP COLUMN "applicationRecordId"',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."messagingProvider" DROP COLUMN "channelObjectUniversalIdentifier"',
    );
  }
}
