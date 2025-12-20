import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { InstrumentType } from '@prisma/client';

export class UpdateInstrumentDto {
  @ApiProperty({
    description: 'Nombre completo del instrumento',
    example: 'Bitcoin',
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({
    description: 'Tipo de instrumento',
    enum: InstrumentType,
    example: InstrumentType.CRYPTO,
    required: false,
  })
  @IsOptional()
  @IsEnum(InstrumentType)
  type?: InstrumentType;

  @ApiProperty({
    description: 'Moneda de cotización (ej: USD, EUR, USDT)',
    example: 'USD',
    maxLength: 10,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Z]{2,4}$/, {
    message: 'Currency quote must be 2-4 uppercase letters',
  })
  currencyQuote?: string;

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
    description: 'Si el instrumento está activo',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Notas adicionales sobre el instrumento (opcional)',
    example: 'Principal criptomoneda',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

