import { ApiProperty } from '@nestjs/swagger';
import { InstrumentType } from '@prisma/client';

export class InstrumentResponseDto {
  @ApiProperty({ example: 'uuid-instrument-id' })
  id: string;

  @ApiProperty({ example: 'uuid-user-id' })
  userId: string;

  @ApiProperty({ example: 'BINANCE' })
  market: string;

  @ApiProperty({ example: 'BTCUSDT' })
  symbol: string;

  @ApiProperty({
    description: 'Ticker normalizado en formato MARKET:SYMBOL',
    example: 'BINANCE:BTCUSDT',
  })
  ticker: string;

  @ApiProperty({ example: 'Bitcoin' })
  name: string;

  @ApiProperty({ enum: InstrumentType, example: InstrumentType.CRYPTO })
  type: InstrumentType;

  @ApiProperty({ example: 'USD' })
  currencyQuote: string;

  @ApiProperty({ example: 0.01, required: false })
  tickSize?: number | null;

  @ApiProperty({ example: null, required: false })
  contractSize?: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'Principal criptomoneda', required: false })
  notes?: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}

