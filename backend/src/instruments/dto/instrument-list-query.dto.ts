import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { InstrumentType } from '@prisma/client';

export class InstrumentListQueryDto {
  @ApiProperty({
    description: 'Filtrar por mercado',
    example: 'BINANCE',
    required: false,
  })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiProperty({
    description: 'Filtrar por tipo de instrumento',
    enum: InstrumentType,
    example: InstrumentType.CRYPTO,
    required: false,
  })
  @IsOptional()
  @IsEnum(InstrumentType)
  type?: InstrumentType;

  @ApiProperty({
    description: 'Búsqueda en name, symbol o ticker',
    example: 'BTC',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filtrar por estado activo/inactivo',
    example: true,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

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

