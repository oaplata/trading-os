import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';

export class UpdateAccountDto {
  @ApiProperty({
    description: 'Nombre de la cuenta',
    example: 'Binance Futures Updated',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Broker o Exchange',
    example: 'Binance',
    required: false,
  })
  @IsOptional()
  @IsString()
  broker?: string;

  @ApiProperty({
    description: 'Estado de la cuenta',
    enum: AccountStatus,
    example: AccountStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiProperty({
    description: 'Notas adicionales sobre la cuenta',
    example: 'Cuenta principal para trading de futuros',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

