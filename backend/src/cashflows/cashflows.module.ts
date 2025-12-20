import { Module } from '@nestjs/common';
import { CashflowsService } from './cashflows.service';
import { CashflowsController } from './cashflows.controller';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  providers: [CashflowsService],
  controllers: [CashflowsController],
  exports: [CashflowsService],
})
export class CashflowsModule {}

