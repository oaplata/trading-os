import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateIf,
  Min,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TradeSide {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum TradeType {
  SPOT = 'SPOT',
  MARGIN = 'MARGIN',
  FUTURES = 'FUTURES',
  OPTIONS = 'OPTIONS',
}

export class CreateTradeDto {
  @ApiProperty({ description: 'ID de la cuenta' })
  @IsUUID()
  accountId: string;

  @ApiProperty({ description: 'ID del instrumento' })
  @IsUUID()
  instrumentId: string;

  @ApiPropertyOptional({ description: 'ID de la estrategia' })
  @IsUUID()
  @IsOptional()
  strategyId?: string;

  @ApiPropertyOptional({ description: 'ID del setup' })
  @IsUUID()
  @IsOptional()
  setupId?: string;

  @ApiProperty({ enum: TradeSide, description: 'Lado del trade (LONG/SHORT)' })
  @IsEnum(TradeSide)
  side: TradeSide;

  @ApiPropertyOptional({ enum: TradeType, description: 'Tipo de operación', default: TradeType.SPOT })
  @IsEnum(TradeType)
  @IsOptional()
  type?: TradeType;

  @ApiPropertyOptional({ description: 'Timeframe (ej: 4H, 1D)' })
  @IsString()
  @IsOptional()
  timeframe?: string;

  @ApiPropertyOptional({ description: 'Precio de entrada planificado' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  plannedEntry?: number;

  @ApiProperty({ description: 'Stop Loss planificado (obligatorio para calcular riesgo)' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  plannedStopLoss: number;

  @ApiPropertyOptional({ type: [Number], description: 'Take Profits planificados' })
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  @IsOptional()
  plannedTakeProfits?: number[];

  @ApiPropertyOptional({ description: 'Riesgo en porcentaje' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ValidateIf((o) => !o.riskAmount)
  @IsOptional()
  riskPercent?: number;

  @ApiPropertyOptional({ description: 'Riesgo en monto fijo' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ValidateIf((o) => !o.riskPercent)
  @IsOptional()
  riskAmount?: number;

  @ApiPropertyOptional({ description: 'Tamaño planificado' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  plannedSize?: number;

  @ApiPropertyOptional({ type: [String], description: 'Tags para categorizar el trade' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Tesis del trade' })
  @IsString()
  @IsOptional()
  thesis?: string;

  @ApiPropertyOptional({ description: 'URL de screenshot' })
  @IsUrl()
  @IsOptional()
  screenshotUrl?: string;
}

