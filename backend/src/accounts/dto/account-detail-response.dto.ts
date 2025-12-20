import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus, AccountType } from '@prisma/client';

export class AccountDetailResponseDto {
  @ApiProperty({ example: 'uuid-here' })
  id: string;

  @ApiProperty({ example: 'uuid-user-id' })
  userId: string;

  @ApiProperty({ example: 'Binance Futures' })
  name: string;

  @ApiProperty({ example: 'Binance', required: false })
  broker: string | null;

  @ApiProperty({ enum: AccountType, example: AccountType.FUTURES })
  type: AccountType;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  status: AccountStatus;

  @ApiProperty({ example: 10000.0, required: false })
  initialBalance: number | null;

  @ApiProperty({ example: 10500.0, required: false })
  currentBalance: number | null;

  @ApiProperty({ example: 'Notas sobre la cuenta', required: false })
  notes: string | null;

  @ApiProperty({ required: false })
  closedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Campos calculados
  @ApiProperty({
    description: 'Equity actual (balance + PnL realizado)',
    example: 10800.5,
  })
  equity: number;

  @ApiProperty({
    description: 'Drawdown actual en porcentaje',
    example: 5.2,
  })
  drawdown: number;

  @ApiProperty({
    description: 'Rendimiento mensual en porcentaje',
    example: 8.0,
    required: false,
  })
  monthlyReturn?: number;

  @ApiProperty({
    description: 'Total de cashflows (suma de depósitos - retiros)',
    example: 500.0,
  })
  totalCashflows: number;

  @ApiProperty({
    description: 'Total de PnL realizado desde trades',
    example: 300.5,
  })
  totalRealizedPnL: number;
}

