import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FillType } from './create-fill.dto';

export class UpdateFillDto {
  @ApiPropertyOptional({ enum: FillType })
  @IsEnum(FillType)
  @IsOptional()
  type?: FillType;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ValidateIf((o) => o.type === FillType.ENTRY || o.type === FillType.EXIT)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ValidateIf((o) => o.type === FillType.ENTRY || o.type === FillType.EXIT)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  fee?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  feeCurrency?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  datetime?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

