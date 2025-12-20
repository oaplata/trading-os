import { IsUUID, IsEnum, IsNumber, IsString, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CashflowType } from '@prisma/client';
import { IsNotFutureDate } from '../validators/not-future-date.validator';

export class CreateCashflowDto {
  @ApiProperty({
    description: 'ID de la cuenta',
    example: 'uuid-account-id',
  })
  @IsUUID()
  accountId: string;

  @ApiProperty({
    description: 'Tipo de cashflow',
    enum: CashflowType,
    example: CashflowType.DEPOSIT,
  })
  @IsEnum(CashflowType)
  type: CashflowType;

  @ApiProperty({
    description: 'Monto (siempre positivo, el signo se maneja por tipo)',
    example: 1000.0,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Moneda (debe coincidir con la moneda de la cuenta)',
    example: 'USD',
  })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Descripción del movimiento',
    example: 'Depósito inicial',
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

