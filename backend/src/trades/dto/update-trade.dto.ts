import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TradeSide, TradeType } from './create-trade.dto';

export class UpdateTradeDto {
  @ApiPropertyOptional({ enum: TradeSide })
  @IsEnum(TradeSide)
  @IsOptional()
  side?: TradeSide;

  @ApiPropertyOptional({ enum: TradeType })
  @IsEnum(TradeType)
  @IsOptional()
  type?: TradeType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  timeframe?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  strategyId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  setupId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  plannedEntry?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  plannedStopLoss?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  @IsOptional()
  plannedTakeProfits?: number[];

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  riskPercent?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  riskAmount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  plannedSize?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thesis?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  screenshotUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

