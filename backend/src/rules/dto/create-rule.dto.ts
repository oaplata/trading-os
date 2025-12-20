import { IsString, IsOptional, IsUUID, IsInt, IsBoolean, MaxLength, MinLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRuleDto {
  @ApiProperty({
    description: 'ID del setup al que pertenece la regla',
    example: 'uuid',
  })
  @IsUUID()
  setupId: string;

  @ApiProperty({
    description: 'Nombre de la regla',
    example: 'Price above EMA 20',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la regla',
    example: 'El precio debe estar por encima de la EMA 20 en el timeframe principal',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Orden de la regla en el checklist',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Si la regla es obligatoria',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

