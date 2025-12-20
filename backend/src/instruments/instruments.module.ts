import { Module } from '@nestjs/common';
import { InstrumentsService } from './instruments.service';
import { InstrumentsController } from './instruments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [InstrumentsService],
  controllers: [InstrumentsController],
  exports: [InstrumentsService], // Exportar para uso en otros módulos (ej: trades)
})
export class InstrumentsModule {}

