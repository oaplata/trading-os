import { IsUUID, IsEnum, IsOptional, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CashflowType } from '@prisma/client';

export class CashflowListQueryDto {
  @ApiProperty({
    description: 'Filtrar por ID de cuenta',
    example: 'uuid-account-id',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiProperty({
    description: 'Filtrar por tipo de cashflow',
    enum: CashflowType,
    example: CashflowType.DEPOSIT,
    required: false,
  })
  @IsOptional()
  @IsEnum(CashflowType)
  type?: CashflowType;

  @ApiProperty({
    description: 'Fecha de inicio (ISO string)',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Fecha de fin (ISO string)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Número de página',
    example: 1,
    default: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Límite de resultados por página',
    example: 50,
    default: 50,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

