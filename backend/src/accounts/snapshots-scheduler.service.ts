import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SnapshotsService } from './snapshots.service';

@Injectable()
export class SnapshotsSchedulerService {
  private readonly logger = new Logger(SnapshotsSchedulerService.name);

  constructor(private snapshotsService: SnapshotsService) {}

  /**
   * Genera snapshots diarios para todas las cuentas activas
   * Se ejecuta todos los días a las 23:59 UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_11PM, {
    name: 'daily-snapshots',
    timeZone: 'UTC',
  })
  async handleDailySnapshots() {
    this.logger.log('Starting daily snapshots generation...');
    try {
      await this.snapshotsService.createSnapshotsForAllAccounts();
      this.logger.log('Daily snapshots generation completed successfully');
    } catch (error) {
      this.logger.error(`Error in daily snapshots generation: ${error.message}`, error.stack);
    }
  }
}

