import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StrategyResponseDto } from '../../strategies/dto/strategy-response.dto';

export class SetupResponseDto {
  @ApiProperty({ description: 'ID único del setup', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'ID del usuario propietario', example: 'uuid' })
  userId: string;

  @ApiPropertyOptional({ description: 'ID de la estrategia asociada', example: 'uuid' })
  strategyId?: string;

  @ApiProperty({ description: 'Nombre del setup', example: 'Breakout' })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del setup' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Tags sugeridos',
    example: ['breakout', 'momentum'],
    type: [String],
  })
  suggestedTags?: string[];

  @ApiProperty({ description: 'Si el setup está activo', example: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  notes?: string;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Número de reglas asociadas', example: 5 })
  ruleCount?: number;

  @ApiPropertyOptional({
    description: 'Estrategia asociada (si tiene strategyId)',
    type: StrategyResponseDto,
  })
  strategy?: StrategyResponseDto;
}

