import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsNotEmpty,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { InstrumentType } from '@prisma/client';

export class CreateInstrumentDto {
  @ApiProperty({
    description: 'Mercado del instrumento (ej: BINANCE, NASDAQ, NYSE, FX)',
    example: 'BINANCE',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Market is required' })
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Market must contain only uppercase letters, numbers, hyphens, and underscores',
  })
  market: string;

  @ApiProperty({
    description: 'Símbolo del instrumento (ej: BTCUSDT, AAPL, SPY, EURUSD)',
    example: 'BTCUSDT',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Symbol is required' })
  @MaxLength(50)
  @Matches(/^[A-Z0-9._-]+$/, {
    message: 'Symbol must contain only uppercase letters, numbers, dots, hyphens, and underscores',
  })
  symbol: string;

  @ApiProperty({
    description: 'Nombre completo del instrumento',
    example: 'Bitcoin',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Tipo de instrumento',
    enum: InstrumentType,
    example: InstrumentType.CRYPTO,
  })
  @IsEnum(InstrumentType)
  type: InstrumentType;

  @ApiProperty({
    description: 'Moneda de cotización (ej: USD, EUR, USDT)',
    example: 'USD',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty({ message: 'Currency quote is required' })
  @MaxLength(10)
  @Matches(/^[A-Z]{2,4}$/, {
    message: 'Currency quote must be 2-4 uppercase letters',
  })
  currencyQuote: string;

  @ApiProperty({
    description: 'Tamaño mínimo de movimiento de precio (opcional)',
    example: 0.01,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.00000001, { message: 'Tick size must be greater than 0' })
  tickSize?: number;

  @ApiProperty({
    description: 'Tamaño de contrato para forex/futures (opcional)',
    example: 100000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.00000001, { message: 'Contract size must be greater than 0' })
  contractSize?: number;

  @ApiProperty({
    description: 'Notas adicionales sobre el instrumento (opcional)',
    example: 'Principal criptomoneda',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

