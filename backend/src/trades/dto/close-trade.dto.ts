import { IsEnum, IsString, IsOptional, IsArray, ValidateNested, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TradeResult } from './trade-list-query.dto';
import { TradeEmotion } from './trade-response.dto';

export class ChecklistItemDto {
  @ApiProperty()
  @IsUUID()
  ruleId: string;

  @ApiProperty()
  @IsBoolean()
  completed: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CloseTradeDto {
  @ApiProperty({ enum: TradeResult, description: 'Resultado del trade' })
  @IsEnum(TradeResult)
  result: TradeResult;

  @ApiPropertyOptional({ enum: TradeEmotion, description: 'Emoción al cerrar' })
  @IsEnum(TradeEmotion)
  @IsOptional()
  emotion?: TradeEmotion;

  @ApiPropertyOptional({ description: 'Lección aprendida' })
  @IsString()
  @IsOptional()
  lessonLearned?: string;

  @ApiPropertyOptional({ type: [ChecklistItemDto], description: 'Checklist de reglas' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  @IsOptional()
  checklist?: ChecklistItemDto[];
}

