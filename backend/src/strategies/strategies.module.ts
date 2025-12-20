import { Module } from '@nestjs/common';
import { StrategiesService } from './strategies.service';
import { StrategiesController } from './strategies.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SetupsModule } from '../setups/setups.module';

@Module({
  imports: [PrismaModule, SetupsModule],
  controllers: [StrategiesController],
  providers: [StrategiesService],
  exports: [StrategiesService],
})
export class StrategiesModule {}

