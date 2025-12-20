import { IsUUID, IsBoolean, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class UpdateChecklistDto {
  @ApiProperty({ type: [ChecklistItemDto], description: 'Lista de reglas del checklist' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist: ChecklistItemDto[];
}

