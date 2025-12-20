import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FillType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  FEE = 'FEE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class CreateFillDto {
  @ApiProperty({ description: 'ID del trade' })
  @IsUUID()
  tradeId: string;

  @ApiProperty({ enum: FillType, description: 'Tipo de fill' })
  @IsEnum(FillType)
  type: FillType;

  @ApiPropertyOptional({ description: 'Cantidad (requerido para ENTRY/EXIT)' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ValidateIf((o) => o.type === FillType.ENTRY || o.type === FillType.EXIT)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Precio (requerido para ENTRY/EXIT)' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ValidateIf((o) => o.type === FillType.ENTRY || o.type === FillType.EXIT)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: 'Fee', default: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  fee?: number;

  @ApiPropertyOptional({ description: 'Moneda del fee', default: 'USD' })
  @IsString()
  @IsOptional()
  feeCurrency?: string;

  @ApiProperty({ description: 'Fecha y hora del fill (ISO string)' })
  @IsDateString()
  datetime: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}

