import { Module } from '@nestjs/common';
import { BetterListsListener } from 'src/modules/better-lists/better-lists.listener';

@Module({ providers: [BetterListsListener] })
export class BetterListsModule {}
