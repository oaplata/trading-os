import { Module } from '@nestjs/common';
import { TradesService } from './trades.service';
import { FillsService } from './fills.service';
import { TradeChecklistService } from './trade-checklist.service';
import { TradesController } from './trades.controller';
import { FillsController } from './fills.controller';
import { TradeChecklistController } from './trade-checklist.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TradesController, FillsController, TradeChecklistController],
  providers: [TradesService, FillsService, TradeChecklistService],
  exports: [TradesService],
})
export class TradesModule {}

