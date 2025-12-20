import { IsUUID, IsEnum, IsString, IsOptional, IsArray, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TradeSide, TradeType } from './create-trade.dto';

export enum TradeStatus {
  PLANNED = 'PLANNED',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELED = 'CANCELED',
}

export enum TradeResult {
  WIN = 'WIN',
  LOSS = 'LOSS',
  BREAK_EVEN = 'BREAK_EVEN',
}

export class TradeListQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por cuenta' })
  @IsUUID()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por instrumento' })
  @IsUUID()
  @IsOptional()
  instrumentId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estrategia' })
  @IsUUID()
  @IsOptional()
  strategyId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por setup' })
  @IsUUID()
  @IsOptional()
  setupId?: string;

  @ApiPropertyOptional({ enum: TradeStatus, description: 'Filtrar por estado' })
  @IsEnum(TradeStatus)
  @IsOptional()
  status?: TradeStatus;

  @ApiPropertyOptional({ enum: TradeSide, description: 'Filtrar por lado' })
  @IsEnum(TradeSide)
  @IsOptional()
  side?: TradeSide;

  @ApiPropertyOptional({ enum: TradeResult, description: 'Filtrar por resultado' })
  @IsEnum(TradeResult)
  @IsOptional()
  result?: TradeResult;

  @ApiPropertyOptional({ type: [String], description: 'Filtrar por tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Fecha desde (ISO string)' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (ISO string)' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Búsqueda en thesis, notes, tags' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Límite por página', default: 50 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}

