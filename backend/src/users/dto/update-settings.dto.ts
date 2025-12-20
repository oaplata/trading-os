import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum Currency {
  COP = 'COP',
  USD = 'USD',
}

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Zona horaria',
    example: 'America/Bogota',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Moneda base para reporting',
    enum: Currency,
    example: Currency.USD,
    required: false,
  })
  @IsOptional()
  @IsEnum(Currency)
  baseCurrency?: Currency;

  @ApiProperty({
    description: 'Riesgo por defecto en porcentaje (0.1 - 100)',
    example: 1.0,
    minimum: 0.1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  defaultRiskPercent?: number;

  @ApiProperty({
    description: 'Si el onboarding fue completado',
    example: true,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  onboardingCompleted?: boolean;
}

