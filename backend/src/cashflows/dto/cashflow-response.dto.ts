import { ApiProperty } from '@nestjs/swagger';
import { CashflowType } from '@prisma/client';

export class AccountInfoDto {
  @ApiProperty({ example: 'uuid-account-id' })
  id: string;

  @ApiProperty({ example: 'Binance Futures' })
  name: string;
}

export class CashflowResponseDto {
  @ApiProperty({ example: 'uuid-cashflow-id' })
  id: string;

  @ApiProperty({ example: 'uuid-account-id' })
  accountId: string;

  @ApiProperty({ example: 'uuid-user-id' })
  userId: string;

  @ApiProperty({ enum: CashflowType, example: CashflowType.DEPOSIT })
  type: CashflowType;

  @ApiProperty({ example: 1000.0 })
  amount: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 'Depósito inicial', required: false })
  description: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  date: Date;

  @ApiProperty({ example: 'Commission', required: false })
  category: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: AccountInfoDto, required: false })
  account?: AccountInfoDto;
}

