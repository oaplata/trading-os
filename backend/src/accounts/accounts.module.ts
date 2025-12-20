import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsSchedulerService } from './snapshots-scheduler.service';

@Module({
  providers: [AccountsService, SnapshotsService, SnapshotsSchedulerService],
  controllers: [AccountsController],
  exports: [AccountsService, SnapshotsService],
})
export class AccountsModule {}

