import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStrategyDto {
  @ApiProperty({
    description: 'Nombre de la estrategia',
    example: 'Swing Trading Crypto',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada de la estrategia',
    example: 'Estrategia de swing trading enfocada en criptomonedas con timeframes de 4H y 1D',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Mercado objetivo de la estrategia',
    example: 'CRYPTO',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetMarket?: string;

  @ApiPropertyOptional({
    description: 'Timeframe típico de la estrategia',
    example: '4H',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  typicalTimeframe?: string;

  @ApiPropertyOptional({
    description: 'Notas adicionales sobre la estrategia',
    example: 'Estrategia desarrollada en 2024, requiere alta volatilidad',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

