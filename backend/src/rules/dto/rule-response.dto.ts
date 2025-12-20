import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RuleResponseDto {
  @ApiProperty({ description: 'ID único de la regla', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'ID del usuario propietario', example: 'uuid' })
  userId: string;

  @ApiProperty({ description: 'ID del setup al que pertenece', example: 'uuid' })
  setupId: string;

  @ApiProperty({ description: 'Nombre de la regla', example: 'Price above EMA 20' })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la regla' })
  description?: string;

  @ApiProperty({ description: 'Orden de la regla en el checklist', example: 0 })
  order: number;

  @ApiProperty({ description: 'Si la regla es obligatoria', example: false })
  isRequired: boolean;

  @ApiProperty({ description: 'Si la regla está activa', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;
}

