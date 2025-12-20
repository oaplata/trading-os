import { IsEnum, IsNumber, IsString, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CashflowType } from '@prisma/client';
import { IsNotFutureDate } from '../validators/not-future-date.validator';

export class UpdateCashflowDto {
  @ApiProperty({
    description: 'Tipo de cashflow',
    enum: CashflowType,
    example: CashflowType.DEPOSIT,
    required: false,
  })
  @IsOptional()
  @IsEnum(CashflowType)
  type?: CashflowType;

  @ApiProperty({
    description: 'Monto (siempre positivo)',
    example: 1000.0,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiProperty({
    description: 'Moneda',
    example: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Descripción del movimiento',
    example: 'Depósito inicial actualizado',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Fecha del movimiento (ISO string). No puede ser futura.',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @IsNotFutureDate({ message: 'Date cannot be in the future' })
  date?: string;

  @ApiProperty({
    description: 'Categoría del movimiento',
    example: 'Commission',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;
}

