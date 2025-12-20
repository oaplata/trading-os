import { Module } from '@nestjs/common';
import { SetupsService } from './setups.service';
import { SetupsController } from './setups.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SetupsController],
  providers: [SetupsService],
  exports: [SetupsService],
})
export class SetupsModule {}

