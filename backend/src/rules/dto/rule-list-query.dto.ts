import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RuleListQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID de setup',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  setupId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar solo reglas obligatorias',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo/inactivo',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

