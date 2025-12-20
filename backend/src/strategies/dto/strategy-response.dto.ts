import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StrategyResponseDto {
  @ApiProperty({ description: 'ID único de la estrategia', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'ID del usuario propietario', example: 'uuid' })
  userId: string;

  @ApiProperty({ description: 'Nombre de la estrategia', example: 'Swing Trading Crypto' })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la estrategia' })
  description?: string;

  @ApiPropertyOptional({ description: 'Mercado objetivo', example: 'CRYPTO' })
  targetMarket?: string;

  @ApiPropertyOptional({ description: 'Timeframe típico', example: '4H' })
  typicalTimeframe?: string;

  @ApiProperty({ description: 'Si la estrategia está activa', example: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  notes?: string;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Número de setups asociados', example: 5 })
  setupCount?: number;
}

