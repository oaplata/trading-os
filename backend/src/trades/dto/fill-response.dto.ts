import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FillType } from './create-fill.dto';

export class FillResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tradeId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: FillType })
  type: FillType;

  @ApiPropertyOptional()
  quantity?: number;

  @ApiPropertyOptional()
  price?: number;

  @ApiProperty()
  fee: number;

  @ApiProperty()
  feeCurrency: string;

  @ApiProperty()
  datetime: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

