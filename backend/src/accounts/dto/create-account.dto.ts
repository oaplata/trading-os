import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum AccountType {
  SPOT = 'SPOT',
  MARGIN = 'MARGIN',
  FUTURES = 'FUTURES',
  CFD = 'CFD',
}

export class CreateAccountDto {
  @ApiProperty({
    description: 'Nombre de la cuenta',
    example: 'Binance Futures',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Broker o Exchange (opcional)',
    example: 'Binance',
    required: false,
  })
  @IsOptional()
  @IsString()
  broker?: string;

  @ApiProperty({
    description: 'Tipo de cuenta',
    enum: AccountType,
    example: AccountType.FUTURES,
  })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiProperty({
    description: 'Moneda de la cuenta',
    example: 'USD',
  })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Balance inicial de la cuenta (opcional)',
    example: 10000.0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialBalance?: number;

  @ApiProperty({
    description: 'Notas adicionales sobre la cuenta (opcional)',
    example: 'Cuenta principal para trading de futuros',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

