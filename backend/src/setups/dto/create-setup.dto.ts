import { IsString, IsOptional, IsUUID, IsArray, MaxLength, MinLength, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSetupDto {
  @ApiPropertyOptional({
    description: 'ID de la estrategia asociada (opcional)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  strategyId?: string;

  @ApiProperty({
    description: 'Nombre del setup',
    example: 'Breakout',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del setup',
    example: 'Setup de breakout cuando el precio rompe una resistencia clave',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Tags sugeridos para el setup',
    example: ['breakout', 'momentum', 'resistance'],
    type: [String],
    maxItems: 20,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  suggestedTags?: string[];

  @ApiPropertyOptional({
    description: 'Notas adicionales sobre el setup',
    example: 'Funciona mejor en mercados con alta volatilidad',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

